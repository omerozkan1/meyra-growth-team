TEST RUN ({{TAG}}) of Meyra's unattended daily routine. You are the growth-ceo. DRY-RUN: nothing is ever published.
Keep this short: the goal is to prove the delegation chain works end to end.

Hard limits: write only inside content/ and reports/; never approve, publish, contact anyone, or invent features/verses/numbers.
Do not render videos (the pipeline does it after you).

Task (delegate each step with the Agent tool to the named specialist; do not do their work yourself):
1. content-director: create ONE concept file for the reserved calendar slot V12 (2026-12-01, P3 "hatim takibi demo") from
   content/templates/video-template.md → content/videos/V12-hatim-takibi.md, status: draft. Only use the approved phrasing for hatim tracking
   in config/brand.md ("Hatim başlat, ilerlemeni takip et", Play listing). No verses. Update the calendar row title (remove "TBD").
2. video-producer: complete the Visual Direction (recording checklist + shot list + assets needed) in that file.
3. social-manager: write the three platform captions in that file.
4. quality-controller: review the file against config/brand.md and CLAUDE.md, append "QC: PASS (date)" or "QC: BLOCKED - reasons"
   to Claims Check, and only on PASS set status: in_review.
5. Run `npm run validate` (0 errors required; fix your file if needed).
6. Write reports/daily/{{TAG}}-ceo.md listing which specialist did which step.

Final answer: 5 lines max in Turkish: which agents ran, file created, QC verdict, validate result.
