#!/bin/bash
# 新增一篇文章：复制 HTML → 更新 posts.json → 重建站点 → 部署
# 用法: bash add-post.sh --date "2026-08-08" --title "标题" --slug "slug" --desc "摘要" --tags "标签A,标签B" --html /path/to/article.html
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$DIR")"
DATE=""; TITLE=""; SLUG=""; DESC=""; TAGS=""; HTML=""

while [[ $# -gt 0 ]]; do
  case "$1" in --date) DATE="$2"; shift 2;; --title) TITLE="$2"; shift 2;;
    --slug) SLUG="$2"; shift 2;; --desc) DESC="$2"; shift 2;;
    --tags) TAGS="$2"; shift 2;; --html) HTML="$2"; shift 2;; *) shift;;
  esac
done
[ -z "$DATE" ] && echo "需要 --date (YYYY-MM-DD)" && exit 1
[ -z "$SLUG" ] && echo "需要 --slug" && exit 1
[ -z "$HTML" ] && echo "需要 --html" && exit 1

# 1) 复制 HTML 到 site/posts/
cp "$HTML" "$ROOT/site/posts/${SLUG}.html"
echo "✓ 文章已复制: site/posts/${SLUG}.html"

# 2) 追加 posts.json（argv 传参，避免引号注入）
python3 - "$ROOT" "$DATE" "$SLUG" "$TITLE" "$DESC" "$TAGS" << 'PYEOF'
import json, sys
root, date, slug, title, desc, tags = sys.argv[1:7]
entry = {"date": date, "slug": slug, "title": title, "desc": desc,
         "tags": [t.strip() for t in tags.split(',') if t.strip()]}
f = root + "/data/posts.json"
d = json.load(open(f, encoding="utf-8"))
d.insert(0, entry)
json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("✓ posts.json 已更新")
PYEOF

# 3) 重建站点
node "$DIR/build.js"
echo "✓ 博客构建完成"

# 4) 部署
bash "$DIR/deploy.sh"
