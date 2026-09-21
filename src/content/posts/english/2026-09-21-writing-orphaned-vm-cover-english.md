---
title: "写作：如何写一封 46 帖 RFC 的投稿信"
date: "2026-09-21"
desc: "今日重点：写作——拆解 Orphaned Virtual Machines 的 cover letter，学 RFC 投稿信的期望值管理、目标句与 workstream 清单写法。"
column: "english"
focus: "写作"
tags: ["写作", "标题解析"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——Pasha Tatashin 给 linux-mm 等列表投了 46 帖的
      <code>Orphaned Virtual Machines</code> RFC。这封 cover letter 是「大型 RFC 怎么写」的教科书：
      先降预期、再明目标、再分 workstream 列清单。今天我们拆它的三个写作技巧，并给出仿写模板。
  - type: divider
    label: "📝 技巧一：先降预期，再谈测试"
    kind: primary
  - type: quote
    text: >-
      This RFC series is a PoC intended to showcase e2e working OrphanVMs uninterrupted
      continuing execution on preserved physical CPUs across a host kernel live update,
      prepared for the LPC'26 presentation at the KVM Microconf [1].
      ... It was tested on Intel Xeon Granite Rapids-AP, AMD EPYC Turin, and ARM
      Neoverse V2, as well as in emulation on QEMU and Intel Simics. However, it is
      still very early WIP, and is not anywhere near being production ready.
  - type: paragraph
    text: >-
      出处：Pasha Tatashin，<code>[RFC PATCH 00/46] Orphaned Virtual Machines</code>，linux-mm，09-21 03:36 北京。
      <a href="https://lore.kernel.org/linux-mm/<20260920193650.3373435-1-pasha.tatashin@soleen.com>/">原文</a>
  - type: toc
    items:
      - label: "PoC / WIP 前置"
        text: "第一句就点明这是 Proof-of-Concept，最后一句再补 'very early WIP' 和 'not anywhere near production ready'。读者不会把它当可合入代码。"
      - label: "测试范围 + 限定语"
        text: "先列 Intel / AMD / ARM 真机和 QEMU / Simics 仿真，建立可信度；马上用 However 转折，把范围限定在 '能跑通 e2e' 而非 '能上线'。"
      - label: "会议背景收尾"
        text: "'prepared for the LPC'26 presentation' 说明这封 RFC 的上下文：为会议讨论而准备，不是为合并而准备。"
  - type: divider
    label: "📝 技巧二：用 While 做让步，用 goal 定目标"
    kind: section
  - type: quote
    text: >-
      While this RFC bundles the e2e stack, it is NOT intended to be merged as
      a single series, the goal of this series is to have a discussion about
      the technical layers, and the challenges that need to be solved in order
      to have full Caretaker support within the kernel.
  - type: paragraph
    text: >-
      这句话是 RFC 投稿信的核心句式。<strong>While A, B is NOT intended to ..., the goal is to ...</strong>
      先承认「这看起来是个大 bundle」，再否定「不是来合并的」，最后抛出真实目标「是为了讨论技术层和挑战」。
      三个动作一句话完成，避免维护者误判。
  - type: highlight
    title: "仿写模板"
    meta: "适用于你自己的大型 RFC / 设计提案"
    points:
      - label: "模板"
        text: "While this RFC bundles [范围], it is NOT intended to be merged as [形式]. The goal is to have a discussion about [目标] and the challenges that need to be solved in order to [愿景]."
      - label: "仿写示范"
        text: "While this RFC bundles the full camera pipeline refactor, it is NOT intended to be merged as a single series. The goal is to have a discussion about the V4L2 subdevice lifecycle and the challenges that need to be solved in order to have unified power management across sensor, ISP and bridge drivers."
  - type: divider
    label: "📝 技巧三：用数字 workstream 组织大系列"
    kind: section
  - type: quote
    text: >-
      The series is structured into at least 8 workstreams that will be
      discussed and worked on separately:

      1. Workstream 1: Preparation Patches (Patches 01-06)
         Architecture-neutral and arch-specific preparatory cleanups ...
      2. Workstream 2: In-Kernel In-RAM vCPU State Preservation via LUO
         (Patches 07-10)
         Allows performing suspend/resume-type preservation across kexec
         without carrying the vCPU internal state in the VMM in userspace ...
  - type: paragraph
    text: >-
      46 帖如果直接列标题，读者会疯。作者把它压缩成 8 个 workstream，每个 workstream 给三样东西：
      <strong>名字 + 帖号范围 + 一句话定义</strong>。维护者一眼就能定位自己该看哪一段。
  - type: highlight
    title: "仿写模板"
    meta: "适用于你的多帖 patch series"
    points:
      - label: "结构"
        text: "The series is structured into N workstreams: 1) 名字（Patches xx-xx）— 一句话做什么；2) ..."
      - label: "仿写示范"
        text: "The series is structured into 3 workstreams: 1) Workstream 1: DT bindings and sensor core support (Patches 01-04) — add YAML bindings and basic v4l2_subdev registration; 2) Workstream 2: Format and pad configuration (Patches 05-08) — implement media bus format enumeration and routing; 3) Workstream 3: Power and streaming hooks (Patches 09-12) — add runtime PM and start/stop streaming callbacks."
  - type: divider
    label: "✨ 辅助彩蛋：标题解析"
    kind: section
  - type: highlight
    title: "[RFC PATCH 00/46] Orphaned Virtual Machines"
    meta: "linux-mm 跨投多列表"
    points:
      - label: "RFC"
        text: "Request for Comments，请求评论。说明作者要的是反馈，不是合并。"
      - label: "PATCH 00/46"
        text: "00 是系列封面信（cover letter），46 是总帖数。看到 00 就知道正文在后面 01-46。"
      - label: "Orphaned Virtual Machines"
        text: "孤儿虚拟机——hypervisor 内核换了，VM 还活在被保留的物理 CPU 上，没人（没原 hypervisor）管它了。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "假设你要为一个 12 帖的 'DMA-buf importer P2P routing' 系列写 cover letter。请用今天的模板写一句话：先承认它是个大 bundle，再说明不是为合并，再点明目标是讨论 importer 接口与路由语义。"
    answer: "While this RFC bundles the full DMA-buf importer P2P routing stack, it is NOT intended to be merged as a single series. The goal is to have a discussion about the importer-side routing query ABI and the challenges that need to be solved in order to let GPU, RDMA and NVMe stacks share a consistent P2P path model."
    source: "While this RFC bundles the e2e stack, it is NOT intended to be merged as a single series, the goal of this series is to have a discussion about the technical layers, and the challenges that need to be solved in order to have full Caretaker support within the kernel."
    link: "https://lore.kernel.org/linux-mm/<20260920193650.3373435-1-pasha.tatashin@soleen.com>/"
  - type: closing
    tagline: "每日一句：A good RFC cover letter doesn't sell the code — it sells the conversation."
    source: "仿写示范"
---
