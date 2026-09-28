---
title: "光猫要进内核了：PON 框架 RFC 先谈边界；guest_memfd 准备换成可插拔内存后端"
date: "2026-09-27"
desc: "通用 PON 框架 RFC 先划内核/用户态边界；guest_memfd 引入资源池 fd 与 provider 回调；Apple AVD 驱动 v2 带来 P210 与 Interchange 格式；pghot 被建议先只做异步提升。"
column: "daily"
tags: ["net", "mm", "media", "DRM", "fs", "arch", "block", "Rust", "LSM"]
blocks:
  - type: hook
    text: >-
      今天两件事都属「<strong>先谈边界、再写代码</strong>」：一件是把 <strong>PON（无源光网络）拉进内核</strong>——
      光猫下面那层硬件概念跟以太网对不上，社区想先定清楚哪些才值得做成通用抽象；另一件是
      <strong>guest_memfd 准备换成可插拔的内存后端</strong>，以后客户机的内存可以由 tmpfs 这类 provider 来供。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-27/cover.png"
    alt: "封面 · 9月27日 · 内核要收编 PON 与 guest 内存"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "通用 PON 框架 RFC：只做「线路状态 + 承载资源」，其余全部复用现成子系统"
      - label: "头条"
        text: "guest_memfd 用资源池 fd 挑后端，provider 只需实现四个回调"
      - label: "media"
        text: "Apple AVD 驱动 v2：单寄存器编程 + Cortex-M3 跑固件，顺带补 P210 与 Interchange 像素格式"
      - label: "mm"
        text: "pghot 方向被公开质疑：有人绕过它直接提升，拿到比 NUMA Balancing 高 3 倍；建议先只做异步提升"
      - label: "net"
        text: "stmmac 15 帖重整 MTU 与 resume 失败路径；PSP 要求关联建立在已连接 socket 上；BPF 想给 skb_adjust_room 加 PPPoE 封装"
      - label: "fs"
        text: "一个由 LLM 生成的集群文件系统 RFC 撞上 XFS 维护者：请至少别用同样的 magic"
      - label: "DRM"
        text: "amdxdna 为 AIE4 一次发 21 帖，把 doorbell mmap 换成内核提交"
      - label: "arch"
        text: "POSIX 消息队列要加 mq_recvmmsg / mq_sendmmsg 两个新系统调用（v5）"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-27/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-27 08:50 北京，近 24h 各板块真实计数：net 251 · mm 130 · DRM 104 · fs 95 ·
      media 68 · Rust 38 · block 26 · arch 23 · LSM 14 · PCI 11 · rt 2 · virtio 0。
      net 仍然量最大，而今天它的分量也确实对得上——一封只问边界、不写代码的 PON 框架 RFC
      在半天里招来四封回复；mm 那边则是一份会议记录，把 pghot 这个方向摆上了台面重议。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "光猫要进内核：一份只问「边界在哪」的 PON 框架 RFC"
    meta: "〔09-27 01:46 北京〕· [RFC] net: towards a generic PON framework（Gaoyang Wei）"
    points:
      - label: 现状
        text: >-
          PON（Passive Optical Network，无源光网络）设备——也就是家里那台光猫，ONU/ONT 这一侧——
          在 Linux 上一般只暴露一条以太网数据通路。可它硬件下面那层跟普通以太网对不上：
          ONU 激活与线路状态、PLOAM 或 MPCP、ONU-ID 与 Alloc-ID、ITU-T PON 的 T-CONT 与 GEM port、
          EPON 的 LLID、加密与密钥状态、一条 OMCI/OAM 管理通道，还有一个突发模式的光前端。
          这些东西今天大多靠厂商 BSP 的私有 ioctl、私有 procfs/sysfs 属性、厂商库和用户态 daemon 露出来。
      - label: 痛点
        text: >-
          已经有好几个开源实现在做这件事——针对 Airoha AN7581/AN7583 的一套实现、
          EcoNet/Airoha 老硬件的 xPON MAC/PHY 与 OMCI 工作、以及 OpenWrt 上的相关 PR。
          问题是它们**彼此的架构选择并不一致**，而一旦某个实现把自己的用户态 API 固化下来，
          再想统一就得推倒重来。作者的原话是：希望在「任何一个实现把 API 做硬之前」先谈清楚边界。
      - label: 方案
        text: >-
          这份 RFC 只问边界、不写代码。作者希望通用 PON 层<strong>刻意做小</strong>，
          只覆盖 PON 特有的线路状态与承载资源，其余全部复用现成子系统。它还明确列了不做的事：
          不在内核实现 G.988 管理实体模型、不标准化 XGTC/FEC/突发时序/DBA、不要求不同 PON MAC
          用同样方式做激活、不做 OLT 侧，也不另造 bridge / VLAN / TC / ethtool / hwmon / thermal /
          PHY / SFP 的替代品。
      - label: 为什么
        text: >-
          现有一个实现给出的分工是：内核管 PON MAC、线路激活与 PLOAM、硬件 GEM/T-CONT 状态和数据通路；
          G.988 OMCI 与业务开通放用户态，OMCI 原始 PDU 通过一个<strong>不带合成以太网头</strong>的专用
          net_device、用 AF_PACKET 收发。作者说这个划分正是他要拿出来讨论的对象——因为各实现的
          选择并不相同，而「内核该管到哪一层」决定了后面所有驱动的形态。
      - label: 效益
        text: >-
          对 OpenWrt 和 PON 社区，这是一次「在实现固化前先对齐接口」的机会；对内核来说，
          则是一个可能新增的小子系统边界——如果 maintainer 认这个边界的话。
      - label: 下一步
        text: >-
          讨论正在进行：当天 19:28、20:21、21:56、22:16 各有一封回复，半天之内四封。
          真正的看点不是补丁，而是网络维护者愿不愿意接一个「只做线路状态 + 承载资源」的小层。
    verdict: >-
      这类 RFC 的全部价值都在讨论里，作者自己也说是「先问边界」。它成不成，取决于
      maintainer 认为 PON 的特殊性够不够撑起一个通用层，还是宁可让各家 BSP 继续各写各的。
    link: "https://lore.kernel.org/netdev/<20260926174601.1675-1-yhyxwgy@gmail.com>/"
  - type: headline
    title: "guest_memfd 要换后端了：给它一个资源池 fd，provider 只需实现四个回调"
    meta: "〔09-26 08:51 北京〕· [PATCH RFC 00/17] Allow guest_memfd to be created using a resource (pool) fd（Ackerley Tng）"
    points:
      - label: 现状
        text: >-
          guest_memfd 是 KVM 的「客户机优先」内存提供者，当初为机密计算（CoCo）VM 而建，目标是
          最终服务所有 VM。它今天只支持相当于<strong>匿名 PAGE_SIZE</strong> 的 memfd 内存——
          也就是最朴素的那一种。
      - label: 痛点
        text: >-
          现实是内核里几乎任何能被 mmap 的东西都能塞进 KVM 的 memslot：HugeTLBfs、tmpfs、DAX……
          guest_memfd 要追上这一长串。可如果为每一种后端各造一套接口、各写一遍 shared/private 的处理，
          复杂度会迅速失控。
      - label: 方案
        text: >-
          这个 17 帖的 RFC 换了个思路：把 guest_memfd 看成「<strong>共享/私有权限 + KVM 知识</strong>」
          的一层包装，包在某个 provider 分配出来的内存外面。用户态先拿到一个 resource_fd——
          fsmount() 或者直接 open 一个挂载目录都行——然后
          ioctl(KVM_CREATE_GUEST_MEMFD, GUEST_MEMFD_FLAG_USE_RESOURCE, resource_fd)，
          之后像以前一样用返回的 gmem_fd。provider 侧只需要实现四个回调：attach / release /
          alloc_folio / invalidate_folio，挂在 super_operations 上。系列里的第一个 provider 是 tmpfs
          （配套的 shmem provider operations 就在头几帖）。
      - label: 为什么
        text: >-
          用 fd 而不是新造一个 UAPI 类型，是因为 fd 天然带着「谁提供、什么权限」的信息；
          而对 provider 的要求也压到了最低——只要懂分配和失效，不需要理解 KVM 的 shared/private 语义。
          分帖顺序也说明了作者的意图：先把 tmpfs 这唯一一个 provider 跑通，再谈别的。
      - label: 效益
        text: >-
          客户机内存第一次可以来自可插拔的后端。虽然出发点仍是 CoCo，但这条路对一般 VM 同样成立——
          guest_memfd 本来就想服务所有 VM。
      - label: 下一步
        text: >-
          作者明确说要拿到 LPC 2026 的 KVM 微会议（MC）上讨论这个接口。17 帖里相当一部分是
          KVM selftest，说明他是带着能跑的东西来谈设计的。
    verdict: >-
      「用一个 fd 描述内存该怎么来」这个抽象比它看起来更有野心：它把 guest 内存的<b>来源</b>
      和 KVM 的<b>语义</b>解耦了，剩下的事就交给 provider 去实现。能不能成，看 LPC 上
      KVM 维护者对这层 fd 的接受度。
    link: "https://lore.kernel.org/linux-mm/<20260925-gmem-tmpfs-backend-v1-0-d36159822d18@google.com>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "Apple 视频解码器 AVD 到 v2：单寄存器编程，靠一颗 Cortex-M3 跑固件"
    meta: "〔09-26 21:16 北京〕· [PATCH v2 00/17] media: apple: add avd driver（Sofus Forstreuter）"
    points:
      - label: 定位
        text: >-
          V4L2 M2M 无状态解码器驱动层。AVD 是 Apple Silicon 上的视频解码 IP，而它的编程模型
          和常规驱动是反的。
      - label: 做法
        text: >-
          常规驱动是「一个参数一个寄存器」，AVD 却是<strong>全部通过单一寄存器</strong>写入——
          于是写入顺序有讲究，而且不能写得比硬件处理得快。作者的办法是用片上那颗 Cortex-M3：
          驱动把指令编成段交给 CM3，CM3 接受未签名代码（固件就是这么来的），由它去编程硬件，
          完成或出错时再通知 AP。框架大量借鉴 rkvdec。系列顺带给 V4L2 补了 P210 与
          Apple Interchange 两个像素格式——后者是 Apple 私有的压缩加平铺格式，用来和 GPU、
          显示控制器共享 buffer——并给 v4l2-ctrls 加上了 AV1 / VP9 的参数校验。
      - label: 效益
        text: >-
          v4l2-compliance 49/49 全过、零 warning；作者给出 fluster 分数（H.264 / VP9 / HEVC / AV1），
          各编解码器支持 4:2:2、4:2:0 与 10bit / 8bit。
    relevance: "cover letter 里明说框架「very heavy on rkvdec」——和你熟的 RK3588 VPU 那条线同源。它怎么把「单寄存器编程 + 协处理器」塞进 V4L2 的队列模型，值得对着读。"
    link: "https://lore.kernel.org/linux-media/<20260926-avd-v2-0-ecebe6a3648e@icloud.com>/"
  - type: highlight
    title: "Qualcomm iris 把 iommus 挪进子节点，顺手给 OF/IOMMU 加了 iommu-ranges"
    meta: "〔09-26 14:34 北京〕· [PATCH v5 00/13] media: iris: Migrate iommus to iris sub nodes"
    points:
      - label: 定位
        text: >-
          Qualcomm iris 的 VPU 驱动，以及它下面的 OF / IOMMU 核心层。iris 的像素 buffer 和
          固件（非像素）buffer 需要落到<strong>不同的 IOMMU context bank</strong>。
      - label: 做法
        text: >-
          把 iommus 属性从 core 设备下移到 iris 的 sub node，一类 context bank 一个；
          同时在 of_iommu 里新增 "iommu-ranges" 支持，让设备节点能声明自己的 IOVA 范围。
          驱动侧按 buffer 类型路由到对应的 context bank 设备，并在 core device 没有 IOMMU 时
          跳过 DMA mask 设置。
      - label: 效益
        text: >-
          一个 VPU 驱动的需求反过来给 OF/IOMMU 加了通用设施——「驱动推着核心走」的典型样本；
          DTS 一次铺到 sm8550 / sm8650 / sm8750 / lemans / monaco / hamoa。
    relevance: "RK3588 的 VPU/JPEG 硬解走的是同一类「内核侧 IOMMU + 多路 buffer」结构，这个 iommu-ranges 提法以后可能被别的 SoC 借走。"
    link: "https://lore.kernel.org/linux-media/<20260926-vpu_iommu_iova_handling-v5-0-0322ca5dc10c@oss.qualcomm.com>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "pghot 被建议回炉：先只做异步提升，别一次背那么多"
    meta: "〔09-27 05:43 北京〕· [Linux Memory Hotness and Promotion] Notes from September 24, 2026（David Rientjes）"
    points:
      - label: 定位
        text: >-
          mm 的内存分层与热页提升方向——pghot（page hotness）该怎么和 CHMU（硬件内存使用监控）
          衔接，以及它到底该由谁来驱动。
      - label: 做法
        text: >-
          这份会议记录显示方向被公开质疑。Davidlohr 指出上游讨论一直聚焦「不要引入回归」，
          但也没看到明显收益；他试着把 CHMU 接进 pghot，觉得体验复杂，最后<strong>绕过了大部分
          pghot</strong>——改成在设备中断到来时尽量拼出连续的 HPA 区间喂给它，然后直接提升、
          不做衰减，拿到了比 NUMA Balancing 高 3 倍的提升。他建议回到画板，重看 pghot 的复杂度
          与接口。
      - label: 效益
        text: >-
          会议倾向的结论是「先只做异步提升」：把 kpromoted 从 pghot 其余部分拆出来，
          拿到各方对齐之后再往上加；DAMON 也被提为可能的落点。有人担心这样会丢掉 locality 信息。
          下一次会议排在 LPC 2026 之后（10 月 22 日）。
    relevance: "又一场「复杂度该不该先收敛、策略放内核还是放用户态」的老争论——和前几天 Virtualized Swap 那场同源。"
    link: "https://lore.kernel.org/linux-mm/<0c8a7227-c7eb-bef1-7326-c7b04cde78a8@google.com>/"
  - type: highlight
    title: "MAP_PRIVATE 的 /dev/zero 要变成「真匿名」了"
    meta: "〔09-26 18:41 北京〕· [PATCH v3 0/6] mm: make MAP_PRIVATE-/dev/zero mappings truly anonymous（Lorenzo Stoakes）"
    points:
      - label: 定位
        text: >-
          mm/vma 的匿名页判定与 VMA 合并。MAP_PRIVATE 映射 /dev/zero 拿到的 VMA，
          长期处在「看着像匿名、其实是 file-backed」的灰色地带。
      - label: 做法
        text: >-
          先把 memory 字符驱动从 drivers/char 挪进 mm/（它实现 /dev/zero、/dev/mem，
          本来就属内存管理的辖区），这样 file_is_dev_zero() 就能作为 mm 内部函数做
          <strong>确定性识别</strong>；然后禁止别的映射走匿名路径、让这类映射真正变成匿名
          （!vma->vm_file 且匿名页偏移正确），最后把内核里为这些「奇怪生物」写的兼容代码删干净。
      - label: 效益
        text: >-
          消除一类语义分歧，代价是移动一个文件——系列里带用户态 VMA 测试与合并行为 selftest。
    relevance: "VMA 标志语义是这几天 mm 反复在动的地方（另有 40 帖的 VM_SPECIAL 清理系列），这条线值得连着看。"
    link: "https://lore.kernel.org/linux-mm/<20260926-map-private-dev-zero-v3-0-d4781e84ccfc@kernel.org>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "stmmac 15 帖：把 MTU 与 resume 失败时的数据通路状态留住"
    meta: "〔09-26 23:49 北京〕· [PATCH net v4 00/15] net: stmmac: preserve datapath state across MTU and resume failures"
    points:
      - label: 定位
        text: >-
          stmmac 以太网驱动的设备生命周期——MTU 变更、XDP、ethtool reopen、系统挂起这几条路径
          都会动到 ring、IRQ 和 DMA 资源，而失败回滚路径长期不干净。
      - label: 做法
        text: >-
          15 帖先把独立修复和生命周期前置条件排在「保留 ring 的 MTU 事务」之前：修 WoL/安全 IRQ
          的退栈顺序、复用 MDIO reset GPIO、允许 phylink_stop() 收尾已挂起实例、冻结 AF_XDP pool
          的延迟拆卸、串行化 PHC 变更；再引入明确的<strong>所有权状态机</strong>——
          DOWN 不持有 IRQ 与 NAPI、RUNNING 队列活跃、SUSPENDED 保留 ring 与 IRQ、
          HALTED 保留 ring 但已释放 IRQ。作者特意说明：把后两者合并会让 close 去释放它并不拥有的 IRQ。
      - label: 效益
        text: >-
          jumbo MTU 回滚不再新分配 buffer 和 IRQ，失败路径也不再留下半拆的设备。
    relevance: "「用显式状态机表达资源所有权」是驱动里最常被返工的一类设计，这份 series 的拆帖顺序本身就是教材。"
    link: "https://lore.kernel.org/netdev/<20260926-submit-stmmac-reset-fixes-v1-v4-0-ec1c0250b3c9@gmail.com>/"
  - type: highlight
    title: "PSP 关联必须建立在「已连接」的 socket 上；BPF 想给 skb_adjust_room 加 PPPoE"
    meta: "〔09-26 09:28 北京〕· [PATCH net-next 0/4] net: psp: require an established connection for association setup"
    points:
      - label: 定位
        text: >-
          PSP（PSP Security Protocol）的关联建立路径，以及 bpf_skb_adjust_room 的封装能力。
      - label: 做法
        text: >-
          PSP 这一侧收紧语义：关联（association）只在<strong>已建立连接</strong>的 socket 上才允许建立，
          并去掉 sk_clone() 里那次 assoc 清理；selftest 也从已关闭 socket 改成已连接 socket。
          另一条线是 RFC：给 bpf_skb_adjust_room 加 PPPoE 的 encap/decap，让 tc/XDP 程序
          能直接给报文套上或剥掉 PPPoE 头。
      - label: 效益
        text: >-
          前者是把一个安全协议的边界收紧；后者如果被接受，PPPoE 场景（宽带拨号那一层）
          就能在 BPF 里处理，而不必绕到内核模块。
    relevance: "PPPoE 那条对你家里的网络链路或许更直接；PSP 则是值得知道名字的新协议——它和 TLS 一样在往内核里落。"
    link: "https://lore.kernel.org/netdev/<20260925-psp-defeat-v1-0-9f0b430107aa@gmail.com>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "「我用 LLM 写了个集群文件系统」——XFS 维护者的回复：请至少换个 magic"
    meta: "〔09-26 14:07 北京〕· Re: [RFC] MXFS: a shared-disk clustered filesystem derived from XFS（Christoph Hellwig）"
    points:
      - label: 定位
        text: >-
          linux-fsdevel 上的新文件系统提案：MXFS，一个从 XFS 派生的共享磁盘集群文件系统，
          目标是给 Proxmox 用、对标 vSphere 的 VMFS。
      - label: 做法
        text: >-
          作者在回复里说得很直白：他 90 年代就在 FreeBSD 上写驱动，这次是<strong>一个研究项目</strong>，
          想看看「在合适的 harness 下 LLM 能不能做出来」，发布门槛定在 100% 数据完整性与 100% 稳定性，
          选 XFS 做底座。XFS 维护者 Christoph Hellwig 的回应是：不太会有人关心或 review 你的
          「LLM dump」，但<strong>请务必用不同的 magic number</strong>，别让流落在外的 MXFS 镜像
          被当成 XFS。
      - label: 效益
        text: >-
          这条的价值不在文件系统本身，而在于它是「LLM 生成内核代码」这个话题第一次以
          <b>完整子系统提案</b>的形式撞上维护者——前几天的 drm/fabric netlink 之争、mpnic 在
          cover letter 里写明「部分借助 LLM prompts 准备」，都是同一件事的不同侧面。
    relevance: "「AI 写的补丁怎么进上游」正在从争论变成日常。看维护者怎么回，比看提案本身有用。"
    link: "https://lore.kernel.org/linux-fsdevel/<ardhDI-Ko7b5RccH@infradead.org>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "amdxdna 为 AIE4 一次发 21 帖：把 doorbell mmap 收掉，改成内核提交"
    meta: "〔09-26 09:35 北京〕· [PATCH V0 00/21] accel/amdxdna: Kernel submission and PM for AIE4（David Zhang）"
    points:
      - label: 定位
        text: >-
          accel 子系统里的 AMD NPU 驱动，这一轮瞄准 AIE4 一代硬件：固件接口、设备操作、
          硬件初始化与命令提交四条线一起改。
      - label: 做法
        text: >-
          最实质的一步是<strong>去掉用户态 doorbell mmap</strong>，默认改为内核侧提交
          （用户上下文的 doorbell 偏移改成无效值）；配套加内核队列生命周期、job workqueue
          与内存布局，以及 fence 时间线。固件侧把接口版本升到 6.0、重排 host queue 布局与 opcode，
          并在升级队列布局之前先做 CERT 协议校验；PM 侧加了时钟元数据、DPM 频率表、
          电源模式 get/set 与跨 PM 周期保留的用户覆盖值。
      - label: 效益
        text: >-
          用户态不再直接敲硬件 doorbell，意味着内核重新掌握了提交时序——这是 accel 子系统
          一直在推的方向，也让错误处理和 fence 语义能统一。
    relevance: "「用户态 mmap 寄存器 vs 内核提交」是加速器驱动的核心分歧，NPU/VPU 都绕不开；这里的取舍可以当参考。"
    link: "https://lore.kernel.org/dri-devel/<20260926013448.3840921-1-yidong.zhang@amd.com>/"
  - type: divider
    label: "📰 arch"
    kind: section
  - type: highlight
    title: "POSIX 消息队列补两个系统调用：mq_recvmmsg / mq_sendmmsg（v5）"
    meta: "〔09-26 12:01 北京〕· [PATCH v5 0/4] Add two new system call mq_recvmmsg() and mq_sendmmsg() to posix ipc mqueue"
    points:
      - label: 定位
        text: >-
          IPC 层的 POSIX 消息队列。现状是 mq_timedsend / mq_timedreceive 一次只能收发一条，
          要批量就得循环——每次一个系统调用。
      - label: 做法
        text: >-
          加 mq_recvmmsg() 与 mq_sendmmsg() 两个新系统调用，语义对齐 socket 侧已有的
          recvmmsg / sendmmsg；系列包含内核实现、在大多数常见架构上登记系统调用号
          （alpha / arm / arm64 / m68k / microblaze / mips / parisc / powerpc / s390 / sh /
          sparc / x86）、perf 工具里的入口，以及文档与自测。
      - label: 效益
        text: >-
          新系统调用是内核里最谨慎的一类改动：一旦进了 UAPI 就永远在那里。v5 的增量主要是
          错误处理与向后兼容、以及 syscall.tbl 里的编号顺序。
    relevance: "「先加系统调用号到所有架构」是这类补丁的标准工作量，也是它慢的原因——可以当作观察 UAPI 流程的样本。"
    link: "https://lore.kernel.org/linux-arch/<20260926040102.308350-1-mathura.kumar.tech@gmail.com>/"
  - type: more
    title: "更多动态 · 系列与框架"
    items:
      - link: "https://lore.kernel.org/linux-block/<064255ee-c8be-4a82-8be0-fa209eac8637@linux.dev>/"
        text: "mm · mm/fbatch：把 lru_add_drain() 与 _all() 批量化（v2，26 帖，跨 mm/block/fs）"
        time: "09-26 10:07"
      - link: "https://lore.kernel.org/linux-mm/<areSEI5pWBadkqIe@gremlin>/"
        text: "mm · VMA 标志语义显式化、消灭 VM_SPECIAL（v3，40 帖）在 mm/arch/fs 三列表继续讨论"
        time: "09-26 17:41"
      - link: "https://lore.kernel.org/linux-mm/<20260926-direct-map-verify-wx-v2-1-efcd64a6b74a@kernel.org>/"
        text: "arch/mm · 把 DEBUG_WX 提级为 CHECK_WX（v2）：直接映射的 W+X 检查走向常开"
        time: "09-26 17:29"
      - link: "https://lore.kernel.org/linux-fsdevel/<cover.1790439358.git.legion@kernel.org>/"
        text: "fs · sysctl 加类型化字段描述符（v3，5 帖）"
        time: "09-27 00:23"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260926-work-mount-fixes-2-v1-0-f357abf3d17b@kernel.org>/"
        text: "fs · mount：又一批 bugfix（00/10）"
        time: "09-26 21:45"
      - link: "https://lore.kernel.org/linux-block/<20260926063328.257023-1-yupeng0921@gmail.com>/"
        text: "block · nvmet：给命名空间 I/O 加 cgroup_id 记账（v5）"
        time: "09-26 14:33"
      - link: "https://lore.kernel.org/rust-for-linux/<20260926173315.56772-1-mohamed.osama189110@gmail.com>/"
        text: "Rust · rust: add DropGuard（v3，5 帖）：给锁与 serdev 等场景加作用域守卫"
        time: "09-27 01:33"
      - link: "https://lore.kernel.org/linux-security-module/<CAHDTbUF=PmRfFHzmFnqhpwB7h1paL2DfMQMgFpdAEwUsVWzeWw@mail.gmail.com>/"
        text: "LSM · RFC：提议一个统一的 Competitive / Protected Session API（面向竞技游戏的高完整性执行环境）"
        time: "09-26 16:58"
  - type: more
    title: "更多动态 · 修复与杂项"
    items:
      - link: "https://lore.kernel.org/lkml/<20260926-ksyms-tune-v6-0-236620c65e98@gmail.com>/"
        text: "内核 · kallsyms 符号查找提速约 7 倍走到 v6"
        time: "09-27 03:40"
      - link: "https://lore.kernel.org/netdev/<20260926210757.2152159-1-thisseanzhang@gmail.com>/"
        text: "net · RFC：给 bpf_skb_adjust_room 加 PPPoE 封装/解封装（3 帖）"
        time: "09-27 05:08"
      - link: "https://lore.kernel.org/linux-media/<20260926123004.3874721-1-jkeeping@inmusicbrands.com>/"
        text: "media · rockchip rga：修正 rev0 硬件的旋转"
        time: "09-26 20:30"
      - link: "https://lore.kernel.org/dri-devel/<8ad00f0f-d924-4b19-986c-8c17dcdade86@leemhuis.info>/"
        text: "DRM · 回归报告：dml_core_mode_prog 栈帧 3096 字节超出 3072 上限"
        time: "09-26 18:37"
      - link: "https://lore.kernel.org/linux-pci/<20260926165811.GA2146023@bhelgaas>/"
        text: "PCI · v7.3 的 PCI 修复拉取请求"
        time: "09-27 00:58"
      - link: "https://lore.kernel.org/netdev/<20260926225625.25969-1-andre.przywara@arm.com>/"
        text: "net · net: phy：新增 Maxio MAE0621A 支持（v3）"
        time: "09-27 07:01"
  - type: divider
    label: "⚙️ 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "guest_memfd 的 provider 接口（RFC 17 帖）"
        text: >-
          用 resource_fd 描述「内存从哪来」，provider 只实现 attach / release / alloc_folio /
          invalidate_folio 四个回调。它把 guest 内存的来源与 KVM 的共享/私有语义拆成了两层。
          <a href="https://lore.kernel.org/linux-mm/<20260925-gmem-tmpfs-backend-v1-0-d36159822d18@google.com>/">原文</a>
      - label: "mm/fbatch：lru_add_drain 批量化（v2，26 帖）"
        text: >-
          把散在各处的 lru_add_drain() 与 lru_add_drain_all() 收成批量操作，跨 mm/block/fs
          三个列表同发——典型的「一处机制改动、多个子系统跟着改」的形态。
          <a href="https://lore.kernel.org/linux-block/<064255ee-c8be-4a82-8be0-fa209eac8637@linux.dev>/">原文</a>
      - label: "OF/IOMMU 新增 iommu-ranges"
        text: >-
          让设备节点能声明自己的 IOVA 范围，由 Qualcomm iris 的 VPU 需求带出来。
          驱动侧「多 context bank」从私有布局变成可描述的设备树结构。
          <a href="https://lore.kernel.org/linux-media/<20260926-vpu_iommu_iova_handling-v5-0-0322ca5dc10c@oss.qualcomm.com>/">原文</a>
      - label: "消灭 VM_SPECIAL（v3，40 帖）"
        text: >-
          VMA 标志语义显式化的大重构，在 mm / arch / fs 三个列表同时讨论。这类「先把语义写清楚、
          再删特例」的系列通常要迭代很多轮。
          <a href="https://lore.kernel.org/linux-mm/<areSEI5pWBadkqIe@gremlin>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "PON / ONU / OLT"
        text: >-
          无源光网络。OLT 是局端设备，ONU/ONT 是用户侧那台光猫；两边之间是无源分光器，
          没有有源电子设备。本期 RFC 只谈 ONU 侧。
      - label: "PLOAM / OMCI"
        text: >-
          ITU-T PON 的两层管理：PLOAM 管物理层激活与突发（更靠下），OMCI（G.988）管业务开通
          与配置（更靠上，通常整个放在用户态）。
      - label: "T-CONT / GEM port"
        text: >-
          ITU-T PON 的承载资源：T-CONT 是上行带宽的分配容器，GEM port 是里面承载业务的管道。
      - label: "guest_memfd"
        text: >-
          KVM 的「客户机优先」内存：内存的所有权先在客户机、再考虑宿主。为机密计算 VM 而起，
          目标是服务所有 VM。
      - label: "resource pool / provider"
        text: >-
          本期 RFC 的新提法：一个 fd 代表「内存该怎么分配」，由实现了四个回调的后端（第一个是 tmpfs）
          来兑现。
      - label: "pghot / CHMU"
        text: >-
          pghot 是内核侧的页热度跟踪与提升框架，CHMU 是能报告内存使用情况的硬件单元。
          本期记录争论的正是 pghot 该多复杂、以及它和 CHMU 该怎么接。
      - label: "Interchange 格式"
        text: >-
          Apple 私有的压缩 + 平铺像素格式，用于在视频解码器与 GPU、显示控制器之间共享 buffer；
          AVD 驱动为它新增了 V4L2 像素格式以便计算尺寸。
      - label: "bpf_skb_adjust_room"
        text: >-
          BPF 里调整 skb 头部空间的辅助函数，常用于封装/解封装。本期 RFC 想给它补上 PPPoE。
  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
