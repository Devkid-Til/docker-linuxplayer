---
title: "内核原地升级：PCI 部分收敛、目标 Linux 7.4；一颗 4×4 的 RGB-IR 传感器，逼出 8 个新格式"
date: "2026-09-26"
desc: "Live Update 周报：PCI v9 已收敛待合、目标 7.4；OV2312 RGB-IR 新增 8 个 10-bit 格式并穿透 GMSL2 去串行器；LZ4 改 vendor 上游；kallsyms 查找提速约 7 倍。"
column: "daily"
tags: ["media", "DRM", "mm", "PCI", "net", "fs", "Rust", "LSM"]
blocks:
  - type: hook
    text: >-
      今天两条主线：一条是<strong>内核原地升级</strong>——不重启、不重新枚举设备就把内核换掉，
      PCI 那部分 v9 已收敛，目标是 Linux 7.4；另一条是<strong>一颗 4×4 的 RGB-IR 传感器</strong>，
      为了它，media 一次新增 8 个 10-bit 格式，还得一路穿透到 GMSL2 去串行器和两路 CSI-2 RX。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-26/cover.png"
    alt: "封面 · 9月26日 · 内核原地升级"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "Live Update 周报：PCI v9 已收敛待合、IOMMU v5 已发、VFIO 还差设备状态"
      - label: "头条"
        text: "OV2312 RGB-IR RFC：8 个新格式 + 双虚拟通道 + 每路独立的曝光与增益"
      - label: "media"
        text: "Rockchip JPEG 解码器 v5（带 RK3588/RK356x 节点）；venus/amphion 拆卸竞态同日重发；栈垃圾让 V4L2 控制协商失败"
      - label: "DRM"
        text: "drm/fabric 想把 GPU 互联拓扑做成 netlink，网络维护者回了「别用」；Panfrost 大修到 v11"
      - label: "mm"
        text: "用户态页表释放全面 RCU 化 v5（12 帖、跨架构）；Virtualized Swap 走向之辩 21 帖"
      - label: "PCI"
        text: "pciehp：固件偷改 HPIE 导致热插拔中断被丢，改成单独跟踪驱动自己的设置"
      - label: "net"
        text: "Meta 的 mpnic 新网卡驱动 v2；ipvs 的 ICMPv6 越界写，一次修到 6 个 stable 分支"
      - label: "fs"
        text: "VFS 元数据钩子改走 struct path，为 landlock 的新权限铺路"
      - label: "Rust"
        text: "有人问网络子系统的 Rust 抽象在哪——答案是：还没有"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-26/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-26 06:47 北京，近 24h 各板块真实计数：net 552 · DRM 260 · mm 191 · fs 133 ·
      media 132 · PCI 81 · arch 55 · Rust 50 · block 40 · LSM 29 · rt 11 · virtio 3。
      net 依然是量最大的一头，但今天的主角不在数量上——DRM 的 260 里有一场关于「能不能用 netlink」的
      跨子系统争论，mm 的 191 里有一条跨十几个架构的页表释放 RCU 化，media 的 132 里藏着一个
      会顺带改掉 GMSL2 去串行器格式表的传感器系列。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "不重启也能换内核：PCI 那部分收敛了，目标是 Linux 7.4"
    meta: "〔09-25 22:30 北京〕· [Hypervisor Live Update] Notes from September 21, 2026（Pasha Tatashin）"
    points:
      - label: 现状
        text: >-
          Live Update（内核原地更新）要回答的问题是：机器上跑着业务、插着设备，能不能把内核换掉，
          而不是走 kexec 重启一遍、重新枚举 PCI。做这件事的前提是三样东西要能被新内核原样接过去——
          <b>设备</b>（PCI 配置空间、总线号、ACS 控制）、<b>DMA 映射</b>（IOMMU 的页表与 ATS 状态）、
          <b>设备文件</b>（VFIO 交出去的 fd 与驱动内部状态）。
      - label: 痛点
        text: >-
          这三层分属 PCI、IOMMU、VFIO 三个子系统、三拨维护者。任何一层接不住，端到端就断——
          客户机的 DMA 会停，直通设备会掉，用户看到的「不重启」就成了假象。
      - label: 方案
        text: >-
          这份 9/21 的 Live Update 会议记录（09-25 22:30 北京发出）把三条线的进度摊开了：
          PCI 侧 David Matlack 已发 v9，回答了 Bjorn 对 v8 的全部意见，主要设计问题收敛；v9 里第 6、9 帖
          因简化需要重新收集 Reviewed-by，第 8 帖是新增的——保存/恢复 PCIe 的 ACS 控制。IOMMU 侧
          Samiullah Khawaja 发了 v5，Phase 2（设备找回）在 GitHub 上重做了实现；LUO（Live Update
          Orchestrator）文档已由 Mike Rapoport 合入 liveupdate 树。同一天 linux-arch 上还有 Jacob Pan 的
          RFC：给 iommufd 加 hypervisor external attach，让 MSHV/Xen 这类「hypervisor 自己管 IOMMU」的
          模型也能接进 IOMMUFD/VFIO。
      - label: 为什么
        text: >-
          VFIO 那条线还差一截：目前只保住了设备文件描述符，不足以跳过 shutdown/freeze 时的设备复位，
          所以还演示不了「跨 kexec 的连续 DMA」——要等 Vipin Sharma 十月回来处理。IOMMU 侧 ATS 状态
          在新旧内核间的同步也被推迟成后续系列，为的是别让 v5 的范围失控。
      - label: 效益
        text: >-
          对云和主机侧，内核安全更新的窗口可以从「安排重启」变成「直接换」；对写驱动的人，
          「设备跨内核存活」从不可能变成了有明确接口契约的事。
      - label: 下一步
        text: >-
          计划是 1–2 周内进 liveupdate/next，理想情况赶在 7.3-rc6 之前、落在 Linux 7.4。
          LPC 那边的议题也换了：原本给 PCIe 的微会议时段改谈 tmpfs 文件保留，另开一场专门谈
          「版本与兼容」——说明「换内核时用户态状态怎么办」才是真正没解决的那部分。
    verdict: >-
      设计问题确实收敛了，但「接得住」目前只覆盖 PCI 和 IOMMU 两层，VFIO 这层还没有演示过；
      7.4 能不能赶上，取决于接下来两周 review 的速度。
    link: "https://lore.kernel.org/linux-mm/<20260925143000.2729890-1-pasha.tatashin@soleen.com>/"
  - type: headline
    title: "一颗 4×4 的 RGB-IR 传感器，逼出 8 个新格式，还得穿透到 GMSL2 去串行器"
    meta: "〔09-25 21:31 北京〕· [RFC PATCH 0/8] Add OmniVision OV2312 RGB-IR sensor driver（r-donadkar@ti.com）"
    points:
      - label: 现状
        text: >-
          现在的主流做法是 2×2 Bayer——每个像素一个颜色分量，media bus 与 V4L2 的像素格式也按 2×2 的
          相位来编号；一颗传感器出一路流，曝光、增益这类控制是「每个 subdev 一个值」。
      - label: 痛点
        text: >-
          OV2312 是 4×4 的 RGBIr 阵列（比 Bayer 多一个 Ir 像素），2×2 的格式表描述不了它。
          更麻烦的是它交替切换曝光与 IR 闪光，同时输出两路流——VC0 是 IR 为主、VC1 是 RGB 为主——
          两路各自需要独立的曝光和增益，可 V4L2_CID_EXPOSURE / AGAIN / DGAIN 都是单值控制，
          表达不了「一个 I2C 设备、两路流、两套参数」。
      - label: 方案
        text: >-
          这个 8 帖的 RFC 一次补上 8 个 10-bit RGBIr 的 media-bus 与 V4L2 像素格式（对应 4×4 图案的每个
          有效相位），并沿着采集链路铺开：DS90UB960 去串行器（GMSL/FPD-Link 这类车载 SerDes 的接收端）、
          Cadence CSI-2 RX、TI J721E CSI-2 RX。控制侧用 Mirela Rabulea 提出的 *_MULTI 系列——U32 数组，
          一个元素对应一路 capture type：索引 0 给 RGB、索引 1 给 IR，值为 0 表示「这一路不改」。
      - label: 为什么
        text: >-
          两路虚拟通道由交替的寄存器组驱动，一旦管线接错（RGB 帧落到 IR 通道上），光看像素数据不一定
          看得出来。所以驱动还给出 embedded line——它编码了每帧的 strobe 与曝光寄存器值，用户态据此
          校验「收到的帧是不是这一路该有的类型」。这个取舍很实在：与其让人猜，不如把传感器状态随帧送上来。
      - label: 效益
        text: >-
          对车载与机器视觉里「可见光和红外要同时要」的场景（驾驶员监控、夜视融合），终于有一套能表达
          4×4 RGBIr 加双流独立控制的上游接口；而且格式定义在 media bus 层，SerDes 和 CSI-RX 一起走，
          不用每颗芯片各造一套私有格式。作者在 AM62A7-SK EVM 配 LI-OV2312-FPDLinkIII-110H 模组、
          经 V3Link FPDLink-III 子卡、用 GStreamer 测过；两路各 1600×1301@30fps
          （1600×1300 图像 + 1 行 embedded data）。
      - label: 下一步
        text: >-
          还是 RFC：格式怎么命名、8 个相位如何建模、控制数组的语义，都是最容易被维护者挑的地方——
          对做 camera 和 SerDes 的人来说，这正是能进去说话的窗口。
    verdict: >-
      新像素格式、新控制语义、跨多个驱动铺开，三件事一起做，周期不会短；但它给了一条把 RGB-IR
      这类传感器纳入上游的标准路径。
    link: "https://lore.kernel.org/linux-media/<20260925133001.2780868-1-r-donadkar@ti.com>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "Rockchip JPEG 硬解到 v5：全是真机跑出来的坑"
    meta: "〔09-25 19:45 北京〕· [PATCH v5 0/4] media: rockchip: Add JPEG decoder driver（Sascha Hauer）"
    points:
      - label: 定位
        text: >-
          V4L2 驱动层，Rockchip 平台的 JPEG 硬件解码。这个驱动最初是塞在 Hantro 驱动里发的，
          作者认为抽象选错了，于是拆成独立驱动，从 v1 重来。
      - label: 做法
        text: >-
          v5 全是鲁棒性修补：设备要活到「绑定和最后一个文件句柄都消失」为止（devres 会在文件还开着时
          就释放它）；remove() 里让在跑的任务收尾、不再接新活（否则 close() 会一直等）；任务出错后复位
          block；找 EOI 时跳过任意长度的尾部填充（63 字节填充就能把标记藏起来）并只在熵编码数据里搜；
          没有 DHT 时回落到标准 Huffman 表。
      - label: 效益
        text: >-
          对 RK3588/RK356x 上的 JPEG 硬解来说，这些坑都是「不修就真的会挂」的那一类；系列同时带
          rk356x 与 rk3588 的 DTS 节点。
    relevance: "你在 RK3588 上折腾过 camera 这条线，这个驱动值得盯——它和 V4L2 采集路径是同一套架构。"
    link: "https://lore.kernel.org/linux-media/<20260925-rockchip-jpegdec-v5-2-30658833cb68@pengutronix.de>/"
  - type: highlight
    title: "venus 与 amphion：两条 VPU 驱动的「拆卸顺序」竞态同日重发"
    meta: "〔09-26 03:16 北京〕· [PATCH v3 0/2] media: venus: fix HFI teardown races / [PATCH v4 0/2] media: amphion: fix VPU core lifetime during teardown"
    points:
      - label: 定位
        text: >-
          两条 V4L2 视频编解码驱动（Qualcomm venus、Amphion VPU），问题同一类：卸载或拆卸时，
          IRQ、work 与 core 状态的释放顺序不对。
      - label: 做法
        text: >-
          venus v3：释放 HFI 设备前先关 IRQ，HFI teardown 前先停掉 recovery work。
          amphion v4：释放 core 状态前先排空 message work，并在还有 video instance 打开时阻止 unbind。
      - label: 效益
        text: >-
          用户态还开着设备时就 rmmod/unbind，不再能打出 use-after-free。这类「拆卸顺序」补丁
          范围小、判据清楚，是典型的新人可以进去参与的区。
    relevance: "和 RK3588 的 VPU 驱动是同一类问题：设备生命周期与 work/IRQ 的顺序，值得当作范式看。"
    link: "https://lore.kernel.org/linux-media/<20260925191653.3144006-1-mhun512@gmail.com>/"
  - type: highlight
    title: "栈上的垃圾数据，让正在 review 的 virtio-media 驱动协商不了"
    meta: "〔09-25 16:02 北京〕· [PATCH v2] media: v4l2-ioctl: zero the ext control built for VIDIOC_{G,S}_CTRL（Nick Rogers）"
    points:
      - label: 定位
        text: >-
          V4L2 核心 ioctl 层：VIDIOC_G_CTRL / S_CTRL 的兼容路径会在栈上拼一个 v4l2_ext_control 结构。
      - label: 做法
        text: >-
          这个结构只填了少数字段，size 和两个结构的其余部分是栈垃圾。转发控制、而不是走控制框架的驱动
          会读到它——正被 review 的 virtio-media v9 把非零 size 当作「要从用户态拷 payload」，于是
          VIDIOC_{G,S}_CTRL 只要栈是脏的就返回 -EINVAL，GStreamer 的 V4L2 编码器设 profile 时直接谈不下来。
          v2 把两个结构清零；同一作者另有一帖给 virtio-media 驱动自己兜底，好让它在没带上核心修复的内核上也能跑。
      - label: 效益
        text: >-
          影响面是「所有转发控制的驱动」，而症状（-EINVAL）离根因（栈垃圾）很远，属于难查的一类。
          顺带一提，两帖都带 Assisted-by: LLM 标签——这也是今天 DRM 那场争论的另一面。
    relevance: "你写 V4L2 驱动时会碰到「控制是核心填好传下来」这条路径，这个坑可以直接记下来。"
    link: "https://lore.kernel.org/linux-media/<20260925080206.45261-1-nick@getfieldwork.ai>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "drm/fabric 想把 GPU 互联拓扑做成 netlink，网络维护者回了「别用」"
    meta: "〔09-26 03:10 北京〕· Re: [RFC PATCH 0/12] drm/fabric: vendor-neutral topology infrastructure for scale-up accelerator interconnects"
    points:
      - label: 定位
        text: >-
          新子系统提案层。drm/fabric 是个 12 帖、约 1.3 万行新增的 RFC，想给「scale-up 加速器互联」
          （多卡/多 GPU 之间的拓扑，比如 AMD 的 UALoE 那类）建一套厂商中立的拓扑基础设施，
          并打算走 Generic Netlink——复刻 drm-ras 的经验。
      - label: 做法
        text: >-
          网络维护者 Jakub Kicinski 明确反对，原话大意是：网络侧正被 AI 生成的补丁淹没，没有余力帮别的
          子系统，请不要再用 netlink。随后有硬件厂商的人提议「复用网络子系统的以太网代码」，
          Jakub 的回复是：不要在没有网络维护者 ack 的情况下「复用」网络子系统的代码。
          Intel 的 Rodrigo Vivi 则提出愿意像 drm-ras 那样，把这个 netlink 的维护一起接过去。
      - label: 效益
        text: >-
          这条线的看点不在代码，在<b>跨子系统边界</b>：一个想复用 netlink 的 DRM 提案，撞上了网络维护者
          被补丁量压垮的现实。对社区来说，这是「AI 生成补丁洪水」开始改变子系统之间协作方式的又一个信号。
    relevance: "离你的方向不近，但它决定了「能不能借别的子系统的成熟设施」这件事，往后大概会越来越难。"
    link: "https://lore.kernel.org/dri-devel/<20260925121015.08b8cc15@kernel.org>/"
  - type: highlight
    title: "Panfrost 到 v11：把 perfcnt、运行时电源管理和复位一起收拾"
    meta: "〔09-26 02:45 北京〕· [PATCH v11 00/15] Collection of fixes for Panfrost: Perfcnt, RPM, refactorings"
    points:
      - label: 定位
        text: >-
          drm/panfrost（ARM Mali Midgard/Bifrost 的开源驱动）——性能计数器采样、runtime PM 引用计数、
          GPU 复位这三件事互相踩。
      - label: 做法
        text: >-
          15 帖：把设备初始化、debugfs、shrinker、lock/modparam 初始化各自下移到对应子系统；
          修 probe/remove 的 PM 引用计数与 autosuspend；引入一把 reset lock，让 perfcnt 与复位序列不再打架；
          在全一致（fully coherent）系统上跳过 perfcnt 之后的 cache flush；加一个 debugfs 里手动触发 GPU
          复位的开关。
      - label: 效益
        text: >-
          同一批修复迭代到第十一版，每一步都在缩范围、加解释——这是驱动长期维护最真实的样子。
    relevance: "Panfrost 和你在看的 Mali 驱动是同一族；reset lock 这种「用一把锁把两条异步路径分开」的写法经常复用。"
    link: "https://lore.kernel.org/dri-devel/<20260925-claude-fixes-v11-0-0dbf5a58e7ce@collabora.com>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "用户态页表释放，全面 RCU 化（v5，12 帖、跨十几个架构）"
    meta: "〔09-26 04:10 北京〕· [PATCH v5 00/12] mm: make userland page table freeing RCU-safe"
    points:
      - label: 定位
        text: >-
          mm/mmu_gather 层——释放用户态页表时，页表页什么时候才能真正还给 buddy。
      - label: 做法
        text: >-
          内核里多数架构已经把页表释放推迟到 RCU 宽限期之后；这个 v5 把剩下的架构全部转过来
          （riscv、arm、sparc、m68k、sh、arc、microblaze、xtensa 等），并<b>彻底删掉
          CONFIG_MMU_GATHER_RCU_TABLE_FREE</b>；另外补上「collapse 时先把新分配的页表页存起来」这一步。
      - label: 效益
        text: >-
          只有所有架构都 RCU 化，「只靠 RCU 就能无锁走页表」这个前提才成立。前提成立之后，
          页表遍历才能摆脱锁竞争和锁序问题——换来的是少一个 config、少一批架构特例代码。
    relevance: "页表遍历的无锁化是很多上层机制（比如 fast GUP、khugepaged）的地基，值得记住这条线的方向。"
    link: "https://lore.kernel.org/linux-mm/<20260925-rcu-pagetable-freeing-v5-0-31e91065fea4@kernel.org>/"
  - type: highlight
    title: "Virtualized Swap 往哪走：内核直接管，还是用户态用 PSI 就够"
    meta: "〔09-26 05:53 北京〕· Re: Path forward for Virtualized Swap?（21 帖讨论）"
    points:
      - label: 定位
        text: >-
          swap/zswap 与 cgroup 记账的边界——虚拟交换设备（把 swap 后端放到内存分层、远端等地方）
          该怎么记内存账。
      - label: 做法
        text: >-
          争论焦点有两个：zswap 该不该扣一个物理 slot；以及这件事该由内核直接管，还是用户态拿
          PSI + 主动回收就够了。一派（Gregory Price）认为 PSI 数据非常有效，用户态主动回收已经够用；
          另一派（Johannes Weiner）则提醒：按历史定义，不扣物理 slot 就不该继续扣那个计数，
          而且内核通常不为「用户态能轻松做到的事」加便利设施——cgroup 的职责是隔离，不是替应用做策略。
      - label: 效益
        text: >-
          没有结论。这正是 mm 里「策略放内核还是放用户态」的老问题，在内存分层和 CXL 这类新硬件上重演一遍。
    relevance: "如果你以后要碰 zswap/swap 后端这类代码，这场讨论决定了它的接口边界会画在哪。"
    link: "https://lore.kernel.org/linux-mm/<arbtVBEKm5IJTH2j@cmpxchg.org>/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "固件偷偷改了 HPIE，热插拔中断就这样被丢了"
    meta: "〔09-25 19:46 北京〕· [PATCH v2] PCI: pciehp: Avoid dropping hotplug interrupts due to stale HPIE（Zhu Qiyu）"
    points:
      - label: 定位
        text: >-
          PCI 热插拔控制器驱动与 Slot Control 寄存器。pciehp_isr() 用 ctrl->slot_ctrl 里的
          HPIE（Hot-Plug Interrupt Enable）位来判断「热插拔中断是不是被关掉了」——这个检查是必要的，
          因为热插拔可能和别的源（包括原生 PME）共享中断。
      - label: 做法
        text: >-
          问题在于 slot_ctrl 会在每次 Slot Control 读-改-写时从硬件刷新。固件临时清一下 HPIE，
          驱动正好为了更新指示灯去读这个寄存器，就会把读到的 HPIE=0 写回缓存；固件随后恢复硬件位，
          但缓存里仍是 0——下一次热插拔中断进来，ISR 看到缓存的 HPIE=0，直接返回 IRQ_NONE，
          连 Slot Status 都不读，事件就一直挂着。ctrl_lock 挡不住，因为固件不拿这把锁。
          v2 改成<b>单独跟踪驱动自己的 HPIE 设置</b>，只在命令掩码包含 HPIE 时于 ctrl_lock 下更新它，
          ISR 只认这个值。
      - label: 效益
        text: >-
          共享中断平台上「热插拔偶发不响应」的一类难查问题；改动不增加配置空间访问，寄存器写入与
          运行时电源管理流程都不动。
    relevance: "PCIe 热插拔和共享中断的竞态是通用范式：缓存值 vs 硬件值的分歧，你在 camera/SerDes 的中断路径上也会遇到。"
    link: "https://lore.kernel.org/linux-pci/<20260925114635.192878-1-qiyuzhu2@amd.com>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "Meta 的新网卡驱动 mpnic：v2 只做最裸的 Tx/Rx"
    meta: "〔09-25 08:35 北京〕· [PATCH net-next v2 0/8] eth: mpnic: initial support for Meta Platforms NIC"
    points:
      - label: 定位
        text: >-
          网络驱动层。Meta 已有 fbnic，但这个平台的固件更精简，所以另开一个驱动。
      - label: 做法
        text: >-
          v2 只包含裸的 Tx/Rx 数据通路——寄存器初始化、Tx/Rx 队列分配与清理、netdevice 与基本收发；
          后续系列才做 offload、RSS 与计数器、firmware mailbox、ethtool。作者在 cover letter 里写明：
          这个系列「部分是借助 LLM prompts 准备的」（Jakub 把这些 prompt 公开了），人在输出上做了 review。
      - label: 效益
        text: >-
          又一个厂商把内部驱动裁剪成最小上游驱动。同时它也是「AI 辅助上游」被写进 cover letter 的样本——
          和今天 drm/fabric 那场争论，恰好是同一件事的两面。
    relevance: "网卡驱动的最小化上推路径（先裸数据通路、再 offload）是新驱动进上游的标准节奏，可以当模板看。"
    link: "https://lore.kernel.org/netdev/<20260924-linux-mpnic-v2-0-4badc9b58b9e@gmail.com>/"
  - type: highlight
    title: "ipvs 的 ICMPv6 越界写：一个补丁，修到 6 个 stable 分支"
    meta: "〔09-25 22:11 北京〕· [PATCH nf 0/2] ipvs: fix OOB write when NATing ICMPv6 errors quoting non-first fragments"
    points:
      - label: 定位
        text: >-
          netfilter/ipvs 做 NAT 时，要解析 ICMPv6 差错报文里引用的那个内嵌包。
      - label: 做法
        text: >-
          当解析停在非首个分片时，ciph.len 没有把内嵌的 IP 头算进去，于是越界写。第 1 帖在 ICMPv6 的
          两个调用点把内嵌 IP 头计入 ciph.len；第 2 帖改 ipv6_find_hdr()，让 target < 0 时 *offset 指向
          分片载荷。修复随后回移植到 5.10 / 5.15 / 6.1 / 6.6 / 6.12 / 6.18 各 stable 分支。
      - label: 效益
        text: >-
          安全修复 + 完整的回移植链，是「一个补丁看社区怎么走流程」的好样本。
    relevance: "内嵌报文的长度字段算漏了——这类「解析嵌套协议」的越界写是网络栈和 media 里都常见的一类 bug。"
    link: "https://lore.kernel.org/netdev/<20260925141155.17603-1-axel.mierczuk@1password.com>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "VFS 的元数据钩子改走 struct path，为 landlock 的新权限铺路"
    meta: "〔09-26 02:03 北京〕· [PATCH RFC -next 00/12] landlock: Add READ_METADATA and WRITE_METADATA access rights"
    points:
      - label: 定位
        text: >-
          VFS 与 LSM 的接口层。landlock 是按路径逐级评估权限的，可 inode_getattr / inode_setattr /
          xattr / ACL 这些元数据钩子只拿得到 dentry——路径信息在钩子这里就断了。
      - label: 做法
        text: >-
          这个 12 帖的 RFC 先把 notify_change()、inode_setsecctx、xattr、POSIX ACL 这几组 helper 与
          LSM 钩子的参数从 dentry 换成 struct path（纯重构，每帖都能单独编译通过），再加
          READ_METADATA / WRITE_METADATA 两个粗粒度权限——不做 chmod/chown 的细分。顺带删掉一处冗余的
          EVM xattr 长度检查（它只拿得到 dentry，过不了新签名）。
      - label: 效益
        text: >-
          对写 LSM 的人：路径语义第一次能贯穿到元数据操作，per-path 策略不再断在 inode 钩子上。
    relevance: "这是「先做无行为变更的重构、再加功能」的教科书式切法，改 VFS/LSM 接口时可以照抄这个分帖节奏。"
    link: "https://lore.kernel.org/linux-fsdevel/<araxO4ze0KZBz756@suesslenovo>/"
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "有人问「网络子系统的 Rust 抽象在哪」，答案是：还没有"
    meta: "〔09-26 01:31 北京〕· Searching for net subsystem rust abstractions"
    points:
      - label: 定位
        text: >-
          Rust for Linux 的子系统抽象层。目前 kernel crate 里有字符设备、dma-buf、时间、workqueue 等，
          但没有 net。
      - label: 做法
        text: >-
          提问者想用 Rust 写地址族协议——就是 sock_register() / struct proto_ops 这一层——发现 kernel
          crate 里没有对应抽象，于是按「提交新抽象」的指引来邮件列表问进度、要建议。他也明确说：
          自己的模块还没开源、仍在重开发，想知道是否已有现成 API，否则「我可能开始贡献」。
      - label: 效益
        text: >-
          一个明确的空缺信号：Rust 网络抽象还没人做，而缺口被公开认领了。对想参与 Rust for Linux
          的人来说，这是少见的、被点名指出的空白区。
    relevance: "Rust 子系统抽象目前最缺的几块之一就是 net；如果你哪天想找「影响力大、又没人占」的活，这是候选。"
    link: "https://lore.kernel.org/rust-for-linux/<CAGchGNvUS43DJGdFoUCUtvS+Gk64=n+GPdAyt+0=n6ejAUhFRA@mail.gmail.com>/"
  - type: highlight
    title: "dma-buf 的 Rust 层：忘了放 fence，现在能告诉你是在哪台设备上忘的"
    meta: "〔09-25 16:20 北京〕· [PATCH] rust: DmaFence: Add better warning through Device reference（Philipp Stanner）"
    points:
      - label: 定位
        text: >-
          rust/kernel/dma_buf/dma_fence.rs，Rust 侧的 dma-fence 包装。
      - label: 做法
        text: >-
          忘了释放 fence 说明驱动有严重设计问题，但原来的 pr_err!() 给不出有用信息。这帖让
          FenceContext 持有一个 Device 引用（用已有的生命周期来保护），把告警换成 dev_warn!()，
          从而能打印出设备信息。
      - label: 效益
        text: >-
          对写 Rust dma-buf/DRM 驱动的人：出错时能直接定位到设备，而不是收到一条无主告警。
    relevance: "dma-buf 是 camera 与 DRM 共用的 buffer 底座，它的 Rust 侧抽象正在一块块补齐。"
    link: "https://lore.kernel.org/linux-media/<20260925081958.3048112-2-phasta@kernel.org>/"
  - type: divider
    label: "📰 LSM"
    kind: section
  - type: highlight
    title: "AppArmor 补上 SCTP 的 connect 权限检查（v2 带上回归测试）"
    meta: "〔09-26 04:55 北京〕· [PATCH v2 0/2] apparmor: check connect permission for SCTP（Jérémy Jean）"
    points:
      - label: 定位
        text: >-
          AppArmor 的网络 mediation 层：unix socket 那条路有 ctx 更新处理，SCTP 的 connect 却没走权限检查。
      - label: 做法
        text: >-
          内核侧补 connect 权限检查（v1 起未变）；v2 的增量是在 AppArmor 用户态仓库加一条 SCTP 连接
          mediation 的回归测试。作者来自 ANSSI。
      - label: 效益
        text: >-
          策略漏检的口子被堵上，而且带测试——安全修复典型的「内核 + 用户态两头都要改」。
    relevance: "LSM 的「某条路径没挂钩子」是常见漏检模式，值得留意这类补丁的找法。"
    link: "https://lore.kernel.org/linux-security-module/<20260925205447.1244190-4-Jeremy.Jean@oss.cyber.gouv.fr>/"
  - type: more
    title: "更多动态 · 子系统与系列"
    items:
      - link: "https://lore.kernel.org/linux-media/<8eb8208b-c580-48e5-bbc8-22ecfdb66313@oss.qualcomm.com>/"
        text: "media · Qualcomm iris 视频编解码加 AR50LT core 支持、启用 Agatti 平台（v9，19 帖）"
        time: "09-25 17:22"
      - link: "https://lore.kernel.org/linux-media/<20260925-jorth-amd-2-v1-2-41deccc043f0@gmail.com>/"
        text: "media · v4l-utils：edid-decode 修正移位错误并补全 AMD VSDB"
        time: "09-25 21:47"
      - link: "https://lore.kernel.org/dri-devel/<20260925191318.541938-1-mcanal@igalia.com>/"
        text: "DRM · drm/vc4：运行时挂起期间屏蔽 V3D 中断"
        time: "09-26 03:13"
      - link: "https://lore.kernel.org/dri-devel/<761386ae-f1e5-4892-ac18-b450a803a433@oss.qualcomm.com>/"
        text: "DRM · drm/msm：Hawi 与 Maili GPU 支持（15 帖）在讨论"
        time: "09-26 03:59"
      - link: "https://lore.kernel.org/linux-mm/<aranZV13vzTHR8cL@gourry-fedora-PF4VCD3F>/"
        text: "mm · 热页跟踪与提升基础设施（v8）"
        time: "09-26 00:57"
      - link: "https://lore.kernel.org/dri-devel/<b007cd0f-29ef-457a-8e44-63ab26f3bcd0@kernel.org>/"
        text: "mm · VMA 标志语义显式化、消灭 VM_SPECIAL（v3，40 帖）"
        time: "09-25 15:32"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260925060109.GE3193@lst.de>/"
        text: "fs · XFS 实时（RT）设备数据校验 21 帖：iomap 加校验和、RTG csum 文件、新磁盘格式"
        time: "09-25 14:01"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260925071503.GA4737@lst.de>/"
        text: "fs · hfsplus 转向 iomap（v4，7 帖）"
        time: "09-25 15:15"
  - type: more
    title: "更多动态 · 修复与杂项"
    items:
      - link: "https://lore.kernel.org/dri-devel/<987240A7-9626-4520-8143-B283B431A2AC@collabora.com>/"
        text: "DRM · drm/tyr：给 Job IRQ 加处理（v6）"
        time: "09-26 03:30"
      - link: "https://lore.kernel.org/linux-mm/<f2cdc9352e4fa67d2ab4797b6b781e36e8b77129.camel@surriel.com>/"
        text: "mm · mm/vma：pgoff 未变时不再把 VMA 从 rmap 上摘掉"
        time: "09-26 03:00"
      - link: "https://lore.kernel.org/linux-pci/<7822cb02-f32b-4f02-ba65-4b90ebc42ce8@amd.com>/"
        text: "PCI · BUG 讨论：AMD Phoenix 的 USB4 运行时挂起，挡住 JHL9480 下游枚举"
        time: "09-25 23:24"
      - link: "https://lore.kernel.org/linux-pci/<20260925103254.EC98B1F000FF@smtp.kernel.org>/"
        text: "PCI · PCI: qcom-ep：pm_runtime_resume_and_get() 失败后清掉运行时 PM 错误"
        time: "09-25 18:32"
      - link: "https://lore.kernel.org/netdev/<20260925182435.21207-1-ansuelsmth@gmail.com>/"
        text: "net · net: dsa：Airoha AN8855 支持已经迭代到 v23"
        time: "09-26 02:24"
      - link: "https://lore.kernel.org/netdev/<20260925132204.03ce9495@kernel.org>/"
        text: "net · stmmac：更多自测（selftest）相关修复（v4，7 帖）"
        time: "09-26 04:22"
      - link: "https://lore.kernel.org/netdev/<20260925174404.2789072-1-joe@dama.to>/"
        text: "net · RFC：bnxt_en 让 RING FREE 更健壮（v4）"
        time: "09-26 01:44"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260925-stellen-brummen-festrede-266af0305ac7@brauner>/"
        text: "Rust · rust: file —— 在文件描述符 API 里处理 fd 表拆卸（v2）"
        time: "09-26 00:00"
  - type: divider
    label: "⚙️ 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "kallsyms 查找提速约 7 倍（v5，3 帖）"
        text: >-
          两个瓶颈：符号名要整份解压进 512 字节栈缓冲再 strcmp（94% 的二分探测在前 1–2 个字符就不匹配），
          以及从最近的 256 符号 marker 起顺序扫 ULEB128 头。改法：边比边解压、首个字符不符就退出
          （省约 530ns/次）；marker 密度从 256:1 提到 16:1；展开 24-bit 序列重建。受益的是批量符号查找
          （比如一次追踪 6.4 万个函数的 BPF multi-trampoline attach）。<a href="https://lore.kernel.org/lkml/<20260925-ksyms-tune-v5-0-1f75ad0c321c@gmail.com>/">原文</a>
      - label: "lib/lz4 不再 fork 上游（RFC 9 帖）"
        text: >-
          内核里的 LZ4 是 2017/2018 年手工同步的 fork，上游此后在 lib/ 上做了 488 个提交，差距靠一个个
          cherry-pick 维持；fork 的 LZ4_decompress_fast() 没有边界检查，损坏输入会在两个方向上跑出
          输出缓冲。改法是把上游源码原样 vendor 进来、构建期适配，重新同步变成「拷目录」。
          <a href="https://lore.kernel.org/linux-block/<20260925-lz4-vendor-upstream-v1-0-1c7ffbe21c4b@samsung.com>/">原文</a>
      - label: "iommufd 加 hypervisor external attach（RFC 9 帖）"
        text: >-
          IOMMUFD/VFIO 一直围绕 KVM/QEMU 模型演化（Linux 宿主自己管 IOMMU）。MSHV/Xen 不是这个模型：
          宿主拥有物理设备，但不拥有 IOMMU 硬件，stage-2 页表由 hypervisor 编程。这个 RFC 引入
          external attach domain 与 hypervisor vIOMMU 类型，让这类模型也能接进同一套 UAPI；
          同一思路也可用于 Xen。<a href="https://lore.kernel.org/linux-arch/<20260925190742.1575380-1-jacob.pan@linux.microsoft.com>/">原文</a>
      - label: "virtio-blk 加内联加密（v4，2 帖）"
        text: >-
          virtio-blk 增加一个控制 virtqueue，用来承载内联加密（inline encryption）的密钥与配置；
          这是低频列表 virtio-dev 上今天唯一的动向。<a href="https://lore.kernel.org/virtio-dev/<20260925140133.1214443-3-linlin.zhang@oss.qualcomm.com>/">原文</a>
      - label: "block：loop 把 queue limits 清理挪到 workqueue"
        text: >-
          loop 设备在清理 queue limits 时会和别的路径抢，改到 workqueue 里做。
          <a href="https://lore.kernel.org/linux-block/<bcf71ef1-427f-47ff-9880-c87ef0654259@acm.org>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "Live Update / LUO"
        text: >-
          不重启、不重新枚举设备就换内核，靠新旧内核之间移交 PCI、IOMMU、VFIO 三层状态；
          LUO（Live Update Orchestrator）负责编排这次移交。
      - label: "RGBIr / 4×4 Bayer"
        text: 在 2×2 Bayer 之外多一个 Ir 像素的滤色阵列；像素格式要按 4×4 图案的有效相位分别描述。
      - label: "media bus format"
        text: 传感器到 CSI-2 接收端之间「线上」的像素格式描述，与 V4L2 像素格式配对使用。
      - label: "VC（Virtual Channel）"
        text: >-
          MIPI CSI-2 在同一条链路上多路复用的通道号；OV2312 用 VC0/VC1 分别送 IR 为主与 RGB 为主的帧。
      - label: "HPIE"
        text: Slot Control 寄存器里的热插拔中断使能位；pciehp 靠它判断该不该在 ISR 里处理这次中断。
      - label: "MMU_GATHER_RCU_TABLE_FREE"
        text: >-
          让架构选择「页表释放是否推迟到 RCU 宽限期之后」的配置项；本系列要删掉它——因为所有架构都 RCU 化了。
      - label: "vendoring"
        text: 把上游源码原样引入仓库、构建期适配，而不是维护一个会持续走偏的 fork。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
