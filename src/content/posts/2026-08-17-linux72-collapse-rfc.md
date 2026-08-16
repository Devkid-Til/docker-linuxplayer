---
title: "Linux 7.2 收官、7.3 合并窗口开启，mm 抛 57 帖 collapse 重建 RFC"
date: "2026-08-17"
desc: "Linux 7.2 正式发布、7.3 合并窗口开启；57 帖 RFC 重建 THP collapse；sched_ext proxy exec 到 v12。"
column: "daily"
tags: ["mm", "sched", "DRM", "net", "arch", "media"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看两件事：<strong>Linux 7.2 正式发布</strong>（7.3 合并窗口随之开启），和 <strong>mm 抛出一份 57 帖 RFC</strong>，要把 THP 折叠机制重建在迁移原语上。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-17/cover.png"
    alt: "封面 · 8月17日 · Linux 7.2 发布 · 7.3 合并开启"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "Linux 7.2 正式发布，7.3 合并窗口开启，net-next 冻结"
      - label: "头条"
        text: "mm/collapse 57 帖 RFC：把 THP 折叠重建在迁移原语上"
      - label: "sched"
        text: "proxy execution 兼容 sched_ext，v12 17 帖"
      - label: "DRM"
        text: "61 帖全驱动迁 atomic_create_state、删 plane reset"
      - label: "机制"
        text: "virtio 管理通道扩到 ethtool 流规则 · mq 批量收发新 syscall"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "Linux 7.2 正式发布：7.3 合并窗口开启，新功能将集中涌入"
    meta: "〔08-17 07:08 北京〕· Linux 7.2"
    link: "https://lore.kernel.org/lkml/<CAHk-=wjk5StpAmUKHacj=GPKwA88y_YRHK=i_YAJFgmxn1=k4w@mail.gmail.com>/"
    points:
      - label: "现状"
        text: "Linux 按约 10 周一个周期发布正式版本。v7.2 从 6 月的 rc1 一路走到 8 月的 rc8，候选版（rc）阶段只收 bug 修复、不接新功能。"
      - label: "痛点"
        text: "正式版必须是一个足够干净的基线：任何回归都要在发布前被摁住，发布时机的拿捏很关键。"
      - label: "方案"
        text: "Linus 于 08-17 07:08（北京）发布 Linux 7.2 正式版——rc8 之后直接收尾，说明最后一周足够稳。随后 7.3 的合并窗口（merge window）立即开启：各子系统维护者开始提交 GIT PULL，今天已看到 Rust for v7.3、pwm for 7.3-rc1。net-next 因此宣告关闭（网络子系统要求 net-next 树在合并窗口期间冻结，保证合入 mainline 的基线稳定）。"
      - label: "为什么"
        text: "先发正式版、再开合并窗口，是内核沿用几十年的节奏：正式版给发行版一个稳定基线，合并窗口则集中吸收各子系统 next 树攒了两个多月的功能。"
      - label: "效益"
        text: "对普通用户：7.2 是可直接升级的稳定版。对贡献者：未来两周是「补丁最容易合入」的窗口，攒了半年的功能树都在往 mainline 汇。"
      - label: "下一步"
        text: "7.3-rc1 预计两周后发布；这两周内合并窗口持续开放，各子系统的大系列会陆续合入。"
    verdict: "版本节奏照常：7.2 收官、7.3 开闸——未来两周是内核新功能最密集的时间窗"
  - type: headline
    title: "mm 抛 57 帖 RFC：把 THP「折叠」重建在迁移原语上"
    meta: "〔08-17 06:46 北京〕· [RFC PATCH 00/57] mm/collapse: rebuild collapse on migration primitives"
    link: "https://lore.kernel.org/linux-mm/<20260816224609.308019-1-kirill@shutemov.name>/"
    points:
      - label: "现状"
        text: "khugepaged 是内核的后台线程，负责把地址空间里的 4KB 小页「折叠」成 2MB 的 THP（透明大页），减少页表开销、提升 TLB 命中；MADV_COLLAPSE 是用户态主动请求折叠的接口。这套机制与 mm 的页迁移（migration）是两套各写各的代码。"
      - label: "痛点"
        text: "现有 collapse 路径对「被固定（pinned）的页、被 swap 出去的页、部分映射的页」等边界处理很别扭，并发时容易产生竞态；候选目标的判定也不够严谨。"
      - label: "方案"
        text: "Kirill Shutemov 的 57 帖 RFC 标题即主题：把 anonymous collapse 引擎整个重建在「迁移原语」之上——用 migration entries 冻结源页、把 collapse 拆成 scan（扫描）与 run（执行）两个阶段、引入「round」批量处理候选窗口的模型，并配 50+ 个 selftests（覆盖 mlocked、pinned、MADV_FREE、sub-PMD VMA 等边界）。"
      - label: "为什么"
        text: "迁移原语是 mm 里被大量路径验证过的机制（页迁移、NUMA balancing、memory hotplug 都在用）。把「如何安全地搬动页」交给已充分测试的代码，自己只留「何时折叠」的策略——典型的复用已验证原语、替换手搓特殊路径。"
      - label: "效益"
        text: "若落地，collapse 的并发正确性大幅变硬，pinned 页、mlock 区域等边界的处理统一；THP 折叠机制的分层也更清晰。这是 mm 方向近期最大的动作之一。"
      - label: "下一步"
        text: "RFC 尚在征集 review：57 帖量大，等 mm 维护者与社区逐帖过。想理解 THP / 页迁移底层的人，这是份好教材。"
    verdict: "方向性很强的机制重构：复用成熟迁移原语重写折叠引擎——值得长期跟进"
  - type: divider
    label: "📰 sched"
    kind: section
  - type: highlight
    title: "proxy execution 兼容 sched_ext：v12 17 帖推进「代理执行」入可编程调度"
    meta: "〔08-17 01:37 北京〕· [PATCHSET v12 sched_ext/for-7.3] sched: Make proxy execution compatible with sched_ext"
    points:
      - label: "定位"
        text: "sched_ext（可扩展调度器框架）层：让用 BPF 写的调度器也能用上「代理执行」。"
      - label: "做法"
        text: "17 帖把 proxy execution 与 sched_ext 打通：加 sched_ext 专用钩子、修复 ops.running/stopping() 的配对、把 donor（代理者）准入下放给 BPF 调度器、scx_qmap 示例支持，并在最后允许在 sched_ext 下开启 proxy exec。另有两帖独立跟进修复（醒来 donor 的入队时机等）。"
      - label: "效益"
        text: "持锁阻塞导致的调度延迟这类问题，未来可以写成 BPF 调度策略解决；v12 说明已打磨很久，目标是 7.3。"
    relevance: "sched_ext 是「内核调度器可编程化」的最前沿，想用 BPF 写调度策略的人会持续关注它。"
    link: "https://lore.kernel.org/lkml/<20260816173732.17162-1-arighi@nvidia.com>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "DAMON 接上 ARM SPE：硬件级访存轨迹进内存访问监控"
    meta: "〔08-16 22:22 北京〕· [RFC PATCH 0/4] mm/damon/perf: add ARM SPE AUX backend"
    points:
      - label: "定位"
        text: "mm 的 DAMON（内存访问监控框架）层 + ARM SPE 硬件采样。"
      - label: "做法"
        text: "引入 AUX backend 接口，用 ARM SPE 的 trace buffer（辅助跟踪缓冲区）给 DAMON 喂真实访存记录，附 KUnit 测试与 selftest。"
      - label: "效益"
        text: "相比软件采样，DAMON 能拿到硬件级访存序列，访问模式分析更准——对内存热点 / 冷数据识别的上层工具是好消息。"
    relevance: "DAMON 常被用作「内存画像」的数据源，硬件采样喂数据会让分析类工具更可信。"
    link: "https://lore.kernel.org/linux-mm/<20260816142222.689624-1-kunwu.chan@linux.dev>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "DRM 大扫除：61 帖把全部驱动迁到 atomic_create_state，删掉 plane reset"
    meta: "〔08-16 22:05 北京〕· [PATCH v2 00/61] drm/plane: Convert all drivers to atomic_create_state and remove reset"
    points:
      - label: "定位"
        text: "drm-core 的 plane 状态管理层：所有驱动共用的 plane 状态创建钩子。"
      - label: "做法"
        text: "把全部驱动从老的 drm_plane->reset() 钩子迁移到新的 atomic_create_state() 接口，最后删掉 reset 路径；v2 共 61 帖，覆盖 sun4i、vc4 等几乎所有驱动。"
      - label: "效益"
        text: "plane 状态对象的创建统一到 atomic 框架，消除一类 reset/dup/销毁不一致带来的状态泄漏与竞态。"
    relevance: "这是 DRM core 的地基级重构，跟 KMS 打交道的驱动开发者都会受影响。"
    link: "https://lore.kernel.org/dri-devel/<20260814-drm-no-more-plane-reset-v2-0-82d2963dd134@kernel.org>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "virtio_net 补上 ethtool 流规则：v22 让 guest 也能硬件分流"
    meta: "〔08-16 20:21 北京〕· [PATCH net-next v22 00/14] virtio_net: Add ethtool flow rules support"
    points:
      - label: "定位"
        text: "virtio_net 驱动 + virtio 管理通道（admin commands / config_op）层。"
      - label: "做法"
        text: "v22 共 14 帖，给 virtio_net 加 ethtool 流规则：先扩展 virtio 层的管理命令接口，再支持 IPv4/IPv6/TCP/UDP/L2 规则与 ethtool 导出。"
      - label: "效益"
        text: "云环境里 guest 侧可以按流做硬件级分流（把指定流量导到特定 virtqueue），v22 说明这是被反复打磨的老系列。"
    relevance: "virtio-net 是所有云虚拟机的网络底座，这条能力会影响虚拟化网络的可编程性。"
    link: "https://lore.kernel.org/netdev/<20260816122111.2495240-1-shshitrit@nvidia.com>/"
  - type: more
    title: "更多动态 · net / DRM"
    items:
      - link: "https://lore.kernel.org/netdev/<aoIriv3pHDgII2YR@v4bel>/"
        text: "[PATCH net] net/tcp-ao: fix use-after-free of current_key on reconnect"
        time: "08-17 05:28"
      - link: "https://lore.kernel.org/netdev/<cover.1786896221.git.zhilinz@nebusec.ai>/"
        text: "[PATCH net 0/1] seg6: reset IP6CB after IPv6 decapsulation"
        time: "08-17 00:09"
      - link: "https://lore.kernel.org/netdev/<20260816031245.268898-1-jiayuan.chen@linux.dev>/"
        text: "[PATCH bpf] bpf: free page_pool frags via the page_pool path in bpf_xdp_shrink_data"
        time: "08-16 11:13"
      - link: "https://lore.kernel.org/dri-devel/<20260817-pvr-vm-bind-v1-0-0a0f21be7d38@gmail.com>/"
        text: "[PATCH 0/4] drm/imagination: Add async VM_BIND with sparse mappings"
        time: "08-17 03:43"
      - link: "https://lore.kernel.org/dri-devel/<20260817-amdgpu-fixes-v1-0-36d5298da646@outlook.com>/"
        text: "[PATCH 0/2] drm/amdgpu/userq: fix a leaked fence driver and an unlocked doorbell walk"
        time: "08-17 00:11"
      - link: "https://lore.kernel.org/dri-devel/<20260814-nouveau-svm-svmm-uaf-v2-1-8e6590519f07@gmail.com>/"
        text: "[PATCH v2] drm/nouveau/svm: drain fault handler before freeing svmm"
        time: "08-16 22:05"
  - type: divider
    label: "📰 arch"
    kind: section
  - type: highlight
    title: "内核要加两个新系统调用：POSIX 消息队列也能批量收发"
    meta: "〔08-16 23:39 北京〕· [PATCH v3 0/4] Add two new system call mq_recvmmsg() and mq_sendmmsg()"
    points:
      - label: "定位"
        text: "arch 系统调用 ABI 层 + POSIX 消息队列（mqueue）IPC。"
      - label: "做法"
        text: "新增 mq_recvmmsg() / mq_sendmmsg() 两个系统调用，让消息队列支持批量收发（类似已存在的 recvmmsg/sendmmsg），并给 arm64、x86 等主流架构登记 syscall 号。"
      - label: "效益"
        text: "批量收发一次 syscall 处理多条消息，降低 IPC 开销；新系统调用是 ABI 级变更，合入门槛高、信号强。"
    relevance: "加系统调用是内核里少有的 ABI 级动作，说明 mqueue 批量场景有真实需求。"
    link: "https://lore.kernel.org/linux-arch/<20260816153811.1085261-1-mathura.kumar.tech@gmail.com>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "FPGA 编程走 dma-buf：大比特流不再反复拷贝"
    meta: "〔08-16 23:07 北京〕· [PATCH 0/2] fpga: add dma-buf based FPGA programming interface"
    points:
      - label: "定位"
        text: "fpga（FPGA manager）子系统 + dma-buf 跨设备共享内存抽象层。"
      - label: "做法"
        text: "新增基于 dma-buf 的 FPGA 编程接口：用户态用 dma-buf 提供比特流缓冲区，AMD Versal 落地示例。"
      - label: "效益"
        text: "编程大 FPGA 镜像时省掉内核态 / 用户态反复拷贝，还能走 zero-copy 路径。"
    relevance: "这是 dma-buf 交叉层的新应用——媒体（相机 / 显示）也天天用 dma-buf，机制同源。"
    link: "https://lore.kernel.org/linux-media/<20260816150734.2092802-1-aravind.thokala@amd.com>/"
  - type: more
    title: "更多动态 · 其他板块"
    items:
      - link: "https://lore.kernel.org/linux-media/<20260816204239.2844654-1-opensource@inspiredexperts.com>/"
        text: "[PATCH] media: i2c: ov08x40: implement crop selection"
        time: "08-17 04:49"
      - link: "https://lore.kernel.org/linux-media/<20260816194259.151947-1-john.cronin@opcenter.com>/"
        text: "[PATCH] media: i2c: imx471: return 0 for V4L2_SEL_TGT_CROP"
        time: "08-17 03:43"
      - link: "https://lore.kernel.org/lkml/<20260816173713.28998-1-blbllhy@gmail.com>/"
        text: "[PATCH] fs/ntfs3: prevent attribute-list pointer underflow"
        time: "08-17 01:37"
      - link: "https://lore.kernel.org/lkml/<20260816185548.292045-1-chandradhar.2003@gmail.com>/"
        text: "[PATCH] cachefiles: Fix OOB access in coherency trace"
        time: "08-17 02:56"
      - link: "https://lore.kernel.org/linux-block/<503e7149-b7d0-45db-b1cf-258c02898518@kernel.dk>/"
        text: "[GIT PULL] Block fix for 7.2-final"
        time: "08-16 11:03"
      - link: "https://lore.kernel.org/rust-for-linux/<20260816191926.230123-1-ojeda@kernel.org>/"
        text: "[GIT PULL] Rust for v7.3"
        time: "08-17 03:20"
      - link: "https://lore.kernel.org/linux-pci/<20260816084957.3316727-1-peng.guo@montage-tech.com>/"
        text: "[PATCH 0/2] PCI/CXL: Distinguish CXL capabilities in MCAP"
        time: "08-16 17:05"
      - link: "https://lore.kernel.org/linux-mm/<20260816090038.3117276-1-kiarash.azarnia@gmail.com>/"
        text: "[PATCH] kho: fix signed shift UB in kho_preserved_memory_reserve()"
        time: "08-16 17:00"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-17/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h"
  - type: paragraph
    text: >-
      近 24h 各板块补丁量（13 板块统一统计）：lkml 729 领跑（今天被 57 帖 collapse RFC + 17 帖 proxy exec 系列灌满），net 122、mm 109、DRM 91 紧随，block 27、media 22、PCI 18、arch 10、Rust 8、fs 7、LSM 3；virtio 与 rt 静默。合并窗口开启的第一天，各子系统都在往 mainline 赶货。
  - type: divider
    label: "📌 机制雷达：6 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "collapse 重建"
        text: "把 THP 折叠引擎换到迁移原语上（头条 2）· <a href=\"https://lore.kernel.org/linux-mm/<20260816224609.308019-1-kirill@shutemov.name>/\">原文</a>"
      - label: "proxy exec × sched_ext"
        text: "「代理执行」向可编程调度开放（sched 栏）· <a href=\"https://lore.kernel.org/lkml/<20260816173732.17162-1-arighi@nvidia.com>/\">原文</a>"
      - label: "plane 状态统一"
        text: "全驱动迁 atomic_create_state、删 plane reset（DRM 栏）· <a href=\"https://lore.kernel.org/dri-devel/<20260814-drm-no-more-plane-reset-v2-0-82d2963dd134@kernel.org>/\">原文</a>"
      - label: "virtio 管理通道"
        text: "admin commands / config_op 支撑 ethtool 流规则（net 栏）· <a href=\"https://lore.kernel.org/netdev/<20260816122111.2495240-1-shshitrit@nvidia.com>/\">原文</a>"
      - label: "新系统调用"
        text: "mq_recvmmsg / mq_sendmmsg 批量收发消息队列（arch 栏）· <a href=\"https://lore.kernel.org/linux-arch/<20260816153811.1085261-1-mathura.kumar.tech@gmail.com>/\">原文</a>"
      - label: "dma-buf 编程"
        text: "FPGA 比特流走 dma-buf 零拷贝（media 栏）· <a href=\"https://lore.kernel.org/linux-media/<20260816150734.2092802-1-aravind.thokala@amd.com>/\">原文</a>"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "merge window（合并窗口）"
        text: "正式版发布后约两周、只吸收新功能的窗口期；期间 net-next 等子系统树保持冻结。"
      - label: "THP / collapse（透明大页折叠）"
        text: "把 4KB 小页合并成 2MB 大页，减少页表、提升 TLB 命中；khugepaged 后台线程 / MADV_COLLAPSE 主动触发。"
      - label: "migration entries（迁移条目）"
        text: "页迁移期间留在页表里的占位条目，让并发访问者知道该页正在被搬走。"
      - label: "sched_ext"
        text: "可扩展调度器框架，允许用 BPF 程序实现调度策略。"
      - label: "proxy execution（代理执行）"
        text: "持锁阻塞的任务让另一个可运行任务代为运行的调度技术，降低持锁唤醒延迟。"
      - label: "dma-buf"
        text: "内核跨设备共享内存的抽象，用于 zero-copy 传数据（媒体、FPGA 编程、GPU 都在用）。"
      - label: "ethtool flow rules"
        text: "通过 ethtool 配置硬件流量分流规则，把特定流量导向特定队列。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
