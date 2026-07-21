#!/usr/bin/env bash
# Commit local changes (if any) and push to origin. Single author only — no co-authors.
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE="${REMOTE:-origin}"
MSG="${1:-}"

if [[ -n "$(git status --porcelain)" ]]; then
  git add -A

  if [[ -z "$MSG" ]]; then
    # Default message from changed paths
    FILES="$(git diff --cached --name-only | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
    MSG="chore: update ${FILES:-project}"
    if [[ ${#MSG} -gt 72 ]]; then
      MSG="chore: sync local changes ($(date '+%Y-%m-%d %H:%M'))"
    fi
  fi

  # Explicit single-author commit; never append Co-Authored-By
  git commit --author="FrankWkd-Plus <227823526+FrankWkd-Plus@users.noreply.github.com>" -m "$MSG"
  echo "✓ committed: $MSG"
else
  echo "· nothing to commit"
fi

AHEAD="$(git rev-list --count "${REMOTE}/${BRANCH}..HEAD" 2>/dev/null || echo 1)"
if [[ "$AHEAD" == "0" ]]; then
  echo "· already up to date with ${REMOTE}/${BRANCH}"
  exit 0
fi

git push -u "$REMOTE" "$BRANCH"
echo "✓ pushed ${BRANCH} → ${REMOTE}"
