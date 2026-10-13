---
title: "阅读：先找主句——内核长句的三个粘合装置"
date: "2026-10-13"
desc: "今日重点：阅读——精读 PCI/P2PDMA v10 封面，学拆内核长句：冒号展开、分号对照、句尾 unless 尾巴，以及压缩定语。句子全部逐字取自原文。"
column: "english"
focus: "阅读"
tags: ["阅读", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：📖 阅读</strong>——上一篇阅读（10-02）看的是整封 RFC 的<strong>论证结构</strong>。
      今天往下潜一层，讲<strong>句子</strong>：内核英文读着累，通常不是因为生词多，
      而是修饰语套修饰语。这一篇的封面只有四段话，却集齐了三个「粘句装置」。
      认全它们，六十个词的长句也能一眼断出骨架。<strong>阅读的第一步，永远是先找主句。</strong>
  - type: divider
    label: "📖 精读原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      PCI P2PDMA applies Request and Completion Redirect throughout both paths.
      This misclassifies asymmetric and nested switches, and reports one answer
      for every kind of TLP.
  - type: quote
    text: >-
      Three ACS controls act on TLP attributes the Requester chooses rather than
      on the topology: Translation Blocking and Direct Translated P2P act on a
      Request's Address Type, and Completion Redirect skips Completions carrying
      Relaxed Ordering.
  - type: quote
    text: >-
      Evaluate each direction at the path divergence, decide every class from the
      one walk, and treat a client with ATS enabled as translating unless its
      driver declares per-mapping ATS.
  - type: paragraph
    text: >-
      出处：Leon Romanovsky（NVIDIA），<code>[PATCH v10 00/18] PCI/P2PDMA: Route peer-to-peer DMA by TLP class</code> 封面，
      2026-10-12 21:08 北京。这封是<strong>封面信本身</strong>——练习题的 source 链接直接指向它，
      点开就能看到上面每一句原文。
  - type: divider
    label: "📖 装置一：冒号展开"
    kind: section
  - type: highlight
    title: "① 冒号：左边是骨架，右边是脚注"
    meta: "先用主句给结论，冒号后面才展开明细"
    points:
      - label: "原句"
        text: "Three ACS controls act on TLP attributes the Requester chooses rather than on the topology: Translation Blocking and Direct Translated P2P act on a Request's Address Type, and Completion Redirect skips Completions carrying Relaxed Ordering."
      - label: "拆解"
        text: "先砍掉冒号右边那一大串，主句是：<b>Three ACS controls act on TLP attributes … rather than on the topology</b>（三个 ACS 控制作用于 TLP 属性，而不是作用于拓扑）。冒号右边用 and 并列两个子句，分别是每个控制的具体作用——它是<b>脚注</b>：不看也不影响你理解主干。这就是内核英文最标准的呈现顺序：<b>结论在前，明细在后，用冒号分开</b>。"
      - label: "顺带"
        text: "这个主句里还塞了一处：<b>TLP attributes the Requester chooses</b>——省略了关系代词 that 的定语从句，等于 attributes <i>that</i> the Requester chooses。看到「名词 + 主谓」紧挨着，先怀疑这里藏了个省略 that 的从句。"
  - type: divider
    label: "📖 装置二：分号对照"
    kind: section
  - type: highlight
    title: "② 分号：话锋一转"
    meta: "前后要么并列，要么对照——绝不平淡"
    points:
      - label: "原句一"
        text: "This completes the P2PDMA side; dma-buf and mlx5 follow separately."
      - label: "原句二"
        text: "Used the PCIe terms Requester and Completer for TLPs, ACS and ports; client and provider remain for P2PDMA objects."
      - label: "拆解"
        text: "分号是「话锋一转」的信号。第一句：前半说「P2PDMA 这边收工了」，分号后立刻交代「dma-buf 和 mlx5 另外再来」——<b>说清边界</b>。第二句更典型，作者在 changelog 里讲术语改动：分号<b>前</b>是「把 TLP / ACS / port 改用 PCIe 的 Requester 与 Completer」，分号<b>后</b>是「client 和 provider 这两个词保持不变」。<b>改了什么 / 没改什么</b>，一句话说完。读到分号，先问一句：后半句是「并列补充」还是「对照转折」？"
  - type: divider
    label: "📖 装置三：句尾 unless"
    kind: section
  - type: highlight
    title: "③ 句尾的 unless：条件一成立，前面就作废"
    meta: "先把并列动词数清，再处理尾巴"
    points:
      - label: "原句"
        text: "Evaluate each direction at the path divergence, decide every class from the one walk, and treat a client with ATS enabled as translating unless its driver declares per-mapping ATS."
      - label: "拆解"
        text: "这句子有 30 多个词，但主句其实极简单——<b>三个祈使动词并列</b>：Evaluate …、decide …、and treat …。把三个动词切出来，句子就散架成三块。最麻烦的是第三块尾巴上的 <b>unless</b>：treat X as translating <i>unless</i> …。读法固定：<b>unless 引出的条件一旦成立，前面的结论直接作废</b>——驱动声明了 per-mapping ATS，就不按 translating 处理。内核英文里 unless / provided / as long as 这类尾巴，都是「默认结论 + 例外条件」的结构。"
      - label: "顺带"
        text: "注意 <b>from the one walk</b> 这个说法：the one walk 指「同一次遍历」，one 在这里是强调「就一次，不重复走」。英文里 the + one 常用来强调「同一个」，不是数字。"
  - type: divider
    label: "📖 装置四：压缩定语"
    kind: section
  - type: highlight
    title: "④ 压缩定语：内核英文最爱省的关系从句"
    meta: "with + 过去分词 / 现在分词 / 省略 that"
    points:
      - label: "三种压缩（等号左边均为原文，右边是还原出的完整从句）"
        text: "a client with ATS enabled ＝ a client that has ATS enabled（with + 名词 + 过去分词）；Completions carrying Relaxed Ordering ＝ Completions that carry Relaxed Ordering（现在分词后置）；TLP attributes the Requester chooses（省略关系代词 that，原文即此形）。"
      - label: "拆解"
        text: "内核英文几乎不用长关系从句，而是压成短语：<b>with</b> 短语表「带着某状态」、<b>现在分词</b>表「正在做某事」、<b>过去分词</b>表「被怎样」。压缩带来一个副作用——名词后面突然出现动词，读者容易断错句。所以遇到「名词 + 动词」贴在一起又没有连词时，先假设这里被省掉了一个 that。"
      - label: "怎么用"
        text: "自己写的时候也可以这样压：a request <b>carrying</b> Relaxed Ordering、a device <b>with</b> ATS <b>enabled</b>。但要在「省得地道」和「读得清楚」之间取舍——省过头，评审就得回头问你。"
  - type: divider
    label: "✨ 辅助彩蛋：术语跟着层走"
  - type: highlight
    title: "Requester / Completer 与 client / provider 的分工"
    meta: "同一份代码里，两套术语各管一层"
    points:
      - label: "原句"
        text: "Used the PCIe terms Requester and Completer for TLPs, ACS and ports; client and provider remain for P2PDMA objects."
      - label: "中文与语境"
        text: "PCIe 规范里，发出 TLP 的一方叫 <b>Requester</b>、回应的一方叫 <b>Completer</b>。而 P2PDMA 这套代码有自己的叫法：<b>client</b> 与 <b>provider</b>。作者的取舍是按层次分——讲 TLP、ACS、port 这些 PCIe 概念时用规范原生术语，讲 P2PDMA 对象时保留本层叫法。这不是术语洁癖：评审者看到用词就知道你在说哪一层的对象。"
      - label: "记忆钩子"
        text: "<b>术语跟着层走，换层就换词。</b>拿一套词硬套两层，是读内核英文时最常见的困惑来源——看到 Requester 和 client 同时出现，先问它们是不是在指同一样东西的不同层次。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "拆下面这句：先断出主句（有几个并列动词？），再说明第三个动词后面挂的尾巴是什么、什么条件下前面的结论会作废。"
    answer: "参考作答（仿写示范，非原文）：主句是三个祈使动词并列——① Evaluate each direction at the path divergence（在路径分叉处评估每个方向）；② decide every class from the one walk（一次遍历决定所有类别）；③ treat a client with ATS enabled as translating（把「ATS 已启用的 client」当作正在翻译）。第三个动词后面挂的是一个 unless 条件从句：unless its driver declares per-mapping ATS。含义是「默认按 translating 处理，除非驱动声明了 per-mapping ATS」——条件成立时前面的结论作废。另注：a client with ATS enabled 是压缩定语，等于 a client that has ATS enabled。"
    source: "Evaluate each direction at the path divergence, decide every class from the one walk, and treat a client with ATS enabled as translating unless its driver declares per-mapping ATS."
    link: "https://lore.kernel.org/linux-media/<20261012-fix-p2p-acs-v4-0-v10-0-6ffe7b7a4517@nvidia.com>/"
  - type: closing
    tagline: "每日一句：Read for the main clause first. Everything else in a kernel sentence is a footnote hanging off it."
    source: "仿写示范"
---
