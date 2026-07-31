#!/usr/bin/env bash
#
# release-check.sh: run this BEFORE flipping the repo public or pushing a batch.
#
# The pre-commit hook checks each commit's ADDITIONS. This checks the WHOLE tracked
# tree at once, which is the thing you actually want before publishing, because a
# private tell can arrive in a file you never edited (a copied doc, a vendored lib).
#
# Two gates, both fail-closed:
#   1. leak audit  - every tracked file against the local denylist + emails + home paths
#   2. em dashes   - the house rule, checked across the tree rather than per commit
#
# The denylist lives OUTSIDE the tree (.githooks/denylist.local, gitignored). If it
# were written here, publishing the scanner would publish the list of things being
# hidden. Do not regress that.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0

echo "==> leak audit (whole tree)"
if bash scripts/leak-audit.sh; then echo "    clean"; else fail=1; fi

echo "==> em dashes (whole tree, excluding the vendored SDK)"
# The vendored LiveKit build is upstream's bytes and is deliberately unmodified, so
# the house style rule does not apply to it.
hits=$(git ls-files | grep -v '^public/vendor/' | xargs grep -nP '[\x{2014}\x{2013}]' 2>/dev/null || true)
if [ -n "$hits" ]; then echo "$hits" | sed 's/^/    /'; echo "FAIL: em or en dash found"; fail=1; else echo "    clean"; fi

if [ "$fail" -ne 0 ]; then echo; echo "RELEASE CHECK FAILED - do not publish"; exit 1; fi
echo; echo "RELEASE CHECK PASSED"
