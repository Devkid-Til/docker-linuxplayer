---
title: "一张术语卡：collapse、migration entry、mTHP、PMD"
date: "2026-08-17"
desc: "今日重点：术语卡——用 collapse RFC 的真实英文段落，记四个高频 mm 术语：collapse / migration entry / mTHP / PMD。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "阅读"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🏷️ 术语卡</strong>——今天不拆句子，记单词。素材是 Kirill Shutemov 的 57 帖 collapse RFC（投 linux-mm）的 cover letter，里面一开口就是四个高频 mm 术语。我们用一段真实英文把它们一个个钉进脑子。
  - type: divider
    label: "🏷️ 术语卡：从一段真实 RFC 学四个词"
  - type: highlight
    title: "真实英文段（collapse RFC 的 why）"
    meta: "linux-mm · [RFC PATCH 00/57] mm/collapse: rebuild collapse on migration primitives"
    link: "https://lore.kernel.org/linux-mm/<20260816224609.308019-1-kirill@shutemov.name>/"
    points:
      - label: "英文原段"
        text: "This replaces khugepaged's anonymous collapse with an engine that can collapse sub-PMD ranges. It is built around migration entries and frozen folios instead of heavy locking and isolation, aiming for better scalability and less disruption to the workload being collapsed. ... mTHP collapse landed in khugepaged in 7.2 and I was glad to see it. We at Meta run arm64 with 64K base pages, where a PMD is 512M: PMD-order THP is of limited use at that size, and mTHP is exactly what we want."
      - label: "中文理解"
        text: "「这套方案用能折叠 sub-PMD 区间的引擎取代 khugepaged 的匿名折叠。它建立在迁移条目和冻结 folio 之上，而不是靠重锁与隔离，目标是更好的扩展性、对被折叠工作负载更少打扰。……mTHP 折叠在 7.2 进了 khugepaged，我很高兴看到它。我们 Meta 跑的是 64K 基页的 arm64，那里一个 PMD 是 512M：这个尺寸下 PMD 级 THP 用处有限，mTHP 正是我们想要的。」"
  - type: divider
    label: "🏷️ 四张术语小卡"
    kind: section
  - type: highlight
    title: "collapse（折叠）"
    meta: "术语 · mm"
    points:
      - label: "英文"
        text: "to merge many small pages into one big page (e.g. 4KB base pages into a 2MB THP), cutting page-table overhead and boosting TLB hit rate."
      - label: "中文"
        text: "把多个小页合并成一个大页——减少页表开销、提升 TLB 命中率；khugepaged 后台线程 / MADV_COLLAPSE 主动触发。"
      - label: "记忆钩子"
        text: "collapse 本义「倒塌、折叠」——内核里指「把散页折叠成整页」。动词用法：collapse sub-PMD ranges（折叠小于 PMD 的区间）。"
  - type: highlight
    title: "migration entry（迁移条目）"
    meta: "术语 · mm"
    points:
      - label: "英文"
        text: "a placeholder left in the page table while a page is being migrated, so concurrent accessors know the page is on the move."
      - label: "中文"
        text: "页迁移期间留在页表里的占位标记——并发访问者看到它就知道「这页正在被搬走」。"
      - label: "记忆钩子"
        text: "migration entries 就是页搬家时贴的「正在搬」纸条。collapse RFC 重建在它上面 = 复用已被验证的「安全搬页」原语。"
  - type: highlight
    title: "mTHP（multi-size THP）"
    meta: "术语 · mm"
    points:
      - label: "英文"
        text: "Transparent Huge Pages in multiple sizes, not just the PMD-order 2MB default — key on 64K-base-page arm64 where a PMD is 512M."
      - label: "中文"
        text: "支持多种尺寸的透明大页（不只默认 2MB）——64K 基页的 arm64 上 PMD 高达 512M，小尺寸大页才有用。"
      - label: "记忆钩子"
        text: "m = multi（多种尺寸）。Meta 那句「mTHP is exactly what we want」——512M 的大页太大，要 16K/32K 这种。"
  - type: highlight
    title: "PMD（Page Middle Directory）"
    meta: "术语 · mm"
    points:
      - label: "英文"
        text: "the page-table level that maps a 2MB (x86) / 512M (arm64-64K) huge page; PMD-order THP means a THP at that granularity."
      - label: "中文"
        text: "页表层级中对应大页的那一级：x86 上映射 2MB，arm64 64K 基页上映射 512M；PMD-order THP = 这个粒度的透明大页。"
      - label: "记忆钩子"
        text: "页表四层 PGD→P4D→PUD→PMD→PTE，PMD 是倒数第二层；sub-PMD = 比这一层更小的区间。"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "一句「It turned out not to help us.」"
    meta: "同一封 cover letter"
    link: "https://lore.kernel.org/linux-mm/<20260816224609.308019-1-kirill@shutemov.name>/"
    points:
      - label: "真实原句"
        text: "mTHP collapse landed in khugepaged in 7.2 and I was glad to see it. ... It turned out not to help us."
      - label: "可学点"
        text: "先说「我很高兴看到它」（glad to see it），紧跟一句「结果对我们没用」（It turned out not to help us）——先扬后抑、干脆利落，是内核讨论里表达「方向对但没解决我的问题」的常用句式，语气客气但立场明确。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "术语 recall：用英文一句话回答——① collapse 干什么？② migration entry 是什么？③ 为什么 Meta 在 arm64/64K 上更想要 mTHP 而不是 PMD-order THP？"
    answer: "参考：① Collapse merges small pages into one big page to cut page-table overhead and boost TLB hits. ② A migration entry is a placeholder in the page table telling concurrent accessors a page is being moved. ③ On arm64 with 64K base pages a PMD is 512M, far too big for many workloads, so smaller mTHP sizes fit better — mTHP is exactly what Meta wants."
    source: "mTHP collapse landed in khugepaged in 7.2 and I was glad to see it. We at Meta run arm64 with 64K base pages, where a PMD is 512M: PMD-order THP is of limited use at that size, and mTHP is exactly what we want."
    link: "https://lore.kernel.org/linux-mm/<20260816224609.308019-1-kirill@shutemov.name>/"
  - type: closing
    tagline: "Collapse merges, migration entries pause, mTHP shrinks, PMD is the level. Four terms, one real paragraph."
    source: "内核英语 · 每日一篇"
---
