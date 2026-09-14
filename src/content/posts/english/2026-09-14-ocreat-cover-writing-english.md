---
title: "写一份会把评审带路的 cover letter：O_CREAT|O_DIRECTORY 的真实写法"
date: "2026-09-14"
desc: "今日重点：写作——用 vfs 新 API 系列的真实 cover letter，学「一句话讲清做什么 + 主动给评审划重点 + 用 However 交代动机」三个写法。"
column: "english"
focus: "写作"
tags: ["写作", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——今天学一份<strong>会带路</strong>的 cover letter。素材是 vfs 新增 <code>O_CREAT|O_DIRECTORY</code> 系列（12 篇）的真实 cover，作者不光说「我做了什么」，还主动告诉评审「重点看哪几篇、为什么非这么做不可」。
  - type: divider
    label: "✍️ 写作：cover letter 的三个高阶动作"
  - type: highlight
    title: "① 一句话讲清「这个系列做什么」——冒号列点"
    meta: "linux-fsdevel · [PATCH v6 00/12] vfs: add O_CREAT|O_DIRECTORY to open*(2)"
    link: "https://lore.kernel.org/linux-fsdevel/20260913185016.523376-1-jkoolstra@xs4all.nl/"
    points:
      - label: "真实原句"
        text: "This series implements new semantics for the O_CREAT|O_DIRECTORY flag combination for open*(2): perform a mkdir and open the resulting directory; return a pinning fd (which mkdir does not)."
      - label: "中文理解"
        text: "「本系列为 open*(2) 的 O_CREAT|O_DIRECTORY 组合实现新语义：执行 mkdir 并打开建出的目录；返回一个 pinning fd（mkdir 做不到这点）。」——冒号后两个分号隔开的动作，读者一眼看懂新 API 是干嘛的。"
      - label: "写作要点"
        text: "主句用 <code>This series implements ...</code> 立住主题，冒号后用<strong>分号列点</strong>把「动作 + 附带好处」讲完。括号里 <code>(which mkdir does not)</code> 是点睛——一句对比点出「为什么要新加」：mkdir 不返回 fd，所以要它。"
  - type: highlight
    title: "② 主动给评审划重点——「重头戏在 X，另外 Y 值得多看」"
    meta: "同一封 cover"
    link: "https://lore.kernel.org/linux-fsdevel/20260913185016.523376-1-jkoolstra@xs4all.nl/"
    points:
      - label: "真实原句"
        text: "Most of the work happens in \"vfs: add O_CREAT|O_DIRECTORY to open*(2)\" ... The \"vfs: short-circuit MAY_WRITE access for O_DIRECTORY opens\" patch is also worth paying extra attention to as it short-circuits doomed opening of directories as writable."
      - label: "中文理解"
        text: "「大部分工作集中在『vfs: add O_CREAT|O_DIRECTORY to open*(2)』这篇……另外『vfs: short-circuit MAY_WRITE access…』这篇也值得特别留意，因为它提前拦掉了注定失败的『以可写方式打开目录』。」"
      - label: "写作要点"
        text: "长篇系列（12 篇）里，评审不可能逐篇细读。这两句是<strong>给评审带路</strong>：<code>Most of the work happens in X</code> 指出重头戏，<code>X is also worth paying extra attention to as ...</code> 点名容易漏的关键补丁并给出理由。学会这招，你的系列不再「12 篇一锅端」。"
  - type: highlight
    title: "③ 用 However 交代动机——「现状 + 这样不行」"
    meta: "同一封 cover"
    link: "https://lore.kernel.org/linux-fsdevel/20260913185016.523376-1-jkoolstra@xs4all.nl/"
    points:
      - label: "真实原句"
        text: "This check (to prevent one from opening directories as writable) is currently done very late in do_open(), after an inode has been obtained. However, when introducing O_CREAT|O_DIRECTORY this is unacceptable as it would create the directory and then still fail."
      - label: "中文理解"
        text: "「这个检查（防止以可写方式打开目录）目前做得很晚，在 do_open() 里拿到 inode 之后才做。然而，引入 O_CREAT|O_DIRECTORY 后这样不可接受——因为它会先把目录建出来，然后仍然失败。」"
      - label: "写作要点"
        text: "标准动机三段结构：<code>currently done ... </code>（现状）→ <code>However, ... this is unacceptable as it would ...</code>（为什么现状不行）。<code>unacceptable</code> 下判断、<code>as it would ...</code> 给后果（建了目录又失败，留下垃圾）。想让评审认同你的改动，就照这个「现状 → 不可接受 → 后果」来写。"
  - type: divider
    label: "✨ 辅助彩蛋（地道表达）"
  - type: highlight
    title: "worth paying extra attention to"
    meta: "地道表达 · 从这三句里拎出来"
    link: "https://lore.kernel.org/linux-fsdevel/20260913185016.523376-1-jkoolstra@xs4all.nl/"
    points:
      - label: "真实原句"
        text: "The \"...\" patch is also worth paying extra attention to as it short-circuits doomed opening of directories as writable."
      - label: "中文理解"
        text: "「……这篇补丁也值得特别留意，因为它提前拦下了注定失败的目录写打开。」"
      - label: "用法"
        text: "<code>be worth paying extra attention to</code>（值得格外留意）是评审场景的高频客套+提醒：既礼貌（不是命令），又明确（点名了）。可套：<code>The locking change is worth paying extra attention to as it touches a hot path.</code> 顺带学 <code>short-circuit</code>（短路/提前拦截）+ <code>doomed</code>（注定失败的）—— 两个很地道的搭配。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "仿写：假设你提一个系列，给「新增一个系统调用参数」写 3 句英文 cover —— ① 一句话讲清系列做什么（This series implements ... : ...; ...）；② 给评审划重点（Most of the work happens in ... / ... is worth paying extra attention to as ...）；③ 用 However 交代动机（现状 + 这样不可接受 + 后果）。"
    answer: "参考（仿写示范，非原句）：This series implements a new flag for clone3(2): create the child in a paused state; return control before exec. Most of the work happens in \"clone3: add CLONE_PAUSED,\" while the \"signal: skip wakeups for paused children\" patch is worth paying extra attention to as it touches the wakeup fast path. Today the state is set after the child has already run. However, for a debugger-style launch this is unacceptable as the child may race ahead before the tracer is attached."
    source: "This series implements new semantics for the O_CREAT|O_DIRECTORY flag combination for open*(2): perform a mkdir and open the resulting directory; return a pinning fd (which mkdir does not)."
    link: "https://lore.kernel.org/linux-fsdevel/20260913185016.523376-1-jkoolstra@xs4all.nl/"
  - type: closing
    tagline: "A good cover letter doesn't just report work — it walks the reviewer to the parts that matter."
    source: "内核英语 · 每日一篇"
---
