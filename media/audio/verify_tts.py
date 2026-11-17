#!/usr/bin/env python3
"""Voice-over QA: transcribes audio with local Whisper (MIT) and scores it against the intended text.
Usage: ~/projects/.meyra-tts/bin/python media/audio/verify_tts.py <audio> [<audio>...] --text "expected text" | --json samples.json"""
import json, re, sys, unicodedata, difflib
import whisper

def norm(s):
    s = unicodedata.normalize("NFC", s).lower().replace("'", " ").replace("’", " ")
    s = re.sub(r"[^\wçğıöşüâîû ]+", " ", s)
    return [w for w in s.split() if w]

def score(expected, heard):
    a, b = norm(expected), norm(heard)
    sm = difflib.SequenceMatcher(None, a, b)
    missing = [w for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag in ("delete", "replace") for w in a[i1:i2]]
    return round(sm.ratio(), 3), missing

def main(argv):
    files, text = [a for a in argv if not a.startswith("--") and a.endswith((".mp3", ".wav", ".m4a", ".mp4"))], None
    if "--text" in argv: text = argv[argv.index("--text") + 1]
    if "--json" in argv:
        d = json.load(open(argv[argv.index("--json") + 1])); text = d["text"]; files = [s["file"] for s in d["samples"]]
    model = whisper.load_model("small")
    out = []
    for f in files:
        r = model.transcribe(f, language="tr", fp16=False)
        ratio, missing = score(text, r["text"])
        out.append({"file": f, "match": ratio, "missing_or_changed_words": missing[:20], "heard": r["text"].strip()})
        print("%-45s match=%.2f missing=%s" % (f.split("/")[-1], ratio, missing[:10]))
    return out

if __name__ == "__main__":
    res = main(sys.argv[1:])
    if "--save" in sys.argv: json.dump(res, open(sys.argv[sys.argv.index("--save") + 1], "w"), ensure_ascii=False, indent=2)
