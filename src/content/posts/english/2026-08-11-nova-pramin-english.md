---
title: "PRAMIN 与 guest_memfd：今天两个内核术语"
date: "2026-08-11"
desc: "今日重点：术语卡——PRAMIN window 与 guest_memfd，两个驱动/机密计算高频术语。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "标题解析"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🃏 术语卡</strong>——今天学两个今天日报里出现的内核术语：<strong>PRAMIN window</strong> 和 <strong>guest_memfd</strong>，都来自真实补丁。
  - type: divider
    label: "🃏 术语卡"
  - type: highlight
    title: "PRAMIN window"
    meta: "dri-devel · nova-core · PATCH v2"
    link: "https://lore.kernel.org/dri-devel/<20260810-pramin-split-v2-0-65a00b3c7309@nvidia.com>/"
    points:
      - label: "真实定义"
        text: "GPU 把显存/寄存器映射到 CPU 侧的可访问窗口，CPU 经它读写显存而不走完整 DMA 路径（PCI Resource Aperture Mapping）"
      - label: "中文"
        text: "PCI 映射窗口——CPU 直接读写显存的固定通道，nova-core（NVIDIA Rust 驱动）用它上传纹理、命令缓冲"
      - label: "记忆钩子"
        text: "PRAMIN = PCI + aperture mapping：显存访问不走 DMA，走固定映射窗口——GPU 驱动的核心通道术语"
  - type: highlight
    title: "guest_memfd"
    meta: "linux-mm · 机密计算 · PATCH v10"
    link: "https://lore.kernel.org/linux-mm/<20260807-gmem-inplace-conversion-v10-0-2fc18ee6d3ba@google.com>/"
    points:
      - label: "真实定义"
        text: "管理机密虚拟机 private 内存的 fd 抽象：private 页归 guest 私有、被 TEE 加密保护，shared 页与宿主机共享"
      - label: "中文"
        text: "机密 VM 内存文件描述符——TDX/SNP 机密虚拟机里管理 private/shared 内存的抽象"
      - label: "记忆钩子"
        text: "guest + mem + fd：给机密 VM 的「guest 内存」一个 fd——把内存当文件管理（如 In-place conversion 原地切换 shared↔private）"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "一条真实标题：In-place conversion"
    meta: "linux-mm · 机密计算"
    link: "https://lore.kernel.org/linux-mm/<20260807-gmem-inplace-conversion-v10-0-2fc18ee6d3ba@google.com>/"
    points:
      - label: "原句"
        text: "[PATCH v10 00/41] guest_memfd: In-place conversion support"
      - label: "拆解"
        text: "子系统（guest_memfd:）+ 动词短语（In-place conversion support）——in-place = 原地（不搬内存）、conversion = shared↔private 切换、support = 功能落地"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "用今天两个术语各写一句英文：① 用 PRAMIN 说一句 nova-core 怎么访问显存；② 用 guest_memfd 说一句机密 VM 内存怎么管理。写完再点开答案核对。"
    answer: "参考：① nova-core accesses VRAM through the PRAMIN window, a PCI aperture the CPU can write to directly. ② guest_memfd gives the confidential VM a file descriptor to manage its private memory, supporting in-place conversion between shared and private pages."
    source: "PRAMIN is a hardware aperture mechanism that provides CPU access to GPU Video RAM (VRAM) before the GPU's Memory Management Unit (MMU) and page tables are initialized. This 1 MiB sliding window, located at a fixed offset within BAR0, is essential for setting up page tables and other critical GPU data structures without relying on the GPU's MMU."
    link: "https://lore.kernel.org/linux-mm/<20260807-gmem-inplace-conversion-v10-0-2fc18ee6d3ba@google.com>/"
  - type: closing
    tagline: "PRAMIN: the CPU's window to VRAM. guest_memfd: a memory fd for confidential VMs."
    source: "内核英语 · 每日一篇"
---
