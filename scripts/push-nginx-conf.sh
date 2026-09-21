#!/bin/bash
# 推送 nginx / compose 配置到服务器（内核玩家博客）
#
# 为什么需要这个脚本：这两类文件**不在** deploy.sh 的同步范围里。
# deploy.sh 只 rsync `site/`（构建产物），docker/ 下的配置要单独推。
#
# 用法:
#   bash scripts/push-nginx-conf.sh            # 只推 nginx-default.conf（热更新，不重启容器）
#   bash scripts/push-nginx-conf.sh --compose  # 同时推 docker-compose.yml（需重建容器）
#   bash scripts/push-nginx-conf.sh --all      # 同上，显式写法
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
SERVER="admin@118.31.67.240"
DEST="~/kernel-blog"

PUSH_COMPOSE=0
case "${1:-}" in
  --compose|--all) PUSH_COMPOSE=1 ;;
  "") ;;
  *) echo "用法: $0 [--compose|--all]"; exit 1 ;;
esac

cd "$ROOT"

# ── 1. 语法校验 ────────────────────────────────────────────────
# 先本地起临时容器校验，别把坏配置推上线（nginx -t 只需挂载 conf + ssl）
echo "[1/4] 校验 nginx 配置语法 ..."
docker run --rm \
  -v "$ROOT/docker/nginx-default.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$ROOT/docker/ssl:/etc/nginx/ssl:ro" \
  nginx:1.27-alpine nginx -t 2>&1 | grep -E "syntax is ok|test is successful" || {
    echo "  ⛔ nginx 配置语法错误，中止推送"; exit 1; }
echo "  ✓ 语法通过"

# ── 2. 推送 nginx 配置（--inplace 保住 inode）────────────────────
# 关键：该文件是**单文件 bind-mount**，rsync 默认「写临时文件再改名」会换 inode，
# 而容器钉死在创建时的 inode 上 → 容器读到的仍是旧内容（服务器文件却是新的，极具迷惑性）。
# 用 --inplace 原地写，容器立即读到新内容，reload 即可生效，无需重建。
echo "[2/4] 推送 nginx-default.conf（--inplace）..."
rsync --inplace -av "$ROOT/docker/nginx-default.conf" "$SERVER:$DEST/docker/nginx-default.conf"

if [ "$PUSH_COMPOSE" = "1" ]; then
  echo "[2/4] 推送 docker-compose.yml ..."
  rsync --inplace -av "$ROOT/docker-compose.yml" "$SERVER:$DEST/docker-compose.yml"
  echo "  ⚠️  compose 改动需重建容器（见下一步）"
fi

# ── 3. 生效 ────────────────────────────────────────────────────
if [ "$PUSH_COMPOSE" = "1" ]; then
  echo "[3/4] 重建容器（compose 变更）..."
  ssh "$SERVER" "cd $DEST && docker compose config >/dev/null && docker compose up -d --force-recreate blog" 2>&1 | tail -3
else
  echo "[3/4] reload nginx（配置热更新）..."
  ssh "$SERVER" "docker exec kernel-blog nginx -s reload" && echo "  ✓ reload 完成"
fi

# ── 4. 指纹核对 + 验活 ─────────────────────────────────────────
# 必须比对容器内文件，别只信服务器上的文件或 nginx -t——它们校验的可能是旧 inode 的内容
echo "[4/4] 核对指纹并验活 ..."
LOCAL_H="$(md5sum "$ROOT/docker/nginx-default.conf" | cut -d' ' -f1)"
CONTAINER_H="$(ssh "$SERVER" "docker exec kernel-blog md5sum /etc/nginx/conf.d/default.conf" | cut -d' ' -f1)"
if [ "$LOCAL_H" = "$CONTAINER_H" ]; then
  echo "  ✓ 容器内配置 = 本地（$LOCAL_H）"
else
  echo "  ⛔ 指纹不一致：本地 $LOCAL_H / 容器 $CONTAINER_H"
  echo "     多半是 inode 陷阱——试 docker compose up -d --force-recreate blog"
  exit 1
fi

# 健康检查必须带浏览器 UA：nginx 防爬会 403 拦截默认 curl UA（自伤陷阱）
HC_UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
if curl -sf --max-time 10 -o /dev/null -A "$HC_UA" https://www.kernelplayer.cn/; then
  echo "  ✓ 站点 HTTP 200"
else
  echo "  ⛔ 站点不可达，请检查（回滚见 ~/kernel-blog-backup-*/）"
  exit 1
fi

echo "[done] 配置已生效"
