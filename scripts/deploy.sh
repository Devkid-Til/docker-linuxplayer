#!/bin/bash
# 博客发布：build → 部署到服务器 → git 版本控制
# 用法: bash deploy.sh ["commit message"]
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
SERVER="admin@118.31.67.240"
DEST="~/kernel-blog/site"
MSG="${1:-update}"

echo "[deploy] rebuilding..."
node "$DIR/build.js"

echo "[deploy] syncing to $SERVER..."
scp -r "$ROOT/site/index.html" "$ROOT/site/assets" "$ROOT/site/feed.xml" "$ROOT/site/tags" "$ROOT/site/posts" "$SERVER:$DEST/"

echo "[deploy] verifying..."
curl -s -o /dev/null -w "  %{http_code} http://118.31.67.240\n" http://118.31.67.240

echo "[deploy] committing & pushing..."
cd "$ROOT" && git add -A && git commit -m "$MSG" && git push
echo "[deploy] done."
