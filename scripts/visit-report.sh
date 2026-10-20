#!/usr/bin/env bash
# visit-report.sh — 网站访问统计（日志口径，只读）
#
# 数据源：服务器 ~/kernel-blog/logs/ 下的 nginx access 日志（日轮转，留 14 份）
# 口径说明（务必保留，否则数字会被误读）：
#   · PV = 浏览器 UA 的 GET 200，且排除静态资源、排除带查询串的扫描探测
#   · UV = 上述请求的去重源 IP（不等于人数：NAT 会低估、伪装 UA 的爬虫会高估）
#   · 403/503/301 不计入（分别是防爬拦截、限流、HTTP→HTTPS 跳转）
#
# 用法：
#   bash scripts/visit-report.sh          # 打印报告
#   bash scripts/visit-report.sh --send   # 打印并通过 cc-connect 发到当前群
set -uo pipefail

HOST="${BLOG_HOST:-admin@118.31.67.240}"
SEND=0
[ "${1:-}" = "--send" ] && SEND=1

REMOTE_REPORT=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" 'bash -s' <<'REMOTE'
cd ~/kernel-blog/logs 2>/dev/null || { echo "ERROR: 日志目录不存在"; exit 1; }

bot='AhrefsBot|SemrushBot|bot|Bot|crawler|spider|GPTBot|ClaudeBot|Bytespider|PetalBot|facebookexternalhit|bingbot|Googlebot|MJ12bot|DotBot|CCBot|YandexBot|Baiduspider|Sogou'

today=$(date '+%d/%b/%Y')
for f in access.log access.log.*; do
  case "$f" in *.gz) zcat "$f" 2>/dev/null;; *) cat "$f" 2>/dev/null;; esac
done | awk -F'"' -v b="$bot" -v today="$today" '
  {
    split($1,x," "); d=x[4]; gsub(/\[/,"",d); split(d,y,":"); day=y[1];
    if (day !~ /^[0-9][0-9]\/[A-Z][a-z][a-z]\/[0-9][0-9][0-9][0-9]$/) next;
    tot[day]++
    if ($6 ~ /Mozilla/ && $6 !~ b && $2 ~ /^GET / && $3 ~ / 200 /) {
      split($2,a," "); p=a[2];
      if (p ~ /\?/) next;                                   # 扫描探测
      if (p ~ /\.(css|js|svg|png|jpg|jpeg|ico|xml|txt|woff2?)$/ || p ~ /^\/_astro\//) next;  # 静态资源
      pv[day]++; ip[day SUBSEP x[1]]=1; perip[x[1]]++; page[p]++
    }
  }
  END {
    n=0; for (d in tot) days[++n]=d
    for (i=1;i<=n;i++) for (j=i+1;j<=n;j++) if (days[i]>days[j]) {t=days[i];days[i]=days[j];days[j]=t}
    for (i=1;i<=n;i++) { d=days[i]; u=0; for (k in ip) { split(k,z,SUBSEP); if (z[1]==d) u++ }
      printf "DAY\t%s\t%d\t%d\t%d\n", d, pv[d], u, tot[d] }
    for (p in page) printf "PAGE\t%d\t%s\n", page[p], p
    for (i in perip) if (perip[i] > 200) printf "BIGIP\t%d\t%s\n", perip[i], i
  }'
REMOTE
)

if [ -z "$REMOTE_REPORT" ] || printf '%s' "$REMOTE_REPORT" | grep -q '^ERROR'; then
  echo "❌ 取数失败：${REMOTE_REPORT:-无输出}" >&2
  exit 1
fi

REPORT=$(printf '%s\n' "$REMOTE_REPORT" | awk -F'\t' -v today="$(date '+%d/%b/%Y')" '
  $1=="DAY"  { n++; d[n]=$2; pv[n]=$3; uv[n]=$4; tot[n]=$5; next }
  $1=="PAGE" { np++; pn[np]=$2; pp[np]=$3; next }
  $1=="BIGIP"{ nb++; bi[nb]=$2; bip[nb]=$3; next }
  END {
    # 最近一天 + 7 天窗口（当天日志尚未写完，单列为「今日至今」）
    last=n; first=(n>7 ? n-6 : 1); complete=(d[n]==today ? n-1 : n)
    if (complete<1) complete=1
    printf "📊 **网站访问日报**\n\n"
    printf "**%s（最近完整日）**：PV %d · UV %d · 原始请求 %d\n", d[complete], pv[complete], uv[complete], tot[complete]
    if (complete < n) printf "**今日至今**：PV %d · UV %d\n", pv[n], uv[n]
    printf "\n"

    printf "**近 %d 天**\n```\n日期        PV   UV\n", (last-first+1)
    spv=0; suv=0; cnt=0
    for (i=first;i<=last;i++) { printf "%s %5d %4d\n", d[i], pv[i], uv[i]; spv+=pv[i]; suv+=uv[i]; cnt++ }
    printf "日均        %5d %4d\n```\n\n", spv/cnt, suv/cnt

    # 热门页面 top5
    printf "**热门页面（全窗口）**\n"
    # 简单选择排序取前 5
    for (i=1;i<=np;i++) for (j=i+1;j<=np;j++) if (pn[j]>pn[i]) {t=pn[i];pn[i]=pn[j];pn[j]=t; s=pp[i];pp[i]=pp[j];pp[j]=s}
    for (i=1;i<=np && i<=5;i++) printf "%d. %s — %d\n", i, pp[i], pn[i]
    printf "\n"

    # 异常标记
    anom=0
    for (i=1;i<=n;i++) if (uv[i] > 0 && pv[i]/uv[i] > 20) { printf "⚠️ %s：PV %d / UV %d，比值异常，疑似单源爬取\n", d[i], pv[i], uv[i]; anom++ }
    for (i=1;i<=nb;i++) { printf "⚠️ 单 IP 累计 %d 次：%s\n", bi[i], bip[i]; anom++ }
    if (anom==0) printf "✅ 未发现异常\n"

    printf "\n_口径：日志法，已排除静态资源与查询串探测；UV 按 IP 去重，不等于人数。_\n"
  }')

if [ "$SEND" = "1" ]; then
  # 显式投递：不往 stdout 打印，避免 cron 再把同一份内容投递一次（重复消息）
  export PATH=/home/jiaqi/.nvm/versions/node/v24.19.0/bin:$PATH
  # cron 在 daemon 里跑，daemon 的 CC_SESSION_KEY 未必是这条任务绑定的群；
  # 用 CC_SEND_SESSION 显式指定，避免消息投到别的会话。
  SEND_ARGS=()
  [ -n "${CC_SEND_SESSION:-}" ] && SEND_ARGS=(-s "$CC_SEND_SESSION")
  cc-connect send "${SEND_ARGS[@]}" --message "$REPORT" >&2 2>&1 | tail -2
else
  echo "$REPORT"
fi
