# Owner asset library

Put real footage here. The renderer uses it automatically on the next run (`npm run render -- V01` or the daily run).
Large media files are git-ignored.

```
assets/library/V01/seg03.mp4      ← footage for script row 3 (mp4/mov/png/jpg)
assets/library/V01/seg04.png
assets/library/V01/voiceover.wav  ← your own voice-over for the whole video (wav/m4a/mp3)
```

- Row numbers = the rows of the `## Script` table in `content/videos/V01-*.md` (1 = first row). Each render report
  (`media/rendered/V01.render.json` → `missing_assets`) lists exactly which rows still need footage.
- A video becomes **final** (publishable after approval) only when no row is missing and `voiceover.*` exists.
  Until then it is an **animatic** with a red "TASLAK" stamp, and the publish gate refuses it.
- Screen recordings: Do Not Disturb on, no personal notifications, neutral city.
- Stock footage: free licence only (Pexels/Pixabay). Add the source URL to `assets/library/V01/SOURCES.md`.
