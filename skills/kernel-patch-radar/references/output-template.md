# 输出模板 — blocks 文章（内容结构 → 板块类型映射）

**成文 = 产出 blocks 文章文件**（`<kernel-blog>/src/content/posts/YYYY-MM-DD-slug.md`）。本文件定义：每日内容结构如何映射到 11 种板块类型。YAML 硬规则（字符串加引号 / `---` 收尾 / 缩进 2 空格）与自查命令见 skill `wechat-article` 的 SKILL.md，这里不重复。

## 内容结构 → block type 速查

| 内容板块 | block type | 关键字段 |
|---|---|---|
| 导语金句 | `hook` | `text`（`<strong>` 标重点词） |
| 🎬 今日导读 | `divider`(primary) + `toc` | `divider.label` / `toc.items[]` |
| 💡 今日头条 | `headline` | `title, meta, points[], verdict, link` |
| 📰 栏目分隔 | `divider`(section) | `label`, `kind: section` |
| ★ 亮点 | `highlight` | `title, meta, points[], relevance, link` |
| ○ 常规动态 | `more` | `title:"更多动态", items[]` |
| ⚙️ 机制雷达 | `divider`(primary) + `toc` | `toc.items[]` |
| 📖 概念速查 | `divider`(primary) + `toc` | `toc.items[]` |
| 结尾 CTA | `closing` | `tagline, source` |

板块**数量任意、顺序自由**——每天没有某栏就少一个板块，多两条头条就加两个 `headline`。

## 板块字段细则

### `hook` 导语金句
- `text`：钩子金句（只放钩子，不放工具性信息）；重点词用 `<strong>`（渲染为主色加粗）。

### `divider` 板块标题
- `label`：带 emoji（🎬 导读 / 💡 头条 / 📰 栏目 / 📌 机制雷达 / 📖 速查）
- `kind`：`primary`（一级标题，主色双线）/ `section`（栏目标题，深灰双线）

### `headline` 今日头条（≤1-2 条）
- `title`：**钩子标题**（读者能懂的钩子句，不用补丁名/commit subject）
- `meta`：`〔MM-DD HH:MM 北京〕· 补丁名/出处`
- `points`：**六步弧线**，每项 `{label, text}`——label 用最简词语：`现状 / 痛点 / 方案 / 为什么 / 效益 / 下一步`（按因果序）

> **标题/出处清理**：所有 `meta` 与 `more` 条目里的线程回复前缀 `Re: ` 一律去掉（噪音）；保留 `[PATCH vN x/y]` 标识（信息量）。
- `verdict`：一句话点评（作者观点，与事实严格区分）
- `link`：lore 原文 URL

### `highlight` 栏目亮点（每栏目 ≤3 条）
- `title` / `meta`
- `points`：**压缩弧线**——`{label: 定位, text: 哪一层+什么问题}` → `{label: 做法}` → `{label: 效益或下一步}`
- `relevance`：和你相关（一句和目标读者的关系）
- `link`

### `toc` 导读 / 机制雷达 / 概念速查
- `items[]`: `{label, text}`——label=标签或术语，text=一句话说明
- 机制雷达/速查的 text 可附 `<a href="...">原文</a>`

### `more` ○ 常规动态
- `title`：`更多动态`
- `items[]`: `{text, time: "MM-DD HH:MM", link}`（不值得展开的才进这里）

### `closing` 结尾（简洁，勿啰嗦）
- `tagline`：一句收尾 CTA，**≤20 字**（例：`如果对你有用，点个赞，或留言聊聊你最关心的。`）
- `source`：数据来源一行（例：`数据来源：linux-media / dri-devel（lore.kernel.org）· 北京时间`）

## blocks 文章骨架示例

真实范例（最完整）：`<kernel-blog>/src/content/posts/2026-08-06-virtio-media-dma-fence.md`、`2026-08-07-hdmi-21-gaming.md`

```yaml
---
title: Linux内核玩家 · MM月DD日｜今日最大看点
date: "YYYY-MM-DD"
desc: 一句话摘要（≤54 字）
tags: ["虚拟化", "Rust"]
blocks:
  - type: hook
    text: >-
      今天的 Linux 内核圈，值得花 3 分钟看两件事：<strong>重点一</strong>，和 <strong>重点二</strong>。
  - type: divider
    label: 🎬 今日导读
    kind: primary
  - type: toc
    items:
      - label: 头条
        text: 一句话
  - type: divider
    label: 💡 今日头条
    kind: primary
  - type: headline
    title: 钩子标题
    meta: "〔MM-DD HH:MM 北京〕· 补丁名"
    points:
      - label: 现状
        text: 世界本来怎么运作
      - label: 痛点
        text: 现状哪里不行
      - label: 方案
        text: 这个补丁干了什么
      - label: 为什么
        text: 设计取舍
      - label: 效益
        text: 谁受益
      - label: 下一步
        text: 走向哪里
    verdict: 一句话点评
    link: https://lore.kernel.org/...
  - type: divider
    label: 📰 linux-media（视频/相机）
    kind: section
  - type: highlight
    title: ★ 亮点标题
    meta: "〔MM-DD HH:MM〕"
    points:
      - label: 定位
        text: 哪一层 + 什么问题
      - label: 做法
        text: 干了什么
      - label: 效益
        text: 谁受益
    relevance: 和你相关
    link: https://lore.kernel.org/...
  - type: more
    title: 更多动态
    items:
      - link: https://lore.kernel.org/...
        text: 动态标题
        time: MM-DD HH:MM
  - type: divider
    label: 📌 机制雷达：N 条跨域大改动
    kind: primary
  - type: toc
    items:
      - label: 机制名
        text: 一句话 why · <a href="https://lore.kernel.org/...">原文</a>
  - type: divider
    label: 📖 本期概念速查
    kind: primary
  - type: toc
    items:
      - label: 术语
        text: 一句话解释（只收本期出现过的）
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的。
    source: 数据来源：linux-media / dri-devel（lore.kernel.org）· 北京时间
---
```

## 篇幅控制
- 🏆 头条 ≤1-2 条；★ 亮点每栏目 ≤3 条；○ 常规每栏目 ≤8 行
- 整份每天 ≤60 行可读文本。**宁可少而精**：看不明白的条目宁可给「背景」，不要堆标题。

## 每周模板
周报结构与每日不同（含「一、内存 / 二、进程 / 三、PCIe / 四、LWN / 五、架构动向 / 六、交叉点」）。
同样用 blocks：`divider`(primary) + `toc` 组织各章，长文分析用 `paragraph` / `quote`。
按每日的映射原则自由组合 11 种板块类型即可。
