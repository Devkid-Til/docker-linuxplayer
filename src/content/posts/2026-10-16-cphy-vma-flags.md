---
title: "相机链路补上 C-PHY；mm 把 VMA 标志的语义写清楚"
date: "2026-10-16"
desc: "MIPI C-PHY 从 generic PHY 一路补到传感器；mm 用 39 封把 VMA 标志从「测某一位」改成「说清是什么映射」。"
column: "daily"
tags: ["media", "mm", "DRM", "net", "fs", "LSM", "block", "PCI", "arch", "Rust"]
blocks:
  - type: hook
    text: >-
      今天值得花 3 分钟看两件事：<strong>相机链路补上 C-PHY</strong>——从 generic PHY 框架
      到 CAMSS 接收端再到传感器端，缺的那一层今天都有了形状；<strong>mm 用 39 封收拾 VMA
      标志</strong>，把「测哪一位」换成「说清这是什么映射」。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-16/cover.png"
    alt: "封面 · 10月16日 · 相机链路补上 C-PHY"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-16/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-16 06:47 北京，近 24h 各板块真实计数：net 494 · DRM 444 · mm 265 ·
      media 136 · PCI 132 · fs 97 · block 81 · Rust 68 · LSM 45 · rt 45 · arch 7 ·
      virtio 5。net 与 DRM 量最大但结构很散——多数是零散修复；今天成体系的设计讨论落在
      media（C-PHY 三层）、mm（VMA 标志语义）和 DRM（显示硬件归固件所有的 DCP）。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "相机链路少的那一层：MIPI C-PHY 从 PHY 一路补到传感器"
    meta: "〔10-16 06:20 北京〕· [PATCH RFC 0/4] phy: qcom-mipi-csi2: C-PHY for X1E80100（George Neacsu）"
    points:
      - label: 现状
        text: >-
          MIPI 相机链路是分层的：传感器是一个 <strong>v4l2_subdev</strong>，下接 CSI 接收端
          （Qualcomm 这边是 CAMSS / CSID），最底下是 PHY。目前物理层主流是
          <strong>D-PHY</strong>——每条 lane 一对差分线、时钟单独走；<strong>C-PHY</strong>
          则是三根线一组（trio），把时钟嵌进数据里做编码，同样的线数能换更高吞吐。内核的
          generic PHY 框架此前只认 D-PHY。
      - label: 痛点
        text: >-
          Snapdragon X1E80100（Surface Pro 11）的前摄 IMX681 挂在 CSIPHY2 上、走一条 C-PHY
          trio。linux-next 里 CSI2 PHY 驱动和 CAMSS 的 PHY API 路径都有了，缺的正是这一块：
          CAMSS 没有办法向 PHY 要 C-PHY；CSID 里那个 PHY 类型选择<strong>定义了却从没写过</strong>；
          <code>csiphy_stream_on()</code> 里也没有 C-PHY 分支。
      - label: 方案
        text: >-
          两组 RFC 各管一端。PHY 侧 0/4：在 generic PHY 框架加 <code>PHY_MODE_MIPI_CPHY</code>
          与配置项；qcom-mipi-csi2 里的 X1E C-PHY 序列取自 Qualcomm GPL-2.0 的 downstream
          头文件；CSID 680 补上 PHY 类型选择；<code>csiphy_stream_on()</code> 支持 PHY API 的
          CSIPHY。传感器侧 0/2：DT 绑定允许 C-PHY bus，imx681 驱动加 C-PHY 支持。基线是
          next-20261015 加 David 的 camss C-PHY v9。
      - label: 为什么
        text: >-
          作者没有硬推，而是把两个决定权交回维护者：CAMSS 要 C-PHY，是该给 PHY 框架加一个通用
          模式，还是让 PHY 只看自己的 endpoint？另外 Qualcomm 给的 X1E 序列是按 2.5 Gsps 写的，
          而这颗传感器跑 2.4 Gsym/s——sa8775p 那版是按速率选设置，X1E 要不要照做，也留成了问题。
      - label: 效益
        text: >-
          实测在 Surface Pro 11 上：前摄 3844x2640 @30.01fps，彩条与 out-of-tree 驱动逐字节
          一致；后摄 OV13858 走 D-PHY 四 lane 仍是 29.9fps，没被带坏。相机链路里「线更少、
          速率更高」的那条路，第一次有了上游可复用的形状。
      - label: 下一步
        text: >-
          作者明说板级 DT 要等 Bryan 的 x1e80100 camera DT、CSI2 PHY 以及 PHY 里的 X1E C-PHY
          落定后再单独发。同一天他还带了 OV13858 的 DT 支持（0/2）。
    verdict: 这条的价值不在某一颗传感器，而在「PHY 模式」这个口子怎么开——开对了，后面所有 C-PHY 传感器和 SoC 都按同一个形状接进来。
    link: "https://lore.kernel.org/linux-media/<20261015-x1e-cphy-rfc-v1-0-1f3fa9af940a@gmail.com>/"

  - type: headline
    title: "小写标志位背后的一团乱麻：mm 用 39 封把 VMA 的语义写清楚"
    meta: "〔10-15 15:56 北京〕· [PATCH v6 00/39] mm: make VMA flag semantics explicit, eliminate VM_SPECIAL"
    points:
      - label: 现状
        text: >-
          每个 <code>mmap</code> 出来的区域是一个 <strong>VMA</strong>，它的行为由一组标志位
          描述（<code>VM_IO</code>、<code>VM_PFNMAP</code>、<code>VM_MIXEDMAP</code>、
          <code>VM_SPECIAL</code>…）。内核各处靠「测某一位」来判断这个映射是什么。
      - label: 痛点
        text: >-
          这些位被滥用、含义重叠。VMA_IO_BIT 本该表示 IO 映射，但驱动拿它当别的使、
          mlock 也在滥用；<code>VM_SPECIAL</code> 既用来指「驱动自己管的映射」，又和 VDSO/VVAR
          那种「特殊」、THP 眼里的「特殊」混在一起；THP 的
          <code>vma_is_special_huge()</code> 干脆把 PFN map、mixed map 算特殊，DAX 不算。
          作者原话是 it is all rather a mess。
      - label: 方案
        text: >-
          39 封干三件事。一是把判据从「测位」换成描述行为的谓词：
          <code>vma_is_mm_managed()</code>（内容由核心 mm 建立并管理）、
          <code>vma_is_mm_backed()</code>（由核心 mm 自己的 fault 路径填充）、
          <code>vma_is_fixed_mapping()</code>（不许扩展或合并）、
          <code>vma_can_merge()</code>。二是立不变量：mm 管理的映射不许设 VMA_IO_BIT、不许清
          VMA_MAYWRITE_BIT，并在每次 mmap / <code>mmap_prepare</code> 钩子之后校验 VMA 状态——
          为把 usbmon 和 scsi sg 挪到 <code>mmap_prepare</code>，新增了一个「映射不连续内核页」
          的 mmap action，hfi1 与 ALSA 的状态页改成提前映射。三是要求映射内核内存时必须带
          VMA_MIXEDMAP_BIT，补上 defio、cmt_speech、uprobes、bpf arena 这几处此前的遗漏。
      - label: 为什么
        text: >-
          因为「测哪一位」本身不含语义：同一位在不同代码里代表不同的事，读的人只能靠猜。换成
          谓词之后，判断的是<strong>这个映射是什么</strong>，而不是「它碰巧设了哪个位」。
      - label: 效益
        text: >-
          跨 15+ 子系统的收口：usb/mon、scsi sg、infiniband hfi1、ALSA、selinux、defio、
          uprobes、bpf、HSI cmt_speech、udmabuf 都被这一版摸过。对驱动作者来说，能做的事变少了
          （不许随便动标志位），但「能做什么」写清楚了。
      - label: 下一步
        text: >-
          已到 v6，同批还夹了一份 udmabuf 的报告（hugetlb memfd 上未对齐 offset 会把缓冲区
          大小算错、数据落到错误的 folio 偏移）。akpm 昨天也回了帖，说明这套东西正被认真过。
    verdict: 这类「把隐式约定写成显式判据」的改动不会带来任何性能数字，但它决定后来者写驱动时会不会踩到别人踩过的坑。
    link: "https://lore.kernel.org/dri-devel/<20261013-b4-mmap-prepare-vma-flag-sanify-v6-0-1aa3c9b139f9@kernel.org>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "一颗驱动管一族传感器：imx678 改写成通用 Sony Starvis 2 驱动"
    meta: "〔10-15 23:57 北京〕· [PATCH v4 00/16] Update imx678 to act as a common Sony Starvis 2 driver."
    points:
      - label: 定位
        text: >-
          V4L2 的 sensor 驱动层：一颗传感器一份驱动的老写法。IMX678 属于 Sony 的
          <strong>Starvis 2</strong> 家族，同族还有 IMX585、IMX832 等，寄存器模型高度相似。
      - label: 做法
        text: >-
          v4 把 imx678 驱动重写成<strong>通用 Starvis 2 驱动</strong>，再用它带上 IMX832、
          IMX585 等同族成员，并把曝光的最小值与步长参数化；DT 绑定同步扩到家族成员。
      - label: 效益
        text: >-
          从「一颗传感器一份驱动」变成「一族传感器一份驱动」。这是 media 里很典型的收敛：
          同族硬件的差异被收进参数与数据表，而不是复制一份驱动。
    relevance: 相机工程师的日常就是给新 sensor 写驱动。这条展示了上游更愿意收什么样的写法——同族复用一套寄存器模型，而不是每颗各写一份。
    link: "https://lore.kernel.org/linux-media/<20261015-media-starvis2-v4-0-75fcdb4163f3@raspberrypi.com>/"

  - type: highlight
    title: "Mira016 一天从 v6 到 v7：新传感器驱动在被快速磨"
    meta: "〔10-15 21:22 北京〕· [PATCH v7 0/2] media: i2c: Add driver for Mira016"
    points:
      - label: 定位
        text: >-
          i2c 上挂的 sensor 驱动 + 对应的 DT 绑定，两封一组，是媒体子系统最常见的提交形状。
      - label: 做法
        text: >-
          新增 Mira016 这颗图像传感器的驱动与 dt-bindings。同一天从 v6 发到 v7，说明回帖里的
          意见在就地改。
      - label: 效益
        text: >-
          上游多一颗传感器，下游的板子就少一份 out-of-tree 驱动。当天两个版本号本身也是信号：
          维护者在认真看。
    relevance: 想投第一颗 sensor 驱动的，这类 v6/v7 的系列是最好的教材——看每一版改了什么，就知道维护者在意什么。
    link: "https://lore.kernel.org/linux-media/<20261015-mira016-v7-0-828c931c5550@ideasonboard.com>/"

  - type: highlight
    title: "R-Car 的 ISP：不存在的核，不该被当成注册失败"
    meta: "〔10-15 08:42 北京〕· [PATCH v2 0/2] media: rcar-isp: fix core registration and IRQ lifetime"
    points:
      - label: 定位
        text: >-
          Renesas R-Car 的 ISP 驱动，落在 media pipeline 的采集/处理节点这一层。一颗 SoC 上
          可能有不只一个 ISP 核，DT 里未必全启用。
      - label: 做法
        text: >-
          两封：把「核本来就不存在」和「注册失败」区分开——此前两者被当成同一件事处理；
          另一个是中断生命周期——在销毁 RPPX1 之前先释放核中断。
      - label: 效益
        text: >-
          前者让 probe 不再对缺失的核报错，后者是典型的「谁先谁后」问题：顺序反了就是
          use-after-free 的温床。
    relevance: 「区分不存在与失败」和「释放顺序」这两类问题，在任何多层 probe 的驱动里都会遇到，不限于 media。
    link: "https://lore.kernel.org/linux-media/<20261015004159.2202899-1-mhun512@gmail.com>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "显示硬件归固件所有：Qualcomm 用 13 封给 MSM 接上一个固件显示器"
    meta: "〔10-15 15:38 北京〕· [PATCH 00/13] drm/msm/dcp: Add Qualcomm DCP display support"
    points:
      - label: 定位
        text: >-
          DRM 的 KMS 对象模型（connector / CRTC / plane / encoder 四件套）与 drm_bridge 链。
          传统上 Linux 直接写显示寄存器；这里换了个前提——<strong>显示管线归固件所有</strong>。
      - label: 做法
        text: >-
          新增 <code>drm/msm/dcp</code>：Linux 通过 <strong>VirtIO</strong> 与 DCP 固件通信，
          用 <strong>HFI</strong> 协议做能力发现、命令响应与显示事件；DRM 的原子状态被翻译成
          HFI 属性下发（图层配置、带宽与时钟、帧序列与触发），VSYNC 与 frame-scan 完成事件
          回传给 DRM 做 vblank / page-flip。DT 绑定里包含 VirtIO-MMIO 功能、IOVA 范围、
          分离的传输与 framebuffer IOMMU 上下文、IPCC 电源通知。
      - label: 效益
        text: >-
          关键设计是<strong>不新开一个 DRM 设备</strong>：DCP 作为 MSM 的 KMS backend 接进去，
          用户态看到的还是那个 MSM DRM 设备，正常 DRM/KMS 语义都保留。已在 Qualcomm Hawi MTP
          上带 NT37801 面板测过。
    relevance: 相机侧也有同样的模式（固件管 ISP、Linux 管框架）。这条是「内核做翻译层、固件做硬件」在显示上的完整样本，值得和相机链路的固件路径对照着读。
    link: "https://lore.kernel.org/linux-media/<20261015-jshekhar-drm-msm-dcp-v1-v1-0-48aad0fe4f72@oss.qualcomm.com>/"

  - type: highlight
    title: "内核不该只记得「我写过什么」：DRM 的状态读回磨到 v6"
    meta: "〔10-15 23:09 北京〕· [PATCH v6 00/28] drm: Implement state readout support（Maxime Ripard）"
    points:
      - label: 定位
        text: >-
          DRM 的 atomic 状态模型：内核维护一份「我想让硬件变成什么样」的状态，提交下去。
          问题是<strong>硬件现在实际是什么样</strong>，内核往往不知道——尤其是在 bootloader
          已经点过屏、或出过错之后。
      - label: 做法
        text: >-
          新增 <strong>SRO</strong>（state readout）支持：一组驱动钩子把硬件当前状态读回成
          DRM 状态，并配有比较状态的 helper。v6 里补了 bridge / display-connector 与 tidss 的
          readout、初始化失败路径、打印时带上 bridge 名字，还加了文档节。tidss（SK-AM62 板）
          是第一个完整实现。
      - label: 效益
        text: >-
          读回正确之后，第一帧的模式设置不会再和 bootloader 已设的打架；不一致时能正常切换。
          对嵌入式（DPI→HDMI bridge、drm_bridge_connector 那套）意义最直接。
    relevance: 「内核对硬件当前状态的认知」是显示和相机共同的痛点——相机侧 CSI 接收端也常要读回 link 状态来判断链路是否活着。
    link: "https://lore.kernel.org/dri-devel/<20261015-drm-state-readout-v6-0-6cc02cd10998@kernel.org>/"

  - type: highlight
    title: "75 封一次改完：DRM connector 的 reset 回调退场"
    meta: "〔10-15 15:59 北京〕· [PATCH 00/75] drm/connector: Convert all drivers to atomic_create_state and remove reset"
    points:
      - label: 定位
        text: >-
          DRM connector 的状态创建路径。历史上每类 connector 各有一套 <code>reset</code>
          回调来初始化状态。
      - label: 做法
        text: >-
          75 封把所有驱动迁到统一的 <code>atomic_create_state</code>，然后<strong>删掉 reset
          回调</strong>。这种量级的系列通常拆成「先加新路径、再逐个迁移、最后删旧接口」三步。
      - label: 效益
        text: >-
          connector 状态只有一条创建路径。对驱动作者意味着：新写一个 connector 不必再猜该实现
          哪个回调。
    relevance: 「先加新接口、迁完全部调用者、再删旧接口」是内核里最标准的重构三段式，75 封这个体量可以当范本看。
    link: "https://lore.kernel.org/dri-devel/<20261014-drm-no-more-connector-reset-v1-0-586c9c026823@kernel.org>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "MGLRU 学会按「访问频率」提升页面：v4 带上了实测数字"
    meta: "〔10-16 02:16 北京〕· [PATCH v4 00/17] mm/mglru: frequency guided promotion (MGLRU-FG) and flag cleanup"
    points:
      - label: 定位
        text: >-
          <strong>MGLRU</strong>（多代 LRU）按「代」组织页面回收，用代之间的轮转区分冷热。
          它决定谁被回收，但「升到新一代」的判据比较粗。
      - label: 做法
        text: >-
          17 封引入<strong>频率引导的晋升</strong>（MGLRU-FG）：用 folio 的 LRU 引用次数
          （访问频率）决定是否晋升，并把相关操作改成基于 LRU refs 的通用 API——包括
          <code>folio_inc_lru_refs</code> 的无锁化、跨代 reparent、active/inactive 计数、
          khugepaged / damon / smaps 的适配，以及一代 flag 清理。
      - label: 效益
        text: >-
          作者给了两组实测。3G memcg 里跑 <code>make -j48</code>（ZRAM swap）：pgpgin 降
          20.5%、pswpin 降 22.4%、refault 降约 22%。FIO zipf 随机读：MGLRU 此前和经典 LRU
          基本打平甚至略差，现在领先 12–16%。
      - label: 下一步
        text: >-
          v2–v3 曾在某些系统上比经典 LRU 更差，这一版明确说回归被消掉了；剩下约 1% 的额外
          系统时间用在晋升工作上。
    relevance: MGLRU 是这几年 mm 里改动最密集的一块。这条值得留意的是它的论证方式——不是讲道理，而是把「比经典 LRU 好在哪」用两套 workload 的数字摆出来。
    link: "https://lore.kernel.org/linux-mm/<20261016-mglru-fg-v4-0-2106750c0bfa@tencent.com>/"

  - type: highlight
    title: "lazyfree 的 THP 又能整块丢掉了（这次先修 UAF）"
    meta: "〔10-16 02:13 北京〕· [PATCH for 7.4-rc2+ 0/7] Re-enable discarding lazyfree THPs at PMD level（NVIDIA）"
    points:
      - label: 定位
        text: >-
          <code>MADV_FREE</code> 这类 lazyfree 页面在回收时可以直接丢弃。对
          <strong>THP</strong>（透明大页）来说，最省事的做法是<strong>整块 PMD 级丢弃</strong>，
          而不是拆成 4K 页一张张处理。
      - label: 做法
        text: >-
          7 封重新启用 PMD 级丢弃 lazyfree THP，系列名里带 anon_vma_uaf_fix——说明这条路上
          此前有 use-after-free，得先把生命周期修好才敢开。标注 for 7.4-rc2+，是奔着当前
          开发周期去的修复。
      - label: 效益
        text: >-
          大页不用为了释放而拆散，回收路径上的开销和碎片都少一截。
    relevance: 「先修生命周期，再恢复优化」是内核里很常见的一对动作。看到系列名里带 fix，就该先读它修的是什么。
    link: "https://lore.kernel.org/linux-mm/<20261015-anon_vma_uaf_fix-v1-0-7b977303b42b@nvidia.com>/"

  - type: highlight
    title: "换内核不丢 tmpfs：liveupdate 把文件也一起带过去"
    meta: "〔10-15 17:38 北京〕· [PATCH v1 0/7] liveupdate: tmpfs preservation and early freeze"
    points:
      - label: 定位
        text: >-
          <strong>liveupdate</strong>（LUO）是<strong>kexec</strong> 换内核时保住运行状态的
          机制——传统 kexec 换内核，用户态进程和内存内容要从头再来。
      - label: 做法
        text: >-
          v1 加两件事：一是给 file handler 加 per-file 的 preserve / retrieve 参数，避免每种
          文件类型都自己造一套 session ioctl；二是把 <code>mm/memfd_luo</code> 从「只能保住
          已 unlink 的 memfd 伪文件」扩到<strong>普通 tmpfs 文件</strong>，用 flag 区分二者、
          互不串味。另有早冻结（early freeze）路径，冻结后又关了会话的可以回滚。
      - label: 效益
        text: >-
          kexec 换内核时的状态保全从「内存页」扩到「文件」——这对需要原地升级又不想重启服务的
          场景是必要的一格。
    relevance: kexec / liveupdate 和相机、显示都无直接关系，但它是「内核如何管理自身生命周期」的一条主线，值得知道它到哪一步了。
    link: "https://lore.kernel.org/linux-mm/<20261015093816.2438942-1-pasha.tatashin@soleen.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "设备注销时，devmem 绑定没拆干净：到 v4 的 RX/TX 收尾"
    meta: "〔10-16 00:39 北京〕· [PATCH net v4 0/4] net: devmem: fix RX and TX binding teardown on device unregistration"
    points:
      - label: 定位
        text: >-
          netdev 的 <strong>devmem</strong>（device memory TCP）：让 NIC 把<strong>设备内存</strong>
          当作接收缓冲区，收包直接落进 GPU / 加速器的显存，省掉一次到主机内存的拷贝。它建立在
          dma-buf 之上，所以内核页与设备页在同一个抽象里共存。
      - label: 做法
        text: >-
          四封针对设备注销路径：queue uninstall 时同步 unmap dma_buf；NETDEV_UNREGISTER 时
          拆掉 TX 绑定；netdevsim 补上 RX / TX 绑定以支持测试；再加一组 selftest 覆盖
          注销场景。
      - label: 效益
        text: >-
          拔卡 / 注销网卡时不再留下悬空的 dma-buf 映射。这类「正常路径都对、卸载路径漏了」的
          问题，只有靠显式的 teardown 测试才拦得住——系列里那组 selftest 就是这个作用。
    relevance: dma-buf 是相机、显示、加速器共用的那层。devmem 把网卡接进来之后，「谁在什么时候 unmap」成了跨子系统的共同问题。
    link: "https://lore.kernel.org/linux-media/<20261015163915.1166043-1-almasrymina@google.com>/"

  - type: highlight
    title: "virtio-net 的校验和又收紧一轮：7 封防硬件撒谎"
    meta: "〔10-15 20:41 北京〕· [PATCH net-next v2 0/7] more virtio-net csum hardening（Michael Tsirkin）"
    points:
      - label: 定位
        text: >-
          <strong>virtio-net</strong> 的接收路径。网卡（这里是虚拟设备）会声明「这个包的校验和
          我已经验过了」，内核据此跳过软件校验。
      - label: 做法
        text: >-
          v2 继续加固校验和相关的判定：对设备声明的状态做更严格的检查，避免一个不可信的后端
          用错误的 flag 让内核跳过本该做的校验。
      - label: 效益
        text: >-
          虚拟化场景里，前端不能无条件相信后端。这类加固不产生新功能，但它决定了 guest 会不会
          把损坏的数据当好的收下。
    relevance: virtio 是所有半虚拟化设备的共同底座，相机/显示在虚拟机里也走 virtio（今天头条里的 DCP 就用了 VirtIO）。这层加固对整个 virtio 家族都有意义。
    link: "https://lore.kernel.org/netdev/<cover.1792067836.git.mst@redhat.com>/"

  - type: highlight
    title: "队列规则里的空转轮次：给 deficit 循环加个界"
    meta: "〔10-16 05:18 北京〕· [PATCH net-next v2 0/3] net/sched: bound the deficit-refill dequeue loops"
    points:
      - label: 定位
        text: >-
          net/sched 的流量整形：<strong>DRR / ETS / SFQ / FQ / fq_codel / fq_pie</strong>
          这些 qdisc 用「赤字」（deficit）轮转——每轮给每个队列补一笔额度，够发就发。
      - label: 做法
        text: >-
          三封给 dequeue 循环加界：<strong>跳过空轮次</strong>，而不是一轮轮空转过去。分两批
          覆盖 drr/ets/sfq 与 fq/fq_codel/fq_pie。
      - label: 效益
        text: >-
          大量空队列时，dequeue 不必做无用轮转。整形器的开销直接落在数据包路径上，这类
          「省掉空转」的改动就是纯赚。
    relevance: 整形器的循环开销和驱动里 RX/TX 环的批处理是同一类问题：路径上每一层都在算「这轮有没有活干」。
    link: "https://lore.kernel.org/netdev/<QDISC-TIAE.v2.r0.20261015163454@mojatatu.com>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "XFS 的写流：把「这批写是一伙的」告诉文件系统"
    meta: "〔10-15 14:34 北京〕· [PATCH v6 0/8] xfs write streams"
    points:
      - label: 定位
        text: >-
          XFS 的写入路径。同一时刻，写前端的多个流（不同进程、不同用途）落在同一块存储上，
          但文件系统看不出它们是几拨人。
      - label: 做法
        text: >-
          v6 引入写流：调用方把「这些写属于同一股流」标出来，文件系统据此组织分配与回写。
          已磨到第六版。
      - label: 效益
        text: >-
          同一流内的写可以聚在一起处理，减少相互干扰。属于「给内核多一点上下文，它才能做更好
          决策」这一类改动。
    relevance: 「上层知道的、下层不知道」是 I/O 栈里的常见信息缺口。写流和块层今天那条 NOWAIT 修复，都是补这类缺口。
    link: "https://lore.kernel.org/linux-fsdevel/<20261015063246.103433-1-joshi.k@samsung.com>/"

  - type: highlight
    title: "fanotify 按类型分家：14 封重构 + 引入 FAN_REPORT_MNTID"
    meta: "〔10-15 22:36 北京〕· [PATCH v3 00/14] Partition the fanotify watchers by type"
    points:
      - label: 定位
        text: >-
          fanotify 是内核给用户态的文件事件通知机制（杀毒软件、备份、同步工具在用）。它内部
          维护着一批 watcher，不同来源的事件此前混在一起管理。
      - label: 做法
        text: >-
          v3 把 watcher <strong>按类型分区</strong>管理，并新增
          <code>FAN_REPORT_MNTID</code>——事件里带上挂载 ID。
      - label: 效益
        text: >-
          分区让事件分发路径不再对着一大堆不相干的 watcher 逐个判断；MNTID 则让用户态能区分
          「同一个路径的不同挂载」，这在容器和 bind mount 场景下是必需的。
    relevance: 挂载 ID 这类「同一路径可能对应不同实体」的坑，在做设备节点、V4L2 设备热插拔时同样会碰到。
    link: "https://lore.kernel.org/linux-fsdevel/<20261015143601.2095784-1-amir73il@gmail.com>/"

  - type: divider
    label: "📰 LSM 安全"
    kind: section
  - type: highlight
    title: "读个文件属性也算读：Landlock 加元数据访问权限"
    meta: "〔10-15 20:19 北京〕· [PATCH v2 -next 00/18] landlock: Add READ_METADATA and WRITE_METADATA access rights"
    points:
      - label: 定位
        text: >-
          Landlock 是<strong>非特权进程也能用</strong>的沙箱 LSM：进程自己给自己和子进程划定
          能访问哪些路径、能做哪些操作。
      - label: 做法
        text: >-
          18 封新增两项权限：<code>READ_METADATA</code> 与 <code>WRITE_METADATA</code>，
          并把各文件系统的统计、属性读写这类操作接进去，配了测试与文档。
      - label: 效益
        text: >-
          此前「能读文件内容」和「能读文件属性」不好分开授权。拆开之后，沙箱可以放行内容读取
          而拦住属性探测——属性本身就是信息泄露面。
    relevance: 权限模型从「读写」细分到「内容 / 元数据」，和相机侧从「能打开设备」细分到「能改哪种格式」是同一个思路。
    link: "https://lore.kernel.org/linux-fsdevel/<20261015125425.3246251-1-caixinchen1@huawei.com>/"

  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "缓冲写的 NOWAIT 回退路径：锁与返回值都得对"
    meta: "〔10-15 17:11 北京〕· [PATCH 0/2] block: fix NOWAIT handling and locking in buffered write fallback"
    points:
      - label: 定位
        text: >-
          块层的缓冲写路径。带 <code>NOWAIT</code> 的写本该不阻塞，但底层做不到时会
          <strong>回退</strong>成阻塞写——这段回退是块层里最容易出错的地方之一。
      - label: 做法
        text: >-
          两封分别处理回退路径上的 <code>NOWAIT</code> 语义与加锁。
      - label: 效益
        text: >-
          回退路径出错的表现往往是「不该阻塞的阻塞了」或「锁序反了」，都属于难复现的类型。
          这类修复的价值在于把边界路径补成和主路径一样可靠。
    relevance: io_uring 之后 NOWAIT 语义被推到更多路径上，块层这几年一直在补这类历史欠账。
    link: "https://lore.kernel.org/linux-block/<20261015091105.1315605-1-sunjunchao@bytedance.com>/"

  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "R-Car Gen4 的根口：链路掉了要能自己爬起来"
    meta: "〔10-15 11:31 北京〕· [PATCH v4 00/18] PCI: rcar-gen4: Recover from link down and route Root Port interrupts"
    points:
      - label: 定位
        text: >-
          PCIe 的 Root Port（根口）是主机侧通往设备的总入口。链路出问题（link down）时，
          设备会从总线上消失。
      - label: 做法
        text: >-
          18 封把 R-Car Gen4 的根口做成能<strong>从 link down 恢复</strong>：<code>link_up()</code>
          检查实时链路状态、Gen5 SoC 的 PHY 初始化失败时拉复位、把硬件初始化与资源获取拆开、
          把 AER / PME / 带宽通知路由到虚拟根口中断、接管 iMSI-RX 中断；另有一封修
          <code>PCI: dwc</code> 在 <code>.deinit()</code> 之后才释放 MSI domain 的顺序问题。
      - label: 效益
        text: >-
          热插拔、线缆抖动、对端复位之后，根口不再需要整机重启才能恢复。对车载/嵌入式这类
          不能随便重启的场景是硬需求。
    relevance: 链路恢复和相机里的 CSI link lock 是同一类问题——物理层掉了之后，上层怎么知道、怎么重建。
    link: "https://lore.kernel.org/linux-pci/<20261015033103.3076869-1-den@valinux.co.jp>/"

  - type: divider
    label: "📰 arch 架构"
    kind: section
  - type: highlight
    title: "x32 ABI 开始退场：v5 先把 Kconfig 关掉"
    meta: "〔10-16 02:47 北京〕· [PATCH v5 0/2] Start removing X86_X32_ABI（Sebastian Andrzej Siewior）"
    points:
      - label: 定位
        text: >-
          <strong>x32 ABI</strong> 是 x86-64 上的一个混合体：用 64 位寄存器与指令，但指针是
          32 位。当年想兼顾「大地址空间」与「少占内存」，实际几乎没人用。
      - label: 做法
        text: >-
          两封起步：Kconfig 里把 <code>X86_X32_ABI</code> 关掉，并移除 nolibc 的 x32 测试用例。
          总共只改 3 个文件、13 行——先断掉入口，再谈删代码。
      - label: 效益
        text: >-
          作者在帖子里给的理由很直接：这个 ABI 没有用户。移除它能省掉内核里一层长期无人维护的
          兼容代码。
      - label: 下一步
        text: >-
          这是「开始移除」，真正删掉 syscall 兼容层与相关代码还在后面——已到 v5，说明讨论过
          几轮。
    relevance: 「没有用户的功能该不该留」是内核的老话题。这条的分量在于它的推进方式：先关开关，再看有没有人喊。
    link: "https://lore.kernel.org/lkml/<20261015-x32_removal-v5-0-2bfef9151fad@linutronix.de>/"

  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "把「只读」写进类型：Rust 的 IO 访问模式"
    meta: "〔10-15 20:39 北京〕· [PATCH 0/7] rust: io: add read-only and write-only views and registers（Collabora）"
    points:
      - label: 定位
        text: >-
          Rust-for-Linux 的 <code>io</code> 抽象层：给 Rust 驱动封装 <code>readl</code> /
          <code>writel</code> 这类寄存器访问。目前的一层封装里，读写权限是运行时的事。
      - label: 做法
        text: >-
          7 封新增只读 / 只写视图与对应的寄存器类型，把访问方向做成<strong>类型参数</strong>。
      - label: 效益
        text: >-
          往只读寄存器里写，或在错误的状态下读一个只写寄存器，从此在编译期就被拦下。这是 Rust
          进内核最常被引用的那类收益：把约定变成编译器能检查的东西。
    relevance: 写驱动的都知道，寄存器手册上的 RO / WO / RW 标注靠人记。这条把它交给类型系统，是 Rust 驱动值得关注的具体进展。
    link: "https://lore.kernel.org/dri-devel/<20261015-io-access-modes-v1-0-93611b84b5e3@collabora.com>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20261015-ov13858-x1e-v1-0-acdd918f4fb6@gmail.com>/"
        text: "media：OV13858 补上设备树支持（Surface Pro 11 后摄，2 封）"
        time: 10-16 05:48
      - link: "https://lore.kernel.org/linux-media/<20261015161134.10425-1-25031212351@stu.xidian.edu.cn>/"
        text: "media：dvb-core / dvb-usb 断连路径的 use-after-free 家族修复（v2，3 封）"
        time: 10-16 00:11
      - link: "https://lore.kernel.org/linux-media/<5b26153a-768a-4b33-bda3-19d3dea88634@app.fastmail.com>/"
        text: "media：maxim-serdes 压缩 max_des_update_streams() 的栈占用（多轮回帖讨论中）"
        time: 10-15 14:45
      - link: "https://lore.kernel.org/linux-mm/<20261015-maple-tree-fix-slab-corruption-v1-0-160d97f7304c@codasip.com>/"
        text: "mm：maple_tree 释放 RCU 模式树时的两个 bug（含 slab 损坏测试，3 封）"
        time: 10-15 23:11
      - link: "https://lore.kernel.org/linux-mm/<20261015-wb-dying-cgwb-flush-v7-0-9278d9ebaf5d@honeycomb.io>/"
        text: "mm：让外部 flush 触达将死的 cgwb（writeback，v7，3 封）"
        time: 10-15 19:40
      - link: "https://lore.kernel.org/netdev/<20261015-dsa_lan9645x_switch_driver_base-v15-0-562f316f78b9@microchip.com>/"
        text: "net：DSA 支持 Microchip LAN9645x 交换机家族（v15，9 封）"
        time: 10-15 16:06
      - link: "https://lore.kernel.org/linux-fsdevel/<20261015093854.2082600-1-huangsj@hygon.cn>/"
        text: "fs：VFS 新增 inode 迭代方法 super_iter_inodes（3 封）"
        time: 10-15 17:40
      - link: "https://lore.kernel.org/linux-block/<20261015-bug-block-elevator-init-quiesce-v2-0-505a2b0b1c07@gmail.com>/"
        text: "block：默认调度器初始化时不必 quiesce 队列（v2，2 封）"
        time: 10-15 09:52

  - type: divider
    label: "📌 机制雷达：6 条跨域改动"
    kind: primary
  - type: toc
    items:
      - label: 把判据换成谓词
        text: "mm 的 39 封把 VMA 判断从「测标志位」换成 vma_is_mm_managed / vma_is_mm_backed / vma_is_fixed_mapping / vma_can_merge，并在每次 mmap 钩子后校验状态 · <a href=\"https://lore.kernel.org/dri-devel/<20261013-b4-mmap-prepare-vma-flag-sanify-v6-0-1aa3c9b139f9@kernel.org>/\">原文</a>"
      - label: 内核学会读回硬件状态
        text: "DRM 的 atomic_sro：驱动钩子把硬件当前状态读回成 DRM 状态，配状态比较 helper；同期 75 封把 connector 统一到 atomic_create_state 并删掉 reset · <a href=\"https://lore.kernel.org/dri-devel/<20261015-drm-state-readout-v6-0-6cc02cd10998@kernel.org>/\">原文</a>"
      - label: 显示硬件归固件
        text: "Qualcomm DCP：Linux 经 VirtIO 用 HFI 协议与固件通信，把 DRM 原子状态翻译成固件命令；DCP 作为 MSM 的 KMS backend，不新开 DRM 设备 · <a href=\"https://lore.kernel.org/linux-media/<20261015-jshekhar-drm-msm-dcp-v1-v1-0-48aad0fe4f72@oss.qualcomm.com>/\">原文</a>"
      - label: 按频率决定晋升
        text: "MGLRU-FG：用 folio 的 LRU 引用次数引导页面晋升，并把 LRU 操作改成基于引用的通用 API；附 make -j48 与 FIO zipf 两套实测 · <a href=\"https://lore.kernel.org/linux-mm/<20261016-mglru-fg-v4-0-2106750c0bfa@tencent.com>/\">原文</a>"
      - label: 权限写进类型
        text: "Rust io 抽象新增只读 / 只写视图与寄存器类型，把寄存器手册上的 RO / WO 约定交给编译器检查 · <a href=\"https://lore.kernel.org/dri-devel/<20261015-io-access-modes-v1-0-93611b84b5e3@collabora.com>/\">原文</a>"
      - label: 换内核不丢状态
        text: "liveupdate（LUO）把 kexec 换内核时的状态保全从内存页扩到 tmpfs 文件，并给 file handler 加 per-file preserve / retrieve 参数 · <a href=\"https://lore.kernel.org/linux-mm/<20261015093816.2438942-1-pasha.tatashin@soleen.com>/\">原文</a>"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: D-PHY
        text: MIPI 相机的物理层主流方案。每条 lane 是一对差分线，时钟另走一对，收发双方靠明确的时钟对齐——链路简单，但线多、时钟速率是瓶颈。
      - label: C-PHY
        text: MIPI 的另一套物理层。三根线一组（trio），时钟嵌进数据里编码，同样的线数能跑更高吞吐。代价是编解码复杂、时序约束不同，内核此前没有通用的 C-PHY 模式。
      - label: trio
        text: C-PHY 的线路单位，三条线一组。今天那条补丁里「一条 C-PHY trio 跑 2.4 Gsym/s」，说的就是一组线的符号率。
      - label: CAMSS / CSIPHY / CSID
        text: Qualcomm 的相机子系统三层。CSIPHY 是物理层接口，CSID 是 CSI 解码器（把 CSI-2 包解出来），CAMSS 是把它们串成采集管线的驱动。
      - label: v4l2_subdev
        text: V4L2 里「管线中的一个节点」的抽象。sensor、CSI 接收端、ISP 都是 subdev，彼此通过 media controller 描述的图连起来。
      - label: VMA
        text: 虚拟内存区域。每次 mmap 都会产生一个 VMA，它记录这段地址的权限、背后的文件或设备、以及一系列行为标志位。
      - label: VM_SPECIAL
        text: 一个含义被用滥的标志位组合。今天 mm 那 39 封的核心动作之一，就是把它拆成几个说清行为的谓词。
      - label: mmap_prepare
        text: 新的 mmap 钩子，替代旧的 mmap 回调：驱动在这里设定映射动作，而不是直接改 VMA 状态，内核随后统一校验合法性。
      - label: MGLRU
        text: 多代 LRU。按「代」组织页面回收，用代间轮转区分冷热页面，比传统两级 LRU 更能分辨访问模式。
      - label: SRO（state readout）
        text: DRM 的状态读回。让驱动把硬件当前实际状态读成 DRM 状态，解决「内核只记得自己写过什么、不知道硬件现在是什么」的问题。
      - label: HFI
        text: Qualcomm 固件接口协议。DCP 用它做能力发现、模式设置与显示事件上报，Linux 侧只负责把 DRM 操作翻译成 HFI 命令。
      - label: kexec / liveupdate
        text: kexec 是不经固件直接换一个新内核启动；liveupdate 在它之上做状态保全，让换内核时内存页、文件描述符能带过去。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
