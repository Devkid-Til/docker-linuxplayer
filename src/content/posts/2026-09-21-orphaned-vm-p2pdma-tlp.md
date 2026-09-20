---
title: "「孤儿虚拟机」46 帖 RFC：换内核不重启 VM；P2P DMA 学会按 TLP 类别找路"
date: "2026-09-21"
desc: "KVM Caretaker 46 帖 RFC 让 VM 跨内核热更新存活；PCI/P2PDMA v7 按 TLP 类别细化路由；block 树在 next 搞挂全部 zoned 设备。"
column: "daily"
tags: ["mm", "PCI", "media", "DRM", "net", "fs", "block", "arch", "LSM"]
blocks:
  - type: hook
    text: >-
      周日的邮件列表没有休息：<strong>46 帖的「Orphaned Virtual Machines」</strong>要把物理 CPU
      也纳入热更新保全——hypervisor 换内核，VM 原地不动；另一边 <strong>PCI/P2PDMA 第 7 版</strong>把
      P2P 路由的判断从「一刀切」细化到 TLP 类别，GPU、网卡、NVMe 盘之间直连的可用路径又宽了一截。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-21/cover.png"
    alt: "封面 · 9月21日 · 换内核不重启虚拟机"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "Orphaned Virtual Machines：46 帖 RFC，把物理 CPU 保全进内核热更新"
      - label: "头条"
        text: "PCI/P2PDMA v7（19 帖）：按 TLP 类别决定 P2P 流量怎么走路"
      - label: "media"
        text: "三星 S5K3T2 传感器驱动进场；camss 支持 VFE gen4"
      - label: "DRM"
        text: "IRQ_HPD 带外事件链 v5：USB-C 场景的热插拔不再丢"
      - label: "mm"
        text: "xswap 物理后端 17 帖 RFC：zswap 拒收后有序回落磁盘"
      - label: "net"
        text: "bpf_tcp_ops 加 AutoLOWAT 钩子：BPF 程序能感知接收队列水位"
      - label: "fs"
        text: "overlayfs 禁止混合 idmap 同 sb 的 NFS 导出"
      - label: "block"
        text: "next 合并 block 树后所有 zoned 设备挂掉；virtio-blk 内联加密 v3"
      - label: "arch"
        text: "SEV-SNP Alternate Injection v3：中断投递收归 guest 可信侧"
      - label: "机制"
        text: "KVM pfncache 换原子 SRCU、NVMe TP8028 快速路径恢复、drm/fabric 加速器拓扑 RFC"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-21/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-21 06:39 北京，近 24h 各板块真实计数：net 345 · mm 153 · DRM 111 · arch 53 ·
      media 48 · PCI 46 · fs 40 · rt 27 · Rust 25 · block 24 · LSM 11 · virtio 0（virtio-dev
      是低频列表，本窗口按最近 20 条计，24h 内无新帖）。mm 的高位几乎全由今天两条大系列撑起——
      46 帖 Orphaned VM 与 17 帖 xswap；net 的第一名里修复流占大头，stmmac 一个驱动就贡献了三条系列。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "Orphaned Virtual Machines：46 帖 RFC，让 VM 在 hypervisor 换内核时「无人看管」地活下来"
    meta: "〔09-21 03:37 北京〕· [RFC PATCH 00/46] Orphaned Virtual Machines（linux-mm）"
    points:
      - label: 现状
        text: >-
          内核热更新（live update）这条路近两年一直在铺：KHO（Kexec HandOver，kexec 交接）让新内核接管旧内核的
          内存与设备状态，LUO（Live Update Orchestrator，热更新编排器）负责把各子系统的状态序列化、
          交接、恢复。虚拟机的 vCPU 状态也在被逐步纳入这套框架。
      - label: 痛点
        text: >-
          保全一个 VM 不只是保存 vCPU 寄存器：物理 CPU 本身在新内核启动时会被重新初始化，跑在上面的
          VM 必须被迁走或停机。对云厂商来说，「换内核」的最大成本不是重启那几秒，而是把整机的 VM
          全部驱逐、迁移一遍。
      - label: 方案
        text: >-
          Pasha Tatashin 的 46 帖 RFC 引入「Caretaker」思路：<b>把一部分物理 CPU 本身也保全下来</b>
          （cpu_preserve：CPU 的泊车循环、隔离地址空间、sysfs 接口、LUO 文件处理器），加上 x86/arm64
          的低层汇编保全与页表支持，KVM 侧的 vCPU LUO 保全，以及 VMX 的 Caretaker 集成（VMCS 生命周期、
          exit 分发、LAPIC 定时器与中断注入）。跑在被保全 CPU 上的 VM 成为「孤儿」——hypervisor
          内核已经换了一代，它还活着。
      - label: 为什么
        text: >-
          设计取舍在于「保全物理 CPU」比「保全数据」激进得多：被保全的 CPU 跳过了新内核的正常初始化路径，
          需要一个可信的泊车循环和隔离地址空间来兜底。换来的是有状态工作负载可以<b>在位</b>跨内核存活，
          不用迁移。
      - label: 效益
        text: >-
          直接受益者是云平台：内核安全更新不再需要清空整机。对内核热更新这条长线来说，这是把
          「能换内核」推进到「换内核时业务无感」的关键一块。
      - label: 下一步
        text: >-
          还是 RFC，46 帖的量级意味着评审周期会很长，且横跨 mm、KVM、x86、arm64 四个域。关注
          cpu_preserve 与 KVM LUO 接口的收敛情况——这是想跟这条线的人最好的切入观察点。
    verdict: >-
      热更新正在从「演示能跑」走向「生产可用」：保全对象从内存、设备、vCPU，一路延伸到物理 CPU 本身。
      这条线值得长期跟踪。
    link: "https://lore.kernel.org/linux-mm/<20260920193650.3373435-1-pasha.tatashin@soleen.com>/"
  - type: headline
    title: "PCI/P2PDMA v7（19 帖）：P2P 流量能不能直连，开始按 TLP 类别逐项判断"
    meta: "〔09-20 19:41 北京〕· [PATCH v7 00/19] PCI/P2PDMA: Route peer-to-peer DMA by TLP class（linux-media 跨投）"
    points:
      - label: 现状
        text: >-
          P2PDMA 让 PCIe 设备之间不经过 CPU 内存直接搬数据——GPU 直读 NVMe（GDS）、RDMA 网卡直写显存
          都靠它。但一条 PCIe 路径能不能走 P2P，受 ACS（Access Control Services，PCIe 的访问控制特性）
          等开关约束，内核负责判断路径是否允许直连。
      - label: 痛点
        text: >-
          此前的判断偏粗：ACS 重定向一旦出现在路径上，P2P 就整体被拒。但 PCIe 的 TLP（事务层包）分
          Posted / Non-Posted / Completion 等类别，还有 Relaxed Ordering、地址转换过的
          Translated Request——不同类别对 ACS 重定向的敏感度并不一样，一刀切会误伤本来安全的直连路径。
      - label: 方案
        text: >-
          v7 共 19 帖：先文档化 TLP 属性假设与方向性 ACS 路由，再在路径分歧点收集并评估 ACS 控制、
          按 TLP 类别给出路由答案（Translated Request 在 Direct Translated P2P 下路由、Relaxed Ordering
          Completion 直连）；配套 KUnit 覆盖 ACS 路由决策与隔离检查；最后 dma-buf 导入方可以查询
          P2P 路由方式，RDMA/uverbs 与 vfio/pci 经 dma-buf 暴露 P2PDMA provider。
      - label: 为什么
        text: >-
          取舍很清楚：不放松隔离语义，只把判断粒度从「整条路径」降到「每个 TLP 类别」。隔离该拒的
          还是拒，但以前被保守策略挡掉的合法直连现在能放行。
      - label: 效益
        text: >-
          用 GPU、RDMA、NVMe 做直连的栈（GDS、P2P RDMA）可用拓扑变多；dma-buf 层暴露路由信息后，
          图形与 RDMA 栈能自己查询路径性质，而不是事后踩坑。
      - label: 下一步
        text: >-
          到 v7 且 KUnit 覆盖齐备，形态上已接近可合入。接下来看 PCI 维护者对路由语义的意见，
          以及 dma-buf / RDMA / VFIO 三处的接入是否被各自子系统接受。
    verdict: >-
      这是「把策略判断从粗粒度做细」的典型演进：不碰安全边界，只提升判断精度。对做设备直连的人是实打实的利好。
    link: "https://lore.kernel.org/linux-media/<20260920-fix-p2p-acs-v4-0-v7-0-ca0828ab697c@nvidia.com>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "三星 S5K3T2 图像传感器驱动进场"
    meta: "〔09-20 22:58 北京〕· [PATCH 0/2] media: i2c: Samsung S5K3T2 image sensor（linux-media）"
    points:
      - label: 定位
        text: >-
          V4L2 的传感器驱动层（drivers/media/i2c）——camera 管线的最前端，向上对
          v4l2_subdev（V4L2 的子设备抽象）暴露 pad 与格式。
      - label: 做法
        text: >-
          两帖：dt-bindings 描述 S5K3T2 的接线与属性，i2c 驱动实现传感器本体支持。
      - label: 效益或下一步
        text: >-
          又一颗三星传感器有了主线驱动的起点。新驱动首版通常还要过几轮 review（寄存器表、
          格式支持面、v4l2_subdev 接口合规性），看后续版本演进。
    relevance: >-
      和你做的 camera 方向正对：一颗新 sensor 进主线的完整路径（binding → 驱动 → review）就是
      这套流程的最小样本，适合对照学习。
    link: "https://lore.kernel.org/linux-media/<20260920-upstream-s5k3t2-v1-0-d640740f4013@proton.me>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "IRQ_HPD 带外事件链 v5（8 帖）：USB-C 场景的热插拔事件不再丢在半路上"
    meta: "〔09-20 23:01 北京〕· [PATCH v5 0/8] drm: handle IRQ_HPD events correctly（dri-devel）"
    points:
      - label: 定位
        text: >-
          DRM 连接器与 bridge 层的热插拔检测路径。HPD（Hotplug Detect，显示接口的热插拔信号）传统上由
          显示控制器中断上报；但 USB-C altmode 场景里，插拔事件先从 USB-C/PMIC 侧带外到达。
      - label: 做法
        text: >-
          8 帖把这条链打通：drm_connector 支持上报带外 IRQ_HPD 事件，bridge 链新增把 IRQ_HPD
          透传给驱动、并给 HPD 回调传额外事件；下游接上 drm/msm 的 DP、qcom pmic-glink-altmode
          与 ucsi huawei-gaokun。
      - label: 效益或下一步
        text: >-
          到 v5 说明框架部分已多轮收敛。这种「核心层加事件通路 + 各驱动接」的结构一旦定下来，
          后续平台照抄即可。
    relevance: >-
      和 DRM bridge 链打交道时直接相关：bridge 不只是视频数据通路，控制事件（HPD、IRQ）也在同一条
      链上传——这套事件透传模式值得记住。
    link: "https://lore.kernel.org/dri-devel/<20260920-hpd-irq-events-v5-0-ff1de0090c72@oss.qualcomm.com>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "xswap 物理后端 17 帖 RFC：zswap 拒收的页，有序落回磁盘"
    meta: "〔09-20 15:20 北京〕· [RFC PATCH 00/17] mm, swap: xswap writeback to a physical backend（linux-mm）"
    points:
      - label: 定位
        text: >-
          mm/swap 层。zswap 是 swap 的压缩内存缓存：页先压进内存，满了才回写磁盘；xswap 是社区正在推的
          新 swap 抽象（swap table 路线），这 17 帖给它补上「物理后端」这条腿。
      - label: 做法
        text: >-
          zswap 拒收一个 xswap 页时回落磁盘、物理槽位支持回收与 swapoff、大 folio 用连续物理段做后端、
          支持 THP swapin，并把 swap 的 memcg 计费助手拆开、不再对 zswap 支撑的 xswap 条目重复计费。
      - label: 效益或下一步
        text: >-
          swap 路径的「内存压缩缓存 + 磁盘后端」从概念变成完整闭环。仍是 RFC，swap 子系统近半年
          改动密集，这条线的接口形态值得持续看。
    relevance: >-
      做嵌入式时 swap/zswap 行为直接影响内存水位表现——xswap 落地后，压缩缓存与磁盘的衔接策略会透明得多。
    link: "https://lore.kernel.org/linux-mm/<20260920072043.430390-1-hebaoquan@kylinos.cn>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "bpf_tcp_ops 加 AutoLOWAT 钩子（7 帖）：BPF 程序能感知 TCP 接收队列水位"
    meta: "〔09-21 03:56 北京〕· [PATCH bpf-next 0/7] bpf: Add bpf_tcp_ops hooks for TCP AutoLOWAT（netdev）"
    points:
      - label: 定位
        text: >-
          TCP 接收路径与 BPF sock_ops 的交界处。SO_RCVLOWAT 决定「接收队列凑够多少字节才唤醒读者」，
          AutoLOWAT 是内核自动调这个值的机制。
      - label: 做法
        text: >-
          先把 __tcp_set_rcvlowat() 从 TCP 里拆出来，再给 bpf_tcp_ops 加
          enqueue_rcvq/dequeue_rcvq 两个钩子（入队、出队接收队列时回调 BPF 程序），配一个调
          sk_rcvlowat 的 kfunc；MPTCP 明确不支持该回调标志，附 selftest。
      - label: 效益或下一步
        text: >-
          用 BPF 做传输策略的人拿到一个新观测点：接收队列水位的变化从此对 BPF 可见、可干预。
    relevance: >-
      关系不大，但「先拆 helper、再加钩子、最后补 selftest」的三段式是内核加 BPF 能力的标准姿势。
    link: "https://lore.kernel.org/netdev/<20260920195633.3033620-1-kuniyu@google.com>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "overlayfs：混合 idmap 的同 sb lower 层，直接禁止 NFS 导出"
    meta: "〔09-21 04:33 北京〕· [PATCH v2 0/3] ovl: disable nfs_export for mixed-idmap same-sb lower layers（lkml）"
    points:
      - label: 定位
        text: >-
          overlayfs 的 nfs_export 特性（让 overlay 可以经 NFS 导出）。idmap（id 映射挂载）让同一文件在
          不同挂载点呈现不同 uid/gid，而 NFS 文件句柄要求路径解析结果稳定唯一。
      - label: 做法
        text: >-
          当 lower 层与 overlay 在同一个 sb（super block）上但 idmap 不同时，文件句柄的解析会产生歧义——
          补丁不去「解」这个歧义，而是直接禁止这种组合开启 nfs_export。
      - label: 效益或下一步
        text: >-
          容器场景（idmap 挂载的重度用户）少了一个隐蔽的语义陷阱。来自法国网安部门（oss.cyber.gouv.fr）
          的投稿，同日他们还修了 ksmbd 的 SMB2 CREATE 响应缓冲区溢出。
    relevance: >-
      关系不大，但「解不了语义歧义就禁止组合」是内核处理边角特性的常见务实路线。
    link: "https://lore.kernel.org/lkml/<20260920203239.2876221-2-Jeremy.Jean@oss.cyber.gouv.fr>/"
  - type: divider
    label: "📰 block"
    kind: section
  - type: highlight
    title: "linux-next 合并 block 树后，所有 zoned 设备挂了"
    meta: "〔09-20 20:59 北京起讨论〕· next-20260917 and next-20260918: merge of the block tree breaks all zoned devices（linux-block）"
    points:
      - label: 定位
        text: >-
          block 层的 zoned 设备支持（ZNS SSD、SMR 盘那种按 zone 顺序写的设备）。linux-next 是各子系统树的
          每日集成预览，问题在这里暴露本来就是它的职责。
      - label: 做法
        text: >-
          报告者实测 next-20260917/18 两个版本：合并 block 树后所有 zoned 设备不可用；Mark Brown
          等人跟进复现定位。
      - label: 效益或下一步
        text: >-
          典型的 next 集成期警报——问题大概率在合入 mainline 前被拦下。用 zoned 设备做开发的人
          这几天避开这两个 next 版本即可。
    relevance: >-
      和你关系不大，但这是「为什么不要在 next 上干活」的周期性提醒。
    link: "https://lore.kernel.org/linux-block/<20260920125846.1806521-1-cui.tao@linux.dev>/"
  - type: divider
    label: "📰 arch"
    kind: section
  - type: highlight
    title: "SEV-SNP Alternate Injection v3（8 帖）：中断投递收归 guest 可信侧"
    meta: "〔09-21 02:17 北京〕· [PATCH v3 0/8] Alternate Injection: Secure Interrupt Delivery for SEV-SNP Guests - Guest Support（lkml）"
    points:
      - label: 定位
        text: >-
          x86 机密计算的中断路径。SEV-SNP（AMD 的机密虚拟机技术）里 hypervisor 不可信，但中断注入传统上
          恰恰是 hypervisor 干的活——这是个结构性矛盾。
      - label: 做法
        text: >-
          guest 侧 8 帖：SVSM（Secure VM Service Module，guest 内可信的服务模块）接管 APIC 模拟——
          新增 SVSM APIC 驱动、guest 向 SVSM APIC 协议注册、不支持的 APIC 寄存器访问路由给
          hypervisor 的 APIC 模拟、guest 可为 hypervisor 配置中断向量；前置修复让 SVSM 调用
          抢占安全，最后向 guest 宣告支持 Alternate Injection。
      - label: 效益或下一步
        text: >-
          机密虚拟机的中断投递不再依赖不可信的 hypervisor。v3 在按 review 意见稳步推进，
          对应还有 hypervisor 侧的配套系列。
    relevance: >-
      关系不大，但「把不可信方从关键路径上摘掉」的安全设计思路是通用的。
    link: "https://lore.kernel.org/lkml/<20260920181652.DaylKLk1VHKZdRnacoQscYPjoPcIq4Kbp6SbGG6fr7A@z>/"
  - type: more
    title: "新驱动与新硬件"
    items:
      - link: "https://lore.kernel.org/linux-media/<aq-I_nDC_ua3elhY@QCOM-aGQu4IUr3Y>/"
        text: "media: camss 支持 VFE gen4 / VFE 900、CSID 900——高通 ISP 的新一代成像管线进 review"
        time: "09-20 15:19"
      - link: "https://lore.kernel.org/dri-devel/<20260920193944.110983-1-kieweg.leander@gmail.com>/"
        text: "drm/glanda v5：给 VHDL 软核 GPU（GlandaGPU）写的全新 DRM 驱动，迭代到第 5 版"
        time: "09-21 03:39"
      - link: "https://lore.kernel.org/dri-devel/<20260920-crosshatch-panel-v1-0-de6e9512da96@ixit.cz>/"
        text: "Pixel 3 XL 显示面板支持（11 帖）：s6e3ha8 驱动整理 + AMB630QY01 面板 + 设备树"
        time: "09-20 19:05"
      - link: "https://lore.kernel.org/netdev/<20260920170116.3624104-1-coiaprant@gmail.com>/"
        text: "RK3568 的 XPCS/SGMII 支持发到 v9（11 帖）：XPCS 生命周期管理移交给平台驱动"
        time: "09-21 01:02"
      - link: "https://lore.kernel.org/netdev/<20260920-submit-h616-emac1-v1-v4-0-8347dfe2eb7d@gmail.com>/"
        text: "stmmac 支持全志 H616 EMAC1 到 v4（6 帖）：含 PHY 初始化后复位 MAC 等前置修复"
        time: "09-20 19:36"
      - link: "https://lore.kernel.org/linux-media/<none-3a602ba00f5f6041469cfc7711fd4e9ea3ed5e48>/"
        text: "社区讨论：把 Patchwork 与 AI 评审机器人 Sashiko 接起来？——昨天「AI 补丁洪流」的续集信号"
        time: "09-21 06:31"
  - type: more
    title: "回归与修复"
    items:
      - link: "https://lore.kernel.org/lkml/<CANzgjV0YWUX6=ZGTbn4KEKqQmVhsZTsDPeRf0Nfq=YFT1eoPzA@mail.gmail.com>/"
        text: "[回归] pinctrl-amd 不在 probe 时清 S4 唤醒位，导致 AMD Ryzen 笔记本关机变重启"
        time: "09-21 01:00"
      - link: "https://lore.kernel.org/lkml/<9318fed0-31c0-4991-9f57-a1cabeeebcd9@gmail.com>/"
        text: "[回归 7.3-rc1] logitech-hidpp：Bolt 设备每次重连被强制开高分辨率滚轮，覆盖用户态设置"
        time: "09-21 05:24"
      - link: "https://lore.kernel.org/lkml/<905771062.272724286.1789919301858.JavaMail.zimbra@trinity-net.com>/"
        text: "[回归] 6.18.52 的 ACPI processor/cpuidle 改动让裸机 Xen dom0 无法启动"
        time: "09-20 23:48"
      - link: "https://lore.kernel.org/lkml/<20260920181503.2830435-1-Jeremy.Jean@oss.cyber.gouv.fr>/"
        text: "ksmbd：修 SMB2 CREATE 响应缓冲区溢出（v2）"
        time: "09-21 02:15"
      - link: "https://lore.kernel.org/linux-mm/<20260920-fix-dontunmap-partial-self-merge-v1-0-6ffb556f8f8b@kernel.org>/"
        text: "mm/mremap：修 MREMAP_DONTUNMAP 的两处 locked_vm 泄漏（2 帖）"
        time: "09-20 22:13"
      - link: "https://lore.kernel.org/lkml/<20260920-nvmem-read-oob-bit-offset-v2-1-feeb7b672059@jannau.net>/"
        text: "nvmem core：修位偏移超过一字节时的越界读（v2），已获 maintainer 应用"
        time: "09-21 00:46"
      - link: "https://lore.kernel.org/linux-block/<20260920122444.2549493-1-linlin.zhang@oss.qualcomm.com>/"
        text: "virtio-blk 内联加密 v3：给 guest 做 FBE 虚拟化，新增控制 virtqueue"
        time: "09-20 20:25"
      - link: "https://lore.kernel.org/linux-mm/<CAFLp9PF+6KUY7ZAGQZ_X9AN4VYbkdW_aDk1QSth3ZAVVqLTqsQ@mail.gmail.com>/"
        text: "[RFC] Neural Storage Driver：会学习的 page cache 预取器——想法大胆，先看讨论走向"
        time: "09-21 06:39"
  - type: divider
    label: "📌 机制雷达：6 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "KVM pfncache 换原子 SRCU"
        text: >-
          KVM 的 gfn→pfn 缓存读者从 rwlock 换成原子 SRCU，并恢复 x86 嵌套虚拟化的 guest-mode
          使用（17 帖）：嵌套场景的 APIC/MSR 位图页全部改走 pinned pfncache，读路径不再拿锁。
          <a href="https://lore.kernel.org/linux-rt-devel/<20260920211920.928306-1-dwmw2@infradead.org>/">原文</a>
      - label: "NVMe TP8028 快速路径故障恢复"
        text: >-
          NVMe over Fabrics 的 Rapid Path Failure Recovery 到 v6（18 帖）：引入 FENCING/FENCED
          控制器状态与跨控制器复位（CCR），tcp/rdma/fc 三种传输统一接——盘阵链路抖动时不再整控重建。
          <a href="https://lore.kernel.org/lkml/<20260920182936.2317916-1-mkhalfella@purestorage.com>/">原文</a>
      - label: "leds 硬件控制 trigger 切换"
        text: >-
          LED 子系统支持「硬件发起的硬件控制切换」（v7·13 帖）：新增 hw_offloaded() 回调与
          trigger_may_offload_to_hw 属性，netdev trigger、turris-omnia、cros_ec、ideapad 键盘背光
          一起接入——灯从软件翻转到硬件自治，状态同步有了正式通道。
          <a href="https://lore.kernel.org/netdev/<20260921-leds-trigger-hw-changed-v7-0-fe3cdb6dec51@rong.moe>/">原文</a>
      - label: "drm/fabric：加速器互联拓扑"
        text: >-
          RFC（12 帖）：给 scale-up 加速器互联（多 GPU/NPU 直连 fabric）建厂商中立的拓扑基础设施——
          加速器互联从各厂私有走向内核公共层的第一步，值得跟踪。
          <a href="https://lore.kernel.org/dri-devel/<aq-AwReIVop1qv82@FV6GYCPJ69>/">原文</a>
      - label: "asm-generic 拆出 MMIO accessors"
        text: >-
          MMIO 访问器从 io.h 拆成独立头文件（v2），arm64 与 riscv 改用 generic 实现——
          架构间重复的 MMIO 代码又少一份。
          <a href="https://lore.kernel.org/linux-arch/<20260920014357.7069-1-qingfang.deng@linux.dev>/">原文</a>
      - label: "bpf-lsm：exec 的一次性授权"
        text: >-
          RFC：用 bpf-lsm 给 exec 做「限定范围、一次性」的用户态授权绑定——容器沙箱想要的那种
          「只允许这一次 exec」的细粒度控制，LSM 侧多了一种可编程姿势。
          <a href="https://lore.kernel.org/linux-security-module/<CANBsAxr6=Q2AB-NOEGyZohEXt7F_3wMzi5O8yw=fEUmuj5zFqQ@mail.gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "KHO（Kexec HandOver）"
        text: "kexec 换内核时把内存、设备等状态交接给新内核的机制——内核热更新的地基，今天头条的 46 帖就是在它之上盖楼。"
      - label: "LUO（Live Update Orchestrator）"
        text: "热更新编排器：负责把各子系统的状态序列化、交接、恢复的框架层。"
      - label: "ACS（Access Control Services）"
        text: "PCIe 的访问控制特性，决定设备间 P2P 流量能否直连、是否必须绕行根复合体——P2PDMA 能不能走通就看它。"
      - label: "TLP（Transaction Layer Packet）"
        text: "PCIe 事务层包，分 Posted / Non-Posted / Completion 等类别；今天 P2PDMA v7 的核心就是把路由判断细化到这些类别。"
      - label: "SEV-SNP / SVSM"
        text: "AMD 的机密虚拟机技术；SVSM 是 guest 内部可信的服务模块，用来把 APIC 模拟等敏感活从不可信的 hypervisor 手里接过来。"
      - label: "HPD（Hotplug Detect）"
        text: "显示接口的热插拔检测信号；USB-C 场景下它常常带外到达，需要专门的事件通路传进 DRM。"
      - label: "xswap"
        text: "mm 正在推进的新 swap 抽象层（swap table 路线）；zswap 是 swap 的压缩内存缓存，今天的 17 帖把两者衔接成闭环。"
  - type: closing
    tagline: "如果对你有用，点个赞。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
