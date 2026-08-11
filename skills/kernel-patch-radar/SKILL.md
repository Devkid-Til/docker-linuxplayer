---
name: kernel-patch-radar
version: 0.9.0
description: "Use when the user wants a daily, weekly, monthly/quarterly/yearly digest of Linux kernel mailing-list patch activity — patch series, RFCs, subsystem discussion. Five columns (五档栏目): daily (全内核 13 列表雷达: linux-media/dri-devel/mm/pci/netdev/fs/virtio/rust/security/block/arch/lkml/linux-rt-devel, 词表=13 内核板块 media/DRM/mm/PCI/net/fs/virtio/Rust/LSM/block/arch/sched/driver-core, 报纸式简报), weekly (全 13 板块 + LWN + 板块热度 + 三镜像反查, 雷达分章; 网站直接发布、公众号标题+HTML 请示), monthly/quarterly/yearly (盘点式回顾). Triggers on '今天内核有啥动态'、'补丁简报'、'看下 linux-media 的补丁'、'追踪内核邮件列表'、'patch digest'、'kernel patches today'、'每周内核雷达'、'月报'、'季报'、'年报'. 另有独立栏目 english 内核英语（用今日内核英文语料学英语，focus 制，触发词'内核英语'/'学英语'/'英语卡'）. Fetches via scripts/radar.sh (lore git, bypasses Anubis), analyzes by architecture layer, outputs blocks articles (blog + 公众号 same source)."
---

# kernel-patch-radar — Linux 内核补丁/社区动态追踪

**职责**：把「五档栏目（日报/周报/月报/季报/年报）」的内容生产流程固定下来。**抓取全在 `scripts/`（确定性脚本），Claude 只做分析、标注、成文。** 分析默认走「架构优先」视角：每条亮点补丁说清「动了哪一层 + 为什么」，机制级改动优先于驱动小修。

## 五档栏目速览（与博客 `src/column.ts` 对齐）

**五档栏目不是同一种内容换标签，而是三种内容类型**——日报=报纸式简报、周报=雷达分章、月/季/年报=盘点式回顾。词表已按此分域（schema 强制），生产时先定 `column` 再选结构：

| 栏目 | 内容类型 | 抓取 | 成文模板 |
|---|---|---|---|
| 日报 `daily` | 报纸式简报（**全内核雷达**：当日有 signal 的域才开 section） | `scripts/radar.sh daily`（13 列表：12 按最近 24h〔lkml 全内核广播源限 400 条〕+ virtio-dev 按 20 条） | `output-template.md` 日报模板 |
| 周报 `weekly` | 雷达分章（mm/sched/pci + LWN） | weekly-radar.workflow.js + `radar.sh lwn` | `output-template.md` 每周模板 |
| 月/季/年报 | 盘点式回顾 | **无抓取脚本**——基于当期日/周报积累内容盘点 | `output-template.md` 盘点模板 |
| `english` 内核英语 | 语言学习（用今日内核英文语料学英语，focus 制） | **无抓取**——复用当天 radar/日报素材，引用必带 lore 链接 | `output-template.md` 内核英语模板 |

> **词表铁律**：任何一档的 tags 必须取 `src/column.ts` 对应栏目词表（写词表外标签 `npm run build` 即报错）。日报/周报已有完整流程（见下）；月/季/年报为盘点式，发布前需请示董事长。

## 什么时候触发
用户要看内核邮件列表动态，或 cron 定时任务触发（提示词写「运行 skill kernel-patch-radar」）；月报/季报/年报需求（「出个月报」「季度回顾」）同样触发本 skill。

## 工作流

### 每日简报（全内核雷达 · 13 列表）
1. `bash scripts/radar.sh daily` → 分节输出 13 列表（**12 个持续更新列表按最近 24h〔lkml 全内核广播源 T24:400 限 400 条〕、virtio-dev 按最近 20 条**；每行 5 字段 `ISO时间|标题|原文链接|Message-Id|In-Reply-To`，第 4/5 字段支撑跨列表去重与系列识别，成文不用展示；**跨列表已按 Message-Id 去重**，板块专属优先、lkml 广播源只补无专属列表的板块，stderr 会标 `去重跳过`）；**先整体扫一遍挑当日 signal（哪几域今天有大事、哪条跨域机制最重），再逐条展开**——别按列表逐条流式过，雷达是探测不是流水账
2. 标注前**先翻 `references/architecture-map.md`** 给每条亮点补丁做架构定位
3. 按「分析规则」标注、按 `references/output-template.md` 的 blocks 映射组织内容结构
4. **成文为 blocks 文章文件**：产出**完整的博客文章文件** `<kernel-blog>/src/content/posts/YYYY-MM-DD-slug.md`（frontmatter 含 `title`/`date`/`desc`/`tags`/`blocks`）。**YAML 硬规则**（所有字符串值加双引号、`---` 收尾、缩进 2 空格）与自查命令见 skill `wechat-article` 的 SKILL.md——写完后必须跑自查确认 js-yaml 可解析。核心简报 = 该文件的 blocks 内容
5. **封面 + 活跃度图 + OSS 上传**（**固定步骤，不可省**）：
   - **封面**：`bash <wechat-article skill>/scripts/generate-cover.sh --date "MM-DD" --topic "<头条钩子>" --out cover.png`（紫色报刊风，规格按 `references/wechat-template.md`）
   - **活跃度图**：`python3 <本 skill>/scripts/draw-heat.py <kernel-blog>/src/data/radar-stats.json board-heat.png --title "板块活跃度 · 近 24h"` 生成 13 板块热度条形图（周报必用；日报可选）
   - **上传 OSS**：`cd <kernel-blog> && node scripts/upload-oss.mjs cover.png kernel-blog/YYYY-MM-DD/cover.png` + `node scripts/upload-oss.mjs board-heat.png kernel-blog/YYYY-MM-DD/board-heat.png`（.env 已配 PUBLIC_OSS_*，上传得公网 URL）
   - **成文引用**：`type: image` block——封面放 hook 后、活跃度图放「板块活跃度」章节；`alt` 写说明
6. **板块热度数据**：`bash scripts/radar.sh stats <kernel-blog>/src/data/radar-stats.json` → 更新首页「雷达仪表盘 · 板块活跃度」热度条（全 13 列表统一 T24 计数、社区短名 key；**数据写进仓库随文章一起提交**）。**已自动化**：`scripts/refresh-heat.sh` 每日 06:23 由 cc-connect cron（id 2254d74c）自动执行全链路——网络探测→stats→防全 0→git commit 触发部署；网络不可达/数据无变化/全 0 都安全跳过。手动刷新直接跑 `bash scripts/refresh-heat.sh`
7. **网站直接发布（自主）**：`git add -A && git commit -m "..." && git push`（post-commit hook 自动 build+rsync 上线）——**网站是自有技术阵地、内容可随时改，commit 即上线，不额外审**。若属重大/敏感内容想先给董事长看效果：本地 `python3 -m http.server <port> --directory site` + `cloudflared tunnel --url http://localhost:<port>` 发临时预览链接，看完再决定上线
8. **公众号标题 + HTML 请示（发布权在董事长）**：`cd <kernel-blog> && npm run build && node scripts/render-wechat.mjs YYYY-MM-DD --out` 生成内联 HTML → **cc-connect 发「标题 + HTML 文件」给董事长**，确认后才发布公众号——公众号是品牌对外窗口、发布权在董事长，必须过目：
   ```bash
   cc-connect send --file <公众号HTML> --message "📢 公众号审核 · Linux内核玩家 · MM月DD日｜<头条钩子>"
   ```
   等董事长确认后再发布；其余平台读 `references/platform-templates.md` 产小红书帖 / 抖音脚本 / GitHub 日报 md，随文章文件一并输出；图形走飞书画板、视频走外部工具，本步只做文字

### 每周雷达（mm/sched/pci + LWN + 板块热度 + 三镜像反查）
1. **板块活跃度数据（本周热度之和）**：`python3 <本 skill>/scripts/sum-range.py --period week <kernel-blog>/src/data/radar-history.json --out /tmp/week-heat.json` → 读每日落盘历史（refresh-heat.sh 每天 upsert），求**本周（周一~今天）各板块计数之和**，作为周报「板块热度」数据源。历史不足 7 天时用已有天数求和（标题如实标注如"本周 3 天累计"）；无历史则跳过活跃度图
2. 用 Workflow 工具**以 `scriptPath`** 运行 `<本 skill 目录>/scripts/weekly-radar.workflow.js`（并行 13 板块 agent 搜全内核近期重点——media/DRM/mm/PCI/net/fs/virtio/Rust/LSM/block/arch/rt/lkml，返回含子层/机制标注/来源链接/mid 的结构化摘要；低频板块搜不到如实报「暂无重点」）——**不要用 `name:`**，该文件未注册到 `~/.claude/workflows/`
3. `bash scripts/radar.sh lwn 10` → 本周 LWN 标题（⚠️ LWN 部分文章有订阅墙，标题可抓、正文可能需订阅，成文时如实处理）
4. **三镜像合入状态反查**：对周报报道的重点补丁批量 `bash scripts/mirror-lookup.sh query <mid> [...]`（本地三镜像：mainline 是否合入 / next 是否排队 / stable 是否回移植）——结果补进各补丁条目与「合入状态」节
5. **活跃度图 + 封面 + OSS 上传**（同每日步骤 5）：`draw-heat.py /tmp/week-heat.json board-heat-week.png --title "板块热度 · 本周（周一~今日）"` 生成**本周累计**活跃度图（用步骤 1 的周和 JSON）+ `generate-cover.sh` 生成封面 + `upload-oss.mjs` 上传 OSS——成文时活跃度图放「📊 板块热度」节、封面放 hook 后，均以 `type: image` block 引用 OSS URL
6. **成文为 blocks 文章**（与每日同格式，可上博客/公众号）：`<kernel-blog>/src/content/posts/YYYY-MM-DD-weekly-radar.md`（frontmatter 含 title/date/desc/tags/blocks，结构见 `output-template.md` 每周模板；YAML 硬规则同每日）。周报除模板原有章节外，补两节：**📊 板块热度**（板块活跃度图 + 13 板块活跃度分布）与 **🧭 合入状态**（重点补丁的三镜像反查结果）
7. **发布（双轨，同每日步骤 7/8）**：网站直接发布（`git commit/push` → commit hook 自动部署；重大内容可选隧道预览）；公众号 `render-wechat.mjs` 出 HTML 后 **cc-connect 发「标题 + HTML 文件」给董事长**，确认后才发布

### 月/季/年报（盘点式回顾）
**无每日抓取**——基于当期已产出的日/周报积累内容做盘点，重**趋势与指标**，轻逐条新闻：
1. **先跑聚合脚本拿素材**：`cd <kernel-blog> && node scripts/monthly-recap.mjs --month YYYY-MM`（`--column` 可筛栏目，`--json` 出结构化数据）——确定性聚合当期文章：规模/标签频次/分节活跃度/头条/机制雷达/速查术语/交叉信号。**文章文件即单一数据源，不维护台账**
2. **板块热度趋势（可选）**：`python3 <本 skill>/scripts/sum-range.py --period month --out /tmp/month-heat.json`（季报用 `--period quarter`、年报用 `--period year`）→ `draw-heat.py /tmp/month-heat.json month-heat.png --title "板块热度 · 本月"`——从 radar-history.json 每日落盘热度求周期累计，展示当月/季/年板块热度趋势
3. **数据铁律（防双重求和）**：`radar-history.json` 只存**每日原始 24h 值**（refresh-heat.sh 每日 upsert），周/月/季/年求和一律用 `sum-range.py` 对周期内**每天原始值**累加。**禁止**把周和/月和等聚合结果写进 history，也禁止基于聚合值再叠加（否则年=周和的重复求和，数据失真）
2. 以聚合素材为底，抽出跨域大改动、趋势、指标
3. **低频板块专项**：virtio / RT / LSM 等低频列表日报只作信号提示、不展开（12 列表按 24h、virtio-dev 按 20 条）——盘点时按需 `bash scripts/radar.sh fetch <list> 30` 拉长期趋势素材，补进「趋势观察」
4. **合入状态追踪（命运追踪 / 队列状态 / 修复盘点）**：对本期报道过的补丁批量反查——`bash scripts/mirror-lookup.sh query <mid> [...]`（本地三镜像：mainline 是否合入+首发版本 / linux-next 是否排队 / stable 是否回移植+到哪些版本）。本地全历史（mainline 146 万 commit）、毫秒级、无 API 限流；镜像在 `/ws/dev/kernel-mirrors/{linux,linux-next,linux-stable}`，改动镜像后先 `mirror-lookup.sh index` 重建 mid 索引（一次性 ~4 分钟）。未命中 = 未合入 / 被后续版本取代 / 该 mid 引用不存在（如实标注）。结果补进「趋势观察」的『哪些进了 mainline / 哪些在排队 / 哪些已回移植』。**仅用于盘点/头条深挖**——当日 patch 因合入滞后（review→维护者树→next→merge window）几乎必未命中，别在日报强用
5. 按 `references/output-template.md` 的**盘点模板**成文：`<kernel-blog>/src/content/posts/YYYY-MM-DD-monthly-recap.md`（月报 `column: "monthly"` + 词表 `月度盘点/趋势观察/数据指标`；季/年报换对应 `column` 与词表，见模板表格）
6. **发布（双轨）**：网站可直接发布（commit 自动部署）；**公众号标题 + HTML 请示董事长确认后才发布**。盘点内容倾向性强、涉及付费转化，公众号发布前必须请示，属半自治红线

### 内核英语（english · 独立栏目，focus 制）
**定位**：用今日解锁的内核英文资料学英语——独立栏目（非日报周边），产出写 `<kernel-blog>/src/content/posts/english/`（子目录，URL 不受影响）。
1. **素材**：复用当天 radar/日报产物（真实补丁标题/术语/LKML 讨论）——**引用必带 lore 链接/Message-Id，无链接不落成文**（反编造护栏，r1 评审新增）
2. **选 focus（每日固定轮换，董事长定）**：6 维度循环 标题解析→术语卡→地道表达→阅读→写作→口语；今天 = 最近一篇英语文章 focus 的下一个（先看 src/content/posts/english/ 最新篇），不连续重复、不跳维；素材在轮换维度内取材；frontmatter 必含 `focus`
3. **成文**：按 `output-template.md` 内核英语模板（focus 制：主维度深挖 → 辅助彩蛋 1 条 → 练习 → closing 每日一句），tags = 主维度 + ≤1 辅助；**练习用 exercise 板块**（题目 text + 参考答案 answer + 原文贴出 source + 原文引用 link，点击展开）
4. **发布**：网站直接发布（commit 自动部署）；公众号如需走 render-wechat.mjs（已支持 english 子目录递归读取），上公众号需请示

## 分析规则
- **分档**（雷达式：先全内核扫 signal，再按重要程度定篇幅）：
  - 🏆 **头条**：**全内核当日最重要 1-2 条**（跨域机制 / 新框架 / 大系列 / 与你方向强相关），**不固定给某域**——当天最活跃的域出头条；展开成新闻稿式全文
  - ★ **亮点**：重要非头条，每域 ≤3 条，用「来龙去脉三段式」
  - ○ **常规动态**：其余只列一行标题，不展开；**全文 ≤2 组 more、每组 ≤8 条**——它是收尾，不是主体
- **section 开合条件**：某域当日有 signal（≥1 条可入亮点）才开 section；无 signal 的域整体并入机制雷达或省略。**宁可少而精：3 条讲透 > 15 条标题**（流水账是写作设计问题，不是源的问题）
- **系列识别（References 线程 · 天然划分话题，不做额外话题聚类）**：输出第 5 字段 `In-Reply-To`（父邮件）为空 = 新话题/系列首封，**优先看**；`[PATCH vN 00/M]` 系列头（cover letter）尤其优先——承载整个系列的设计意图；同 series 各封以首封为锚组织，不逐封重复列。跨列表已按 Message-Id（第 4 字段）去重
- **逻辑弧线**（读者是内核新人；六步按因果序展开，**前缀只用最简词语**，扫读即跟上，连贯性由固定顺序承担）：
  - 🏆 **头条**：六步弧线，前缀固定——
    ```
    现状：世界本来怎么运作（架构定位，查 references/architecture-map.md + 前情 + 术语一句话）
    痛点：现状哪里不行（为什么有人愿意动手）
    方案：这个补丁/机制是什么、干了什么
    为什么：设计取舍（为什么不选别的路）
    效益：谁受益 / 省了什么 / 能做什么了
    下一步：走向哪里（= 贡献机会所在）
    ```
  - ★ **亮点**：压缩弧线，前缀固定——`定位`（哪一层 + 什么问题）→ `做法` → `效益或下一步`（各一句话）
- **术语新人友好**：栏内首次出现的术语（v4l2_subdev / drm_bridge / serdes / media bus format…）括号内一句话解释
- **时间标注**（时效性显性）：每条信息标来源时间。脚本输出 `ISO时间|标题`（UTC），成文时转**北京时区（+8）**为 `MM-DD HH:MM`（更早条目可只给 `MM-DD`）。头条/亮点时间写标题行，常规动态用 `[MM-DD]` 前缀；简报标题注明「数据截至 MM-DD HH:MM 北京」
- **机制补丁**（新框架 / API 变更 / 重构）进「⚙️ 机制雷达」，永远优先于驱动小修
- **品牌铁律**：公众号文章品牌固定为「Linux内核玩家」（名称 / ID / 标题前缀 / CTA 见 `references/wechat-template.md` 〇 区），每篇必带，不得改动
- **原文链接**：头条 / ★亮点 / 📖概念速查 附「🔗 原文」链接（`时间|标题|链接` 第三字段，lore 消息页）；常规动态标题后附链接。公众号正文外链处理见 `wechat-template.md`
- **关键词**（命中 = 候选信号，再按分档判定是否 ★；机制重要但不命中同样升档。**左列 = 板块名，即日报词表标签**；括号内是 lore 源列表；sched 主线程靠 lkml、RT 侧靠 linux-rt-devel；driver-core 无专属列表，靠 lkml + 跨帖捕获）：
  - **筛选分层（板块 × 关键词 AND 化，机制级 > 驱动小修）**：**强信号 AND 组**命中 = 直接升档候选 ★——mm `folio AND (reclaim|LRU|swap)`；net `XDP AND (driver|offload|netfilter)`；media `(camera|sensor) AND (bug|fix|regression)`；sched `sched_ext|EEVDF|core scheduling`；通用：系列首封 + `[PATCH vN`。下表的板块关键词为弱信号 OR 组，命中即候选 signal，按架构重要度判定
  - media（linux-media）：camera / sensor / v4l2 / media / mipi / csi / gmsl / serdes / max967 / ds90ub / imx / ov / isp / subdev
  - DRM（dri-devel）：bridge / panel / connector / dsi / dp / hdmi / color / modeset / atomic
  - mm（linux-mm）：folio / THP / reclaim / LRU / MGLRU / page fault / vmalloc / slab / OOM / memory hotplug / compaction / migration / zswap
  - PCI（linux-pci）：PCIe / AER / BAR / MSI-X / SR-IOV / hotplug / D3cold / P2PDMA / VFIO / resizable BAR
  - net（netdev）：XDP / BPF / TCP / netfilter / nft / ethtool / DSA / page_pool / NAPI / phy / offload
  - fs（linux-fsdevel）：VFS / io_uring / page cache / overlayfs / btrfs / ext4 / xfs / bcachefs / readahead
  - virtio（virtio-dev）：virtio / virtqueue / vhost / VDUSE / packed ring / admin virtqueue
  - Rust（rust-for-linux）：rust / unsafe / kbuild
  - LSM（linux-security-module）：LSM / SELinux / AppArmor / lockdown / IMA / keys / landlock
  - block（linux-block）：block / NVMe / io_uring / dm / blk-mq / bio / biovec / device mapper
  - arch（linux-arch）：arm64 / riscv / arch / ACPI / EFI / errata / relocation
  - sched（跨域 · 主线程靠 lkml、RT 靠 linux-rt-devel + 跨帖）：sched_ext / EEVDF / CFS / deadline / RT / EAS / uclamp / core scheduling
  - driver-core（跨域 · 无专属列表，靠 lkml + 跨帖）：device model / bus / probe / component framework / workqueue / kthread
- 某来源失败 → 如实说明，不编造数据

## 输出模板（报纸式）
成文前**必读** `references/output-template.md`（含带填充示例的完整模板），按下述骨架组织、层级清晰：

📌 今日导读 → 🏆 今日头条 → 📰 当日有 signal 的域（media / DRM / mm / net / …）→ ⚙️ 机制雷达 → 📖 本期概念速查

（每周模板同文件，额外含「五、架构动向」节）

## Gotchas

### Gotcha: 直接用 patchwork/lore 的网页抓补丁 → 被 Anubis 反爬挡住
**为什么会踩**：patchwork.kernel.org / lore.kernel.org 的 HTTP 页面要求 JS 工作量证明，curl 只拿到挑战页，以为 200 就以为成功了。
**正确做法**：走 lore 的 **git 智能协议**（`https://lore.kernel.org/<list>/<shard>/`，绕开 Anubis；linux-media 与 dri-devel 均已由 lore 镜像，无需 freedesktop 通道）。全部封装在 `scripts/radar.sh` 里，别在简报时现拼。

### Gotcha: mail-archive.com 的 linux-media 镜像滞后数月
**为什么会踩**：第三方镜像便于上手，但停更严重（实测落后 2 个月+），拿它做"每日"等于看旧闻。
**正确做法**：实时性只看 lore git 通道和官方归档（本 skill 的 scripts 已处理），镜像仅作补充参考。

### Gotcha: `set -euo pipefail` 下任何 `producer | head/grep -m1` 都可能 SIGPIPE 全灭
**为什么会踩**：消费端（head/grep -m1）拿到首行就提前退出，上游 producer（git show / git log / cat）若输出 >64KB 继续写已关闭的管道 → SIGPIPE → pipefail 把管道置 141 → `set -e` 掐死整个脚本且零输出。这是同类坑第三次踩（先 `| head -N`、后 `grep -im1`），大补丁邮件（新驱动、>64KB）迟早触发。
**正确做法**：截断用 `sed -n`（读完整个流不早退）；取首行用「整份捕获到变量 + `${var%%$'\n'*}` 切片」；字段分隔用 `%x1f`。`scripts/radar.sh` 已全部遵守，写新脚本时照抄该模式。

## 参考
- `references/output-template.md` — **成文必读**：内容结构 → block type 映射指南（11 种板块 + 字段规则 + 示例）
- `references/wechat-template.md` — **公众号规格**：品牌/标题/摘要/封面/CTA 内容层规格（排版走 render-wechat.mjs，见工作流步骤 5）
- `references/platform-templates.md` — **多平台发布包**：微信/小红书/抖音/GitHub 四平台改写规则
- 仓库 blocks schema 与渲染：`<kernel-blog>/src/components/article/blocks/types.ts`（板块类型定义）+ `<kernel-blog>/scripts/render-wechat.mjs`（公众号内联 HTML）
- `scripts/radar.sh` — **抓取唯一入口**：`daily`（13 列表：12 按最近 24h〔lkml 限 400〕、virtio-dev 按 20 条，跨列表按 Message-Id 去重）· `fetch <list> [N|T<hours>[:<max>]]`（`T24:400` = 24h 窗口限 400 条）· `lwn [N]` · `shard <list>`；`daily`/`fetch` 每行输出 5 字段 `时间|标题|原文链接|Message-Id|In-Reply-To`，`lwn` 输出 `标题 — URL`
- `scripts/mirror-lookup.sh` — **本地三镜像补丁状态反查**（mainline 命运追踪 / next 队列状态 / stable 修复盘点）：`index` 建三仓库 mid→sha 全历史索引（~4 分钟，含 `[ Upstream commit <sha> ]` 回移植映射，索引存 `~/.cache/kernel-radar/mirror-*.tsv`），`query <mid> [...]` 反查毫秒级，版本定位用 `git name-rev`（快于 tag --contains 两个量级）。stable 判定：只有落到 `tags/vX.Y.Z`（stable 版本标签）才算回移植（master=mainline 快照，存在≠回移植）。**局限**：mid 引用级匹配，补丁重发改 mid 时用旧 mid 查 mainline 会未命中（如实标注）；当日 patch 合入滞后必未命中
- `scripts/mainline-lookup.sh` — **主内核合入状态反查（API 兜底版）**（Message-Id → mainline，patchwork API 被 Anubis 挡的替代通道）：`index [--pages N]` 用 GitHub REST API 拉 mainline 提交建 mid 索引缓存（提交体保留 `Link: lore.kernel.org/r/<mid>` trailer，实测 ~45% 可提取），`query <mid> [...]` 反查「这条合进去了没」；命中=已进 torvalds/linux（带 commit sha+主题+作者日期），未命中=未合入/被后续版本取代/超窗口（如实标注）。**用于周/月报命运追踪与头条深挖，不在日报强用**（当日 patch 合入滞后必未命中）。有本地镜像时优先 mirror-lookup.sh（全历史、无 API 限流），本脚本作无镜像/镜像过期时的兜底
- `scripts/weekly-radar.workflow.js` — 每周雷达并行搜索 workflow（Workflow 工具用）
- **飞书归档目录**（内容产出集合）：`Linux 内核日报 · 内容产出` · folder_token=`WTgQf90DEl8iPOdThX3cK3ronXg` · https://uq0ip8uep08.feishu.cn/drive/folder/WTgQf90DEl8iPOdThX3cK3ronXg —— **待接入**：目录与 lark-cli 认证已就绪，归档动作未实现，别把它当已完成的流程
- `references/architecture-map.md` — 领域架构地图：标注前先定位，回答「动了哪一层」
- `references/architecture-review-2026-08.md` — **四维架构审查档案（2026-08）**：数据源/mbox 实测、工具链评估（b4/hkml）、筛选 AND 化、线程 References 利用、改进路线图 P0-P2
- `references/contribution-guide.md` — **提交第一颗补丁前必读**：署名格式 / DCO / Subject 规则 / tag 链 / checkpatch / 新人坑（含真实补丁示例）
- `references/growth-log.md` — 撞到的坑（append-only）
