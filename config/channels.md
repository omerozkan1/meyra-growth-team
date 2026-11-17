# Channels and accounts

> Handles from the owner's `social-accounts.md` (2026-11-14). **Status: no account is connected to this workspace.** Public profile stats have not been analysed yet. Never create duplicate accounts.

| Channel | Handle / URL | Role | Connected? | Notes |
|---|---|---|---|---|
| Instagram | https://www.instagram.com/meyranamazvakitleri | Primary: Reels | No | Must be a Professional (Business/Creator) account for Insights / Graph API |
| TikTok | https://www.tiktok.com/@meyraapp | Primary: discovery | No | Business account recommended for analytics |
| YouTube | https://www.youtube.com/@meyranamazvakitleri | Primary: Shorts + search | No | YouTube Analytics API is free (OAuth, read-only) |
| Website | https://meyraapp.com | Conversion hub | No analytics installed | |
| App Store | id6759878169 | Install | No | |
| Google Play | com.omerozkan.meyra | Install | No | |

## Approvers
Only these names are accepted in `approved_by` (the validator checks this):

```approvers
Ömer Özkan
Ömer
```

## Bio-link plan (proposal)
- IG / TikTok / YouTube bio link: `https://meyraapp.com/tr/download?utm_source=<platform>&utm_medium=social&utm_campaign=bio`. Generate with `npm run links`.
- Until the website forwards UTMs to the stores (owner change), attribution happens at link-click level (platform insights) and through the store campaign links in video descriptions where links are allowed (YouTube).
