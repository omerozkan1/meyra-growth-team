---
id: V02
title: Meyra'da 3 adımda kurulum, ezan bildirimi dahil
pillar: P3
status: draft
platforms: [instagram, tiktok, youtube]
duration_s: 30
language: tr
segment: S1
cta_type: direct
publish_target: 2026-11-17
sources: []
assets_needed: ["Real first-run capture: media/app-captures/first_run (done 2026-11-14)", "Final voice: owner picks a TTS engine or records a voice-over (media/audio/README.md)"]
approved_by:
approved_at:
approved_hash:
published_urls: []
---

## Hook
**Ekran yazısı (0–2 sn):** "Namaz vakitleri + ezan bildirimi: 3 adımda"
**Seslendirme:** "Namaz vakitlerini ve ezan bildirimini üç adımda kuralım."

## Script
| Zaman | Seslendirme | Görüntü / ekran yazısı |
|---|---|---|
| 0–3 sn | Namaz vakitlerini ve ezan bildirimini üç adımda kuralım. | Gerçek kayıt: iOS ana ekranı → Meyra açılıyor. Yazı: "Namaz vakitleri + ezan bildirimi: 3 adımda" |
| 3–8 sn | Meyra'yı aç, bildirim ve konum iznini ver. | Gerçek kayıt: iOS bildirim ve konum izin pencereleri. Yazı: "1. İzinleri ver" |
| 8–15 sn | Bulunduğun yere göre bugünün vakitleri hazır. | Gerçek kayıt: "Konumunuzu doğrulayın → Evet, doğru" → ana sayfa vakit tablosu. Yazı: "2. Vakitler hazır" |
| 15–24 sn | Bildirim ayarlarından, istediğin vakitler için ezan bildirimini aç. | Gerçek kayıt: Daha Fazla → Bildirim Ayarları, vakit anahtarları. Yazı: "3. Ezan bildirimi" |
| 24–28 sn | Bu kadar. Meyra ücretsiz, link profilde. | Logo kapanış kartı + "Ücretsiz indir · link profilde" |

## Visual Direction
- 100% real app footage: fresh install of the debug build 2.5.14 on the iPhone 17 Pro Simulator, driven by the capture bot (media/capture). Edit spec: media/pipeline/edits/V02.json.
- Real UI shown in a rounded phone frame on the brand gradient; step text on top, subtitles at the bottom (inside safe zones).
- Edit trims: the AdMob app-open ad that appears during first launch and the bot's waiting time. Because of these trims the video makes **no time claim** (the old "30 saniye" hook was dropped: the measured unedited take was 34.9 s from launch to reminder toggle, including the ad and bot delays).
- Audio: narration only (candidate TTS until the owner chooses). No music bundled; add a platform-library track at upload if wanted.
- Simulated location: Fatih/İstanbul; no personal data on screen.

## Captions
### Instagram
Namaz vakitleri + ezan bildirimi 3 adımda hazır ✅

1️⃣ Bildirim ve konum iznini ver
2️⃣ Bulunduğun yere göre vakitler hazır
3️⃣ Bildirim ayarlarından istediğin vakitleri aç

Sade, karmaşasız bir namaz vakti uygulaması: Meyra. Ücretsiz indir, link profilde.
#namazvakitleri #ezan #namaz #meyra

### TikTok
Namaz vakitleri + ezan bildirimi 3 adımda ✅ Meyra, ücretsiz, link profilde #namazvakitleri #ezan #namaz #meyra

### YouTube Shorts
Başlık: Namaz vakitleri ve ezan bildirimi 3 adımda nasıl kurulur? #shorts
Açıklama: Meyra ile konumuna göre namaz vakitleri ve vakit bildirimleri. Ücretsiz indir: {{LINK:youtube_V02}}

## CTA
Direct: "Meyra ücretsiz, link profilde."

## Claims Check
- Features shown are real UI from the app build 2.5.14: permission requests, location confirmation, home prayer-time table, Bildirim Ayarları (per-prayer toggles). All in config/brand.md approved list.
- No duration claim (removed "30 saniye"; measured take was longer).
- "Ücretsiz" = free download (true). Premium exists and the free version shows ads (an app-open ad was trimmed from this edit), so never imply the whole app is free or ad-free.
- Banned claims avoided: no "sıfır sapma", no "Diyanet onaylı".
- QC verdict pending (quality-controller).
