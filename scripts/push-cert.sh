#!/bin/bash
# push-cert.sh — 把本地证书推送到服务器并让 nginx 重新加载
# 服务器只做镜像：本脚本在【本地】执行，服务器不装 acme.sh、不跑 cron。
#
# 被 ssl-autorenew.sh 注册为 acme.sh 的 --reloadcmd（续期后自动调用）。
# 也可手动执行：bash scripts/push-cert.sh
set -euo pipefail

DOMAIN="${DOMAIN:-kernelplayer.cn}"
SERVER="admin@118.31.67.240"
BLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSL_DIR="$BLOG/docker/ssl"
REMOTE_SSL="/home/admin/kernel-blog/docker/ssl"   # 绝对路径（~ 在远端不展开）
CONTAINER="kernel-blog"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"

[ -f "$SSL_DIR/$DOMAIN.pem" ] && [ -f "$SSL_DIR/$DOMAIN.key" ] || {
  echo "✗ 本地证书不存在：$SSL_DIR/$DOMAIN.{pem,key}（先跑 ssl-autorenew.sh）"; exit 1; }

echo "[push-cert] 推送证书 → $SERVER:$REMOTE_SSL ..."
rsync -az "$SSL_DIR/" "$SERVER:$REMOTE_SSL/"

echo "[push-cert] reload 容器 nginx ..."
ssh "$SERVER" "docker exec $CONTAINER nginx -s reload"

echo "[push-cert] 验证 https://www.$DOMAIN ..."
code="$(curl -s -m 10 -A "$UA" -o /dev/null -w '%{http_code}' "https://www.$DOMAIN/" || true)"
[ "$code" = "200" ] && echo "  ✓ HTTP 200，证书已生效" || { echo "  ✗ HTTP $code，请检查"; exit 1; }

# 打印证书到期时间（确认推上去的是新证书）
echo "  远端证书到期: $(ssh "$SERVER" "openssl x509 -enddate -noout -in $REMOTE_SSL/$DOMAIN.pem" 2>/dev/null | cut -d= -f2)"
