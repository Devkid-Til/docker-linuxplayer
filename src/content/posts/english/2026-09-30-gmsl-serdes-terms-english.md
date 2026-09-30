---
title: "术语卡：GMSL2/3 加解串器的五个核心术语"
date: "2026-09-30"
desc: "今日重点：术语卡——从 GMSL2/3 serdes v18 投稿信里学五个术语：tunnel/pixel mode、I2C ATR、VC remapping、double mode、PHY modes，定义全部取自原文。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🏷️ 术语卡</strong>——今天头条那 23 帖把 GMSL2/3 加解串器整个重写成了一套框架。
      这封信的术语密度极高，而且<strong>每个术语作者都当场给了定义</strong>——
      正好是学「怎么用英文把硬件概念讲清楚」的好材料。五个术语，定义全部逐字取自原文。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      While the normally acceptable and polite way would be to extend the current mainline
      drivers, the choice was made here to add a totally new set of drivers. The current
      drivers support only a small subset of the possible features, and only a few devices,
      so the end result after extending them would in any case be essentially fully
      rewritten, new drivers.
  - type: paragraph
    text: >-
      出处：Dumitru Ceclan，<code>[PATCH v18 00/23] media: i2c: add Maxim GMSL2/3 serializer
      and deserializer drivers</code>，linux-media，09-30 06:41 北京。
      <a href="https://lore.kernel.org/linux-media/&lt;20260930-gmsl2-3_serdes-v18-0-43117818f499@analog.com&gt;/">原文</a>
  - type: divider
    label: "🏷️ 术语一：tunnel mode / pixel mode"
    kind: primary
  - type: highlight
    title: "tunnel mode vs pixel mode（隧道模式 / 像素模式）"
    meta: "数据在 GMSL 链路上的两种转发方式"
    points:
      - label: "原文定义"
        text: "Tunnel mode is used when VC IDs do not need to be changed and all hardware supports tunnel mode, otherwise, pixel mode is used. The serializers are automatically switched between the two by using a private API."
      - label: "中文解释"
        text: "两种把图像数据从串行器送到去串行器的方式。tunnel 模式下数据原样透传，不做像素级处理——前提是各路的 VC ID 不需要改、且链路两端硬件都支持；做不到这些时退回 pixel 模式，把数据解到像素层面重新打包，更灵活但开销更大。"
      - label: "记忆钩子"
        text: "tunnel＝隧道，数据从洞里原样穿过，中间不动它；pixel＝要拆到像素再重新码一遍。判断用哪个：<b>VC ID 要不要改</b>——不改就能走隧道。"
  - type: divider
    label: "🏷️ 术语二：I2C ATR"
    kind: section
  - type: highlight
    title: "I2C ATR（I2C Address Translation，I2C 地址翻译）"
    meta: "多路串行器共存时的寻址办法"
    points:
      - label: "原文定义"
        text: "some deserializers cannot do muxing since I2C communication channel masking is not available per-link, and the only other way to select links is to turn them off, causing link resets. For such cases, I2C ATR is used to change the address of the serializers at probe time."
      - label: "中文解释"
        text: "一颗去串行器挂多颗串行器时，得能把 I2C 命令发给指定那一路。常规办法是做 I2C mux，但有些去串行器做不到——它的 I2C 通道无法按 link 单独屏蔽，唯一的「选择」办法是把其他 link 关掉，而那会导致 link 复位。这种情况改用 ATR：在 probe 阶段就把各串行器的 I2C 地址改成互不相同，之后靠地址区分。"
      - label: "记忆钩子"
        text: "ATR ＝ <b>A</b>ddress <b>TR</b>anslation。<b>不换通道，改地址</b>——把一个「怎么选链路」的问题，转化成「怎么编地址」的问题。"
  - type: divider
    label: "🏷️ 术语三：VC remapping"
    kind: section
  - type: highlight
    title: "VC remapping（Virtual Channel remapping，虚拟通道重映射）"
    meta: "跨链路路由时重新分配 VC ID"
    points:
      - label: "原文定义"
        text: "VCs are picked so that if they were unique on the sink pad, they will end up as unique on the source pad they are routed to too, prioritizing using the same VC ID as the sink pad, to facilitate the possibility of using tunnel mode."
      - label: "中文解释"
        text: "VC（虚拟通道）是 MIPI CSI-2 上区分多路数据流的标记，可以理解成「车道号」。数据从 GMSL link 路由到 CSI-2 输出时，去串行器要重新分配 VC。规则有两条：sink 侧本来唯一的，到 source 侧也要保持唯一；并且<b>优先沿用 sink 侧的 VC ID</b>——因为 ID 不变才有可能走 tunnel 模式。"
      - label: "记忆钩子"
        text: "关键词是 prioritizing：能不改就不改。这不是偷懒，是<b>为了保住 tunnel 模式这条路</b>——一旦改了 VC ID，就只能退回 pixel 模式。"
  - type: divider
    label: "🏷️ 术语四：double mode / BPP"
    kind: section
  - type: highlight
    title: "double mode（双像素打包）与 BPP"
    meta: "pixel 模式下的带宽优化"
    points:
      - label: "原文定义"
        text: "In pixel mode, double mode can be used to pack two pixels into a single data unit, optimizing bandwidth usage. [...] if the data being transferred uses two different BPPs, data needs to be padded."
      - label: "中文解释"
        text: "double mode 只在 pixel 模式下有效：把两个像素打包进一个数据单元，省带宽。BPP ＝ bits per pixel（每像素位数）。原文还提到一个配套动作——当传输的数据用了两种不同的 BPP 时，需要做数据填充（padding）来对齐。"
      - label: "记忆钩子"
        text: "double ＝ 一次塞两个像素。注意它的代价是引入了 padding 这个额外动作：两种 BPP 混用时得补位对齐。"
  - type: divider
    label: "🏷️ 术语五：PHY modes"
    kind: section
  - type: highlight
    title: "PHY modes（2x4 / 4x2 / 1x4+2x2 …）"
    meta: "去串行器的 lane 分配方式"
    points:
      - label: "原文定义"
        text: "Deserializer chips commonly have more than a single PHY. The firmware ports are parsed to determine the modes in which to configure the PHYs (2x4, 4x2, 1x4+2x2, 2x2+1x4, and variations using fewer lanes)."
      - label: "中文解释"
        text: "一颗去串行器通常不止一个 PHY。驱动从固件（设备树）的端口描述里解析出该把 PHY 配成什么模式，原文列了几种：2x4（两个 4-lane PHY）、4x2、1x4+2x2、2x2+1x4，以及用更少 lane 的变体。"
      - label: "记忆钩子"
        text: "记法读作「<b>几个 PHY × 每个几 lane</b>」：2x4＝2 个 PHY、每个 4 lane；1x4+2x2＝1 个 4-lane 加 2 个 2-lane。"
  - type: divider
    label: "✨ 辅助彩蛋：地道表达"
    kind: section
  - type: highlight
    title: "怎么「礼貌地说明我为什么不按常规做」"
    meta: "出自本系列 cover letter 开头"
    points:
      - label: "原句"
        text: "While the normally acceptable and polite way would be to extend the current mainline drivers, the choice was made here to add a totally new set of drivers."
      - label: "拆解"
        text: "While A would be the normal way, the choice was made to do B。先<b>承认常规做法、并且明确说它「可接受也礼貌」</b>，再交代自己选了另一条路。这个顺序很重要——先给对方面子，再说理由，比直接说 we rewrote them 得体得多。"
      - label: "用法"
        text: "你要提一个反常规方案时（重写而不是增量改、换接口而不是兼容旧接口），先承认常规路径的正当性，再给理由。作者紧接着给的理由也很实在：现有驱动只覆盖很小一部分特性，改到最后反正也是完全重写——<b>把「为什么不走常规」变成「常规走不通」</b>。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用一个具体场景串起今天的术语：某平台一颗去串行器挂了 4 颗串行器，它的 I2C 通道无法按 link 屏蔽。请用英文回答两点：① 该用哪种寻址方案、为什么？② 如果各路 VC ID 本来互不相同，数据转发有可能走哪种模式、前提是什么？"
    answer: "参考作答（仿写示范，非原文）：① Use I2C ATR. Without per-link I2C channel masking the deserializer cannot mux, and the only alternative -- turning links off to select them -- would reset the links. ATR instead gives each serializer a distinct address at probe time, so they can be addressed individually. ② Tunnel mode is possible, provided all hardware on the link supports it. Since the VC IDs are already unique and therefore do not need remapping, the condition for tunnel mode is met; keeping the same VC IDs on the source pad is exactly what the remapping logic prioritizes."
    source: "I2C ATR translation - some deserializers cannot do muxing since I2C communication channel masking is not available per-link, and the only other way to select links is to turn them off, causing link resets. For such cases, I2C ATR is used to change the address of the serializers at probe time."
    link: "https://lore.kernel.org/linux-media/<20260930-gmsl2-3_serdes-v18-0-43117818f499@analog.com>/"
  - type: closing
    tagline: "每日一句：When a spec says a thing is automatic, ask what condition it is automatic under."
    source: "仿写示范"
---
