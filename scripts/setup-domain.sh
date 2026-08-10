#!/bin/bash
# setup-domain.sh — 备案通过后：域名绑定 + HTTPS 一键上线
# 域名: kernelplayer.cn（阿里云 .cn，服务器 118.31.67.240）
#
# ⚠️ 执行前置（缺一不可）：
#   ① ICP 备案已通过（未通过时域名解析会被阿里云拦截）
#   ② DNS A 记录已解析：@ 和 www → 118.31.67.240（TTL 600，等几分钟生效）
#   ③ 阿里云安全组已放行 80 + 443
#
# 用法: bash scripts/setup-domain.sh        （域名默认 kernelplayer.cn）
# 说明: 备案通过后由 COO 执行；执行中人工确认关键节点
set -euo pipefail

DOMAIN="${1:-kernelplayer.cn}"
SERVER="admin@118.31.67.240"
BLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "═══ 域名绑定 + HTTPS ═══"
echo "域名: $DOMAIN → $SERVER"

# 0. 前置检查：域名已解析到本服务器
echo "[0] 检查 DNS 解析..."
IP="$(dig +short "$DOMAIN" | head -1)"
[ -n "$IP" ] && echo "   DNS: $DOMAIN → $IP"
[ "$IP" = "118.31.67.240" ] && echo "   ✓ 已指向服务器" || { echo "   ✗ 域名未解析到 118.31.67.240（先配 DNS，未备案会被拦）"; exit 1; }

# 1. nginx server_name 绑定域名
echo "[1] nginx server_name → $DOMAIN ..."
sed -i "s/server_name _;/server_name $DOMAIN www.$DOMAIN;/" "$BLOG/docker/nginx-default.conf"
rsync -av "$BLOG/docker/nginx-default.conf" "$SERVER:~/kernel-blog/docker/nginx-default.conf" >/dev/null
ssh "$SERVER" "cd ~/kernel-blog && docker compose up -d blog"

# 2. 域名 HTTP 可达验证
echo "[2] 验证 http://$DOMAIN ..."
curl -s --max-time 10 -A "Mozilla/5.0" -o /dev/null -w "   HTTP %{http_code}\n" "http://$DOMAIN/" \
  || { echo "   ✗ 域名不可达（检查 DNS/安全组/nginx）"; exit 1; }

# 3. Let's Encrypt 证书（http-01 standalone 验证；certbot 容器一次性申请）
echo "[3] 申请 Let's Encrypt 证书（$DOMAIN + www）..."
ssh "$SERVER" "cd ~/kernel-blog && docker run --rm -p 80:80 \
  -v certbot-etc:/etc/letsencrypt -v certbot-lib:/var/lib/letsencrypt \
  certbot/certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN \
  --email admin@$DOMAIN --agree-tos --no-eff-email" \
  || { echo "   ✗ 证书申请失败"; exit 1; }

# 4. 配置 HTTPS（生成 nginx https server block，80 → 443 跳转）
echo "[4] 配置 HTTPS server block ..."
# 注：此处需在 docker/nginx-default.conf 追加 443 server block 并挂载证书卷，
#     具体按实际环境调整（本脚本是框架，执行时 COO 细化证书挂载）
cat >> "$BLOG/docker/nginx-https.conf" << CONF
# HTTPS server（由 setup-domain.sh 生成）
server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    root /usr/share/nginx/html;
    index index.html;
    # ...（同 80 server 的静态服务/防爬配置）
}
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$host\$request_uri;
}
CONF
echo "   （nginx-https.conf 已生成，docker-compose 需挂载证书卷后重建——执行时细化）"

# 5. astro site 配置更新（feed/canonical/OG 全站 URL 跟随）
echo "[5] astro site → https://$DOMAIN ..."
sed -i "s#site: 'http://[^']*'#site: 'https://$DOMAIN'#" "$BLOG/astro.config.mjs"

# 6. 部署 + 提示
echo "[6] 部署上线 ..."
cd "$BLOG" && bash scripts/deploy.sh "feat: 域名 https://$DOMAIN 上线"

echo ""
echo "════ 完成 ════"
echo "访问: https://$DOMAIN"
echo "后续配套（COO 执行）:"
echo "  1. OSS 防盗链白名单加 $DOMAIN（阿里云 OSS 控制台，防图片被扒）"
echo "  2. 公众号「阅读原文」指到 https://$DOMAIN/posts/... "
echo "  3. deploy.sh 健康检查地址改 https://$DOMAIN"
