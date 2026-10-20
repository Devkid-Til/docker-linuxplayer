---
title: "阅读：长句先分层——主句、理由、让步、结论各归其位"
date: "2026-10-20"
desc: "今日重点：阅读——从 linux-media 的 C-PHY 评审里挑三句真实长句：主句后挂两个理由、It is conceivable that…but 的让步框架、That said…but yes 的转折链，逐句拆骨架。"
column: "english"
focus: "阅读"
tags: ["阅读", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：📖 阅读</strong>——读到一句四五十个词的内核评审，先别急着逐词翻译。
      今天的三句都来自同一场 C-PHY API 评审：一句是<strong>推荐 + 两个理由</strong>，
      一句是<strong>让步 + 立场</strong>，还有一句把<strong>三个转折词</strong>串成一条链。
      三句都不难在词汇，难在<strong>哪一层属于谁</strong>。
      读法只有一个：<strong>先找主句，再给每个附属结构贴标签。</strong>
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      I earlier recommended using "trios" in the other C-PHY series to be more
      accurate and emphasize the distinction from D-PHY's (two-wire lanes), and
      because it is the terminology commonly used in the C-PHY specification.
  - type: quote
    text: >-
      That said, I'm fine with either term, but yes, we should be consistent and
      avoid mixing "lanes" and "trios" within the same structure.
  - type: quote
    text: >-
      It is conceivable that other systems may want to pass data-lanes down to
      the driver because they won't have a media-graph but, I'd say we should
      arbitrate that then - leave it up to someone who needs the fields to add
      them.
  - type: paragraph
    text: >-
      出处：linux-media 的 C-PHY 讨论，线程
      <code>Re: [PATCH 1/3] phy: core: add generic MIPI C-PHY configuration API</code>。
      Loic Poulain（Qualcomm）的两句发于 2026-10-19；Bryan O'Donoghue 的回复也在同一天，早约三小时。
      每张卡片下方给的是<strong>该句所在的那封邮件</strong>，点开即可对照原文。
  - type: divider
    label: "📖 装置一：主句落地，理由后挂"
    kind: primary
  - type: highlight
    title: "① 一个主句，两个理由，两种形式"
    meta: "to do … and because … —— 并列的不一定同形"
    points:
      - label: "原句"
        text: >-
          I earlier recommended using "trios" in the other C-PHY series to be more
          accurate and emphasize the distinction from D-PHY's (two-wire lanes), and
          because it is the terminology commonly used in the C-PHY specification.
      - label: "拆解"
        text: >-
          先划到第一个逗号：<b>I earlier recommended using "trios" in the other C-PHY series</b>——
          这就是主句，观点已经说完：我之前推荐在那个 C-PHY 系列里用 trios。后面全部是<strong>理由</strong>，而且有两条：
          ① <b>to be more accurate and emphasize the distinction from D-PHY's (two-wire lanes)</b>
          （为了更准确，也为了强调与 D-PHY 的区别）；
          ② <b>because it is the terminology commonly used in the C-PHY specification</b>
          （因为这是 C-PHY 规范里常用的说法）。<br>
          注意最外层那个 <b>and</b>：它并列的是<strong>两个理由</strong>，不是两个动词——
          左边是目的不定式，右边是 because 从句，<strong>形式不同，功能相同</strong>。
          邮件英文里这种「混合并列」很常见，读的时候先给每块贴功能标签，别被形式带跑。
      - label: "顺带"
        text: >-
          <b>D-PHY's</b> 是所有格，等于 D-PHY's lanes；括号里的 <b>(two-wire lanes)</b>
          是同位补充——一句话解释「D-PHY 的 lane 是两线差分对」。把括号拿掉，句子照样通，
          只是读者少了一个定义。
      - label: "读法"
        text: >-
          遇到「主句, to do …, and because …」，先问：这几个成分是不是都在回答<strong>「为什么」</strong>？
          是，就都属于理由层——主句的立场在第一个逗号前就已经定了。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;CAFEp6-2f7dzz2rrNuTE=4VXgkM55qvYY1SANcZE_8TutkJ+SAw@mail.gmail.com&gt;/">Loic Poulain，2026-10-19</a>
  - type: divider
    label: "📖 装置二：It is conceivable that … but …"
    kind: primary
  - type: highlight
    title: "② 前半是让步，后半才是立场"
    meta: "形式主语先把可能性摆上桌，but 之后才表态"
    points:
      - label: "原句"
        text: >-
          It is conceivable that other systems may want to pass data-lanes down to
          the driver because they won't have a media-graph but, I'd say we should
          arbitrate that then - leave it up to someone who needs the fields to add
          them.
      - label: "拆解"
        text: >-
          <b>It is conceivable that …</b> 是形式主语：真正的主语是 that 从句
          （other systems may want to pass data-lanes down to the driver …），it 只是占位。
          直译是「可以设想，其他系统可能……」——<strong>但这不是作者的立场</strong>，
          它只是先把一种可能性承认下来。真正的立场在 <b>but</b> 之后：
          <b>I'd say we should arbitrate that then</b>（要我说，那就到时候再定）。
          破折号后的 <b>leave it up to someone who needs the fields to add them</b>
          是对前半的具体展开：<strong>交给真正需要这些字段的人来加</strong>。
      - label: "顺带"
        text: >-
          <b>arbitrate</b> 在这里不是「仲裁纠纷」，而是「拍板、裁定」——现在还不需要这些字段，
          等有人真需要时再做决定。<b>pass … down to the driver</b> 的 down 表示「从上往下传」：
          框架层把信息传给驱动层。
      - label: "读法"
        text: >-
          看到 <b>It is conceivable that</b> / <b>It is possible that</b> /
          <b>One could argue that</b>，先把整句标成「让步」，往后找
          <b>but</b> / <b>however</b> / <b>that said</b>。评审里的真实态度，几乎总在转折词之后。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;324dcc61-6085-446c-8bf7-564486f319bd@kernel.org&gt;/">Bryan O'Donoghue，2026-10-19</a>
  - type: divider
    label: "📖 装置三：That said … but yes …"
    kind: primary
  - type: highlight
    title: "③ 三个转折词串成链，结论在最后"
    meta: "先让一步，再同意一半，最后才说要求"
    points:
      - label: "原句"
        text: >-
          That said, I'm fine with either term, but yes, we should be consistent and
          avoid mixing "lanes" and "trios" within the same structure.
      - label: "拆解"
        text: >-
          <b>That said</b>（话虽如此）先把上一句的推荐往回拉一点；
          <b>I'm fine with either term</b>（两个词我都能接受）是让一步；
          <b>but yes</b> 是「但确实」——同意对方的同时把话锋转回来；
          最后 <b>we should be consistent and avoid mixing …</b> 才是真正的要求：
          <strong>同一个结构里不要混用 lanes 和 trios</strong>。<br>
          这一句的风险在中间半句：读到 I'm fine with either term，容易以为作者没有立场；
          其实它只是<strong>让步</strong>，最终立场由 should 给出。
      - label: "读法"
        text: >-
          转折词链越长，越要读到最后。把 <b>That said / but / yes / should</b> 圈出来，
          句子就变成：让步 → 让步 → 同意 → 要求。四段一分开，四十个词也不难。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;CAFEp6-2f7dzz2rrNuTE=4VXgkM55qvYY1SANcZE_8TutkJ+SAw@mail.gmail.com&gt;/">Loic Poulain，2026-10-19</a>
  - type: divider
    label: "✨ 辅助彩蛋：data-lanes、data_lanes 与 symbol_rate"
  - type: highlight
    title: "连字符与下划线，读的是两个世界"
    meta: "设备树属性 vs C 结构体字段"
    points:
      - label: "原句"
        text: >-
          data-lanes = <4 5 6 1 2 3>; => trios = 2 => data_lanes[4, 5, 6, 1, 2, 3];
      - label: "中文与语境"
        text: >-
          <b>data-lanes</b> 带连字符，是设备树（DT）里的属性名；<b>data_lanes</b> 带下划线，
          是 C 代码里的字段或数组。Bryan 用这个例子说明：DT 里写 6 个 pad，按每 3 个一组，就是 2 个 trio。<br>
          <b>symbol_rate</b> 是「每秒符号数」——Bryan 的原话是
          <b>so both the CSID and phy agree on symbols per second</b>
          （让 CSID 和 PHY 对每秒符号数达成一致）。C-PHY 一个符号不是一位，
          所以带宽计算看的是符号率，不能直接拿比特率套。
      - label: "记忆钩子"
        text: >-
          <b>DT 用连字符，C 用下划线；D-PHY 数差分对，C-PHY 数三线组。</b>
          看到 data-lanes 先想设备树，看到 data_lanes 先想结构体。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;c6d963f5-a57e-4086-972a-4f04af2c5b42@linaro.org&gt;/">data-lanes 与 trios（Bryan，10-19）</a>；
          <a href="https://lore.kernel.org/linux-media/&lt;324dcc61-6085-446c-8bf7-564486f319bd@kernel.org&gt;/">symbol_rate（Bryan，10-19）</a>
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "拆下面这句：① 主句到哪里结束？② 后面有几个理由，分别由什么形式引导？③ 最外层的 and 并列的是什么？"
    answer: "参考作答（非原文）：① 主句到第一个逗号为止：I earlier recommended using \"trios\" in the other C-PHY series（我之前推荐在那个 C-PHY 系列里用 trios）。② 主句后挂两个理由：to be more accurate and emphasize the distinction from D-PHY's (two-wire lanes) 是目的不定式；because it is the terminology commonly used in the C-PHY specification 是原因从句。③ 最外层的 and 并列的是这两个理由——一个不定式、一个 because 从句，形式不同但功能相同；不定式内部还有一个 and，并列 be more accurate 与 emphasize 两个动词原形。另注：D-PHY's 是所有格，等于 D-PHY's lanes；括号 (two-wire lanes) 是对 lane 的同位解释。"
    source: "I earlier recommended using \"trios\" in the other C-PHY series to be more accurate and emphasize the distinction from D-PHY's (two-wire lanes), and because it is the terminology commonly used in the C-PHY specification."
    link: "https://lore.kernel.org/linux-media/<CAFEp6-2f7dzz2rrNuTE=4VXgkM55qvYY1SANcZE_8TutkJ+SAw@mail.gmail.com>/"
  - type: closing
    tagline: "每日一句：In a long sentence, find the main clause first; every other clause is there to qualify it."
    source: "仿写示范"
---
