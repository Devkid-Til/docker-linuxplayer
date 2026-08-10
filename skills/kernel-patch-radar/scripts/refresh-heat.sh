#!/usr/bin/env bash
# refresh-heat.sh — 每日自动刷新首页「板块活跃度」热度条
#
# 链路：radar.sh stats（13 列表 T24 计数）→ 写 src/data/radar-stats.json → git commit
#       → kernel-blog 的 [deploy] commit hook 自动 build + 部署 → 首页排序/条长/数字随当日数据变化
#
# 防假 0 铁律：radar.sh stats 在网络失败时会写出全 0 JSON 且返回 0（每列表 ERR 计 0），
# 若直接提交，首页会显示假的「0 热度」。这里解析 JSON：全零视为抓取失败，跳过、不提交。
# 内容无变化同样跳过（避免空 commit / 无谓部署）。

set -uo pipefail

SKILL=/home/jiaqi/.claude/skills/kernel-patch-radar
BLOG=/ws/dev/kernel-blog
OUT="$BLOG/src/data/radar-stats.json"

tmp="$(mktemp)"
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT

# 0. 网络前置探测：lore 不可达时几秒内快速跳过
#    （stats 全 13 源串行重试，网络断时浪费 ~2-3 分钟才全 0；先探一发省掉。
#    3 连发、任一通过即继续——VM 网络间歇波动（如源码拉取占用）时提高成功率）
net_ok=0
for _ in 1 2 3; do
  if timeout 8 git ls-remote https://lore.kernel.org/lkml/0/ refs/heads/master >/dev/null 2>&1; then net_ok=1; break; fi
done
if [ "$net_ok" -eq 0 ]; then
  echo "refresh-heat: lore 网络不可达（3 连发均失败），跳过本次刷新"
  exit 0
fi

# 1. 抓取当日各板块近 24h 计数（网络失败 → radar.sh 会全 0，靠第 2 步拦截）
if ! bash "$SKILL/scripts/radar.sh" stats "$tmp" >/tmp/refresh-heat.log 2>&1; then
  echo "refresh-heat: stats 命令失败（见 /tmp/refresh-heat.log），跳过本次刷新"
  exit 0
fi

# 2. 防假 0：全零 JSON = 网络未恢复/全列表抓取失败，视作无数据，跳过
if ! python3 - "$tmp" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
vals = list(d.get('lists', {}).values())
sys.exit(0 if any(v and v > 0 for v in vals) else 1)
PY
then
  echo "refresh-heat: 热度数据全 0（lore 网络未恢复？），跳过本次刷新"
  exit 0
fi

# 3. 内容无变化则跳过（不产生空提交）
if [ -f "$OUT" ] && cmp -s "$tmp" "$OUT"; then
  echo "refresh-heat: 热度数据与上次相同，跳过"
  exit 0
fi

# 4. 提交 → commit hook 自动 build + 部署（第 3 步已保证内容有变化，add 后必有 staged 变更）
# 4.5 历史落盘：当天数据 upsert 进 radar-history.json（周报「本周热度之和」用；同日重复刷新只覆盖当天）
#     —— 在 mv 之前读 $tmp（mv 后文件已被移走）
HIST="$BLOG/src/data/radar-history.json"
if python3 - "$tmp" "$HIST" <<'PY'
import json, sys, os
d = json.load(open(sys.argv[1]))
hist_path = sys.argv[2]
hist = json.load(open(hist_path)) if os.path.exists(hist_path) else {"records": {}}
date = d.get("date")
if date:
    hist.setdefault("records", {})[date] = {"window": "24h", "lists": d.get("lists", {})}
tp = hist_path + ".tmp"
with open(tp, "w") as f:
    json.dump(hist, f, ensure_ascii=False, indent=2)
os.replace(tp, hist_path)
PY
then
  echo "refresh-heat: history 已落盘 ${HIST##*/}"
else
  echo "refresh-heat: history 落盘失败（单日数据仍更新）"
fi

mv "$tmp" "$OUT"
cd "$BLOG" || { echo "refresh-heat: 无法进入 $BLOG"; exit 1; }
git add src/data/radar-stats.json src/data/radar-history.json
git commit -q -m "chore(data): 板块活跃度刷新（$(date '+%F %H:%M')）" \
  || { echo "refresh-heat: commit 失败"; exit 1; }
echo "refresh-heat: 已刷新 src/data/radar-stats.json 并触发部署"
