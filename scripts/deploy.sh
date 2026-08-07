#!/bin/bash
# 部署博客到生产服务器（本地 build → SCP → 服务器 nginx 自动生效）
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
SERVER="admin@118.31.67.240"
DEST="~/kernel-blog/site"

echo "[deploy] rebuilding..."
node "$DIR/build.js"

echo "[deploy] syncing site/ to $SERVER..."
scp -r "$ROOT/site/index.html" "$ROOT/site/assets" "$ROOT/site/feed.xml" "$ROOT/site/tags" "$ROOT/site/posts" "$SERVER:$DEST/"

echo "[deploy] verifying..."
curl -s -o /dev/null -w "  %{http_code} http://118.31.67.240\n" http://118.31.67.240
echo "[deploy] done."
