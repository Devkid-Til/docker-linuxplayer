#!/bin/bash
# 博客发布：build → 部署到服务器 → git 版本控制
# 用法: bash deploy.sh ["commit message"]
# SKIP_DEPLOY=1 时跳过 git commit/push（防止 post-commit hook 递归触发）
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
SERVER="admin@118.31.67.240"
DEST="~/kernel-blog/site"
MSG="${1:-update}"

echo "[deploy] rebuilding (Astro)..."
cd "$ROOT"
npm run build

echo "[deploy] syncing to $SERVER..."
rsync -az --delete "$ROOT/site/" "$SERVER:$DEST/"

echo "[deploy] verifying..."
if curl -sf -o /dev/null http://118.31.67.240; then
  echo "  ✓ HTTP 200"
else
  echo "  ⚠️ 健康检查未通过（已 rsync，继续）"
fi

if [ -z "${SKIP_DEPLOY:-}" ]; then
  cd "$ROOT"
  git add -A
  if git diff --cached --quiet; then
    echo "[deploy] nothing to commit"
  else
    git commit -m "$MSG"
    # 分支未配 upstream 时自动设置，避免 feature 分支上 push 报 fatal
    if git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" >/dev/null 2>&1; then
      git push
    else
      git push --set-upstream origin "$(git branch --show-current)"
    fi
  fi
fi
echo "[deploy] done."
