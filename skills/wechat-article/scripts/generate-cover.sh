#!/bin/bash
# 生成公众号报刊风封面（自包含：首次自动安装 resvg 依赖）
# 用法：bash generate-cover.sh --date "08-07" --topic "今日看点" [--out cover.png] [--width 3600]
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ ! -d "$DIR/node_modules/@resvg/resvg-js" ]; then
  echo "[cover] installing @resvg/resvg-js..." >&2
  (cd "$DIR" && npm install @resvg/resvg-js --no-fund --no-audit) 2>&1 | tail -5
fi
node "$DIR/generate-cover.js" "$@"
