# 输出模板 — blocks 文章（内容结构 → 板块类型映射）

**成文 = 产出 blocks 文章文件**（`<kernel-blog>/src/content/posts/YYYY-MM-DD-slug.md`）。本文件定义：各栏目内容结构如何映射到 11 种板块类型。YAML 硬规则（字符串加引号 / `---` 收尾 / 缩进 2 空格）与自查命令见 skill `wechat-article` 的 SKILL.md，这里不重复。

## 栏目 → 内容类型 → 模板速查

**五档栏目不是同一种内容换标签，而是三种内容类型**（词表已按此分域，见 `src/column.ts`）。产出前先确定 `column`，再选对应模板：

| 栏目 | 内容类型 | 用什么模板 | 词表方向（tags 必须取对应栏目） |
|---|---|---|---|
| `daily` 日报 | 报纸式简报（**全内核雷达**） | 下方「日报模板」 | 内核板块（media、DRM、mm、PCI、net、fs、virtio、Rust、LSM、block、arch、sched、driver-core） |
| `weekly` 周报 | 雷达分章（mm/sched/pci + LWN） | 下方「每周模板」 | 机制域（内存管理、进程调度…） |
| `monthly` 月报 | 月度盘点（回顾式） | 下方「盘点模板」 | 盘点视角（月度盘点、趋势观察、数据指标） |
| `quarterly` 季报 | 季度盘点（回顾式） | 下方「盘点模板」 | 盘点视角（季度盘点、趋势观察、里程碑） |
| `yearly` 年报 | 年度盘点（回顾式） | 下方「盘点模板」 | 盘点视角（年度盘点、生态回顾、里程碑） |
| `english` 内核英语 | 语言学习（读今日解锁的内核英文） | 下方「内核英语模板」 | 学习维度（标题解析、术语卡、地道表达、阅读、写作、口语） |

> `column` 是 frontmatter 必填字段（schema `z.enum(...).default('daily')`）。写词表外标签构建即报错。

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

> **当日 section 动态**：section 只给**当日有 signal 的域**开（对应 13 个抓取列表：linux-media / dri-devel / linux-mm / linux-pci / netdev / linux-fsdevel / virtio-dev / rust-for-linux / linux-security-module / linux-block / linux-arch / lkml / linux-rt-devel；**抓取策略：12 个持续更新列表按最近 24h（时间驱动，日报时间语义统一为昨天一整天；其中 lkml 全内核广播源按 `T24:400` 限 400 条软上限，防止 1200+ 条噪音洪水）、virtio-dev 按最近 20 条（低频兜底，只作信号提示，长期趋势归月/季/年报盘点）**；lkml 是 linux-kernel 的 lore 镜像，全内核广播源；linux-sched 无专属镜像，主线程 sched / driver core 靠 lkml + 跨帖捕获，RT 实时调度靠 linux-rt-devel）。某域当天没大事 → 不出现，别为凑数硬开。**头条从全内核选**，不固定给 media/drm。**每行 5 字段 `时间|标题|原文链接|Message-Id|In-Reply-To`**——第 4/5 字段只用于脚本内跨列表去重（Message-Id）与系列识别（In-Reply-To 空 = 系列首封/新话题，优先看），成文不展示。

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
- `source`：数据来源一行（例：`数据来源：lore.kernel.org（全内核 13 列表）· 北京时间`）

## blocks 文章骨架示例

真实范例（最完整）：`<kernel-blog>/src/content/posts/2026-08-06-virtio-media-dma-fence.md`、`2026-08-07-hdmi-21-gaming.md`

```yaml
---
title: 今日最大看点
date: "YYYY-MM-DD"
desc: 一句话摘要（≤54 字）
column: "daily"
# 标签必须取 src/column.ts 该栏目的受控词表（schema 强制，写词表外标签构建即报错）
tags: ["media", "DRM", "Rust"]
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
    label: 📰 media
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
    source: 数据来源：lore.kernel.org（全内核 13 列表）· 北京时间
---
```

## 篇幅控制
- 🏆 头条 ≤1-2 条（全内核选）；★ 亮点每域 ≤3 条；○ 常规**全文 ≤2 组 more、每组 ≤8 条**——它是收尾，不是主体
- **section 开合**：某域当日无 signal 就不开——宁可 3 条讲透 > 15 条标题
- 整份每天 ≤60 行可读文本。**宁可少而精**：看不明白的条目宁可给「背景」，不要堆标题。

## 每周模板（与每日同格式，可上博客/公众号）

成文为 `<kernel-blog>/src/content/posts/YYYY-MM-DD-weekly-radar.md`，**frontmatter + blocks 与每日完全一致**。
章节用 `divider`(section) 分章（label 带模块前缀，落款数据来源自动推导）+ `toc`/`paragraph` 组织内容。

```yaml
---
title: <本周最大动向>
date: "YYYY-MM-DD"
desc: 一句话摘要
column: "weekly"
# 周报词表（见 src/column.ts weekly.tags）：内存管理/进程调度/PCI/总线/架构动向/版本/发布/社区/生态
tags: ["内存管理", "进程调度", "PCI/总线", "架构动向"]
blocks:
  - type: hook
    text: >-
      本周内核全局看点：<strong>…</strong>，和 <strong>…</strong>。
  - type: image
    src: "<OSS 封面 URL>"
    alt: 封面 · MM月DD日 · 每周全局雷达
  - type: divider
    label: 📊 板块活跃度
    kind: section
  - type: image
    src: "<OSS 活跃度图 URL>"
    alt: 板块活跃度条形图 · 近 24h
  - type: paragraph
    text: >-
      近 24h 各板块热度（13 板块真实统计）：lkml … · net … · …（draw-heat.py 生成图 + stats 数字；图先传 OSS）
  - type: divider
    label: 📰 media 视频采集
    kind: section
  - type: toc
    items:
      - label: media 重点
        text: 一句话 why · <a href="...">原文</a>
  # …其余 12 板块（DRM/mm/PCI/net/fs/virtio/Rust/LSM/block/arch/rt/lkml）同上「divider + toc」结构…
  - type: divider
    label: 📰 LWN / 本周综述
    kind: section
  - type: paragraph
    text: LWN 本周综述（订阅墙文章标题可抓、正文如实处理）
  - type: divider
    label: 🧭 合入状态
    kind: section
  - type: toc
    items:
      - label: 三镜像反查
        text: 重点补丁 mainline / next / stable 状态（mirror-lookup.sh 反查，命中标 ✅/🔜/🩹）
  - type: divider
    label: 📰 架构动向
    kind: section
  - type: toc
    items:
      - label: 架构动向
        text: 跨板块趋势归纳（新 API / 新抽象 / 重构）
  - type: divider
    label: 📰 与你方向的交叉点
    kind: section
  - type: toc
    items:
      - label: 交叉点
        text: 无则明确说没有
  - type: divider
    label: 📖 本期概念速查
    kind: primary
  - type: toc
    items:
      - label: 术语
        text: 一句话解释（只收本期出现过的）
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的板块。
    source: ""
---
```

> 落款 `source` 留空自动推导（divider 的 📰 前缀如 mm/sched/pci/lwn 会被提取）。发布/审阅流程同每日（见 SKILL.md 工作流步骤 5-7）。

## 盘点模板（月报 / 季报 / 年报共用）

**盘点式 = 回顾，不是新闻。** 无抓取脚本——基于当期的日报/周报积累内容做盘点，重**趋势与指标**，轻逐条新闻。同一结构三档复用，只换 `column` 与词表。

**先跑聚合脚本拿素材再成文**（文章文件即单一数据源，不维护台账）：
```bash
cd <kernel-blog> && node scripts/monthly-recap.mjs --month YYYY-MM   # 默认当月；--column 筛栏目；--json 出结构化
```
脚本输出素材稿（规模/标签频次/分节活跃度/头条/机制雷达/速查术语/交叉信号），据此填下面的 blocks：

| 栏目 | `column` | tags（对应词表） | 标题前缀 |
|---|---|---|---|
| 月报 | `monthly` | `月度盘点` / `趋势观察` / `数据指标` | `<本月最大动向>` |
| 季报 | `quarterly` | `季度盘点` / `趋势观察` / `里程碑` | `<本季最大动向>` |
| 年报 | `yearly` | `年度盘点` / `生态回顾` / `里程碑` | `<本年最大动向>` |

```yaml
---
title: 本月内核最大动向
date: "YYYY-MM-DD"
desc: 一句话摘要（≤54 字）
column: "monthly"
# 盘点模板：月报用 monthly 词表，季/年报换对应词表（见 src/column.ts）
tags: ["月度盘点", "趋势观察", "数据指标"]
blocks:
  - type: hook
    text: >-
      本月内核全局盘点，值得记住三件事：<strong>…</strong>、<strong>…</strong> 和 <strong>…</strong>。
  - type: divider
    label: 📈 本期盘点
    kind: primary
  - type: toc
    items:
      - label: 头条级
        text: 本月最重要的 1-3 条跨域大改动
  - type: divider
    label: 📰 趋势观察
    kind: section
  - type: toc
    items:
      - label: 趋势名
        text: 一句话 why（新 API / 新抽象 / 方向性变化）
  - type: divider
    label: 📰 数据指标
    kind: section
  - type: toc
    items:
      - label: 指标
        text: 一句话（补丁数 / 子系统活跃度 / 里程碑达成）
  - type: divider
    label: 📰 与你方向的交叉点
    kind: section
  - type: toc
    items:
      - label: 交叉点
        text: 无则明确说没有
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的。
    source: ""
---
```

### 内核英语模板（column=english，每日一篇）

**产出路径**：`<kernel-blog>/src/content/posts/english/YYYY-MM-DD-slug.md`（**独立子目录**，与内核日报分离；URL/slug 仍取文件名，不受路径影响）。

**定位**：用今日解锁的内核英文资料学英语——**独立栏目**（非日报周边）。素材 = 当天 radar 抓取/分析的英文补丁标题、内核术语、LKML 邮件表达。

**反编造护栏（真实性铁律，r1 对抗式评审新增）**：
- 每条引用（补丁标题/术语/邮件句子）必须带 `link`（lore URL / Message-Id），**无链接不落成文**——素材取自当天 radar/日报产物，引用前对原文链接核对
- **区分「真实原文」与「仿写示范句」**：真实原文带链接可溯源；确为示范的句子必须标注「仿写示范」，不得冒充「原句」
- 术语定义以真实原文为准（如 DMB=Device Memory Buffer），不得凭理解改写缩写展开
- 来源列表归属以真实投递为准（如该系列投 linux-kernel/virtualization，标 `lkml`，勿标未投递的列表）

**翻译规范（内核语境，不可直译）**：
- 术语按内核社区习惯：guest=客户机、buffer=缓冲区、feature bit=特性位、error path=错误路径、ownership=持有；不确定时**保留英文 + 括注中文**
- **意译优先**：句子按中文技术表达组织，避免欧化/翻译腔（"This looks reasonable to me"→「我觉得合理」，不是「这对我看起来是合理的」）
- **上下文定词义**：同一词由技术语境决定译法（device-owned→设备持有、managed→管理）
- **技术准确第一**：翻译不歪曲原意，中文读者能直接理解技术含义

**focus 制（一篇文章一个学习重点，schema 强制）**：
- frontmatter **必填 `focus`**（今日主维度，取学习维度词表：标题解析/术语卡/地道表达/阅读/写作/口语）
- **tags 精简**：主维度必含 + 辅助最多 1 个（**不再多维度并列**——一篇文章聚焦一个点学透）
- 节奏**每日固定轮换**（董事长定）：6 维度循环 标题解析→术语卡→地道表达→阅读→写作→口语，今天 = 上篇 focus 的下一个（如昨天标题解析 → 今天术语卡）；素材在轮换维度内取材（不跳维、不连续重复）
- 文章开头 hook **点明「今日重点：{focus}」**，读者有目标感

**结构**（blocks 复用现有类型，focus 决定主 section）：
```
hook          → "今日重点：{focus}…"（开头点明）+ 1 句导语
divider       → 主维度 section（按 focus 选）：
                标题解析 → headline（补丁标题 + 逐块拆解 points）
                术语卡   → highlight（术语英文定义/中文/记忆钩子）
                地道表达 → highlight（原句/中文/用法）
                阅读     → paragraph 或 quote（英文段落 + 解析）
                写作     → paragraph（仿写引导 + 例句）
                口语     → paragraph（复述引导）
divider       → "✨ 辅助彩蛋"（1 条，其他维度，不喧宾夺主）
divider       → "✍️ 今日练习"（针对 focus 的复述/仿写）
closing       → 每日一句（英文学习收尾）
```

```yaml
---
title: "<当日主题>"
date: "YYYY-MM-DD"
desc: "今日重点：<focus>——<一句话>。"
column: "english"
focus: "标题解析"          # 必填，学习维度词表内
tags: ["标题解析", "术语卡"]  # 主维度 + 辅助（≤1）
blocks: [ ... 按上述结构 ... ]
---
```

### 站长手记模板（column=journal，不定期）

**产出路径**：`<kernel-blog>/src/content/posts/journal/YYYY-MM-DD-slug.md`（独立子目录）

**定位**：笔记/感谢/随想——**低频不定期，贵在真实不日更**。素材来自站长真实经历（踩坑/学习/致谢/观点），非数据源，不设 cron。

**结构**：
```
hook      → 开篇一句（点明这篇是什么：笔记/感谢/随想）
divider   → 主题 section（按内容：笔记=踩坑复盘 / 感谢=致读者致贡献者 / 随想=观点）
paragraph → 正文（2-4 段，真诚具体，不注水）
closing   → 收尾
```
tags 从词表取（笔记/感谢/随想），一篇 1 个主分类。
