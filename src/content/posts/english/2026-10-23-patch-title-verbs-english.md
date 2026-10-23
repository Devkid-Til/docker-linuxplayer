---
title: "标题解析：动词是标题的骨架——同一条改动，换个动词就是另一种承诺"
date: "2026-10-23"
desc: "今日重点：标题解析——冒号后第一个动词，决定了这条补丁在向维护者承诺什么。"
column: "english"
focus: "标题解析"
tags: ["标题解析", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🔍 标题解析</strong>——昨天练了口语，今天回到标题。
      内核提交标题有固定骨架：<code>[PATCH vN x/y] 子系统: 组件: 祈使动词 + 宾语 + 限定语</code>。
      限定语、系列前缀前面都拆过；今天只盯一个位置：<strong>冒号后面那个动词</strong>。
      同一批代码，动词换一个，维护者读到的承诺就完全不同——今天用真实的 Sony Starvis 2
      系列（18 个补丁）和两条媒体驱动修复来验证这件事。
  - type: divider
    label: "📖 今日标题（真实清单，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      [PATCH v6 00/18] Update imx678 to act as a common Sony Starvis 2 driver.

      [PATCH v6 01/18] media: imx678: Rework into generic Starvis 2 sensor driver.

      [PATCH v6 02/18] media: sony-starvis2: Reorder link frequencies to remove lookup

      [PATCH v6 03/18] media: sony-starvis2: Always program the sensor in window mode

      [PATCH v6 04/18] media: sony-starvis2: Parameterise the configuration to allow for other models

      [PATCH v6 14/18] media: sony-starvis2: Only update bits for window mode

      [PATCH 0/3] media: em28xx: fix multiple disconnect races and UAFs

      [PATCH 1/3] media: em28xx: check dev->disconnected in em28xx_v4l2_open()
  - type: paragraph
    text: >-
      出处：均取自 2026-10-22 投递到 linux-media 的真实邮件（本地雷达 2026-10-23 抓取）。
      <strong>每条都给了该邮件本身的链接</strong>——见下方逐条拆解，点开就是标题和正文所在的那一封。
  - type: divider
    label: "🔍 五种动词，五种承诺"
    kind: section
  - type: toc
    items:
      - label: "① Update / Rework —— 重构类动词：结构变了，行为不该变"
        text: "封面信写 <code>Update imx678 to act as a common Sony Starvis 2 driver.</code>——Update 很笼统，但封面信不进 changelog，可以用「目的」说话：把 imx678 更新成一个通用驱动。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022-media-starvis2-v6-0-374343f55fd3@raspberrypi.com&gt;/\">原文</a> 进入历史的第一个补丁就不能这么松散：<code>media: imx678: Rework into generic Starvis 2 sensor driver.</code>——<b>Rework into</b> 明确这是重构：改造成通用 Starvis 2 驱动，不是新增支持。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022-media-starvis2-v6-1-374343f55fd3@raspberrypi.com&gt;/\">原文</a> 正文可以验证这个分寸：作者说这一步是「prepare for supporting those by renaming all common parts of the driver to a starvis2_ prefix, and renaming the driver」——<b>是「为支持做准备」，不是「已经支持」</b>。写成 Add support for Starvis 2，等于把基础设施改动说成功能交付，维护者会按功能的标准来审。<br><br>顺带看两个细节：两条标题都以句号结尾。内核文档给的规范形态是 <code>subsystem: summary phrase</code>；我在本地 mainline 镜像最近 5 万条提交里数了一下，只有 205 条（0.41%）以句号结尾——<b>社区习惯是不加</b>。封面信是邮件标题，影响小；补丁标题会原样进 git log，最好别带。另一个细节是前缀：01 还是 <code>media: imx678:</code>，到 02 已经是 <code>media: sony-starvis2:</code>——重命名发生在 01，标题把这个切换点留在了前缀上。"
      - label: "② Reorder … to remove / Parameterise … to allow —— 动作 + 目的从句"
        text: "<code>media: sony-starvis2: Reorder link frequencies to remove lookup</code>。<b>Reorder</b> 承诺的是「重排」，不是「修复」；<b>to remove lookup</b> 紧接着回答「重排图什么」——让查表变成多余。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022-media-starvis2-v6-2-374343f55fd3@raspberrypi.com&gt;/\">原文</a> 正文把这件事钉死了：「Reverse the order of the link frequencies so that the table is redundant, and remove it.」——反转枚举顺序，让映射表变成恒等映射，再删表；按作者描述，功能不变。动词管「做了什么」，to 从句管「图什么」，一句话把改法和动机都交代了。<br><br>同系列的 <code>Parameterise the configuration to allow for other models</code> 是同一模板：<b>Parameterise</b>（要改的机制）+ <b>to allow for</b>（改完多出的余地）。注意 allow for 是「给……留出余地」，不是 allow sb to do。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022-media-starvis2-v6-4-374343f55fd3@raspberrypi.com&gt;/\">原文</a>"
      - label: "③ Always / Only —— 句首副词管的是范围，不是语气"
        text: "<code>Always program the sensor in window mode</code>——Always 摆在第一个词，等于宣告一条无条件的行为改变：以后所有路径都按 window mode 编程。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022-media-starvis2-v6-3-374343f55fd3@raspberrypi.com&gt;/\">原文</a> <code>Only update bits for window mode</code>——Only 也在第一个词，方向相反：只动 window mode 那几位，别的不碰。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022-media-starvis2-v6-14-374343f55fd3@raspberrypi.com&gt;/\">原文</a> 两个副词都站在最前面，因为它们是承诺的一部分：<b>一个扩大适用范围，一个收紧副作用</b>。读标题先看句首有没有副词，它直接决定这条补丁的影响面；写标题时如果改动只在一部分路径生效，Only / Always 比在正文里补一句更早让评审看见。"
      - label: "④ check / release / Move 与 fix —— 标题写做法，封面写缺陷"
        text: "em28xx 系列的封面 <code>fix multiple disconnect races and UAFs</code> 说缺陷；第一个补丁的标题 <code>check dev->disconnected in em28xx_v4l2_open()</code> 说做法。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022194618.14170-1-neganhat@gmail.com&gt;/\">封面原文</a> · <a href=\"https://lore.kernel.org/linux-media/&lt;20261022194901.14302-1-neganhat@gmail.com&gt;/\">补丁原文</a> 正文先讲崩溃机理：USB 断开时 <code>dev->intf</code> 已被释放，<code>open()</code> 还在写寄存器，KASAN 报 slab-use-after-free；最后一句才说 「Fix this by checking dev->disconnected under dev->lock」。这是常见分工：<b>封面和正文承诺「修什么」，每个补丁标题承诺「这条补丁动哪里」</b>。所以 check / clear / release / Move 不等于「没在修 bug」——只是把机制写进了标题。反过来，缺陷短而明确时，fix + 缺陷名更省事：同系列 <code>fix refcount underflow in em28xx_free_v4l2()</code>。<a href=\"https://lore.kernel.org/linux-media/&lt;20261022194901.14302-3-neganhat@gmail.com&gt;/\">原文</a>"
      - label: "⑤ 一致性：同一系列里，动词形态和大小写要统一"
        text: "e5010 v5 的四条标题并排看很说明问题：<a href=\"https://lore.kernel.org/linux-media/&lt;20261022191503.1025072-2-b-brnich@ti.com&gt;/\">release m2m device on probe failure</a>（小写祈使）、<a href=\"https://lore.kernel.org/linux-media/&lt;20261022191503.1025072-3-b-brnich@ti.com&gt;/\">Fix clk never enabled without CONFIG_PM</a>（大写）、<a href=\"https://lore.kernel.org/linux-media/&lt;20261022191503.1025072-4-b-brnich@ti.com&gt;/\">Move e5010_init_device to Runtime Resume Hook</a>（大写 + Title Case）、<a href=\"https://lore.kernel.org/linux-media/&lt;20261022191503.1025072-5-b-brnich@ti.com&gt;/\">Enable autosuspend for runtime PM</a>（大写）；封面又是名词短语 + 动名词混搭：<a href=\"https://lore.kernel.org/linux-media/&lt;20261022191503.1025072-1-b-brnich@ti.com&gt;/\">E5010 Probe Cleanup and Adding autosuspend</a>。单独看每条都读得懂，并排一看，读者会怀疑是四个人写的。<b>规范形态是 <code>subsystem: summary phrase</code>，summary 用祈使句</b>（内核文档的说法是「像在对代码下命令」）；大小写至少要在系列内统一。写完一个系列，把标题竖着扫一遍——动词形态、首字母大小写、句尾标点——比逐条读正文快得多。"
  - type: divider
    label: "✨ 辅助彩蛋：一个把「决定」说得很谦逊的句型"
  - type: highlight
    title: "Whilst preparing a patchset …, I observed such commonality … that it seemed sensible to attempt a common driver rather than submitting a separate … series again."
    meta: "真实句子，来自 Starvis 2 系列的封面信"
    points:
      - label: "拆解"
        text: "<b>such + 名词 + that</b>：共性（commonality）多到「值得做一个通用驱动」——摆事实，不喊口号。<b>it seemed sensible to attempt</b>：形式主语 + 评价动词；不说「我决定」，而说「这样做看起来合理」，给维护者留讨论空间。<b>rather than + 动名词</b>：并列的是两个<b>方案</b>（做一个通用驱动 vs 再提一个独立系列），不是两个动作，所以用 submitting 不是 submit。"
      - label: "语境翻译"
        text: "在做 IMX662（1080p）的补丁集时，我发现两者的共性多到值得直接做一个通用驱动，而不是再提一个独立的 IMX662 系列。"
      - label: "怎么用"
        text: "在封面信里解释「为什么合并驱动 / 为什么选这个方案」时，这组结构比 「I think it is better to merge」 信息量大得多：such … that 摆事实，it seemed sensible 说判断，rather than + V-ing 摆出被放弃的选项。三部分各司其职，不用靠形容词撑。"
    relevance: "写 cover letter 说明设计取舍时，这组结构能同时交代事实、判断和被放弃的替代方案。"
    link: "https://lore.kernel.org/linux-media/<20261022-media-starvis2-v6-0-374343f55fd3@raspberrypi.com>/"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "拿今天这条真实标题做拆解：<code>[PATCH v6 02/18] media: sony-starvis2: Reorder link frequencies to remove lookup</code>。① 动词 Reorder 向维护者承诺了什么？行为会不会变？② to remove lookup 提供的是什么信息，为什么不写进正文也够？③ 如果你在同一条补丁里还顺手修了一个查表越界，标题该怎么处理？"
    answer: "① Reorder 只承诺「重排 / 调整结构」，不承诺行为改变。正文印证：Reverse the order … so that the table is redundant, and remove it——反转枚举顺序让映射表变成恒等映射再删掉，按作者描述，link frequency 的取值不变。② to remove lookup 是目的从句，回答的是 why：重排不是审美，是为了删掉冗余查表。正文回答 how，标题放一句 why，评审才知道点开值不值。③ 不要塞进同一条标题。重构和修复混在一起，backport 时会把无关改动一起带走，评审也会要求拆开；标准做法是拆成两条——一条 Reorder … to remove lookup，一条 fix out-of-bounds read in …。如果确实只能一条，标题必须如实写出行为变化，不能再留 Reorder 这个「行为不变」的暗示。"
    source: "[PATCH v6 02/18] media: sony-starvis2: Reorder link frequencies to remove lookup\n\nReverse the order of the link frequencies so that the table is redundant, and remove it."
    link: "https://lore.kernel.org/linux-media/<20261022-media-starvis2-v6-2-374343f55fd3@raspberrypi.com>/"
  - type: closing
    tagline: "每日一句：Read the verb first — it tells you what a patch promises, not just what it changes."
    source: "仿写示范"
---
