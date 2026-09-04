---
title: "阅读一段 Meta 的 RFC：为什么共享映射写 4K 却刷 2M"
date: "2026-09-04"
desc: "今日重点：阅读——精读 Meta sub-folio 脏页跟踪 RFC cover letter 的问题说明段，拆解因果句式与内核语汇。"
column: "english"
focus: "阅读"
tags: ["阅读", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：📖 阅读</strong>——今天精读一段真实 RFC（linux-mm · Meta 的 sub-folio 脏页跟踪），作者用一段话讲清一个性能痛点：<strong>共享映射写 4K 为什么会变成 2M 的回写</strong>。读完你既能懂机制，也练了因果英文。
  - type: divider
    label: "📖 阅读：一个问题，讲得清清楚楚"
  - type: quote
    title: "真实原文 · 问题与根因"
    meta: "linux-mm · [RFC PATCH 0/5] mm: sub-folio dirty tracking for PTE-mapped mmap writes"
    link: "https://lore.kernel.org/linux-mm/20260903182943.662461-1-kirill@shutemov.name/"
    text: >-
      "A store through a shared file mapping dirties the whole folio. With large page cache folios that turns a 4K store into 2M of writeback: one dirty bit per folio, and writeback has no way to know which part changed. XFS already knows better. iomap tracks dirty state per block and iomap_writeback_folio() submits only the dirty ranges, and the buffered write path sets just the range it copied. Only the mmap path throws that away, because iomap_dirty_folio() covers the whole folio."
  - type: paragraph
    text: >-
      这段话四句讲清一件事，因果链是核心。<strong>第一句抛现象</strong>：<code>A store through a shared file mapping dirties the whole folio</code>（共享映射下的一次 store，把整个 folio 标脏）。<strong>第二句给后果+根因</strong>：<code>turns a 4K store into 2M of writeback</code>（4K 的写入变成 2M 的回写）——冒号后面解释为什么：folio 只有一个脏位，writeback 分不清到底哪部分变了。读到这里你已经懂问题。
  - type: paragraph
    text: >-
      第三句转对比：<code>XFS already knows better</code>（XFS 早就做得更好）—— iomap 按 block 记脏、回写只提交脏区、buffered 写路径只标自己写的那段。第四句点出病灶：<code>Only the mmap path throws that away</code>（只有 mmap 路径把这套好处扔了），因为 <code>iomap_dirty_folio() covers the whole folio</code>。一个「现象→后果→对比→病灶」的完整论证，四句收完。
  - type: highlight
    title: "句式与语汇拆解"
    meta: "同段落 · 三个值得学的点"
    link: "https://lore.kernel.org/linux-mm/20260903182943.662461-1-kirill@shutemov.name/"
    points:
      - label: "turns A into B（把 A 变成 B）"
        text: "<code>turns a 4K store into 2M of writeback</code> —— 用 turn into 把「量变到质变」的荒谬讲出来（写 4K 却要刷 2M），比直说 waste 更有画面。写性能问题时可套：<code>This turns a small read into a full-page cache refill.</code>"
      - label: "has no way to know（无从得知）"
        text: "<code>writeback has no way to know which part changed</code> —— 「没有办法知道」是内核英文说「信息不足/设计缺陷」的委婉说法，比 doesn't know 更像文档腔。"
      - label: "already knows better（早就更明白）"
        text: "<code>XFS already knows better</code> —— 夸某实现领先的轻量说法。already 强调「不是新想法，别人早做了」，读出来有「XFS 示范在前」的意味。"
  - type: divider
    label: "✨ 辅助彩蛋（术语卡）"
  - type: highlight
    title: "folio / dirty bit / writeback：一个 4K→2M 的完整链"
    meta: "术语卡 · 这段话背后的机制"
    link: "https://lore.kernel.org/linux-mm/20260903182943.662461-1-kirill@shutemov.name/"
    points:
      - label: "folio"
        text: "内核 5.16 起的内存页单位，一个 folio 可含多个 page（最大 2M，即大页缓存）。原句里 <code>large page cache folios</code> 说的就是 2M 的大 folio。"
      - label: "dirty bit"
        text: "脏位：记录某页/某块内存被改过、需要写回磁盘的标志。一个 folio 只有一个脏位 —— 这就是「4K 改一下整 2M 都算脏」的根源。"
      - label: "writeback（回写）"
        text: "把脏页写回磁盘的过程。folio 级别的脏位让 writeback 只能整 folio 刷，无法只写那 4K —— Meta 的 RFC 想把它细化到子页。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "读后概括：用自己的话（中文或英文）把这段 RFC 的论证四步复述一遍：① 现象 ② 后果+根因 ③ 对比（XFS/iomap 怎么做）④ 病灶（mmap 路径）。要求覆盖：shared mapping / whole folio / 4K→2M / iomap tracks per block / mmap path throws it away。"
    answer: "参考：① 共享映射下的一次写入会把整个 folio 标脏；② 大 folio 下这等于 4K 的写入触发 2M 的回写，因为脏位是 folio 级的、系统不知道具体哪段变了；③ 而 XFS + iomap 早已按 block 记脏、回写只发脏区，buffered 写路径也精确到所写范围；④ 只有 mmap 路径把这个优势丢掉，因为 iomap_dirty_folio() 仍覆盖整个 folio。"
    source: "A store through a shared file mapping dirties the whole folio. With large page cache folios that turns a 4K store into 2M of writeback: one dirty bit per folio, and writeback has no way to know which part changed."
    link: "https://lore.kernel.org/linux-mm/20260903182943.662461-1-kirill@shutemov.name/"
  - type: closing
    tagline: "Phenomenon, consequence, contrast, culprit — four sentences can carry a whole argument if each earns its place."
    source: "内核英语 · 每日一篇"
---
