#!/usr/bin/env python3
"""Edit-spec renderer for real-footage videos (1080x1920, 30 fps).

An edit spec (media/pipeline/edits/V##.json) places REAL app captures (media/app-captures) on a timeline and anchors
narration/subtitle/overlay cues to the capture's recorded step markers, so voice and picture stay in sync.

  ~/projects/.meyra-tts/bin/python media/pipeline/edit_render.py V02 [--voice chatterbox|yelda]

Outputs media/rendered/V##.mp4 / .srt / .render.json (previous files are backed up to media/rendered/_backup/).
Voice engines are candidates until the owner picks one; such renders are kind "candidate" (publish gate refuses them).
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
import render as R  # reuse drawing helpers, hashing, brand tokens

from PIL import Image, ImageDraw, ImageFilter

ROOT = R.ROOT
W, H, FPS = R.W, R.H, R.FPS
CAP = os.path.join(ROOT, "media", "app-captures")
CARD_H = 1300  # phone card height on the 1080x1920 canvas
CARD_Y = 520


def run(cmd):
    return R.run(cmd)


def load_manifest():
    return json.load(open(os.path.join(CAP, "manifest.json")))


def capture_steps(manifest, screen):
    """Marker times (seconds from the capture's start) for a captured screen."""
    s = manifest["screens"][screen]
    if s.get("steps"):
        out = {}
        for st in s["steps"]:
            out.setdefault(st["phase"], st["t"])  # first occurrence
        return out
    base = s["markers"].get("start", 0)
    return {k: v - base for k, v in s["markers"].items()}


class Timeline:
    """Maps capture (source) times to output times across cuts."""
    def __init__(self):
        self.items = []  # dicts: screen, src_in, src_out, out_start, out_end

    def add(self, screen, src_in, src_out, out_start):
        self.items.append({"screen": screen, "src_in": src_in, "src_out": src_out, "out_start": out_start, "out_end": out_start + (src_out - src_in)})

    def to_out(self, screen, src_t):
        cands = [it for it in self.items if it["screen"] == screen]
        for it in cands:
            if it["src_in"] - 1e-3 <= src_t <= it["src_out"] + 1e-3:
                return it["out_start"] + (src_t - it["src_in"])
        later = [it for it in cands if it["src_in"] > src_t]  # inside a cut → start of the next kept piece
        if later:
            return min(later, key=lambda it: it["src_in"])["out_start"]
        raise KeyError("time %.2f of %s is outside the timeline" % (src_t, screen))

    def to_src(self, out_t):
        for it in self.items:
            if it["out_start"] <= out_t < it["out_end"]:
                return it["screen"], it["src_in"] + (out_t - it["out_start"])
        return None, None


def resolve_anchor(anchor, manifest, tl, named):
    """'first_run:times_visible' (capture marker) or 'endcard:start' (named timeline item) → output seconds."""
    screen, phase = anchor.split(":", 1)
    if screen in named:
        return named[screen]
    steps = capture_steps(manifest, screen)
    if phase not in steps:
        raise KeyError("anchor %s not found in capture markers %s" % (anchor, list(steps)))
    return tl.to_out(screen, steps[phase])


# ------------------------------------------------------------------ voice
_CB = None


def synth(text, out_wav, engine, work):
    if engine == "yelda":
        return R.tts(text, out_wav, work)
    global _CB
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    if _CB is None:
        dev = "mps" if torch.backends.mps.is_available() else "cpu"
        try:
            _CB = ChatterboxMultilingualTTS.from_pretrained(device=dev)
        except Exception:
            _CB = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    torch.manual_seed(7)
    wav = _CB.generate(text, language_id="tr", exaggeration=0.45, cfg_weight=0.45)
    raw = out_wav + ".raw.wav"
    ta.save(raw, wav, _CB.sr)
    run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-af", "silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse",
         "-ar", "48000", "-ac", "1", out_wav])
    return R.duration(out_wav)


# ------------------------------------------------------------------ layers
def background():
    img = R.gradient().convert("RGBA")
    card_w = int(CARD_H * 1080 / 2348)
    x = (W - card_w) // 2
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x - 6, CARD_Y + 18, x + card_w + 6, CARD_Y + CARD_H + 30], radius=64, fill=(0, 0, 0, 150))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    ImageDraw.Draw(img).rounded_rectangle([x - 8, CARD_Y - 8, x + card_w + 8, CARD_Y + CARD_H + 8], radius=60, fill=(8, 12, 20, 255))
    return img, card_w, x


def mask(card_w):
    m = Image.new("L", (card_w, CARD_H), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, card_w, CARD_H], radius=52, fill=255)
    return m


def top_layer(overlay, subtitle, timer=None, badge=None):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if overlay:
        d = ImageDraw.Draw(img)
        f, lines, lh = R.fit_text(d, R.strip_emoji(overlay), R.FONT_BOLD, W - 140, 250, start=74, minimum=46)
        y = R.SAFE_TOP + 20
        for ln in lines:
            x = (W - d.textlength(ln, font=f)) / 2
            d.text((x + 3, y + 3), ln, font=f, fill=(0, 0, 0, 170))
            d.text((x, y), ln, font=f, fill=(255, 255, 255, 255))
            y += lh
    if subtitle:
        R.draw_subtitle(img, subtitle)
    if timer is not None:
        d = ImageDraw.Draw(img)
        f = R.font(R.FONT_BOLD, 46)
        s = "⏱ 00:%02d" % min(timer, 99) if False else "00:%02d" % min(timer, 99)
        w = d.textlength(s, font=f)
        x0 = W - w - 96
        d.rounded_rectangle([x0 - 26, 128, W - 54, 200], radius=22, fill=(200, 169, 106, 235))
        d.text((x0, 138), s, font=f, fill=(14, 26, 43, 255))
    if badge:
        d = ImageDraw.Draw(img)
        f = R.font(R.FONT_BOLD, 30)
        w = d.textlength(badge, font=f)
        d.rounded_rectangle([54, 136, 54 + w + 40, 192], radius=18, fill=(14, 26, 43, 200))
        d.text((74, 146), badge, font=f, fill=(245, 241, 232, 255))
    return img


# ------------------------------------------------------------------ main
def render(vid, engine):
    spec = json.load(open(os.path.join(ROOT, "media", "pipeline", "edits", vid + ".json")))
    manifest = load_manifest()
    md_path = R.find_md(vid)
    fm, body = R.split_frontmatter(open(md_path, encoding="utf-8").read())
    out_dir = os.path.join(ROOT, "media", "rendered")
    os.makedirs(os.path.join(out_dir, "_backup"), exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for ext in (".mp4", ".srt", ".render.json"):
        p = os.path.join(out_dir, vid + ext)
        if os.path.exists(p):
            shutil.copy2(p, os.path.join(out_dir, "_backup", "%s-%s%s" % (vid, stamp, ext)))

    work = tempfile.mkdtemp(prefix="meyra-edit-%s-" % vid)
    missing, used = [], []
    try:
        # 1) video timeline
        bg, card_w, card_x = background()
        bg_path = os.path.join(work, "bg.png")
        bg.save(bg_path)
        mask_path = os.path.join(work, "mask.png")
        mask(card_w).save(mask_path)
        parts, t, tl, named, cut_notes = [], 0.0, Timeline(), {}, []
        prev_piece = None
        for i, item in enumerate(spec["timeline"]):
            out = os.path.join(work, "v%02d.mp4" % i)
            if item["source"] == "endcard":
                frame = R.base_frame("endcard", None, "")
                R.draw_overlay(frame, item.get("text", ""), False)
                fp = os.path.join(work, "end.png")
                frame.save(fp)
                run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", fp, "-t", "%.3f" % item["dur"], "-r", str(FPS),
                     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out])
                named["endcard"] = t
                dur = item["dur"]
            else:
                screen, kind = item["source"].split(":", 1)[1].split("/")
                entry = manifest["screens"].get(screen)
                rel = entry and entry["files"].get(kind + "_clip")
                if not entry or not entry.get("verified") or not rel:
                    missing.append({"timeline": i, "need": "app_capture", "description": item["source"]})
                    continue
                steps = capture_steps(manifest, screen)
                def at(v, default):
                    if v is None:
                        return default
                    if isinstance(v, (int, float)):
                        return float(v)
                    name, _, off = v.partition("+")
                    return steps[name] + (float(off) if off else 0.0)
                src = os.path.join(ROOT, rel)
                cin = at(item.get("in"), 0.0)
                cout = at(item.get("out"), R.duration(src))
                if cout <= cin + 0.1:
                    continue
                used.append({"path": rel, "source": "media/app-captures/manifest.json (real app recording)"})
                dur = cout - cin
                run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", bg_path, "-ss", "%.3f" % cin, "-i", src, "-loop", "1", "-i", mask_path,
                     "-filter_complex",
                     "[1:v]fps=%d,scale=%d:%d:flags=lanczos,format=rgba[v];[2:v]format=gray[m];[v][m]alphamerge[vr];[0:v][vr]overlay=%d:%d:shortest=1" % (FPS, card_w, CARD_H, card_x, CARD_Y),
                     "-t", "%.3f" % dur, "-r", str(FPS), "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", out])
                if prev_piece and prev_piece[0] == screen and cin - prev_piece[1] > 0.3 and item.get("cut_label"):
                    cut_notes.append({"at": t, "skipped_s": round(cin - prev_piece[1], 1), "label": item.get("cut_label", "kısaltıldı")})
                tl.add(screen, cin, cout, t)
                prev_piece = (screen, cout)
            parts.append(out)
            t += dur
        total = t

        # 2) cues → narration + subtitles + overlays
        cues = []
        for c in spec["cues"]:
            start = resolve_anchor(c["at"], manifest, tl, named) + c.get("offset", 0.0)
            cues.append(dict(c, start=max(0.0, start)))
        cues.sort(key=lambda c: c["start"])
        audio_events, warnings = [], []
        for i, c in enumerate(cues):
            if c.get("say"):
                wav = os.path.join(work, "n%02d.wav" % i)
                c["voice_dur"] = synth(c["say"], wav, engine, work)
                audio_events.append((c["start"], wav))
                nxt = next((x["start"] for x in cues[i + 1:] if x.get("say")), total)
                if c["start"] + c["voice_dur"] > nxt + 0.05:
                    warnings.append("cue %d narration (%.1fs) overlaps the next narration by %.1fs" % (i, c["voice_dur"], c["start"] + c["voice_dur"] - nxt))
        for w_ in warnings:
            print("WARN:", w_)
        subs = []
        for c in cues:
            if not c.get("say"):
                continue
            chunks = R.chunk_subtitle(c["say"])
            wts = [max(len(x), 1) for x in chunks]
            st = c["start"]
            for ch, wgt in zip(chunks, wts):
                d = c["voice_dur"] * wgt / sum(wts)
                subs.append((st, st + d, ch))
                st += d

        # 3) top layer (overlay text, subtitle, real-elapsed timer, cut notes) → PNG sequence with exact durations
        timer_cfg = spec.get("timer")
        if timer_cfg:
            ts, tphase = timer_cfg["from"].split(":", 1)
            t_src_from = capture_steps(manifest, ts)[tphase]
            t_src_to = capture_steps(manifest, ts)[timer_cfg["to"].split(":", 1)[1]]
            timer_out_end = tl.to_out(ts, t_src_to)
        boundaries = {0.0, total} | {c["start"] for c in cues} | {s_ for s_, _, _ in subs} | {e for _, e, _ in subs}
        for n in cut_notes:
            boundaries |= {n["at"], n["at"] + 1.8}
        if timer_cfg:
            for it in tl.items:
                if it["screen"] != ts:
                    continue
                for k in range(0, 200):
                    src_t = t_src_from + k
                    if src_t > t_src_to + 1:
                        break
                    if it["src_in"] <= src_t <= it["src_out"]:
                        boundaries.add(it["out_start"] + (src_t - it["src_in"]))
                boundaries |= {it["out_start"], it["out_end"]}
        events = sorted(e for e in boundaries if 0 <= e <= total)
        layer_list = []
        end_start = named.get("endcard", total)
        for a, b in zip(events, events[1:]):
            if b - a < 0.02:
                continue
            mid = (a + b) / 2
            ov = None
            for c in cues:
                if c.get("overlay") is not None and c["start"] <= mid:
                    ov = c["overlay"] or None
            sub = next((txt for s_, e, txt in subs if s_ <= mid < e), None)
            timer = None
            if timer_cfg and mid < end_start:
                scr, src_t = tl.to_src(mid)
                if scr == ts and src_t is not None and src_t >= t_src_from:
                    timer = int(min(src_t, t_src_to) - t_src_from)
                elif mid >= timer_out_end:
                    timer = int(t_src_to - t_src_from)
            note = next(("%s · %.0f sn" % (n["label"], n["skipped_s"]) for n in cut_notes if n["at"] <= mid < n["at"] + 1.8), None)
            img = top_layer(ov, sub, timer, note or (spec.get("badge") if mid < end_start else None))
            p = os.path.join(work, "top_%04d.png" % len(layer_list))
            img.save(p)
            layer_list.append((p, b - a))
        concat_top = os.path.join(work, "top.txt")
        with open(concat_top, "w") as fh:
            for p, d in layer_list:
                fh.write("file '%s'\nduration %.3f\n" % (p, d))
            fh.write("file '%s'\n" % layer_list[-1][0])

        # 4) assemble video + top layer
        lst = os.path.join(work, "parts.txt")
        open(lst, "w").write("".join("file '%s'\n" % p for p in parts))
        base = os.path.join(work, "base.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", base])
        composed = os.path.join(work, "composed.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-i", base, "-f", "concat", "-safe", "0", "-i", concat_top,
             "-filter_complex", "[1:v]fps=%d,format=rgba[t];[0:v][t]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.3,fade=t=out:st=%.3f:d=0.5" % (FPS, max(total - 0.5, 0)),
             "-t", "%.3f" % total, "-r", str(FPS), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", composed])

        # 5) audio: narration placed at cue times (+ optional licensed music bed: none available)
        inputs, filt = [], []
        for i, (st, wav) in enumerate(audio_events):
            inputs += ["-i", wav]
            filt.append("[%d:a]adelay=%d:all=1[a%d]" % (i, int(st * 1000), i))
        mix = os.path.join(work, "narration.wav")
        if audio_events:
            run(["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", ";".join(filt) + ";" + "".join("[a%d]" % i for i in range(len(audio_events)))
                 + "amix=inputs=%d:normalize=0,apad,atrim=0:%.3f,loudnorm=I=-15:TP=-1.5:LRA=9[out]" % (len(audio_events), total), "-map", "[out]", "-ar", "48000", "-ac", "2", mix])
        else:
            R.silence(mix, total)
        out_mp4 = os.path.join(out_dir, vid + ".mp4")
        tmp = os.path.join(work, "final.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-i", composed, "-i", mix, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", tmp])
        shutil.move(tmp, out_mp4)

        srt = "\n".join("%d\n%s --> %s\n%s\n" % (i + 1, R.srt_time(s), R.srt_time(e), R.strip_emoji(x)) for i, (s, e, x) in enumerate(subs))
        open(os.path.join(out_dir, vid + ".srt"), "w", encoding="utf-8").write(srt)

        voice = {"type": "tts-candidate", "engine": "Resemble AI Chatterbox Multilingual (MIT)" if engine == "chatterbox" else "macOS Yelda (draft)",
                 "note": "Candidate voice: owner has not chosen the final TTS engine yet (see media/audio/README.md)."}
        kind = "animatic" if missing else "candidate"
        manifest_out = {
            "id": vid, "title": fm.get("title"), "source_md": os.path.relpath(md_path, ROOT), "source_md_hash": R.content_hash(body),
            "edit_spec": "media/pipeline/edits/%s.json" % vid, "rendered_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "rendered_epoch": time.time(), "file": os.path.relpath(out_mp4, ROOT), "srt": "media/rendered/%s.srt" % vid,
            "sha256": R.sha256_file(out_mp4), "duration_s": round(R.duration(out_mp4), 2), "width": W, "height": H, "fps": FPS,
            "kind": kind, "voice": voice, "music": None,
            "music_note": "No licensed music bundled; add a platform-library track at upload if desired.",
            "cues": [{k: (round(v, 2) if isinstance(v, float) else v) for k, v in c.items()} for c in cues],
            "cuts": cut_notes, "timer": ({"from": timer_cfg["from"], "to": timer_cfg["to"], "real_elapsed_s": round(t_src_to - t_src_from, 2)} if timer_cfg else None),
            "warnings": warnings,
            "capture_source": {"device": manifest.get("device"), "app_version": manifest.get("app_version"), "captured_at": manifest.get("captured_at")},
            "missing_assets": missing, "used_assets": used,
        }
        json.dump(manifest_out, open(os.path.join(out_dir, vid + ".render.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print("%s: %s · %.1fs · voice %s · missing %d" % (vid, kind, manifest_out["duration_s"], engine, len(missing)))
        return manifest_out
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    vid = next((a for a in args if re.match(r"^V\d+$", a)), None)
    engine = args[args.index("--voice") + 1] if "--voice" in args else "chatterbox"
    if not vid:
        print(__doc__)
        sys.exit(2)
    render(vid, engine)
