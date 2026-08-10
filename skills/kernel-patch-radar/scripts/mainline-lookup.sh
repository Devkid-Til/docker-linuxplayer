#!/usr/bin/env bash
# mainline-lookup.sh — 主内核(mainline)合入状态反查（Message-Id → 是否已进 torvalds/linux）
#
# 背景：patchwork.kernel.org 的 REST API 被 Anubis 挡（HTTP 200 返回 JS 挑战页），无免 JS 通道。
#       但内核提交体保留 `Link: https://lore.kernel.org/r/<mid>` / `https://patch.msgid.link/<mid>` trailer
#       （git send-email / b4 自动附加，mainline 提交实测 ~45% 带可提取引用）——mid 可反查"这条合进去了没"。
#       本环境唯一验证稳定的 mainline 通道是 GitHub REST API（api.github.com；git.kernel.org 浅克隆超时、
#       GitHub git 智能协议 TLS 不稳，均不可用），故用 API 建本地 mid 索引缓存，不做本地 git 镜像。
#
# 用法:
#   bash mainline-lookup.sh index [--pages N]   拉最近 N 页（每页 100 条）mainline commit → 本地索引缓存
#                                               （默认 5 页 ≈ 500 条 ≈ 近 1-2 天；周/月盘点用 --pages 30 ≈ 3000 条 ≈ 近 3-4 周）
#   bash mainline-lookup.sh query <mid> [<mid>...]   反查一个/多个 mid 是否已合入 mainline（从缓存）
#   bash mainline-lookup.sh check               查看缓存新鲜度（条数 + 更新时间 + 缓存路径）
#
# 反查语义：精确 mid 匹配。缓存未命中 = 该 mid 未合入 / 已被后续版本取代 / 超出索引窗口——
#           如实输出「未命中」，不做「未合入」的强断言。
#
# 限流说明：GitHub API 未认证 60 次/时。index 一次调用 = pages 次请求；30 页跑一次即 30 次，周/月盘点频度足够。
#           若中途限流，脚本如实报错并保留已写入的部分缓存（下次 index 重写整表，幂等）。

set -euo pipefail

CACHE_DIR="${KERNEL_RADAR_CACHE:-$HOME/.cache/kernel-radar}"
INDEX="$CACHE_DIR/mainline-index.tsv"
PER_PAGE=100

_do_index() {
  local pages="${1:-5}" page=1 tmp
  mkdir -p "$CACHE_DIR"
  tmp="$INDEX.tmp.$$"
  : > "$tmp"
  for page in $(seq 1 "$pages"); do
    json="$(curl -s -m 30 -H 'Accept: application/vnd.github+json' \
      "https://api.github.com/repos/torvalds/linux/commits?per_page=$PER_PAGE&page=$page" 2>/dev/null)" || true
    # 非 list 响应（限流/网络/出错）→ 报错并停，保留已写部分
    # 注意：不能用 heredoc（会覆盖管道 stdin，json 读不到）——用 python -c + 管道 stdin
    if ! printf '%s' "$json" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin)
except Exception:
    sys.exit(1)
sys.exit(0 if isinstance(d,list) else 1)'; then
      echo "ERROR: 第 $page 页非预期响应（GitHub API 限流或网络问题）" >&2
      break
    fi
    # 提取：非 merge 提交 + 消息中含 lore/msgid 引用的 → mid|sha|author-date|subject
    # （字符串拼接而非 f-string，避免表达式内转义在旧版 Python 报错）
    printf '%s' "$json" | python3 -c 'import json,sys,re
pat=re.compile(r"https://(?:lore\.kernel\.org/r/|patch\.msgid\.link/)([0-9]{12,16}\.[0-9]+-[0-9A-Za-z_.+-]+@[0-9A-Za-z_.-]+)")
for c in json.load(sys.stdin):
    msg=c["commit"]["message"]
    if msg.startswith("Merge"):
        continue
    m=pat.search(msg)
    if m:
        sub=msg.splitlines()[0].replace("\t", " ")
        print(m.group(1) + "\t" + c["sha"][:12] + "\t" + c["commit"]["author"]["date"] + "\t" + sub)' >> "$tmp"
  done
  # sort -u -k1,1 天然按 mid 去重（同 mid 可能被多页/多提交引用）
  sort -u -k1,1 "$tmp" > "$INDEX"
  rm -f "$tmp"
  echo "索引完成：$(wc -l < "$INDEX") 条带 mid 引用的 mainline 提交已缓存（$pages 页）→ $INDEX"
}

_do_query() {
  [ -f "$INDEX" ] || { echo "ERROR: 索引不存在，先跑 index（如 \`mainline-lookup.sh index --pages 5\`）" >&2; return 1; }
  local mid found=0
  for mid in "$@"; do
    found=0
    while IFS= read -r line; do
      found=1
      echo "✅ 已合入: $mid"
      echo "    $(printf '%s' "$line" | awk -F'\t' '{print $4"  ("$2", 作者日期 "$3")"}')"
      # 只取第一条（同 mid 多行时按 sort 唯一性最多一条，这里兜底）
      break
    done < <(grep -F "$mid" "$INDEX")
    if [ "$found" -eq 0 ]; then
      echo "⬜ 未命中: $mid（未合入 / 已被后续版本取代 / 超出索引窗口——索引覆盖见 check）"
    fi
  done
}

_do_check() {
  if [ -f "$INDEX" ]; then
    echo "缓存: $INDEX"
    echo "条数: $(wc -l < "$INDEX")"
    echo "更新: $(date -r "$INDEX" '+%Y-%m-%d %H:%M %Z' 2>/dev/null || stat -c '%y' "$INDEX")"
    echo "覆盖: $(awk -F'\t' 'NR==1{first=$3} {last=$3} END{print "作者日期最早 "first" ~ 最新 "last}' "$INDEX" 2>/dev/null || true)"
  else
    echo "无缓存（$INDEX）——先跑 index"
  fi
}

CMD="${1:-help}"
case "$CMD" in
  index) shift
    PAGES=5
    while [ "$#" -ge 1 ]; do
      case "$1" in
        --pages) PAGES="${2:?index --pages 需数字}"; shift 2 ;;
        *) shift ;;
      esac
    done
    _do_index "$PAGES" ;;
  query) shift; [ "$#" -ge 1 ] || { echo "用法: mainline-lookup.sh query <mid> [...]" >&2; exit 1; }; _do_query "$@" ;;
  check) _do_check ;;
  help|-h|--help) sed -n '2,20p' "$0" ;;
  *) echo "未知命令: $CMD" >&2; sed -n '2,20p' "$0"; exit 1 ;;
esac
