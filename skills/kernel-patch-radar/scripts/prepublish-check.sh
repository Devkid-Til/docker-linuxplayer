#!/usr/bin/env bash
# prepublish-check.sh — 发布前硬门（时钟 + 链接 + 时间戳）
#
# 用法：
#   bash scripts/prepublish-check.sh <文章.md> <radar 输出文件> [--skip-clock]
#                                   [--allow-unverified <原因>]
#
# 退出码（三态契约，见 ag-org/AGENTS.md 第七节）：
#   0 = 三项全部通过
#   1 = 已校验，至少一项失败（看逐项输出）
#   2 = 至少一项无法校验（源缺失/网络不可达）——同样**不得放行**
#
# 为什么要有这道门（2026-10-19 提案）：
#   - 时钟：签名上传（阿里云 OSS / 华为 OBS）容忍 15 分钟偏差，超限即 RequestTimeTooSkewed；
#     本机 chrony 的 enable 会在重启后消失，必须在**上传之前**拦，而不是上传之后报错。
#   - 链接/时间戳：2026-10-09 的教训是「错稿先发给董事长、后自查」，把校验成本转嫁给了审阅人。
#   三项都在成文后、上传/commit 之前跑，任何一项非 0 都停下来。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AG_ORG_BIN="${AG_ORG_BIN:-/ws/dev/ag-org/bin}"

TAG="prepublish"
SKIP_CLOCK=0
ALLOW_ARGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-clock) SKIP_CLOCK=1; shift ;;
    --allow-unverified)
      ALLOW_ARGS=(--allow-unverified "${2:-}")
      [ -n "${2:-}" ] || { echo "[$TAG] ⚠ 无法校验：--allow-unverified 必须附原因"; exit 2; }
      shift 2 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    -*) echo "[$TAG] ⚠ 无法校验：未知参数 $1"; exit 2 ;;
    *)
      if [ -z "${POST:-}" ]; then POST="$1"; elif [ -z "${RADAR:-}" ]; then RADAR="$1"; else
        echo "[$TAG] ⚠ 无法校验：多余的参数 $1"; exit 2; fi
      shift ;;
  esac
done

if [ -z "${POST:-}" ] || [ -z "${RADAR:-}" ]; then
  echo "[$TAG] ⚠ 无法校验：用法错误 —— 需要 <文章.md> <radar 输出文件>"
  exit 2
fi

worst=0
failed=()
unverified=()

record() { # record <name> <code>
  case "$2" in
    0) ;;
    2) unverified+=("$1"); [ "$worst" -lt 2 ] && worst=2 ;;
    1) failed+=("$1"); [ "$worst" -lt 1 ] && worst=1 ;;
    *) unverified+=("$1(异常退出码 $2)"); worst=2 ;;
  esac
}

if [ "$SKIP_CLOCK" -eq 0 ]; then
  echo "── [1/3] 时钟预检 ─────────────────────────────"
  if [ -x "$AG_ORG_BIN/check-clock.sh" ]; then
    bash "$AG_ORG_BIN/check-clock.sh" "${ALLOW_ARGS[@]}"; record "clock" $?
  else
    echo "[$TAG] ⚠ 无法校验：找不到 $AG_ORG_BIN/check-clock.sh"
    record "clock" 2
  fi
else
  echo "── [1/3] 时钟预检 ── 已按 --skip-clock 跳过（本条不涉及签名上传才可跳过）"
fi

echo "── [2/3] 链接反编造 ───────────────────────────"
node "$SCRIPT_DIR/check-links.mjs" "$POST" "$RADAR"; record "links" $?

echo "── [3/3] 时间戳换算 ───────────────────────────"
node "$SCRIPT_DIR/check-times.mjs" "$POST" "$RADAR"; record "times" $?

echo "───────────────────────────────────────────────"
if [ "$worst" -eq 0 ]; then
  echo "[$TAG] ✓ 全部通过，可以继续（上传 / commit / 请示）"
elif [ "$worst" -eq 1 ]; then
  echo "[$TAG] ✗ 校验失败：${failed[*]} —— 改稿后重跑，不得放行"
elif [ "${#failed[@]}" -gt 0 ]; then
  echo "[$TAG] ✗ 校验失败：${failed[*]}；⚠ 无法校验：${unverified[*]} —— 都不得放行"
else
  echo "[$TAG] ⚠ 无法校验：${unverified[*]} —— 补源后重跑；确需越过必须显式 --allow-unverified 并记录原因"
fi
exit "$worst"
