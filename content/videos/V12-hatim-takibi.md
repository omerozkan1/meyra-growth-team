---
id: V12
title: Hatim takibi demo
pillar: P3
status: in_review
platforms: [instagram, tiktok, youtube]
duration_s: 30
language: tr
segment: S1
cta_type: direct
publish_target: 2026-12-01
sources: []
assets_needed:
  - Screen recording of hatim tracking flow (start hatim → progress view)
approved_by:
approved_at:
approved_hash:
published_urls: []
---

## Hook

**Ekran yazısı (0–2 sn):** Hatim bitirmeyi hep erteliyor musun?
**Seslendirme:** Hatim bitirmeyi hep erteliyor musun?

## Script

| Zaman | Seslendirme / Ekran yazısı | Görüntü |
|---|---|---|
| 0–2 sn | Hatim bitirmeyi hep erteliyor musun? | Ekran yazısı: "Hatim bitirmeyi hep erteliyor musun?" — siyah/lacivert arka plan, beyaz metin |
| 2–7 sn | Meyra'da hatim başlatmak iki dokunuş. | Ekranda Meyra uygulaması açılıyor; Kur'an bölümüne geçiş gösteriliyor |
| 7–14 sn | "Hatim başlat" a dokun, Kur'an'ın neresinde olduğun hemen kaydoluyor. | Ekranda "Hatim başlat" butonu vurgulanıyor; ilerleme ekranı beliriyor |
| 14–20 sn | Her gün ne kadar okuduğunu takip edebilirsin. İlerleme ekranda görünüyor. | Ekranda hatim ilerleme çubuğu ve tamamlanan cüz sayısı görünüyor |
| 20–25 sn | Hatim başlat, ilerlemeni takip et. Hepsi bu. | Ekran yazısı: "Hatim başlat, ilerlemeni takip et." — uygulamanın hatim özet ekranı arka planda |
| 25–30 sn | Ücretsiz indir, link profilde. | Meyra uygulama ikonu + "Ücretsiz indir" yazısı; store badge |

## Visual Direction

### 1. Recording Checklist (phone screen-recording, one continuous take)

Prepare the phone before pressing record:

1. Device: use the owner's personal phone with Meyra installed and logged in. iOS or Android both work; iOS gives a cleaner system status bar.
2. Do Not Disturb: enable Do Not Disturb (or Airplane mode if no internet is needed for the hatim feature). No calls, banners or notification bubbles may appear.
3. Clean status bar: on iOS go to Settings → General → Date & Time and set a fixed time such as 09:41 so the battery and signal icons look tidy. On Android use Demo Mode (adb shell am broadcast -a com.android.systemui.demo -e command enter) or record in Airplane mode with a full battery.
4. Neutral city / location: if the app shows a city name on the home screen, confirm it shows a real Turkish city (Istanbul or Ankara) — no test accounts with placeholder text visible.
5. App state before recording: open Meyra, navigate to the hatim section once off-camera to confirm "Hatim başlat" button is visible and no previous hatim is in a finished state. Close the app fully, then re-open to home screen. This is the frame where recording starts.
6. Phone orientation: portrait, locked. Do not rotate during the take.
7. Screen recording tool: use the built-in OS screen recorder (iOS Control Center → Screen Recording; Android Quick Settings → Screen Record). Do not use third-party apps that add watermarks.
8. Resolution: ensure the phone display is at its native resolution and auto-brightness is off (set brightness to ~70%).
9. Target duration of the raw take: 25–28 seconds of actual in-app navigation. Record a few extra seconds of holding still at the start and end to give editing handles.

Exact tap sequence to perform on camera (match Script table timecodes):

| Step | Action | Approx clock time in take |
|---|---|---|
| 1 | Hold still on Meyra home screen (no tapping) | 0–2 s |
| 2 | Tap Kur'an / Quran section from home navigation | 2–4 s |
| 3 | Tap Hatim sub-section (if separate from main Quran view) | 4–6 s |
| 4 | Tap "Hatim başlat" button — pause 1 second on the button before tapping so it reads clearly | 6–9 s |
| 5 | Hold still on the progress / tracking screen that appears; at least one cüz should show as marked or in progress | 9–14 s |
| 6 | Scroll gently once to show the progress bar and cüz count — slow, deliberate scroll, 2–3 seconds | 14–18 s |
| 7 | Navigate back or tap the summary / overview button to show the hatim summary screen | 18–24 s |
| 8 | Hold still on the summary screen for 2–3 seconds | 24–27 s |

One continuous take: do not stop and restart mid-sequence. If a tap goes wrong, fully redo from step 1. The best take is the one where every screen loads fast and no banners appear.

Claims verify during recording: confirm the button label on screen reads exactly "Hatim başlat" (see Claims Check). If the label differs, do not publish — flag to content-director.

---

### 2. Shot List

| # | Clip | Source | Duration | Notes |
|---|---|---|---|---|
| A | Black/deep-night-blue title card — hook text only, no app visible | Generated in CapCut (free) | 2 s | Matches Script 0–2 s. Text: "Hatim bitirmeyi hep erteliyor musun?" |
| B | Screen recording — Meyra home screen, static hold | Owner phone recording | 1–2 s | Matches Script 2–7 s opening; VO plays over |
| C | Screen recording — transition: tap Kur'an section, screen navigates | Owner phone recording | 2–3 s | Matches Script 2–7 s continuation |
| D | Screen recording — "Hatim başlat" button clearly visible; slow zoom-in if editor supports it in CapCut (pinch tool, free) | Owner phone recording | 2–3 s | Matches Script 7–14 s; overlay text appears here |
| E | Screen recording — progress/tracking screen; progress bar visible; at least one cüz shown | Owner phone recording | 5–6 s | Matches Script 7–14 s end and 14–20 s |
| F | Screen recording — gentle scroll of cüz list / progress bar animation | Owner phone recording | 4–5 s | Matches Script 14–20 s; calming pacing |
| G | Screen recording — hatim summary screen, static hold | Owner phone recording | 4–5 s | Matches Script 20–25 s; overlay text appears here |
| H | Static outro card — Meyra app icon centred, "Ücretsiz indir" text, store badge graphic | Canva free (export PNG, import to CapCut) | 5 s | Matches Script 25–30 s |

No b-roll is required. All footage is real app screen recordings as per brand direction (config/brand.md: "Real app screen recordings > stock footage"). If the owner wants a one-second opening nature shot as a visual breath before the hook card, the following free-licence options are logged for reference:

- Pexels — dawn light through mosque window: https://www.pexels.com/search/mosque%20light/ (search, filter Free; confirm CC0 licence on chosen clip before use)
- Pixabay — calm water/nature: https://pixabay.com/videos/search/calm%20nature/ (Pixabay Licence, free for commercial use, no attribution required)

Licence note: Pexels videos are free for personal and commercial use; no attribution required unless specified per clip. Pixabay videos are released under the Pixabay Licence (free commercial use, no attribution). Store the exact URL of the chosen clip in the `sources:` field of this file's front matter before submitting for review.

---

### 3. Text Overlay Timing

Safe zone: keep all text inside the central band — clear of the top 12% (approx top 230 px on 1920-tall frame) and bottom 20% (approx bottom 384 px). On a 1080×1920 canvas this means text lives between y=232 px and y=1536 px.

| Timecode | Overlay text (TR) | Word count | Position | Font guidance |
|---|---|---|---|---|
| 0–2 s (Clip A) | "Hatim bitirmeyi hep erteliyor musun?" | 5 words | Vertically centred in safe zone | Bold, warm off-white, ~72–80 pt equivalent in CapCut; shadow on dark background not needed — text reads against deep night blue |
| 7–9 s (Clip D) | "İki dokunuş yeterli." | 3 words | Lower-centre of safe zone (around 65% down from top) | Semi-bold, soft green or warm off-white, ~60 pt |
| 9–14 s (Clip E) | "Kaldığın yer hemen kaydoluyor." | 4 words | Lower-centre of safe zone | Same style |
| 14–20 s (Clip F) | "Her gün ilerlemeyi görüyorsun." | 4 words | Lower-centre of safe zone | Same style |
| 20–25 s (Clip G) | "Hatim başlat. İlerlemeni takip et." | 5 words | Vertically centred in safe zone | Bold, warm off-white; this line is the approved claim — do not paraphrase |
| 25–30 s (Clip H) | "Ücretsiz indir. Link profilde." | 4 words | Below app icon, centred horizontally | Semi-bold, warm off-white on deep night blue card |

Burned-in subtitle note: the voiceover lines are short and each overlay already matches the spoken words closely. A separate subtitle burn is not required for these platforms at this duration. If the owner wants captions for accessibility, use CapCut's free Auto Caption feature; review every word before exporting because Turkish auto-captions contain errors.

---

### 4. Audio

Voiceover: the owner records the VO as a separate audio file on the same phone using the Voice Memos app (free, built-in iOS/Android equivalent). Record in a quiet room, phone held 15–20 cm from mouth. Each line can be recorded separately and joined in CapCut (split audio, trim silence). No external mic needed for a 30-second reel at this quality tier.

Background music style: calm, minimal, instrumental. No Quranic recitation (rights unconfirmed).

Platform-specific free music sources:

- Instagram Reels and TikTok: use the platform's built-in Audio Library when uploading (search "peaceful", "calm", "minimal oud" or "ambient"). Music added this way is rights-cleared by the platform. Do not download and re-encode platform audio.
- YouTube Shorts: use YouTube Audio Library (studio.youtube.com → Audio Library → filter by Mood: Calm, Genre: World or Ambient). Download the MP3 and import into CapCut before exporting the YouTube-specific master.

Mix: music at 15–20% of full volume; VO at 100%. The VO must be clearly intelligible. CapCut free: use the volume sliders in the audio track panel.

No paid plug-ins or effects. CapCut free tier is sufficient for all edits described here.

---

### 5. Export Settings

All three platform variants share the same master export; captions and music differ (see notes).

| Setting | Value |
|---|---|
| Resolution | 1080 × 1920 px (9:16 vertical) |
| Frame rate | 30 fps |
| Codec | H.264 (CapCut default "High Quality" export delivers this) |
| Bitrate | CapCut "Recommended" setting (~15–20 Mbps for 1080p); do not compress further before upload |
| Container | MP4 |
| Audio | AAC 44.1 kHz stereo |
| Platform watermark | None — in CapCut free, go to Export → toggle off "Add CapCut watermark" before exporting |
| Master file name | `assets/exports/V12-master.mp4` (directory is git-ignored; do not commit the file) |
| Instagram/TikTok variant | Same master; music embedded via platform library at upload time, not burned in |
| YouTube Shorts variant | Re-export with YouTube Audio Library track burned in: `assets/exports/V12-youtube.mp4` |

If a format conversion is needed (e.g., phone export comes out as HEVC/HEIC), install ffmpeg: `brew install ffmpeg`, then convert with `ffmpeg -i input.mov -c:v libx264 -crf 18 -pix_fmt yuv420p output.mp4`. Only needed if CapCut cannot import the raw screen recording directly.

---

### 6. Variant Plan — Alt Hook for A/B Test (first 2 s only)

The first 2 seconds (Clip A, the title card) are the only element that changes between variants. Everything from 2 s onward is identical.

| Variant | Hook text (0–2 s) | Rationale |
|---|---|---|
| A (primary) | "Hatim bitirmeyi hep erteliyor musun?" | Addresses procrastination directly; question format invites engagement |
| B (alt) | "Hatim bitti mi, bilmiyor musun?" | Addresses lack of visibility / tracking awareness; slightly different pain point |

To produce Variant B: duplicate the CapCut project, replace only the first title card text, re-export as `assets/exports/V12-hookB.mp4`. Upload both variants and track link-in-bio clicks per variant for the first 48 hours before choosing a winner.

---

### 7. Assets Needed from Owner

The following items must be provided by the owner before this video can move to `in_review`:

1. Screen recording of the full tap sequence (steps 1–8 in Recording Checklist above) — raw MP4 or MOV from phone, minimum 25 seconds, no watermark.
2. Confirmation that the button label reads exactly "Hatim başlat" in the current app build (Claims Check dependency).
3. Confirmation of whether a previous hatim is in progress on the owner's account, or whether a fresh "Hatim başlat" flow will be used (affects what screen appears after tapping the button).
4. App icon PNG at 1024×1024 px (or the owner can screenshot the App Store listing page) for the outro card (Clip H) in Canva.
5. Store badge PNGs (App Store + Google Play) if the outro card will show both badges. These are publicly available at https://developer.apple.com/app-store/marketing/guidelines/ and https://play.google.com/intl/en_us/badges/ — both free to use under their respective badge guidelines.

## Captions

### Instagram
Hatim bitirmeyi hep erteliyor musun?

Meyra'da hatim başlatmak iki dokunuş.
Kaldığın yer kaydoluyor, her gün ilerlemeyi görüyorsun.
Hatim başlat, ilerlemeni takip et.

Ücretsiz indir, link profilde. {{LINK:store_V12}}

Kaydetmeyi unutma — sonra lazım olur.

#hatim #kuran #meyraapp #meyra #dua

### TikTok
Hatim başlatmak iki dokunuş — Meyra'da ilerlemen hep kaydediliyor.

#hatim #kuran #meyraapp

### YouTube Shorts
Başlık: Hatim Takibi Meyra'da Çok Kolay #shorts
Açıklama: Hatim başlat, ilerlemeni takip et — Meyra ile Kur'an okuma rutinin hep yanında. Ücretsiz indir: {{LINK:store_V12}}

## CTA

Doğrudan indirme daveti: "Ücretsiz indir, link profilde." — P3 direct CTA olarak son 5 saniyede ekranda kalır.

## Claims Check

- Features shown:
  - Hatim tracking — approved phrasing used exactly: "Hatim başlat, ilerlemeni takip et" (config/brand.md, Approved feature claims table, status ✔ Play)
  - Quran section navigation — covered under "114 sureyi oku ve dinle, kaldığın yerden devam et" (✔); only hatim sub-flow shown here, no unverified sub-claims made
  - "Ücretsiz indir" — approved (config/brand.md, Price row, ✔)
- UI behaviour note: exact button label "Hatim başlat" and progress screen layout must match in-app reality — flag as **verify during recording** before moving to in_review
- Sources verified: none required (no verses, no hadith)
- Banned claims avoided: sıfır sapma, %100 doğru, Diyanet onaylı, tamamen ücretsiz, reklamsız, en iyi uygulama, garanti, invented user numbers
