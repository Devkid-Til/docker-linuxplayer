# ⚠️ 已废弃（v0.7.0 起）

本文件是 **v0.6.0 之前**的产出格式（手写内联 HTML）。自 v0.7.0 起，wechat-article 改为产出**结构化 blocks**（YAML frontmatter），样式由 repo 的 `scripts/render-wechat.mjs` 统一渲染成内联 HTML。**不要再按本文件手写 HTML 片段**——请读 SKILL.md 的「内容模型」与「YAML 硬规则」。

以下是历史参考（仅对照视觉规范用）：

---

# HTML 片段库（卡片式排版 v6，逐元素套用）

> 规则：所有样式**内联**（微信剥 `<style>`/class）。颜色只准用 SKILL.md 风格令牌表里的值（**背景一律用不透明色，禁止 rgba**）。
> 特殊字符：正文 `<`→`&lt;`、`>`→`&gt;`、`&`→`&amp;`；href 里不要带尖括号。
> **版式总纲**：三级标题（一级=主色双线、栏目=深灰双线、条目=白卡），内容全部卡片化，**每个模块都有小标题**，列表一律用「段落式列表」（p，不用 ul/li）。

## 卡片基础（白底 + 细边框 + 圆角，无阴影，间距 18px）
```html
<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-radius:8px;padding:14px 16px;margin:0 0 18px">…卡片内容…</section>
```

## 头条卡（顶部 2px 主色横线 + 标题居中 + 时间/出处行 + 一句话点评）
```html
<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-top:2px solid #3458E0;border-radius:8px;padding:16px 18px;margin:0 0 20px">
  <p style="text-align:center;font-size:16px;font-weight:bold;color:#333333;margin:0 0 4px">钩子化标题（不是补丁名）</p>
  <p style="text-align:center;font-size:13px;color:#8C8C8C;margin:0 0 10px">〔MM-DD HH:MM 北京〕· 出处/补丁名</p>
  …段落式列表（六步）…
  <p style="font-size:15px;line-height:1.8;color:#333333;margin:0 0 8px"><span style="color:#3458E0;font-weight:bold">一句话点评</span>：作者视角，一句观点。</p>
  <p style="font-size:13px;color:#8C8C8C;margin:0">🔗 <a href="https://…" style="color:#3458E0;text-decoration:underline">原文</a></p>
</section>
```

## 亮点卡（纯白卡：★ 标题 + 时间 + 定位/做法/效益 + 和你相关 + 🔗 原文）
```html
<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-radius:8px;padding:14px 16px;margin:0 0 18px">
  <p style="font-size:15px;font-weight:bold;color:#333333;margin:0 0 2px"><span style="color:#3458E0">★</span> 亮点标题</p>
  <p style="font-size:13px;color:#8C8C8C;margin:0 0 8px">〔MM-DD HH:MM〕</p>
  …段落式列表（定位/做法/效益）…
  <p style="font-size:13px;color:#8C8C8C;margin:2px 0 4px">和你相关：这条和目标读者的关系。</p>
  <p style="font-size:13px;color:#8C8C8C;margin:0">🔗 <a href="https://…" style="color:#3458E0;text-decoration:underline">原文</a></p>
</section>
```

## 段落式列表（⭐ 列表一律用这个，不用 ul/li——微信对 p 最稳定，不拆段）
```html
<!-- 普通条目（标签加粗） -->
<p style="font-size:15px;line-height:1.8;color:#333333;margin-bottom:8px"><span style="color:#3458E0">•</span> <span style="color:#3458E0;font-weight:bold">标签</span>：内容</p>
<p style="font-size:15px;line-height:1.8;color:#333333;margin-bottom:8px"><span style="color:#3458E0">•</span> <span style="color:#3458E0;font-weight:bold">标签</span>：内容</p>

<!-- 灰字条目（○ 常规动态） -->
<p style="font-size:13px;color:#8C8C8C;line-height:1.7;margin-bottom:4px"><span style="color:#8C8C8C">○</span> <a href="https://…" style="color:#3458E0;text-decoration:underline">条目</a>〔MM-DD HH:MM〕</p>
```
> 卡内最后一个条目 `margin-bottom:0`（避免卡内底部多余间距）。

## ○ 常规动态卡（卡内小标题「更多动态」+ 灰字段落式列表）
```html
<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-radius:8px;padding:14px 16px;margin:0 0 18px">
  <p style="font-size:14px;font-weight:bold;color:#333333;margin:0 0 8px">更多动态</p>
  <p style="font-size:13px;color:#8C8C8C;line-height:1.7;margin-bottom:4px"><span style="color:#8C8C8C">○</span> <a href="https://…" style="color:#3458E0;text-decoration:underline">条目 A</a>〔MM-DD HH:MM〕</p>
  <p style="font-size:13px;color:#8C8C8C;line-height:1.7;margin-bottom:0"><span style="color:#8C8C8C">○</span> <a href="https://…" style="color:#3458E0;text-decoration:underline">条目 B</a>〔MM-DD HH:MM〕</p>
</section>
```

## 一级标题（上下双主色细线夹住，居中，emoji + 主色）
```html
<p style="text-align:center;border-top:1px solid #3458E0;border-bottom:1px solid #3458E0;padding:10px 0;margin:32px 0 18px;font-size:18px;font-weight:bold;color:#3458E0;letter-spacing:1px">🎬 今日导读</p>
```

## 栏目标题（上下深灰细线夹住，居中，深灰 16px——不用浅框）
```html
<p style="text-align:center;border-top:1px solid #E5E6EB;border-bottom:1px solid #E5E6EB;padding:8px 0;margin:32px 0 18px;font-size:16px;font-weight:bold;color:#333333">📰 linux-media（视频/相机）</p>
```

## 导语块（开头金句，文字居中；只放钩子金句，不放工具信息）
```html
<p style="background:#EDF1FD;border-left:3px solid #3458E0;border-radius:4px;padding:14px 18px;font-size:14px;line-height:1.8;color:#333333;text-align:center;margin:0 0 24px">钩子金句，<span style="color:#3458E0;font-weight:bold">重点词</span>。</p>
```

## 正文段落（左对齐；长文内容也建议包进卡片）
```html
<p style="font-size:15px;line-height:1.8em;letter-spacing:0.02em;color:#333333;margin:0 0 12px">正文内容</p>
```

## 强调词（三种强度）
```html
<!-- ① 核心术语/结论：主色，不加粗 -->
<span style="color:#3458E0">FFmpeg</span>
<!-- ② 最重要结论 / 并列标签：主色 + bold -->
<span style="color:#3458E0;font-weight:bold">更低的 CPU 开销</span>
<!-- ③ 普通结构强调：黑色 strong -->
<strong>第一步</strong>
```

## 引用块（独立内容时用；卡内可去边框只留底色）
```html
<blockquote style="background:#EDF1FD;border:1px solid #B9C6F2;border-left:3px solid #3458E0;border-radius:4px;padding:12px 16px;font-size:14px;line-height:1.7;color:#333333;margin:16px 0">引用内容</blockquote>
```

## 代码块（深底）与行内代码
```html
<pre style="background:#1F2430;border-radius:6px;padding:14px 16px;font-size:13px;line-height:1.7;color:#E6E6E6;overflow-x:auto;margin:16px 0"><code>代码，尖括号记得转义</code></pre>
<code style="background:#EDF1FD;color:#2746C4;border-radius:3px;padding:1px 5px;font-size:13px;font-family:monospace">ffmpeg -i</code>
```

## 图片占位（正文插图；封面图自动生成并复用）
正文开头的 `[图：封面示意...]` 占位符位置，插入流水线自动生成的封面图（cover.png，见「封面生成」节）——**公众号首图与正文首图用同一张**，风格统一。
```html
<p style="text-align:center;color:#8C8C8C;font-size:13px;margin:12px 0">[图：此处插入封面图 cover.png]</p>
```

## 分隔线（克制用法，间隔大段落）
```html
<hr style="border:none;border-top:1px solid #E5E6EB;margin:24px 0">
```

## 链接（正文外链，需后台加白名单）
```html
<a href="https://example.com" style="color:#3458E0;text-decoration:underline">链接文字</a>
```

## 结尾块（固定格式，文字居中，含关键词回复引导 + 数据来源）
```html
<p style="text-align:center;border-top:1px solid #E5E6EB;padding-top:16px;margin-top:28px;font-size:14px;line-height:1.8;color:#333333">
  <span style="color:#3458E0;font-weight:bold">一句话收尾金句</span><br>
  <span style="color:#8C8C8C;font-size:13px">回复关键词看专题 · 署名 / 关注引导</span><br>
  <span style="color:#8C8C8C;font-size:13px">数据来源：… · 时间均为… · 数据截至 …</span>
</p>
```
