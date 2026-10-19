---
title: "地道表达：读评审先分软硬——哪句必须改，哪句只是口味"
date: "2026-10-18"
desc: "今日重点：地道表达——从 C-PHY 的两封评审里学六句：软信号（I'm stating a preference of course / If possible I would prefer）、硬信号（aren't consistent / needs to），以及限定知识边界的 To my knowledge。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——读内核评审最容易犯的一个错，
      不是看不懂英文，是<strong>分不清哪句必须改、哪句只是口味</strong>。
      有的意见写着 <code>must</code>，有的是 <code>I would prefer</code>，
      还有的看起来像随口一提、其实是在指出硬伤。
      今天的材料来自 C-PHY 的两封评审（同一位评审者，前后相隔约 40 分钟），
      <strong>软硬两类信号都给全了</strong>。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      I'm stating a preference of course but I think its better practice to
      define your constants with names that mean things as frequently we end up
      reusing constants all over the place.
  - type: quote
    text: >-
      This statement and how you go about using the data aren't consistent.
  - type: paragraph
    text: >-
      出处：Bryan O'Donoghue 的两封评审，均在 linux-media 的 C-PHY 讨论里。
      一封是 <code>Re: [PATCH 1/3] phy: core: add generic MIPI C-PHY configuration API</code>（2026-10-18 07:00 北京），
      另一封是 <code>Re: [PATCH RFC 0/6] phy/media: Add generic MIPI C-PHY support to CSI-2 stack</code>（07:39 北京）。
      每张卡片下方都给了对应的原文链接。
  - type: divider
    label: "💬 软信号：怎么把意见降格成「口味」"
    kind: section
  - type: highlight
    title: "I'm stating a preference of course"
    meta: "把「建议」明确标注成「偏好」"
    points:
      - label: "原句"
        text: "I'm stating a preference of course but I think its better practice to define your constants with names that mean things as frequently we end up reusing constants all over the place."
      - label: "拆解"
        text: "这一句里叠了<b>三层降格</b>：<b>of course</b>（自认这是主观的）、<b>I think</b>（限定为我的判断）、<b>better practice</b>（说的是「更好的做法」，不是「错误」）。三层叠下来，作者的意思很清楚：<strong>这条你可以不改，但我建议改</strong>。<br>顺带一提：原文里的 <code>its</code> 应为 <code>it's</code>——内核列表上母语者也会打错字，<b>拼写瑕疵不影响语义判读</b>，别因为一个笔误就怀疑整句的意思。"
      - label: "怎么用"
        text: "想表达「这只是我的口味」：<b>I'm stating a preference of course</b> / <b>I think it's better practice to …</b> / <b>Personally, I'd prefer …</b>。反过来，<b>读</b>评审时看到这三样中的任何一个，就可以判断：<strong>这是软信号，不改也能过</strong>。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;a6d8514b-269c-441d-b280-4895b5f21fac@linaro.org&gt;/\">原文</a>"
  - type: highlight
    title: "If possible I would prefer to …"
    meta: "条件化 + prefer，双重软化"
    points:
      - label: "原句"
        text: "If possible I would prefer to contain 3ph CPHY and DPHY to one file as is done here"
      - label: "拆解"
        text: "<b>If possible</b> 先把要求变成「如果办得到」；<b>I would prefer</b> 用虚拟语气，比 I prefer 更退一步。两句叠起来，等于说「我很希望这样，但要是不方便，我们可以谈」。<strong>prefer 是内核评审里最常用的软动词</strong>——它表达倾向而不构成否决。"
      - label: "怎么用"
        text: "提倾向性建议：<b>If possible I would prefer to …</b> / <b>It would be nice if …</b> / <b>Would it make sense to …?</b> 这些都不构成 blocker。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;141c5032-1915-4dac-bbcf-e697b762ae40@kernel.org&gt;/\">原文</a>"
  - type: divider
    label: "💬 硬信号：怎么表达「这条真的不行」"
    kind: section
  - type: highlight
    title: "This statement and how you go about using the data aren't consistent."
    meta: "零软化词，只陈述矛盾"
    points:
      - label: "原句"
        text: "This statement and how you go about using the data aren't consistent."
      - label: "拆解"
        text: "整句<b>没有一个软化词</b>：没有 I think、没有 maybe、没有 prefer。它甚至没有说「你错了」，只是陈述一件事——<b>你的说法和你对数据的用法不一致</b>。这在内核评审里就是最高级别的硬信号：<strong>不是口味问题，是逻辑矛盾，必须给出解释或修改</strong>。注意它仍然保持了礼貌：批评的对象是 statement 和 usage，不是人。"
      - label: "怎么用"
        text: "指出硬伤时，<b>把情绪删到零，只留事实</b>：<b>X and Y aren't consistent.</b> / <b>This doesn't match the code below.</b> / <b>The comment says A, but the loop does B.</b> 句子里可以没有 must，但对方一定知道要改。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;a6d8514b-269c-441d-b280-4895b5f21fac@linaro.org&gt;/\">原文</a>"
  - type: highlight
    title: "One of you needs to pick up the patches from the other one."
    meta: "真不可协商时，用 needs to"
    points:
      - label: "原句"
        text: "One of you needs to pick up the patches from the other one."
      - label: "拆解"
        text: "这是全场最硬的一句——<b>needs to</b>，主语明确（One of you），动作明确（pick up the patches），没有留任何余地。为什么这里可以这么硬？因为<b>这是流程问题，不是技术分歧</b>：两套竞争方案同时挂着，必须有一方放弃并接手对方的工作，否则谁也进不去。<strong>评审者在这类问题上通常会说得很直</strong>，因为含糊反而浪费所有人的时间。"
      - label: "怎么用"
        text: "对流程性、不可回避的要求：<b>X needs to …</b> / <b>Please do Y before …</b>。对技术分歧则尽量别用——用 prefer / better practice 留出讨论空间。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;141c5032-1915-4dac-bbcf-e697b762ae40@kernel.org&gt;/\">原文</a>"
  - type: divider
    label: "💬 限定知识边界：看起来软，其实是判断"
    kind: section
  - type: highlight
    title: "To my knowledge the C-PHY specification doesn't mandate …"
    meta: "留了余地，但结论照样给出"
    points:
      - label: "原句"
        text: "To my knowledge the C-PHY specification doesn't mandate adjacent LNx as required in a trio."
      - label: "拆解"
        text: "<b>To my knowledge</b> 是「据我所知」——它给自己留了一条退路（如果我说错了，你拿规范打我就是）。<strong>但这不等于这句话是软的</strong>：它后面紧接着就是一个明确的技术判断（规范并不要求 trio 里必须相邻）。读评审时这类句子要特别小心：<b>形式上是限定，内容上是断言</b>。<br>顺带看一眼同一个人的另一句：<b>Whatever about how DPHY does this in upstream Linux, these values should be …</b>——<b>Whatever about X</b> 是「不管 X 怎么样」，先把对方的先例挡在门外，再讲自己的要求。"
      - label: "怎么用"
        text: "不确定但很有把握时：<b>To my knowledge …</b> / <b>I believe …</b> / <b>Unless I'm missing something, …</b>。这三句的共同点是：<strong>把判断说出口，同时把纠错的权力交给对方</strong>——这是评审里非常成熟的一种姿态。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;a6d8514b-269c-441d-b280-4895b5f21fac@linaro.org&gt;/\">原文</a>"
  - type: divider
    label: "💬 收尾：把决定权交回去"
    kind: section
  - type: highlight
    title: "I'd like the best of both series. Please work out between yourself and Anusha what's next."
    meta: "给方向，但不替他们做决定"
    points:
      - label: "原句"
        text: "I'd like the best of both series. / Please work out between yourself and Anusha what's next."
      - label: "拆解"
        text: "两套竞争方案，评审者的处理方式值得学：<b>先说想要什么</b>（两个系列各取所长），<b>再说由谁去定</b>（你们俩自己商量下一步）。<strong>他不替两位作者做选择，也不放任他们各写各的</strong>——给出了明确的方向和明确的负责人。"
      - label: "怎么用"
        text: "遇到两方各执一词：<b>I'd like the best of both.</b> + <b>Please work out between yourselves what's next.</b> 前一句定调，后一句定人。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;141c5032-1915-4dac-bbcf-e697b762ae40@kernel.org&gt;/\">原文</a>"
  - type: divider
    label: "✨ 辅助彩蛋：trio —— C-PHY 里「三根线一组」"
  - type: highlight
    title: "lanes / data_lanes / lane_polarities 与 trio"
    meta: "一句话解决 C-PHY 代码里最常见的困惑"
    points:
      - label: "原句"
        text: "lanes specifies the number of pads in a trio / data_lanes specifies which pads are in those trios / lane_polarities specifies the polarity of each of the given pads"
      - label: "中文与语境"
        text: "C-PHY 不像 D-PHY 那样按差分对（lane）走，而是<b>三根线组成一个 trio（三线组）</b>，靠三相信号编码。所以本文讨论的核心正是：<b>lanes 指的是「一个 trio 里的 pad 数」，data_lanes 指的是「哪些 pad 组成这些 trio」，lane_polarities 指的是「每个 pad 的极性」</b>。这也就解释了为什么代码里会有 <code>lanes % 3</code> 这样的合法性检查——<strong>不是三条 lane，而是一个 trio 里的三根线</strong>。"
      - label: "记忆钩子"
        text: "<b>D-PHY 数对，C-PHY 数 trio。</b>看到 C-PHY 代码里的 3，先想 trio，不要想「三条差分对」。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-media/&lt;a6d8514b-269c-441d-b280-4895b5f21fac@linaro.org&gt;/\">原文</a>"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用英文作答。下面两句出自同一封评审：① I'm stating a preference of course but I think its better practice to define your constants with names that mean things as frequently we end up reusing constants all over the place. ② This statement and how you go about using the data aren't consistent. 请分别判断哪句是「硬要求」、哪句是「个人偏好」，并把其中一句改写成相反的语气（软→硬 或 硬→软），说明你改了哪些词。"
    answer: "参考作答（仿写示范，非原文）：① is a preference, not a requirement -- it carries three demoters: I'm stating a preference of course, I think, and better practice. To harden it: These constants must be named meaningfully, because they get reused all over the tree. (I removed the preference marker and the hedge, and used must.) ② is a hard signal: it contains no hedge at all and simply states that the claim and the code disagree. To soften it: I'm not sure the statement matches how the data is actually used -- could you walk me through it? (I added I'm not sure, turned the assertion into a question, and asked for clarification instead of asserting inconsistency.)"
    source: "I'm stating a preference of course but I think its better practice to define your constants with names that mean things as frequently we end up reusing constants all over the place. / This statement and how you go about using the data aren't consistent."
    link: "https://lore.kernel.org/linux-media/<a6d8514b-269c-441d-b280-4895b5f21fac@linaro.org>/"
  - type: closing
    tagline: "每日一句：In a review, the hard part is not the English — it is telling a requirement from a preference wearing the same polite coat."
    source: "仿写示范"
---
