#!/usr/bin/env python3
"""Automatic real-app screen capture for Meyra (Apple tools only).

Records the iOS Simulator while the XCUITest scenario drives the installed Meyra debug build, then cuts
stills / clips / zoom clips at the markers the test prints, into media/app-captures/<screen>/.

  python3 media/capture/run_capture.py features      # feature tour (app must already be set up)
  python3 media/capture/run_capture.py firstrun      # reinstall → real first-run flow (V02)
  python3 media/capture/run_capture.py all

Never edits the Flutter project; the app is built from the disposable copy (config/app-project.md).
Screens that can't be reached are reported as missing; nothing is faked.
"""
import json
import os
import re
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
XCUI = os.path.join(ROOT, "media", "capture", "xcui", "MeyraCapture.xcodeproj")
OUT = os.path.join(ROOT, "media", "app-captures")
WORK = os.path.join(ROOT, "media", "work")
BUILD_COPY = os.path.expanduser("~/projects/.meyra-capture-build")
APP = os.path.join(BUILD_COPY, "build", "ios", "iphonesimulator", "Runner.app")
BUNDLE = "com.omerozkan.mira.ios"
UDID = os.environ.get("MEYRA_SIM_UDID", "CDCE3432-DDED-4084-9842-14A7E86A317F")  # iPhone 17 Pro, iOS 26.5
LOCATION = "41.0165,28.9497"  # Fatih, İstanbul (fixed test location, not a person's location)
MARK = re.compile(r"CAPTURE_MARK\|([\d.]+)\|([\w-]+)\|([\w:'\-.]+)")
OUT_W = 1080  # vertical output width (native aspect kept: 1080x2348 for iPhone 17 Pro)
# Zoom regions (normalized x, y, w, h of the screen) for screens where a close-up helps.
ZOOMS = {
    "prayer_times": (0.03, 0.18, 0.94, 0.48),
    "zikirmatik": (0.06, 0.20, 0.88, 0.60),
    "home": (0.03, 0.08, 0.94, 0.40),
    "notifications": (0.02, 0.14, 0.96, 0.62),
    "zakat": (0.04, 0.14, 0.92, 0.55),
}
SCENARIOS = {"features": "testCaptureFeatures", "firstrun": "testCaptureFirstRun"}


def sh(cmd, check=True, **kw):
    p = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if check and p.returncode != 0:
        raise RuntimeError("%s failed: %s" % (" ".join(cmd[:4]), (p.stderr or p.stdout)[-800:]))
    return p


def prepare_device(fresh):
    sh(["xcrun", "simctl", "boot", UDID], check=False)
    sh(["xcrun", "simctl", "bootstatus", UDID, "-b"], check=False)
    sh(["xcrun", "simctl", "status_bar", UDID, "clear"], check=False)
    sh(["xcrun", "simctl", "status_bar", UDID, "override", "--batteryState", "charged", "--batteryLevel", "100",
        "--cellularBars", "4", "--wifiBars", "3", "--dataNetwork", "wifi"], check=False)
    sh(["xcrun", "simctl", "location", UDID, "set", LOCATION], check=False)
    if fresh:
        if not os.path.isdir(APP):
            raise RuntimeError("Simulator build missing at %s (run: flutter build ios --simulator --debug in the copy)" % APP)
        sh(["xcrun", "simctl", "terminate", UDID, BUNDLE], check=False)
        sh(["xcrun", "simctl", "uninstall", UDID, BUNDLE], check=False)
        sh(["xcrun", "simctl", "privacy", UDID, "reset", "all", BUNDLE], check=False)
        sh(["xcrun", "simctl", "install", UDID, APP])


def record_and_run(test_name, video_path):
    rec = subprocess.Popen(["xcrun", "simctl", "io", UDID, "recordVideo", "--codec=h264", "--force", video_path],
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    t0 = None
    deadline = time.time() + 15
    while time.time() < deadline:  # wait for "Recording started"
        line = rec.stdout.readline()
        if "Recording started" in line:
            t0 = time.time()
            break
    if t0 is None:
        rec.kill()
        raise RuntimeError("simctl recordVideo did not start")
    marks, log = [], []
    cmd = ["xcodebuild", "test", "-project", XCUI, "-scheme", "MeyraCapture", "-destination", "id=" + UDID,
           "-only-testing:CaptureUITests/MeyraCaptureTests/" + test_name, "-derivedDataPath", os.path.join(WORK, "xcui-dd")]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    for line in p.stdout:
        log.append(line)
        m = MARK.search(line)
        if m:
            marks.append({"t": float(m.group(1)) - t0, "screen": m.group(2), "phase": m.group(3)})
    p.wait()
    time.sleep(1.0)
    rec.send_signal(signal.SIGINT)
    rec.wait(timeout=30)
    with open(os.path.join(WORK, "capture-%s.log" % test_name), "w") as fh:
        fh.writelines(log)
    labels = parse_labels(log)
    return marks, p.returncode, labels


def parse_labels(log):
    out, cur = {}, None
    for line in log:
        if line.startswith("LABELS_BEGIN|cap:"):
            cur = line.strip().split("cap:", 1)[1]
            out[cur] = []
        elif line.startswith("LABELS_END|"):
            cur = None
        elif cur and line.startswith("L|"):
            lab = line.strip().split("|", 3)[-1]
            if "Sekme" not in lab and lab not in out[cur]:
                out[cur].append(lab)
    return out


ERROR_PHRASES = ["internet bağlantınızı kontrol", "bağlantı bekleniyor", "bir hata oluştu", "hata oluştu", "henüz içerik bulunmamaktadır", "konum alınıyor"]
MIN_LABELS = 4  # a real, loaded screen exposes more than a title (spinner/skeleton screens don't)


SEGMENT_OF = {"prayer_times": "home"}  # sub-segments recorded inside another screen use the parent's labels


def content_check(screen, labels):
    """Navigation success is not enough: reject error states, spinners and skeleton screens."""
    low = " ".join(labels).lower()
    for ph in ERROR_PHRASES:
        if ph in low:
            return "content_error:%s" % ph
    if screen != "first_run" and len(labels) < MIN_LABELS:
        return "not_loaded:only_%d_labels" % len(labels)
    return None


def ff(args):
    sh(["ffmpeg", "-y", "-v", "error"] + args)


def cut(src, start, end, dst, zoom=None):
    start = max(0.0, start)
    vf = "fps=30,scale=%d:-2:flags=lanczos" % OUT_W
    if zoom:
        x, y, w, h = zoom
        vf = "fps=30,crop=iw*%.4f:ih*%.4f:iw*%.4f:ih*%.4f,scale=%d:-2:flags=lanczos" % (w, h, x, y, OUT_W)
    ff(["-ss", "%.3f" % start, "-i", src, "-t", "%.3f" % max(end - start, 0.5), "-an", "-vf", vf,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart", dst])


def still(src, t, dst):
    ff(["-ss", "%.3f" % max(t, 0), "-i", src, "-frames:v", "1", "-vf", "scale=%d:-2:flags=lanczos" % OUT_W, dst])


def build_outputs(video, marks, labels, scenario):
    by = {}
    for m in marks:
        by.setdefault(m["screen"], []).append(m)
    result = {}
    for screen, ms in by.items():
        d = os.path.join(OUT, screen)
        os.makedirs(d, exist_ok=True)
        ph = {m["phase"]: m["t"] for m in ms}
        missing = [m["phase"] for m in ms if m["phase"].startswith("missing:")]
        entry = {"scenario": scenario, "markers": {k: round(v, 2) for k, v in ph.items()}, "missing": missing, "files": {}}
        start = ph.get("start", ms[0]["t"])
        end = ph.get("end", ms[-1]["t"] + 1.0)
        if "still" in ph:
            still(video, ph["still"] + 0.2, os.path.join(d, "open.png"))
            entry["files"]["still"] = "media/app-captures/%s/open.png" % screen
            cut(video, start, ph["still"] + 1.5, os.path.join(d, "open.mp4"))
            entry["files"]["open_clip"] = "media/app-captures/%s/open.mp4" % screen
        if "use" in ph:
            cut(video, ph["use"], end, os.path.join(d, "use.mp4"))
            entry["files"]["use_clip"] = "media/app-captures/%s/use.mp4" % screen
        if end - start > 1.0:
            cut(video, start, end, os.path.join(d, "full.mp4"))
            entry["files"]["full_clip"] = "media/app-captures/%s/full.mp4" % screen
            if screen in ZOOMS:
                cut(video, ph.get("still", start), end, os.path.join(d, "zoom.mp4"), zoom=ZOOMS[screen])
                entry["files"]["zoom_clip"] = "media/app-captures/%s/zoom.mp4" % screen
        if screen == "first_run":  # keep every step boundary for the editor
            entry["steps"] = [{"phase": m["phase"], "t": round(m["t"] - start, 2)} for m in ms]
            entry["duration_s"] = round(end - start, 2)
        entry["ui_labels"] = (labels.get(screen) or labels.get(SEGMENT_OF.get(screen, ""), []))[:40]
        problem = content_check(screen, entry["ui_labels"]) if screen in labels or screen != "first_run" else None
        if screen == "first_run" and not {"times_visible", "end"} <= set(ph):
            problem = "incomplete_take:no_times_visible_or_end"
        if problem:
            entry["missing"].append(problem)
        entry["verified"] = bool(entry["files"]) and not entry["missing"]
        result[screen] = entry
    return result


def app_version():
    plist = os.path.join(APP, "Info.plist")
    try:
        v = sh(["/usr/libexec/PlistBuddy", "-c", "Print CFBundleShortVersionString", "-c", "Print CFBundleVersion", plist]).stdout.split()
        return "%s (%s)" % (v[0], v[1])
    except Exception:
        return "unknown"


def recheck():
    """Re-apply content checks to an existing manifest (no new recording)."""
    p = os.path.join(OUT, "manifest.json")
    m = json.load(open(p))
    for screen, e in m["screens"].items():
        e["missing"] = [x for x in e["missing"] if not x.startswith(("content_error", "not_loaded"))]
        labs = e.get("ui_labels") or m["screens"].get(SEGMENT_OF.get(screen, ""), {}).get("ui_labels", [])
        problem = content_check(screen, labs)
        if problem:
            e["missing"].append(problem)
        e["verified"] = bool(e["files"]) and not e["missing"]
    json.dump(m, open(p, "w"), ensure_ascii=False, indent=2)
    for screen, e in m["screens"].items():
        print("%-17s %s %s" % (screen, "OK  " if e["verified"] else "MISS", e["missing"]))


def main(argv):
    if argv[:1] == ["recheck"]:
        return recheck()
    which = argv[0] if argv else "all"
    names = ["firstrun", "features"] if which == "all" else [which]
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    manifest_path = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"screens": {}}
    for name in names:
        prepare_device(fresh=(name == "firstrun"))
        video = os.path.join(WORK, "capture-%s.mp4" % name)
        marks, code, labels = record_and_run(SCENARIOS[name], video)
        res = build_outputs(video, marks, labels, name)
        manifest["screens"].update(res)
        print("%s: test exit %d · %d markers · screens: %s" % (name, code, len(marks), ", ".join(
            "%s%s" % (s, "" if r["verified"] else "(!)") for s, r in res.items())))
    manifest.update({
        "captured_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "device": "iPhone 17 Pro Simulator (iOS 26.5) %s" % UDID, "app_version": app_version(),
        "location": "simulated Fatih/İstanbul " + LOCATION, "backend": "production (owner-approved 2026-11-14)",
        "note": "Real app screens recorded from the Meyra debug build. Captures are never edited to show features that don't exist.",
    })
    json.dump(manifest, open(manifest_path, "w"), ensure_ascii=False, indent=2)
    print("manifest → media/app-captures/manifest.json")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
