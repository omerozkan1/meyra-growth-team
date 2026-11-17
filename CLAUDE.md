# Meyra AI Growth Team

The local operating system for Meyra's organic growth. **Goal: more qualified organic app downloads.** Turkey comes first (TR), then EN and AR markets.

## Product facts
- Owner-authored briefs (highest authority for intent and rules): `brand.md` (brand identity, content principles, KPIs) and `social-accounts.md` (official accounts, per-platform strategy). Don't edit them; reflect their changes in `config/`.
- Source of truth: `research/brand-discovery-2026-11-14.md` and `config/brand.md`.
- Use only features listed in `config/brand.md` → "Approved feature claims". **Never invent capabilities**, user counts, ratings or endorsements.
- Store links: iOS `id6759878169`, Android `com.omerozkan.meyra`. Always generate tracked links with `npm run links`. Never hand-write UTM links.

## Hard rules (non-negotiable)
1. **Nothing leaves this machine without explicit owner approval.** This covers publishing, scheduling, DMs, comments, emails, ad spend, store-listing edits, website/production changes and account settings. Agents draft; the owner publishes.
2. **Approval is recorded only by the owner**, in the local panel or the owner's own terminal, and signed with the owner's Ed25519 key in `~/.meyra` (outside the repo). Agents must never set `status: approved`, `approved_by` or `approved_at`, never run owner scripts (`scripts/owner/`, the panel), and never read `~/.meyra`. A signature covers script + captions + metadata + video SHA-256, so any later change invalidates it. Publishing requires a valid signature **and** a final (non-draft) video, and real publishing is not implemented (dry-run only).
3. **Official APIs only**: no scraping behind logins, no unofficial automation, no engagement bots, no follow/unfollow, no purchased engagement.
4. **No credentials in Git.** Secrets go in `.env` (git-ignored). `.env.example` lists the names only. `npm run validate` scans for leaked keys.
5. **No paid tools without asking.** Budget is 0–1000 TL/month (`config/budget.md`). Propose first, wait for a yes.
6. **Don't claim access you don't have.** Integration status lives in `tracking/integrations.md`. If a source isn't connected, say "not connected" and ask for a manual export.

## Religious content rules
- Every Quran verse needs a `Sure Adı Sure:Ayet` reference and must be checked against the Diyanet meal (https://kuran.diyanet.gov.tr) before approval.
- Hadith may be used only with collection + number, from a source the owner confirms. If unsure, leave it out.
- No fatwas or rulings. For fiqh questions (kaza calculations, etc.), say "Hocanıza / Diyanet'e danışın" (ask your imam / Diyanet).
- Respectful tone. No fear-based hooks ("cehenneme gidersin"), no shaming, no sectarian content, no politics.
- Banned marketing claims (the validator enforces these): `sıfır sapma`, `%100 doğru`, `Diyanet onaylı`, `tamamen ücretsiz`, `reklamsız` (except when explicitly describing Premium), `en iyi uygulama`, `garanti`, and any made-up download/user numbers.

## Layout
```
config/        brand, audience, strategy, budget, guardrails, channels
research/      discovery and audits (dated)
content/       pillars.md, calendar.csv, videos/V##-slug.md (one concept per file), templates/
tracking/      measurement plan, integrations status, links.csv (generated)
data/metrics/  weekly.csv (manual export until APIs are connected)
reports/       daily/ (YYYY-MM-DD.json/.md from the daily runner, -ceo.md from the CEO) and weekly/
approvals/     pending/ (pipeline) · approved/ + rejected/ (owner-signed) · invalidated/ · outbox-dryrun/
media/         pipeline/render.py (Python+FFmpeg) · rendered/V##.mp4|.srt|.render.json
docs/          social-api-requirements.md, automation.md
scripts/       node, zero-dependency tooling + guard hook; daily/ (scheduler), panel/, owner/ (owner-only), publish/ (gate)
.claude/       agents/ (7 specialists), skills/ (4 workflows), settings.json (guard hook)
assets/        brand/ (official images, SOURCES.md) · library/V##/segNN.mp4 + voiceover.wav (owner footage) · raw/, exports/ (git-ignored)
```

## Commands
| Command | Purpose |
|---|---|
| `npm run validate` | Validate all content files, claims, approval integrity and the secrets scan. **Run before handing anything to the owner.** |
| `npm test` | Unit tests for the tooling |
| `npm run queue` | Show items waiting for owner approval |
| `npm run links` | Regenerate `tracking/links.csv` (UTM / store campaign links) |
| `npm run metrics` | KPI summary from `data/metrics/weekly.csv` |
| `npm run render -- V01` / `--all` | Render 9:16 videos (animatic until real assets + owner voice-over exist in `assets/library/V##/`) |
| `npm run approvals:sync` | Package rendered items into approvals/pending; invalidate stale approvals |
| `npm run daily` / `npm run daily:test` | Daily autonomous run (scheduled 09:00 via launchd) |
| `npm run publish:dry-run -- V01 --platform instagram` | Publish gate check, dry-run only |
| panel, approve/reject, owner:setup | **Owner only** (blocked for agents) |

## Content status lifecycle
`idea → draft → in_review → approved → scheduled → published` (or `rejected`). Agents may move items up to `in_review` (only after `QC: PASS`). Only the owner's signed decision moves them to `approved`/`rejected`. After the owner publishes manually, an agent may set `published` and fill `published_urls` once the owner supplies the URLs.

## Team (see `.claude/agents/`)
growth-ceo (orchestrates, prioritises) · content-director (pillars, concepts, scripts) · video-producer (shot lists, edit specs) · social-manager (captions, posting plan, community replies as drafts) · seo-aso-specialist (website + store listing) · growth-analyst (metrics, experiments) · quality-controller (final gate: facts, religion, brand, safety)

## Skills
`/daily-growth` · `/create-short-video` · `/seo-audit` · `/weekly-report`

## Language
Internal docs are in English. Audience-facing content is in Turkish first; EN/AR versions only when the strategy calls for them. Arabic content needs native review before approval.
