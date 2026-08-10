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

# 守卫：build 成功但内容为空时禁止部署（防 rsync --delete 清空线上全部文章）
if [ ! -f "$ROOT/site/index.html" ] || [ -z "$(ls -A "$ROOT/site/posts" 2>/dev/null)" ]; then
  echo "[deploy] ⛔ 构建产物缺 index.html 或 posts 为空，中止部署（防 --delete 清空线上）"
  exit 1
fi

echo "[deploy] syncing to $SERVER..."
rsync -azc --delete --timeout=15 "$ROOT/site/" "$SERVER:$DEST/"   # -c 按内容校验，不依赖 mtime

echo "[deploy] verifying..."
# 健康检查：验最新文章页可达（不只看首页），失败即中止——不再静默通过
LATEST_POST="$(ls -d "$ROOT/site/posts/"*/ 2>/dev/null | sort | tail -1 | xargs -n1 basename)"
if [ -n "$LATEST_POST" ] && curl -sf --max-time 10 -o /dev/null "http://118.31.67.240/posts/$LATEST_POST/"; then
  echo "  ✓ 最新文章 $LATEST_POST HTTP 200"
elif curl -sf --max-time 10 -o /dev/null http://118.31.67.240; then
  echo "  ✓ HTTP 200（无文章页，仅首页）"
else
  echo "  ⛔ 健康检查失败：$SERVER 不可达或站点异常"
  exit 1
fi

# 内容完整性校验：关键文件本地 vs 服务器 sha256 一致（防 rsync 半传/篡改）
echo "[deploy] verifying content hashes..."
HASH_FAIL=0
for f in index.html feed.xml robots.txt; do
  local_h="$(sha256sum "$ROOT/site/$f" 2>/dev/null | cut -d' ' -f1)"
  remote_h="$(ssh "$SERVER" "sha256sum '$DEST/$f' 2>/dev/null | cut -d' ' -f1")"
  if [ -n "$local_h" ] && [ "$local_h" = "$remote_h" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f 哈希不一致（本地 ${local_h:-无} / 远端 ${remote_h:-无}）"
    HASH_FAIL=1
  fi
done
[ "$HASH_FAIL" -eq 0 ] || { echo "  ⛔ 内容校验失败，部署中止"; exit 1; }

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
