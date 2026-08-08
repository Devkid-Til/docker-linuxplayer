# Growth Log — kernel-patch-radar 撞到的坑

**规则**：append-only，最新在下。够 3 条考虑升级到 `SKILL.md` 的 Gotchas。

格式：
```
## YYYY-MM-DD — <一句话症状>
**上下文**：
**表现**：
**根因**：
**修复**：
**元教训**（可选）：
```

---

## 2026-08-05 — 脚本 `| head -N` 在 `set -euo pipefail` 下触发 SIGPIPE，整个脚本静默失败
**上下文**：写 fetch-dri-devel.sh，末尾用 `| head -$N` 截断输出，脚本顶部有 `set -euo pipefail`。
**表现**：脚本退出码 141、零输出；手动跑同一条管道（不带 pipefail）却正常。排查时发现连 `latest` 检测那步的 `| head -1` 都会让 `set -e` 掐死脚本。
**根因**：`head` 消费完 N 行就提前退出 → 上游 producer 写管道拿到 SIGPIPE → `pipefail` 让管道退出码变 141 → `set -e` 判定失败直接退出。`| head` 在 `set -euo pipefail` 下是反模式。
**修复**：（1）截断改用 `sed -n "1,${N}p"`（读完整个流，不早退，无 SIGPIPE）；（2）取「第一行」改用变量捕获整份输出 + `${var%%$'\n'*}` 切片，不经过管道截断。
**元教训**：**凡 `set -euo pipefail` 脚本，`head`/`grep -m1` 作为管道消费端都可能把管道退出码带成 141——"明明有输出却报失败"优先查这里。**

---

## 2026-08-05 — 用户反馈首份简报「太笼统、看不懂」：缺来龙去脉 + 结构不清
**上下文**：kernel-patch-radar 首个样张（v0.1）发出后，用户（内核新人）反馈。
**表现**：简报罗列补丁标题 + 层/为什么两行，但没讲清每条补丁的来龙去脉（背景/前情/术语），新人看不懂；格式是 bullet 列表，不像每日报刊那样层级清晰。
**根因**：v0.1 模板只定义了「列什么」，没定义「讲到什么深度」和「怎么组织层级」；假设读者已懂子系统上下文，实际读者是内核新人。
**修复**：输出模板重做——报纸式（📌导读 → 🏆头条 → 📰栏目 → ⚙️机制雷达 → 📖概念速查）；亮点补丁固定「背景/干了什么/为什么重要」三段式（后演化为六步弧线）；术语首次出现给一句话解释；完整模板 + 填充示例移入 `references/output-template.md`。
**元教训**：**面向新人读者的简报，「背景」不是可选项而是必需品——任何补丁都要回答「这是哪一层、之前发生过什么、为什么现在动它」。**

---

## 2026-08-05 — 对抗式 review（r1）抓到：SIGPIPE 坑只修了一半 + 三处「文档声称 > 实际落地」
**上下文**：用 adversarial-review skill 派独立 subagent 冷启动评审 v0.8.0。
**表现**：（1）`grep -im1` 提取 Message-Id 与 `| head` 同属早退消费端，>64KB 大邮件下 git show 可能 SIGPIPE→141 全灭——**同类坑第三次踩**；（2）`daily` 单源失败整体中断，健康源数据被丢弃；（3）description/Gotcha 引用不存在的 `scripts/fetch-*.sh` 与未启用的 freedesktop 通道；（4）weekly workflow 未注册、飞书归档有目录无动作。
**根因**：脚本修复只针对当时抓到的具体用法（`| head`），没提炼成「早退消费端一律禁用」的通用规则；文档随实现演进滞后；「待接入」能力写进了参考区被当成已实现。
**修复**：radar.sh 全量改用 sed-读完流 + 变量切片 + `%x1f` 字段分隔；`_do_daily` 逐源 `if !` 隔离；SKILL.md description/Gotcha 统一为 `radar.sh`、删除 freedesktop 声称、workflow 注明 `scriptPath`、飞书归档标注「待接入」；SIGPIPE 规则升级为 SKILL.md Gotcha。
**元教训**：**「坑修了具体那一处」≠「反模式被消灭」——修完要提炼成一条可复用的通用规则（本条已升级 SKILL.md Gotcha）。文档声称必须≤实际落地，半成品一律标「待接入」。**

## 2026-08-08 — 产出物从"扁平简报"升级为"blocks 文章"，与博客渲染体系并轨
**上下文**：正文模板系统上线（博客 Astro 组件 + 公众号 render-wechat.mjs 双端同源），wechat-article v0.7.0 已改产 blocks。
**表现**：本 skill 的 output-template 仍是 emoji+加粗的扁平 markdown 简报，AI 不知 headline/highlight/toc/closing 类型；SKILL.md 仍让 AI 读已废弃的 html-fragments.md/template.html；每日流程没有产出博客文章文件的环节 → 日报成文即"low 感"源头。
**根因**：skill 的内容结构（六步弧线/压缩弧线/速查）本就与 blocks 一一对应，但没做显式映射；排版职责从"wechat-article 手写 HTML"迁移到"脚本渲染"，引用未同步。
**修复**：output-template.md 重写为「内容结构 → block type」映射指南（含 blocks 骨架示例）；SKILL.md 工作流第 4-6 步改为：产出 blocks 文章文件 → render-wechat 出公众号 HTML → 其余平台；wechat-template.md 职责边界与样稿引用同步；description 更新。
**元教训**：**内容结构设计得再对，只要产出物还是松散格式，渲染层再精修也白搭——成文格式必须在产出 skill 里显式固化。**
