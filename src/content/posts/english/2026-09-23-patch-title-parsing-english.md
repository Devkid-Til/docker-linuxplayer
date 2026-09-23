---
title: "标题解析：内核补丁标题里的祈使句语法"
date: "2026-09-23"
desc: "今日重点：标题解析——拆内核补丁标题的固定语法：子系统前缀 + 祈使动词开头 + 补足语。从 make X RCU-safe 到 Add Mali v15 support。"
column: "english"
focus: "标题解析"
tags: ["标题解析", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🔍 标题解析</strong>——内核补丁的标题不是随手写的，它有一套严格语法：
      <code>子系统前缀 + 祈使动词开头 + 补足语</code>。维护者扫一眼 Subject 就要判断
      「这封邮件该谁看、改了什么、是加功能还是修 bug」。今天我们拿今天的日报拆两个标题，
      再把祈使动词的几种句式对照一遍。
  - type: divider
    label: "🔍 标题结构：三块拼图"
    kind: primary
  - type: paragraph
    text: >-
      一个完整的内核补丁标题长这样：<code>[PATCH v4 00/12] mm: make userland page table
      freeing RCU-safe</code>。它由三块拼成——
      <strong>① 版本与系列位置</strong>（v4 00/12，第四版、共 12 帖、第 0 封是封面信）、
      <strong>② 子系统前缀</strong>（mm:，告诉维护者这归谁管）、
      <strong>③ 祈使句主体</strong>（make userland page table freeing RCU-safe，用动词原形开头说「要做什么」）。
      下面逐个拆。
  - type: divider
    label: "🔍 标题一：make X RCU-safe"
    kind: section
  - type: headline
    title: "mm: make userland page table freeing RCU-safe"
    meta: "〔09-22 23:36 北京〕· [PATCH v4 00/12]（linux-mm）· Lorenzo Stoakes"
    points:
      - label: "子系统前缀 mm:"
        text: "冒号前是子系统/路径，冒号后才是动作。mm 指内存管理。前缀的作用是「路由」——git log 或邮件列表按前缀分类，维护者靠它快速归口。前缀越具体越好：drm/panthor: 比 drm: 更精确，sched/numa: 比 sched: 更精确。"
      - label: "祈使动词 make（不是 makes / making）"
        text: "标题动词用原形开头，这是祈使句（imperative mood）——命令式，像在下达「让它变得 RCU 安全」。不是第三人称 makes，也不是分词 making。这是内核 git log 的硬约定，和 commit message 的 imperative style 同一套。"
      - label: "补足语 make X + 形容词 RCU-safe"
        text: "make 后面接「宾语 + 形容词补足语」：make <userland page table freeing> <RCU-safe>。整个短语的意思是「让『用户态页表释放』这件事变得 RCU 安全」。RCU-safe 是形容词化的复合词（X-safe = 对 X 是安全的），这类自造形容词在内核标题里极常见。"
      - label: "为什么用 make 而不是 fix"
        text: "make 表达的是「改变语义/性质」，不是修一个具体 bug。这条 12 帖是把「页表释放」从部分架构 RCU 统一到全架构，本质是语义收敛——所以用 make X Y，而不是 fix a bug。动词的选择反映改动性质，这是标题最见功力的一处。"
    verdict: "make X + 形容词，是内核标题里「改性质」的标准句式：make X lockless / make X RCU-safe / make X optional。"
    link: "https://lore.kernel.org/linux-mm/<20260922-rcu-pagetable-freeing-v4-0-fe1ad1f1e303@kernel.org>/"
  - type: divider
    label: "🔍 标题二：Add X support"
    kind: section
  - type: headline
    title: "drm/panthor: Add Mali v15 virtualization support"
    meta: "〔09-23 04:46 北京〕· [PATCH v1 00/27]（dri-devel）· Karunika Choo"
    points:
      - label: "最朴素的 Add X support"
        text: "给一个驱动/子系统加一项新能力，标准句式就是 Add <能力> support。panthor 是 ARM Mali GPU 的开源 DRM 驱动，Mali v15 是新一代硬件，virtualization support 是要加的能力。Add 是最常用的标题动词——新功能、新驱动、新绑定，几乎都用它开头。"
      - label: "三个信息按「层 → 硬件 → 能力」排布"
        text: "drm/panthor（哪一层哪个驱动）→ Mali v15（哪个硬件代际）→ virtualization support（加什么）。顺序是从大到小、从定位到动作，读者读一遍就能定位自己要不要细看。"
      - label: "Add 与 make 的区别"
        text: "Add 是「从无到有加一块东西」，make 是「把已有东西的性质改掉」。这条是给 panthor 新增虚拟化能力，是从无到有，所以 Add。对照上一条 mm 的语义统一，是从「部分有」到「全有」，所以 make。两个动词不能互换。"
    verdict: "Add X support 是内核标题出现频率最高的句式之一，写新功能补丁时优先用它，不会错。"
    link: "https://lore.kernel.org/dri-devel/<20260922204535.2850094-1-karunika.choo@arm.com>/"
  - type: divider
    label: "🔍 祈使动词句式对照表"
    kind: section
  - type: toc
    items:
      - label: "fix X when Y"
        text: "修 bug：说明「什么坏了 + 什么情况下坏」。例：mm/truncate: fix data loss when truncating straddling large folios（截断跨大 folio 时丢数据）。when 引导触发条件。"
      - label: "stop X from doing Y"
        text: "阻止一个坏行为：sched/numa: stop VMA scan filters from gating promotion。stop + 宾语 + from + 动名词，比 fix 更强调「拦」，而不是「修」。"
      - label: "convert X to Y"
        text: "改造实现：vxlan: convert configuration to RCU。X 是现状，Y 是目标。区别于 make（改性质）、convert（换实现机制）。"
      - label: "Simplify X"
        text: "做减法：Simplify PCIe native ownership。直接动宾，标题里出现 Simplify 通常意味着删代码/收拢逻辑。"
      - label: "Isolate X from Y"
        text: "隔离：drm/xe: Isolate wedged devices from hardware access。强调「切断一条路径」，多用于安全/健壮性改动。"
  - type: divider
    label: "✨ 辅助彩蛋：术语卡"
    kind: section
  - type: highlight
    title: "imperative mood（祈使语气）"
    meta: "内核 commit / 补丁标题的共同约定"
    points:
      - label: "是什么"
        text: "动词用原形开头、省略主语（you），像在下命令：Add / make / fix / stop。内核提交规范要求 commit message 的第一行用祈使句——因为 git 的语义是「应用这个补丁会做什么」，不是「作者做了什么」。"
      - label: "怎么判对错"
        text: "把标题补全成完整句：Add support = (This patch will) add support。如果补出来是「Fixed a bug」（过去式，像在记日记）就错了，应该「Fix the bug」。祈使句回答的是『这封补丁要干什么』，不是『我干了什么』。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "给你三个场景，请各写出一个符合内核标题语法的 Subject（前缀 + 祈使动词 + 补足语）：① 给 virtio 驱动加「中断聚合」能力；② 修一个 bug——refcount 在错误路径上泄漏；③ 把某个配置表从「加锁读取」改成「RCU 保护」。"
    answer: "参考答案（仿写示范，非原文）：① virtio: Add interrupt coalescing support（Add + 能力 + support）；② virtio: fix refcount leak on the error path（fix + 什么坏了 + 触发位置）；③ virtio: convert config table reads to RCU（convert + 现状 + to + 目标）。注意三个动词不能互换：Add 是从无到有、fix 是修 bug、convert 是换实现机制。"
    source: "mm: make userland page table freeing RCU-safe / drm/panthor: Add Mali v15 virtualization support / vxlan: convert configuration to RCU and enable lockless dumps"
    link: "https://lore.kernel.org/linux-mm/<20260922-rcu-pagetable-freeing-v4-0-fe1ad1f1e303@kernel.org>/"
  - type: closing
    tagline: "每日一句：The verb you pick for a patch title isn't grammar — it's a statement of intent."
    source: "仿写示范"
---
