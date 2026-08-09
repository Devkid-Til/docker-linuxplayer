#!/bin/bash
# 安装 post-commit hook（使 commit 自动部署，且 hook 本体被 git 跟踪可复现）
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
mkdir -p "$ROOT/.git/hooks"
cp "$DIR/git-hooks/post-commit" "$ROOT/.git/hooks/post-commit"
chmod +x "$ROOT/.git/hooks/post-commit"
echo "✓ post-commit hook 已安装（来自 scripts/git-hooks/，随仓库可复现）"
