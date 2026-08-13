---
title: "DeepSeek 开源 Harness：竞争从模型层卷到执行层"
date: "2026-08-14"
desc: "V4 Pro 更强的模型 + Harness 让模型真正开始工作——DeepSeek 首次把手伸到执行层，AI Coding 的竞争进入「模型 + 执行框架」双线时代。"
column: "journal"
tags: ["笔记"]
blocks:
  - type: hook
    text: >-
      过去一年，AI 圈比的是模型谁更强；昨晚 DeepSeek 开源了 <strong>DeepSeek Harness（DSH）</strong>——第一次把手伸到「模型输出之后」的执行层。模型决定智能上限，<mark>Harness 决定实际表现</mark>，竞争的战场正在切换。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-14/dsh-cover.png"
    alt: "封面 · DeepSeek 开源 Harness：从模型层卷到执行层"
  - type: divider
    label: "🎯 核心判断"
    kind: primary
  - type: toc
    items:
      - label: "事件"
        text: "8 月 13 日 DeepSeek 连发两件事：V4 Pro 正式版 + 开源 Agent Harness（DSH）开发者预览版"
      - label: "本质"
        text: "DSH 不是新模型，而是把模型接入文件系统/终端/网页/工具/子 Agent 的执行框架——DeepSeek 自己的 Vibe Coding 入口"
      - label: "信号"
        text: "模型竞赛打了一年多后，DeepSeek 把战场拉到了执行层：同一模型放进不同 Harness，表现可以肉眼可见地不同"
  - type: divider
    label: "🔍 事件还原：两天，两块拼图"
    kind: primary
  - type: paragraph
    text: >-
      8 月 13 日早些时候，<strong>DeepSeek-V4-Pro</strong> 正式上线 App/Web/API（模型号 DeepSeek-V4-Pro-0813）：1M Token 上下文、最高 384K Token 输出，官方重点强调 Agent 能力——Terminal Bench 2.1 达 87.9，DeepSWE 62.7，Toolathlon-Verified 74.1，DSBench-FullStack 71.1。当晚，<strong>DeepSeek Harness</strong> 开源发布，<code>npx @deepseek-ai/dsh web</code> 即可本地起 Web UI（GitHub：<a href="https://github.com/deepseek-ai/deepseek-harness">deepseek-ai/deepseek-harness</a>）。
  - type: paragraph
    text: >-
      这其实早有预兆：7 月 31 日 V4 Flash 发布时，更新日志里就埋着一行——公开 Code Agent benchmark 使用的测试框架，正是「即将发布」的 Harness 极简模式。也就是说，Harness 在正式公开之前，已经在参与评估 DeepSeek 自己模型的 Agent 能力了。
  - type: divider
    label: "🧩 源码架构拆解：七层 + 一条闭环"
    kind: primary
  - type: paragraph
    text: >-
      架构分析直接读 <code>@deepseek-ai/dsh 0.1.0-rc.6</code> 源码，不走文档转述。从宏观到微观，DSH 分<strong>七层</strong>——入口（dsh CLI）→ Profile 层（插件组合包）→ 插件宿主（Cordis）→ 核心运行时（dsh-base）→ 工具面 → 模型适配 → 持久化；一条任务沿这条链路跑一个闭环，事件全程落盘、可重建。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-14/architecture.png"
    alt: "DSH 源码架构图：七层架构 + Agent 闭环拓扑"
  - type: highlight
    title: "宏观 · 七层架构（源码实证）"
    meta: "〔dsh-base = 77 插件按域组合〕"
    points:
      - label: "入口 + Profile"
        text: "dsh CLI 用 --profile 选插件组合包：headless = base+headless、web = base+web-app；配置树 = bundles patch → 用户覆盖，层层叠加"
      - label: "宿主 + 运行时"
        text: "Cordis 管依赖注入与插件生命周期；dsh-base 承载 Agent Loop、Session 事件溯源、LLM 服务、工具注册、沙箱/权限"
      - label: "工具 + 模型 + 持久化"
        text: "工具面 fs/bash/web/subagent/skill/todo 挂钩真实环境；模型适配固定 deepseek-official（v4-flash，OpenAI 兼容）；session.jsonl.zstd 全量落盘"
  - type: highlight
    title: "微观 · 一条 Agent 闭环"
    meta: "〔实测 session 事件流〕"
    points:
      - label: "任务入环"
        text: "用户任务 → 收件箱（inbox）→ Agent Loop：每 step 先模型调用生成 tool_calls，再调度工具执行（串行/并行组），结果回填进下一步"
      - label: "门禁"
        text: "工具执行前过沙箱/审批（实测 preset=workspace-write、policy=ask）；权限变化、上下文压缩都写进日志"
      - label: "落盘"
        text: "循环直至 finish；用户消息/模型请求/工具调用/结果全程写入 Session Log——可恢复、可回放、可审计"
  - type: quote
    text: >-
      Everything is a plugin——模型、文件系统、Shell、网页、Skill、子 Agent、交互界面全可替换；预设（标准/PTC/极简/创造）和形态（Web/TUI/Headless/ACP/SDK）只是同一套底层的不同组合。但读源码后最硬的一条判断：DeepSeek 的 V4 在公开 Code Agent benchmark 上用的就是 Harness 自己——<mark>模型和执行层是同一套体系联合设计，不是配套，是同源焊接</mark>。
  - type: divider
    label: "⚔️ 竞争格局：执行层开战"
    kind: primary
  - type: toc
    items:
      - label: "Claude Code"
        text: "Anthropic 的<strong>完整产品</strong>：造好一辆车给你开，多 Agent 编排 + Skill + 后台任务已成熟——AG 公司 11 个 bot 的编排底座就是同类 harness"
      - label: "Codex"
        text: "OpenAI 把 Agent Loop 称作 Codex Harness，桌面端加入多 Agent 并行、Skills、Automations、computer use——同样是<strong>产品</strong>"
      - label: "DSH"
        text: "DeepSeek 给的是<strong>发动机和底盘图</strong>：全开源、一切可拼、连 Agent Loop 都可替换——不是「DeepSeek 版 Claude Code」，而是可以自己造车的执行层基建"
  - type: divider
    label: "🔬 为什么 Coding 是试金石"
    kind: primary
  - type: paragraph
    text: >-
      AI Coding 正成为观察与训练 Agent 能力最理想的场景：代码反馈密集且客观——能不能编译、测试过不过、报错是什么，机器可直接验证，Agent 得以形成「执行→反馈→修改→再执行」的闭环。而 DSH 的 Session Log 要求「模型真正看到的一切都能从日志重建」（用户消息 / 模型请求 / 工具调用 / 上下文压缩 / 权限变化）：既能恢复、回放、调试、审计，也让 Agent 执行过程第一次变得可系统化记录与分析——这正是评估 Agent 能力的实验场。
  - type: divider
    label: "🎯 对我们的启示"
    kind: primary
  - type: toc
    items:
      - label: "实践者"
        text: "同一模型放进不同 Harness，表现差异明显——选执行框架，和选模型一样重要"
      - label: "判断标准"
        text: "看三件事：上下文如何组织、工具调用是否稳定、Session Log 能否可审计——这决定了 Agent 实际好不好用"
      - label: "AG 公司"
        text: "我们自己的编排就跑在同类 harness 上；执行层正在成为新的差异化战场，值得持续追踪"
  - type: closing
    tagline: "模型决定智能的上限，Harness 决定它能否真的开始工作。"
    source: "数据来源：DeepSeek 官方（GitHub / npm / api-docs 更新日志）· 追踪视角"
---
