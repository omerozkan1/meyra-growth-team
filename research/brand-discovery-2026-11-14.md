# Meyra: Brand Discovery Report

- **Date inspected:** 2026-11-14
- **Sources:** public pages only (no account access)
  - Website: https://meyraapp.com (`/tr`, `/en`, `/ar`, `/tr/privacy`, `/en/privacy`, `/ar/privacy`, `/tr/support`, `/tr/terms`, `/tr/download`)
  - App Store TR: https://apps.apple.com/tr/app/meyra-namaz-vakitleri/id6759878169?l=tr (+ US storefront)
  - Google Play: https://play.google.com/store/apps/details?id=com.omerozkan.meyra (hl=tr and hl=en)
- **Method:** raw HTML downloaded with curl and parsed. No content was inferred.

Legend: **[V]** = verified on a public page (source named) · **[A]** = assumption / inference, needs owner confirmation · **[?]** = unknown

---

## 1. Identity and positioning

| Item | Finding | Status |
|---|---|---|
| Brand | Meyra ("Meyra App" in website footer) | [V] website |
| Developer | "Omer Ozkan" on App Store; "Ömer Özkan" on Google Play | [V] both stores |
| Website tagline | "Kendine yeniden başla." / "SENİN MANEVİ ASİSTANIN" | [V] website TR |
| Website hero | "Zikirle huzur bul. İbadetlerini düzenle. Kendine yeniden dön." | [V] website TR |
| Website positioning | Minimal and calm: "Gereksiz Karmaşa Yok" (EN: "No Unnecessary Clutter … A minimal assistant that never overwhelms you") | [V] website |
| Store positioning | "kapsamlı bir İslami yaşam uygulaması" (a comprehensive Islamic lifestyle app) | [V] Play + App Store |
| iOS name / subtitle (TR) | "Meyra: Namaz Vakitleri" / "Dua, Kıble ve Manevi Yolculuk" | [V] App Store TR |
| iOS name / subtitle (US) | "Meyra: Prayer Times & Quran" / "Qibla, Dua and Spiritual Path" | [V] App Store US |
| Play name (TR / EN) | "Meyra: Namaz Vakitleri" / "Meyra: Prayer Times & Qibla" | [V] Play |
| Play short description (TR) | "Namaz vakitleri, Kur'an, kıble, ibadet takibi ve daha fazlası tek uygulamada." | [V] Play TR |
| Category | Lifestyle / Yaşam Tarzı (both stores) | [V] |

**Positioning tension:** the website sells *calm, minimal, spiritual self-renewal*, while the stores sell *a comprehensive all-in-one Islamic toolkit*. Both can work, but the content strategy should pick one primary promise (see `config/brand.md`).

## 2. Features

Only features that appear in the official copy are listed here. "Listed" means a page *claims* the feature. We have **not used the app**, so none of these is verified in-app.

| Feature | Website | App Store | Play | Notes |
|---|---|---|---|---|
| Prayer times by location + adhan notifications | ✔ | ✔ | ✔ ("Diyanet Uyumlu") | Website claims "sıfır sapma" / "zero deviation" (risky claim) |
| Qibla finder (compass + map) | ✔ | ✔ | ✔ | |
| Zikirmatik / dhikr counter, night mode, daily goals | ✔ | ✔ | ✔ | Website says routines are "automatically saved to the cloud" |
| Quran: 114 surahs, read + listen, resume position | ✔ | ✔ | ✔ | |
| Learn Quran (letters → harakat → tajwid, personalised plan, practice exercises) | ✔ | ✔ | ✔ | |
| AI assistant ("Meyra Asistan") for religious questions | ✔ ("source-based") | ✔ | ✔ | Privacy policy: questions are sent to a third-party AI service |
| Worship tracking (prayer, kaza, Quran, dhikr, fasting) | ✔ | ✔ | ✔ | |
| Hatim tracking | – | ? | ✔ | |
| Books / "Özel Tefekkür Serileri" (contemplation series) | – | ✔ (library) | ✔ | |
| Duas, hadith, Esmaül Hüsna | ✔ | ✔ | ✔ | |
| Favorites + sharing | ✔ | – | ✔ | |
| Nearby mosques | ✔ | ✔ | ✔ | |
| Zakat calculator | – | ✔ | ✔ | Praised in a Play review |
| Religious days (dini günler) | – | ✔ | ✔ | |
| Custom notifications | – | ✔ | ✔ | |
| Home-screen widget + Apple Watch | – | ✔ | – | iOS only |
| Dark / light theme | – | ✔ | ✔ | |

## 3. Pricing and monetisation

| Item | Finding | Status |
|---|---|---|
| Download | Free | [V] all sources |
| Premium (iOS) | "Meyra Premium Aylık" ₺99,99 · "Meyra Premium Yıllık" ₺599,99 | [V] App Store TR |
| Trial | "Yıllık Premium'da 3 gün ücretsiz deneme" (3-day free trial on the annual plan) | [V] App Store version notes (2.5.2, 2.5.6) |
| Premium benefit stated | "reklamsız, kesintisiz deneyim" (ad-free, uninterrupted) | [V] App Store version notes |
| Ads | "Reklam içerir" / "Contains ads" (Play); EN privacy names Google AdMob | [V] |
| Play premium prices | Not shown in the public HTML | [?] |
| Website | Does **not** mention Premium or ads; says "Uygulamayı ücretsiz indirebilirsin" | [V] |
| Which features are premium-gated | Not stated anywhere public | [?] owner input needed |

## 4. Languages

| Surface | Languages | Status |
|---|---|---|
| App (App Store) | Turkish, Arabic, English | [V] |
| App (Play) | Not listed publicly; store listing is localised TR + EN | [V] partial |
| Website | `/tr`, `/en`, `/ar` (Arabic correctly `dir="rtl"`) | [V] |

## 5. Social proof (snapshot 2026-11-14)

| Metric | Value | Status |
|---|---|---|
| App Store TR rating | 4.4 ★ (21 ratings) | [V] |
| Google Play rating | 4.5 ★ (46 reviews) | [V] |
| Google Play installs | "1 B+" / "1K+" (bucket: 1,000–4,999) | [V] |
| Latest version | iOS 2.5.14 (26 Oct, "Ezan vakti iyileştirmeleri"); Play updated 26 Oct 2026 | [V] |
| Version history (iOS) | 2.3.2 → 2.5.14, frequent releases (prayer-time accuracy, location flow, qibla accuracy, nearby mosques, Quran-learning redesign, premium trial) | [V] |

Review themes on Play (3 visible reviews): visual design and location display; zakat calculator; "sade, anlaşılır" (simple, clear). One reviewer said the app has no ads ("reklam belası yok"). Paraphrased, with no reviewer data stored.

## 6. Screenshots and creative assets

- App Store: about 59 unique screenshot image assets across device classes (count from the page HTML; captions are not exposed as text). **[V] count, captions [?]**
- Google Play: 7 phone screenshots ("Ekran görüntüsü resmi" alt text). **[V]**
- Website images: app icon, "Meyra Zikir Modülü", "Meyra Ana Ekran", "Meyra Kur'an Modülü". **[V]**
- OG/Twitter share image: `/images/branding/icon.png` (the icon only, not a 1200×630 card). **[V]**
- Brand colours, fonts and logo files: **[?]** owner to supply a brand kit (see `config/brand.md`).

## 7. Privacy, legal and support links

| Link | URL | Status |
|---|---|---|
| Privacy (store-linked) | https://meyraapp.com/privacy → redirects to `/tr/privacy` | [V] |
| Privacy EN / AR | https://meyraapp.com/en/privacy, https://meyraapp.com/ar/privacy | [V] |
| Terms | https://meyraapp.com/tr/terms | [V] |
| Support | https://meyraapp.com/tr/support (support email published on the site; "24-48 saat" response time) | [V] |
| Apple EULA | standard Apple EULA | [V] |
| Store-declared data, iOS | Tracking: identifiers. Linked: purchases. Not linked: device ID (3rd-party advertising), crash data | [V] |
| Store-declared data, Play | Shared: device or other IDs. Collected: app activity, app info & performance, device IDs. Encrypted in transit. **"Veriler silinemiyor"** (data cannot be deleted) | [V] |
| Third parties named (EN privacy only) | Apple IAP, RevenueCat, Firebase Analytics/Crashlytics, Google AdMob, AI service (unnamed) | [V] |

## 8. Inconsistencies and risks (ranked)

| # | Issue | Evidence | Impact | Owner action |
|---|---|---|---|---|
| 1 | **TR privacy policy is shorter than the EN one.** It omits Firebase Analytics/Crashlytics, AdMob and notification storage; only the EN version lists third parties. | `/tr/privacy` vs `/en/privacy` | Trust and compliance risk in the primary (TR) market; KVKK review advisable | Align TR/AR with EN; get legal review (not legal advice) |
| 2 | Privacy policy says purchases are "managed by **Apple**" only, with no mention of Google Play Billing | all privacy pages | Inaccurate for Android users | Add Google Play |
| 3 | **Ads disclosed in stores, not on the website.** The website says "free" and never mentions ads or premium. One Play reviewer believes there are no ads. | Play "Reklam içerir"; iOS "Reklam"; website | Marketing must never claim "reklamsız" for the free tier | Content guardrail added |
| 4 | Website says dhikr data is saved "to the cloud", while Play data safety says **"data cannot be deleted"** and the privacy policy doesn't mention cloud storage of user data | website EN/AR; Play data safety | Store-policy and trust risk | Clarify the data-deletion path |
| 5 | Absolute accuracy claims: "sıfır sapma" / "zero deviation" (website), "Diyanet Uyumlu" (Play) | website, Play | Claims we can't substantiate in content | Use "Diyanet uyumlu" only if the owner confirms the method; never "sıfır sapma" or "Diyanet onaylı" |
| 6 | **EN and AR website pages have Turkish `<title>`, meta description and OG tags** | `<title>Meyra \| Kendine Yeniden Başla</title>` on /en and /ar | International SEO and social previews look broken | Localise metadata |
| 7 | **No `robots.txt` and no `sitemap.xml`.** Both URLs return the homepage HTML with status 200 (soft 404). No `hreflang` or `canonical` tags. | curl | Weak indexing of /en and /ar | Add robots, sitemap, hreflang, canonical |
| 8 | **No web analytics detected** (no GA4/GTM/pixel tags in HTML) | grep of page source | Website visits and store clicks are unmeasurable today | See `tracking/measurement-plan.md` |
| 9 | Store names differ by locale: iOS EN "Prayer Times & **Quran**", Play EN "Prayer Times & **Qibla**" | stores | Minor brand inconsistency; also an ASO keyword choice | Decide deliberately |
| 10 | Developer name spelled "Omer Ozkan" (iOS) vs "Ömer Özkan" (Play) | stores | Cosmetic | Optional |
| 11 | Feature lists differ across surfaces (hatim, zakat, books, widget and Watch missing from the website) | §2 | Website undersells the app | SEO task |
| 12 | Website store links have no campaign parameters (Play `referrer`, Apple `pt`/`ct`) | website HTML | Can't attribute installs that come from the website | See tracking plan |
| 13 | Play listing publicly shows the developer's personal email and street address | Play "Geliştirici hakkında" | Privacy (owner's choice); Play may require it for monetised apps | Owner decision |
| 14 | OG image is the app icon, not a share card | meta tags | Weak link previews on social and WhatsApp | Design a 1200×630 card |

## 9. Unknowns that need owner input

1. Which features are free vs Premium? (needed for honest CTAs)
2. Is "Diyanet uyumlu" verified? Which calculation method is used outside Turkey?
3. Which AI provider powers Meyra Asistan, and what are its "sources"? (affects how we may describe it)
4. Do the Arabic and English app localisations cover all features?
5. Social profile URLs and current follower counts.
6. Access to: App Store Connect, Play Console, Firebase/GA4 (read-only roles recommended).
7. Brand kit: logo files, colours, fonts, voice examples, face/voice-over preference (on-camera person vs faceless).
8. Apple provider token (`pt`) for App Store campaign links.
