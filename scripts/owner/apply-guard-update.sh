#!/bin/bash
# OWNER ONLY: installs guard v2 from scripts/guard-staged/ after showing you the diff.
# Agents cannot write guard files, so this step is deliberately yours.
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -t 0 ] || { echo "Run this yourself in an interactive terminal."; exit 1; }

echo "== Running guard v2 tests first"
node --test tests/guard-v2.test.mjs >/dev/null && echo "guard v2 tests: PASS"

echo "== Diff: scripts/lib/guard-rules.mjs"
diff -u scripts/lib/guard-rules.mjs scripts/guard-staged/guard-rules.mjs | head -60 || true
echo "... (full diff: diff -u scripts/lib/guard-rules.mjs scripts/guard-staged/guard-rules.mjs)"
echo "== Diff: .claude/settings.json"
diff -u .claude/settings.json scripts/guard-staged/settings.json || true

read -r -p "Install guard v2? [y/N] " ans
[ "$ans" = "y" ] || { echo "Cancelled."; exit 1; }
cp scripts/lib/guard-rules.mjs "scripts/lib/guard-rules.v1.bak.mjs"
cp scripts/guard-staged/guard-rules.mjs scripts/lib/guard-rules.mjs
cp .claude/settings.json ".claude/settings.v1.bak.json"
cp scripts/guard-staged/settings.json .claude/settings.json
cat > scripts/approve.mjs <<'EOF'
#!/usr/bin/env node
// Deprecated v1 approval (unsigned). Use the signed flow: the local panel or `npm run approve -- V01`.
console.error('Deprecated. Use the panel or: npm run approve -- <ID>');
process.exit(1);
EOF
node --test tests/*.test.mjs >/dev/null && echo "✔ guard v2 installed; all tests pass. Restart Claude Code sessions to load it."
