---
title: "写开场白与对比论证：famfs cover letter 的真实写法"
date: "2026-08-30"
desc: "今日重点：写作——用 famfs v14 的真实 cover letter 学「一句话定盘的开场白」和「对称对比论证」，再仿写一段。"
column: "english"
focus: "写作"
tags: ["写作", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——今天学「开场白」和「对比论证」。素材是 John Groves 给 famfs v14 写的真实 cover letter（投 linux-fsdevel）：一个新文件系统怎么在一封邮件里讲清「它是什么、为什么值得合」。
  - type: divider
    label: "✍️ 写作：famfs cover letter 的两个高分写法"
  - type: highlight
    title: "真实原文①：一句话定盘的开场白"
    meta: "linux-fsdevel · [PATCH v14 00/12] famfs: the Fabric-Attached Memory File System"
    link: "https://lore.kernel.org/linux-fsdevel/010001a04e801a4e-8eb212cd-b263-4043-ab65-33e480d2d7d4-000000@email.amazonses.com/"
    points:
      - label: "英文原段"
        text: "The most important thing to know about famfs is that it CANNOT be used as a general purpose file system. It is for enabling file-based byte-level access (including direct mmap) to very large (e.g. 100TB) shared/disaggregated memory appliances - which have become available during this long process, and which are in need of Linux support."
      - label: "中文理解"
        text: "「关于 famfs，最需要知道的一点是：它不能当通用文件系统用。它的用途，是让基于文件的字节级访问（包括直接 mmap）能打到超大（如 100TB）的共享/分片内存设备上——这类设备在这一路漫长的过程中出现，正需要 Linux 的支持。」"
      - label: "写作要点"
        text: "三个可直接模仿的动作——<code>The most important thing to know about X is that...</code>（用最高级开场，直接给读者一个锚点，告诉对方「先记住这个」）；全大写 <code>CANNOT</code>（用大小写制造强调，比加粗更朴素有力）；<code>It is for enabling...</code>（用 for 说明用途，一句讲清「为谁而生」）。最后的破折号补一个非限定从句，把「为什么现在需要它」的时机感也带出来。"
  - type: highlight
    title: "真实原文②：对称的对比论证（Why standalone）"
    meta: "同一封 cover letter · 讲为什么从 fuse 回归 standalone"
    link: "https://lore.kernel.org/linux-fsdevel/010001a04e801a4e-8eb212cd-b263-4043-ab65-33e480d2d7d4-000000@email.amazonses.com/"
    points:
      - label: "英文原段"
        text: "After maintaining famfs in both forms, I have concluded it makes more sense as a standalone file system: fuse adds complexity to famfs (more complex, less adaptable, less performant - and famfs files are memory, so access must run at memory speed), while famfs adds complexity to fuse that is unlikely to see constructive re-use."
      - label: "中文理解"
        text: "「在两种形态都维护过之后，我的结论是它作为独立文件系统更合理：fuse 给 famfs 增加复杂度（更复杂、更不灵活、性能更差——而且 famfs 的文件就是内存，访问必须跑在内存速度上）；反过来，famfs 给 fuse 增加的复杂度，也不太可能得到建设性的复用。」"
      - label: "写作要点"
        text: "核心是那个对仗——<code>fuse adds complexity to famfs ... while famfs adds complexity to fuse ...</code>（把双方的代价做成镜像句，读者一眼看到「互相拖累」）；用 <code>After maintaining X in both forms, I have concluded...</code>（第一手经验背书，让结论显得是权衡过的，不是拍脑袋）；括号里 <code>more complex, less adaptable, less performant</code> 三连递减后，破折号甩出一个物理事实 <code>access must run at memory speed</code>——用硬道理封住反对意见。"
  - type: highlight
    title: "真实原文③：一个 must，一句立下硬指标"
    meta: "同一封 cover letter · Famfs Overview 一节"
    link: "https://lore.kernel.org/linux-fsdevel/010001a04e801a4e-8eb212cd-b263-4043-ab65-33e480d2d7d4-000000@email.amazonses.com/"
    points:
      - label: "英文原段"
        text: "The key performance requirement is that famfs must resolve mapping faults with minimal overhead. This is achieved by fully caching the file-to-devdax metadata for all active files."
      - label: "中文理解"
        text: "「关键性能要求是：famfs 必须用最小开销解决映射缺页。做法是把所有活动文件的 file-to-devdax 元数据完整缓存起来。」"
      - label: "写作要点"
        text: "一句一个 <code>must</code> 立下硬指标（不写 could/should，写 must，性能承诺不给自己留退路），紧接着 <code>This is achieved by...</code> 用被动语态一句话交代实现手段——需求先行、方案殿后，两句话把「要什么」和「怎么做」讲完，是写设计说明的极简范式。"
  - type: divider
    label: "✨ 辅助彩蛋（术语卡）"
  - type: highlight
    title: "disaggregated memory / devdax / fs-dax：读懂这句话的暗号"
    meta: "术语卡 · 用 famfs 语境理解三个词"
    link: "https://lore.kernel.org/linux-fsdevel/010001a04e801a4e-8eb212cd-b263-4043-ab65-33e480d2d7d4-000000@email.amazonses.com/"
    points:
      - label: "disaggregated memory"
        text: "分片内存：物理上放在别的机器/设备上、通过高速织物（fabric）访问的内存池。famfs 的定位就是把这种内存挂成文件。"
      - label: "devdax vs pmem"
        text: "同一块 DAX 设备两种模式：devdax 是裸字符设备（famfs 这种文件系统直接吃它），pmem 是块设备模拟。famfs 是「第一个用 devdax 而非 pmem 的 fs-dax 文件系统」——cover letter 里那句话的骄傲点就在这。"
      - label: "no page cache involvement"
        text: "famfs 的 mmap 直接映射到远端内存、不经 page cache——cover letter 用它强调「访问要跑在内存速度上」的底气。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "仿写：用今天学的 famfs 开场句式（<code>The most important thing to know about X is that...</code>），给今天的另一个机制级系列「mm: HugeTLB vmemmap 优化并入通用 sparse-vmemmap（HVO 泛化）」写一段 3-4 句英文开场。提示：最需要知道的一点 = 它把 HugeTLB 专属路径并进通用代码、删掉专用机制；用途 = 让去重能力下沉，未来 device DAX 也能复用。"
    answer: "参考（仿写示范，非原句）：The most important thing to know about this series is that it deletes a special case. It is for folding HugeTLB's private bootmem vmemmap path into the generic sparse-vmemmap code, so shared tail-page metadata stops being a HugeTLB-only trick. The gain is a smaller kernel - and a single place to extend when device DAX wants the same optimization."
    source: "The most important thing to know about famfs is that it CANNOT be used as a general purpose file system. It is for enabling file-based byte-level access (including direct mmap) to very large (e.g. 100TB) shared/disaggregated memory appliances - which have become available during this long process, and which are in need of Linux support."
    link: "https://lore.kernel.org/linux-fsdevel/010001a04e801a4e-8eb212cd-b263-4043-ab65-33e480d2d7d4-000000@email.amazonses.com/"
  - type: closing
    tagline: "Open with the one thing your reader must not miss, then let the trade-offs write the rest."
    source: "内核英语 · 每日一篇"
---
