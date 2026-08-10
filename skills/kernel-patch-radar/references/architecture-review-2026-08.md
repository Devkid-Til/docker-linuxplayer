# LKML 雷达系统四维全面审查报告

**日期**：2026-08-08　**审查对象**：`kernel-patch-radar` skill 的抓取（`scripts/radar.sh`）+ 分析标注 + 五档报告生成链路
**审查方式**：实测探测（lore git 协议 / mbox 端点 / b4 路径 / blob 内容）+ 社区工具调研（b4 / hkml / lei / patchwork）+ 全链路架构梳理

---

## 0. 总评

**系统的方向正确、通道选型可靠**：lore 官方 git 协议是唯一无 JS 可稳定访问的官方通道，我们的选型就是官方推荐路径，且已封装出分片自适应 + 重试的健壮抓取。

**真正的短板不在"抓不到"，而在"抓到了没用好"**：
1. 跨列表**重复内容没有去重**（同一 patch series 抄送 lkml + netdev + linux-mm，13 源会重复出现）；
2. **线程上下文（References 头）底层数据完全具备、但没有提取**——每条邮件被孤立展示，系列首封 / cover letter 没有优先呈现；
3. **单点依赖 lore git 协议**，无第二通道兜底。

---

## 1. 数据源与抓取方式

### 1.1 当前数据源（官方，URL 实名）

| 通道 | URL | 状态 | 说明 |
|---|---|---|---|
| **git 智能协议** | `https://lore.kernel.org/<list>/<shard>/`（shard 0..60 自动探测） | ✅ 实测可用、实时 | lore 官方镜像（Linux Foundation 基础设施，public-inbox 实例）。`radar.sh` 全量走此通道：浅克隆 `--depth` + 连续 2 次未命中即停的分片探测 + 3 次退避重试 |
| **HTTP 消息页** | `https://lore.kernel.org/<list>/<mid>/` | ❌ Anubis 挡 | HTTP 200 但返回 JS 挑战 HTML（约 7436 字节），curl 拿不到真实内容 |
| **mbox 端点** | `https://lore.kernel.org/<list>/<mid>/t.mbox.gz`、`/<shard>/mbox.gz` | ❌ Anubis 挡 | 实测同样返回挑战页，**并非董事长设想的可用接口** |

### 1.2 关于 mbox 接口的结论（纠正前提）

董事长审查前提是"当前是否使用 `/t.mbox.gz`、若用 HTML 解析则评估迁移到官方 MBOX"。**实测结论：当前既不用 HTML、也不用 mbox——mbox 接口和 HTML 页面一样被 Anubis 封锁，两者对无 JS 客户端都不可用。** git 智能协议是 lore 官方保留的免 JS 通道，我们当前的设计就是正确且唯一稳定的选择。**不存在"迁移到 mbox"的路径，因为 mbox 本身不可用。**

补充探测：b4 使用的 `https://lore.kernel.org/all/<mid>/T/<mid>/t.mbox.gz` 返回 HTTP 404（歧义：Anubis 对该路径 404，或测试用的旧 mid 不在 `/all/` 聚合内）。但即便该路径可用，其语义是"拉单条 patch 的完整线程"，与"雷达批量抓取"诉求不同——**抓取层不依赖它，结论不受影响**。

### 1.3 长期维护风险

- **低风险**：lore 是 kernel.org 官方托管、由 Konstantin Ryabitsev（内核邮件基础设施维护者）持续维护，git 协议明确不对免 JS 客户端设挑战；已有分片自动探测，列表改名/新列表仅需更新 SET 映射表。
- **需关注**：lore 若未来调整分片机制或 git 通道策略，我们的探测逻辑需同步——但这是官方基础设施的极端情形。
- **第三方镜像（mail-archive.com 等）已实测滞后数月**，不作为数据源，仅参考。

---

## 2. 工具链与解析逻辑

### 2.1 社区工具评估：b4 / hkml / lkml-reader

| 工具 | 作者/现状 | 定位 | 适配度 |
|---|---|---|---|
| **b4** | K. Ryabitsev，v0.15.2（2026 活跃） | 补丁**工作流**工具：`am`/`shazam`/`mbox`，从 lore 拉完整线程、验证签名、生成补丁系列 | ⚠️ 面向"人收 patch / 发 patch"，不适合无人值守雷达抓取。**按需集成价值高**：深挖单条时 `b4 mbox <mid>` 拉全线程 |
| **hkml** | SeongJae Park（DAMON 维护者），FOSDEM'25，写入内核 `Documentation/process/email-clients.rst` | 交互式读列表/写补丁 | ⚠️ 偏个人交互，不适合 cron 批量。它的"只依赖 git"设计与我们同源（都因 Anubis 被迫走 git） |
| **lkml-reader** | 社区小项目，活跃度低 | 读 lkml 归档 | ❌ 信息不足、不成熟 |

**结论：不引入社区工具替代自写解析。** 我们的需求是"确定性、批量、无人值守、结构化输出"，自写 `radar.sh`（bash + git plumbing）是最合适的；b4 作为**深度分析时按需调用**的工具（拉线程/验签名）保留备用。

### 2.2 mbox 解析难点与当前规避

自行解析 mbox 的真实难点（社区踩坑常见）：

1. **邮件头变体**：大小写（`Message-ID:` vs `message-id:`）、折叠头（continuation line）、首尾空白——自写 parser 需处理全部变体。
2. **RFC2047 编码主题**：非 ASCII 主题 `=?utf-8?q?...?=` 需解码，否则乱码。
3. **多部分 MIME / boundary**：解析 body 时需拆 MIME 结构，否则被边界线污染。
4. **PGP / patatt 签名**：正文尾部签名块、内嵌 PGP 头，统计/关键词扫描易误判。

**当前如何规避（实测有效）**：
- 主题不解析 mbox——直接用 `git log --format=%s`，**git 已完成 RFC2047 解码 + 头标准化**（实测中文主题输出干净 UTF-8）；
- 只读 `blob :m` 的 `Message-Id` 头（`sed` 正则提取），**不碰 body**——MIME/PGP/多部分问题天然不存在；
- 唯一的真实脆弱点：`git show <hash>:m` **逐条启进程**取 Message-Id，千条级时有进程开销（见 §4.2 提速建议）。

### 2.3 工具链改进方向

- 用 `git cat-file --batch` 批量读 blob 替代逐条 `git show`（快一个数量级，且规避 SIGPIPE 面）；
- 若未来要正文级关键词扫描（现在不需要），再考虑引入 mbox 专用 parser——当前"只读头"设计已规避大部分难点。

---

## 3. 筛选策略与报告生成

### 3.1 现状（如实说明）

**雷达不筛、全量抓，Claude 分析时按板块关键词表 + 架构优先判定。** 即：`radar.sh` 只保证"把 24h / N 条的完整候选抓到"，真正的筛选发生在分析环节。这不是简单的"单关键词 OR"——它是"板块（13 板块锚点）+ 关键词（每板块一组）+ 机制重要度（架构层判定）"的多维判定，但**没有落到确定性规则**，依赖分析时的判断。

### 3.2 建议：子系统 × 关键词 AND 化（精确匹配）

给强信号定义 **板块 × 关键词的 AND 组合**（把"机制级补丁"与"驱动小修"自动分层）：

| 板块 | AND 组合示例（板块内） | 升档理由 |
|---|---|---|
| mm | `folio` AND（`reclaim`\|`LRU`\|`swap`） | folio 大系列 + 回收语义 = 机制级 |
| net | `XDP` AND（`driver`\|`offload`\|`netfilter`） | XDP 挂载点改造 |
| media | （`camera`\|`sensor`） AND（`bug`\|`fix`\|`regression`） | 采集链路修复 = 高价值信号 |
| sched | `sched_ext` \| `EEVDF` \| `core scheduling`（直接升档） | 重调度器级 |
| 通用 | `[PATCH vN` AND（`series/cover`\|`RESEND`） | 系列推进信号 |

实现上：把 AND 组合写进 SKILL.md 关键词表（分"强信号 AND 组"与"弱信号 OR 组"两层），分析时先过 AND 再判分档。

### 3.3 五档差异化权重（避免各周期报告雷同）

| 报告 | 驱动 | 关键词权重 | 时间窗口 |
|---|---|---|---|
| 日报 | **事件驱动**：当天 merge / bugfix / regression / RFC | 重 `fix`、`regression`、`v2`、`RFC` | T24（已统一语义 = 昨天一整天） |
| 周报 | **演进驱动**：跨周反复出现的主题 / 被催的 series / mm·sched·pci 机制 | 重跨周重复出现的主题、`series` 推进 | 近 7 天 |
| 月/季/年报 | **趋势+指标驱动**：补丁量变化 / 新子系统 / API 迁移 / 维护者动态 | 重 `migrate`、`rewrite`、`remove`、`deprecate`、`new API` | 盘点当期 |

现状：五档已按"事件/雷达分章/盘点回顾"三种内容类型区分（不是换标签），但**关键词权重未显式分层**。建议把上表的权重差异写进 SKILL.md，让分析时"日报讲事件、盘点讲趋势"有据可依。

---

## 4. 整体架构与遗漏风险

### 4.1 遗漏资源识别

1. **跨列表去重（最值得做）**：同一 patch series 常抄送多个列表（lkml + 板块列表），13 源抓回后**按 Message-Id 去重**，并优先保留板块专属列表的版本（板块信号更纯）。当前未做。
2. **patchwork.kernel.org（补丁状态维度）**：内核补丁追踪系统，能给出"这条 applied / merged / rejected"状态——日报可加"进展到哪了"，是深度的差异化价值。Anubis 同样挡 HTTP 页，需走其 git 或 API（patchwork 有 git 镜像）。
3. **lei（public-inbox 本地索引）**：可在本地做 lore 的长期镜像 + 历史全文搜索，月度盘点的"长期趋势素材"可直接查本地，不依赖在线拉取。
4. **References 线程上下文（数据已有、未提取）**：见 §4.4。

### 4.2 性能瓶颈（实测数据）

- 13 源 T24 全量：**6 分 15 秒**；lkml（1200 条，depth 截断）是绝对大头。
- **已落地 lkml `T24:400` 后单源 24 秒**，全链路预计降到 2-3 分钟（实测 lkml 恰好打满 400，说明软上限在正确位置）。
- 剩余优化：`git show` 逐条取 Message-Id → `git cat-file --batch` 批量（千条级提速 ~10×）。
- 日均 1400+ 邮件规模下，当前架构无瓶颈——抓取 2-3 分钟、分析靠模型、产出受限 ≤60 行可读文本，量级远未到压力点。

### 4.3 Message-Id 断裂分析

- **成因**：shallow clone（`--depth`）深度截断 → 线程里 References 指向的父邮件可能不在浅克隆内 → 跨天/跨周线程会断。
- **影响评估**：日报是"当天快照"，断裂影响小；但系列中间件（如 `[PATCH v3 5/10]`）与跨周线程会缺上下文。
- **缓解**：快照性质接受；需要完整线程时用 `b4 mbox <mid>` **按需**补全（而不是雷达全拉）。

### 4.4 References 线程利用（低成本高价值）

**实测证实**：`git show <hash>:m` 的 blob 是**完整 RFC822 原始邮件**——已验证包含 `References:`、`In-Reply-To:`、`Message-Id:`、Return-Path、Received、DKIM 校验头。**底层线程数据 100% 具备，只是脚本没提取。**

建议改造（改动极小）：
- `_do_fetch` 输出新增第 4 字段：本邮件的 `In-Reply-To`（父邮件 mid）；
- 分析时标记「系列首封 / cover letter」（`In-Reply-To` 为空 + `[PATCH N/M]`）优先呈现；
- 配合 Message-Id 去重，同一 series 只出现一次、以系列头为锚。

### 4.5 长期最大风险（综合排序）

| 风险 | 等级 | 缓解 |
|---|---|---|
| **1. 单一数据通路依赖（lore git 协议）**：外部策略不可控，lore 若调整 git 通道则全链断供 | 高 | lei 本地镜像缓存（第二通道）；分片探测自适应已做 |
| **2. 分析质量依赖模型而非确定性规则**：每日 400-900 条候选交给分析时筛选，有漏报/误报可能 | 中高 | 关键词 AND 化 + 高频列表限流（已做 lkml）+ 可复现的 signal 判定表 |
| **3. 跨列表重复内容稀释 signal** | 中 | Message-Id 去重（P0） |
| **4. Anubis / 反爬策略演进** | 中 | git 通道是 lore 官方保留，风险低；持续关注 |
| **5. 列表元数据变化**（改名/新增/分片） | 低 | SET 映射表 + 分片探测 |

---

## 5. 改进路线图

| 优先级 | 项 | 状态 |
|---|---|---|
| **P0** | lkml `T24:400` 软上限（防噪音洪水，提速 15×） | ✅ 已落地（董事长批准，保留意见持续跟踪——若当日重要 series 超限导致漏报，可 `daily T48` 或 `fetch lkml T24:800` 提额） |
| **P0** | Message-Id 跨列表去重（13 源按第 4 字段去重，板块专属优先、lkml 广播源放最后） | ✅ 已落地（2026-08-08） |
| **P1** | References 线程提取 + 系列首封优先（输出第 5 字段 `In-Reply-To`，parent 空 = 系列首封/新话题；SKILL 分析规则已加系列识别） | ✅ 已落地（2026-08-08） |
| **P1** | `git cat-file --batch` 批量提速 | ⚠️ **实测否决**：450 封 `git show` 循环实测仅 1.5s（占全链路 <2%），复杂换 1 秒不值 |
| **P2** | patchwork 补丁状态接入（applied/merged 维度） | ✅ **已实现（2026-08-08，通道换向）**：patchwork REST API 实测被 Anubis 挡（HTTP 200 挑战页）→ 改用**内核提交体保留的 `Link: lore.kernel.org/r/<mid>` / `patch.msgid.link/<mid>` trailer** 反查 mainline 合入状态——`scripts/mainline-lookup.sh`（GitHub REST API 拉提交建 mid 索引缓存，实测 ~45% 非 merge 提交带可提取引用；git.kernel.org 浅克隆超时/GitHub git 协议不稳，REST API 是本环境唯一稳定通道）。命中=已进 torvalds/linux（带 commit sha+主题+作者日期），未命中=未合入/被后续版本取代/超窗口（如实标注）。**用途定位：周/月报命运追踪 + 头条深挖，不在日报强用**——当日 patch 因合入滞后（review→维护者树→next→merge window）几乎必未命中 |
| **P2** | lei 本地镜像 + 月度盘点长期历史查询 | ⬜ 暂缓（需装 lei/public-inbox 做全量镜像，对低频列表过度工程） |
| **P2** | b4 按需拉全线程做深度分析 | ⬜ 暂缓（工作流层动作，分析需要时手动 `b4 mbox <mid>`，无需改脚本） |

> **话题分割说明**：References 天然把邮件划分成系列（话题），已用第 5 字段承载，**不做额外的话题聚类**——节省了原本的"从散邮件拼话题"成本。板块（子系统）维度仍由列表划分承担，两者互补不冲突。

---

*归档：本报告为系统架构审查快照，结论基于 2026-08-08 实测数据（lore 通道探测 / 13 源抓取 / blob 内容验证）。*
