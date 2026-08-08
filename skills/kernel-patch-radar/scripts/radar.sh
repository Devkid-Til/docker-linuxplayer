#!/usr/bin/env bash
# radar.sh — kernel-patch-radar 的抓取入口（单一脚本，隶属于该 skill）
#
# 用法:
#   bash radar.sh daily [N]         每日源一次抓齐：linux-media + dri-devel（默认各 40 条）
#   bash radar.sh fetch <list> [N]  抓任一 lore 列表最近 N 条 → 每行 "ISO时间|标题|原文链接"
#   bash radar.sh lwn [N]           抓 LWN Kernel 标题 → 每行 "标题 — URL"
#   bash radar.sh shard <list>      探测某 lore 列表的分片数
#
# 为什么统一走 lore git：lore.kernel.org 的 HTTP 页面被 Anubis 反爬挡（curl 拿不到），
# 但 git 智能协议（/info/refs?service=git-upload-pack）开放且实时。每列表按分片存 git 仓库，
# 新邮件追加到最大分片 → 自动探测最新分片 + shallow fetch。linux-media / dri-devel 都支持。
#
# 反 SIGPIPE 铁律（set -euo pipefail 下）：
#   - 截断输出用 sed -n（读完整个流，不早退）
#   - 提取首行用「整份捕获到变量 + ${var%%$'\n'*} 切片」，不经管道早退消费端
#   - 任何 `producer | head/grep -m1` 都可能在大输出时让 producer 收到 SIGPIPE → 141 全灭

set -euo pipefail

_do_fetch() {
  local LIST="$1" N="${2:-40}" TMP MAX=0 i miss=0 rc depth
  TMP="$(mktemp -d)"
  depth=$(( N > 350 ? N + 50 : 400 ))
  (
    cd "$TMP" || exit 1
    git init -q .
    # 分片探测：连续 2 次未命中即停（避免硬编码上限、减少 ls-remote 次数）
    for i in $(seq 0 60); do
      if GIT_TERMINAL_PROMPT=0 timeout 15 git ls-remote "https://lore.kernel.org/$LIST/$i/" 2>/dev/null | grep 'refs/heads/master' >/dev/null; then
        MAX=$i; miss=0
      else
        miss=$((miss+1)); (( miss >= 2 )) && break
      fi
    done
    if ! GIT_TERMINAL_PROMPT=0 timeout 120 git fetch -q --depth="$depth" "https://lore.kernel.org/$LIST/$MAX/" master 2>/dev/null; then
      echo "ERROR: git fetch 失败 ($LIST 分片 $MAX)" >&2
      exit 1
    fi
    # 每提交的原始邮件在 blob `m` 里，提取 Message-Id 拼原文链接。
    # 内部用 \x1f 做字段分隔（主题含 | 不误切）；Message-Id 用 sed 读完整个流（不早退，防 SIGPIPE）
    git log FETCH_HEAD --format='%cI%x1f%s%x1f%H' | sed -n "1,${N}p" | while IFS=$'\x1f' read -r ts sub hash; do
      msgs=$(git show "$hash:m" 2>/dev/null | sed -n 's/^[Mm]essage-[Ii][Dd]:[[:space:]]*//p') || true
      mid="${msgs%%$'\n'*}"; mid="${mid%$'\r'}"
      printf '%s|%s|https://lore.kernel.org/%s/%s/\n' "$ts" "$sub" "$LIST" "$mid"
    done
  )
  rc=$?
  rm -rf "$TMP"
  return $rc
}

_do_lwn() {
  local N="${1:-10}"
  curl -s --max-time 30 -A 'Mozilla/5.0' 'https://lwn.net/Kernel/' \
    | grep -oP '<a href="/Articles/[0-9]+/">[^<]+' \
    | sed -E 's|<a href="/Articles/([0-9]+)/">(.*)|\2 — https://lwn.net/Articles/\1/|' \
    | sed -n "1,${N}p"
}

_do_daily() {
  local N="${1:-40}" ok=0
  # 逐源隔离：任一源失败只报该源，不影响另一半；双源全挂才返回非零（cron 可区分）
  echo "## linux-media"
  if _do_fetch linux-media "$N"; then
    ok=$((ok+1))
  else
    echo "## linux-media：抓取失败（见上方 ERROR）" >&2
  fi
  echo ""
  echo "## dri-devel"
  if _do_fetch dri-devel "$N"; then
    ok=$((ok+1))
  else
    echo "## dri-devel：抓取失败（见上方 ERROR）" >&2
  fi
  (( ok > 0 )) || return 1
}

_do_shard() {
  local LIST="$1" MAX=0 i miss=0
  for i in $(seq 0 60); do
    if GIT_TERMINAL_PROMPT=0 timeout 15 git ls-remote "https://lore.kernel.org/$LIST/$i/" 2>/dev/null | grep 'refs/heads/master' >/dev/null; then
      MAX=$i; miss=0
    else
      miss=$((miss+1)); (( miss >= 2 )) && break
    fi
  done
  echo "$LIST 最新分片: $MAX"
}

CMD="${1:-help}"
case "$CMD" in
  daily) shift; _do_daily "${1:-40}" ;;
  fetch) shift; _do_fetch "${1:?用法: radar.sh fetch <list> [N]}" "${2:-40}" ;;
  lwn)   shift; _do_lwn "${1:-10}" ;;
  shard) shift; _do_shard "${1:?用法: radar.sh shard <list>}" ;;
  help|-h|--help) sed -n '2,13p' "$0" ;;
  *) echo "未知命令: $CMD" >&2; sed -n '2,13p' "$0"; exit 1 ;;
esac
