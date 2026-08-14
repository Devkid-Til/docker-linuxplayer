---
title: "写一份补丁 cover letter：per-VMA 锁的真实写法"
date: "2026-08-14"
desc: "今日重点：写作——用 per-VMA 锁系列的真实 cover letter 学怎么写内核补丁综述（tl;dr → 动机 → 代价/收益 → 预告）。"
column: "english"
focus: "写作"
tags: ["写作", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——今天不背单词，学「怎么写」。素材是 Suren Baghdasaryan 给 per-VMA 锁 v6 系列写的真实 cover letter（投 linux-mm），我们拆解它怎么组织一封信、用什么句式，再自己仿写一段。
  - type: divider
    label: "✍️ 写作：cover letter 的四步写法"
  - type: paragraph
    text: >-
      内核补丁系列的 cover letter（0/N 封）是「给维护者的电梯简报」：他要在几秒内知道这个系列是什么、为什么值得看。Suren 这份 v6 是教科书式结构，四步——<strong>① tl;dr 一句话总结 → ② longer version 展开动机 → ③ 代价与收益权衡 → ④ 逐补丁预告</strong>。下面看真实原文（引文来自 cover letter 邮件本身）。
  - type: highlight
    title: "真实原文：Suren 怎么权衡「代价 vs 收益」"
    meta: "linux-mm · [PATCH v6 0/5] mm: Unconditional per-VMA locks and cleanups"
    link: "https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/"
    points:
      - label: "英文原段"
        text: "Make per-VMA locks available in all configs. Right now, they are only available on select architectures when SMP and MMU are enabled. But all of the primitives that per-VMA locks are built on (RCU, maple trees, refcounts) work just fine without SMP or MMU. The only real downside is that making VMAs a wee bit bigger on !MMU and !SMP builds. The upside is much cleaner code, lower complexity and less #ifdeffery."
      - label: "中文理解"
        text: "「让 per-VMA 锁在所有配置下可用。目前它们只在启用 SMP 且启用 MMU 的特定架构上可用。但构成 per-VMA 锁的全部原语（RCU、maple tree、引用计数）在无 SMP / 无 MMU 下也完全正常。唯一的真实代价，是 !MMU 和 !SMP 构建里 VMA 会稍微变大一点点。而收益是代码干净得多、复杂度更低、#ifdef 堆砌更少。」"
      - label: "写作要点"
        text: "三个可直接模仿的句式——<code>Make X available in all configs</code>（祈使句当主题句，动作明确）；<code>The only real downside is ... The upside is ...</code>（代价收益对仗，'only' 压低代价让读者不慌）；<code>a wee bit bigger</code>（轻描淡写，把代价说得可爱）。最后用 <code>less #ifdeffery</code> 收尾——把 #ifdef 名词化，带点自嘲，是内核社区标志性幽默。"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "cover letter 里的「礼貌求 review」"
    meta: "同一封 cover letter"
    link: "https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/"
    points:
      - label: "真实原句"
        text: "I'm not quite sure how this pile would get merged, but ack/review tags would be appreciated if this looks good to you."
      - label: "中文理解"
        text: "「我不太确定这一堆会怎么被合进去，但如果你们觉得没问题，给个 ack/review 标签就感激不尽了。」"
      - label: "可学点"
        text: "<code>this pile</code> 用「一堆」自嘲式指代这一系列补丁（谦逊）；<code>tags would be appreciated</code> 用被动语态把请求说得客气（不是 Please ack，而是「标签会被感激」）；<code>if this looks good to you</code> 把决定权完全交给对方——求审阅的标准姿态。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "仿写：用今天学的四步结构（tl;dr 一句话 → 动机 → 代价/收益 → 预告），给今天的另一个系列「scalable COW：MAP_PRIVATE 文件页改按匿名 pgoff 索引」写一份 4 句英文 cover letter（tl;dr 风格）。提示：动机 = 匿名 folio 偏移互相冲突，快速路径走不上；收益 = 为 scalable COW 铺路。"
    answer: "参考（仿写示范，非原句）：tl;dr: Index MAP_PRIVATE file-backed folios by anonymous pgoff so they behave like pure anonymous memory. Right now, COW'd anonymous folios keep the file offset, so offsets collide and the maple-tree fast path never kicks in. The main downside is that only the edge case of COW-then-remap requires the offset to match. The upside is a clean foundation for scalable COW — and room to skip most remap tracking later."
    source: "Make per-VMA locks available in all configs. Right now, they are only available on select architectures when SMP and MMU are enabled. But all of the primitives that per-VMA locks are built on (RCU, maple trees, refcounts) work just fine without SMP or MMU. The only real downside is that making VMAs a wee bit bigger on !MMU and !SMP builds. The upside is much cleaner code, lower complexity and less #ifdeffery."
    link: "https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/"
  - type: closing
    tagline: "tl;dr first, then the why, then the cost — a good cover letter is a patch summary with manners."
    source: "内核英语 · 每日一篇"
---
