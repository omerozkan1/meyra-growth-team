# SEO / ASO Backlog (proposals for the owner; agents do not apply these)

Source: `research/brand-discovery-2026-11-14.md`. Each item is a **draft change**. The owner implements it or approves it explicitly.

## Website (meyraapp.com, Next.js)
| # | Priority | Change | Effort |
|---|---|---|---|
| W1 | P0 | Real `robots.txt` (allow all + sitemap line) and `sitemap.xml` with `/tr`, `/en`, `/ar` + legal pages. Today both URLs return the homepage HTML (soft 404) | S |
| W2 | P0 | Localised `<title>`, meta description and OG/Twitter tags for `/en` and `/ar` (currently Turkish on all three) | S |
| W3 | P0 | `hreflang` alternates (tr, en, ar, x-default → /tr) + self-canonical per locale | S |
| W4 | P0 | GA4 + `store_click` event + UTM forwarding to store links (see `tracking/measurement-plan.md`) | M |
| W5 | P1 | 1200×630 OG share image per language (currently the app icon), because WhatsApp/Instagram previews matter in TR | S |
| W6 | P1 | Add the missing features to the homepage: zekat hesaplama, hatim takibi, kitaplar/tefekkür serileri, widget & Apple Watch, dini günler | S |
| W7 | P1 | Replace "sıfır sapma / zero deviation" with a defensible claim (e.g., "Diyanet uyumlu hesaplama", only if confirmed) | S |
| W8 | P1 | Align TR/AR privacy policy with EN (third parties: Firebase, AdMob, RevenueCat; Google Play billing; data deletion path). Legal review recommended | M |
| W9 | P2 | Long-tail landing pages that mirror P2 videos: "/tr/kible-nasil-bulunur", "/tr/tesbihat-nasil-yapilir", "/tr/kaza-namazi-takibi" (each embeds the Short + store buttons) | M |
| W10 | P2 | `SoftwareApplication` JSON-LD (name, OS, rating from store only if kept in sync, offers price 0) | S |

## App Store (TR)
| # | Change | Note |
|---|---|---|
| A1 | Keep title "Meyra: Namaz Vakitleri"; test subtitle variants such as "Ezan, Kıble, Kur'an, Zikirmatik" | Keyword field: kıble, ezan, zikirmatik, tesbih, kuran, dua, hatim, kaza, zekat, imsakiye (avoid repeating title words) |
| A2 | First 3 screenshots = the three strongest jobs, with captions: (1) "Konumuna göre namaz vakitleri + ezan" (2) "Kur'an'ı harflerden öğren" (3) "Zikirmatik + gece modu" | Captions must stay inside approved claims |
| A3 | Use Product Page Optimization (free A/B in ASC) to test screenshot set 1 vs 2 | Needs owner |
| A4 | Reply to every review (drafts by social-manager, the owner posts) | |
| A5 | Make EN name consistent with Play ("Prayer Times & Quran" vs "& Qibla"): pick by keyword data | |

## Google Play (TR)
| # | Change | Note |
|---|---|---|
| G1 | Short description (80 chars) test: "Namaz vakitleri, ezan, kıble, Kur'an öğrenme ve zikirmatik tek uygulamada." | Count characters before submitting |
| G2 | Store listing experiments (free in Play Console): icon/screenshot/short-description A/B | Needs owner |
| G3 | Feature graphic + promo video = best Short (YouTube link) | After W2 |
| G4 | Custom store listing for diaspora countries (DE/NL) highlighting accuracy abroad + qibla | Later |
| G5 | Reply to all reviews; the review "reklam belası yok" suggests ad perception varies, so monitor ad complaints | |
