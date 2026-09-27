---
title: "Rust 吃下 Binder：11470 行 C 代码退场；内核原地升级这周收敛到「只差 VFIO」"
date: "2026-09-27"
desc: "本周内核全局：Binder 的 C 实现整体删除、Rust 版转正，15 年 C 子系统首次被 Rust 完整替换；Live Update 三条线收敛到 PCI v9 + IOMMU v5，目标 Linux 7.4；页表释放 RCU 化跨十几架构收官。"
column: "weekly"
tags: ["内存管理", "架构动向", "社区/生态", "PCI/总线"]
blocks:
  - type: hook
    text: >-
      本周两条主线：<strong>内核里跑了 15 年的 Binder C 驱动被整体删除</strong>，
      Rust 版正式转正——这是第一次有生产级 C 子系统被 Rust 完整替换（-11470 行）；
      另一条是<strong>内核原地升级</strong>，PCI v9 收敛、IOMMU v5 已发，
      只剩 VFIO 那层还没演示过跨 kexec 的连续 DMA，目标 Linux 7.4。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-27/weekly-cover.png"
    alt: "封面 · 9月27日 · 每周全局雷达"
  - type: divider
    label: "📊 板块热度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-27/board-heat-week.png"
    alt: "板块热度条形图 · 本周（09-21~09-27）"
  - type: paragraph
    text: >-
      本周（09-21~09-27，7 天每日 24h 窗口累加）总计数 <b>11931</b>：net 3943 · DRM 1910 · mm 1899 ·
      fs 979 · media 921 · PCI 855 · arch 424 · Rust 360 · block 342 · LSM 189 · rt 98 · virtio 11。
      net 依旧是量最大的一头，但本周分量最重的机制改动都不在数量最多的那个板块——
      最重的一条在 Rust（360 票的板块）。
  - type: divider
    label: "💡 本周头条"
    kind: primary
  - type: headline
    title: "Rust 吃下 Binder：跑 15 年的 C 驱动被整体删除，-11470 行"
    meta: "〔09-12 提交，本周列表与 LWN 持续讨论〕· binder: rm -f binder.c（Carlos Llamas，commit fd2bc059ed46）"
    points:
      - label: 现状
        text: >-
          Binder 是 Android 的 IPC 基石，C 实现存在了 15 年以上。Alice Ryhl 做的 Rust binder
          已经在 Android 设备上跑了相当一段时间，功能对齐、性能相当甚至更好。
      - label: 方案
        text: >-
          一帖删掉整个 C 实现：<b>20 个文件、9 行新增、11470 行删除</b>，包括
          <code>drivers/android/binder.c</code>、<code>binder_alloc.c</code> 与它们的 KUnit 测试。
          Kconfig 里 <code>CONFIG_ANDROID_BINDER_IPC</code> 改为依赖 Rust。
      - label: 为什么
        text: >-
          commit message 写得很直白：The day has finally come. 15 年来 C 驱动越来越复杂，
          维护与加新特性都极其痛苦、还总踩漏洞。作者的原话是，Rust 版跑到现在
          <b>已经不能叫 experiment 了</b>。
      - label: 下一步
        text: >-
          <b>本地三镜像实测</b>：linux-next 已有（next-20260921），<b>mainline 尚未合入、stable 未回移植</b>——
          排队等 7.4 merge window。
    verdict: >-
      这是内核史上第一次用 Rust 实现完整替换生产级 C 子系统。它决定的不只是 Binder，
      而是「Rust 能不能吃下更大的子系统」这件事的舆论基础。
    link: "https://lkml.org/lkml/2026/9/25/864"
  - type: headline
    title: "内核原地升级：PCI 与 IOMMU 都接住了，只差 VFIO 那一层"
    meta: "〔09-25 22:30 北京〕· [Hypervisor Live Update] Notes from September 21, 2026（Pasha Tatashin）"
    points:
      - label: 现状
        text: >-
          不重启换内核，前提是三样东西能被新内核原样接过去：<b>设备</b>（PCI 配置空间、总线号、ACS 控制）、
          <b>DMA 映射</b>（IOMMU 页表与 ATS 状态）、<b>设备文件</b>（VFIO 交出去的 fd 与驱动内部状态）。
      - label: 进展
        text: >-
          PCI 侧 David Matlack 已发 v9，回答了 Bjorn 对 v8 的全部意见，主要设计问题收敛；
          IOMMU 侧 Samiullah Khawaja 发了 v5；LUO 文档已由 Mike Rapoport 合入 liveupdate 树。
      - label: 缺口
        text: >-
          VFIO 只保住了设备文件描述符，<b>不足以跳过 shutdown/freeze 时的设备复位</b>，
          所以还演示不了「跨 kexec 的连续 DMA」，要等 Vipin Sharma 十月回来处理。
      - label: 下一步
        text: >-
          计划 1-2 周内进 liveupdate/next，理想赶在 7.3-rc6 之前、落在 <b>Linux 7.4</b>。
          LPC 议题也换了：原本给 PCIe 的微会议时段改谈 tmpfs 保留，另开一场专谈「版本与兼容」——
          说明「换内核时用户态状态怎么办」才是真正没解决的那部分。
    verdict: >-
      设计问题确实收敛了，但「接得住」目前只覆盖 PCI 和 IOMMU 两层。7.4 能不能赶上，看接下来两周 review 速度。
    link: "https://lore.kernel.org/linux-mm/<20260925143000.2729890-1-pasha.tatashin@soleen.com>/"
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: toc
    items:
      - label: "页表释放 RCU 化收官"
        text: >-
          剩余架构全部转成 RCU 延迟释放，然后<b>整体删除 CONFIG_MMU_GATHER_RCU_TABLE_FREE</b>——
          语义从此只有一份。铺垫数年，本周从 v4 走到 v5，跨十几个架构。统一后无锁页表遍历成为全架构基础设施。
          <a href="https://lore.kernel.org/linux-mm/<20260925-rcu-pagetable-freeing-v5-0-31e91065fea4@kernel.org>/">原文</a>
      - label: "消灭 VM_SPECIAL（40 帖）"
        text: >-
          VMA flag 语义显式化的 v3，40 帖规模。mm 子系统正在把多年的隐性约定逐条显性化。
      - label: "虚拟交换空间走向之辩"
        text: >-
          Virtualized Swap 该由内核直接管、还是用户态用 PSI 就够——21 帖讨论。swap 抽象化是 mm 的方向性热点。
          <a href="https://lore.kernel.org/linux-mm/<arbtVBEKm5IJTH2j@cmpxchg.org>/">原文</a>
      - label: "机密计算内存语义成对出现"
        text: >-
          CoCo 共享内存分配器 v8 把散在 dma-direct/dma-pool/swiotlb/GIC-v3 ITS/dma-buf 五条路径的
          「对齐+清零+分配」收成单一权威来源；guest_memfd 原位转换 v13（44 帖）被合入。一个管 host 共享，一个管 guest 私有。
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: toc
    items:
      - label: "Binder C 退场"
        text: >-
          本周最重机制变更，详见头条。
      - label: "Rust PCI SR-IOV v2"
        text: >-
          把 SR-IOV 的完整生命周期（PF 注册 → VF 使能 → sysfs 触发）搬进 Rust 抽象层。
          本地三镜像：mainline 未合入 / 不在 next 队列。
          <a href="https://lore.kernel.org/linux-pci/<20260924190556.1620886-1-zhiw@nvidia.com>/">原文</a>
      - label: "Rust XArray 抽象"
        text: >-
          XArray 是内核「稀疏索引 → 指针」的主力数据结构（页缓存、IDR 都靠它），Rust 侧一直没有对应封装。
          Rust 驱动要用页缓存类设施时不必再手写 unsafe 胶水。
          <a href="https://lore.kernel.org/rust-for-linux/<20260923-rxarray-next-v1-0-92eedf185649@samsung.com>/">原文</a>
      - label: "网络子系统的 Rust 抽象：还没有"
        text: >-
          有人在 rust-for-linux 问「net 的 Rust 抽象在哪」，答案是暂时没有。
          跟踪 Rust for Linux 成熟度的直观方法：看它把 C 侧核心数据结构封装完几个了。
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: toc
    items:
      - label: "OV2312 RGB-IR：8 个新格式"
        text: >-
          4×4 RGBIr 阵列，2×2 的格式表描述不了它。一帖补 8 个 10-bit 格式，并沿采集链路铺到
          DS90UB960 去串行器、Cadence CSI-2 RX、TI J721E CSI-2 RX。
          <a href="https://lore.kernel.org/linux-media/<20260925133001.2780868-1-r-donadkar@ti.com>/">原文</a>
      - label: "GMSL2/3 串行器 v16 卡在 CI"
        text: >-
          v16 技术内容基本收敛，今天讨论的是流程：CI 里 smatch 告警是误报，修复在 devel 分支但没进 master。
          卡点已从代码转移到工具链——大系列最后一公里。
          <a href="https://lore.kernel.org/linux-media/<arJjxjiWVlnHhioR@kekkonen.localdomain>/">原文</a>
      - label: "v4l2 buffer 追踪下沉到设备级"
        text: >-
          此前追 V4L2 buffer 只能靠 /sys/kernel/debug/dma_buf/bufinfo 这类子系统无关的全局视图，
          多驱动并发时无法归属。新系列新增 debugfs 树 /sys/kernel/debug/v4l2/&lt;dev&gt;/mem，
          配套用户态工具 v4l2top。Sashiko review 标了 3 个 High（生命周期 UAF）。
      - label: "镜头 VCM 的 runtime PM 要和 sensor 联动"
        text: >-
          VCM 是弹簧回位的，维持对焦要持续供电；一旦允许独立 runtime suspend，拍摄中途镜片会漂回原点。
          新增 V4L2_SUBDEV_FL_PM_LINK。维护者 Sakari 对实现形态仍有异议（flag vs 统一按 ancillary link 处理）。
          <a href="https://lore.kernel.org/linux-media/<20260922-sensors_pm-v1-1-05adf2098b5e@adishatz.org>/">原文</a>
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: toc
    items:
      - label: "panthor 27 帖：Mali v15 硬件虚拟化"
        text: >-
          v15 原生有 16 组「访问窗口」，GPU 硬件在窗口间分时切片；软件侧只负责仲裁与调度。
          代价是驱动必须处处「可被让出」。
          <a href="https://lore.kernel.org/dri-devel/<20260922204535.2850094-1-karunika.choo@arm.com>/">原文</a>
      - label: "给每个 drm_panel 内嵌 drm_bridge（19 帖）"
        text: >-
          面板与桥接层的结构重构，v3 阶段。
      - label: "drm/fabric 想用 netlink，网络维护者回了「别用」"
        text: >-
          GPU 互联拓扑做成 netlink 的提案，遭遇跨子系统设计边界的公开争论。
          <a href="https://lore.kernel.org/dri-devel/<20260925121015.08b8cc15@kernel.org>/">原文</a>
      - label: "drm/xe wedge 隔离 / nouveau HDMI 色彩链路"
        text: >-
          xe 把卡死设备从硬件访问中统一拒绝；nouveau 补齐 HDMI 色深、YCbCr 与量化范围。
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: toc
    items:
      - label: "vxlan 配置全面 RCU 化"
        text: >-
          Eric Dumazet 的 8 帖，dump 走无锁路径——「读多写少的配置表就该 RCU」的又一次标准落地。
          <a href="https://lore.kernel.org/netdev/<20260922181102.3989489-1-edumazet@google.com>/">原文</a>
      - label: "Meta 自研网卡 mpnic 首次上游"
        text: >-
          数据中心自研 NIC 又一家进主线（AWS 有 EFA、Google 有 gve）。首版系列的价值在「定框架」。
          <a href="https://lore.kernel.org/netdev/<20260924-linux-mpnic-v2-0-4badc9b58b9e@gmail.com>/">原文</a>
      - label: "ipvs ICMPv6 越界写：一次修到 6 个 stable 分支"
        text: >-
          本周安全侧最该注意的修复。
          <a href="https://lore.kernel.org/netdev/<20260925141155.17603-1-axel.mierczuk@1password.com>/">原文</a>
      - label: "通用 PON 框架 RFC"
        text: >-
          GPON 无源光网络想进内核。
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: toc
    items:
      - label: "XFS 实时数据校验（21 帖）"
        text: >-
          RT 设备用于存大文件，此前没有校验和。Chrtistoph Hellwig 给 RT 数据加校验和，
          并与 zoned 垃圾回收协同。大文件存储第一次有端到端一致性保障。
          <a href="https://lore.kernel.org/linux-fsdevel/<20260924100032.2733101-1-hch@lst.de>/">原文</a>
      - label: "挂载命名空间堵引用计数环"
        text: >-
          UMOUNT_CONNECTED 场景下引用成环、谁也释放不了谁。引用计数成环是所有带生命期管理的子系统都会踩的坑。
          <a href="https://lore.kernel.org/linux-fsdevel/<20260925-work-mount-knullfs-v2-0-c4aebaa186e9@kernel.org>/">原文</a>
      - label: "MXFS：从 XFS 派生的集群文件系统"
        text: >-
          面向多节点共享同一块磁盘，复用 XFS 磁盘格式，在集群协调层做文章。
  - type: divider
    label: "📰 PCI / 总线"
    kind: section
  - type: toc
    items:
      - label: "PCIe 原生控制权简化到 v14"
        text: >-
          把 AER/热插拔/PME 的归属判定收敛。14 个版本说明这类「看着简单」的收敛，
          难在所有边角平台的行为都不能变。
          <a href="https://lore.kernel.org/linux-pci/<20260922204548.3884906-1-sathyanarayanan.kuppuswamy@linux.intel.com>/">原文</a>
      - label: "配置空间保存状态按偏移建索引（15 帖）"
        text: >-
          休眠/恢复路径的保存逻辑从「N 份重复代码」收敛成一份。
          <a href="https://lore.kernel.org/linux-pci/<20260924173501.856380-1-dmatlack@google.com>/">原文</a>
      - label: "pciehp：固件偷改 HPIE 导致热插拔中断被丢"
        text: >-
          改成单独跟踪驱动自己的设置。
          <a href="https://lore.kernel.org/linux-pci/<20260925114635.192878-1-qiyuzhu2@amd.com>/">原文</a>
      - label: "P2PDMA v7：按 TLP 类别判断直连"
        text: >-
          不放松隔离语义，只把判断粒度从「整条路径」降到「每个 TLP 类别」。
  - type: divider
    label: "📰 block 块设备"
    kind: section
  - type: toc
    items:
      - label: "dma-buf backed bio 进入核心维护者细审"
        text: >-
          昨天 io_uring dma-buf 系列的 block 层底座，Christoph Hellwig 开始逐帖评审。
          <a href="https://lore.kernel.org/linux-media/<20260922131610.GA30468@lst.de>/">原文</a>
      - label: "DRBD 9 想回主线"
        text: >-
          块设备级网络镜像，8.x 曾在主线后移出，DRBD 9 树外发展多年。7 帖先遣做准备工作。
          <a href="https://lore.kernel.org/linux-block/<20260923140608.1116713-1-christoph.boehmwalder@linbit.com>/">原文</a>
      - label: "blk-iocost 给 flush 和 zone append 记账"
        text: >-
          v4 阶段。
  - type: divider
    label: "📰 arch 架构 / 构建"
    kind: section
  - type: toc
    items:
      - label: "kbuild 22 帖：全量构建快 36%"
        text: >-
          空转构建从 15s 压到 1.4s，九种架构验证、System.map 逐字节一致。对天天编内核的人是今年获得感最直接的一个系列。
          <a href="https://lore.kernel.org/rust-for-linux/<20260923-build-speedup-v4-0-73128809a4a4@kernel.org>/">原文</a>
      - label: "小米 vmalloc 加速：RK3588 实测 vmap 快 8.3 倍"
        text: >-
          前置动作是把 cont-PTE 块映射从 HugeTLB 解耦——以前 CONFIG_HUGETLB_PAGE=n 的内核会静默失去这个优化。
          <a href="https://lore.kernel.org/linux-mm/<20260923062832.479455-1-jiangwen6@xiaomi.com>/">原文</a>
      - label: "kallsyms 查找提速约 7 倍"
        text: >-
          v4，4 帖，受益者是所有走 kallsyms 的调试与追踪路径。
      - label: "lib 停止 fork LZ4，改为 vendor 上游"
        text: >-
          机制级重构。
  - type: divider
    label: "📰 LSM 安全"
    kind: section
  - type: toc
    items:
      - label: "landlock 新增元数据访问权（12 帖）"
        text: >-
          LSM 钩子从「传 inode」改成「传 struct path」，让 landlock 能按路径区分「读元数据」与「读内容」，
          新增 READ_METADATA/WRITE_METADATA。Landlock ABI 11 → 12。评审中 Günther Noack 担心单独权限位
          会造成难诊断的失败（先 stat 后 open 的路径）。
          <a href="https://lore.kernel.org/linux-fsdevel/<araxO4ze0KZBz756@suesslenovo>/">原文</a>
      - label: "AppArmor 补 SCTP connect 权限检查"
        text: >-
          v2 带上回归测试；同日 ipe 修两处 UAF。
  - type: divider
    label: "📰 virtio / rt"
    kind: section
  - type: toc
    items:
      - label: "virtio-usb 双角色驱动（8 帖）"
        text: >-
          本周唯一「新设备类」级提案：一个 virtio 设备同时当 USB 主机控制器与设备控制器。
      - label: "virtio-blk 内联加密 v3"
        text: >-
          引入加密控制 virtqueue。此前 virtio-blk 派发 bio 时会丢弃 blk-crypto 元数据，导致内联加密引擎用不上。
      - label: "RT：migrate-disabled 任务推送竞态修复"
        text: >-
          sched/rt,dl 跳过 migrate-disabled 任务再选 push 候选（CVE-2026-98087）。
      - label: "RT：短 slice 任务延迟改善（8 帖）"
        text: >-
          Vincent Guittot，已进 tip/sched/core。
  - type: divider
    label: "📰 LWN 本周"
    kind: section
  - type: toc
    items:
      - label: "gccrs 编内核"
        text: >-
          <a href="https://lwn.net/Articles/1095553/">Compiling the kernel with gccrs</a>
      - label: "io_uring 线程身份切换"
        text: >-
          <a href="https://lwn.net/Articles/1094303/">Thread-identity switcheroo for io_uring</a>
      - label: "给 blk-iocost 加 BPF"
        text: >-
          <a href="https://lwn.net/Articles/1093661/">Adding BPF to blk-iocost</a>
      - label: "加速内核构建"
        text: >-
          对应本周 kbuild 系列。<a href="https://lwn.net/Articles/1093398/">Accelerating the kernel's build process</a>
      - label: "内存分层近期工作"
        text: >-
          <a href="https://lwn.net/Articles/1092001/">Recent work in memory tiering</a>
  - type: divider
    label: "🧭 合入状态"
    kind: section
  - type: toc
    items:
      - label: "Binder C 删除"
        text: >-
          linux-next ✅ 已进（next-20260921）· mainline ⬜ 未合入 · stable ⬜ 未回移植。
      - label: "Orphaned VM 46 帖 RFC"
        text: >-
          mainline ⬜ · next ⬜ · stable — 。仍是 RFC，评审周期会很长。
      - label: "panthor Mali v15 虚拟化"
        text: >-
          mainline ⬜ · next ⬜ · stable — 。27 帖体量，合入周期不会短。
      - label: "vmalloc 加速 v9"
        text: >-
          mainline ⬜ · next ⬜ · stable — 。已到 v9，ARM64 路径有实测背书。
      - label: "说明"
        text: >-
          本周重点补丁发布仅数日，review → 维护者树 → next → merge window 的链路尚未走完，
          <b>全部未合入属预期</b>。三镜像反查由本地 mainline / linux-next / linux-stable 全历史索引得出。
  - type: divider
    label: "📰 架构动向"
    kind: section
  - type: toc
    items:
      - label: "Rust 从「实验」变成「替换」"
        text: >-
          本周之前，Rust for Linux 的叙事是「新驱动用 Rust 写」；Binder 这一刀之后，
          变成「老 C 子系统可以被 Rust 替掉」。这两件事的舆论含义完全不同。
      - label: "内核原地升级的边界正被逐层界定"
        text: >-
          PCI 与 IOMMU 已接住，VFIO 未接住，用户态状态完全没有方案——
          LPC 专门开一场谈「版本与兼容」，说明真正的难点已经被识别出来了。
      - label: "页表子系统的隐性约定在显性化"
        text: >-
          页表释放 RCU 化删配置项、hw_pte_t 给 PTE 立类型边界、消灭 VM_SPECIAL——
          同一周内三条线都在把「以前靠约定」的东西写进类型与语义。
      - label: "AI 辅助写内核进入公开试水"
        text: >-
          LUO tmpfs 保留的 RFC 作者主动披露「主要由 LLM 生成」，自己把 1600 行砍到 977 行并通读全部代码。
          另外 v4l2-ioctl 修复的 v2 按文档规范把 Assisted-by 改成 Assisted-by: LLM。
  - type: divider
    label: "🎯 与你方向的交叉点"
    kind: section
  - type: toc
    items:
      - label: "GMSL2/3 串行器系列 v16"
        text: >-
          v16 技术内容已收敛，卡在 CI 工具链。这个系列一旦合入就是上游第一个完整的 GMSL2/3 参考实现——
          评审节奏与 CI 治理方式都值得跟。
      - label: "OV2312 把格式表铺到 DS90UB960"
        text: >-
          4×4 RGBIr 的 8 个格式定义在 media bus 层，SerDes 和 CSI-RX 一起走，
          不用每颗芯片各造一套私有格式。你评估车载链路时这是现成参照。
      - label: "VCM runtime PM 联动"
        text: >-
          相机链路最典型的一类坑——拓扑连了、电源没连。以后接新 VCM/闪光灯驱动时，
          先查对方有没有挂 V4L2_SUBDEV_FL_PM_LINK。
      - label: "v4l2 buffer 追踪下沉到设备级"
        text: >-
          多路 camera 并发时「这个 buffer 是谁分配的」终于能答。调漏 buffer / 内存泄漏时直接受益。
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "Live Update（内核原地更新）"
        text: >-
          不重启、不重新枚举设备就把内核换掉。要跨内核接过去的三样：设备（PCI 配置空间/总线号/ACS）、
          DMA 映射（IOMMU 页表与 ATS）、设备文件（VFIO fd 与驱动状态）。
      - label: "access window（访问窗口）"
        text: >-
          Mali v15 GPU 的硬件虚拟化单元：16 组独立的任务提交寄存器组，GPU 在各窗口间分时执行。
      - label: "cont-PTE（连续页表项）"
        text: >-
          ARM64 特性：16 个物理连续且对齐的 4K 页用一条带连续标记的页表项表示，TLB 占用降为 1/16。
      - label: "no-op build（空转构建）"
        text: >-
          什么都没改再跑一次 make。检验构建系统依赖追踪是否精准的照妖镜，本周从 15s 压到 1.4s。
      - label: "shared granule（共享粒度）"
        text: >-
          机密计算里 host 与 guest 共享内存的最小单位：一个 granule 要么整块共享、要么不共享，
          切换时要清零。它比 guest 的页大（如 64K vs 4K）。
      - label: "RGBIr（4×4 阵列）"
        text: >-
          比 2×2 Bayer 多一个 Ir 像素的传感器阵列，可见光与红外同时采集。
          2×2 的像素格式编号方式描述不了它，这是 8 个新格式的来源。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）+ LWN + 本地三镜像 · 北京时间"
---
