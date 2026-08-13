---
title: "DeepSeek Harness 实测：真能自己改代码跑测试"
date: "2026-08-14"
desc: "DeepSeek 开源 Agent Harness(DSH)。我用官方 headless 模式真跑了一单修 bug 的任务:读文件→改代码→跑命令→验证,全程自主完成。这篇手记讲它是什么、架构怎么设计、实测结果,以及和 Claude Code 怎么比。"
column: "journal"
tags: ["笔记"]
blocks:
  - type: hook
    text: >-
      8 月 13 日 DeepSeek 开源了自家 Agent Harness(DSH)。我当晚装上真跑了一单修 bug 的任务——它自己读文件、改代码、跑测试、验证结果,全程没等我。这篇手记是我的实测记录,外加几个值得留意的观察。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-14/cover.png"
    alt: "封面 · 8月14日 · DeepSeek Harness 实测"
  - type: divider
    label: "📌 它到底是什么"
    kind: primary
  - type: paragraph
    text: >-
      先划清边界:DSH <strong>不是新的基础模型,也不是 API 客户端</strong>。它是把模型接入文件系统、终端、网页、代码工具,并负责上下文组织、工具调用、任务执行的<strong>一套 Agent 运行框架</strong>——也就是常说的「执行层」。一句话:传统聊天模型负责「给答案」,Harness 负责「进仓库干活」。
  - type: divider
    label: "🧩 架构：一切皆插件"
    kind: primary
  - type: highlight
    title: "Everything is a plugin —— 连 Agent Loop 本身都可替换"
    meta: "〔官方文档〕基于 Cordis · profile = 插件组合包 patch 层叠加"
    points:
      - label: "插件化"
        text: "模型适配器、工具注册、Session Log、安全策略,甚至 Agent Loop 本身,都被设计成可替换的插件;模型/文件系统/Shell/网页/子 Agent/Skill 都能通过配置重新组合。"
      - label: "Profile 分层"
        text: "配置树 = 插件组合包的 patch + profile 自身覆盖 + 用户覆盖,层层叠加;web(浏览器 UI)/tui(终端)/headless(一次性任务)共享同一套插件,只是组件组合不同。"
      - label: "默认模型"
        text: "官方默认 provider 是 deepseek-official、模型 deepseek-v4-flash——我实测跑的也是它。"
  - type: code
    lang: bash
    text: >-
      npx @deepseek-ai/dsh web                                  # 启动浏览器 Web UI
      npx @deepseek-ai/dsh --profile headless "跑一下测试"        # 一次性任务,答完即退
      npx @deepseek-ai/dsh --profile headless --dump-config      # 查看组合后的配置树(不启动)
  - type: divider
    label: "🧪 实测：一单真实的修 bug 任务"
    kind: primary
  - type: paragraph
    text: >-
      我准备了一个带 bug 的小脚本 <code>sum.py</code>:一个「求偶数和」的函数在返回值上多加了 1(<code>return total + 1</code>),期望输出 6、实际输出 7。然后用 headless 模式直接丢给 DSH 让它自己处理。
  - type: code
    lang: text
    text: >-
      # DSH 实际执行(从 Session Log 提取)
      1. read   → 读取 sum.py,定位问题
      2. edit   → 把 "return total + 1" 改为 "return total"
      3. bash   → 运行 python3 sum.py,确认输出变为 6
      ───────────────────────────────────────────
      结果:文件真实被修改,命令真实执行,输出 7 → 6。
  - type: highlight
    title: "它真的「进仓库干活」了,不是嘴上说说"
    meta: "〔实测结论〕"
    points:
      - label: "闭环"
        text: "读文件→改代码→跑命令→验证,DSH 自主走完了完整一轮,没有要求我复制粘贴任何报错。"
      - label: "可审计"
        text: "Session Log 全量记录每个动作(用户消息/工具调用/工具结果/上下文压缩/权限变化),以 JSONL.zstd 持久化,可重建、可回放、可调试。"
      - label: "诚实边界"
        text: "目前是 Developer Preview(实测版本 0.1.0-rc.6),官方声明快速迭代中可能出现破坏性变更。"
  - type: divider
    label: "⚖️ 和 Claude Code 怎么比"
    kind: primary
  - type: highlight
    title: "同赛道,同构工具面,不同绑定"
    meta: "〔我的观察〕"
    points:
      - label: "相同"
        text: "定位都是执行层;工具面几乎同构(read/edit/bash/web/subagent/skill/todo);都支持 headless 一次性任务、子 Agent 分工、Session 持久化。"
      - label: "不同"
        text: "DSH 默认只绑定 deepseek-official 这一家 provider(模型族就是自家 v4 系列);插件化更彻底——官方把「一切皆插件」作为架构答案,连 Agent Loop 都做成可替换。"
      - label: "阶段"
        text: "DSH 还在 Preview;Claude Code 已商用成熟。对开发者而言:多一个可自拼的 Harness 选择,也意味着执行层开始真正进入竞争。"
  - type: quote
    text: >-
      过去谈 DeepSeek,焦点几乎都在模型本身:参数、benchmark、价格。但到了 V4 Pro 与 Harness,边界变了——模型仍然决定智能的上限,如何把智能接进真实环境,开始成为另一半问题。
  - type: closing
    tagline: "模型决定智能的上限,Harness 决定能力的下限。执行层之争,现在正式开打。"
    source: "实测基于 @deepseek-ai/dsh 0.1.0-rc.6 · 官方文档 · DeepSeek 官方公告"
---
