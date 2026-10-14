---
title: "写作：封面信的 patch 清单怎么写，才让维护者敢合"
date: "2026-10-14"
desc: "今日重点：写作——拆 tpd12s015 转换 v6 封面：一条 patch 一句话并给出「为什么安全」、用数字证明修复有效、带 Acked-by 前进时交代改了什么、主动披露撞车让路，以及反驳自动审查的误报。"
column: "english"
focus: "写作"
tags: ["写作", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——上一篇写作（10-08）拆的是封面信里的<strong>测试小节</strong>；
      今天拆<strong>前面那段 patch 清单</strong>。别小看这几行：
      维护者决定要不要花时间读你的补丁，靠的就是它。这篇 v6 封面把五个动作做全了——
      <strong>每一条都在回答同一个问题：我凭什么敢合它</strong>。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      [2/3] drops two gpio entries from omap5-igep0050.dts that nothing reads:
      the binding and both drivers describe three gpios, and the extra two have
      no pinctrl group and no other consumer in the tree.
  - type: quote
    text: >-
      Patches 2 and 3 remove warnings that the bare conversion leaves behind:
      am5729-beagleboneai: 241 -> 237 dtbs_check warnings
      omap5-igep0050: 188 -> 186 dtbs_check warnings
      with no new warnings in either file.
  - type: paragraph
    text: >-
      出处：Chaosheng Qu，<code>[PATCH v6 0/3] dt-bindings: display: ti, tpd12s015: convert, and fix what the conversion exposed</code>，
      邮件 Date 头 2026-10-12 20:09 北京（注意：radar 上的归档时间比它晚约 20 小时，那是归档戳，不是发信时间）。
      这封是<strong>封面信本身</strong>——练习题的 source 链接直接指向它。
  - type: divider
    label: "✍️ 动作一：一条 patch 一句话，并回答「为什么安全」"
    kind: section
  - type: highlight
    title: "… that nothing reads: the binding and both drivers describe three gpios …"
    meta: "删东西的 patch，最需要证明「删了没事」"
    points:
      - label: "原句"
        text: "[2/3] drops two gpio entries from omap5-igep0050.dts that nothing reads: the binding and both drivers describe three gpios, and the extra two have no pinctrl group and no other consumer in the tree."
      - label: "拆解"
        text: "删代码的补丁最容易被质疑，所以作者用<strong>冒号</strong>把结构摆得很清楚：冒号前一句话说清「删了什么」，冒号后立刻给「为什么删了没事」——三条独立证据：<b>binding 和两个驱动都只描述三个 gpio</b>（说明多出来的两个不在契约里）、<b>没有 pinctrl group</b>、<b>树里没有别的消费者</b>。这就是内核写作的默认格式：<strong>声明 + 冒号 + 证据</strong>。"
      - label: "怎么用"
        text: "写删除类 patch 时，别只说 removed X。套这个格式：<b>drops X that nothing reads: <证据一>, <证据二>, <证据三></b>。<b>nothing reads</b> 是个很地道的说法——不是「没人用」，而是「没有任何代码读它」。"
  - type: divider
    label: "✍️ 动作二：把「修好了」变成可核对的数字"
    kind: section
  - type: highlight
    title: "241 -> 237 dtbs_check warnings … with no new warnings in either file"
    meta: "前后对照 + 兜底声明"
    points:
      - label: "原句"
        text: "Patches 2 and 3 remove warnings that the bare conversion leaves behind: am5729-beagleboneai: 241 -> 237 dtbs_check warnings omap5-igep0050: 188 -> 186 dtbs_check warnings with no new warnings in either file."
      - label: "拆解"
        text: "「修复有效」是主张，不是证据。<strong>241 -> 237、188 -> 186</strong> 才是证据：维护者可以自己跑一遍复现。更关键的是最后那句兜底——<b>with no new warnings in either file</b>：光说「少了几条」不够，还得说明「没多出新的」。<strong>报收益必报副作用</strong>，这是内核写作的硬习惯。"
      - label: "怎么用"
        text: "凡是能产生数字的改动（警告数、测试数、耗时、内存），都给 <b>A -> B</b>。再加一句兜底：「no new X」。"
  - type: divider
    label: "✍️ 动作三：带着别人的 Acked-by 前进，要交代你改了什么"
    kind: section
  - type: highlight
    title: "The only change 1/3 saw between his ack and v5 is …, and that does not change which device trees the binding accepts."
    meta: "一个很少有人做到的高级动作"
    points:
      - label: "原句"
        text: "The only change 1/3 saw between his ack and v5 is the ports $ref Rob asked for, and that does not change which device trees the binding accepts."
      - label: "拆解"
        text: "v5 不小心把 Conor 的 Acked-by 弄丢了，v6 捡回来。问题来了：<strong>捡回一个「对旧版本给的 ack」时，如果中间改过东西，这个 ack 还算数吗？</strong>作者主动把这件事摊开讲：<b>his ack 之后只动了一处</b>（Rob 要求的 ports $ref），而且<b>那处改动不影响这份 binding 接受哪些设备树</b>——言下之意：ack 依然有效。自己不交代，维护者就得自己去 diff 两个版本；交代了，对方一句话就能放行。"
      - label: "怎么用"
        text: "复用别人的 tag 时，主动写清两件事：<b>改了什么</b>（the only change … is …）、<b>为什么不影响该 tag 的有效性</b>（and that does not change …）。"
  - type: divider
    label: "✍️ 动作四：主动披露撞车，把选择权交出去"
    kind: section
  - type: highlight
    title: "If his series is the one to carry this, say so and I will drop mine."
    meta: "发现有人在做同一件事，怎么写"
    points:
      - label: "原句"
        text: "Eduard Bostina posted the same conversion on 2026-07-30, <20260730092245.52034-1-egbostina@gmail.com>. If his series is the one to carry this, say so and I will drop mine."
      - label: "拆解"
        text: "作者自己发现有人三个月前做过同一个转换，于是<strong>主动写进封面</strong>：先给出对方那封的 Message-Id（可核验），再一句把决定权交出去——<b>say so and I will drop mine</b>。不写，等维护者自己发现，那就变成「你在隐瞒重复工作」；写了，就是「我在替你省事」。这是内核列表上最受尊重的一种做法。"
      - label: "怎么用"
        text: "模板：<b>X posted the same <thing> on <date>, <Message-Id>. If his series is the one to carry this, say so and I will drop mine.</b>"
  - type: divider
    label: "✍️ 动作五：反驳自动审查的误报，要指出它为什么不成立"
    kind: section
  - type: highlight
    title: "The sashiko finding that gpios lacks \"minItems: 3\" is not valid."
    meta: "机器人报的警，也要讲道理地驳回"
    points:
      - label: "原句"
        text: "The sashiko finding that gpios lacks \"minItems: 3\" is not valid. Rob explained that dt-schema makes the two bounds equal when only one of them is given, so \"maxItems: 3\" already means exactly three."
      - label: "拆解"
        text: "自动审查机器人（<b>Sashiko</b>）提了一条 finding，作者认为不成立。注意他驳回的方式：<strong>不是「机器人不懂」，而是给出机制层面的理由</strong>——dt-schema 在只给一个边界时会把上下界设成相等，所以 maxItems: 3 已经意味着「恰好三个」。而且他注明这个解释来自 <b>Rob</b>（该领域维护者），等于给自己的判断加了背书。"
      - label: "怎么用"
        text: "驳回任何审查意见（人或机器）都用这个结构：<b>The finding that X is not valid. <来源> explained that <机制原因>.</b> —— 先说结论，再给机制，最后给依据来源。"
  - type: divider
    label: "✨ 辅助彩蛋：Acked-by 到底承诺了什么"
    kind: section
  - type: highlight
    title: "Acked-by / Reviewed-by / Tested-by 的分量不一样"
    meta: "定义取自内核官方文档（非本封邮件）"
    points:
      - label: "官方定义（节选）"
        text: "Acked-by: is not as formal as Signed-off-by:. It is a record that the acker has at least reviewed the patch and has indicated acceptance. / Acked-by: is also less formal than Reviewed-by:."
      - label: "中文"
        text: "Acked-by <strong>没有</strong> Signed-off-by 那么正式，它只记录「此人至少看过、并表示接受」；它也比 Reviewed-by 轻。三者分量大致是：<b>Signed-off-by</b>（我参与了这个补丁，愿意署名担责）&gt; <b>Reviewed-by</b>（我按 Reviewer's Statement 做过技术审查）&gt; <b>Acked-by</b>（我认可它落地，但不代表我做过同等深度的审查）。"
      - label: "为什么值得知道"
        text: "因为读封面信时，tag 会告诉你「谁在为什么背书」。看到 Acked-by，别当成 Reviewed-by 读——投稿人自己也得清楚：<b>攒到一个 Acked-by，不等于通过了技术审查</b>。"
      - label: "出处"
        text: "Documentation/process/submitting-patches.rst（Linux 内核树内文档，链接见下方「练习」节后的引用）。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "你做了一个 dt-bindings 转换，转换过程暴露出两个既有问题。写三段英文：① 用一句话说清第二个 patch 干什么，并用「声明 + 冒号 + 证据」的格式给出「为什么它安全」；② 用数字证明修复有效，并兜底说明没引入新警告；③ 你带着一位维护者的 Acked-by 发新版，但 ack 之后你又改了一行——怎么交代才不让人怀疑这个 ack 失效了？"
    answer: "参考作答（仿写示范，非原文）：① [2/3] drops the two unused gpio entries from <file> that nothing reads: the binding and both drivers describe three gpios, and the extra two have no pinctrl group and no other consumer in the tree. ② Patches 2 and 3 remove warnings that the bare conversion leaves behind: <board-a>: 241 -> 237 dtbs_check warnings <board-b>: 188 -> 186 dtbs_check warnings with no new warnings in either file. ③ Carry <maintainer>'s Acked-by on 1/3. The only change 1/3 saw between his ack and this version is the $ref he asked for, and that does not change which device trees the binding accepts."
    source: "[2/3] drops two gpio entries from omap5-igep0050.dts that nothing reads: the binding and both drivers describe three gpios, and the extra two have no pinctrl group and no other consumer in the tree. / Patches 2 and 3 remove warnings that the bare conversion leaves behind: am5729-beagleboneai: 241 -> 237 dtbs_check warnings omap5-igep0050: 188 -> 186 dtbs_check warnings with no new warnings in either file. / The only change 1/3 saw between his ack and v5 is the ports $ref Rob asked for, and that does not change which device trees the binding accepts."
    link: "https://lore.kernel.org/dri-devel/<20261012120910.506444-1-quchaosheng000406@163.com>/"
  - type: paragraph
    text: >-
      彩蛋引用的内核官方文档：<a href="https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/Documentation/process/submitting-patches.rst">Documentation/process/submitting-patches.rst</a>（git.kernel.org，已实测可访问）。
  - type: closing
    tagline: "每日一句：A cover letter is not a summary of your patches. It is the case for why they are safe to take."
    source: "仿写示范"
---
