#!/usr/bin/env python3
"""Turkish TTS samples for owner evaluation (no engine is chosen yet).

Run with the isolated venv (Python 3.11):
  ~/projects/.meyra-tts/bin/python media/audio/make_samples.py

Writes MP3s to media/audio/samples/ + samples.json. Engines (free, local, licence noted per file):
  - chatterbox-tr-natural / chatterbox-tr-calm : Resemble AI Chatterbox Multilingual (MIT), two delivery settings
  - macos-yelda-baseline                       : macOS built-in voice used today (licence limits commercial use)
"""
import json
import os
import subprocess
import sys
import time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "media", "audio", "samples")
TEXT = ("Namaz vakitlerini ve ezan bildirimini otuz saniyede kuralım. Meyra'yı aç, konum iznini ver. "
        "Bulunduğun yere göre bugünün vakitleri hazır. Bildirim ayarlarından ezan bildirimini istediğin vakitler için aç. "
        "Bu kadar. Meyra ücretsiz, link profilde.")


def to_mp3(src, dst):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", dst], check=True)


def duration(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                                capture_output=True, text=True).stdout.strip())


def main():
    os.makedirs(OUT, exist_ok=True)
    results = []

    # Baseline: macOS Yelda (current draft voice)
    aiff = os.path.join(OUT, "_yelda.aiff")
    subprocess.run(["say", "-v", "Yelda", "-r", "170", "-o", aiff, TEXT], check=True)
    dst = os.path.join(OUT, "macos-yelda-baseline.mp3")
    to_mp3(aiff, dst)
    os.remove(aiff)
    results.append({"file": "media/audio/samples/macos-yelda-baseline.mp3", "engine": "macOS say · Yelda (tr_TR)", "type": "concatenative/system voice",
                    "license": "Apple macOS licence: system voices limited to personal, non-commercial use (confirm before any commercial use)",
                    "cost": "0", "duration_s": round(duration(dst), 1)})

    # Chatterbox Multilingual (MIT)
    import torch
    import torchaudio as ta
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    t0 = time.time()
    try:
        model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    except Exception as e:  # MPS can fail for some ops; fall back to CPU
        print("MPS load failed (%s); using CPU" % e)
        device = "cpu"
        model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    print("chatterbox loaded on %s in %.0fs" % (device, time.time() - t0))
    for name, kw, desc in [
        ("chatterbox-tr-natural", {"exaggeration": 0.5, "cfg_weight": 0.5}, "default delivery"),
        ("chatterbox-tr-calm", {"exaggeration": 0.3, "cfg_weight": 0.3}, "calmer, slower delivery"),
    ]:
        torch.manual_seed(7)
        t1 = time.time()
        wav = model.generate(TEXT, language_id="tr", **kw)
        tmp = os.path.join(OUT, "_%s.wav" % name)
        ta.save(tmp, wav, model.sr)
        dst = os.path.join(OUT, name + ".mp3")
        to_mp3(tmp, dst)
        os.remove(tmp)
        results.append({"file": "media/audio/samples/%s.mp3" % name, "engine": "Resemble AI Chatterbox Multilingual (local, %s)" % device,
                        "settings": kw, "type": "neural (0.5B, zero-shot multilingual)", "variant": desc,
                        "license": "MIT (commercial use allowed). Output carries Resemble's imperceptible Perth watermark.",
                        "cost": "0", "render_time_s": round(time.time() - t1, 1), "duration_s": round(duration(dst), 1)})
        print("%s done (%.0fs)" % (name, time.time() - t1))

    json.dump({"text": TEXT, "generated_at": time.strftime("%Y-%m-%d %H:%M"), "samples": results},
              open(os.path.join(OUT, "samples.json"), "w"), ensure_ascii=False, indent=2)
    print("wrote %d samples to media/audio/samples/" % len(results))


if __name__ == "__main__":
    sys.exit(main())
