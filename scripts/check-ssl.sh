#!/bin/bash
# check-ssl.sh — SSL 证书到期检查，剩余天数不足则发飞书告警
# 兜底用途：万一 acme.sh 自动续期连续失败（本地机器长期关机 / RAM 凭据失效等），
#           提前预警，人工介入，避免站点真的挂掉。
#
# 建议挂 cc-connect cron 每天跑一次：0 9 * * *
# 用法: bash scripts/check-ssl.sh
set -euo pipefail

DOMAIN="${DOMAIN:-kernelplayer.cn}"
SERVER="admin@118.31.67.240"
REMOTE_CERT="/home/admin/kernel-blog/docker/ssl/$DOMAIN.pem"
ALERT_CHAT="${ALERT_CHAT:-oc_b3bf629607272393dfb5e9bb32f63d63}"   # 群「网站运营」
THRESHOLD="${THRESHOLD:-14}"        # 剩余天数低于此值告警
LARK_PATH="/home/jiaqi/.nvm/versions/node/v24.19.0/bin"

alert() {  # $1 = 消息正文
  export PATH="$LARK_PATH:$PATH"
  LARKSUITE_CLI_NO_UPDATE_NOTIFIER=1 LARKSUITE_CLI_NO_SKILLS_NOTIFIER=1 \
    lark-cli im +messages-send --chat-id "$ALERT_CHAT" --text "$1" --as bot >/dev/null 2>&1 \
    && echo "[check-ssl] 已发告警" || echo "[check-ssl] ⚠ 告警发送失败"
}

# 取远端证书到期时间
END="$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$SERVER" \
  "openssl x509 -enddate -noout -in $REMOTE_CERT" 2>/dev/null | cut -d= -f2 || true)"

if [ -z "$END" ]; then
  alert "🚨 SSL 告警：读不到 $DOMAIN 的证书（$SERVER:$REMOTE_CERT）—— 服务器不可达或证书文件丢失，请检查。"
  exit 1
fi

END_TS="$(date -d "$END" +%s)"; NOW_TS="$(date +%s)"
DAYS=$(( (END_TS - NOW_TS) / 86400 ))
echo "[check-ssl] $DOMAIN 剩余 ${DAYS} 天（到期 $END）"

if [ "$DAYS" -lt "$THRESHOLD" ]; then
  alert "🚨 SSL 到期告警：$DOMAIN 证书只剩 ${DAYS} 天（到期 $END）。
自动续期可能失败了 —— 检查：① 本地机器是否常开 ② 阿里云 RAM 凭据是否有效 ③ 手动跑 bash scripts/ssl-autorenew.sh"
else
  echo "[check-ssl] ✓ 充足（阈值 ${THRESHOLD} 天），无需告警"
fi
