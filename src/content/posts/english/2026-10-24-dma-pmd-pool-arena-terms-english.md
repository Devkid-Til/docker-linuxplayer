---
title: "术语卡：dma_pmd_pool 与 dma_pmd_arena——先问「谁活得久」"
date: "2026-10-24"
desc: "今日重点：术语卡——用 DMA_PMD 提案的原文定义，按「问题 → 资源 → 分配器」串起四个词：IOTLB thrashing、DMA_PMD page、dma_pmd_pool、dma_pmd_arena。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🏷️ 术语卡</strong>——今天雷达的头条是 <code>DMA_PMD</code>，
      一个 22 补丁的 RFC。它自带一整套词汇：先给问题起名，再给资源起名，
      最后给两个分配器起名。<strong>四个词按「问题 → 资源 → 分配器」串起来记</strong>，
      比单独背四个中文译名有用——因为译名会变，它们在某条调用链上的位置不会。
      定义逐字取自系列头封；头封发出已三周，10-23 起的新一轮讨论今天早上还在雷达里。

  - type: divider
    label: "📖 原文（真实定义，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      IOTLB thrashing, shows up dramatically when the IO access pattern
      exceeds the IOTLB size, and IOMMU page walks slow down bus activity
      up to a point where we see over 30..60% throughput reduction just for
      this reason.
  - type: quote
    text: >-
      DMA_PMD pages, i.e. physically contiguous PMD_SIZE (2MB) pages mapped
      via PDE_SIZE IOMMU entries
  - type: paragraph
    text: >-
      出处：Luigi Rizzo 的系列头封
      <code>[RFC: DMA_PMD 00/22] DMA_PMD: PMD_SIZE-backed IO buffer pools</code>。
      两句原文和后面两张分配器卡的定义都在同一封邮件里。
      顺带一个读邮件的习惯：原文写 <code>dma_pmd_arena, is another allocator…</code>，
      逗号是作者的笔误——逐字引用不替作者改，但你自己写的时候别学这一处。

  - type: divider
    label: "🏷️ 术语一：IOTLB thrashing —— 问题层"
    kind: section
  - type: highlight
    title: "IOTLB thrashing（翻译缓存抖动）"
    meta: "先给「慢在哪」起个名字"
    points:
      - label: "原文定义"
        text: "IOTLB thrashing, shows up dramatically when the IO access pattern exceeds the IOTLB size, and IOMMU page walks slow down bus activity up to a point where we see over 30..60% throughput reduction just for this reason."
      - label: "中文与角色"
        text: "IOTLB 是 IOMMU 的地址翻译缓存（I/O Translation Lookaside Buffer，这是通识展开，原文只给了行为定义）。这句话的判据很具体：<b>IO 访问模式超过了 IOTLB 容量</b>。后果不是丢包，而是 <b>IOMMU page walk 拖慢总线</b>，最终表现为 30–60% 的吞吐下降。原文把这笔账和另外两项 IOMMU 成本并列：map/unmap 的 CPU 成本、同步 IOTLB flush 的延迟。"
      - label: "同一封邮件里的数据"
        text: "DMA-FQ 模式：25,757,488 次 IOTLB lookup，其中 16,634,941 次 miss；DMA_PMD 模式：22,693,218 次 lookup，30,536 次 miss。作者的原话是 <i>The 2MB mappings made IOTLB misses almost non existent</i>。"
      - label: "记忆钩子"
        text: "看到 thrashing，不要只译「抖动」，补一句：<b>谁的工作集超过了谁的容量</b>。这里是 IO 访问模式超过了 IOTLB。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-mm/&lt;20261003212241.3432303-1-lrizzo@google.com&gt;/\">lore.kernel.org · 系列头封</a>"

  - type: divider
    label: "🏷️ 术语二：DMA_PMD page —— 资源层"
    kind: section
  - type: highlight
    title: "DMA_PMD page（2MB 连续物理页）"
    meta: "这一族词共同指向的那个「东西」"
    points:
      - label: "原文定义"
        text: "DMA_PMD pages, i.e. physically contiguous PMD_SIZE (2MB) pages mapped via PDE_SIZE IOMMU entries"
      - label: "中文与角色"
        text: "两个限定词缺一不可。<b>physically contiguous</b> 是物理连续；<b>PMD_SIZE (2MB)</b> 是大小——PMD 是 x86 / arm64 四级页表里的中间一级，4KB 基页下 PMD_SIZE = 2MB。<b>mapped via PDE_SIZE IOMMU entries</b> 说的是 IOMMU 侧也按 2MB 这一级建立映射。合起来的效果：512 个 4KB 片段共享一个大映射，IOTLB 看到的工作集缩小约 512 倍。"
      - label: "命名上的分工"
        text: "这个词说明的是<b>映射粒度</b>，不是分配策略。谁负责切页、谁负责回收，留给后面两个词。<code>PMD_SIZE (2MB) pages</code> 和正文里的 <code>2MB mappings</code> 指的是同一件事，不必当成两种对象。"
      - label: "记忆钩子"
        text: "PMD_SIZE 先联想<b>页表层级</b>，不要直接联想 THP：这里强调的是尺寸与映射方式，不是透明大页的分配策略。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-mm/&lt;20261003212241.3432303-1-lrizzo@google.com&gt;/\">lore.kernel.org · 系列头封</a>"

  - type: divider
    label: "🏷️ 术语三：dma_pmd_pool —— 短寿命那一侧"
    kind: section
  - type: highlight
    title: "dma_pmd_pool（池分配器）"
    meta: "替代 alloc_pages()，供页给 pagepool 与 skb_page_frag_refill()"
    points:
      - label: "原文定义"
        text: "dma_pmd_pool, a replacement for alloc_pages() that can be instantiated per-CPU or per receive queue. It handles the split of PMD_SIZE pages into order-N blocks, handles dma_map and unmap, and aggressively recycles entries."
      - label: "中文与角色"
        text: "三个动词说明它干什么：<b>split</b> 把 2MB 切成 order-N 块；<b>dma_map and unmap</b> 连映射一起管（这就是它住在 iommu/dma 而不是 mm 的原因）；<b>aggressively recycles</b> 按块积极回收。<code>replacement for alloc_pages()</code> 替换的是「拿页」这一层，不是 page_pool。"
      - label: "层级看 feed"
        text: "原文用 <code>feed</code> 描述它和上层的关系：给 <code>skb_page_frag_refill()</code>、pagepool、以及不用 pagepool 的驱动的收包缓冲供页。<b>pool 是供给者，pagepool 是它上面的消费层之一</b>——把这两个 pool 当成同一个东西，是读这段最容易犯的错。"
      - label: "为什么另造一个 pool"
        text: "作者在 [2] 专门写了 WHY NOT PAGEPOOL FOR TX AND EVERYTHING：pagepool 不处理 2MB 页的切分与映射，它提供的页也无法干净地走 get_page()/put_page()。这两条是理解「为什么不扩 pagepool」的关键。"
      - label: "记忆钩子"
        text: "看到 pool，找两个信号：<b>recycles</b>（回收什么）和 <b>feed</b>（喂给谁）。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-mm/&lt;20261003212241.3432303-1-lrizzo@google.com&gt;/\">lore.kernel.org · 系列头封</a>"

  - type: divider
    label: "🏷️ 术语四：dma_pmd_arena —— 长寿命那一侧"
    kind: section
  - type: highlight
    title: "dma_pmd_arena（区分配器）"
    meta: "dma_alloc_attrs() 的后端"
    points:
      - label: "原文定义"
        text: "dma_pmd_arena, is another allocator backed by DMA_PMD pages and is used exclusively as the backend for dma_alloc_attrs(). Used for longer-lived allocations (descriptor/completion rings, rx and tx header buffers)"
      - label: "中文与角色"
        text: "<code>backend for dma_alloc_attrs()</code> 说明位置：它不直接面向每个收包动作，而是给 dma_alloc_attrs() 提供底层内存；<code>longer-lived allocations</code> 说明寿命：描述符/完成环、rx/tx header。arena 这个词的语感是「一整块场地，划出去长期占用」（这是词义理解，非原文定义），正好和 pool 的反复回收相对。"
      - label: "两个分配器只差两句介词短语"
        text: "pool 是 <b>replacement for alloc_pages()</b>，arena 是 <b>backend for dma_alloc_attrs()</b>。前者替代一个底层页分配接口，后者充当另一个 API 的后端。<b>读定义时先圈出 for 后面的接口名</b>，位置就定了。"
      - label: "记忆钩子"
        text: "先问寿命：这块内存会不会很快回收？再问位置：它替代谁、或给谁当后端。收包缓冲 → pool；描述符环、header → arena。"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-mm/&lt;20261003212241.3432303-1-lrizzo@google.com&gt;/\">lore.kernel.org · 系列头封</a>"

  - type: paragraph
    text: >-
      把四张卡连起来：<strong>IOTLB thrashing 是问题，DMA_PMD page 是资源，
      dma_pmd_pool 管短寿命的收包缓冲，dma_pmd_arena 管长寿命的 ring 与 header</strong>。
      同一族名字，分工由寿命和位置决定，不由词根决定。

  - type: divider
    label: "✨ 辅助彩蛋：Your mileage may vary"
  - type: highlight
    title: "给性能数字先免责，再给数"
    meta: "YMMV + 「may …, until it does」"
    points:
      - label: "原句"
        text: "Your mileage may vary. Enabling the IOMMU may have no throughput impact, until it does when some system components (bus, IOTLB, CPU) become overloaded."
      - label: "中文与用法"
        text: "YMMV 直译是「你的里程数可能不同」，实际意思就是「效果因环境而异」。后半句的骨架更值得记：<b>may have no impact, until it does</b>——平时看不出影响，直到某个条件被踩到。比 but sometimes 更有画面，也更准确。作者用这两句给后面的计数器做铺垫：<b>先声明不保证复现，再给数据</b>。"
      - label: "仿写示范"
        text: "A 4KB mapping may cost nothing—until the working set outgrows the IOTLB.（仿写示范）"
      - label: "溯源"
        text: "<a href=\"https://lore.kernel.org/linux-mm/&lt;20261003212241.3432303-1-lrizzo@google.com&gt;/\">lore.kernel.org · 系列头封</a>"

  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用英文回答三问，答案尽量落在原文的词上：① 作者怎么定义 IOTLB thrashing，它造成的直接症状是什么？② DMA_PMD page 的两个关键限定词是什么（尺寸 + 物理布局），它们为什么能减少 IOTLB miss？③ 每个收包队列的 RX 缓冲该用 pool 还是 arena？描述符环（descriptor ring）呢？各用原文的哪个短语作依据？"
    answer: "参考作答（仿写示范，非原文）：① The author describes IOTLB thrashing as a cost that shows up when the IO access pattern exceeds the IOTLB size; IOMMU page walks then slow down bus activity, and throughput can drop by 30–60% for this reason alone. ② The two qualifiers are 'physically contiguous' and 'PMD_SIZE (2MB)': one IOMMU mapping covers a 2MB range, so the working set seen by the IOTLB is reduced by a factor of ~512. ③ RX buffers per receive queue fit dma_pmd_pool, which can be instantiated per receive queue and aggressively recycles entries; descriptor/completion rings fit dma_pmd_arena, which is used for longer-lived allocations and is the backend for dma_alloc_attrs()."
    source: "IOTLB thrashing, shows up dramatically when the IO access pattern exceeds the IOTLB size, and IOMMU page walks slow down bus activity up to a point where we see over 30..60% throughput reduction just for this reason. / dma_pmd_pool, a replacement for alloc_pages() that can be instantiated per-CPU or per receive queue. It handles the split of PMD_SIZE pages into order-N blocks, handles dma_map and unmap, and aggressively recycles entries. / dma_pmd_arena, is another allocator backed by DMA_PMD pages and is used exclusively as the backend for dma_alloc_attrs(). Used for longer-lived allocations (descriptor/completion rings, rx and tx header buffers)"
    link: "https://lore.kernel.org/linux-mm/<20261003212241.3432303-1-lrizzo@google.com>/"
  - type: closing
    tagline: "每日一句：When a proposal invents its vocabulary, learn each word by the job it does — the translation will fail you long before the role does."
    source: "仿写示范"
---
