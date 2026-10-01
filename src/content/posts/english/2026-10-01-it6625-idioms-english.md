---
title: "地道表达：补丁已经合了，评审意见才来——这句话怎么说"
date: "2026-10-01"
desc: "今日重点：地道表达——拆 it6625 v2 投稿信的五种说法：came in on、as a follow-up、can no longer be amended，以及怎么主动标出『最该被质疑的地方』。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——今天这篇投稿信讲了一个很具体的处境：
      <strong>补丁已经合进 next 了，评审意见才到，原提交改不了，只能另发一组跟进</strong>。
      这种「事情已成定局、但还得把话说圆」的场景，英文里有成套的说法。另外还有一个投稿信里的高级动作值得单独学：
      <strong>主动指出你这批补丁里最该被质疑的地方</strong>。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      Review feedback came in on "[PATCH v10 2/2] media: i2c: add driver for ITE IT6625/IT6626"
      and, separately, on "[PATCH v1 1/2]" (the dt-bindings patch), after both had already been
      merged into next. This series addresses that feedback as a follow-up, since the original
      commits can no longer be amended.
  - type: paragraph
    text: >-
      出处：Hermes Wu，<code>[PATCH v2 00/21] media: i2c: it6625: address review feedback and
      adopt subdev state</code>，linux-media，09-30 14:42 北京。
      <a href="https://lore.kernel.org/linux-media/&lt;20260930-upstream-it6625-follow-up-patch-v2-0-e353f887e7fa@ite.com.tw&gt;/">原文</a>
  - type: divider
    label: "💬 逐句拆：五处地道说法"
    kind: section
  - type: toc
    items:
      - label: "feedback came in on X"
        text: "反馈「落到」某封补丁上，介词用 <b>on</b> 不用 to 或 for。came in 是「（意见）进来了」，带有「陆续到达」的语感——不是一次性的，是评审过程中陆续来的。"
      - label: "and, separately, on Y"
        text: "separately 用一对逗号插在中间，把两处来源明确分开：一处在这封补丁、另一处在 dt-bindings 那封。如果只说 came in on X and Y，读者会以为是同一处。这个小词承担了「分别」的全部信息。"
      - label: "after both had already been merged into next"
        text: "用过去完成时（had already been merged）交代时序：<b>意见到达时，合并已经完成了</b>。这一句是整段的支点——它解释了为什么必须另起一组补丁，而不是在原系列上出 v11。"
      - label: "addresses that feedback as a follow-up"
        text: "as a follow-up＝以「跟进系列」的形式来处理。这是内核社区的固定说法：原提交已进树、不能改，于是另发一组专门回应。since the original commits can no longer be amended——since 引出这个「已成定局」的原因，语气是陈述事实，不是辩解。"
      - label: "found while implementing a related style request"
        text: "顺手发现的东西这么交代：found while doing X。它同时说明了「这个修复不在原计划里」和「它从哪来的」——审阅者看到这句就不会问「你为什么要动这里」。"
      - label: "It was refined during v1's review"
        text: "refined during X's review＝在上一轮评审中打磨过。既说明了设计是经过讨论的（不是拍脑袋），也给了审阅者一个「可以往前翻」的线索。"
  - type: divider
    label: "💬 高级动作：主动标出最该被质疑的地方"
    kind: section
  - type: quote
    text: >-
      The locking-model change is the one part of this series most likely to need another look:
      it changes what the driver's own mutex protects and who else already holds it by the time
      driver code runs.
  - type: toc
    items:
      - label: "句式"
        text: "X is the one part most likely to need another look。注意 the one part——<b>「就这一处」，主动缩小范围</b>。后半句紧跟冒号，当场给出为什么它可疑：它改变了互斥锁保护的对象、以及驱动代码运行时谁还持有它。"
      - label: "为什么这是高级动作"
        text: "21 帖的系列里，审阅者精力有限。与其等对方自己挑出错处，不如<b>先把最可能出问题的那一处指出来</b>——这既显得作者清楚自己的改动风险在哪，也把评审火力引导到真正需要讨论的地方。作者紧接着还补了一句「它已经过 v1 评审打磨，见第 20、21 帖的 commit message」，并说明这两帖与前面的机械改动是分开的。"
      - label: "怎么用"
        text: "你自己提系列时：找出改动里最不寻常的那一处（通常是接口语义、并发、生命周期），用这个句式点出来，并给出一句「为什么它值得再看一眼」。别笼统说 please review，那等于没指。"
  - type: divider
    label: "✨ 辅助彩蛋：术语卡"
    kind: section
  - type: highlight
    title: "subdev active-state model（子设备活动状态模型）"
    meta: "定义取自同一封投稿信"
    points:
      - label: "原文定义"
        text: "adopting the subdev active-state model: moving the current format out of driver-private fields and into the pad format, sharing the control handler's own lock as the subdev state lock instead of introducing another private mutex for it"
      - label: "中文解释"
        text: "V4L2 子设备把「当前状态」（当前格式、选中参数等）从驱动私有字段搬进框架提供的 pad 格式里，并借用已有的 control handler 锁作为子设备状态锁，而不是再自己造一把私有互斥锁。好处是状态对所有 subdev 统一可见、可被框架与用户态一致地读写。"
      - label: "为什么值得记"
        text: "这是 media 子系统近几年在推的收敛方向——你写 camera 驱动时如果还在用私有字段存当前格式，会越来越难和框架对齐（多流、active state、format propagation 都需要它）。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用英文写两句话：① 你的补丁已经合进 next 之后才收到评审意见，说明你现在另发一组跟进（用上 came in on / as a follow-up / can no longer be amended）；② 指出你这批补丁里最该被再看一眼的那一处，并给出理由（用上 the one part most likely to need another look）。"
    answer: "参考（仿写示范，非原文）：① Review feedback came in on the sensor's runtime-PM patch after it had already been merged into next. This series addresses that feedback as a follow-up, since the original commits can no longer be amended. ② The power-sequencing change is the one part of this series most likely to need another look: it moves the regulator enable from probe() into the streaming path, so it changes who may already hold the driver's own lock when that code runs."
    source: "Review feedback came in on \"[PATCH v10 2/2] media: i2c: add driver for ITE IT6625/IT6626\" and, separately, on \"[PATCH v1 1/2]\" (the dt-bindings patch), after both had already been merged into next. This series addresses that feedback as a follow-up, since the original commits can no longer be amended."
    link: "https://lore.kernel.org/linux-media/<20260930-upstream-it6625-follow-up-patch-v2-0-e353f887e7fa@ite.com.tw>/"
  - type: closing
    tagline: "每日一句：Point at your own weakest spot before the reviewer has to find it."
    source: "仿写示范"
---
