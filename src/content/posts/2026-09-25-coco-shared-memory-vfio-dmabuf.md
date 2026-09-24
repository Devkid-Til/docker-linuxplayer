---
title: "机密计算的共享内存，第一次有了统一分配器；vfio 设备直通的内存，现在能 mmap 给用户态"
date: "2026-09-25"
desc: "CoCo 共享内存分配器 RFC v8 收敛 5 个子系统；vfio/pci 的 DMABUF 补上 mmap；guest_memfd v13 合入、XFS 实时数据校验 21 帖。"
column: "daily"
tags: ["media", "DRM", "mm", "PCI", "net", "fs", "Rust", "block", "LSM"]
blocks:
  - type: hook
    text: >-
      今天两条头条都指向「内存怎么共享」：<strong>机密计算的共享内存，第一次有了统一的分配器</strong>——把散在
      5 个子系统里的分配/对齐/清零收拢成一条安全路径；另一条，<strong>vfio 设备直通的内存，现在能 mmap 给用户态了</strong>——
      dma-buf 这个 camera/DRM 共用的 buffer 底座，又补上一块。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-25/cover.png"
    alt: "封面 · 9月25日 · 机密计算共享内存"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "CoCo 共享内存分配器 RFC v8：把 mm/dma/swiotlb/GIC-v3 等 5 条路径的共享内存语义收成一处"
      - label: "头条"
        text: "vfio/pci DMABUF mmap v7：dma-buf 底座补上 mmap/revoke，设备直通内存可零拷贝交给用户态"
      - label: "media"
        text: "联想 X1 Carbon 14 代红外相机 VD55G1 上 IPU7；Amlogic S4 硬解 H.264 到 v10"
      - label: "DRM"
        text: "Panfrost 15 帖大修到 v10；it6505 DP 音频 v7；drm/msm 新平台 Mahua GPU"
      - label: "mm"
        text: "guest_memfd 原位转换 v13 被合入；虚拟交换空间 xswap v5；内核工作在 cgroup 内记账 RFC"
      - label: "PCI"
        text: "配置空间保存状态按偏移建索引（15 帖）；Rust 版 SR-IOV 到 v2"
      - label: "net"
        text: "Microchip lan966x 的 PCIe FDMA 到 v8；stmmac 保住跨 MTU 变更的 datapath 状态"
      - label: "fs"
        text: "挂载命名空间堵 UMOUNT_CONNECTED 引用环；XFS 实时数据校验 21 帖；MXFS 集群文件系统 RFC"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-25/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-25 06:47 北京，近 24h 各板块真实计数：net 707 · DRM 351 · mm 322 · fs 201 ·
      PCI 194 · media 140 · Rust 62 · block 57 · arch 56 · LSM 38 · rt 33 · virtio 2。
      net 依旧第一，但以驱动修复与重构流为主；DRM 的 351 由 Panfrost 大修、it6505 音频、Mahua 新平台
      三条系列撑起；mm 的 322 里 guest_memfd v13 合入与 swap 大页两条线贡献显著。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "机密计算的共享内存，散在 5 个子系统里的分配逻辑，这次收成一条了"
    meta: "〔09-24 18:05 北京〕· [RFC PATCH v8 00/14] coco: guest: Add a shared-granule allocator for host-shared memory（aneesh.kumar@kernel.org）"
    points:
      - label: 现状
        text: >-
          机密计算（CoCo）里，guest 会拿出一块内存与 host 共享，供虚拟化栈和直通设备做 DMA/中断访问。
          今天这块内存的「分配 + 按共享粒度对齐 + 状态切换时清零」，<b>各子系统各写各的</b>——
          dma-direct、dma-pool、swiotlb、GIC-v3 ITS、dma-buf system_heap 各自为政。
      - label: 痛点
        text: >-
          共享内存有两条硬安全语义：必须按「共享粒度」对齐（一个 granule 要么整块共享、要么不共享），
          且在私有↔共享切换时要清零防泄密。逻辑散落各处，就必然有某条路径「忘了清零或错对齐」——
          这也是这套代码一直难以稳定合入的根因。
      - label: 方案
        text: >-
          Aneesh Kumar 的 14 帖引入一个 <b>CoCo 共享内存分配器</b>，把「对齐 + 清零 + 分配」收敛到
          单一权威来源，再让 dma-direct、dma-pool、swiotlb、GIC-v3 ITS、dma-buf system_heap
          五条路径各自接入，共享同一套语义。
      - label: 为什么
        text: >-
          选「统一分配器」而不是继续各写各的，是因为安全语义必须只有一个权威来源——散落各处的后果就是
          顾此失彼。这也是为什么它敢伸手到 irqchip（GIC-v3 ITS 的中断翻译表也要用共享内存）。
      - label: 效益
        text: >-
          机密计算 guest 的 DMA、中断、缓冲分配全部走同一条安全路径，泄密面收窄；
          已迭代到 v8，跨 mm/dma/swiotlb 的融合方案在评审中持续收敛。
      - label: 下一步
        text: >-
          仍是 RFC，正处在「可行性已验证 → 能否进主线」的关键期。维护者盯的是它和既有
          dma-direct/swiotlb 路径的融合是否干净、有没有给非 CoCo 场景带来负担。
    verdict: 今天跨子系统最重的一个机制改动——它把「机密计算共享内存」从各子系统自扫门前雪，收成一条有单一权威来源的安全路径。
    link: https://lore.kernel.org/linux-media/<20260924100529.1398790-1-aneesh.kumar@kernel.org>/
  - type: headline
    title: "把设备直通的内存 mmap 给用户态：dma-buf 这个底座，补上关键一环"
    meta: "〔09-24 23:22 北京〕· [PATCH v7 0/9] vfio/pci: Add mmap() for DMABUFs（matt@ozlabs.org）"
    points:
      - label: 现状
        text: >-
          dma-buf 是内核里「跨设备共享内存缓冲」的标准抽象——camera 采集的帧、GPU 渲染的 buffer，
          都靠它在设备之间传递。但它只定义了「怎么共享」，用户态要真正 map 到自己地址空间去读写，
          此前得靠各驱动自己想办法。
      - label: 痛点
        text: >-
          vfio/pci 把设备 BAR 内存以 DMABUF 形式暴露给直通用户态，但用户态想 mmap 这块 DMABUF
          到自己地址空间，一直没有标准路径——「设备内存 → 用户态 → GPU」的零拷贝链路被卡住。
      - label: 方案
        text: >-
          9 帖给 vfio/pci 的 DMABUF 补上 mmap()：先提供 dma_buf_set_name() 统一命名，再把 BAR mmap
          改造成走 DMABUF，支持用户态 mmap 一块 VFIO DMABUF、并可按请求 revoke（撤销）。
      - label: 为什么
        text: >-
          走 dma-buf 框架的 mmap 而不是 vfio 自己实现，是因为 dma-buf 已是跨驱动 buffer 共享的唯一标准——
          复用它的 mmap/revoke 语义，DRM、media 这些消费者才能按同一套规则接入。
      - label: 效益
        text: >-
          设备直通 + 零拷贝：用户态能直接 map 设备内存，配合 DRM/media 的 dma-buf 导入导出，
          打通「设备内存 → 用户态 → GPU」整条链路。
      - label: 下一步
        text: >-
          已到 v7，评审集中在 revoke（撤销 mmap）的并发安全与 DMA 生命周期上。
          对做 buffer 共享（camera/DRM）的人来说，这是最值得跟的一条。
    verdict: dma-buf 是 camera/DRM buffer 共享的底座，这个系列给 vfio 侧补上了 mmap 这块——设备直通内存从此也纳入同一套 buffer 共享规则。
    link: https://lore.kernel.org/linux-media/<20260924152159.49702-1-matt@ozlabs.org>/
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "联想 X1 Carbon 14 代的红外相机，ST VD55G1 传感器上 Intel IPU7"
    meta: "〔09-25 01:18 北京〕· [PATCH 0/4] Lenovo ThinkPad X1 Carbon Gen 14 IR camera: ST VD55G1 on Intel IPU7"
    points:
      - label: 定位
        text: >-
          VD55G1 是意法半导体的红外（IR）图像传感器，装在联想 X1 Carbon 14 代的 IR 相机模组里，
          接 Intel IPU7 图像处理单元。这是给真实笔记本机型做 camera bring-up。
      - label: 做法
        text: >-
          4 帖走标准三段式：int3472（Intel 平台电源 GPIO 管理）把 VD55G1 的上电 GPIO 映射成
          「vana」模拟供电；ipu-bridge 注册这个传感器；再加单色像素格式供 IR 用。
      - label: 效益
        text: >-
          一个真实机型的 IR 相机得到上游支持——这类「sensor + ipu-bridge + 平台 GPIO」的组合，
          是 Intel IPU 平台接入新 sensor 的固定动作，可照抄结构。
    relevance: 这是 camera bring-up 的标准三件套（平台电源映射 / 桥接注册 / 像素格式），你要在新平台上点亮一颗 sensor，这套就是现成模板。
    link: https://lore.kernel.org/linux-media/<20260924171820.1179823-1-koreev.r@gmail.com>/
  - type: highlight
    title: "Amlogic S4 的 H.264 硬解到 v10：无状态解码器驱动再进一步"
    meta: "〔09-24 15:55 北京〕· [PATCH v10 0/6] Add Amlogic stateless H.264 video decoder for S4"
    points:
      - label: 定位
        text: >-
          S4 是 Amlogic 的机顶盒 SoC，硬件有 H.264 解码器。V4L2 无状态（stateless）解码是
          「内核只做码流搬运、用户态管解码」的接口，比有状态接口更适合做 codec 库。
      - label: 做法
        text: >-
          6 帖：firmware 侧通过安全监控（secure monitor）加载视频固件，DT 绑定注册解码器，
          再加 V4L2 stateless H.264 驱动本体。
      - label: 效益
        text: >-
          到 v10，评审在收敛细节。无状态解码驱动是当前主流的 codec 上游方向，
          这块硬件一旦合入，机顶盒/电视盒子类产品的硬解就有上游支撑。
    relevance: 「firmware 经安全监控加载 + stateless 接口」是当前解码器驱动的标准形态，和 camera 的 sensor 驱动是同一套 V4L2 框架。
    link: https://lore.kernel.org/linux-media/<20260924-b4-s4-vdec-upstream-v10-0-1289303a58a4@amlogic.com>/
  - type: highlight
    title: "Synopsys HDMI RX：支持在接收器前再挂一个 HDMI bridge"
    meta: "〔09-24 20:06 北京〕· [PATCH v2 0/9] media: synopsys: hdmirx: support an HDMI bridge in front of the receiver"
    points:
      - label: 定位
        text: >-
          这是 HDMI 接收端的 v4l2-subdev 驱动。它要支持「接收器前再挂一个 bridge」的拓扑——
          信号先过 bridge 再进接收器，5V 热插拔检测等信号得从上游 subdev 取。
      - label: 做法
        text: >-
          9 帖给 v4l2-subdev 框架加「source 电源变化时通知 bridge」的通知机制，
          再让 hdmirx 走 async subdevice、把 5V 状态从上游 subdev 取过来。
      - label: 效益
        text: >-
          桥接 + 接收器的级联拓扑第一次在 media 框架里有了清晰建模——这对做「HDMI 信号采集 + 环出」
          类产品的人直接有用。
    relevance: 又是 subdev 拓扑建模——camera 链路里 sensor→ISP→bridge 的级联和这里是同一套 v4l2-subdev 抽象。
    link: https://lore.kernel.org/linux-media/<20260924-hdmirx-media-v2-0-c12f641d8b0f@pengutronix.de>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-media/<20260924-upstream-s5k3t2-v3-0-a5c58dfcec29@proton.me>/
        text: "三星 S5K3T2 图像传感器驱动到 v3（2 帖）"
        time: 09-24 13:46
      - link: https://lore.kernel.org/linux-media/<20260924120634.1420687-1-antti.laakso@linux.intel.com>/
        text: "ipu6：修 bus 设备 use-after-free（Intel 相机平台）"
        time: 09-24 20:07
      - link: https://lore.kernel.org/linux-media/<CAGEsz8HmUoQq7XLr5ZN7diWt-sWYoUwYd400vpq5jYEDEB7_vQ@mail.gmail.com>/
        text: "amphion：修 VPU 核在 teardown 期间的 lifetime（v2，2 帖）"
        time: 09-25 05:49
      - link: https://lore.kernel.org/linux-media/<20260924-vpu_hwmode_fix-v1-1-531498f3499a@oss.qualcomm.com>/
        text: "iris：启用 HW 模式前先复位 AHB bridge（高通 VPU）"
        time: 09-24 22:31
      - link: https://lore.kernel.org/linux-media/<20260924045129.12794-1-rokinthanp03@gmail.com>/
        text: "as102：DVB 注册前初始化锁与信号量，堵竞态"
        time: 09-24 12:51
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "Panfrost 15 帖大修到 v10：性能计数器、runtime PM、重构一把抓"
    meta: "〔09-25 02:09 北京〕· [PATCH v10 00/15] Collection of fixes for Panfrost: Perfcnt, RPM, refactorings"
    points:
      - label: 定位
        text: >-
          Panfrost 是 Arm Mali 开源 GPU 驱动。这系列 15 帖聚焦三块历史欠账：
          性能计数器（perfcnt）与 reset 的竞态、runtime PM 引用计数、以及驱动初始化结构散乱。
      - label: 做法
        text: >-
          引入 reset 锁串行化 perfcnt 与复位、修 probe/remove 阶段的 PM 引用计数与 autosuspend、
          把 debugfs/时钟管理/MMU 中断初始化各自归位。
      - label: 效益
        text: >-
          到 v10 说明评审已多轮收敛，perfcnt 与 reset 的竞态是「调性能时读数错乱」这类 bug 的根因，
          修完对 Mali 平台的稳定性直接有效。
    relevance: Mali GPU 驱动的并发/电源管理修复，和你在 DRM 侧「设备 probe/remove + 时钟电源」的坑是同一类。
    link: https://lore.kernel.org/dri-devel/<20260924-claude-fixes-v10-0-755929b3cc19@collabora.com>/
  - type: highlight
    title: "it6505 DP 音频 v7：把 14 个边角 bug 一次清掉"
    meta: "〔09-25 02:40 北京〕· [PATCH v7 00/14] drm/bridge: it6505: DP audio support + shared-DAI hw_params fix"
    points:
      - label: 定位
        text: >-
          it6505 是 DisplayPort→HDMI 桥接芯片驱动。这系列补 DP 音频支持，同时修了一串
          边角：除零、错误码写回 reset 寄存器、OF 节点引用泄漏、runtime PM 未平衡等。
      - label: 做法
        text: >-
          14 帖在加音频能力的同时做稳健性加固——音频信息帧通道数为 0 时直接拒绝、
          像素时钟计算防除零、poweroff 即使禁用 regulator 失败也走完。
      - label: 效益
        text: >-
          桥接芯片驱动里「音频 + 边角加固」一起做是常见形态，v7 阶段细节已很扎实。
    relevance: bridge 驱动是 DRM 链路的中间件，它的「边角加固」清单（除零/引用泄漏/PM 平衡）对任何驱动都通用。
    link: https://lore.kernel.org/dri-devel/<cover.1790275151.git.daniel@makrotopia.org>/
  - type: highlight
    title: "drm/msm：新高通平台 Mahua 的 GPU 支持，5 帖"
    meta: "〔09-25 05:15 北京〕· [PATCH 0/5] drm/msm: Mahua GPU support"
    points:
      - label: 定位
        text: >-
          msm 是高通 SoC 的 DRM/GPU 驱动。Mahua 是新的 Adreno 平台代号，
          这 5 帖把它接进 msm 既有框架，并顺带修正了兄弟平台 Glymur 的 GMU compatible。
      - label: 做法
        text: >-
          DT 绑定补 Mahua GPU/GMU 描述、驱动侧加 a8xx 的 Mahua 支持、修 Glymur 的 compatible 串。
      - label: 效益
        text: >-
          新高通平台的图形栈开始上游化，与同期的 CAMSS 相机系列配套，是整套平台进主线的节奏。
    relevance: 高通平台 GPU + 相机同日上游化的标准节奏，观察「次新平台怎么进主线」的现成样本。
    link: https://lore.kernel.org/dri-devel/<20260925-mahua-gpu-v1-0-0fa0bfd8d315@oss.qualcomm.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/dri-devel/<20260924090816.38457-1-gahing@gahingwoo.com>/
        text: "accel/rocket：RK3576 NPU（RKNN）使能到 v13（14 帖）"
        time: 09-24 17:08
      - link: https://lore.kernel.org/dri-devel/<20260924065313.899730-1-mpenttil@redhat.com>/
        text: "设备页按需迁移（migrate-on-fault）到 v15（11 帖，GPU 内存与 mm 协同）"
        time: 09-24 14:53
      - link: https://lore.kernel.org/dri-devel/<20260924-crosshatch-panel-v2-0-08d5c7bf72fc@ixit.cz>/
        text: "Pixel 3 XL 屏幕面板支持（s6e3ha8，v2，11 帖）"
        time: 09-24 22:01
      - link: https://lore.kernel.org/dri-devel/<20260924-qcom-novatek-nt51021-panels-v5-0-f5eaf5685c9c@mainlining.org>/
        text: "Novatek NT51021 DSI 面板驱动到 v5（3 帖）"
        time: 09-24 23:08
      - link: https://lore.kernel.org/dri-devel/<20260924-add-lt9211c-bridge-v9-0-d78b39677a61@oss.qualcomm.com>/
        text: "Lontium lt9211c bridge 支持到 v9（2 帖）"
        time: 09-24 23:59
      - link: https://lore.kernel.org/dri-devel/<20260924145400.1385815-1-azuddinadam@gmail.com>/
        text: "RAiO RA8875 显示控制器驱动（v2，2 帖）"
        time: 09-24 22:54
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "guest_memfd 原位转换到 v13，44 帖被合入"
    meta: "〔09-25 05:53 北京〕· [PATCH v13 00/44] guest_memfd: In-place conversion support"
    points:
      - label: 定位
        text: >-
          guest_memfd 是 KVM 给 guest 提供的「私有内存」文件系统。这次要支持「原位转换」：
          同一页在 private↔shared 之间切换时不搬家、原地改映射，避免大页拆分的代价。
      - label: 做法
        text: >-
          44 帖的大系列，跨 mm 与 KVM。今天的信号是它被 b4 应用通知（b4-ty）确认合入——
          长期迭代的这条线终于落定。
      - label: 效益
        text: >-
          机密计算虚拟机的内存转换开销显著下降，是 CoCo 场景的关键基础设施。
    relevance: 机密计算的内存语义和头条 CoCo 共享内存是同一条线——一个管 guest 私有内存、一个管 host 共享内存。
    link: https://lore.kernel.org/linux-mm/<20260910-gmem-inplace-conversion-v13-0-dd6fbf94f4e1@google.com>/
  - type: highlight
    title: "虚拟交换空间到 v5：把 swap 做成可扩展的「虚拟设备」"
    meta: "〔09-24 20:55 北京〕· [PATCH v5 00/11] Virtual Swap Space (Swap Table Edition)"
    points:
      - label: 定位
        text: >-
          传统 swap 是「一块物理交换设备」。虚拟交换空间（xswap）把 swap 抽象成虚拟设备，
          背后可以接内存压缩、远端内存、CXL 等任意后端，摆脱「swap 必须落盘」的限制。
      - label: 做法
        text: >-
          v5 这版聚焦「交换表」：把 swap 表项的管理抽象成可扩展接口，为多种后端铺路。
      - label: 效益
        text: >-
          数据中心用远端内存/CXL 做「内存超卖」的路线有了内核侧支撑——这是内存子系统
          近期的方向性热点之一。
    relevance: swap 抽象化是 mm 的机制级方向，和「内存分层 / CXL 内存」这些大趋势直接挂钩。
    link: https://lore.kernel.org/linux-mm/<20260918180241.3424851-1-nphamcs@gmail.com>/
  - type: highlight
    title: "内核替你干的活，CPU 时间记到哪个 cgroup？这个 RFC 要理清"
    meta: "〔09-25 02:47 北京〕· [RFC PATCH 0/7] cgroup: charge kernel work to the cgroup it is done for"
    points:
      - label: 定位
        text: >-
          内核代某 cgroup 干的活（比如回收它的内存），产生的 CPU 时间/压力目前记账模糊——
          常常记到「正在跑的那个进程」头上，而不是「受益的那个 cgroup」。
      - label: 做法
        text: >-
          7 帖引入 set_active_cgroup()，把内核工作的 CPU 时间、PSI 压力、回收代价
          记账到「它为之服务的 cgroup」。
      - label: 效益
        text: >-
          容器计费与资源隔离更公平：谁的内存被回收、谁就该承担这份 CPU 成本。
    relevance: cgroup 记账是云基础设施的底层公平性机制，这个方向关系到「成本归谁」的度量精度。
    link: https://lore.kernel.org/linux-mm/<20260924184714.912181-1-shakeel.butt@linux.dev>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-mm/<20260914122950.3283997-16-usama.arif@linux.dev>/
        text: "swap 大页（PMD swap entries）换入换出系列 RESEND v7（29 帖）"
        time: 09-25 04:37
      - link: https://lore.kernel.org/linux-mm/<20260924131106.1730494-1-dev.jain@arm.com>/
        text: "优化匿名 swap 大 folio 的 unmap 批量化（v3，9 帖，Arm）"
        time: 09-24 21:11
      - link: https://lore.kernel.org/linux-mm/<20260924201615.4478-1-kmehltretter@gmail.com>/
        text: "damon：构造 scheme 时保留配额状态（v2，2 帖）"
        time: 09-25 04:16
      - link: https://lore.kernel.org/linux-mm/<20260924-fix-dev-zero-readonly-shared-v1-1-153c2111e323@kernel.org>/
        text: "修 /dev/zero 只读 MAP_SHARED 映射的行为（Greg KH 跟进）"
        time: 09-24 22:49
  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "配置空间的「保存状态」按偏移建索引：15 帖重构 PCI 休眠/恢复"
    meta: "〔09-25 01:35 北京〕· [PATCH 00/15] PCI: Index saved capability state by configuration space offset"
    points:
      - label: 定位
        text: >-
          设备休眠/恢复时，PCI 核心要保存/恢复各 capability（AER、ASPM、TPH、DPC 等）的寄存器状态。
          现在每个 capability 各维护一份保存缓冲，结构重复。
      - label: 做法
        text: >-
          Google 的 David Matlack 用 15 帖引入「按配置空间偏移建索引」的统一保存存储，
          各 capability 的状态统一存进一个 store，按偏移寻址。
      - label: 效益
        text: >-
          休眠/恢复路径的保存逻辑从「N 份重复代码」收敛成一份，后续加新 capability 不用再复制粘贴。
    relevance: 这是 PCI 核心层的机制级重构——「用统一索引替代分散缓冲」，和内核里大量「去重复化」的模式一致。
    link: https://lore.kernel.org/linux-pci/<20260924173501.856380-1-dmatlack@google.com>/
  - type: highlight
    title: "Rust 版 SR-IOV 到 v2：从 Rust 驱动控制虚拟功能"
    meta: "〔09-25 03:06 北京〕· [PATCH v2 0/8] Add Rust PCI SR-IOV support"
    points:
      - label: 定位
        text: >-
          SR-IOV 让一块物理网卡/设备切出多个虚拟功能（VF）给虚机用。这系列给 Rust 的 PCI
          抽象补上 SR-IOV 能力：启用/禁用、判断 PF/VF、从 sysfs 配置。
      - label: 做法
        text: >-
          NVIDIA 的 8 帖给 rust/pci 加 {enable,disable}_sriov()、is_physfn()/is_virtfn()、
          num_vf() 与 bus 回调，并配一个 Rust SR-IOV VF 驱动样例。
      - label: 效益
        text: >-
          Rust 驱动从此能控制 SR-IOV 虚拟功能——Rust for Linux 覆盖的 PCI 能力又宽了一块。
    relevance: Rust 写 PCI 驱动从「读写配置空间」走到「管理 SR-IOV」，是 Rust for Linux 成熟度的一个里程碑式能力。
    link: https://lore.kernel.org/linux-pci/<20260924190556.1620886-1-zhiw@nvidia.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-pci/<20260922083924.2451158-1-smadhavan@nvidia.com>/
        text: "CXL 设备复位序列化到 v13（15 帖，NVIDIA）"
        time: 09-24
      - link: https://lore.kernel.org/linux-pci/<cover.1790267348.git.bblock@linux.ibm.com>/
        text: "SR-IOV 锁竞态与 AB-BA 死锁修复（v15，5 帖，IBM）"
        time: 09-25 00:30
      - link: https://lore.kernel.org/linux-pci/<cover.1790222172.git.liaoxuan@hygon.cn>/
        text: "NVMe 自适应链路速率切换（3 帖，海光）"
        time: 09-24 14:15
      - link: https://lore.kernel.org/linux-pci/<20260924222444.1351466-1-elder@riscstar.com>/
        text: "PCI: of：动态更新 endpoint 的地址范围（v3，3 帖）"
        time: 09-25 06:24
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "Microchip lan966x 的 PCIe FDMA 到 v8：15 帖"
    meta: "〔09-25 03:57 北京〕· [PATCH net-next v8 00/15] net: lan966x: add support for PCIe FDMA"
    points:
      - label: 定位
        text: >-
          lan966x 是 Microchip 的交换芯片，原走 SoC 内部总线。这次要给它加 PCIe 形态的
          FDMA（帧 DMA）——让同款交换芯片以 PCIe 卡的形式接入主机。
      - label: 做法
        text: >-
          15 帖：先抽一个可复用的 FDMA 库（含 PCIe ATU 地址翻译），再让 lan966x 的
          数据通路走 PCIe FDMA，补 XDP 支持。
      - label: 效益
        text: >-
          交换芯片「多形态接入」的样板——同一套 FDMA 引擎在 SoC 与 PCIe 两种宿主间复用。
    relevance: 网络 DMA 引擎的抽象化（FDMA 库 + ATU 翻译），和 camera 里「同一 ISP 接不同总线」是同一类工程问题。
    link: https://lore.kernel.org/netdev/<20260924-lan966x-pci-fdma-v8-0-201c7b707d8b@microchip.com>/
  - type: highlight
    title: "stmmac 保住跨 MTU 变更的 datapath 状态：v3 十帖"
    meta: "〔09-25 01:44 北京〕· [PATCH net v3 00/10] net: stmmac: preserve datapath state across MTU and resume failures"
    points:
      - label: 定位
        text: >-
          stmmac 是应用最广的以太网 MAC 驱动之一。改 MTU 或从挂起恢复时，若中途失败，
          数据通路（DMA 配置、XSK 池、PHY 所有权）会处于半初始化状态。
      - label: 做法
        text: >-
          10 帖让 datapath 状态跨 MTU 变更/恢复失败保持连贯：小改 MTU 时不停数据通路、
          失败时正确回滚 DMA 配置、XDP 重开失败也纳入追踪。
      - label: 效益
        text: >-
          改 MTU 不再动不动断流，恢复失败也不会把网卡留在半死状态——稳定性的实打实改善。
    relevance: 「状态机在失败路径上要可回滚」是所有驱动复用的基本功，这 10 帖是标准示范。
    link: https://lore.kernel.org/netdev/<20260924-submit-stmmac-reset-fixes-v1-v3-0-c031e3f3a282@gmail.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/netdev/<20260924185316.2831077-1-hramamurthy@google.com>/
        text: "gve：AdminQ 模式相关重构到 v8（12 帖，Google 自研网卡）"
        time: 09-25 02:53
      - link: https://lore.kernel.org/netdev/<20260924202543.1090535-1-adrianox@gmail.com>/
        text: "netfilter：XDP flowtable 查找补 VLAN 封装（net-next）"
        time: 09-25 04:25
      - link: https://lore.kernel.org/netdev/<20260924215951.2127682-1-f@lex.la>/
        text: "net phy：让驱动 unbind 对 attach/使用安全（v3，4 帖）"
        time: 09-25 05:59
      - link: https://lore.kernel.org/netdev/<20260924224456.55690-4-jeffjo@openai.com>/
        text: "tcp：修正接受旧 ACK 的时间戳回显（net v2，2 帖）"
        time: 09-25 06:45
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "挂载命名空间：堵住 UMOUNT_CONNECTED 的引用计数环"
    meta: "〔09-25 06:35 北京〕· [PATCH RFC v2 0/8] namespace: prevent UMOUNT_CONNECTED reference count cycles"
    points:
      - label: 定位
        text: >-
          挂载命名空间的连接关系靠引用计数维持。UMOUNT_CONNECTED 场景下可能引用成环——
          谁也释放不了谁，挂载点与命名空间一起泄漏。
      - label: 做法
        text: >-
          8 帖 RFC 从挂载拓扑层面识别并切断成环路径（Christian Brauner 主导），
          配套一组自测验证「死挂载点能正确让渡」。
      - label: 效益
        text: >-
          容器高频建删命名空间少一类泄漏；引用计数成环是所有带生命期管理的子系统都会踩的坑。
    relevance: 引用计数成环是通用问题——你在驱动里管 refcount 时，这套「识别环 + 主动切断」的思路同样适用。
    link: https://lore.kernel.org/linux-fsdevel/<20260925-work-mount-knullfs-v2-0-c4aebaa186e9@kernel.org>/
  - type: highlight
    title: "XFS 实时数据校验 21 帖：zones 设备也有一致性保障了"
    meta: "〔09-24 18:00 北京〕· support for RT data checksums（hch@lst.de，21 帖）"
    points:
      - label: 定位
        text: >-
          XFS 的实时（realtime/RT）设备用于存储大文件（视频、数据库）。此前 RT 数据没有校验和，
          位反转只能靠存储层自己兜。
      - label: 做法
        text: >-
          Christoph Hellwig 的 21 帖给 RT 数据加校验和：定义磁盘格式、写路径计算、读路径验证，
          并与 zoned 垃圾回收协同。
      - label: 效益
        text: >-
          大文件存储场景第一次有了端到端数据一致性保障，zoned 设备（SMR/企业 SSD）尤其受益。
    relevance: 「数据完整性」是存储子系统的主线之一，这套校验和机制和你在驱动里做 CRC/ECC 校验是同一个思路的放大版。
    link: https://lore.kernel.org/linux-fsdevel/<20260924100032.2733101-1-hch@lst.de>/
  - type: highlight
    title: "MXFS：从 XFS 派生的共享磁盘集群文件系统，发 RFC 了"
    meta: "〔09-25 05:25 北京〕· [RFC] MXFS: a shared-disk clustered filesystem derived from XFS"
    points:
      - label: 定位
        text: >-
          这是从 XFS 派生、面向「多节点共享同一块磁盘」的集群文件系统 RFC——
          集群里多个节点同时读写同一存储池，需要分布式锁与元数据一致性。
      - label: 做法
        text: >-
          单篇 RFC 抛出设计：复用 XFS 的磁盘格式与成熟实现，在集群协调层做文章。
      - label: 效益
        text: >-
          若走通，HPC/存储集群多了一个「背靠 XFS 生态」的共享磁盘文件系统选项。
    relevance: 又一个从成熟实现派生的新文件系统——和内核里「复用 + 增量改造」的工程哲学一脉相承。
    link: https://lore.kernel.org/linux-fsdevel/<56847E8D-EA83-4984-82F3-9BC93E4C02FF@gmail.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-fsdevel/<20260924091203.198225-1-parri.andrea@gmail.com>/
        text: "iomap：修错误处理回归（v2，4 帖，direct I/O 与 fiemap 丢错误）"
        time: 09-24 17:12
      - link: https://lore.kernel.org/linux-fsdevel/<20260924104831.1081137-1-caixinchen1@huawei.com>/
        text: "landlock：新增 READ/WRITE_METADATA 元数据访问权（RFC，12 帖，见机制雷达）"
        time: 09-24 18:48
      - link: https://lore.kernel.org/linux-fsdevel/<20260924073920.2782917-1-benquike@gmail.com>/
        text: "qnx6：修 buffer head 泄漏、双重释放与 inode 校验（v3，6 帖）"
        time: 09-24 15:39
      - link: https://lore.kernel.org/linux-fsdevel/<20260924-lklm-sysctl-headerctx-template-v1-0-b25e51c66ba7@kernel.org>/
        text: "sysctl：加注册上下文以共享 ctl_table 数组（RFC，4 帖）"
        time: 09-24 22:34
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "landlock 元数据权"
        text: >-
          LSM 钩子从「传 inode」改成「传 struct path」，让 landlock 能按路径区分
          「读元数据」与「读内容」——新增 READ_METADATA/WRITE_METADATA 两种访问权，
          沙箱能更细地管文件元数据。是 LSM 接口层面的一次机制级演进。
          <a href="https://lore.kernel.org/linux-fsdevel/<20260924104831.1081137-1-caixinchen1@huawei.com>/">原文</a>
      - label: "arm64 ftrace + kCFI"
        text: >-
          Rust 内核常开 kCFI（控制流完整性），此前会与 CALL_OPS 这类 ftrace 优化冲突。
          v2 九帖让 arm64 在 kCFI 内核上也支持 CALL_OPS（用五个前缀 NOP 协调 BTI），
          工具链层的关键兼容。
          <a href="https://lore.kernel.org/rust-for-linux/<20260924-b4-arm64-callops-kcfi-v2-0-587865b6d991@linux.dev>/">原文</a>
      - label: "virtio-blk 内联加密"
        text: >-
          virtio-blk 加控制 virtqueue 与 inline 加密支持——存储加密能力下沉到虚拟块设备，
          与宿主存储加密栈对齐。低频列表，只作信号提示。
          <a href="https://lore.kernel.org/virtio-dev/<20260913161628.368484-1-linlin.zhang@oss.qualcomm.com>/">原文</a>
      - label: "blk-iocost BPF 成本模型"
        text: >-
          块设备 IO 成本模型（iocost）用 BPF struct_ops 开放出来，让数据中心按自己的
          SSD 特性写成本模型——把「调度策略」变成可编程的。
          <a href="https://lore.kernel.org/linux-block/<20260924054549.2271705-1-cui.tao@linux.dev>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "CoCo（机密计算）"
        text: >-
          Confidential Computing：让 guest 的内存对 host 不可见，防止云厂商/管理程序窥探。
          本期两件事都在这条线上——CoCo 共享内存分配器管「host 共享」、guest_memfd 管「guest 私有」。
      - label: "dma-buf"
        text: >-
          内核里跨设备共享内存缓冲的标准抽象：camera 采集的帧、GPU 渲染的 buffer，
          都在设备之间靠它传递。本期 vfio 给它补上了 mmap 能力。
      - label: "共享粒度（shared granule）"
        text: >-
          机密计算里共享内存的最小单位：一个 granule 要么整块共享、要么不共享，
          且私有↔共享切换时要清零——CoCo 分配器就是围绕这个粒度做对齐与清零。
      - label: "SR-IOV"
        text: >-
          一块物理设备切出多个虚拟功能（VF）直通给虚机。本期 Rust 侧补齐了
          从 Rust 驱动控制 SR-IOV 的能力。
      - label: "无状态解码（stateless codec）"
        text: >-
          V4L2 的 codec 接口分两种：有状态（内核管解码）、无状态（内核只搬运码流、
          用户态管解码）。本期 Amlogic S4 的 H.264 硬解就是无状态驱动。
      - label: "xswap（虚拟交换空间）"
        text: >-
          把 swap 抽象成「虚拟设备」，背后可接内存压缩、远端内存、CXL 等任意后端，
          摆脱「swap 必须落盘」的限制——内存超卖的方向性基础设施。
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的板块。
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
