---
title: "编一遍内核快 36%、空转只要 1.4 秒：kbuild 22 帖大修；小米在 RK3588 上把 vmap 提速 8.3 倍"
date: "2026-09-24"
desc: "kbuild 22 帖：全量构建提速 36%、增量 70%；RK3588 实测 vmap 提速 8.3 倍；高通相机离线处理引擎 OPE 到 v9。"
column: "daily"
tags: ["mm", "media", "DRM", "PCI", "net", "fs", "Rust", "block", "sched"]
blocks:
  - type: hook
    text: >-
      今天两条头条都关于「省时间」：<strong>Lorenzo Stoakes 的 kbuild 22 帖把内核全量构建提速最多 36%、空转构建从 15 秒压到 1.4 秒</strong>——
      每个编译内核的人都受益；另一条，<strong>小米的 vmalloc 加速系列到 v9，在 RK3588 上实测 vmap 提速 8.3 倍</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-24/cover.png"
    alt: "封面 · 9月24日 · 内核编译提速90%"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "kbuild 22 帖：全量构建 -36%、增量 -70%、空转 -90%，九种架构逐一验证"
      - label: "头条"
        text: "mm/vmalloc v9：连续内存走大映射，RK3588 实测 vmap(100MB) 快 8.3 倍"
      - label: "media"
        text: "高通 CAMSS 离线处理引擎 OPE 到 v9；索尼 IMX681 传感器驱动 v7"
      - label: "DRM"
        text: "nova-core 两条系列推进；drm/msm 支持 Hawi & Maili GPU（15 帖）"
      - label: "mm"
        text: "LUO 新增 tmpfs 文件保留——作者明说这个 RFC 是 LLM 起草的"
      - label: "PCI"
        text: "arm-smmu-v3：ATC 失效超时就把设备隔离（v6，17 帖）"
      - label: "net"
        text: "Meta 自研网卡 mpnic 首次上游（8 帖）；mlx5 为嵌套 E-switch 铺路（13 帖）"
      - label: "机制"
        text: "dma-fence 弃用 wait/release 回调、THP split 助手解耦 v6、dyndbg classmaps 38 帖"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-24/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-24 06:23 北京，近 24h 各板块真实计数：net 603 · mm 361 · DRM 303 · media 243 ·
      PCI 196 · fs 129 · Rust 98 · arch 90 · block 45 · LSM 29 · rt 7 · virtio 0。
      net 依旧第一但以驱动修复流为主；mm 的 361 里 vmalloc 加速与 huge_memory 重构两条大系列贡献显著；
      media 的 243 由高通 CAMSS OPE、IMX681 与两条 Hawi/Maili 平台系列撑起。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "编内核的人都有福了：kbuild 22 帖，全量构建快 36%、空转快 90%"
    meta: "〔09-24 01:18 北京〕· [PATCH v4 00/22] kbuild: significantly speed up kernel builds（rust-for-linux 等跨投）"
    points:
      - label: 现状
        text: >-
          一次典型的内核构建，有大量时间卡在<b>单线程瓶颈</b>上——并行编译结束后，
          还有一串串行步骤（符号处理、模块打包、压缩）在拖尾。
      - label: 痛点
        text: >-
          机器越快、核越多，这段串行拖尾占比越刺眼：改动一行代码后的增量构建、
          甚至什么都没改的空转构建，都要等上一段「明明没活干」的时间。
      - label: 方案
        text: >-
          Lorenzo Stoakes 的 22 帖系统性地拆掉这些串行点。实测（Threadripper 9980X /
          双路 EPYC 9754 / M2 MacBook）：<b>allmodconfig 全量构建最多 -36%（EPYC gcc），
          增量构建最多 -66%，空转构建最多 -95%（30.6s → 1.5s）</b>。
      - label: 为什么
        text: >-
          不是单点奇技，而是把构建流水线逐段体检后的组合拳——每帖附带各自的性能数字，
          谁贡献多少一目了然。依赖 module、objtool、hardening 三条已先行合入的前置系列。
      - label: 效益
        text: >-
          所有编内核的人：CI 农场省机时，开发者本地「改一行马上验证」的循环明显变快。
          测试覆盖 x86/arm64/arm/riscv/powerpc64/s390/loongarch/m68k/parisc 九种架构，
          System.map 与旧实现逐字节一致，qemu 全部能起。
      - label: 下一步
        text: >-
          v4 阶段，kbuild 维护者 Nathan Chancellor 已把部分帖预演进 kbuild-next-speedups 分支，
          作者正与其对齐合入细节。按这个验证完成度，进主线只是时间问题。
    verdict: 对天天编内核的人来说，这是今年获得感最直接的一个系列——它不改变内核行为，只改变你等构建的时间。
    link: https://lore.kernel.org/rust-for-linux/<20260923-build-speedup-v4-0-73128809a4a4@kernel.org>/
  - type: headline
    title: "小米把 vmap 提速 8.3 倍，测试机是你手上的那块 RK3588"
    meta: "〔09-23 14:28 北京〕· [PATCH v9 00/10] mm/vmalloc: Speed up ioremap, vmalloc and vmap with contiguous memory（linux-mm）"
    points:
      - label: 现状
        text: >-
          ioremap/vmalloc/vmap 建映射时，即使物理内存是连续的，内核也按 4K 小页
          <b>逐页填页表</b>；vmap 此前还不支持 PMD 大映射与 cont-PTE（连续页表项）优化。
      - label: 痛点
        text: >-
          大区间映射（驱动 ioremap 显存/寄存器区、vmap 大缓冲）要反复走页表遍历，
          每一级 walk 都是纯开销；ARM64 的 cont-PTE 硬件特性在 vmap 路径上完全没用上。
      - label: 方案
        text: >-
          10 帖两手抓：一是<b>消除页表重复遍历</b>，多页一次设置 PTE/PMD；
          二是让 vmap 支持大映射。前置动作值得点名：把 cont-PTE 块映射从 HugeTLB 里
          <b>解耦出来</b>——以前它复用 set_huge_pte_at()，CONFIG_HUGETLB_PAGE=n 的内核
          会静默失去这个优化。
      - label: 为什么
        text: >-
          解耦而非继续复用 HugeTLB 助手，是因为两者语义本就不同；继续耦合的下场就是
          「功能在不在取决于一个不相干的配置项」。新增 pte_set_huge()/pte_clear_huge()
          家族（arm64、powerpc/8xx 实现 + 通用兜底），与既有 pmd/pud_set_huge() 对齐。
      - label: 效益
        text: >-
          RK3588（8 核 ARM64）实测：ioremap(1MB) 快 1.35 倍，<b>vmap(100MB、order-8 页)
          快 8.3 倍（1235µs → 149µs）</b>。驱动做设备内存映射、ARM trace 大缓冲这类
          场景直接受益。
      - label: 下一步
        text: >-
          已到 v9，ARM64 路径有 Leo Yan 等人实测背书。剩余看点是更多架构跟进
          pte_set_huge() 实现，以及评审对大映射对齐校验细节的收敛。
    verdict: 基准跑在 RK3588 上——你调 camera 时 ioremap 的那点耗时，以后可能就按这个系列的标准来要求了。
    link: https://lore.kernel.org/linux-mm/<20260923062832.479455-1-jiangwen6@xiaomi.com>/
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "高通相机管线长出「离线处理引擎」：CAMSS OPE 到 v9"
    meta: "〔09-24 00:00 北京〕· [PATCH v9 0/9] media: qcom: camss: CAMSS Offline Processing Engine support"
    points:
      - label: 定位
        text: >-
          CAMSS 是高通平台的相机子系统驱动，此前只管「采集」。OPE（Offline Processing
          Engine）是 Agatti 一代 SoC 里的硬件图像处理块——<b>不在实时采集管线上</b>，
          从内存读帧、做 debayer/色彩校正/缩放、再写回内存。
      - label: 做法
        text: >-
          9 帖新增独立 OPE 驱动：自带时钟与电源域（CAMSS GDSC 和 CX），不动 CAMSS 本体；
          帧来源不限于 CAMSS 的 RDI/PIX 路径，任何能提供内存缓冲的生产者都能喂它。
          硬件能力 580Mpix/s，够处理 4K@60 或四路 1080p@60。
      - label: 效益
        text: >-
          高通平台第一次有了「采集之外的硬件图像处理」上游路径，Arduino UNO-Q 这类
          Agatti 板子直接受益；用户态 libcamera 的 OPE 支持已由 Hans 同步提交。
      - label: 下一步
        text: >-
          当前只实例化单处理上下文（首次打开 media pipeline 时创建），多上下文留给
          V4L2/media 框架层的后续支持。
    relevance: 这就是 ISP 离线（offline）通路的标准上游做法——独立设备、内存进内存出、自己管电源。你以后评估「抓完再处理」类需求时，这系列是现成参照。
    link: https://lore.kernel.org/linux-media/<20260923-camss-isp-ope-v9-0-86a75dc18b83@oss.qualcomm.com>/
  - type: highlight
    title: "索尼 IMX681 传感器驱动到 v7：一天连发两版"
    meta: "〔09-24 05:18 北京〕· [PATCH v7 0/3] Add support for the Sony IMX681 camera sensor"
    points:
      - label: 定位
        text: >-
          IMX681 是索尼的笔记本/移动设备图像传感器。3 帖结构标准：DT 绑定 +
          i2c 传感器驱动 + ipu-bridge（Intel IPU 平台桥接层）接入。
      - label: 做法
        text: >-
          v6 到 v7 相隔不到两小时，节奏说明评审反馈在快速收敛；
          Sakari Ailus（media 核心维护者）在逐版给意见。
      - label: 效益
        text: >-
          走 ipu-bridge 意味着它是为 Intel IPU6 平台的笔记本摄像头铺路——
          这类「传感器驱动 + 桥接层描述」的二段式是 IPU 平台接入新 sensor 的固定动作。
    relevance: 写 sensor 驱动的标准三件套（绑定/驱动/桥接）可以照这个系列抄结构；v6→v7 的快速迭代也值得看看维护者在抠哪些细节。
    link: https://lore.kernel.org/linux-media/<20260923211816.89954-1-lsa.uz@pm.me>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-media/<20260923-hawi-maili-camss-v1-0-cbbb42e534ef@oss.qualcomm.com>/
        text: "高通 Hawi/Maili 平台：CAMSS + S5KJN5 传感器支持 RFC（15 帖），与 DRM 侧 msm GPU 系列同日配套发出"
        time: 09-23 19:02
      - link: https://lore.kernel.org/linux-media/<20260923092454.969-1-25031212351@stu.xidian.edu.cn>/
        text: "dvb-core/dvb-usb：修复设备使用中拔线导致的一组 use-after-free（3 帖）"
        time: 09-23 17:25
      - link: https://lore.kernel.org/linux-media/<20260923-hdmirx-media-v1-0-ea3d77d4a5f3@pengutronix.de>/
        text: "Synopsys HDMI RX：支持在接收器前挂 HDMI bridge（9 帖）"
        time: 09-23 21:44
      - link: https://lore.kernel.org/linux-media/<20260923081246.268182-1-kyrie.wu@mediatek.com>/
        text: "MT8189 视频编解码器支持到 v10（10 帖）"
        time: 09-23 16:12
      - link: https://lore.kernel.org/linux-media/<arQxC3DmDyVIGdqq@collins>/
        text: "V4L2 H.264 无状态编码 + VC8000E 支持（14 帖）进入维护者评审"
        time: 09-24 04:15
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "drm/msm：Hawi & Maili 两个新平台的 GPU 支持（15 帖）"
    meta: "〔09-23 18:26 北京〕· [PATCH 00/15] drm/msm: Support for Hawi & Maili GPU"
    points:
      - label: 定位
        text: >-
          msm 是高通 SoC 的 DRM 显示/GPU 驱动。Hawi 与 Maili 是两个新平台代号——
          同一天 media 侧也发了这两个平台的 CAMSS 相机系列，是整套平台上游化的一部分。
      - label: 做法
        text: >-
          15 帖把新平台的 GPU 识别、时钟/电源与管线配置接进 msm 既有框架。
      - label: 效益
        text: >-
          新平台从图形到相机同日配齐上游支持，发行版与 libcamera 生态可以同步跟进。
    relevance: 平台级上游化的标准节奏：GPU、相机、传感器三线同日发出——观察高通次新平台怎么进主线，这是现成样本。
    link: https://lore.kernel.org/dri-devel/<20260923-hawi-gpu-v1-0-0c3c79a1a470@oss.qualcomm.com>/
  - type: highlight
    title: "nova-core 双线推进：GSP 日志留存 v5、falcon 寄存器抽取 v3"
    meta: "〔09-23 12:56 北京〕· [PATCH v5 0/3] gpu: nova-core: retain the GSP-RM log buffers"
    points:
      - label: 定位
        text: >-
          nova 是 NVIDIA GPU 的 Rust 开源驱动（内核侧 nova-core）。GSP-RM 是 GPU 上的
          固件管理器，它的日志是定位固件级问题的主要抓手。
      - label: 做法
        text: >-
          v5 三帖把 GSP-RM 的日志缓冲<b>保留下來</b>而不是用完即弃；
          同日另有 falcon（GPU 上的嵌入式微控制器）寄存器抽取系列到 v3。
      - label: 效益
        text: >-
          固件出问题时第一现场还在——对早期驱动来说，可调试性就是开发速度。
    relevance: Rust 写 GPU 驱动的进展节奏值得持续跟；它的抽象边界（固件接口、寄存器访问）做法对任何驱动都有参照价值。
    link: https://lore.kernel.org/dri-devel/<20260923045551.229259-1-vladazaharova2018@gmail.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/dri-devel/<20260923-dd-cmap-part2-clean-v11-0-9b6c217fdf2f@gmail.com>/
        text: "dyndbg classmaps API 修复 + 查询扩展 + 自测，v11 共 38 帖（详见机制雷达）"
        time: 09-24 06:34
      - link: https://lore.kernel.org/dri-devel/<20260923052937.22817-1-xizheTang2005@163.com>/
        text: "i915：仅在 VRR 启用时才发 AS SDP——修 Panther Lake eDP 自 v7.2 以来的竖纹问题"
        time: 09-23 15:54
      - link: https://lore.kernel.org/dri-devel/<20260923201035.51007-1-maximpedraza@gmail.com>/
        text: "设备树供应开机 logo（v3，7 帖）"
        time: 09-24 04:10
      - link: https://lore.kernel.org/dri-devel/<20260923135012.1823971-1-qwe.aldo@gmail.com>/
        text: "vmwgfx：补上 surface 引用 ioctl 的 TOCTOU 窗口；qxl 两处修复"
        time: 09-23 21:50
      - link: https://lore.kernel.org/dri-devel/<20260923140844.390822-1-thomas.hellstrom@linux.intel.com>/
        text: "drm/xe：防止模块被过早卸载（3 帖）"
        time: 09-23 22:09
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "LUO 学会保留 tmpfs 文件——作者坦白：这个 RFC 主要是 LLM 写的"
    meta: "〔09-24 06:44 北京〕· [RFC PATCH 0/6] luo: tmpfs preservation（linux-mm）"
    points:
      - label: 定位
        text: >-
          LUO（Live Update Orchestrator）负责内核现场更新时跨重启保留状态。
          已支持 memfd 保留，但 memfd 不能挂到用户可见的文件系统路径。
      - label: 做法
        text: >-
          6 帖允许保留一个 tmpfs 挂载点，再逐个保留其中的文件——无盘主机上
          虚拟机管理包的现场更新就不用走慢速网络拉取。复用 memfd 保留的大部分
          逻辑，只加文件与挂载元数据；暂不支持子目录与复杂挂载特性。
      - label: 效益
        text: >-
          作者 Pratyush Yadav 明说这个 POC「主要由 LLM 生成」，自己做了大幅清理
          （1600 行砍到 977 行）并通读全部代码——内核邮件列表上少见的坦白，
          也是「LLM 辅助写内核代码」的一次公开试水。
    relevance: 比起 tmpfs 保留本身，「作者主动披露 LLM 参与度并接受评审检验」这件事对社区的示范意义更大——以后你评审或提交 LLM 辅助的补丁，这就是参照格式。
    link: https://lore.kernel.org/linux-mm/<20260923224408.3745689-1-pratyush@kernel.org>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-mm/<20260922235830.2350770-1-gourry@gourry.net>/
        text: "madvise：cold 与 pageout 的页表遍历重构（10 帖）"
        time: 09-24 07:58
      - link: https://lore.kernel.org/linux-mm/<20260923211041.3127588-1-gourry@gourry.net>/
        text: "RFC：alloc_flags 穿透 folio/filemap/批量分配器（6 帖）"
        time: 09-24 05:10
      - link: https://lore.kernel.org/linux-mm/<20260923-slub_tiny_rework-v1-0-a0e66d536eb5@kernel.org>/
        text: "RFC：用 slab_tiny 启动参数替代 CONFIG_SLUB_TINY（8 帖）"
        time: 09-23 23:45
      - link: https://lore.kernel.org/linux-mm/<202609230824.7a9189aa-lkp@intel.com>/
        text: "回归报告：secretmem 补丁致 stress-ng secretmem  ops 吞吐跌 99.5%"
        time: 09-24 09:01
      - link: https://lore.kernel.org/linux-mm/<20260923101454.5748-1-sj@kernel.org>/
        text: "damon：配额目标度量补集标志（RFC v3，7 帖）"
        time: 09-23 18:15
  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "arm-smmu-v3：ATC 失效超时？把这个设备隔离了再说"
    meta: "〔09-24 04:12 北京〕· [PATCH v6 00/17] iommu/arm-smmu-v3: Quarantine device upon ATC invalidation timeout"
    points:
      - label: 定位
        text: >-
          SMMUv3 是 ARM 平台的 IOMMU。ATC（地址转换缓存）失效命令超时，
          意味着设备的转换状态已经不可信——继续让它做 DMA 就是放任它乱写内存。
      - label: 做法
        text: >-
          17 帖（NVIDIA，v6）在检测到 ATC 失效超时后把设备<b>隔离（quarantine）</b>：
          切断它的 DMA 能力，而不是寄希望它自己恢复正常。
      - label: 效益
        text: >-
          故障设备从「定时炸弹」变成「已拆除」——虚拟化直通场景里这是最基本的
          安全边界。
    relevance: IOMMU 的故障隔离逻辑和你链路上「设备失联怎么办」是同一类问题——区别只在它是协议层、你是物理层。
    link: https://lore.kernel.org/linux-pci/<cover.1790188510.git.nicolinc@nvidia.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-pci/<20260923022511.24932-1-navonjohnlukose@gmail.com>/
        text: "PCI/PM：设备已 runtime 挂起时，跳过 suspend_noirq 阶段的配置空间保存"
        time: 09-23 10:25
      - link: https://lore.kernel.org/linux-pci/<20260923072237.1139013-1-mmaddireddy@nvidia.com>/
        text: "tegra194：修 EP 与 Root Port 的一组边角问题（11 帖）"
        time: 09-23 15:19
      - link: https://lore.kernel.org/linux-pci/<20260923072554.1141864-1-mmaddireddy@nvidia.com>/
        text: "dwc EP：PERST# 复位时不再做全量清理（3 帖）"
        time: 09-23 15:26
      - link: https://lore.kernel.org/linux-pci/<20260923043023.3150498-1-namjain@linux.microsoft.com>/
        text: "x86/irq：修 CPU 热拔出时丢中断（v6，4 帖）"
        time: 09-23 12:30
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "Meta 自研网卡首次上游：mpnic 8 帖"
    meta: "〔09-23 09:43 北京〕· [PATCH net-next 0/8] eth: mpnic: initial support for Meta Platforms NIC"
    points:
      - label: 定位
        text: >-
          数据中心自研网卡是云厂商的常规动作（AWS 有 EFA、Google 有 gve）。
          Meta 的自研 NIC 此前未见上游，这是第一次。
      - label: 做法
        text: >-
          8 帖搭出驱动骨架并接入基本收发路径。首版系列的价值在「定框架」——
          队列模型、与固件的通信方式都在这一步定型。
      - label: 效益
        text: >-
          又一家超大厂把自研硬件送上主线：对内核是新的驱动用户，对业界是
          「自研 NIC 上游化」趋势的又一例证。
    relevance: 新驱动骨架系列是读「现代网卡驱动怎么搭」的好材料——比读成熟驱动的历史包袱清爽得多。
    link: https://lore.kernel.org/netdev/<20260922-linux-mpnic-v1-0-236844f53072@gmail.com>/
  - type: highlight
    title: "mlx5 为嵌套 E-switch 铺路：13 帖前置重构"
    meta: "〔09-23 18:40 北京〕· [PATCH net-next 00/13] net/mlx5: Preparations for nested E-switch"
    points:
      - label: 定位
        text: >-
          E-switch 是 Mellanox/NVIDIA 网卡内置的以太网交换机抽象，SR-IOV 虚机
          网络的转发层。「嵌套」指虚机里再开虚机的多层场景。
      - label: 做法
        text: >-
          13 帖全是前置整理——不动功能，先把表示与查找路径改造成可嵌套的形态。
      - label: 效益
        text: >-
          云厂商多层虚拟化的网络卸载有了上游路线；先做纯重构再动功能，
          也是大改动的标准安全打法。
    relevance: 「13 帖重构只为后面的功能铺路」——大系列怎么拆，这是教科书式示范。
    link: https://lore.kernel.org/netdev/<20260923103830.1183-1-tariqt@nvidia.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/netdev/<20260923-qcom_xpcs_nord_emac-v1-0-4b1c682af70f@oss.qualcomm.com>/
        text: "RFC：高通 XPCS 支持 + Nord Ethernet 接线（9 帖）"
        time: 09-23 09:08
      - link: https://lore.kernel.org/netdev/<20260923-allwinner-a733-gmac-support-v3-0-15735155a789@baylibre.com>/
        text: "stmmac：全志 A733 GMAC210 支持（v3，5 帖）；XDP 多缓冲 TX 支持"
        time: 09-24 04:47
      - link: https://lore.kernel.org/netdev/<20260923184008.153541-1-devnexen@gmail.com>/
        text: "vsock：给 io_uring 收包提供队列提示（v2，2 帖）"
        time: 09-24 02:40
      - link: https://lore.kernel.org/netdev/<20260923213719.224838-1-kuniyu@google.com>/
        text: "bpf：TCP AutoLOWAT 新增 bpf_tcp_ops 钩子（v2，8 帖）"
        time: 09-24 05:37
      - link: https://lore.kernel.org/netdev/<cover.1790157745.git.zihanx@nebusec.ai>/
        text: "gso：限制 IP-in-IP 递归分段深度（v5）"
        time: 09-23 22:01
  - type: divider
    label: "📰 fs / Rust / block / sched"
    kind: section
  - type: highlight
    title: "挂载命名空间：堵住 UMOUNT_CONNECTED 的引用计数环"
    meta: "〔09-24 06:19 北京〕· [PATCH RFC 0/6] namespace: prevent UMOUNT_CONNECTED reference count cycles"
    points:
      - label: 定位
        text: >-
          挂载命名空间的连接关系靠引用计数维持；UMOUNT_CONNECTED 场景下
          可能出现<b>引用成环</b>——谁也不释放谁。
      - label: 做法
        text: >-
          6 帖 RFC 从挂载拓扑层面识别并切断成环路径。同日另有 mount 层
          「几颗难啃的修复」（8 帖）与 OPEN_TREE_SKIP_MNTNS 提案，挂载层
          今天明显很热闹。
      - label: 效益
        text: >-
          容器高频建删命名空间的场景，少一类内存/挂载点泄漏。
    relevance: 引用计数成环是所有带生命期管理的子系统都会踩的坑——它不止属于 fs。
    link: https://lore.kernel.org/linux-fsdevel/<20260924-work-mount-knullfs-v1-0-ae89b29f7cb3@kernel.org>/
  - type: highlight
    title: "Rust 有了 XArray 抽象：3 帖"
    meta: "〔09-24 05:00 北京〕· [PATCH 0/3] Rust XArray（rust-for-linux）"
    points:
      - label: 定位
        text: >-
          XArray 是内核里「稀疏索引 → 指针」的主力数据结构（页缓存、IDR 都靠它）。
          Rust 侧一直没有对应的安全抽象。
      - label: 做法
        text: >-
          3 帖给出 Rust XArray 封装，同日 pin-init 系列（5 帖）改善
          缺 #[pin_data]/#[pin] 标注时的编译期诊断。
      - label: 效益
        text: >-
          Rust 驱动要用页缓存类设施时不必再手写 unsafe 胶水——
          基础设施清单上又划掉一项。
    relevance: 跟踪 Rust for Linux 的成熟度的直观方法：看它把 C 侧核心数据结构封装完几个了。XArray 是重量级的一个。
    link: https://lore.kernel.org/rust-for-linux/<20260923-rxarray-next-v1-0-92eedf185649@samsung.com>/
  - type: highlight
    title: "DRBD 9 要进主线了？先遣 7 帖开始铺路"
    meta: "〔09-23 22:06 北京〕· [PATCH 0/7] drbd: preparation for DRBD 9（linux-block）"
    points:
      - label: 定位
        text: >-
          DRBD 是块设备级的网络镜像（相当于「网络 RAID1」），8.x 曾在主线、
          后来被移出；DRBD 9 在树外发展了多年。
      - label: 做法
        text: >-
          LINBIT 的 7 帖是「准备工作」——先把树内残存部分整理到能承接 DRBD 9
          的形态。
      - label: 效益
        text: >-
          若走完，树外维护多年的 DRBD 9 将回到主线，发行版不必再外挂模块。
    relevance: 块设备复制是高可用存储的底座；「树外项目回流主线」的过程本身就是观察上游治理的好案例。
    link: https://lore.kernel.org/linux-block/<20260923140608.1116713-1-christoph.boehmwalder@linbit.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/lkml/<20260923223825.734003-1-tj@kernel.org>/
        text: "sched_ext：修 CPU 热拔出时任务卡在 BPF 调度器里导致的挂起（for-7.3-fixes）"
        time: 09-24 06:39
      - link: https://lore.kernel.org/linux-block/<20260923152653.40953-1-yupeng0921@gmail.com>/
        text: "nvmet：按 cgroup 路径计命名空间 I/O（v3）"
        time: 09-23 23:26
      - link: https://lore.kernel.org/linux-security-module/<20260923054623.247634-1-18983559317@163.com>/
        text: "apparmor：修 aa_lookupn_ns() 的 use-after-free；ipe 同日修两处 UAF"
        time: 09-23 13:47
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "dma-fence 弃用回调"
        text: >-
          ops-&gt;wait() 与 ops-&gt;release() 被标记弃用——它们阻碍「fence 生产者可卸载」
          这个既定目标。消费者改用 fence 回调通知，释放需求改用 RCU 宽限期后直做。
          Christian König 已在评审中参与定边界。
          <a href="https://lore.kernel.org/linux-media/<20260923150308.1294592-2-phasta@kernel.org>/">原文</a>
      - label: "THP split 解耦"
        text: >-
          mm/huge_memory v6（17 帖，腾讯）：把匿名页与文件页的 split 助手彻底分开、
          清理 __folio_split 的善后逻辑。Andrew Morton 已跟进回复——
          大 folio 时代的拆分路径继续收敛。
          <a href="https://lore.kernel.org/linux-mm/<20260923-swap-thp-cleanup-v6-0-ba1b4ba72c6f@tencent.com>/">原文</a>
      - label: "dyndbg classmaps"
        text: >-
          v11 共 38 帖：修子系统使用 classmaps 的 API、扩展查询语法、补自测。
          动态调试是跨子系统的排障基础设施，这次把「各子系统接入方式」统一收拢。
          <a href="https://lore.kernel.org/dri-devel/<20260923-dd-cmap-part2-clean-v11-0-9b6c217fdf2f@gmail.com>/">原文</a>
      - label: "sparc32 原子操作"
        text: >-
          RFC 5 帖：给 sparc32 加内核辅助的 compare-and-swap 与 SMP futex——
          老架构补并发原语，用户态无锁库才能正确跑上去。
          <a href="https://lore.kernel.org/lkml/<20260923201830.865553-1-linmag7@gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "no-op build（空转构建）"
        text: >-
          什么都没改再跑一次 make。理想耗时应该接近零——它是检验构建系统
          「依赖追踪是否精准」的照妖镜，本期 kbuild 系列把它从 15s 压到 1.4s。
      - label: "cont-PTE（连续页表项）"
        text: >-
          ARM64 特性：16 个连续 4K 页若物理连续且对齐，可用一条带连续标记的
          页表项表示，TLB 占用降为 1/16。vmalloc 系列让 vmap 路径第一次用上它。
      - label: "OPE（离线处理引擎）"
        text: >-
          高通 SoC 里的内存进、内存出的图像处理硬件：不接 sensor、不在实时管线上，
          专做抓完之后的 debayer/色彩校正/缩放——「offline」就指它脱离了采集时序。
      - label: "dma-fence"
        text: >-
          跨驱动的异步完成信号原语：GPU 渲染完通知显示控制器这类「生产者-消费者」
          同步都靠它。本期弃用两个回调，为的是驱动可随时安全卸载。
      - label: "LUO（现场更新编排器）"
        text: >-
          内核现场更新（不换机重启就换新内核）时负责「哪些状态要跨内核带过去」
          的框架；本期新增 tmpfs 文件保留，服务无盘主机的虚拟机管理包更新。
      - label: "E-switch（嵌入式交换机）"
        text: >-
          智能网卡内部的交换层：SR-IOV 虚机的流量在网卡上直接转发，不过主机 CPU。
          「嵌套」指虚机套虚机时多层转发——mlx5 的 13 帖在为此铺路。
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的板块。
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
