---
title: "术语卡：netmem 设计原则里的五个词——约束句比定义句更值钱"
date: "2026-10-11"
desc: "今日重点：术语卡——从 netmem 设计原则文档里学五个术语（netmem_ref / memory provider / downcast / unreadable / legacy compatibility wrapper），定义全部逐字取自原文。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🏷️ 术语卡</strong>——上一篇术语卡讲的是「作者当场给定义」。
      今天换个角度：<strong>学约束句</strong>。
      这份 netmem 设计原则文档最有价值的不是名词解释，而是那一串
      <code>is not allowed unless</code>、<code>must not assume</code>——
      <strong>一个术语真正的信息量，在于它禁止你假设什么</strong>。五个词，定义全部逐字取自原文。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      Memory providers (or the default page_pool allocator) allocate underlying
      memory (struct net_iov or struct page), cast it to netmem_ref, and supply it
      to page_pool. The page_pool, drivers, and networking stack operate on
      netmem_ref as the abstract type. Existing page_pool APIs that allocate or
      free struct page are legacy compatibility wrappers for drivers that do not
      yet support netmem_ref.
  - type: paragraph
    text: >-
      出处：Mina Almasry（Google），<code>[PATCH net-next v3 2/2] docs: netmem: document netmem and memory provider design principles</code>，
      2026-10-10 11:36 北京（03:36 UTC）。这封是 <strong>docs 补丁本身</strong>（<code>Documentation/networking/netmem.rst</code> 加 53 行），
      不是系列封面——所以下面每条引用点开链接都能<strong>直接看到那段原文</strong>。
      该系列已收到 Björn Töpel、Pavel Begunkov 的 Reviewed-by 和 Stanislav Fomichev 的 Acked-by。
  - type: divider
    label: "🏷️ 术语一：netmem_ref"
    kind: section
  - type: highlight
    title: "netmem_ref（网络内存的抽象引用）"
    meta: "整个网络栈只认这个句柄，不认它底下是什么"
    points:
      - label: "原文定义"
        text: "Memory providers (or the default page_pool allocator) allocate underlying memory (struct net_iov or struct page), cast it to netmem_ref, and supply it to page_pool. The page_pool, drivers, and networking stack operate on netmem_ref as the abstract type."
      - label: "中文解释"
        text: "网络栈里「一块内存」的统一抽象。底下可能是普通页（struct page），也可能是设备侧内存（struct net_iov），但一旦交给 page_pool，在 page_pool、驱动和网络核心栈里就统一以 netmem_ref 出现。上层代码不需要、也不应该知道底下到底是哪种。"
      - label: "记忆钩子"
        text: "ref ＝ 引用／句柄。<b>只认句柄，不认具体类型</b>——这就是「abstract type（抽象类型）」在英文技术写作里的标准用法：一个类型存在的意义，就是让别人不必知道实现。"
  - type: divider
    label: "🏷️ 术语二：memory provider"
    kind: section
  - type: highlight
    title: "memory provider（内存提供者）"
    meta: "把内存拿出来交给 page_pool 的那一方"
    points:
      - label: "原文定义"
        text: "Memory providers (or the default page_pool allocator) allocate underlying memory (struct net_iov or struct page), cast it to netmem_ref, and supply it to page_pool."
      - label: "中文解释"
        text: "「内存提供者」是一个抽象接口：真正把内存取出来、转成 netmem_ref、再交给 page_pool 的那一方。默认实现就是 page_pool 自带的分配器；设备内存（devmem）则是一个特殊的 provider。原文括号里那句 the default page_pool allocator 很关键——它把 page_pool 自己定位成「缺省供货方」，而不是唯一来源。"
      - label: "记忆钩子"
        text: "provider ＝ 供货方。<b>page_pool 是默认供货方，不是唯一供货方</b>。这正是下面第 2 条原则要纠正的历史误解：老代码以为「用了 provider 就等于用了 net_iov」。"
  - type: divider
    label: "🏷️ 术语三：downcast"
    kind: section
  - type: highlight
    title: "downcast（向下转型）"
    meta: "内核 C 里的常规动作，在这里被明令禁止"
    points:
      - label: "原文定义"
        text: "Downcasting netmem_ref to struct net_iov or struct page is not allowed unless a code path strictly cannot function without knowing the underlying memory type (for example, kmap_local_page())."
      - label: "中文解释"
        text: "向下转型：从抽象句柄转回具体类型。内核 C 里到处都有（父类型指针转回子类型），但这里被明确禁止——除非某条代码路径「不这么干就没法工作」。理由藏在抽象本身：一旦上层开始判断底下是什么类型，抽象就破了，新的 provider 就再接不进来。"
      - label: "记忆钩子"
        text: "down ＝ 从抽象往具体走。<b>看到禁用句，先问「禁的是哪个抽象被戳破」</b>，而不是记成一条编码风格。原文紧跟的例外写法也值得记：not allowed unless… <b>把例外单独点名</b>，是内核文档的标准句式。"
  - type: divider
    label: "🏷️ 术语四：unreadable (memory)"
    kind: section
  - type: highlight
    title: "unreadable（CPU 不可读）"
    meta: "「读不到」是一种属性，不是一种类型的同义词"
    points:
      - label: "原文定义"
        text: "Today, in-tree net_iov implementations are unreadable by the CPU (netmem_address() returns NULL) and some existing code still reflects that limitation, but new code must not assume net_iov implies unreadable memory (check readability via netmem_address() or skb_frags_readable() instead) and should, as much as possible, generalize existing limitations to match the design principles."
      - label: "中文解释"
        text: "「CPU 不可读」指这块内存 CPU 直接寻址不到（典型是设备侧内存），netmem_address() 会返回 NULL。这段的关键不在定义，而在「今天如此 ≠ 定义如此」：现有 in-tree 实现确实都不可读，但新代码不许把「net_iov ⇒ 不可读」当成公理，要去问 netmem_address()，而不是靠类型猜。"
      - label: "记忆钩子"
        text: "<b>读不到 ≠ 不存在，类型 ≠ 属性。</b>判断方式从「它是什么类型」改成「它读不读得到」——netmem_address() 就是回答这个问题的那个函数。"
  - type: divider
    label: "🏷️ 术语五：legacy compatibility wrapper"
    kind: section
  - type: highlight
    title: "legacy compatibility wrapper（历史兼容包装层）"
    meta: "内核里最标准的「判死缓」话术"
    points:
      - label: "原文定义"
        text: "Existing page_pool APIs that allocate or free struct page are legacy compatibility wrappers for drivers that do not yet support netmem_ref."
      - label: "中文解释"
        text: "老 API 不删（否则现有驱动全炸），但定位被降级为「给还没迁移过来的驱动用的壳」。这是内核渐进迁移的标准手法：保留接口、改变它的身份。原文紧接一句 Code that is not yet netmem-aware should be converted to netmem_ref，把「该干嘛」也一并说清。"
      - label: "记忆钩子"
        text: "wrapper ＝ 壳。<b>看到 legacy compatibility wrapper，等于看到「这个接口已判死缓，新代码别碰」</b>——比 deprecate 温和（没说要删），但方向完全一致。"
  - type: divider
    label: "✨ 辅助彩蛋：一句「礼貌地指出历史包袱」的范本"
  - type: highlight
    title: "some existing code still reflects that limitation"
    meta: "怎么给老代码加约束而不树敌"
    points:
      - label: "原文用法"
        text: "Today, in-tree memory providers only supply struct net_iov and some existing code still reflects that limitation, but new code must not assume that using a memory provider implies net_iov memory and should, as much as possible, generalize existing limitations to match the design principles."
      - label: "中文解释"
        text: "still reflects that limitation ＝「现有代码仍然带着那个（过时的）限制的投影」。注意它没说 the old code is wrong，也没点名谁写的——<b>把批评指向「限制」本身，而不是指向写代码的人</b>。这在邮件列表里极常见，因为历史代码往往就是眼前这位 maintainer 写的。"
      - label: "可套用句式"
        text: "<b>Today, X is Y … but new code must not assume Y.</b>——承认现状（不指责）→ 说明它只是历史限制的投影 → 对新代码提要求。写 review 或给 maintainer 回信时，这个三段式既把事说清，又不留情绪。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用今天的原则回答两问（英文作答）：① 你要给 page_pool 加一段「只对 devmem provider 生效」的特殊处理，设计原则第 4 条要求你把它放在哪里、为什么？② 一条代码路径需要对 netmem 调用 kmap_local_page()。按第 1 条原则，它可以在调用点直接把 netmem_ref downcast 成 struct page 再调用吗？如果不可以，正确做法是什么？"
    answer: "参考作答（仿写示范，非原文）：① Put it behind struct memory_provider_ops, not inline in page_pool core. Principle 4 requires each layer to respect its abstraction boundary: page_pool delegates provider-specific handling to memory_provider_ops, and core networking code should avoid per-netmem-type branching and delegate to netmem helpers instead. Putting the branch in core code would mean every future provider has to be taught to page_pool. ② Not by downcasting at the call site. Principle 1 does carve out this case -- it explicitly names kmap_local_page() as a path that strictly cannot function without knowing the underlying memory type -- but the carve-out is not permission to downcast where you stand. The prescribed shape is to add a netmem helper that performs the operation on behalf of the caller, cleanly handles all net_iov and page cases, and returns an error if the netmem type cannot support the requested operation."
    source: "Downcasting netmem_ref to struct net_iov or struct page is not allowed unless a code path strictly cannot function without knowing the underlying memory type (for example, kmap_local_page()). In those cases, to keep call sites simple, add a netmem helper that performs the operation on behalf of the caller, cleanly handles all net_iov and page cases, and returns an error if the netmem type cannot support the requested operation."
    link: "https://lore.kernel.org/netdev/<20261010033630.1171692-3-almasrymina@google.com>/"
  - type: closing
    tagline: "每日一句：In kernel English the highest-value sentence is rarely the definition — it is the one that tells you what you are not allowed to assume."
    source: "仿写示范"
---
