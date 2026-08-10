#!/usr/bin/env bash
# probe-net.sh — lore.kernel.org 连通性分层探针
# 目的：定位「板块活跃度抓不到数据」到底是【网络连不上】还是【时间/吞吐不够】。
# 分层：
#   L1 DNS+TCP 443        —— 网络层：域名解析 + 端口可达？
#   L2 TLS 握手（curl）    —— 传输层：HTTPS 能完成握手、拿到 HTTP 响应？
#   L3 git 智能协议 ls-remote —— 应用层：git upload-pack 探测能通？
#   L4 真实 shallow fetch  —— 吞吐层：小深度 fetch 耗时？(秒级=网络OK只是1200深度慢；超时=连接挂起)
# 每层单独 timeout，任何一层失败都继续测下一层（不中断）。

set -uo pipefail

ms() { echo "$(( ($(date +%s%N) - $1) / 1000000 ))ms"; }

probe() {
  local LIST="$1" t0
  echo "═════════ $LIST ═════════"

  # L1 TCP 443
  t0=$(date +%s%N)
  if timeout 6 bash -c "exec 3<>/dev/tcp/lore.kernel.org/443" 2>/dev/null; then
    echo "  L1 TCP443     : OK   ($(ms "$t0"))"
  else
    echo "  L1 TCP443     : FAIL"
  fi

  # L2 TLS 握手 + HTTP 状态（Anubis 会挡正文，但状态码能证明 TLS 通）
  t0=$(date +%s%N)
  code="$(timeout 12 curl -s -o /dev/null -w '%{http_code}' --max-time 10 -A 'Mozilla/5.0' https://lore.kernel.org/$LIST/ 2>/dev/null)"
  if [ -n "$code" ]; then
    echo "  L2 TLS/HTTP   : OK   (HTTP $code, $(ms "$t0"))"
  else
    echo "  L2 TLS/HTTP   : FAIL"
  fi

  # L3 git 智能协议 ls-remote
  t0=$(date +%s%N)
  if timeout 15 git ls-remote "https://lore.kernel.org/$LIST/0/" refs/heads/master >/dev/null 2>&1; then
    echo "  L3 git ls-remote: OK   ($(ms "$t0"))"
  else
    echo "  L3 git ls-remote: FAIL ($(ms "$t0"))"
  fi

  # L4 真实 shallow fetch（depth=30，小量）——吞吐层
  local TMP
  TMP="$(mktemp -d)"
  (
    cd "$TMP" || return 1
    git init -q .
    t0=$(date +%s%N)
    if timeout 25 git fetch -q --depth=30 "https://lore.kernel.org/$LIST/0/" master 2>/dev/null; then
      local n
      n="$(git log FETCH_HEAD --format='%H' 2>/dev/null | wc -l)"
      echo "  L4 fetch(d30) : OK   ($(ms "$t0"), 拉取 $n 条)"
    else
      echo "  L4 fetch(d30) : FAIL ($(ms "$t0"), 25s 内未完成)"
    fi
  )
  rm -rf "$TMP"
  echo ""
}

for L in linux-media lkml netdev virtio-dev; do
  probe "$L"
done
echo "诊断完成"
