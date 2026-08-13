---
title: "RISC-V 能力检测补 rva23u64，nouveau 通道事件修复"
date: "2026-08-13"
desc: "RISC-V hwprobe 新增 rva23u64 基础行为检测；nouveau 修通道终止事件顺序；mm 清 swap THP 拆分；Rust 启用 fentry。"
column: "daily"
tags: ["arch", "Rust", "mm", "DRM", "net"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看两件事：<strong>RISC-V 把 rva23u64 基础行为写进了 hwprobe</strong>，和 <strong>nouveau 修通道终止事件顺序</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-13/cover.png"
    alt: "封面 · 8月13日 · RISC-V 用户态能查能力了"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "riscv hwprobe 新增 rva23u64 基础行为检测（Zic64b 等 ISA 扩展），用户态能查了"
      - label: "头条"
        text: "nouveau 修 channel-kill 事件顺序，NV50 门槛降低"
      - label: "机制"
        text: "mm 清 swap THP 拆分路径（17 篇系列）"
      - label: "机制"
        text: "Rust 内核启用 fentry；netdev 追踪 dev_put/dev_hold"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "RISC-V 把 rva23u64 基础行为写进 hwprobe：用户态能查能力了"
    meta: "〔08-13 07:36 北京〕· [PATCH v6 00/11] riscv: hwprobe: Introduce rva23u64 base behavior"
    link: "https://lore.kernel.org/lkml/<20260812-rva23u64-hwprobe-v2-v6-0-c985af3256b8@oss.qualcomm.com>/"
    points:
      - label: "现状"
        text: "RISC-V 的 ISA 扩展越来越多（Zic64b、Zicbom 等），但用户态/虚拟机想查「硬件支持哪些基础行为」一直没有统一入口。"
      - label: "痛点"
        text: "hwprobe 之前按单个扩展逐个暴露，调用方要查很多 key 才知道能力集；运行时环境（QEMU/KVM）也难以告诉 guest「支持 rva23u64 基准」。"
      - label: "方案"
        text: "新增 rva23u64 能力位：一次查询覆盖一组基础扩展（Zic64b、Zicbom 系列等），cpuinfo 输出 ISA bases，dt-bindings 描述扩展；sophgo/spacemit 平台同步加 Zic64b。"
      - label: "为什么"
        text: "把「一组扩展」聚合成一个能力位，用户态查询成本从多次变一次；huge 系列 v6 迭代说明基准定义社区共识在收敛。"
      - label: "效益"
        text: "用户态/虚拟化能按基准查能力；新平台只需在 dts 加扩展说明，hwprobe 自动聚合。"
      - label: "下一步"
        text: "等合并窗口；更多 SoC 的 ISA 扩展描述跟进。"
    verdict: "RISC-V 能力检测从「逐个扩展」走向「基准聚合」，对用户态和虚拟化都是好消息"
  - type: headline
    title: "nouveau 修通道终止事件顺序：NV50 门槛降下来了"
    meta: "〔08-13 07:13 北京〕· [PATCH v3 0/4] drm/nouveau: channel-kill event ordering fixes"
    link: "https://lore.kernel.org/dri-devel/<20260812231330.705425-1-mczernohous@gmail.com>/"
    points:
      - label: "现状"
        text: "nouveau 的通道（channel）被 GPU 杀掉（channel-kill）时，驱动要收到事件做清理；但事件订阅时机和 fence 上下文先后顺序有竞态。"
      - label: "痛点"
        text: "在 fence context 初始化前订阅/后订阅顺序不对，可能漏收 channel-kill 事件，或把 benign CACHE_ERROR 误当致命错误（Mesa NV50 bind 探测被误伤）。"
      - label: "方案"
        text: "先把 fence context 建好再订阅 channel-kill（避免竞态）；过滤 NV50+ 上 benign CACHE_ERROR；把 channel-kill 支持门槛从新卡下放到 NV50 及更新。"
      - label: "效益"
        text: "老卡（NV50 系）也能正确响应通道终止，Mesa 探测不再被误判。"
    verdict: "典型驱动事件顺序修复 + 门槛下放——老硬件受益"
  - type: divider
    label: "📰 板块亮点"
    kind: section
  - type: highlight
    title: "mm：swap THP 拆分路径清理（17 篇）"
    meta: "linux-mm · PATCH v2"
    link: "https://lore.kernel.org/linux-mm/<20260813-swap-thp-cleanup-v2-0-d2ee48c6aa49@tencent.com>/"
    points:
      - label: "定位"
        text: "mm/huge_memory 拆分路径重构：swapcache THP 拆分解除 order-0 限制、计数修正、清理无效参数。"
      - label: "做法"
        text: "17 篇系列：拆分 helper 重构 + 文档（kerneldoc）+ 移除废弃参数。"
      - label: "效益"
        text: "anon folio 拆分时只计 swap cache 引用（更准）；为大页面 swap 管理铺路。"
  - type: highlight
    title: "netdev：追踪 dev_put/dev_hold 引用计数"
    meta: "netdev · RFC v2"
    link: "https://lore.kernel.org/netdev/<39ed6ba0-bef0-4710-9790-ab13092521b1@I-love.SAKURA.ne.jp>/"
    points:
      - label: "定位"
        text: "CONFIG_NET_DEV_REFCNT_TRACKER=y 时跟踪原始 dev_put/dev_hold 调用，定位泄漏/过早释放。"
      - label: "做法"
        text: "RFC 给网络设备引用计数加调用点追踪，调试用。"
      - label: "下一步"
        text: "社区讨论追踪粒度与性能开销。"
  - type: highlight
    title: "Rust：内核启用 fentry 支持"
    meta: "rust-for-linux · PATCH v2"
    link: "https://lore.kernel.org/rust-for-linux/<20260812201613.1783592-1-murp@redhat.com>/"
    points:
      - label: "定位"
        text: "让 Rust 内核代码能用 fentry（函数入口追踪）——对 ftrace 生态友好。"
      - label: "意义"
        text: "Rust 模块接入 ftrace 追踪，调试/可观测性跟上 C 模块。"
  - type: divider
    label: "📌 机制雷达：跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "RISC-V ISA 基准"
        text: "rva23u64 hwprobe 聚合能力位 + 多平台 Zic64b 扩展（架构层）· <a href=\"https://lore.kernel.org/lkml/<20260812-rva23u64-hwprobe-v2-v6-0-c985af3256b8@oss.qualcomm.com>/\">原文</a>"
      - label: "网络引用计数追踪"
        text: "dev_put/dev_hold 调用点追踪（RFC，调试网络设备生命周期）· <a href=\"https://lore.kernel.org/netdev/<39ed6ba0-bef0-4710-9790-ab13092521b1@I-love.SAKURA.ne.jp>/\">原文</a>"
      - label: "swap THP 拆分"
        text: "huge_memory 拆分路径重构：swapcache 计数修正 + order-0 限制解除（mm 层）· <a href=\"https://lore.kernel.org/linux-mm/<20260813-swap-thp-cleanup-v2-0-d2ee48c6aa49@tencent.com>/\">原文</a>"
      - label: "Rust fentry"
        text: "Rust 内核接入函数入口追踪（Rust 生态）· <a href=\"https://lore.kernel.org/rust-for-linux/<20260812201613.1783592-1-murp@redhat.com>/\">原文</a>"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "rva23u64"
        text: "RISC-V 一组基础 ISA 扩展的基准能力位（含 Zic64b 等），hwprobe 一次查询聚合"
      - label: "channel-kill"
        text: "GPU 通道被硬件终止的事件——nouveau 驱动需响应清理，本次修订阅顺序"
      - label: "fentry"
        text: "函数入口追踪点，ftrace 基础设施的一部分"
  - type: closing
    tagline: "RISC-V 能力检测聚合基准，nouveau 事件顺序修复下放门槛——今天有架构也有细节。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
