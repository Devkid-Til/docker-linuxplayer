---
title: "folio_pool 跨域新机制登场：内核热路径内存池直达大页"
date: "2026-08-18"
desc: "新机制 folio_pool/scratchpad 免 SLUB 开销直达大页；Qualcomm QDA DSP 加速器驱动 v2；7.3 合并窗口 PULL 潮。"
column: "daily"
tags: ["mm", "net", "DRM", "media", "fs"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看两件事：<strong>新机制 folio_pool 登场</strong>——一个直达大页的热路径内存池，lockdep、BPF、netfilter、DRM 首批接入；和 <strong>Qualcomm 的 DSP 加速器驱动 QDA 推进到 v2</strong>，15 帖新框架级驱动。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-18/cover.png"
    alt: "封面 · 8月18日 · folio_pool 热路径内存池 · QDA DSP 加速器"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "folio_pool/scratchpad：内核热路径内存池新机制，nf_tables/BPF/lockdep/gpuvm 首批接入"
      - label: "头条"
        text: "Qualcomm QDA DSP 加速器驱动 v2（15 帖），FastRPC 纳入 accel 模型"
      - label: "net"
        text: "TLS 1.3 硬件卸载 v16 补 KeyUpdate；net-next 合并窗口关闭"
      - label: "DRM"
        text: "nova-core 新增 NVKV 编解码器；drm_timeout 换算函数统一"
      - label: "mm"
        text: "stackdepot trie 存储 RFC；ceph 写回路径 folio 化；zswap 回写修复"
      - label: "fs"
        text: "vfs 18 个 PULL 齐入 7.3；XFS fs-verity v15"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "新机制 folio_pool：给内核热路径造一个『直达大页的内存池』"
    meta: "〔08-18 01:22 北京〕· [PATCH 0/9] lib/folio_pool: Direct-Map Large Folio Pool & Scratchpad bump allocators"
    link: "https://lore.kernel.org/linux-mm/<20260817-folio-pool-v1-v1-0-0c1d230aa3af@gmail.com>/"
    points:
      - label: "现状"
        text: "内核里大量『短生命周期小对象』——锁校验记录、BPF 校验器栈状态、netfilter 事务描述符、GPU 虚拟地址操作——长期走 SLUB 分配器。对『成批创建、成批销毁』的突发场景，SLUB 每次分配要 freelist 遍历加锁竞争，销毁要 O(N) 逐个 kfree()。而 lockdep 这类核心子系统为防递归死锁，干脆绕开 SLUB，在 .bss 静态预分配 32768 项固定数组（1.31MB）。"
      - label: "痛点"
        text: "突发批量分配在 SLUB 下开销明显：万级描述符逐个分配与销毁，锁竞争和缓存失效都在。lockdep 的静态数组一旦耗尽，校验就永久关闭——这是个硬上限。"
      - label: "方案"
        text: "Jim Cromie 的 9 帖系列：直接向 buddy 要一整块 compound 大页（跳过 SLUB 元数据），封装成两种 bump allocator——folio_scratchpad（变长、对齐感知，给事务型批处理用）和 folio_pool（定长槽位，给同构描述符用）。nf_tables、BPF 校验器、drm/gpuvm、BPF syscall 批更新首批接入；lockdep 把静态数组缩成引导期缓冲区，耗尽后回退到 folio_pool 动态扩展。"
      - label: "为什么"
        text: "bump 分配器是『只推指针、不逐个释放、整页一起还』的模型：分配是直线走指针，批量销毁是 O(1) 的 put_page，天然省掉 SLUB 的锁与链表；整页大内存让同批对象共享暖的 L1/L2 缓存行。"
      - label: "效益"
        text: "作者给出基准：nf_tables 10,025 个 netlink 事务描述符，分配耗时 -19.4%、异步销毁 -8.6%，合计每批省约 5.6ms（-13.3%）。lockdep 引导期只用 928/4096 项，依赖图可在 late_initcall 迁移压缩进 folio_pool，静态数组 0 字节常驻。"
      - label: "下一步"
        text: "v1 正挂在 lkml/dri-devel 讨论，Peter Zijlstra 已对 lockdep 部分给出评审。作为新基础设施，谁能把它用进自己的热路径，谁就先享受这份省。"
    verdict: "表面是个分配器，实则是给整个内核热路径松绑的机制级改动——值得持续跟进"
  - type: headline
    title: "Qualcomm DSP 加速器驱动 QDA 推进 v2：FastRPC 纳入标准 accel 模型"
    meta: "〔08-17 12:47 北京〕· [PATCH v2 00/15] accel/qda: Qualcomm DSP Accelerator driver"
    link: "https://lore.kernel.org/linux-media/<20260817-qda-v2-v2-0-69a02e9090d4@oss.qualcomm.com>/"
    points:
      - label: "现状"
        text: "GPU 之外还有一类『算力加速器』——DSP（数字信号处理器）。内核用 accel 子系统（drivers/accel，与 DRM 共享基础设施）管理这类设备，给用户态提供计算上下文。Qualcomm 的 DSP 通过 FastRPC 协议通信。"
      - label: "痛点"
        text: "此前 DSP 加速没有统一的内核驱动：FastRPC 能力散在 misc/char 设备或厂商私有路径，用户态无法用标准 accel 接口（DRM ioctl + GEM 内存模型）管理计算上下文与远端内存映射。"
      - label: "方案"
        text: "15 帖 v2：新增 accel/qda 驱动，含全新的『compute context bank』总线（并向 iommu_buses 注册 QDA 总线）、GEM_CREATE/MMAP_OFFSET、PRIME DMA-BUF 导入、DSP 进程创建/释放、FastRPC 调用、DSP 地址空间远端映射/解映射，以及独立 QDA UAPI 头。"
      - label: "为什么"
        text: "选 accel 而不是另开 char 设备：accel 复用 DRM 的 GEM/IOMMU/FD 生命周期框架，用户态计算栈能用同一套模型同时管 GPU 与 DSP。"
      - label: "效益"
        text: "让高通平台的 DSP 算力（AI/音频/信号处理卸载）对用户态以标准 accel 接口开放，计算框架可统一接入。"
      - label: "下一步"
        text: "v2 新增了 DSP 远端内存映射，iommu 注册与 UAPI 设计仍在讨论。这类新驱动通常要迭代多轮才能合入，值得盯它的 UAPI 何时稳定。"
    verdict: "把 Qualcomm DSP 纳入标准 accel 模型，是算力加速器生态往前推的一步"
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "★ Maxim GMSL2/3 加解串器驱动 v15：车规摄像头链路的『串行器』底座继续打磨"
    meta: "〔08-18 05:51 北京〕· Re: [PATCH v15 00/22] media: i2c: add Maxim GMSL2/3 serializer and deserializer drivers"
    points:
      - label: "定位"
        text: "链路层：GMSL2/3 是车载摄像头串行传输标准，这组 22 帖驱动把 Maxim 的 serializer（MAX9296A 等）/deserializer（MAX96724 等）做成 v4l2-subdev。"
      - label: "做法"
        text: "v15 继续细化 max967 解串器与加串框架层接口，评审逐帖推进。"
      - label: "效益"
        text: "串行器把多路 MIPI 相机信号合并成同轴/差分链路，是车载视觉平台的公共底座。"
    relevance: "之前追过 GMSL2/3（08-08 日报）——这组驱动进入第 15 轮评审，离合入又近一步。"
    link: "https://lore.kernel.org/linux-media/<DKRJNC8R41H4.1TJ6IRW0XR5XP@gmail.com>/"
  - type: highlight
    title: "★ Microchip ISC 图像信号处理器 10 帖修复：AWB 锁、流停止、端点引用"
    meta: "〔08-17 14:52 北京〕· [PATCH v5 00/10] media: microchip-isc: AWB, stream-stop and endpoint-ref fixes"
    points:
      - label: "定位"
        text: "ISC（Image Sensor Controller）是 Microchip 平台图像传感器接口芯片，含 AWB（自动白平衡）硬件块。"
      - label: "做法"
        text: "v5 集中修 AWB 工作线程的 mutex 生命周期、stream-stop 时 IRQ/时钟同步、解析端点引用计数，以及 Bayer 模式与 WB 寄存器掩码。"
      - label: "效益"
        text: "修掉白平衡残留、PM 运行时泄漏、端点引用泄漏等一批隐患。"
    relevance: "ISP 侧修复对相机驱动开发者有参考价值。"
    link: "https://lore.kernel.org/linux-media/<20260817-balki-isc-prefix-fixes-v1-v5-0-2514df336c5e@microchip.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20260817050457.1005285-1-shoubaineng@gmail.com>/"
        text: "dma-buf/dma-heap：fd_install 后 copy_to_user 失败会泄漏 fd，v7 统一改用 dma_buf_fd_install() 修正（含 fastrpc）"
        time: "08-17 13:05"
      - link: "https://lore.kernel.org/linux-media/<20260817123941.1701962-1-natalie.klaus@runtimeverification.com>/"
        text: "uvcvideo RFC：用 64 位算术计算 frame buffer 大小，防大分辨率溢出"
        time: "08-17 20:40"
      - link: "https://lore.kernel.org/linux-media/<df73ba45-4d7a-4cf9-bff4-821124045c55@mail.kernel.org>/"
        text: "media: usbtv 修断开时的空指针解引用"
        time: "08-17 22:09"
      - link: "https://lore.kernel.org/linux-media/<20260817161115.2530827-1-dish@amicon.ru>/"
        text: "OV5640 传感器驱动 v2：修 sysclk 计算的潜在整数溢出"
        time: "08-18 00:09"
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "★ nova-core 继续长大：新增 NVKV 编解码器 + GSP_INIT schema"
    meta: "〔08-17 20:59 北京〕· [PATCH 0/6] gpu: nova-core: add NVKV decoder/encoder"
    points:
      - label: "定位"
        text: "nova-core 是 NVIDIA 新 GPU 的 Rust 驱动核心（与 asahi 并行的另一条 Rust 驱动线），落在 dri-devel。"
      - label: "做法"
        text: "6 帖给 nova-core 加 NVKV（NVIDIA 私有 key-value 编码格式）的 typed 编/解码与 GSP_INIT schema。"
      - label: "效益"
        text: "为 nova 驱动与 GSP 固件的通信协议打地基，Rust 驱动的编码层往前一步。"
    relevance: "与 Rust 驱动线相关——nova 之前追过 render 与 guest_memfd。"
    link: "https://lore.kernel.org/dri-devel/<20260817-b4-nvkv-v1-0-b84db5e84b67@nvidia.com>/"
  - type: highlight
    title: "★ DRM 等待超时换算函数统一：新增 drm_timeout_rel_to_jiffies()"
    meta: "〔08-18 05:06 北京〕· [PATCH v2 0/6] drm: Consolidate the wait timeout conversion helpers"
    points:
      - label: "定位"
        text: "DRM 核心层的超时换算工具（用户态传 ns 超时、内核按 jiffies 等）。"
      - label: "做法"
        text: "把 drm_timeout_abs_to_jiffies() 挪进统一 drm_timeout.c，新增相对超时版本，i915/vc4/v3d/amdgpu 改用同一入口。"
      - label: "效益"
        text: "各驱动不再各自换算，超时语义一处维护、一处修。"
    relevance: "DRM 驱动开发者日后直接用这套 helper。"
    link: "https://lore.kernel.org/dri-devel/<20260817-drm-timeout-helpers-v2-0-73052b669f49@igalia.com>/"
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "★ Cloudflare RFC：把 stackdepot 持久栈迹换成路径压缩 trie 存储"
    meta: "〔08-17 20:43 北京〕· [PATCH RFC 0/9] Path-compressed trie storage for persistent stack depot records"
    points:
      - label: "定位"
        text: "stackdepot（栈迹仓库）是内核把『分配点调用栈』去重存起来的公共设施，kmemleak/page_owner/KASAN/slub 都在用。"
      - label: "做法"
        text: "Cloudflare 的 9 帖 RFC 引入路径压缩 trie，让持久栈迹共享公共前缀，并给出 boot-time 启用开关。"
      - label: "效益"
        text: "栈迹存储量级下降，page_owner/kmemleak 这类内存账本能开得更细而不爆内存。"
    relevance: "mm 基建——影响一切吃栈迹的调试/记账工具。"
    link: "https://lore.kernel.org/linux-mm/<20260817-stackdepot-trie-v1-0-53870ca1651b@cloudflare.com>/"
  - type: highlight
    title: "★ ceph 写回路径全面 folio 化：10 帖收敛 page 遗留"
    meta: "〔08-18 03:15 北京〕· [PATCH v4 00/10] ceph: convert writeback path to folios"
    points:
      - label: "定位"
        text: "ceph 文件系统写回路径仍在用 page API，是 folio 迁移的尾巴工程。"
      - label: "做法"
        text: "v4 把 writepages/写入路径转 folio，修 OSD client 停止时的错误处理，删掉遗留的 page 专用接口。"
      - label: "效益"
        text: "folio 化后写回路径统一走新抽象，后续维护与性能优化同一条轨道。"
    relevance: "folio 化是整个内核页面抽象迁移的收尾——ceph 是最后一批大厂 FS。"
    link: "https://lore.kernel.org/linux-mm/<20260817-remove-wait-on-page-writeback-v4-0-0e5e53d47eb0@columbia.edu>/"
  - type: highlight
    title: "★ zswap 回写后 workingset 影子丢了：2 帖修复 refault 误判"
    meta: "〔08-17 22:46 北京〕· [PATCH v1 0/2] mm: fix workingset refaults in the zswap writeback path"
    points:
      - label: "定位"
        text: "swap-in 的 refault（再次缺页）记账决定页面的回收优先级，是 workingset 的核心。"
      - label: "做法"
        text: "改在 swap-in 而非 swap cache 分配时记 refault，并让 zswap 回写路径保留 workingset shadow。"
      - label: "效益"
        text: "修 zswap 场景下活跃页被误判为冷、被过早回收的问题。"
    relevance: "zswap 用户（内存不足的机器）体验直接相关。"
    link: "https://lore.kernel.org/linux-mm/<20260817144622.137133-1-alex@ghiti.fr>/"
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "★ TLS 1.3 硬件卸载推进 v16：补上 KeyUpdate 收发路径"
    meta: "〔08-18 06:10 北京〕· [PATCH v16 00/10] tls: device: add TLS 1.3 HW offload"
    points:
      - label: "定位"
        text: "内核 TLS 设备卸载（kTLS offload）把加解密下沉到网卡，网络协议栈层。"
      - label: "做法"
        text: "v16 增加 TX/RX KeyUpdate 支持（TLS 1.3 的密钥轮换机制），配套 tracepoint 与硬件卸载自测。"
      - label: "效益"
        text: "TLS 1.3 密钥更新在硬件卸载场景不再断档，数据中心网卡可完整跑会话重协商。"
    relevance: "高带宽加密传输（CDN/代理场景）会受益。"
    link: "https://lore.kernel.org/netdev/<20260807183853.2288959-1-rjethwani@purestorage.com>/"
  - type: highlight
    title: "★ Airoha AN8855 五口 DSA 交换机驱动 v20：与 mt7530 共模块化"
    meta: "〔08-17 16:20 北京〕· [PATCH net-next v20 00/10] net: dsa: Add Airoha AN8855 support"
    points:
      - label: "定位"
        text: "DSA 是内核托管交换机框架，驱动层新增一个交换机型号。"
      - label: "做法"
        text: "v20 新增 Airoha AN8855 五口千兆交换机驱动，把 mt7530 的公共函数抽进 lib 模块、MDIO 总线锁并入 regmap。"
      - label: "效益"
        text: "路由器/AP 常用交换芯片纳入主线，厂商私有网络栈可退役。"
    relevance: "软路由/OpenWrt 生态会受益。"
    link: "https://lore.kernel.org/netdev/<20260817082034.20326-1-ansuelsmth@gmail.com>/"
  - type: highlight
    title: "★ Motorcomm 四口 2.5GbE PHY 驱动 v11：多网口板卡的新选择"
    meta: "〔08-17 19:06 北京〕· [PATCH net-next v11] net: phy: Add driver for Motorcomm Quad 2.5GbE phy"
    points:
      - label: "定位"
        text: "PHY 驱动位于 net 驱动层（物理层媒体芯片，和视频 serdes 同族）。"
      - label: "做法"
        text: "v11 驱动 Motorcomm 四口 2.5G PHY。"
      - label: "效益"
        text: "四口 2.5G 适合多网口主板/软路由，PHY 生态继续补齐。"
    relevance: "板卡硬件选型时可纳入考虑。"
    link: "https://lore.kernel.org/netdev/<20260817110626.510277-1-kyle.switch@motor-comm.com>/"
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "★ 7.3 合并窗口开启，vfs 一口气拉 18 个 PULL"
    meta: "〔08-18 06:26 北京〕· [GIT PULL] vfs 系列 for v7.3"
    points:
      - label: "定位"
        text: "合并窗口 = 各子系统维护者把攒了两个多月的功能树汇入 mainline 的窗口。"
      - label: "做法"
        text: "Brauner 的 vfs 系列 18 个 PULL 全部进 7.3：sync/super/ovl/netfs/mount/iomap/lookup/kfunc…；sched_ext、workqueue、watchdog、NVDIMM/DAX、fscrypt 的 PULL 也同批到达。"
      - label: "效益"
        text: "VFS 层下一版的功能面一次看清——想跟 7.3 新特性，这两周看 PULL 合并就是清单。"
    relevance: "合并窗口期间是补丁最容易被接纳的时机，投稿者注意。"
    link: "https://lore.kernel.org/linux-fsdevel/<178700555571.1769471.11372446319355226306.pr-tracker-bot@kernel.org>/"
  - type: highlight
    title: "★ XFS fs-verity 支持 v15：post-EOF merkle 树的长期推进"
    meta: "〔08-17 15:02 北京〕· [PATCH v15 00/25] fs-verity support for XFS with post EOF merkle tree"
    points:
      - label: "定位"
        text: "fs-verity 是『文件完整性校验』框架（Android/容器镜像在用），XFS 是最后一块主要拼图。"
      - label: "做法"
        text: "v15 继续打磨 post-EOF merkle 树的读写路径与 fsync/回收交互，Christoph Hellwig 参与评审。"
      - label: "效益"
        text: "XFS 用户（服务器/大存储）能给静态文件加防篡改校验。"
    relevance: "与 fs 完整性、镜像安全分发相关。"
    link: "https://lore.kernel.org/linux-fsdevel/<20260814092448.1818082-1-aalbersh@kernel.org>/"
  - type: divider
    label: "📌 机制雷达：跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "sched_ext"
        text: "17 帖系列处理 proxy execution 的远程 DSQ 迁移竞态，讨论密集 · <a href=\"https://lore.kernel.org/lkml/<aoNl4ziRiD9QxsOy@slm.duckdns.org>/\">原文</a>"
      - label: "blkcg io.stat"
        text: "把 blkcg 每 cgroup 的 IO 统计暴露给 BPF（新 kfunc），运维可编程读取 · <a href=\"https://lore.kernel.org/linux-block/<20260817214205.723267-1-ziyang.meme@gmail.com>/\">原文</a>"
      - label: "s390 lazy MMU"
        text: "v7 批量 PTE 更新 + 让 KASAN 感知 lazy MMU 模式 · <a href=\"https://lore.kernel.org/linux-mm/<cover.1786956464.git.agordeev@linux.ibm.com>/\">原文</a>"
      - label: "virtio_ring packed"
        text: "修 packed ring 一次失败 add 后遗留的过期描述符标志（亚马逊）· <a href=\"https://lore.kernel.org/lkml/<20260817223229.28954-1-graf@amazon.com>/\">原文</a>"
      - label: "fw_devlink PHY 包"
        text: "driver core/of 修以太网 PHY 封装器的设备链接，避免探针乱序 · <a href=\"https://lore.kernel.org/netdev/<20260816-submit-phy-package-fwdevlink-v1-v2-0-23e55dd59fad@gmail.com>/\">原文</a>"
  - type: divider
    label: "📊 板块活跃度 · 近 24h"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-18/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h（lkml 1200 · net 385 · mm 339 居前）"
  - type: toc
    items:
      - label: "Top3"
        text: "lkml 1200 · net 385 · mm 339（refresh-heat 06:23 自动刷新）"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "bump allocator"
        text: "只做『推指针分配、整块释放』的分配器，批量场景省掉 SLUB 的锁与链表"
      - label: "合并窗口 merge window"
        text: "rc1 后约两周集中合入各子系统功能树的窗口；net-next 在此期间冻结"
      - label: "DSA"
        text: "Distributed Switch Architecture，内核管理可托管交换机的框架"
      - label: "fs-verity"
        text: "文件级完整性校验：为文件建 merkle 树，读取时校验，防篡改"
      - label: "accel 子系统"
        text: "drivers/accel，与 DRM 共享 GEM/IOMMU/FD 框架的算力加速器子系统"
      - label: "GMSL2/3"
        text: "车载摄像头串行链路标准，分串行器(serializer)与解串器(deserializer)"
      - label: "BPF kfunc"
        text: "内核向 BPF 程序导出的、可在 BPF 里直接调用的内核函数"
      - label: "NVKV"
        text: "NVIDIA 私有的 key-value 二进制编码格式（GSP 固件通信用）"
  - type: closing
    tagline: "内核热路径的效率账会持续算下去——点个赞，或留言聊聊你最想追的机制。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
