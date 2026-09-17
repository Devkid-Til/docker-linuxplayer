#!/bin/bash
# ssl-autorenew.sh — 本地签发 + 自动续期 Let's Encrypt 证书（替代阿里云免费证书手动续期）
#
# 架构（2026-09-17 定）：**本地干活，服务器纯镜像**
#   · 本脚本在【本地开发机】执行：申请/续期证书 → rsync 到服务器 → reload 容器 nginx
#   · 服务器不装 acme.sh、不跑任何脚本/cron，只收证书文件并伺服
#
# 证书落盘：<repo>/docker/ssl/kernelplayer.cn.{pem,key}
#   —— 该目录已 gitignore（私钥绝不入库），文件名与服务器 nginx 配置一致，nginx 无需改动
#
# 前置：
#   ① 域名 DNS 托管在阿里云（.cn 域名默认是）
#   ② 阿里云 RAM 子用户 + AliyunDNSFullAccess → AccessKeyId/Secret
#   ③ 服务器 nginx 已配好 443 server block 并挂载 docker/ssl/（一次性的活）
#
# 用法：
#   Ali_Key=<id> Ali_Secret=<secret> bash scripts/ssl-autorenew.sh
#
set -euo pipefail

DOMAIN="${DOMAIN:-kernelplayer.cn}"
BLOG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSL_DIR="$BLOG/docker/ssl"
ACME="$HOME/.acme.sh/acme.sh"

[ -n "${Ali_Key:-}" ] && [ -n "${Ali_Secret:-}" ] || {
  echo "✗ 缺少 Ali_Key / Ali_Secret（阿里云 RAM 凭据，需 AliyunDNSFullAccess）"; exit 1; }

echo "═══ 本地签发 + 自动续期 · $DOMAIN ═══"

# 1) 本地安装 acme.sh
if [ ! -f "$ACME" ]; then
  echo "[1] 本地安装 acme.sh ..."
  curl -s https://get.acme.sh | sh -s "email=admin@$DOMAIN"
else
  echo "[1] acme.sh 已存在：$ACME"
fi
"$ACME" --set-default-ca --server letsencrypt >/dev/null 2>&1 || true

# 2) 本地签发（DNS 验证：不占端口、不受服务器防爬影响、支持通配符）
echo "[2] 本地签发证书（Let's Encrypt，DNS 验证）..."
export Ali_Key Ali_Secret
"$ACME" --issue --dns dns_ali -d "$DOMAIN" -d "www.$DOMAIN" || {
  echo "✗ 签发失败（检查 RAM 凭据 / DNS 是否托管阿里云）"; exit 1; }

# 3) 装到本地 docker/ssl/，并注册「续期后自动调用 push-cert.sh」
echo "[3] 安装到 $SSL_DIR/ + 注册续期后自动推送 ..."
mkdir -p "$SSL_DIR"
"$ACME" --install-cert -d "$DOMAIN" \
  --key-file       "$SSL_DIR/$DOMAIN.key" \
  --fullchain-file "$SSL_DIR/$DOMAIN.pem" \
  --reloadcmd      "bash $BLOG/scripts/push-cert.sh"

# 4) 立即推一次到服务器
echo "[4] 首次推送到服务器 ..."
bash "$BLOG/scripts/push-cert.sh"

echo ""
echo "✓ 完成。之后 acme.sh 会在到期前【本地】自动续期，并自动 rsync 到服务器 + reload nginx。"
echo "  服务器侧：无 acme.sh、无 cron，纯镜像。"
echo ""
echo "提醒：DNS 给 @（裸域名）也加一条 A 记录 → 118.31.67.240，否则 https://$DOMAIN（不带 www）打不开。"
