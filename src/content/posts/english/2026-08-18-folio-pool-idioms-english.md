---
title: "读内核邮件学地道表达：backed by / only to / churn / bursty"
date: "2026-08-18"
desc: "今日重点：地道表达——用 folio_pool cover letter 的真实英文，学四个内核邮件高频表达。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——今天不学单词，学「说法」。素材是 Jim Cromie 的 folio_pool 系列 cover letter（投 linux-mm），里面四个表达在英文技术写作里高频出现，读内核邮件 / 写补丁都用得上。先读真实原段，再逐条拆。
  - type: divider
    label: "💬 地道表达：一个真实段落，四个说法"
  - type: highlight
    title: "真实英文段（folio_pool cover letter）"
    meta: "linux-mm · [PATCH 0/9] lib/folio_pool: Direct-Map Large Folio Pool & Scratchpad"
    link: "https://lore.kernel.org/linux-mm/<20260817-folio-pool-v1-v1-0-0c1d230aa3af@gmail.com>/"
    points:
      - label: "英文原段"
        text: "Transactional subsystems allocate bursts of hundreds or thousands of homogeneous or heterogeneous objects, only to tear them all down simultaneously at batch completion or error abort. Under SLUB: Each descriptor incurs freelist traversal, lock contention, and O(N) kfree() loops on teardown. Under Folio-Scratchpad: Allocations are straight-line pointer bumps, bulk teardown is O(1) folio_put(), and consecutive Netlink transactions reuse warm L1/L2 cachelines without buddy lock churn via folio_scratchpad_reset()."
      - label: "中文理解"
        text: "「事务型子系统成批分配成百上千个同构或异构对象，结果却在批处理结束或出错中止时把它们同时全部销毁。在 SLUB 下：每个描述符都要承担 freelist 遍历、锁竞争和销毁时的 O(N) kfree() 循环。而在 folio_scratchpad 下：分配是直线推进指针，批量销毁是 O(1) 的 folio_put()，连续的 netlink 事务复用温热的 L1/L2 缓存行、没有 buddy 锁抖动。」"
  - type: divider
    label: "💬 四个表达逐条拆"
    kind: section
  - type: highlight
    title: "① backed by"
    meta: "「由……直接支撑」"
    points:
      - label: "真实原句"
        text: "two light-weight bump allocators backed directly by compound folio pages"
      - label: "中文"
        text: "两个轻量 bump 分配器，直接由 compound folio 页支撑。"
      - label: "用法"
        text: "backed by = 由……作为后盾/基础。技术写作里高频：方案「由 X 支撑/依赖 X」就说 backed by X；也引申为「有……背书」（如 backed by benchmarks）。"
  - type: highlight
    title: "② only to + 动词"
    meta: "「结果却……」（意外/徒劳的结果）"
    points:
      - label: "真实原句"
        text: "allocate bursts of ... objects, only to tear them all down simultaneously"
      - label: "中文"
        text: "分配一大堆对象，结果却要把它们同时全部销毁。"
      - label: "用法"
        text: "only to do sth = 强调「白忙一场/出人意料」的结果，语气带点无奈或反讽。写成批分配完又全删，用 only to tear down 比 and then tear down 生动得多。"
  - type: highlight
    title: "③ churn"
    meta: "「（反复无谓的）翻腾 / 抖动」"
    points:
      - label: "真实原句"
        text: "without buddy lock churn"
      - label: "中文"
        text: "没有 buddy 锁的反复竞争抖动。"
      - label: "用法"
        text: "churn 本义「搅动、翻腾」，技术语境指「大量无谓的重复操作/波动」——lock churn（锁抖动）、page churn（页抖动）。说优化「消除了 churn」比「减少 overhead」更形象。"
  - type: highlight
    title: "④ bursty"
    meta: "「突发性的」（成批涌来）"
    points:
      - label: "真实原句"
        text: "allocate bursts of hundreds or thousands of ... objects"
      - label: "中文"
        text: "成批分配成百上千个对象（突发式分配）。"
      - label: "用法"
        text: "bursty = 突发的、成批的（名词 burst + -y）。内核里形容「突发批量负载」就说 bursty workload / bursts of。和「稳态 steady-state」相对。"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "一个「承担」的表达：incur"
    meta: "同一封 cover letter"
    link: "https://lore.kernel.org/linux-mm/<20260817-folio-pool-v1-v1-0-0c1d230aa3af@gmail.com>/"
    points:
      - label: "真实原句"
        text: "Each descriptor incurs freelist traversal, lock contention, and O(N) kfree() loops on teardown."
      - label: "可学点"
        text: "incur = 招致、承担（cost/overhead/contention）。中文说「有开销」，英文技术写作说「incur overhead」——比 have/cause 正式，是内核邮件里的标准动词。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "仿写：用今天学的表达各写一句英文——① backed by（说某个优化「由数据支撑」）② only to（说「改了半天结果却更糟」）③ churn（说「消除了锁抖动」）④ incur（说「每帧都要承担一次拷贝开销」）。"
    answer: "参考（仿写示范，非原句）：① The optimization is backed by real benchmarks on production traffic. ② He spent a week on the refactor, only to make the fast path slower. ③ Batching removes the per-packet lock churn on the hot path. ④ Every frame incurs one full buffer copy in the current design."
    source: "Transactional subsystems allocate bursts of hundreds or thousands of homogeneous or heterogeneous objects, only to tear them all down simultaneously at batch completion or error abort. Under SLUB: Each descriptor incurs freelist traversal, lock contention, and O(N) kfree() loops on teardown. Under Folio-Scratchpad: Allocations are straight-line pointer bumps, bulk teardown is O(1) folio_put(), and consecutive Netlink transactions reuse warm L1/L2 cachelines without buddy lock churn via folio_scratchpad_reset()."
    link: "https://lore.kernel.org/linux-mm/<20260817-folio-pool-v1-v1-0-0c1d230aa3af@gmail.com>/"
  - type: closing
    tagline: "Backed by, only to, churn, bursty, incur — five ways to sound like a kernel maintainer."
    source: "内核英语 · 每日一篇"
---
