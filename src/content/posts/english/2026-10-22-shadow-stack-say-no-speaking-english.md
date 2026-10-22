---
title: "口语：说「不行」的五种说法——从硬拒到留台阶"
date: "2026-10-22"
desc: "今日重点：口语——用 x86 影子栈 RFC 的评审对话，练五种反对说法：硬拒、划范围、软硬搭配、给出路、玩笑收尾。"
column: "english"
focus: "口语"
tags: ["口语", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🗣️ 口语</strong>——邮件列表是异步的评审会，写下的每句话，开会时都要能说出口。
      今天用 x86 内核影子栈 RFC 里的一段真实交锋，拆<strong>五种说「不行」的说法</strong>：
      硬拒、划范围、软硬搭配、给出路、玩笑收尾。最后给你一个现场场景，逼你在三句话里把话说完。
  - type: divider
    label: "🗣️ 现场：一条 Future Work 引发的反对"
    kind: primary
  - type: paragraph
    text: >-
      背景：Dave Hansen 发出 RFC 系列 <code>[RFC][PATCH 00/24] x86 Kernel Shadow Stacks</code>（2026-10-21，24 个补丁），
      让内核在 <b>FRED</b>（2026 年 CPU 上的新事件交付机制，取代古老的 IDT）之上维护自己的影子栈。
      封面信里他写死了前提 <b>FRED is a required prerequisite</b>，但语气留了口子——「要回去做 IDT 实现，我完全支持，只是 FRED 简单得多，应该从这里起步」。
      同信的 Future Work 里还留了一条待办：<b>Work with IDT-based systems (without FRED)</b>。
      几个小时后，Peter Zijlstra 两封回复，把这条路划掉。
      下面五段引用全部是<strong>真实邮件原句</strong>，每段末尾给出来源邮件，点开可逐字对照。
  - type: quote
    text: >-
      Work with IDT-based systems (without FRED)
  - type: paragraph
    text: >-
      来源：Dave Hansen 封面信的 Future Work 段，
      <a href="https://lore.kernel.org/lkml/&lt;20261021195120.E61EC737@davehans-spike.ostc.intel.com&gt;/">2026-10-22 03:51 北京</a>。
      注意用词是 <b>Work with</b>——这是一个「待办」，不是路线图上的「承诺」。
      口语里也一样：先说「以后可以试试」的人，往往心里清楚对方会反对；真正要留意的，是别让一句待办被当成已排期的功能。
  - type: divider
    label: "🗣️ 五个动作"
    kind: primary
  - type: paragraph
    text: >-
      <b>① 判断句先落地，理由跟在后头。</b><br>
      原句：<b>This simply cannot work -- IDT relies on that horrific NMI nesting stuff, and shadow stacks hate on that something fierce.</b><br>
      语境翻译：这根本行不通——IDT 依赖那套糟糕透顶的 NMI 嵌套机制，影子栈又极其不适应这种东西。<br>
      要点：<b>This simply cannot work</b> 是结论前置，破折号之后才补理由；simply 把「不行」钉死，不留讨价还价的缝。
      口头表达时先给判断、再补理由，听众不用等你说完才知道立场。
      <b>something fierce</b> 是口语里的强度说法（非常、猛烈），正式文档里少用，会议里说出来很自然。<br>
      复述引导：合上原文，用 15 秒说「判断 + 两个理由」——第一个理由讲对方方案依赖了什么东西，第二个理由讲你的机制为什么受不了它。<br>
      来源：<a href="https://lore.kernel.org/lkml/&lt;20261021213649.GS2823843@noisy.programming.kicks-ass.net&gt;/">Peter Zijlstra，2026-10-22 05:36 北京</a>
  - type: paragraph
    text: >-
      <b>② 用 we 把「你不对」换成「我们不这么走」。</b><br>
      原句：<b>We're not going to contemplate doing IDT; its an absolute trainwreck.</b><br>
      语境翻译：我们不会考虑去做 IDT；那东西完全是一团糟。<br>
      要点：主语是 <b>We</b>，不是 You。反对的对象从「你的方案」移到「我们共同要走的路线」，人就不在靶子上。
      <b>not going to contemplate</b> 比 won't do 更冷一档：连考虑都不考虑，但语气不带火气。分号后用一个名词性判断收尾，短、硬、好记。<br>
      顺带一个细节：原文的 <b>its</b> 是 it's 的笔误，邮件列表里很常见。引用保留原样，自己写作时别照抄。<br>
      复述引导：把你的反对意见重说一遍，主语不许用 you，改用 we，并且让后半句落在一个名词或名词短语上。<br>
      来源：<a href="https://lore.kernel.org/lkml/&lt;20261021215314.GU2823843@noisy.programming.kicks-ass.net&gt;/">Peter Zijlstra，2026-10-22 05:53 北京</a>
  - type: paragraph
    text: >-
      <b>③ 软硬搭配：概率软化判断，句子照样决断。</b><br>
      原句：<b>Trying to support non-ss tasks looks like a complete nightmare, lets not do that.</b><br>
      语境翻译：想支持没有影子栈的任务，看起来完全是场噩梦，还是别做了。<br>
      要点：前半句 <b>looks like</b> 留了余地——也许你有办法，也许我判断错了；后半句 <b>lets not do that</b> 立刻给出结论——但还是别做。
      软化的是判断，不是决定。会议里这一对最好用：先给对方面子，再给团队方向。
      （non-ss 是邮件里的简写，指没有影子栈的任务。）<br>
      复述引导：用「looks like …，let's not …」的结构，先说风险，再说不做；两句之间不要停顿太久，否则软化成犹豫。<br>
      来源：<a href="https://lore.kernel.org/lkml/&lt;20261021215314.GU2823843@noisy.programming.kicks-ass.net&gt;/">Peter Zijlstra，同一封邮件，2026-10-22 05:53 北京</a>
  - type: paragraph
    text: >-
      <b>④ 反对之外，给出路。</b><br>
      原句：<b>This; I'm thinking we should simply unwind our own stack and write the return frames in the shadow-stack and switch. We have all the infrastructure for this to be 'trivial'.</b><br>
      语境翻译：关于这一点，我在想我们干脆把自己的栈展开，把返回帧写进影子栈里再切换。该有的基础设施我们都有，这事应该「不难」。<br>
      要点：<b>This; I'm thinking we should …</b> 是口语里认领话题的起手式——「这一点上，我在想……」。
      simply 表示方案本身简单，'trivial' 加引号是自嘲式留余量：真做起来未必轻松。
      只否决不给路，等于把球踢回给对方；给一条路，讨论才能往下走。<br>
      复述引导：用 <b>I'm thinking we should …</b> 给你的反对配一条替代方案，一句话说完，别在句子里展开实现细节。<br>
      来源：<a href="https://lore.kernel.org/lkml/&lt;20261021215314.GU2823843@noisy.programming.kicks-ass.net&gt;/">Peter Zijlstra，同一封邮件，2026-10-22 05:53 北京</a>
  - type: paragraph
    text: >-
      <b>⑤ 玩笑收尾，把决定权交回去。</b><br>
      原句：<b>Heh. I'll leave this one as an exercise to the reader if folks really care.</b><br>
      语境翻译：嘿。要是真有人在意这一点，那我就留作读者的练习题了。<br>
      要点：场景是补丁 12 的 Future Work——为了省掉动态映射的复杂度，直接用静态映射（KISS），代价是在编译了影子栈支持、运行时却没启用的情况下，每个 CPU 浪费三个页。
      Peter 打趣说有人在想办法缩小栈，Dave 用 <b>Heh.</b> 接住玩笑，再用 <b>if folks really care</b> 把优先级交回给提意见的人。
      这不是敷衍：他紧接着仍给了两条可选实现路径。<b>Heh</b> 是轻笑，不是嘲讽；写进文字里别滥用，一条线程一次就够。<br>
      复述引导：别人对你的设计挑了一根不痛不痒的刺，用一句玩笑加一句「真有人要就再说」接住，不承诺改动，但把下一步的门留着。<br>
      来源：<a href="https://lore.kernel.org/lkml/&lt;265c8e12-bf90-4fcf-927a-0de1f29c55b6@intel.com&gt;/">Dave Hansen，2026-10-22 06:59 北京</a>（其中 Peter 的原话 People were trying to *shrink* stacks 😉 由 Dave 引用）
  - type: divider
    label: "✨ 辅助彩蛋：三个能搬进会议的语气词"
  - type: highlight
    title: "程度、结果、代价——三个形容词各就各位"
    meta: "都是真实原文里的用法，不是仿写"
    points:
      - label: "① something fierce"
        text: >-
          非常、猛烈，跟在动词后作强度补充，如 <b>hate on that something fierce</b>。
          口语味重，正式文档里换成 strongly / badly。
      - label: "② an absolute trainwreck"
        text: >-
          彻底的灾难。absolute 让语气顶格，trainwreck 比 disaster 口语、比 mess 重；
          用来说方案或代码，不用来说人。
      - label: "③ a complete nightmare"
        text: >-
          十足的噩梦，常形容维护成本或复杂度，如 <b>a complete nightmare</b>。
          比 hard to maintain 主观得多，适合会议里表态，不适合技术文档的正式结论。
      - label: "记忆钩子"
        text: >-
          <b>fierce 说程度，trainwreck 说结果，nightmare 说代价。</b>
      - label: "溯源"
        text: >-
          第一条出自
          <a href="https://lore.kernel.org/lkml/&lt;20261021213649.GS2823843@noisy.programming.kicks-ass.net&gt;/">Peter 的第一封回复（2026-10-22 05:36 北京）</a>，
          后两条出自
          <a href="https://lore.kernel.org/lkml/&lt;20261021215314.GU2823843@noisy.programming.kicks-ass.net&gt;/">他的第二封（2026-10-22 05:53 北京）</a>。
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "场景：一次驱动评审会上，同事提议给你的新机制补一条兼容路径，理由是「老平台上可能还有人用」。请用三句话回应：第 1 句给判断，并说明对方方案依赖了什么；第 2 句用 we 划范围，表明不做第二套实现；第 3 句给出一条替代路径。要求每句只做一个动作，不用 you 开头，不用 I think 起句。"
    answer: "参考作答（仿写示范，非原文）：On those old platforms this simply cannot work -- the legacy path depends on nested event delivery, and the new mechanism assumes events never nest. We're not going to carry two implementations for it; that doubles the code we have to audit. I'm thinking we should keep the legacy path out of tree until someone shows real demand, and start with the platforms we can test. 讲法要点：第 1 句把判断放在最前，破折号后接两条理由；第 2 句用 We're not going to carry … 划范围，分号后给代价；第 3 句用 I'm thinking we should … 给替代路径，并附启动条件。"
    source: "We're not going to contemplate doing IDT; its an absolute trainwreck.
      Trying to support non-ss tasks looks like a complete nightmare, lets not do that."
    link: "https://lore.kernel.org/lkml/<20261021215314.GU2823843@noisy.programming.kicks-ass.net>/"
  - type: closing
    tagline: "每日一句：Say the verdict, give the reason, leave a way forward."
    source: "仿写示范"
---
