#!/usr/bin/env python3
# draw-heat.py — 板块活跃度横向条形图（13 板块热度可视化，供周报/日报插图）
# 用法: python3 draw-heat.py <radar-stats.json> <out.png> [--title "板块活跃度 · 近 24h"] [--brand-json <路径>]
# 配色：从品牌单一数据源 <kernel-blog>/src/brand.json 的 blog 渠道读取（禁止硬编码）
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

DEFAULT_BRAND_JSON = "/ws/dev/kernel-blog/src/brand.json"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_CN   = "/usr/share/fonts/truetype/noto-sc/NotoSansSC-Bold.otf"

def _hex(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))

def _load_brand(path=None):
    p = path or os.environ.get("BRAND_JSON") or DEFAULT_BRAND_JSON
    try:
        d = json.load(open(p))
        t = d["themes"][d["current"]]
        ch = t["variants"]["light"]["channels"]["blog"] if "variants" in t else t["channels"]["blog"]
        return {
            "primary":     _hex(ch["primary"]),
            "primaryBg":   _hex(ch["primaryBg"]),
            "text":        _hex(ch["text"]),
            "textTertiary":_hex(ch["textTertiary"]),
        }
    except Exception as e:
        print(f"[draw-heat] 警告: 读品牌配置失败({e})，回退默认 violet", file=sys.stderr)
        return {"primary": (124,58,237), "primaryBg": (245,243,255), "text": (24,28,40), "textTertiary": (120,128,145)}

def main():
    data_path, out = sys.argv[1], sys.argv[2]
    title = "板块活跃度 · 近 24h"
    brand = _load_brand()
    if '--title' in sys.argv:
        title = sys.argv[sys.argv.index('--title') + 1]
    if '--brand-json' in sys.argv:
        brand = _load_brand(sys.argv[sys.argv.index('--brand-json') + 1])
    BRAND, BRAND_LT, INK, GREY = brand["primary"], brand["primaryBg"], brand["text"], brand["textTertiary"]

    stats = json.load(open(data_path))
    lists = stats["lists"]
    items = sorted(lists.items(), key=lambda kv: -kv[1])
    date = stats.get("date", "")

    W, H = 1200, 60 + 50 + 40 + 24 + len(items) * 42 + 60
    img = Image.new("RGB", (W, H), (250, 251, 255))
    d = ImageDraw.Draw(img)
    f_title = ImageFont.truetype(FONT_CN, 38)
    f_sub   = ImageFont.truetype(FONT_CN, 20)
    f_name  = ImageFont.truetype(FONT_MONO, 21)
    f_num   = ImageFont.truetype(FONT_MONO, 19)

    d.text((60, 40), title, font=f_title, fill=BRAND)
    d.text((60, 92), f"Linux 内核各板块邮件热度 · {date}", font=f_sub, fill=GREY)

    maxv = max(v for _, v in items) or 1
    x0, bar_max_w = 230, 780
    y = 160
    for name, v in items:
        w = int(bar_max_w * v / maxv)
        d.text((60, y + 2), name, font=f_name, fill=INK)
        d.rounded_rectangle([x0, y, x0 + bar_max_w, y + 26], 13, fill=BRAND_LT)
        if w > 6:
            for px in range(w):
                t = px / max(1, w)
                c = tuple(int(BRAND[i] + (BRAND_LT[i] - BRAND[i]) * t * 0.25) for i in range(3))
                d.rectangle([x0 + px, y + 3, x0 + px, y + 23], fill=c)
        d.text((x0 + w + 14, y), str(v), font=f_num, fill=INK)
        y += 42

    img.save(out)
    print(f"图已生成: {out} ({W}x{H}, {len(items)} 板块, 品牌源 {os.path.basename(brand['primary'] and DEFAULT_BRAND_JSON)})")

main()
