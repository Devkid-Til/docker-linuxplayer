#!/usr/bin/env python3
# sum-range.py — 按周期求板块热度之和：读 radar-history.json（每日落盘的历史热度），
# 求某周期（起点~今天）各板块 24h 计数之和，供周报/月报/季报/年报的「板块热度·趋势」图用。
#
# 数据来源：refresh-heat.sh 每日把当天 24h 计数 upsert 进 radar-history.json（按日期累积、git 持久化）。
#
# 防双重求和铁律：radar-history.json 只存「每日原始 24h 值」，绝不写入周和/月和/季和等聚合值。
# 本脚本对周期内每一天的原始值累加——周/月/季/年都从每日值求和，绝不基于已聚合结果再叠加
#（否则年=周和的重复求和、月和里混入周和，数据失真）。
#
# 用法:
#   python3 sum-range.py --period week    [history.json] [--out out.json]   # 本周周一~今天
#   python3 sum-range.py --period month   [history.json] [--out out.json]   # 本月 1 号~今天
#   python3 sum-range.py --period quarter [history.json] [--out out.json]   # 本季初~今天
#   python3 sum-range.py --period year    [history.json] [--out out.json]   # 本年 1/1~今天
#   python3 sum-range.py <start> <end>    [history.json] [--out out.json]   # 显式起止，如 2026-08-01 2026-08-10
#
# 输出: {"date": "<今天>", "window": "<period>", "lists": {<短名>: <周期和>}}
#   省略 history.json → /ws/dev/kernel-blog/src/data/radar-history.json
#   给 --out out.json → 写文件（可直接喂 draw-heat.py）；不给 → stdout
import json, os, sys, argparse
from datetime import date, timedelta

DEFAULT_HIST = "/ws/dev/kernel-blog/src/data/radar-history.json"

def start_of_period(period, today):
    if period == "week":
        return today - timedelta(days=today.weekday())
    if period == "month":
        return today.replace(day=1)
    if period == "quarter":
        qm = ((today.month - 1) // 3) * 3 + 1
        return today.replace(month=qm, day=1)
    if period == "year":
        return today.replace(month=1, day=1)
    raise ValueError(period)

def main():
    p = argparse.ArgumentParser(description="按周期求 radar-history 板块热度之和")
    p.add_argument("--period", choices=["week", "month", "quarter", "year"],
                   help="周期（起点~今天）；与显式 <start> <end> 二选一")
    p.add_argument("start", nargs="?", help="显式起始日 YYYY-MM-DD（配合 end）")
    p.add_argument("end", nargs="?", help="显式结束日 YYYY-MM-DD")
    p.add_argument("history", nargs="?", default=DEFAULT_HIST, help="radar-history.json 路径（缺省默认）")
    p.add_argument("--out", help="输出 JSON 路径（缺省 stdout）")
    a = p.parse_args()

    if a.period:
        today = date.today()
        start, end = start_of_period(a.period, today), today
        window = a.period
    elif a.start and a.end:
        start, end = date.fromisoformat(a.start), date.fromisoformat(a.end)
        today = end
        window = f"{start}~{end}"
    else:
        p.print_help(); sys.exit(2)

    if not os.path.exists(a.history):
        print(f"sum-range: 无历史文件 {a.history}", file=sys.stderr)
        sys.exit(1)

    records = json.load(open(a.history)).get("records", {})
    sums, included = {}, []
    # 只对周期内「每天原始 24h 值」求和；history 不含聚合值（铁律见文件头），故无双重求和
    for dstr, rec in records.items():
        try:
            d = date.fromisoformat(dstr)
        except (ValueError, TypeError):
            continue
        if start <= d <= end:
            included.append(dstr)
            for k, v in (rec.get("lists") or {}).items():
                sums[k] = sums.get(k, 0) + (v or 0)

    out = {"date": today.isoformat(), "window": window, "lists": sums}
    if a.out:
        with open(a.out, "w") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"sum-range: {window}（{start}~{end}，{len(included)} 天: {','.join(included)}）{len(sums)} 板块 → {a.out}")
    else:
        print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
