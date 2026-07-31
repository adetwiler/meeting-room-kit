#!/usr/bin/env bash
#
# leak-audit.sh: full-TREE scan for private tells before publishing.
#
# The pre-commit hook only checks each commit's additions. This checks the WHOLE
# tracked tree at once, which is what you want before you flip the repo public or
# push a batch. It greps every tracked file for your private denylist plus email
# addresses and absolute home paths, and exits non-zero with a report if anything
# matches. Run it from anywhere in the repo: bash scripts/leak-audit.sh
#
# The denylist itself lives OUTSIDE the tracked tree in .githooks/denylist.local
# (gitignored). If the terms were written here, this script would be the leak:
# publishing your leak scanner must never publish the list of things you are
# hiding. Copy .githooks/denylist.example to .githooks/denylist.local and fill
# in your real terms.
#
# See method/09-safety-nets.md for why this exists, and the README's contributing
# section, which says to run this before any publish.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

denylist_file="$repo_root/.githooks/denylist.local"
if [ ! -f "$denylist_file" ]; then
  echo "LEAK AUDIT REFUSED: $denylist_file is missing."
  echo "Copy .githooks/denylist.example to .githooks/denylist.local and fill in"
  echo "your real private terms (it is gitignored). A leak audit with no"
  echo "denylist would pass on anything, which is worse than failing."
  exit 2
fi
DENYLIST="$(grep -v '^\s*#' "$denylist_file" | grep -v '^\s*$' | paste -sd'|' -)"
if [ -z "$DENYLIST" ]; then
  echo "LEAK AUDIT REFUSED: $denylist_file has no terms in it."
  exit 2
fi

# Any email address, and absolute macOS home paths for any user.
EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
HOMEPATH='/Users/[A-Za-z0-9._-]+'

# No self-exclusions: this script and the hook are scanned like everything
# else. They no longer contain the denylist, so a match in them is real.

hits=0
report=""

scan() {
  local label="$1" pattern="$2"
  # -I skips binary files; -n gives line numbers; -E extended regex.
  local out
  out="$(git grep -I -n -i -E "$pattern" -- . 2>/dev/null || true)"
  if [ -n "$out" ]; then
    report="${report}
== ${label} ==
${out}
"
    hits=1
  fi
}

scan "private denylist" "$DENYLIST"
scan "email address" "$EMAIL"
scan "absolute home path" "$HOMEPATH"

if [ "$hits" -ne 0 ]; then
  echo "LEAK AUDIT FAILED. The tracked tree contains private tells:"
  printf '%s\n' "$report"
  echo "Scrub the matches above before publishing. Nothing should go public"
  echo "with these in it."
  exit 1
fi

echo "Leak audit clean: no private denylist terms, emails, or home paths in the tracked tree."
exit 0
