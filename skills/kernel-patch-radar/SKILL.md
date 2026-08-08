---
name: kernel-patch-radar
version: 0.8.3
description: "Use when the user wants a daily or weekly digest of Linux kernel mailing-list patch activity — patch series, RFCs, subsystem discussion. Focus: video/camera (linux-media) + display/DRM (dri-devel) daily, mm/sched/pci radar weekly. Triggers on '今天内核有啥动态'、'补丁简报'、'看下 linux-media 的补丁'、'追踪内核邮件列表'、'patch digest'、'kernel patches today'、'每周内核雷达'. Fetches via scripts/radar.sh (lore git, bypasses Anubis), analyzes by architecture layer, outputs blocks articles (blog + 公众号 same source)."
---

# kernel-patch-radar — Linux 内核补丁/社区动态追踪

**职责**：把「每日补丁简报 + 每周全局雷达」的流程固定下来。**抓取全在 `scripts/`（确定性脚本），Claude 只做分析、标注、成文。** 分析默认走「架构优先」视角：每条亮点补丁说清「动了哪一层 + 为什么」，机制级改动优先于驱动小修。

## 什么时候触发
用户要看内核邮件列表动态，或 cron 定时任务触发（提示词写「运行 skill kernel-patch-radar」）。

## 工作流

### 每日简报（linux-media + dri-devel）
1. `bash scripts/radar.sh daily 40` → 分节输出（`## linux-media` / `## dri-devel`，每行 `ISO时间|标题|原文链接`）
2. 标注前**先翻 `references/architecture-map.md`** 给每条亮点补丁做架构定位
3. 按「分析规则」标注、按 `references/output-template.md` 的 blocks 映射组织内容结构
4. **成文为 blocks 文章文件**：产出**完整的博客文章文件** `<kernel-blog>/src/content/posts/YYYY-MM-DD-slug.md`（frontmatter 含 `title`/`date`/`desc`/`tags`/`blocks`）。**YAML 硬规则**（所有字符串值加双引号、`---` 收尾、缩进 2 空格）与自查命令见 skill `wechat-article` 的 SKILL.md——写完后必须跑自查确认 js-yaml 可解析。核心简报 = 该文件的 blocks 内容
5. **公众号封面**：wechat-article 的 `generate-cover.sh` 生成紫色封面（默认 `--style blog`），标题/摘要/封面规格按 `references/wechat-template.md`；`npm run oss cover.png kernel-blog/YYYY-MM-DD/cover.png` 传 OSS（可选）
6. **公众号 HTML + 董事长审阅**：`cd <kernel-blog> && npm run build && node scripts/render-wechat.mjs YYYY-MM-DD --out` 生成内联 HTML；**用 cc-connect 把公众号标题 + 封面发给董事长审阅**（和发截图一样简单）：
   ```bash
   cc-connect send --image <封面> --message "📢 公众号审阅 · Linux内核玩家 · MM月DD日｜<头条钩子>"
   ```
   等董事长确认后再发布
7. **发布**：`git add -A && git commit -m "..." && git push`（post-commit hook 自动 build+rsync 上线）；其余平台读 `references/platform-templates.md` 产小红书帖 / 抖音脚本 / GitHub 日报 md，随文章文件一并输出；图形走飞书画板、视频走外部工具，本步只做文字

### 每周雷达（mm/sched/pci + LWN）
1. 用 Workflow 工具**以 `scriptPath`** 运行 `<本 skill 目录>/scripts/weekly-radar.workflow.js`（并行 3 个 agent 搜 mm/sched/pci 近期重点）——**不要用 `name:`**，该文件未注册到 `~/.claude/workflows/`
2. `bash scripts/radar.sh lwn 10` → 本周 LWN 标题（⚠️ LWN 部分文章有订阅墙，标题可抓、正文可能需订阅，成文时如实处理）
3. **成文为 blocks 文章**（与每日同格式，可上博客/公众号）：`<kernel-blog>/src/content/posts/YYYY-MM-DD-weekly-radar.md`（frontmatter 含 title/date/desc/tags/blocks，结构见 `output-template.md` 每周模板；YAML 硬规则同每日）
4. **发布与审阅同每日**：`npm run build && node scripts/render-wechat.mjs` → 用 cc-connect 发标题+封面给董事长审阅 → 确认后 `git commit/push` 上线

## 分析规则
- **分档**（像报纸：重要程度决定篇幅）：
  - 🏆 **头条**：今日最重要 1-2 条（新框架 / 大系列 / 与你方向强相关），展开成新闻稿式全文
  - ★ **亮点**：重要非头条，每栏目 ≤3 条，用「来龙去脉三段式」
  - ○ **常规动态**：其余只列一行标题，不展开
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
- **关键词**（命中升档为 ★）：linux-media：camera / sensor / v4l2 / media / mipi / csi / gmsl / serdes / max967 / ds90ub / imx / ov / isp / subdev / virtio；dri-devel：bridge / panel / connector / dsi / dp / hdmi / color / modeset
- 某来源失败 → 如实说明，不编造数据

## 输出模板（报纸式）
成文前**必读** `references/output-template.md`（含带填充示例的完整模板），按下述骨架组织、层级清晰：

📌 今日导读 → 🏆 今日头条 → 📰 栏目（linux-media / dri-devel）→ ⚙️ 机制雷达 → 📖 本期概念速查

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
- `scripts/radar.sh` — **抓取唯一入口**：`daily`（linux-media + dri-devel 分节）· `fetch <list> [N]` · `lwn [N]` · `shard <list>`；`daily`/`fetch` 每行输出 `时间|标题|原文链接`（三字段），`lwn` 输出 `标题 — URL`
- `scripts/weekly-radar.workflow.js` — 每周雷达并行搜索 workflow（Workflow 工具用）
- **飞书归档目录**（内容产出集合）：`Linux 内核日报 · 内容产出` · folder_token=`WTgQf90DEl8iPOdThX3cK3ronXg` · https://uq0ip8uep08.feishu.cn/drive/folder/WTgQf90DEl8iPOdThX3cK3ronXg —— **待接入**：目录与 lark-cli 认证已就绪，归档动作未实现，别把它当已完成的流程
- `references/architecture-map.md` — 领域架构地图：标注前先定位，回答「动了哪一层」
- `references/contribution-guide.md` — **提交第一颗补丁前必读**：署名格式 / DCO / Subject 规则 / tag 链 / checkpatch / 新人坑（含真实补丁示例）
- `references/growth-log.md` — 撞到的坑（append-only）
