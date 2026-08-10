#!/usr/bin/env bash
# mirror-lookup.sh — 内核补丁状态反查（本地三镜像：mainline 命运追踪 / next 队列状态 / stable 修复盘点）
#
# 架构：mid → sha 全历史索引（tsv），query 走索引毫秒级 + `git name-rev` 版本定位。
#   - 建索引：三仓库各一次 `git log --all --grep` 全扫描（每次 ~30s，一次性 ~2min），
#     之后 query 是纯 grep（毫秒级），不再有"未命中要全扫描 25-36s"的问题。
#   - 版本定位用 `git name-rev`（实测 0.05-0.24s，比 tag --contains 的 ~28s 快两个量级）。
#   - stable 语义：stable 仓库 master = mainline 快照，commit 存在 ≠ 已回移植；
#     回移植提交（cherry-pick）message 保留 lore mid 且位于 stable 分支 → name-rev 给出 tags/vX.Y.Z。
#     因此 stable 反查遍历该 mid 的所有命中提交，只要有一个落到 stable 版本标签即算回移植。
#   相对旧 mainline-lookup.sh（GitHub API 索引缓存，仅近几周）：本地全历史、无 API 限流。
#
# 用法:
#   bash mirror-lookup.sh index           建/重建三仓库 mid 索引（一次性，镜像更新后需重建）
#   bash mirror-lookup.sh query <mid>...  反查 mid 在 mainline/next/stable 的状态
#   bash mirror-lookup.sh check           索引状态 + 三镜像 HEAD

set -uo pipefail

MAINLINE="${KERNEL_MAINLINE:-/ws/dev/kernel-mirrors/linux}"
NEXT="${KERNEL_NEXT:-/ws/dev/kernel-mirrors/linux-next}"
STABLE="${KERNEL_STABLE:-/ws/dev/kernel-mirrors/linux-stable}"
CACHE_DIR="${KERNEL_RADAR_CACHE:-$HOME/.cache/kernel-radar}"

# 三仓库：路径 + 索引文件
declare -A REPO_PATH=( [mainline]="$MAINLINE" [next]="$NEXT" [stable]="$STABLE" )
declare -A REPO_IDX=(   [mainline]="$CACHE_DIR/mirror-linux.tsv"
                        [next]="$CACHE_DIR/mirror-linux-next.tsv"
                        [stable]="$CACHE_DIR/mirror-linux-stable.tsv" )
# stable 回移植的第二种通道：部分回移植提交 message 只带 `[ Upstream commit <mainline-sha> ]`、不带 lore mid，
# 单独建 upstream→backport 映射索引，query 时用 mainline 原始 sha 反查，补上 mid 通道的漏报。
UPSTREAM_IDX="$CACHE_DIR/mirror-stable-upstream.tsv"

# lore mid 正则（复用 mainline-lookup.sh）：从 commit message 的 Link: trailer 提取
MID_PAT='https://(?:lore\.kernel\.org/r/|patch\.msgid\.link/)([0-9]{12,16}\.[0-9]+-[0-9A-Za-z_.+-]+@[0-9A-Za-z_.-]+)'

_build_index() {
  local repo="$1" out="$2" tmp
  mkdir -p "$(dirname "$out")"
  tmp="$out.tmp.$$"
  echo "建索引: $repo → $out"
  # 全历史扫一遍，提取 mid|sha|ISOdate|subject（不按 mid 去重——stable 同 mid 可能多条：master 原始 + 各分支回移植）
  # --grep 用 OR（\| 是 POSIX basic regex）：lore 与 patch.msgid.link 两种引用都收（实测 msgid 格式有 5.6 万+ 提交）
  # 注意：%B（完整 message）含多行换行，会把 git log 输出拆行——用 %x1e 记录分隔符标记每条记录起点，
  #        python 按 %x1e 切块、遇到下一条记录前累积 %B 的多行。不能用 heredoc（会覆盖管道 stdin）。
  git -C "$repo" log --all --grep='lore\.kernel\.org/r/\|patch\.msgid\.link/' --format='%x1e%H%x1f%cI%x1f%s%x1f%B' 2>/dev/null | \
    python3 -c "import sys,re
pat=re.compile(r'''$MID_PAT''')
cur=None
def proc(rec):
    parts=rec.split('\x1f',3)
    if len(parts)<4: return
    sha,date,sub,msg=parts
    for m in pat.finditer(msg):
        print(m.group(1)+'\t'+sha+'\t'+date+'\t'+sub.replace('\t',' '))
for line in sys.stdin:
    if line.startswith('\x1e'):
        if cur: proc(cur)
        cur=line[1:].rstrip('\n')
    elif cur is not None:
        cur+='\n'+line.rstrip('\n')
if cur: proc(cur)
" | sort -u > "$tmp" && mv "$tmp" "$out"
  echo "  完成: $(wc -l < "$out") 条"
}

# name-rev 定位：输入 sha → 输出 ref 名（如 tags/v6.5-rc1~3 / master~1^2）
_name_rev() {
  local repo="$1" sha="$2"
  git -C "$repo" name-rev "$sha" 2>/dev/null | sed "s/^$sha //"
}

# stable 回移植映射索引：提取回移植提交 message 里的 `[ Upstream commit <mainline-sha> ]` 标记，
# 建 upstream_sha → backport_sha|date|subject 映射，供 query 用 mainline 原始 sha 反查回移植
# （部分回移植提交只带 Upstream commit、不带 lore mid，mid 通道会漏——此为第二通道）。
_build_upstream_index() {
  local repo="$STABLE" out="$UPSTREAM_IDX" tmp
  mkdir -p "$(dirname "$out")"
  tmp="$out.tmp.$$"
  echo "建回移植索引: $repo → $out"
  git -C "$repo" log --all --grep='Upstream commit' --format='%x1e%H%x1f%cI%x1f%s%x1f%B' 2>/dev/null | \
    python3 -c "import sys,re
up=re.compile(r'Upstream commit ([0-9a-f]{40})')
cur=None
def proc(rec):
    parts=rec.split('\x1f',3)
    if len(parts)<4: return
    sha,date,sub,msg=parts
    for m in up.finditer(msg):
        print(m.group(1)+'\t'+sha+'\t'+date+'\t'+sub.replace('\t',' '))
for line in sys.stdin:
    if line.startswith('\x1e'):
        if cur: proc(cur)
        cur=line[1:].rstrip('\n')
    elif cur is not None:
        cur+='\n'+line.rstrip('\n')
if cur: proc(cur)
" | sort -u > "$tmp" && mv "$tmp" "$out"
  echo "  完成: $(wc -l < "$out") 条"
}

# 索引命中：优先完整 mid 精确匹配（grep -F，同一补丁系列的 -1/-2/-3 前缀相同但不混淆）；
# 退回核心段前缀（时间戳.序号），兼容部分 mid 细微差异。
_idx_hit() {
  local idx="$1" mid="$2"
  local h
  h="$(grep -F "$mid" "$idx" | head -1)"
  if [ -n "$h" ]; then printf '%s' "$h"; return; fi
  local key; key="$(printf '%s' "$mid" | grep -oP '^[0-9]{12,16}\.[0-9]+' || true)"
  [ -n "$key" ] || return 0
  grep -F "$key" "$idx" | head -1
}

_query_one() {
  local mid="$1"
  echo "▌ $mid"
  # mainline：命运追踪
  local idx="${REPO_IDX[mainline]}"
  if [ -f "$idx" ]; then
    local m_hit="$(_idx_hit "$idx" "$mid")"
    if [ -n "$m_hit" ]; then
      local m_sha m_nr m_ver
      m_sha="$(printf '%s' "$m_hit" | cut -f2)"
      m_nr="$(_name_rev "$MAINLINE" "$m_sha")"
      m_ver="$(printf '%s' "$m_nr" | grep -oP 'tags/\K[^~^]+' | head -1)"
      if [ -n "$m_ver" ]; then
        echo "  ✅ mainline: 已合入 · 位于 $m_ver 附近"
      elif printf '%s' "$m_nr" | grep -q '^master'; then
        echo "  ✅ mainline: 已合入主线（最新提交，尚未打版本标签）"
      else
        echo "  ✅ mainline: 已合入"
      fi
      echo "     $m_hit"
    else
      echo "  ⬜ mainline: 未合入"
    fi
  else
    echo "  ⬜ mainline: 索引未建（先跑 mirror-lookup.sh index）"
  fi
  # next：队列状态
  idx="${REPO_IDX[next]}"
  if [ -f "$idx" ]; then
    local n_hit="$(_idx_hit "$idx" "$mid")"
    if [ -n "$n_hit" ]; then
      local n_sha n_nr
      n_sha="$(printf '%s' "$n_hit" | cut -f2)"
      n_nr="$(_name_rev "$NEXT" "$n_sha")"
      echo "  🔜 next:     已在 linux-next 队列（$n_nr）"
      echo "     $n_hit"
    else
      echo "  ⬜ next:     不在 linux-next 队列"
    fi
  else
    echo "  ⬜ next:     索引未建（先跑 mirror-lookup.sh index）"
  fi
  # stable：修复盘点（遍历该 mid 所有命中提交，只有落到 stable 版本标签 vX.Y.Z 才算回移植）
  idx="${REPO_IDX[stable]}"
  if [ -f "$idx" ]; then
    local all_hits backports="" line s_sha s_nr s_key
    all_hits="$(grep -F "$mid" "$idx")"
    if [ -z "$all_hits" ]; then
      s_key="$(printf '%s' "$mid" | grep -oP '^[0-9]{12,16}\.[0-9]+' || true)"
      [ -n "$s_key" ] && all_hits="$(grep -F "$s_key" "$idx")"
    fi
    if [ -n "$all_hits" ]; then
      while IFS= read -r line; do
        [ -n "$line" ] || continue
        s_sha="$(printf '%s' "$line" | cut -f2)"
        s_nr="$(_name_rev "$STABLE" "$s_sha")"
        if printf '%s' "$s_nr" | grep -qE 'tags/v[0-9]+\.[0-9]+\.[0-9]+'; then
          backports="$backports [$(printf '%s' "$s_nr" | grep -oP 'tags/v[0-9]+\.[0-9]+\.[0-9]+' | head -1)]"
        fi
      done <<< "$all_hits"
    fi
    # 通道 2：mainline 原始 sha → stable 回移植标记（`[ Upstream commit <sha> ]`），补漏 mid 通道
    if [ -n "${m_sha:-}" ] && [ -f "$UPSTREAM_IDX" ]; then
      local up_hit u_sha u_nr
      up_hit="$(grep -F "$m_sha" "$UPSTREAM_IDX" | head -1)"
      if [ -n "$up_hit" ]; then
        u_sha="$(printf '%s' "$up_hit" | cut -f2)"
        u_nr="$(_name_rev "$STABLE" "$u_sha")"
        if printf '%s' "$u_nr" | grep -qE 'tags/v[0-9]+\.[0-9]+\.[0-9]+'; then
          backports="$backports [$(printf '%s' "$u_nr" | grep -oP 'tags/v[0-9]+\.[0-9]+\.[0-9]+' | head -1)]"
        fi
      fi
    fi
    if [ -n "$backports" ]; then
      echo "  🩹 stable:   已回移植 →$backports"
    else
      echo "  🩹 stable:   未回移植（尚在主线，未进入 stable 分支）"
    fi
  else
    echo "  🩹 stable:   索引未建（先跑 mirror-lookup.sh index）"
  fi
}

_do_check() {
  echo "索引状态:"
  for scope in mainline next stable; do
    local idx="${REPO_IDX[$scope]}"
    if [ -f "$idx" ]; then
      echo "  $scope: $(wc -l < "$idx") 条 · $(date -r "$idx" '+%m-%d %H:%M')"
    else
      echo "  $scope: 未建"
    fi
  done
  echo "三镜像 HEAD:"
  for spec in "$MAINLINE:mainline" "$NEXT:next" "$STABLE:stable"; do
    local repo label head
    repo="${spec%%:*}"; label="${spec##*:}"
    head="$(git -C "$repo" log --oneline -1 2>/dev/null || echo '（不可用）')"
    printf '  %-9s %s\n' "$label" "$head"
  done
}

CMD="${1:-help}"
case "$CMD" in
  index) _build_index "$MAINLINE" "${REPO_IDX[mainline]}"; _build_index "$NEXT" "${REPO_IDX[next]}"; _build_index "$STABLE" "${REPO_IDX[stable]}"; _build_upstream_index ;;
  query) shift; [ "$#" -ge 1 ] || { echo "用法: mirror-lookup.sh query <mid> [...]" >&2; exit 1; }
    for m in "$@"; do
      if ! printf '%s' "$m" | grep -qP '^[0-9]{12,16}\.[0-9]+'; then
        echo "ERROR: 非法 mid: '$m'（应以 时间戳.序号 开头，如 20260807.123456-1-xxx@domain）" >&2
        continue
      fi
      _query_one "$m"; echo
    done ;;
  check) _do_check ;;
  help|-h|--help) sed -n '2,16p' "$0" ;;
  *) echo "未知命令: $CMD" >&2; sed -n '2,16p' "$0"; exit 1 ;;
esac
