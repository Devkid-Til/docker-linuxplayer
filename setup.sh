#!/usr/bin/env bash
# kernel-blog 环境一键配置（交互式）
# 用法: bash setup.sh
# 换环境时：git clone → bash setup.sh → 一路问答 → 环境就绪
set -euo pipefail

echo "=============================================="
echo "  Linux 内核玩家 · 博客 — 环境自动配置"
echo "=============================================="

# 前置检查
command -v node >/dev/null 2>&1 || { echo "✗ 需要 Node.js ≥ 20（https://nodejs.org）"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "✗ 需要 npm（随 Node.js 安装）"; exit 1; }

# 已有 .env 保护
if [ -f .env ]; then
  echo ""
  echo "⚠ 已存在 .env（可能含真实凭据）。重新配置会覆盖，继续？[y/N]"
  read -r yn
  case "$yn" in y|Y) ;; *) echo "已取消，保留现有 .env"; exit 0;; esac
fi

echo ""
echo "[1/5] 配置环境变量（直接回车用默认值；AccessKey Secret 输入时不回显）"
echo "----------------------------------------------"

ask() { # 变量名 提示 默认值
  local _v="$1" _p="$2" _d="$3" _val
  if [ "$_v" = "OSS_AK_SECRET" ]; then
    read -rsp "$_p: " _val; echo ""
  elif [ -n "$_d" ]; then
    read -rp "$_p [$_d]: " _val; _val="${_val:-$_d}"
  else
    read -rp "$_p: " _val
  fi
  eval "$_v=\"$_val\""
}

ask OSS_AK_ID         "OSS AccessKey ID"         ""
ask OSS_AK_SECRET     "OSS AccessKey Secret"     ""
ask OSS_BUCKET        "OSS Bucket"               "kernelplayer"
ask OSS_REGION        "OSS Region"               "oss-cn-beijing"

# 写入 .env
cat > .env <<EOF
# 阿里云 OSS（封面/插图上传，RAM 子用户 AK；注意：OSS 键不带 PUBLIC_ 前缀，纯 Node 脚本用，
# 避免误入 Astro 客户端暴露命名空间）
OSS_AK_ID=$OSS_AK_ID
OSS_AK_SECRET=$OSS_AK_SECRET
OSS_BUCKET=$OSS_BUCKET
OSS_REGION=$OSS_REGION
EOF
echo "✓ .env 已写入"

echo ""
echo "[2/5] 安装 npm 依赖..."
npm install --no-fund --no-audit

echo ""
echo "[3/5] 安装 AI skills 到 ~/.claude/skills/（软链，不复制）..."
# 软链而非复制：本仓库是这两个 skill 的唯一真源，改仓库即刻生效，避免副本漂移
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
mkdir -p ~/.claude/skills
shopt -s nullglob
_installed=0
for src in "$REPO_ROOT"/skills/*/; do
  src="${src%/}"
  name="$(basename "$src")"
  dest="$HOME/.claude/skills/$name"
  if [ -L "$dest" ]; then
    rm -f "$dest"                       # 已有软链：直接重建
  elif [ -e "$dest" ]; then
    bak="$dest.bak-$(date +%Y%m%d%H%M%S)"
    mv "$dest" "$bak"                   # 实体目录（旧版 cp 装的或本地改过）：先备份，不静默删
    echo "   ⚠ $dest 是实体目录，已备份为 $bak —— 确认无误后自行删除"
  fi
  ln -s "$src" "$dest"
  echo "   ✓ $name -> $src"
  _installed=$((_installed + 1))
done
shopt -u nullglob
[ "$_installed" -gt 0 ] || { echo "✗ $REPO_ROOT/skills/ 下没有 skill"; exit 1; }
echo "✓ skills 已安装（$_installed 个，软链到仓库，改仓库即生效）"

echo ""
echo "[4/5] 安装部署 hook（git commit 自动部署到服务器）？[y/N]"
read -r yn
case "$yn" in
  y|Y) bash scripts/install-hook.sh ;;
  *)   echo "  跳过（可稍后执行: bash scripts/install-hook.sh）" ;;
esac

echo ""
echo "[5/5] 验证构建..."
npm run build

echo ""
echo "=============================================="
echo "  ✓ 环境就绪！"
echo "  本地预览:  npm run dev"
echo "  构建发布:  npm run build && git push"
echo "  公众号:    npm run wechat <日期> --out"
echo "  OSS 上传:  npm run oss <文件> <OSS路径>"
echo "  跑日报:    提示词里用 kernel-patch-radar skill"
echo "=============================================="
