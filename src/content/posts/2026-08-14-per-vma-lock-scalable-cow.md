---
title: "per-VMA 锁全配置放开，scalable COW 地基落地"
date: "2026-08-14"
desc: "per-VMA 锁全配置放开，scalable COW 地基落地；nouveau 默认开 atomic，CXL 直通与 xswap 登场。"
column: "daily"
tags: ["mm", "DRM", "PCI", "net", "LSM", "media", "Rust"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看三件事：<strong>mm 把 per-VMA 锁放开到全配置</strong>、<strong>scalable COW 的地基落地</strong>，和 <strong>nouveau 默认开启 atomic modesetting</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-14/cover.png"
    alt: "封面 · 8月14日 · per-VMA 锁全配置放开"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "mm 无条件开放 per-VMA 锁，binder / TCP 摆脱 mmap_lock 回退"
      - label: "头条"
        text: "mm/rmap 用匿名 pgoff 索引 MAP_PRIVATE 文件页，scalable COW 地基落定"
      - label: "DRM"
        text: "nouveau NV50+ 默认启用 atomic modesetting，老卡用户受益"
      - label: "机制"
        text: "xswap 虚拟 swap、CXL Type-2 直通、skb secmark 换 xarray"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "mm 把 per-VMA 锁放开到全配置：binder 和 TCP 扔掉 mmap_lock 回退"
    meta: "〔08-14 03:34 北京〕· [PATCH v6 0/5] mm: Unconditional per-VMA locks and cleanups"
    link: "https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/"
    points:
      - label: "现状"
        text: "进程地址空间由一棵 VMA（虚拟内存区域）树描述，历史上所有「查 VMA 再改它」都靠一把全局 mmap_lock 读写锁；per-VMA 锁是页错误热路径引入的细粒度替代品，但此前只在「启用 SMP 且启用 MMU」的架构上才编译。"
      - label: "痛点"
        text: "因为不是全配置可用，通用代码不敢依赖它——Suren 做 x86 shadow stack 时为了避开 mmap_lock 的递归锁死只能绕路；binder、TCP 等场景也不得不保留 mmap_lock 回退路径，全局锁竞争依旧。"
      - label: "方案"
        text: "把 per-VMA 锁改成全配置可用（其依赖的 RCU、maple tree、引用计数本就不挑 SMP/MMU）；新增 vma_start_read_unlocked() 辅助 API，让调用方用一把 per-VMA 读锁替换「mmap_read_lock + vma_lookup + 解锁」这个常见惯用法。binder 两处、TCP 一处迁移。"
      - label: "为什么"
        text: "唯一代价是 !SMP / !MMU 构建里 VMA 变大一点点；换来的是去 #ifdeffery、复杂度大降、代码更干净——用内存多占几字节换掉一堆条件编译。"
      - label: "效益"
        text: "binder（Android 高频 IPC）与 TCP 路径彻底不再碰 mmap_lock 回退，全局锁竞争下降；页错误热路径锁粒度进一步细化，也惠及后续一切想绕开 mmap_lock 的工作。"
      - label: "下一步"
        text: "系列由 Dave Hansen 起头、Suren 接棒，v6 在等 mm 与 binder/net 维护者 ack，有望进 -next 排队。"
    verdict: "一把锁从「部分配置可用」到「全配置可用」，抽象简化与锁竞争双赢——mm 层少见的低风险高收益系列"
  - type: headline
    title: "scalable COW 的地基：MAP_PRIVATE 文件页换用匿名 pgoff 索引"
    meta: "〔08-14 01:32 北京〕· [PATCH v5 00/16] mm/rmap: index MAP_PRIVATE file-backed folios by anonymous pgoff"
    link: "https://lore.kernel.org/linux-mm/<20260813-b4-scalable-cow-virt-pgoff-v5-0-c21581c0c3c8@kernel.org>/"
    points:
      - label: "现状"
        text: "内核的「匿名内存」其实有四副面孔：纯匿名、shmem、MAP_PRIVATE 映射 /dev/zero、以及其他 MAP_PRIVATE 文件映射（CoW 后 folio 变匿名）。反向映射（rmap）靠 folio->mapping 和 folio->index 两个字段定位引用它的 VMA。"
      - label: "痛点"
        text: "对 MAP_PRIVATE 文件映射，CoW 出的匿名 folio 的 index 沿用「文件页偏移」，大量匿名 folio 的偏移互相冲突，rmap 的 remap 追踪争用加剧，scalable COW 依仗的 maple tree 快速路径永远走不上。"
      - label: "方案"
        text: "给 VMA 引入「匿名页偏移（anonymous page offset）」属性，让 CoW 出的匿名 folio 按匿名偏移索引、与纯匿名行为一致；同时把 MAP_PRIVATE 的 /dev/zero 映射「彻底匿名化」。v5 共 16 篇。"
      - label: "为什么"
        text: "为 scalable COW 打地基——快速路径按 folio->index 在 maple tree 里定位 VMA，统一到匿名偏移后冲突消失、快速路径可用；未来还可在 remap 时 unshare 深 fork 层级里的匿名映射，省掉大部分 remap 追踪。"
      - label: "效益"
        text: "合并性几乎不受影响（只有 CoW 后又 remap 的边缘情形要求偏移也匹配）；换来 scalable COW 的性能地基与后续 unshare 优化空间。"
      - label: "下一步"
        text: "v5 已收敛（末尾 4 篇 /dev/zero 细节留待后续处理）；scalable COW 本体继续推进。"
    verdict: "一次「索引地图」的重绘，让 COW 性能快速路径终于能跑起来——典型的地基型系列"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "xswap：zswap 撑起的「虚拟可扩展 swap 设备」（RFC v3）"
    meta: "linux-mm · PATCH RFC v3"
    link: "https://lore.kernel.org/linux-mm/<20260813104857.3450386-1-hebaoquan@kylinos.cn>/"
    points:
      - label: "定位"
        text: "mm/swap 层，RFC v3 提出虚拟可扩展 swap 设备 xswap——后端页由 zswap 压缩存储，容量可在线增长。"
      - label: "做法"
        text: "15 篇系列：swap_info_struct 加 xswap 字段、cluster 按需 vmalloc 扩展、sysfs 创建接口与上限、shrink 工作队列等。"
      - label: "效益"
        text: "让 zswap 从「swap 加速器」变成可扩展的 swap 后端，swap 容量不再受物理设备限制。"
    relevance: "关注内存回收 / swap 的同学可跟进——这是把 zswap 能力外扩的大方向。"
  - type: highlight
    title: "大 folio 迁移：批量 rmap 遍历降开销"
    meta: "linux-mm · PATCH v2"
    link: "https://lore.kernel.org/linux-mm/<20260813-migrate-rmap-batch-v2-0-3c5424c555c7@amd.com>/"
    points:
      - label: "定位"
        text: "mm/rmap 层，迁移大 folio 时要逐页做反向映射遍历，开销偏高。"
      - label: "做法"
        text: "7 篇 v2：把大 folio 迁移期间的 rmap 遍历批量合并，减少重复查找。"
      - label: "效益"
        text: "大页面迁移路径提速，THP / 大 folio 场景受益。"
    relevance: "和迁移、碎片整理相关，跑大页面负载的同学可关注。"
  - type: highlight
    title: "没有 swap 时不再拆大 folio"
    meta: "linux-mm · PATCH v6"
    link: "https://lore.kernel.org/linux-mm/<20260813075025.1406585-1-xueyuan.chen21@gmail.com>/"
    points:
      - label: "定位"
        text: "mm/vmscan 回收层：无 swap 环境下换出大 folio 会先把它拆成小页。"
      - label: "做法"
        text: "v6 系列：swap 不可用时避免无谓的大 folio 拆分，减回收路径开销。"
      - label: "效益"
        text: "无 swap 部署（手机 / 嵌入式）回收更高效，大页面保留率更高。"
    relevance: "无 swap 设备的回收行为会因此变好。"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "nouveau：NV50+ 默认开启 atomic modesetting"
    meta: "DRM · PATCH RESEND v7"
    link: "https://lore.kernel.org/dri-devel/<20260813204803.2097176-1-lyude@redhat.com>/"
    points:
      - label: "定位"
        text: "DRM/KMS 层，nouveau 是少数仍未默认启用 atomic modesetting 的现代驱动。"
      - label: "做法"
        text: "5 篇 v7：NV50+ 默认启用 atomic，NV04 保持原样（从未实现 atomic）、<NV50 强制关闭，并修正 nouveau.atomic 参数处理。"
      - label: "效益"
        text: "用户态对非 atomic 驱动的支持正在腐坏，默认 atomic 让 nouveau 跟上现代 KMS 栈；Lyude 已在自己多数机器默认开启数月。"
    relevance: "用 NVIDIA 老卡跑桌面 Linux 的同学，未来默认就是 atomic 显示栈。"
  - type: highlight
    title: "内核 Rust：新增「按范围预留 ID」抽象（nova-core 通道 ID）"
    meta: "dri-devel / Rust · PATCH v6"
    link: "https://lore.kernel.org/dri-devel/<20260813-chid-v6-0-160be5dfb5bd@nvidia.com>/"
    points:
      - label: "定位"
        text: "内核 Rust 抽象层，为驱动提供「按范围预留 ID」的能力，服务 nova-core 的硬件通道 ID 管理。"
      - label: "做法"
        text: "v6 系列引入 range-based ID reservation 抽象。"
      - label: "效益"
        text: "nova-core 从 GSP 拿到的通道 ID 可按范围安全管理，Rust 驱动基建再进一步。"
    relevance: "关注 nova-core / 内核 Rust 的同学可跟进。"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "CXL Type-2 设备直通：27 篇把加速器搬进虚拟机"
    meta: "PCI / vfio · PATCH v4"
    link: "https://lore.kernel.org/linux-pci/<20260813093631.2288172-1-mhonap@nvidia.com>/"
    points:
      - label: "定位"
        text: "PCI/vfio 层：让 CXL Type-2 设备（如加速器）能整体透传给 guest，guest 内跑专有驱动。"
      - label: "做法"
        text: "27 篇 v4：新增 vfio/cxl 子模块，虚拟化 CXL DVSEC、模拟并陷阱 HDM decoder、reset 与电源转换时撤销 HDM 映射、响应 guest 触发的 CXL reset。"
      - label: "效益"
        text: "CXL Type-2 加速器云化直通的关键一步，guest 获得完整 CXL 能力视图。"
    relevance: "关注 CXL / 虚拟化直通的同学，这是 CXL 从存储走向计算的关键。"
  - type: highlight
    title: "PCIe endpoint 也学会 DMA：EP 用 DMA 通道与 host 搬数据"
    meta: "PCI / dmaengine · PATCH v7"
    link: "https://lore.kernel.org/linux-pci/<20260813063757.3131865-1-den@valinux.co.jp>/"
    points:
      - label: "定位"
        text: "PCIe endpoint 子系统：给 endpoint 模式补上 DMA 能力，EP 不再只靠寄存器 / 中断交互。"
      - label: "做法"
        text: "10 篇 v7：dmaengine 静态通道 ID + dw-edma 通道委托 + PCI dwc 暴露 EP DMA 资源与元数据。"
      - label: "效益"
        text: "endpoint 功能扩展到 DMA，为高性能 EP 用例（虚拟化 / 加速器）铺路。"
    relevance: "做 PCIe endpoint / 虚拟化 IO 的同学可关注。"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "ARP / 邻居表按网络命名空间隔离（15 篇）"
    meta: "netdev · PATCH v4"
    link: "https://lore.kernel.org/netdev/<5276bb00-388b-4d44-ab02-022fd8119b55@blackwall.org>/"
    points:
      - label: "定位"
        text: "net/neighbour 层：arp_tbl 与 nd_tbl 目前是全局表，多租户下相互干扰、锁竞争明显。"
      - label: "做法"
        text: "15 篇 v4：把 ARP 表与邻居表按网络命名空间（netns）隔离。"
      - label: "效益"
        text: "容器 / 多租户网络的 ARP、ND 状态隔离，资源与故障域更清晰。"
    relevance: "做容器网络 / 多租户的同学，这是邻居子系统的重大收敛方向。"
  - type: highlight
    title: "bpf_ksock：BPF 程序能碰内核 socket 了（v7）"
    meta: "netdev / BPF · PATCH v7"
    link: "https://lore.kernel.org/netdev/<20260813110540.103550-1-mahe.tardy@gmail.com>/"
    points:
      - label: "定位"
        text: "BPF 层：新增 bpf_ksock kfunc 系列，让 BPF 程序访问内核态 socket。"
      - label: "做法"
        text: "5 篇 v7：ksock kfuncs + 异步回调保护 + LSM 挂载禁用的测试覆盖。"
      - label: "效益"
        text: "内核 socket 暴露给 BPF，可观测与安全程序能做的事更多。"
    relevance: "做 BPF / 可观测的同学可跟进。"
  - type: divider
    label: "📰 LSM"
    kind: section
  - type: highlight
    title: "skb 的 secmark 换成 xarray 索引：摆脱定宽整数的语义困局"
    meta: "LSM / net · PATCH 0/7"
    link: "https://lore.kernel.org/linux-security-module/<20260813204854.19211-1-casey@schaufler-ca.com>/"
    points:
      - label: "定位"
        text: "网络 + LSM 跨界：skb 的 secmark 目前是 32 位整数，多个 LSM 共享同一语义空间。"
      - label: "做法"
        text: "7 篇系列：新增两个操作 struct lsm_prop 的 hook，SELinux / Smack / AppArmor 各自适配，skb secmark 改为 xarray 索引。"
      - label: "效益"
        text: "secmark 从定宽整数变为可扩展索引，摆脱 32 位语义冲突，为多 LSM 并存铺路。"
    relevance: "关注安全子系统 / 多 LSM 架构的同学可跟进。"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "virtio-media：虚拟媒体设备有了统一通道（v7）"
    meta: "media / virtio · PATCH v7"
    link: "https://lore.kernel.org/linux-media/<20260813180026.2636879-1-briandaniels@google.com>/"
    points:
      - label: "定位"
        text: "media + virtio 跨界：新增 virtio-media 设备类型，让虚拟摄像头 / 编解码器以统一 virtio 通道暴露给 guest。"
      - label: "做法"
        text: "v7 4 篇：骨架驱动 + session 管理 + scatterlist 构建 + ioctl 操作。"
      - label: "效益"
        text: "虚拟化场景的媒体设备有了标准通道，qemu 侧可按此实现。"
    relevance: "关注虚拟化 / 媒体子系统的同学可跟进。"
  - type: highlight
    title: "MacBook 摄像头驱动进内核：Broadcom FaceTime HD"
    meta: "media · PATCH 0/5"
    link: "https://lore.kernel.org/linux-media/<20260813173516.29293-1-jackflusche@gmail.com>/"
    points:
      - label: "定位"
        text: "新驱动：把社区 facetimehd 代码移植进内核，驱动 MacBook 的 Broadcom FaceTime HD 摄像头。"
      - label: "做法"
        text: "5 篇：搬运代码 + Kconfig / Makefile + 编译期修复 + 固件提取脚本 + MAINTAINERS。"
      - label: "效益"
        text: "苹果本用户的内核摄像头驱动有望进主线。"
    relevance: "在 MacBook 上跑 Linux 的同学可以期待。"
  - type: divider
    label: "📌 机制雷达：跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "per-VMA 锁全配置化"
        text: "一把 VMA 级读锁从「部分配置可用」变「全配置可用」，binder / TCP 去掉 mmap_lock 回退 · <a href=\"https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/\">原文</a>"
      - label: "匿名 pgoff 索引"
        text: "MAP_PRIVATE 文件映射的匿名 folio 改按匿名偏移索引，为 scalable COW 铺路 · <a href=\"https://lore.kernel.org/linux-mm/<20260813-b4-scalable-cow-virt-pgoff-v5-0-c21581c0c3c8@kernel.org>/\">原文</a>"
      - label: "xswap 虚拟 swap"
        text: "zswap 支撑、可在线扩容的虚拟 swap 设备（RFC）· <a href=\"https://lore.kernel.org/linux-mm/<20260813104857.3450386-1-hebaoquan@kylinos.cn>/\">原文</a>"
      - label: "skb secmark → xarray"
        text: "网络包安全标记从定宽整数换为 xarray 索引，多 LSM 语义解耦 · <a href=\"https://lore.kernel.org/linux-security-module/<20260813204854.19211-1-casey@schaufler-ca.com>/\">原文</a>"
      - label: "CXL Type-2 直通"
        text: "vfio/cxl 把 CXL Type-2 加速器整体透传给 guest（27 篇）· <a href=\"https://lore.kernel.org/linux-pci/<20260813093631.2288172-1-mhonap@nvidia.com>/\">原文</a>"
      - label: "PCIe endpoint DMA"
        text: "endpoint 模式补上 DMA 能力（dmaengine 通道委托）· <a href=\"https://lore.kernel.org/linux-pci/<20260813063757.3131865-1-den@valinux.co.jp>/\">原文</a>"
      - label: "neighbour 表命名空间化"
        text: "arp_tbl / nd_tbl 按网络命名空间隔离（15 篇）· <a href=\"https://lore.kernel.org/netdev/<5276bb00-388b-4d44-ab02-022fd8119b55@blackwall.org>/\">原文</a>"
  - type: divider
    label: "○ 更多动态"
    kind: section
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<F0F008459FFA835D+20260813074632.2021311-1-raoxu@uniontech.com>/"
        text: "media: uvcvideo 重提交时保持 status URB 间隔"
        time: "08-13 15:47"
      - link: "https://lore.kernel.org/linux-media/<20260813-uvc-status-11-v1-1-2cf43e9590b0@chromium.org>/"
        text: "media: uvcvideo 不越界读 uvc_status_control"
        time: "08-14 04:43"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260813134533.1174132-1-dhowells@redhat.com>/"
        text: "fs: netfs 修读进度上报与未初始化返回值"
        time: "08-13 21:45"
      - link: "https://lore.kernel.org/linux-block/<d919f5285d16afbec6c51ecdf201692a484566e5.1786637565.git.bvanassche@acm.org>/"
        text: "block: loop 修新引入的锁反转"
        time: "08-14 00:14"
      - link: "https://lore.kernel.org/rust-for-linux/<20260813134834.1562995-1-tomo@flapping.org>/"
        text: "Rust: hrtimer 修 forward() / expires() 与并发 arming 竞态"
        time: "08-13 21:48"
      - link: "https://lore.kernel.org/linux-mm/<20260813181230.483746-1-sarthak.sharma@arm.com>/"
        text: "mm: selftests/mm 把 GUP 微基准从功能测试里拆出来"
        time: "08-14 02:13"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "per-VMA lock"
        text: "进程地址空间里 VMA（虚拟内存区域）粒度的读锁，基于 RCU + maple tree，可替代 mmap_lock 的热路径加锁"
      - label: "anon pgoff"
        text: "VMA 的「匿名页偏移」属性，让 CoW 出的匿名 folio 按匿名偏移被反向映射定位"
      - label: "scalable COW"
        text: "面向深 fork 层级的写时复制优化，靠 VMA 在 maple tree 中的快速定位加速"
      - label: "atomic modesetting"
        text: "DRM/KMS 的原子化模式设置——一次 commit 提交完整 plane / CRTC 状态，现代 GPU 显示栈基础"
      - label: "secmark"
        text: "skb 上的安全标记，SELinux / Smack 等 LSM 用来给网络包打标签；本次从定宽整数改为 xarray 索引"
      - label: "xswap"
        text: "由 zswap 压缩存储支撑的「虚拟可扩展 swap 设备」，容量可在线增长"
  - type: closing
    tagline: "一把锁放开全配置，一张索引重绘加速 COW——今天的地基比楼房多。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
