#!/usr/bin/env bash
# backup-analytics.sh — 把 GoatCounter 的 SQLite 统计库拉到本地留档
#
# 为什么不在服务器上留：服务器丢了，备份也就没了。必须拉到本地才算备份。
# 用 SQLite 的 online backup API 取一致快照（服务在跑、WAL 里有未 checkpoint 的数据也能拿到）。
#
# 用法：bash scripts/backup-analytics.sh [--quiet]
set -uo pipefail

HOST="${BLOG_HOST:-admin@118.31.67.240}"
DEST="${ANALYTICS_BACKUP_DIR:-$HOME/.local/share/kernel-blog/analytics}"
KEEP="${ANALYTICS_BACKUP_KEEP:-30}"
QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1

mkdir -p "$DEST"
STAMP=$(date +%F)
TARGET="$DEST/goatcounter-$STAMP.sqlite3"

# 1) 服务器上做一致快照
ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" 'bash -s' <<'REMOTE' || { echo "❌ 远端快照失败" >&2; exit 1; }
python3 - <<'PY'
import sqlite3, os
src = '/home/admin/goatcounter/data/goatcounter.sqlite3'
dst = '/tmp/gc-backup.sqlite3'
if os.path.exists(dst): os.remove(dst)
s = sqlite3.connect(src)
d = sqlite3.connect(dst)
s.backup(d)
d.close(); s.close()
print(f"snapshot={os.path.getsize(dst)}")
PY
REMOTE

# 2) 拉回本地
scp -q -o BatchMode=yes "$HOST:/tmp/gc-backup.sqlite3" "$TARGET" || { echo "❌ 拉取失败" >&2; exit 1; }

# 3) 校验：能从备份里读出 hits 表
COUNT=$(python3 -c "
import sqlite3,sys
try:
    c=sqlite3.connect('$TARGET'); print(c.execute('select count(*) from hit_counts').fetchone()[0])
except Exception as e:
    print('ERR',e); sys.exit(1)
") || { echo "❌ 备份校验失败" >&2; exit 1; }

# 4) 只留最近 KEEP 份
ls -1t "$DEST"/goatcounter-*.sqlite3 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm --

[ "$QUIET" = "1" ] || echo "✅ 统计库已备份：$TARGET（hit_counts=$COUNT，保留最近 $KEEP 份）"
