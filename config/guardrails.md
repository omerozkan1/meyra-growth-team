# Guardrails (safety and approval)

## What agents may do
- Read public web pages (official sources first).
- Create and edit files in this repo.
- Run local scripts (`npm run validate|test|queue|links|metrics`).
- Draft posts, captions, replies, emails and store-listing changes **as files**.

## What agents may never do
| Action | Why | Enforced by |
|---|---|---|
| Publish, schedule, comment, DM, like, follow on any platform | Owner approval required | Guard hook blocks posting endpoints; no social credentials stored |
| Mark content approved / run `scripts/approve.mjs` | Approval must come from a human | Guard hook + validator (`approved_by` must be in `config/channels.md` approvers) |
| Spend money (ads, boosts, subscriptions) | Budget rule | Guard hook blocks ad APIs; budget.md |
| Change the website, app, store listings or account settings | Production changes are the owner's | Drafts go to `research/` or `content/` as proposals |
| `git push`, add remotes | Avoid accidental publication | Guard hook |
| Store credentials in files other than `.env` | Secrets hygiene | `.gitignore` + validator secrets scan |
| Scrape logged-in pages or use unofficial APIs | ToS | Policy |

## Approval protocol
1. The agent finishes a concept, sets `status: in_review` and runs `npm run validate` (must pass).
2. The owner runs `npm run queue` to see the batch.
3. The owner reviews each file, then runs `npm run approve -- V03 --by "Ömer"` (or edits status to `rejected` with `review_notes`).
4. The owner publishes manually in the native app and pastes the URLs back. An agent then sets `status: published` + `published_urls`.
5. Any change to an approved file's caption/script resets it to `in_review`. The validator detects this through `approved_hash`.

## Escalate to the owner immediately when
- A comment or DM involves a complaint, a bug, a refund or a religious ruling request.
- A post attracts negative or sectarian attention.
- Any data looks like a privacy issue.
