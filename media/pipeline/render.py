#!/usr/bin/env python3
"""Meyra short-video renderer (9:16, 1080x1920, 30 fps).

Reads content/videos/V##-*.md, builds one clip per script row, adds Turkish voice-over,
burns subtitles (rendered with Pillow), and writes:
  media/rendered/V##.mp4, V##.srt, V##.render.json

Never invents visuals: a row that needs a screen recording or stock footage we don't have
gets a clearly labelled placeholder slate, and the gap is listed in missing_assets.
A render is "final" only when no asset is missing and an owner voice-over is supplied;
otherwise it is an "animatic" (draft) and the publish gate refuses it.

Usage: python3 media/pipeline/render.py V01 [V02 ...] | --all  [--force]
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H, FPS = 1080, 1920, 30
SAFE_TOP, SAFE_BOTTOM = int(H * 0.12), int(H * 0.80)
BRAND = {  # placeholder palette from config/brand.md until the owner supplies a brand kit
    "night": (14, 26, 43), "green": (46, 125, 107), "offwhite": (245, 241, 232), "gold": (200, 169, 106),
}
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
TTS_VOICE = "Yelda"  # macOS built-in tr_TR voice
OFFICIAL_SHOTS = {"zikir": "zikir.png", "quran": "quran.png", "home": "home.png"}
EMOJI_RE = re.compile("[\U0001F000-\U0001FFFF☀-➿⌀-⏿⬀-⯿️‍⃣]")


# ---------------------------------------------------------------- parsing
def split_frontmatter(text):
    m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$", text)
    if not m:
        return {}, text
    fm = {}
    for line in m.group(1).splitlines():
        mm = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", re.sub(r"\s+#.*$", "", line))
        if mm:
            fm[mm.group(1)] = mm.group(2).strip().strip('"')
    return fm, m.group(2)


def content_hash(body):  # must match scripts/lib/content.mjs contentHash
    return hashlib.sha256(body.replace("\r\n", "\n").strip().encode("utf-8")).hexdigest()[:16]


def section(body, name):
    m = re.search(r"^##\s+" + re.escape(name) + r"\s*$([\s\S]*?)(?=^##\s|\Z)", body, re.M)
    return m.group(1) if m else ""


def clean(s):
    s = re.sub(r"\*\*|__|`", "", s or "").strip()
    return s


def parse_time(cell):
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)", cell)
    if not m:
        return None
    return float(m.group(1).replace(",", ".")), float(m.group(2).replace(",", "."))


def parse_script(body):
    rows = [l.strip() for l in section(body, "Script").splitlines() if l.strip().startswith("|")]
    if len(rows) < 3:
        raise ValueError("Script table not found")
    split = lambda l: [c.strip() for c in l.strip().strip("|").split("|")]
    head = [h.lower() for h in split(rows[0])]
    idx = lambda pred: next((i for i, h in enumerate(head) if pred(h)), None)
    c_time = idx(lambda h: h.startswith("zaman"))
    c_vo = idx(lambda h: "seslendirme" in h)
    c_text = idx(lambda h: h.startswith("ekran yazısı"))
    c_vis = idx(lambda h: h.startswith("görüntü"))
    out = []
    for r in rows[2:]:
        c = split(r)
        t = parse_time(c[c_time]) if c_time is not None else None
        vis = clean(c[c_vis]) if c_vis is not None and c_vis < len(c) else ""
        vo = clean(c[c_vo]) if c_vo is not None and c_vo < len(c) else ""
        text = clean(c[c_text]) if c_text is not None and c_text < len(c) else ""
        if not text:
            m = re.search(r'Yazı:\s*"([^"]+)"', vis)
            text = m.group(1) if m else ""
        if vo.startswith("("):  # e.g. "(Seslendirme yok; ...)"
            vo = ""
        text_only = c_vo is None  # scripts without a voice column: voice the on-screen text
        out.append({
            "start": t[0] if t else None, "end": t[1] if t else None,
            "vo": (text if text_only else vo).strip('"'), "overlay": text.strip('"'),
            "visual": vis, "text_only": text_only,
        })
    return out


# ---------------------------------------------------------------- assets
def library_asset(vid, n):
    d = os.path.join(ROOT, "assets", "library", vid)
    for ext in ("mp4", "mov", "png", "jpg", "jpeg"):
        p = os.path.join(d, "seg%02d.%s" % (n, ext))
        if os.path.exists(p):
            return p
    return None


CAPTURE_KEYWORDS = [  # (capture screen, keywords in the row's visual description); order matters
    ("first_run", ["ilk açılış", "konum izni", "izin pencere"]),
    ("notifications", ["bildirim ayar", "hatırlatma ayar"]),
    ("qibla", ["kıble"]),
    ("zikirmatik", ["zikirmatik", "zikir", "tesbih", "sayaç artıyor"]),
    ("hatim", ["hatim"]),
    ("learn_quran", ["kur'an öğren", "harf", "ders", "alıştırma", "elifba"]),
    ("worship_tracking", ["kaza", "ibadet takib", "ilerleme ekran"]),
    ("esmaul_husna", ["esmaül", "esma"]),
    ("quran", ["kur'an", "sure"]),
    ("dua", ["dua"]),
    ("zakat", ["zekat"]),
    ("mosques", ["cami"]),
    ("religious_days", ["dini gün", "dini takvim"]),
    ("prayer_times", ["vakit listesi", "vakit tablosu", "vakitler"]),
    ("home", ["ana ekran", "ana sayfa"]),
]
NOT_CAPTURABLE = ["widget", "apple watch", "asistan"]  # not recorded by the bot (iOS widget/Watch; AI assistant would query production AI)
_CAP_MANIFEST = None


def app_capture_for(visual):
    """Verified real-app capture clip for a row's visual, or None."""
    global _CAP_MANIFEST
    v = visual.lower()
    if any(k in v for k in NOT_CAPTURABLE):
        return None
    if _CAP_MANIFEST is None:
        mp = os.path.join(ROOT, "media", "app-captures", "manifest.json")
        _CAP_MANIFEST = json.load(open(mp)) if os.path.exists(mp) else {"screens": {}}
    for screen, kws in CAPTURE_KEYWORDS:
        if any(k in v for k in kws):
            e = _CAP_MANIFEST["screens"].get(screen)
            if e and e.get("verified"):
                f = e["files"]
                rel = f.get("use_clip") or f.get("full_clip") or f.get("open_clip")
                if rel and os.path.exists(os.path.join(ROOT, rel)):
                    return {"screen": screen, "path": os.path.join(ROOT, rel), "rel": rel}
            return None
    return None


def card_background():
    """Gradient + shadow for a phone card that holds real app footage (same look as edit_render)."""
    img = gradient().convert("RGBA")
    card_h, card_y = 1300, 520
    card_w = int(card_h * 1080 / 2348)
    x = (W - card_w) // 2
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([x - 6, card_y + 18, x + card_w + 6, card_y + card_h + 30], radius=64, fill=(0, 0, 0, 150))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28)))
    ImageDraw.Draw(img).rounded_rectangle([x - 8, card_y - 8, x + card_w + 8, card_y + card_h + 8], radius=60, fill=(8, 12, 20, 255))
    m = Image.new("L", (card_w, card_h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, card_w, card_h], radius=52, fill=255)
    return img, m, card_w, card_h, x, card_y


def owner_voiceover(vid):
    d = os.path.join(ROOT, "assets", "library", vid)
    for ext in ("wav", "m4a", "mp3", "aiff"):
        p = os.path.join(d, "voiceover." + ext)
        if os.path.exists(p):
            return p
    return None


def classify_visual(vis):
    v = vis.lower()
    if "logo" in v and ("ekran kaydı" not in v):
        return ("endcard", None)
    needs_screen = "ekran kaydı" in v or re.search(r"\bekranı\b", v) is not None
    if needs_screen:
        if "zikirmatik" in v or "zikir" in v:
            return ("screen", "zikir")
        if "ana ekran" in v or "vakit listesi" in v:
            return ("screen", "home")
        if "kur'an" in v and not any(k in v for k in ("harf", "ders", "alıştırma", "öğren")):
            return ("screen", "quran")
        return ("screen", None)
    return ("broll", None)


# ---------------------------------------------------------------- drawing
def font(path, size):
    return ImageFont.truetype(path, size)


def strip_emoji(s):
    return re.sub(r"\s{2,}", " ", EMOJI_RE.sub("", s)).strip()


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_text(draw, text, path, max_w, max_h, start=78, minimum=40):
    size = start
    while size >= minimum:
        f = font(path, size)
        lines = wrap(draw, text, f, max_w)
        lh = int(size * 1.22)
        if lh * len(lines) <= max_h:
            return f, lines, lh
        size -= 4
    f = font(path, minimum)
    return f, wrap(draw, text, f, max_w), int(minimum * 1.22)


def gradient():
    img = Image.new("RGB", (W, H))
    top, bot = BRAND["night"], BRAND["green"]
    px = ImageDraw.Draw(img)
    for y in range(H):
        t = (y / H) ** 1.6
        px.line([(0, y), (W, y)], fill=tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)))
    return img


def phone_card(shot_path, height=1180):
    shot = Image.open(shot_path).convert("RGBA")
    ratio = height / shot.height
    shot = shot.resize((int(shot.width * ratio), height), Image.LANCZOS)
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width, shot.height], radius=56, fill=255)
    card = Image.new("RGBA", shot.size)
    card.paste(shot, (0, 0), mask)
    return card


def base_frame(kind, shot_key, label):
    img = gradient().convert("RGBA")
    d = ImageDraw.Draw(img)
    if kind == "screen" and shot_key:
        card = phone_card(os.path.join(ROOT, "assets", "brand", OFFICIAL_SHOTS[shot_key]))
        shadow = Image.new("RGBA", (card.width + 80, card.height + 80), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle([40, 40, card.width + 40, card.height + 40], radius=60, fill=(0, 0, 0, 140))
        shadow = shadow.filter(ImageFilter.GaussianBlur(24))
        x, y = (W - card.width) // 2, 560
        img.alpha_composite(shadow, (x - 40, y - 30))
        img.alpha_composite(card, (x, y))
        tag = "Resmi ekran görüntüsü · ekran kaydı bekleniyor"
        f = font(FONT_REG, 30)
        d.text(((W - d.textlength(tag, font=f)) / 2, y + card.height + 18), tag, font=f, fill=(255, 255, 255, 170))
    elif kind in ("screen", "broll"):
        box = [90, 620, W - 90, 1240]
        d.rounded_rectangle(box, radius=36, outline=BRAND["gold"], width=5, fill=(0, 0, 0, 70))
        title = "EKSİK EKRAN KAYDI" if kind == "screen" else "EKSİK GÖRSEL (stok/çekim)"
        f1 = font(FONT_BOLD, 50)
        d.text(((W - d.textlength(title, font=f1)) / 2, box[1] + 50), title, font=f1, fill=BRAND["gold"])
        f2, lines, lh = fit_text(d, strip_emoji(label)[:220], FONT_REG, box[2] - box[0] - 100, 420, start=40, minimum=28)
        y = box[1] + 140
        for ln in lines:
            d.text(((W - d.textlength(ln, font=f2)) / 2, y), ln, font=f2, fill=(255, 255, 255, 220))
            y += lh
    elif kind == "endcard":
        icon = Image.open(os.path.join(ROOT, "assets", "brand", "icon.png")).convert("RGBA").resize((340, 340), Image.LANCZOS)
        m = Image.new("L", icon.size, 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, 340, 340], radius=76, fill=255)
        img.paste(icon, ((W - 340) // 2, 640), m)
        f = font(FONT_BOLD, 76)
        d.text(((W - d.textlength("Meyra", font=f)) / 2, 1010), "Meyra", font=f, fill=BRAND["offwhite"])
        f3 = font(FONT_REG, 40)
        s = "Kendine yeniden başla."
        d.text(((W - d.textlength(s, font=f3)) / 2, 1110), s, font=f3, fill=BRAND["gold"])
    return img


def draw_overlay(img, text, centered):
    if not text:
        return
    d = ImageDraw.Draw(img)
    text = strip_emoji(text)
    if centered:
        f, lines, lh = fit_text(d, text, FONT_BOLD, W - 160, 700, start=84, minimum=48)
        y = (H - lh * len(lines)) // 2 - 60
    else:
        f, lines, lh = fit_text(d, text, FONT_BOLD, W - 160, 300, start=72, minimum=44)
        y = SAFE_TOP + 40
    for ln in lines:
        x = (W - d.textlength(ln, font=f)) / 2
        d.text((x + 3, y + 3), ln, font=f, fill=(0, 0, 0, 160))
        d.text((x, y), ln, font=f, fill=(255, 255, 255, 255))
        y += lh


def draw_subtitle(img, text):
    if not text:
        return
    d = ImageDraw.Draw(img)
    f, lines, lh = fit_text(d, strip_emoji(text), FONT_BOLD, W - 200, 200, start=50, minimum=36)
    box_h = lh * len(lines) + 36
    y0 = SAFE_BOTTOM - box_h - 20
    widest = max(d.textlength(l, font=f) for l in lines)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rounded_rectangle([(W - widest) / 2 - 28, y0, (W + widest) / 2 + 28, y0 + box_h], radius=22, fill=(0, 0, 0, 165))
    img.alpha_composite(overlay)
    y = y0 + 18
    for ln in lines:
        d.text(((W - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=(255, 255, 255, 255))
        y += lh


def draw_draft_tag(img):
    d = ImageDraw.Draw(img)
    f = font(FONT_BOLD, 28)
    s = "TASLAK · yayına hazır değil"
    w = d.textlength(s, font=f)
    d.rounded_rectangle([W - w - 70, 60, W - 30, 112], radius=14, fill=(180, 40, 40, 210))
    d.text((W - w - 50, 70), s, font=f, fill=(255, 255, 255, 255))


# ---------------------------------------------------------------- audio
def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError("command failed: %s\n%s" % (" ".join(cmd[:6]), p.stderr[-1500:]))
    return p.stdout


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).strip())


def tts(text, out_wav, work):
    aiff = os.path.join(work, os.path.basename(out_wav) + ".aiff")
    spoken = strip_emoji(text).replace("“", "").replace("”", "").replace('"', "")
    run(["say", "-v", TTS_VOICE, "-r", "170", "-o", aiff, spoken])
    run(["ffmpeg", "-y", "-v", "error", "-i", aiff, "-ar", "48000", "-ac", "1", out_wav])
    return duration(out_wav)


def silence(out_wav, secs):
    run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "%.3f" % secs, out_wav])


def chunk_subtitle(text, max_chars=42):
    parts, cur = [], ""
    for w in strip_emoji(text).split():
        last = cur.split()[-1] if cur else ""
        if len(cur) + len(w) + 1 > max_chars and cur and not re.match(r"^\d+$", last):
            parts.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
        if cur.endswith((".", "?", "!", ":")) and len(cur) > 18:
            parts.append(cur)
            cur = ""
    if cur:
        parts.append(cur)
    return parts or [""]


def srt_time(t):
    ms = int(round(t * 1000))
    return "%02d:%02d:%02d,%03d" % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)


# ---------------------------------------------------------------- render
def find_md(vid):
    d = os.path.join(ROOT, "content", "videos")
    for f in sorted(os.listdir(d)):
        if f.startswith(vid + "-") and f.endswith(".md"):
            return os.path.join(d, f)
    raise FileNotFoundError("no content file for " + vid)


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as fh:
        for b in iter(lambda: fh.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def render(vid, force=False):
    edit_spec = os.path.join(ROOT, "media", "pipeline", "edits", vid + ".json")
    prev_json = os.path.join(ROOT, "media", "rendered", vid + ".render.json")
    if os.path.exists(edit_spec) and os.path.exists(prev_json):  # real-footage edit: owned by edit_render.py, never overwritten here
        return json.load(open(prev_json)), "skipped (edit spec; re-render with media/pipeline/edit_render.py)"
    md_path = find_md(vid)
    text = open(md_path, encoding="utf-8").read()
    fm, body = split_frontmatter(text)
    src_hash = content_hash(body)
    out_dir = os.path.join(ROOT, "media", "rendered")
    os.makedirs(out_dir, exist_ok=True)
    out_mp4, out_srt, out_json = [os.path.join(out_dir, vid + e) for e in (".mp4", ".srt", ".render.json")]
    lib_dir = os.path.join(ROOT, "assets", "library", vid)
    lib_mtime = max([os.path.getmtime(os.path.join(lib_dir, f)) for f in os.listdir(lib_dir)] or [0]) if os.path.isdir(lib_dir) else 0
    if not force and os.path.exists(out_json) and os.path.exists(out_mp4):
        prev = json.load(open(out_json))
        if prev.get("source_md_hash") == src_hash and prev.get("rendered_epoch", 0) >= lib_mtime:
            return prev, "skipped (up to date)"

    rows = parse_script(body)
    hook = re.search(r'Ekran yazısı[^:]*:\**\s*"([^"]+)"', section(body, "Hook"))
    if rows and not rows[0]["overlay"] and hook:  # brand rule: hook text visible on the first frame
        rows[0]["overlay"] = hook.group(1)
    owner_vo = owner_voiceover(vid)
    work = tempfile.mkdtemp(prefix="meyra-%s-" % vid)
    missing, used, segs = [], [{"path": "assets/brand/icon.png", "source": "assets/brand/SOURCES.md"}], []
    try:
        # 1) audio + durations
        audio_parts, t = [], 0.0
        for i, r in enumerate(rows, 1):
            planned = (r["end"] - r["start"]) if r["start"] is not None else 3.0
            dur, wav = planned, os.path.join(work, "a%02d.wav" % i)
            if not owner_vo and r["vo"]:
                spoken = tts(r["vo"], wav, work)
                dur = max(planned, spoken + 0.35)
                padded = os.path.join(work, "p%02d.wav" % i)
                run(["ffmpeg", "-y", "-v", "error", "-i", wav, "-af", "apad", "-t", "%.3f" % dur, "-ar", "48000", "-ac", "1", padded])
                wav = padded
            else:
                silence(wav, dur)
            audio_parts.append(wav)
            r["dur"], r["t0"] = dur, t
            t += dur
        total = t
        if owner_vo:  # scale planned durations to the owner's voice-over length
            vo_len = duration(owner_vo)
            scale = vo_len / total
            t = 0.0
            for r in rows:
                r["dur"] *= scale
                r["t0"] = t
                t += r["dur"]
            total = vo_len

        # 2) frames per subtitle chunk (finality is known up front so the draft tag is drawn once)
        will_miss = any(not library_asset(vid, i) and not (classify_visual(r["visual"])[0] == "screen" and app_capture_for(r["visual"]))
                        and classify_visual(r["visual"])[0] in ("screen", "broll") for i, r in enumerate(rows, 1))
        cbg, cmask, card_w, card_h, card_x, card_y = card_background()
        cbg_path, cmask_path = os.path.join(work, "card_bg.png"), os.path.join(work, "card_mask.png")
        cbg.save(cbg_path)
        cmask.save(cmask_path)
        draft = will_miss or not owner_vo
        clips, srt, n_sub = [], [], 0
        for i, r in enumerate(rows, 1):
            kind, shot = classify_visual(r["visual"])
            lib = library_asset(vid, i)
            cap = None if lib else (app_capture_for(r["visual"]) if kind == "screen" else None)
            if lib:
                used.append({"path": os.path.relpath(lib, ROOT), "source": "owner library"})
            elif cap:
                used.append({"path": cap["rel"], "source": "real app capture (media/app-captures/manifest.json)"})
            elif kind == "screen":
                missing.append({"segment": i, "need": "screen_recording", "description": r["visual"]})
                if shot:
                    used.append({"path": "assets/brand/" + OFFICIAL_SHOTS[shot], "source": "assets/brand/SOURCES.md (still, interim)"})
            elif kind == "broll":
                missing.append({"segment": i, "need": "broll_or_footage", "description": r["visual"]})
            centered = r["text_only"]
            chunks = [r["overlay"]] if centered else chunk_subtitle(r["vo"]) if r["vo"] else [""]
            weights = [max(len(c), 1) for c in chunks]
            ct = r["t0"]
            for j, ch in enumerate(chunks):
                cd = r["dur"] * weights[j] / sum(weights)
                bg_is_video = lib and lib.lower().endswith((".mp4", ".mov"))
                if cap:
                    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                elif lib and not bg_is_video:
                    frame = Image.open(lib).convert("RGBA")
                    frame = frame.resize((W, int(frame.height * W / frame.width)), Image.LANCZOS)
                    canvas = gradient().convert("RGBA")
                    canvas.alpha_composite(frame, (0, max(0, (H - frame.height) // 2)))
                    frame = canvas
                elif bg_is_video:
                    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
                else:
                    frame = base_frame(kind, shot, r["visual"])
                draw_overlay(frame, r["overlay"], centered)
                if not centered:
                    draw_subtitle(frame, ch)
                if draft:
                    draw_draft_tag(frame)
                frame_path = os.path.join(work, "f%02d_%02d.png" % (i, j))
                frame.save(frame_path)
                clip = os.path.join(work, "c%02d_%02d.mp4" % (i, j))
                enc = ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), "-preset", "veryfast", "-crf", "20"]
                if cap:
                    off = ct - r["t0"]
                    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", cbg_path, "-stream_loop", "-1", "-ss", "%.3f" % off, "-i", cap["path"],
                         "-loop", "1", "-i", cmask_path, "-loop", "1", "-i", frame_path, "-filter_complex",
                         "[1:v]fps=%d,scale=%d:%d:flags=lanczos,format=rgba[v];[2:v]format=gray[m];[v][m]alphamerge[vr];[0:v][vr]overlay=%d:%d[b];[b][3:v]overlay=0:0" % (FPS, card_w, card_h, card_x, card_y),
                         "-t", "%.3f" % cd, "-an"] + enc + [clip])
                elif bg_is_video:
                    off = ct - r["t0"]
                    run(["ffmpeg", "-y", "-v", "error", "-ss", "%.3f" % off, "-i", lib, "-loop", "1", "-i", frame_path,
                         "-filter_complex", "[0:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1[bg];[bg][1:v]overlay=0:0" % (W, H, W, H),
                         "-t", "%.3f" % cd, "-an"] + enc + [clip])
                else:
                    run(["ffmpeg", "-y", "-v", "error", "-loop", "1", "-i", frame_path, "-t", "%.3f" % cd, "-an"] + enc + [clip])
                clips.append(clip)
                sub_text = r["overlay"] if centered else ch
                if sub_text:
                    n_sub += 1
                    srt.append("%d\n%s --> %s\n%s\n" % (n_sub, srt_time(ct), srt_time(ct + cd), strip_emoji(sub_text)))
                r.setdefault("chunks", []).append(sub_text)
                ct += cd
            segs.append({"n": i, "start": round(r["t0"], 2), "end": round(r["t0"] + r["dur"], 2), "visual_kind": kind,
                         "visual": r["visual"], "overlay": r["overlay"], "voice_text": r["vo"]})

        is_final = not missing and bool(owner_vo)

        # 3) concat video + audio
        lst = os.path.join(work, "clips.txt")
        open(lst, "w").write("".join("file '%s'\n" % c for c in clips))
        silent_video = os.path.join(work, "video.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent_video])
        if owner_vo:
            audio = owner_vo
        else:
            alst = os.path.join(work, "audio.txt")
            open(alst, "w").write("".join("file '%s'\n" % a for a in audio_parts))
            audio = os.path.join(work, "audio.wav")
            run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", alst, "-c", "copy", audio])
        tmp_out = os.path.join(work, "out.mp4")
        run(["ffmpeg", "-y", "-v", "error", "-i", silent_video, "-i", audio,
             "-vf", "fade=t=in:st=0:d=0.4,fade=t=out:st=%.3f:d=0.5" % max(total - 0.5, 0),
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", str(FPS), "-preset", "medium", "-crf", "20",
             "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-shortest", tmp_out])
        shutil.move(tmp_out, out_mp4)
        open(out_srt, "w", encoding="utf-8").write("\n".join(srt))

        manifest = {
            "id": vid, "title": fm.get("title"), "source_md": os.path.relpath(md_path, ROOT), "source_md_hash": src_hash,
            "rendered_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "rendered_epoch": __import__("time").time(),
            "file": os.path.relpath(out_mp4, ROOT), "srt": os.path.relpath(out_srt, ROOT), "sha256": sha256_file(out_mp4),
            "duration_s": round(duration(out_mp4), 2), "width": W, "height": H, "fps": FPS,
            "kind": "final" if is_final else "animatic",
            "voice": {"type": "owner", "file": os.path.relpath(owner_vo, ROOT)} if owner_vo else {
                "type": "tts-draft", "engine": "macOS say (%s, tr_TR)" % TTS_VOICE,
                "note": "Draft only. Apple's macOS licence limits system voices; replace with an owner voice-over (assets/library/%s/voiceover.wav) or an approved licensed TTS before publishing." % vid},
            "music": None, "music_note": "No licensed music in assets/library/music; add from the platform library at upload or provide a licensed track.",
            "segments": segs, "missing_assets": missing, "used_assets": used,
        }
        json.dump(manifest, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        return manifest, "rendered"
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main(argv):
    force = "--force" in argv
    ids = [a for a in argv if re.match(r"^V\d+$", a)]
    if "--all" in argv:
        ids = sorted({f.split("-")[0] for f in os.listdir(os.path.join(ROOT, "content", "videos")) if re.match(r"^V\d+-.*\.md$", f)})
    if not ids:
        print(__doc__)
        return 2
    if not shutil.which("ffmpeg"):
        print("ffmpeg not found (brew install ffmpeg)")
        return 2
    failed = 0
    for vid in ids:
        try:
            m, status = render(vid, force)
            print("%s: %s · %s · %.1fs · missing assets: %d" % (vid, status, m["kind"], m["duration_s"], len(m["missing_assets"])))
        except Exception as e:  # report and continue with other videos
            failed += 1
            print("%s: FAILED · %s" % (vid, str(e).splitlines()[0][:300]))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
