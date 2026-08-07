#!/bin/bash
# 新增一篇文章：复制 HTML → 更新 posts.json → 重建站点
# 用法: bash add-post.sh --date "08-07" --title "标题" --slug "slug" --desc "摘要" --tags "标签A,标签B" --html /path/to/article.html
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
[ -z "$DATE" ] && echo "需要 --date" && exit 1
[ -z "$SLUG" ] && echo "需要 --slug" && exit 1
[ -z "$HTML" ] && echo "需要 --html" && exit 1

# 1) 复制 HTML 到 site/posts/
cp "$HTML" "$ROOT/site/posts/${SLUG}.html"
echo "✓ 文章已复制: site/posts/${SLUG}.html"

# 2) 追加 posts.json
TAGS_JSON=$(echo "$TAGS" | python3 -c "import sys,json; print(json.dumps([t.strip() for t in sys.stdin.read().split(',')]))")
ENTRY=$(printf '{"date":"%s","slug":"%s","title":"%s","desc":"%s","tags":%s}' "$DATE" "$SLUG" "$TITLE" "$DESC" "$TAGS_JSON")
python3 -c "
import json
d=json.load(open('$ROOT/data/posts.json'))
d.insert(0,json.loads('$ENTRY'))
json.dump(d,open('$ROOT/data/posts.json','w'),ensure_ascii=False,indent=2)
open('$ROOT/data/posts.json','a').write('\n')
"
echo "✓ posts.json 已更新"

# 3) 重建站点
node "$DIR/build.js"
echo "✓ 博客构建完成"
bash "$DIR/deploy.sh"
