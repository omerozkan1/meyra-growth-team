---
name: create-short-video
description: Create a new Meyra short-video concept end to end (idea → script → edit spec → captions → QC) as a content/videos/V##-slug.md file ready for owner approval. Use when asked for a new video, Reel, TikTok or Short, or to remake a winning format.
---
# Create a short video concept

Input: topic or angle (optional pillar, segment, target date). If none given, pick the pillar that is under its share (35/35/30) in `content/calendar.csv` for the current week.

1. **Next ID.** `ls content/videos` → next free `V##`. Copy `content/templates/video-template.md` to `content/videos/V##-<slug>.md`.
2. **Concept (content-director).** Choose segment (config/audience.md) and hook formula (content/pillars.md). Write Hook, timed Script table, CTA (soft for P1/P2, direct for P3). Use only approved feature phrasing (config/brand.md). For any verse: add `sources` with exact `Sure Sure:Ayet` reference.
3. **Production (video-producer).** Fill Visual Direction: shot list, recording checklist, overlays in safe zone, audio source, assets needed from owner.
4. **Captions (social-manager).** Instagram, TikTok, YouTube Shorts (`Başlık:` ≤ 100 chars, `{{LINK:youtube_V##}}`), max 5 hashtags.
5. **QC (quality-controller).** Verify claims, fetch the Diyanet meal for verses and compare wording, complete Claims Check with `QC: PASS/BLOCKED`.
6. **Validate.** `npm run validate` → 0 errors. Then `npm run links` to add the video's tracked links.
6b. **Real app screens.** For every script row that shows the app, map it to a capture in `media/app-captures/manifest.json`
   (only entries with `"verified": true` count; check `ui_labels` to confirm the screen shows what the script claims, e.g. the real
   button text). If a needed screen is missing or unverified:
   - Re-capture: `python3 media/capture/run_capture.py features` (or `firstrun` for the install flow). The bot drives the real debug
     build in the iOS Simulator (config/app-project.md); the Flutter source is never modified.
   - Still missing (e.g. Kıble needs a real compass, widget/Apple Watch, AI assistant): list it under `assets_needed` and ask the owner
     for a phone recording in `assets/library/V##/segNN.mp4`. **Never** present a placeholder render as finished.
   - For a polished demo with exact sync, write `media/pipeline/edits/V##.json` (see V02.json: cuts by capture markers, cues anchored
     to markers) and render with `~/projects/.meyra-tts/bin/python media/pipeline/edit_render.py V##`.
   - After rendering, verify the narration: `~/projects/.meyra-tts/bin/python media/audio/verify_tts.py media/rendered/V##.mp4 --text "<narration>"`.
7. **Render.** `python3 media/pipeline/render.py V##` → `media/rendered/V##.mp4` (+ .srt, .render.json). Without real footage/voice-over the
   result is an animatic with labelled "EKSİK" slates and a TASLAK stamp. Never fake app screens. Report `missing_assets` from the render JSON.
8. **Queue.** `npm run approvals:sync` → `approvals/pending/V##.json` (ready only if validator is clean AND QC: PASS AND the render is current).
9. **Hand-off.** If QC passed: set `status: in_review`, add the row to `content/calendar.csv`, and tell the owner: ID, title, target date, the
   footage they must drop in `assets/library/V##/segNN.*` + `voiceover.wav`, and that they can review/approve in the panel. Leave approval fields empty.
