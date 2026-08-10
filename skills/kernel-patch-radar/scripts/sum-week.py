#!/usr/bin/env python3
# sum-week.py — 周报「本周热度之和」：读 radar-history.json，求本周（周一~今天）各板块 24h 计数之和
#
# 数据来源：refresh-heat.sh 每日把当天 24h 计数 upsert 进 radar-history.json（按日期累积）
# 用法: python3 sum-week.py [history.json] [out.json]
#   省略 history → /ws/dev/kernel-blog/src/data/radar-history.json
#   给 out.json → 写周和 JSON（与 radar-stats.json 同结构，可直接喂 draw-heat.py）
#   不给 out → stdout
# 输出: {"date": "<今天>", "window": "week", "lists": {<短名>: <本周和>}}
import json, sys, os
from datetime import date, timedelta

DEFAULT_HIST = "/ws/dev/kernel-blog/src/data/radar-history.json"

def monday_of(d):
    return d - timedelta(days=d.weekday())

def main():
    hist_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HIST
    out_path = sys.argv[2] if len(sys.argv) > 2 else None
    if not os.path.exists(hist_path):
        print(f"sum-week: 无历史文件 {hist_path}", file=sys.stderr)
        sys.exit(1)
    hist = json.load(open(hist_path))
    records = hist.get("records", {})
    today = date.today()
    mon = monday_of(today)
    sums = {}
    included = []
    for dstr, rec in records.items():
        try:
            d = date.fromisoformat(dstr)
        except (ValueError, TypeError):
            continue
        if mon <= d <= today:
            included.append(dstr)
            for k, v in (rec.get("lists") or {}).items():
                sums[k] = sums.get(k, 0) + (v or 0)
    out = {"date": today.isoformat(), "window": "week", "lists": sums}
    if out_path:
        with open(out_path, "w") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"sum-week: 本周 {mon}~{today}（{len(included)} 天: {','.join(included)}）{len(sums)} 板块 → {out_path}")
    else:
        print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
