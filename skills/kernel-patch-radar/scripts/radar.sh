#!/usr/bin/env bash
# radar.sh — kernel-patch-radar 的抓取入口（单一脚本，隶属于该 skill）
#
# 用法:
#   bash radar.sh daily [N]         全内核雷达源一次抓齐：13 列表（11 板块源 + lkml 全内核广播 + linux-rt-devel RT 调度；默认各列表独立 SPEC，传 N 统一覆盖）
#   bash radar.sh fetch <list> [SPEC]  抓任一列表：默认最近 40 条；SPEC 支持 N<count> 按条数 / T<hours> 按小时窗口 / T<hours>:<max> 时间窗口+条数上限（如 T24:400）→ 每行 "ISO时间|标题|原文链接"
#   bash radar.sh lwn [N]           抓 LWN Kernel 标题 → 每行 "标题 — URL"
#   bash radar.sh shard <list>      探测某 lore 列表的分片数
#   bash radar.sh stats [OUT]       板块热度统计：全 13 列表统一「最近 24h」计数 → JSON（社区短名 key；给 OUT 写文件，否则 stdout）
#
# 为什么统一走 lore git：lore.kernel.org 的 HTTP 页面被 Anubis 反爬挡（curl 拿不到），
# 但 git 智能协议（/info/refs?service=git-upload-pack）开放且实时。每列表按分片存 git 仓库，
# 新邮件追加到最大分片 → 自动探测最新分片 + shallow fetch。全部 lore 列表都支持。
#
# 反 SIGPIPE 铁律（set -euo pipefail 下）：
#   - 截断输出用 sed -n（读完整个流，不早退）
#   - 提取首行用「整份捕获到变量 + ${var%%$'\n'*} 切片」，不经管道早退消费端
#   - 任何 `producer | head/grep -m1` 都可能在大输出时让 producer 收到 SIGPIPE → 141 全灭

set -euo pipefail

_do_fetch() {
  local LIST="$1" SPEC="${2:-N40}" TMP MAX=0 i miss=0 rc depth mode hours n max
  TMP="$(mktemp -d)"
  if [[ "$SPEC" == T* ]]; then
    mode=T; hours="${SPEC#T}"; max=""
    if [[ "$hours" == *:* ]]; then max="${hours#*:}"; hours="${hours%%:*}"; fi
    # 纯 T 窗口（如 T24，高活跃列表）：深度要够，1200 覆盖高峰；
    # 复合 T<hours>:<max>（如 T24:400，lkml 全内核广播源）：仍按「最近 hours 小时」时间语义，只是限取最新 max 条，
    # 深度按上限推算、别拉全量——lkml 24h 实测 1200+ 条，全量是噪音洪水，上限后 ≈2-3 分钟。
    depth=$(( max && max > 0 ? ( max > 350 ? max + 50 : 400 ) : 1200 ))
  else
    mode=N; n="${SPEC#N}"
    depth=$(( n > 350 ? n + 50 : 400 ))
  fi
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
    # fetch 加重试：连续 13 源探测量大，lore 偶发限流/抖动，失败退避重试 3 次
    # 不设 timeout（董事长指示：真实 24h 数量，慢也要跑完，跑完为止）——大 depth 在慢带宽下可能数分钟，
    # 截断会导致计数失真。安全性靠全局 http.lowSpeedLimit/lowSpeedTime（低速 10s 快速失败）+ TLS 失败快速返回兜底，
    # 不会无限挂起。若个别源确实彻底不可达，重试 3 次后走下方失败分支计 0。
    fetch_ok=0
    for try in 1 2 3; do
      if GIT_TERMINAL_PROMPT=0 git fetch -q --depth="$depth" "https://lore.kernel.org/$LIST/$MAX/" master 2>/dev/null; then
        fetch_ok=1; break
      fi
      sleep 3
    done
    if [ "$fetch_ok" -eq 0 ]; then
      echo "ERROR: git fetch 失败 ($LIST 分片 $MAX，重试 3 次仍失败)" >&2
      exit 1
    fi
    # T 模式：按提交时间过滤最近 hours 小时（日报时间语义统一为「昨天一整天」），带 max 则限取最新 max 条（sed 读完整个流再截，防 SIGPIPE）；
    # N 模式：截断最近 n 条（低频列表兜底，日报只作信号提示，长期趋势归盘点）。
    # 内部用 \x1f 做字段分隔（主题含 | 不误切）；Message-Id/In-Reply-To 用 awk 读完整个流（不早退，防 SIGPIPE）
    if [[ "$mode" == T ]]; then
      if [ -n "$max" ]; then
        lines="$(git log FETCH_HEAD --since="$hours hours ago" --format='%cI%x1f%s%x1f%H' | sed -n "1,${max}p")"
      else
        lines="$(git log FETCH_HEAD --since="$hours hours ago" --format='%cI%x1f%s%x1f%H')"
      fi
      if [ -z "$lines" ]; then
        echo "NOTE: $LIST 近 $hours 小时无新邮件（静默期，日报不开 section）" >&2
      fi
    else
      lines="$(git log FETCH_HEAD --format='%cI%x1f%s%x1f%H' | sed -n "1,${n}p")"
    fi
    # 输出 5 字段：ts|sub|url|mid|parent —— 第 4/5 字段支撑跨列表去重（按 Message-Id）与系列识别（按 In-Reply-To，
    # 空 parent = 新话题/系列首封）。一次 git show 用 awk 提取两个头（无头折叠；mid 缺失用 hash 兜底防去重误伤）。
    while IFS=$'\x1f' read -r ts sub hash; do
      [ -n "$ts" ] || continue
      pair="$(git show "$hash:m" 2>/dev/null | awk '/^[Mm]essage-[Ii][Dd]:/{m=substr($0,index($0,":")+1);sub(/^[ \t]+/,"",m);sub(/[ \t\r]+$/,"",m)} /^[Ii]n-[Rr]epl[y]-[Tt]o:/{p=substr($0,index($0,":")+1);sub(/^[ \t]+/,"",p);sub(/[ \t\r]+$/,"",p)} END{print m "|" p}')" || true
      mid="${pair%%|*}"; parent="${pair#*|}"
      [ -n "$mid" ] || mid="<none-$hash>"
      printf '%s|%s|https://lore.kernel.org/%s/%s/|%s|%s\n' "$ts" "$sub" "$LIST" "$mid" "$mid" "$parent"
    done <<< "$lines"
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
  local SPEC="${1:-}" ok=0 list spec
  # 全内核雷达：双策略——12 个持续更新列表按「最近 24h」时间窗口（统一日报时间语义 = 昨天一整天）；
  # virtio-dev（实测极低频 0.12 条/天）按「最近 20 条」兜底，日报只作信号提示、不展开，长期趋势归月/季/年报盘点。
  # lkml = linux-kernel 的 lore 镜像（别名 lkml，非 linux-kernel），全内核广播源：主线程 sched / driver core / 通用内核动态都抄送这里。
  #   T24:400 = 仍是「最近 24h」语义，但限取最新 400 条——lkml 24h 实测 1200+ 条，全量是噪音洪水；400 为软上限，
  #   若当日重要 series 超限导致漏报，可临时 `daily T48` 或 `fetch lkml T24:800` 提额（董事长已批准、保留意见持续跟踪）。
  # linux-rt-devel = RT 实时调度开发列表（lore 镜像名如此），RT/deadline/RT-mutex 补丁主阵地。
  # 注：linux-sched 无专属 lore 镜像，主线程 sched 靠 lkml，RT 侧靠 linux-rt-devel，其余靠各板块跨域补丁捕获。
  # 传 `daily <SPEC>` 可统一覆盖：`daily T48` 全列表 48h 窗口 / `daily 30` 全列表 30 条（应急）。
  # 逐源隔离：任一源失败只报该源，不影响其他源；全挂才返回非零（cron 可区分）。
  # 跨列表去重：同一 patch 常抄送多列表（板块列表 + lkml 广播源）。按 Message-Id（第 4 字段）全局去重，
  # 板块专属列表先输出先占位、lkml（广播源）放最后——重复副本只保留板块专属版本，lkml 只补无专属列表的板块。
  local -A SET=(
    [linux-media]=T24
    [dri-devel]=T24
    [linux-mm]=T24
    [linux-pci]=T24
    [netdev]=T24
    [linux-fsdevel]=T24
    [virtio-dev]=N20
    [rust-for-linux]=T24
    [linux-security-module]=T24
    [linux-block]=T24
    [linux-arch]=T24
    [linux-rt-devel]=T24
    [lkml]=T24:400
  )
  local -A SEEN=()
  for list in linux-media dri-devel linux-mm linux-pci netdev linux-fsdevel virtio-dev rust-for-linux linux-security-module linux-block linux-arch linux-rt-devel lkml; do
    spec="${SET[$list]}"; [ -n "$SPEC" ] && spec="$SPEC"
    [ "$ok" -gt 0 ] && echo ""
    echo "## $list"
    if out="$(_do_fetch "$list" "$spec")"; then
      ok=$((ok+1))
      while IFS= read -r line; do
        parent="${line##*|}"; tmp="${line%|*}"; mid="${tmp##*|}"
        if [ -n "${SEEN[$mid]:-}" ]; then
          echo "NOTE: $list 去重跳过（Message-Id 已见于其他列表）: $mid" >&2
          continue
        fi
        SEEN[$mid]=1
        echo "$line"
      done <<< "$out"
    else
      echo "## $list：抓取失败（见上方 ERROR）" >&2
    fi
  done
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

_do_stats() {
  # 板块热度统计：全 13 列表统一「最近 24h」计数（窗口统一才能横向比热度）。
  # 输出 JSON（社区短名为 key）→ 首页雷达仪表盘「板块活跃度」热度条读入；失败列表记 0 并在 stderr 报错（如实，不编造）。
  # 用法: radar.sh stats [OUT_FILE]   给 OUT 写文件（如 <kernel-blog>/src/data/radar-stats.json），否则 stdout
  local OUT="${1:-}" today count first=1 ok=0 list
  local -a LISTS=(linux-media dri-devel linux-mm linux-pci netdev linux-fsdevel virtio-dev rust-for-linux linux-security-module linux-block linux-arch linux-rt-devel lkml)
  local -A SHORT=(
    [linux-media]=media [dri-devel]=DRM [linux-mm]=mm [linux-pci]=PCI
    [netdev]=net [linux-fsdevel]=fs [virtio-dev]=virtio [rust-for-linux]=Rust
    [linux-security-module]=LSM [linux-block]=block [linux-arch]=arch
    [linux-rt-devel]=rt [lkml]=lkml
  )
  local -A COUNTS=()
  today="$(date +%F)"
  # 并行抓取：每源子 shell 独立 fetch 写临时文件，父 shell wait 汇总。
  # 原因：lore fetch 慢（秒级~分钟级，带宽被源码拉取等占用时更慢），串行 13 源总时间=各源之和，
  #       实测曾 9 分钟未跑完被超时掐死；并行后总时间 ≈ 最慢单源，显著缩短。
  # 深度用 T24:400 而非 T24：T24 的 depth=1200 传输量大，实测 netdev 最新分片 >120s 超时；
  #       T24:400 的 depth≈400-450（传输量 1/3），实测 66s 成功。对 24h<400 的列表计数准确，
  #       lkml（24h 1200+）封顶在 400 内但保持榜首——榜单相对热度保留，绝对值如实偏低。
  local PDIR; PDIR="$(mktemp -d)"
  local -a PIDS=()
  for list in "${LISTS[@]}"; do
    (
      if out="$(_do_fetch "$list" T24)"; then
        # 行数 = 近 24h 消息量；awk END{print NR} 读完整个流（防 SIGPIPE），空流 → 0
        printf '%s' "$out" | awk 'END{print NR}' > "$PDIR/$list.count"
      else
        echo "ERROR: stats $list 抓取失败，计 0" >&2
        printf '0' > "$PDIR/$list.count"
      fi
    ) &
    PIDS+=("$!")
  done
  for p in "${PIDS[@]}"; do wait "$p" || true; done
  ok=0
  for list in "${LISTS[@]}"; do
    count="$(cat "$PDIR/$list.count" 2>/dev/null || echo 0)"
    COUNTS[$list]="$count"
    [ "$count" -gt 0 ] && ok=$((ok+1))
  done
  rm -rf "$PDIR"
  # JSON 手拼：列表名固定、count 为整数，无转义风险（不用 heredoc，走 printf 防管道 stdin 覆盖）
  if [ -n "$OUT" ]; then
    {
      printf '{\n  "date": "%s",\n  "window": "24h",\n  "lists": {\n' "$today"
      for list in "${LISTS[@]}"; do
        [ "$first" -eq 0 ] && printf ',\n'
        printf '    "%s": %s' "${SHORT[$list]}" "${COUNTS[$list]}"
        first=0
      done
      printf '\n  }\n}\n'
    } > "$OUT"
    echo "stats: 已写入 $OUT（date=$today · 全 $ok/13 列表 T24 计数）"
  else
    {
      printf '{\n  "date": "%s",\n  "window": "24h",\n  "lists": {\n' "$today"
      for list in "${LISTS[@]}"; do
        [ "$first" -eq 0 ] && printf ',\n'
        printf '    "%s": %s' "${SHORT[$list]}" "${COUNTS[$list]}"
        first=0
      done
      printf '\n  }\n}\n'
    }
  fi
}

CMD="${1:-help}"
case "$CMD" in
  daily) shift; _do_daily "${1:-}" ;;
  fetch) shift; _do_fetch "${1:?用法: radar.sh fetch <list> [N|T<hours>[:<max>]]}" "${2:-N40}" ;;
  lwn)   shift; _do_lwn "${1:-10}" ;;
  shard) shift; _do_shard "${1:?用法: radar.sh shard <list>}" ;;
  stats) shift; _do_stats "${1:-}" ;;
  help|-h|--help) sed -n '2,13p' "$0" ;;
  *) echo "未知命令: $CMD" >&2; sed -n '2,13p' "$0"; exit 1 ;;
esac
