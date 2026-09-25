---
title: "地道表达：内核邮件里三个比教科书更地道的说法"
date: "2026-09-25"
desc: "今日重点：地道表达——从 CoCo 共享内存 RFC 的 cover letter 拆三个地道说法：This matters、the only line of defence is fragile、round a request to the granule。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——内核邮件里的英文往往比教科书更「说人话」。
      今天从 Aneesh Kumar 的 CoCo 共享内存 RFC 投稿信里，拆三个一学就会的地道说法：
      <code>This matters</code>、<code>the only line of defence is fragile</code>、
      <code>round a request to the granule</code>。每个都给你原句、意译、用法。
  - type: divider
    label: "💬 说法一：This matters（不是 This is important）"
    kind: primary
  - type: highlight
    title: "This matters for CCA systems"
    meta: "原句 · CoCo 共享内存 RFC cover letter"
    points:
      - label: "原句"
        text: "This matters for CCA systems where the Realm stage-2 mappings managed by the RMM can still operate at 4K granularity, while the non-secure host may manage the IPA state change at a larger page size, for example 64K."
      - label: "中文意译"
        text: "这对 CCA 系统很关键：RMM 管的 Realm 二级映射还停留在 4K 粒度，而非安全侧宿主却可能按更大的页（比如 64K）来管 IPA 状态变更。"
      - label: "用法"
        text: "This matters 三个词就把「这是关键」断言完，比 This is important 简短、比 This is very important 克制。技术写作里要强调某点重要，用它开头，读者立刻知道后面是重点。matter 作动词 = 要紧、有关系，是 this matters / it doesn't matter 的固定用法。"
    link: "https://lore.kernel.org/linux-media/<20260924100529.1398790-1-aneesh.kumar@kernel.org>/"
  - type: divider
    label: "💬 说法二：the only line of defence is fragile"
    kind: section
  - type: highlight
    title: "relying on that as the only line of defence is fragile"
    meta: "原句 · 同上 cover letter"
    points:
      - label: "原句"
        text: "However, relying on that as the only line of defence is fragile and can still lead to kernel crashes."
      - label: "中文意译"
        text: "然而，把它当作唯一的防线是脆弱的，仍可能导致内核崩溃。"
      - label: "用法"
        text: "line of defence（防线）是固定比喻，the only line of defence 就是「唯一防线」。fragile（脆）形容防线比 weak 更传神——它强调「看着能用、实际一碰就碎」，用来否定一个方案比 simply not enough 更有画面。整套结构「relying on X as the only ... is fragile」是评审里委婉但有力地反对一个做法的高频句式。"
    link: "https://lore.kernel.org/linux-media/<20260924100529.1398790-1-aneesh.kumar@kernel.org>/"
  - type: divider
    label: "💬 说法三：round a request to the granule"
    kind: section
  - type: highlight
    title: "The allocator rounds a request to the shared granule"
    meta: "原句 · 同上 cover letter"
    points:
      - label: "原句"
        text: "The allocator rounds a request to the architecture shared granule, allocates suitably aligned contiguous pages, transitions the complete allocation to shared state, and returns the transitioned size alongside the page."
      - label: "中文意译"
        text: "分配器把请求向上取整到架构的共享粒度，分配对齐的连续页，把整段分配切到共享态，再连同页面一起返回转换后的大小。"
      - label: "用法"
        text: "round a request to X = 把请求向上取整到 X 的整数倍，是「对齐」最地道的说法（round up to）。transitions ... to shared state = 把状态切到共享态，transition 作动词在技术写作里比 change 更精确（强调状态机式的切换）。alongside the page = 连同页面一起，比 together with 更书面、更常用。一句话里三个地道动词/短语，值得背。"
    link: "https://lore.kernel.org/linux-media/<20260924100529.1398790-1-aneesh.kumar@kernel.org>/"
  - type: divider
    label: "✨ 辅助彩蛋：术语卡"
    kind: section
  - type: highlight
    title: "shared granule（共享粒度）"
    meta: "CoCo 机密计算 · 共享内存的最小单位"
    points:
      - label: "英文展开"
        text: "granule = 颗粒、最小单位。shared granule 就是共享内存的最小粒度。原文里反复出现 granule / shared-granule size / shared-granule geometry，是这条线最核心的词。"
      - label: "中文定义"
        text: "机密计算里 guest 与 host 共享内存的最小单位：一个 granule 要么整块共享、要么整块不共享，且私有↔共享切换时要清零。它比 guest 的页大（比如 64K vs 4K），所以「只共享一个 4K 子区间」是不安全的。"
      - label: "记忆钩子"
        text: "granule = 颗粒。把共享内存想成一盒「颗粒」，最小单位就是一颗，你不能只共享半颗。这正好和说法三里 round to the granule 呼应——对齐到颗粒边界。"
    link: "https://lore.kernel.org/linux-media/<20260924100529.1398790-1-aneesh.kumar@kernel.org>/"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "读下面这段 vfio DMABUF cover letter 的原文，找出两个地道表达（提示：一个带引号的动词、一个「超出范围 + 尤其因为」的组合），各写一句：原句、意译、什么时候用。"
    answer: "参考答案（仿写示范）：①「vend ... by fd」——原句「vend」those buffers from a primary process to other subordinate processes by fd。意译：主进程把缓冲按文件描述符「转交」给从进程。vend 原义是「贩卖/零售」，这里带引号表示借用，比 share/distribute 更生动地道。②「out of scope ... not least because」——原句 I kept this out of scope for now not least because I don't have a thorough test setup。意译：我暂时把它留在范围外，尤其因为我这边没有完整的测试环境。out of scope 是「超出本次范围」的固定说法，not least because 是「尤其是因为」的地道强调，比 mainly because 更自然。"
    source: "This is achieved by allowing the processes to mmap() the DMABUFs; their access to the device is isolated to the exported ranges. ... I kept this out of scope for now not least because I don't have a thorough test setup for this system."
    link: "https://lore.kernel.org/linux-media/<20260924152159.49702-1-matt@ozlabs.org>/"
  - type: closing
    tagline: "每日一句：Fluent isn't big words — it's the right small word in the right place."
    source: "仿写示范"
---
