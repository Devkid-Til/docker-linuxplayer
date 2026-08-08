---
name: wechat-article
version: 0.7.0
description: "Use when the user wants to write or format a WeChat 公众号 / mp.weixin article — 写篇公众号文章、写公众号、公众号排版、公众号文章、科普文排版、用咱们的风格写公众号、公众号文章 HTML、wechat article、wechat post、mp.weixin. Produces a structured blocks article (YAML frontmatter) that renders on BOTH the blog (Astro) and WeChat 公众号 (via scripts/render-wechat.mjs) from the same source. Our in-house style: purple #7C3AED accent (blog/WeChat unified), card-based layout, emoji-prefixed headings. Also produces title + 摘要 suggestions and multi-style cover art (--style)."
---

# wechat-article

为 Linux 内核玩家博客 + 微信公众号生成**结构化内容**（blocks），双端同源渲染。属于 9 大分类中的「内容脚手架」：输入内容 → 按固定板块模型产出结构化数据。

产出 = **一篇 markdown 文件**（frontmatter 含 `blocks` 板块数组），博客由 Astro 组件渲染，公众号由 `scripts/render-wechat.mjs` 从同一份数据渲染成内联 HTML（微信剥 class，脚本负责内联样式）。外加标题/摘要建议、封面图。

> ⚠️ **本 skill 不再手写 HTML**。样式全部由渲染脚本/组件承载，你只产出「内容 + 板块结构」。

## 什么时候触发本 skill

- 用户要写/排版公众号文章：写篇公众号文章 / 写公众号 / 公众号排版 / 公众号文章 / 科普文排版 / 用咱们的风格写
- wechat article / mp.weixin / wechat post / format a wechat article
- 内核日报流水线：内容分析完要产出当天文章（生成 blocks 环节）

## 内容模型：blocks 板块数组

文章正文 = 有序板块数组（`blocks:`），**数量任意、顺序自由**——每天板块组合不同就增减数组项。11 种类型：

| type | 用途 | 字段 |
|---|---|---|
| `hook` | 导语金句（开篇钩子，居中） | `text` |
| `divider` | 板块标题 | `label`（含 emoji）、`kind`：`primary`(一级主色双线) / `section`(栏目深灰双线) |
| `toc` | 导读列表 / 机制雷达 / 概念速查 | `items[]`: `{label, text}`（label=标签或术语，text=说明，可含链接） |
| `headline` | 头条卡（顶部主色横线 + 居中标题） | `title`、`meta`(时间·出处)、`points[]`: `{label,text}`、`verdict`(一句话点评)、`link`(原文) |
| `highlight` | 亮点卡（★ 标题） | `title`、`meta`、`points[]`: `{label,text}`、`relevance`(和你相关)、`link` |
| `more` | ○ 常规动态（卡内「更多动态」） | `title?`、`items[]`: `{text, time?, link?}` |
| `paragraph` | 长文分析段 | `text` |
| `quote` | 引用块 | `text` |
| `code` | 代码块（深底） | `text`（原文，可含尖括号） |
| `image` | 图片占位 | `alt`（图注）、`src?`（无则显示占位符，公众号后台手动插图） |
| `closing` | 结尾块（金句 + 来源） | `tagline`、`source`（两行来源用 `<br>` 连接） |

### 典型版式骨架（对应 blocks 顺序）

1. `hook` 导语金句（只放钩子，不放工具性信息）
2. `divider` primary「🎬 今日导读」→ `toc` 导读列表
3. `divider` primary「💡 今日头条」→ `headline`×1~2（每个：现状/痛点/方案/为什么/效益/下一步 + 一句话点评）
4. `divider` section「📰 linux-media」→ `highlight`×N（定位/做法/效益 + 和你相关）+ `more` 更多动态
5. `divider` section「📰 dri-devel」→ 同上
6. `divider` primary「📌 机制雷达」→ `toc`（术语→说明）
7. `divider` primary「📖 本期速查」→ `toc`（术语→说明）
8. `closing` 结尾（金句 + 关键词回复 + 数据来源）

**模块完整性铁律**：每个模块都要有标题——`divider` 管章节，`more` 卡内标题默认「更多动态」，不允许出现无名卡。

### 内联强调：用语义标签，不用内联样式

文本字段里表达强调用**语义标签**（渲染脚本/组件负责着色，你只管语义）：

| 语义标签 | 博客效果 | 公众号效果 |
|---|---|---|
| `<mark>文本</mark>` | 主色 | 主色 `#7C3AED`（不加粗） |
| `<strong>文本</strong>` | 主色加粗 | 主色 `#7C3AED` + bold |
| `<small>文本</small>` | 灰色 | 次级灰 `#8C8C8C` |
| `<a href="URL">文本</a>` | 主色链接 | 主色下划线链接 |
| `<code>代码</code>` | 行内代码 | 浅底深色行内代码 |

**强调克制是全篇的灵魂**：散文正文主色每百字 ≤2 处；结构化内容（标签列表、术语速查）允许高频。**禁止**在 text 里写 `<span style="...">`、class、内联样式——那不是你的活。

## YAML 硬规则（写错解析即报错，最高优先级）

1. **所有字符串值一律双引号**：`text: "内容"`、`label: "头条"`、`meta: "〔08-07 04:54〕"`。值里常含 `:`（如 `rust: dma_fence`）、`[`、`#`、`~`，裸写会被 YAML 当映射/注释/null。
2. **列表项同样加引号**：`- label: "头条"`、`- link: "https://..."`。
3. **收尾必须有 `---` 分隔符**：frontmatter 以 `---` 开始，`blocks` 全部写完后再来一个 `---` 结束。
4. **缩进 2 空格**，层级严格对齐（`blocks:` → `  - type:` → `    title:`）。
5. `text` / `source` 若含长文可用 `>-` 折叠标量（单行折叠成一行），但折叠标量下一行缩进要比键多。
6. 时间格式 `MM-DD HH:MM`，写在引号里。

## 工作流

1. **澄清需求**：主题、板块组合（今日有哪些头条/亮点/机制）、篇幅。内容已有就直接进 2。
2. **组织板块**：按版式骨架决定 blocks 数组——先想「今天有哪几个板块、每个板块几项」，再逐块填内容。用 `<mark>/<strong>/<small>` 标出打算强调的词。
3. **产出文件**：写成完整 markdown，frontmatter 含 `title`/`date`/`desc`/`tags`/`blocks`。遵守 YAML 硬规则。
4. **交付**：给出文章文件路径 + 标题建议（≤40 字）+ 摘要建议（≤54 字，内核日报规格）+ 封面建议。告知双端命令：
   ```bash
   npm run build                                    # 博客发布
   node scripts/render-wechat.mjs 2026-08-08        # 公众号 HTML（复制即粘贴）
   ```
5. **自查**（交付前必做）：
   - YAML 可解析：`node scripts/render-wechat.mjs <文章日期前缀> --out` 能正常输出即为解析通过（或在 repo 内跑 `node -e "require('js-yaml').load(require('fs').readFileSync(process.argv[1],'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);console.log('YAML OK')" <文章路径>`）
   - 所有字符串值已加引号；有 `---` 收尾；缩进对齐
   - text 里无 `<span style=` / class / `<ul>` / `<li>`
   - 板块 type 都是 11 种之一，字段名正确
   - 外链记得提醒用户后台加白名单

## 封面生成（多平台风格可指定）

用本地渲染生成封面（Noto Sans SC 中文，4x 高清），**风格用 `--style` 指定，不写死**：

```bash
bash scripts/generate-cover.sh --style blog --date "08-07" --topic "今日看点（≤16字）" --out cover.png
```

### 风格注册表（`generate-cover.js` 里 STYLES）

| `--style` | 模板 | 用途 |
|---|---|---|
| `blog`（默认） | `cover-blog-template.svg` | 紫色现代风（#7C3AED，博客/公众号统一）|
| `wechat` | `cover-template.svg` | 靛蓝报刊风（旧公众号风格）|
| `book` | `cover-book.svg` | 竖版书封（3:4 真书感）|
| `collection` | `cover-collection.svg` | 合集封面 |
| 任意 `.svg` 文件名 | 直接用 | 自定义模板 |

> 新增风格 = 加一个 `.svg` 模板到 `assets/` + 在 STYLES 里注册一行。占位符 `{{DATE}}` / `{{TOPIC}}` / `{{SLOGAN}}`。

- 字体 `assets/fonts/NotoSansSC-Regular.otf` + `NotoSansSC-Bold.otf`（CJK，resvg 显式加载**真 Bold**；系统可能无中文字体，必须自带）
- 首次运行自动 `npm install @resvg/resvg-js`；默认输出 **3600×1532 PNG（4x）**，公众号按 900×383 显示
- `--topic` 看点为今日头条钩子标题，每期替换，**建议 ≤16 字**（单行不溢出）；`--slogan` 默认「内核是主业，玩家是态度」
- **博客不插封面**：博客文章页由 ArticleBody 跳过 image 块，封面只用于公众号首图/正文顶部插图

## Gotchas

### Gotcha: YAML 字符串不引号 → 解析即报错（本 skill 头号坑）
**为什么会踩**：值里常见 `dma_buf: dma_fence`（冒号+空格）、`[PATCH v2 0/4]`（方括号开头）、`~103 MiB`（波浪号）、`#3458E0`（井号）。这些在 YAML 纯标量里会被当成嵌套映射/flow 集合/null/注释。
**正确做法**：**所有字符串值双引号**，列表项 `- key: "value"` 同样。写完后用工作流第 5 步的自查命令验证 js-yaml 能解析，解析不过就是引号漏了。

### Gotcha: 缺收尾 `---` → 解析不到 frontmatter
**为什么会踩**：写完 `blocks:` 忘了再写一个 `---` 收尾，解析器把整个文件当正文。
**正确做法**：frontmatter 是 `---` 开、`---` 收的完整块；`blocks` 全部写在两个 `---` 之间。

### Gotcha: 在 text 里手写内联样式（老习惯）
**为什么会踩**：旧版 skill 手写 `<span style="color:#3458E0">`，但现在渲染由脚本/组件承担，写内联样式既不生效（博客端）又重复劳动。
**正确做法**：想表达强调就用 `<mark>/<strong>/<small>/<a>/<code>` 语义标签。**禁止** `<span style=`、class、`<ul>/<li>`。

### Gotcha: 图片粘贴会裂图，必须在后台手动插图
**为什么会踩**：`<img>` 地址粘贴进微信会被过滤。
**正确做法**：用 `image` 板块，无 src 时渲染为占位符，交付时提醒用户在后台手动插图。

### Gotcha: 正文链接推送后点不动，域名没进外链白名单
**为什么会踩**：微信限制「已认证公众号 + 域名进后台白名单」，没加白名单的链接点不动。
**正确做法**：链接照常写 `<a href="...">`（渲染脚本自动加样式）；交付时提醒用户后台 → 设置 → 功能设置 → 加域名白名单；头条单一链接可走「阅读原文」。

## 参考

- 渲染实现（样式在那边，不必读）：repo `scripts/render-wechat.mjs`（公众号内联 HTML）+ `src/components/article/`（博客组件）
- 板块 schema 类型定义：repo `src/components/article/blocks/types.ts`
- 示例文章：repo `src/content/posts/2026-08-06-*.md` / `2026-08-07-*.md`
- `assets/template.html` — 历史完整 HTML 示例（仅供对照视觉，不再作为产出格式）
- `scripts/generate-cover.sh` — 报刊风封面生成
- `assets/cover-template.svg` + `assets/fonts/NotoSansSC-*.otf` — 封面模板与中文字体
- `references/growth-log.md` — 本 skill 撞到的坑（append-only）
