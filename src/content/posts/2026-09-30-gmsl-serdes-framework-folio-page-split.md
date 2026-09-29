---
title: "GMSL2/3 的加解串器驱动被整体重写：23 帖搭出一套链路框架，一次覆盖 13 款芯片；struct folio 准备和 struct page 分家"
date: "2026-09-30"
desc: "GMSL2/3 加解串器 23 帖重写成框架到 v18；memdescs 让 folio 与 page 分家"
column: "daily"
tags: ["media", "DRM", "mm", "PCI", "net", "fs", "virtio", "Rust", "block", "arch", "sched"]
blocks:
  - type: hook
    text: >-
      今天的头条落在相机链路上：<strong>Maxim GMSL2/3 的加解串器驱动被整体重写成一套框架</strong>，
      23 帖、到 v18、一次覆盖 13 款芯片。另一条在内存管理——<strong>struct folio 准备和 struct page 分家</strong>，
      mm 里 25 个文件对 <code>folio-&gt;page</code> 的旧引用先被清空。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-30/cover.png"
    alt: "封面 · 9月30日 · GMSL 加解串器框架到 v18"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "GMSL2/3 加解串器重写成一套框架：串行器与解串器各一层，13 款芯片共用"
      - label: "头条"
        text: "struct folio 要与 struct page 分家：mm 里 25 个文件的 &folio->page 先被清空"
      - label: "media"
        text: "camss 加 Kaanapali 到 v17；i.MX952 ISI 到 v4 补 RAW14 与对齐；ov08x40 报「每帧只来第一行」"
      - label: "DRM"
        text: "msm DP 的 MST 支持到 v7（35 帖）；StarFive JH7110 显示子系统到 v5，顺带抽出 Rockchip 共用的 HDMI PHY"
      - label: "mm"
        text: "hugetlb folio 的 swap 支持出 RFC；NeilBrown 为目录锁大改铺路，nfs/afs/cifs/fuse/cephfs 各自让路"
      - label: "net"
        text: "GRO 的 frag_list 包被标记为 DODGY；IPv4 在 connected socket 上用零 IPID"
      - label: "PCI"
        text: "vfio 要把 PCI 错误恢复状态上报给用户态（RFC v2，16 帖）"
      - label: "fs"
        text: "netfs 用 bio_vec 数组链替掉 folio_queue（v13）；Rust 的 fd table 拆除被 Al Viro 连追多轮"
      - label: "机制"
        text: "INTERNAL pad flag、VFS 目录锁的前夜、memdescs、ptr_eq()"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-30/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-30 06:23 北京，近 24h 各板块真实计数：net 550 · DRM 362 · mm 286 · fs 178 ·
      media 149 · PCI 136 · Rust 104 · block 58 · arch 30 · LSM 22 · rt 21 · virtio 3。
      量最大的仍是 net，但今天真正值得花时间的是 media —— 那条 GMSL 系列是<strong>一次完整的框架化重写</strong>，
      不是小修小补。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "GMSL2/3 的加解串器驱动被整体重写：23 帖搭出一套链路框架，一次覆盖 13 款芯片"
    meta: "〔09-30 06:41 北京〕· [PATCH v18 00/23] media: i2c: add Maxim GMSL2/3 serializer and deserializer drivers"
    points:
      - label: 现状
        text: >-
          GMSL 链路是成对使用的——摄像头端的<strong>串行器</strong>把并行信号并成一路高速串行，
          SoC 端的<strong>解串器</strong>再把它还原成 MIPI CSI-2 输出。上游目前有 max96712（还在 staging）、
          max96714、max96717 几个驱动，但每个各写各的，覆盖的功能都很窄。
      - label: 痛点
        text: >-
          GMSL 是「一对芯片 + 一条链路」的组合题，难点不在寄存器，而在链路两端怎么协商：
          VC（虚拟通道）怎么映射、stream id 怎么分配、走 tunnel 模式还是 pixel 模式、
          pixel 模式下要不要把两个像素 pack 进一个数据单元、两端 BPP 不同时怎么补 padding。
          这些现在要么靠设备树写死，要么根本没实现；芯片一多就是成片的重复代码。
      - label: 方案
        text: >-
          把串行器和解串器各抽出一层框架（15/23、16/23 两帖），芯片驱动只填差异。框架里做了：
          Streams API（多 link、多 PHY 之间的路由配置）、get_frame_desc / get_mbus_config、
          给串行器加 I2C ATR 做地址翻译、GMSL3 与 GMSL2 6Gbps/3Gbps 的自动链路协商、
          VC 自动重映射（优先保持原 VC，好给 tunnel 模式留出可能）、tunnel/pixel 模式自动选、
          double mode 与 data padding 自动配。合计支持 10 款解串器（含 GMSL3 的 MAX96792A）+ 3 款串行器。
      - label: 为什么
        text: >-
          作者自己说明了取舍：按礼貌应该去扩展现有驱动，但现有驱动支持的功能太少，
          扩完实际上等于全部重写——所以干脆新写一套，同系列里把旧驱动删掉
          （staging 里的 MAX96712、以及 MAX96714 一并移除）。另一个容易被忽略的前提：
          这套东西依赖 media controller 的「内部 pad」概念，所以 01/23 先给 UAPI 加了
          <code>MEDIA_PAD_FL_INTERNAL</code>。
      - label: 效益
        text: >-
          对下游厂商，一条 GMSL 链路从「给每对芯片写一份胶水」变成「选框架 + 填芯片差异」；
          对做车载 / 工业相机的人，上游终于有了 GMSL 的公共答案而不是各家私货。
      - label: 下一步
        text: >-
          已经是 v18，说明评审大致收敛在细节上。系列注记里有一条人事变化：
          原共同作者 Cosmin 已离开 ADI，因为本版改动不大，他的 sign-off 与 tag 按原样保留。
    verdict: >-
      这是本期唯一直接落在「GMSL2 相机链路」上的机制级改动，它的框架分层就是上游对这类链路的官方做法，
      值得逐帖读一遍。
    link: https://lore.kernel.org/linux-media/<20260930-gmsl2-3_serdes-v18-0-43117818f499@analog.com>/
  - type: headline
    title: "struct folio 准备和 struct page 分家：mm 里 25 个文件的 &folio->page 先被清空"
    meta: "〔09-30 05:53 北京〕· [PATCH 00/15] mm: eliminate &folio->page references in mm/"
    points:
      - label: 现状
        text: >-
          内核用 <code>struct page</code> 描述单个物理页，用 <strong>struct folio</strong>
          描述「一组连续、被当作一个单位管理的页」。为了省一次转换，现在的 struct folio 里
          <strong>直接内嵌了一个 struct page</strong>（就是 <code>folio-&gt;page</code>），
          而且 folio 的地址恰好等于它 head page 在 vmemmap 里的地址——这两个事实在很多代码里被当成前提在用。
      - label: 痛点
        text: >-
          只要 folio 还内嵌 page、地址还和 vmemmap 绑定，folio 就没法被动态分配。
          这正是 memdescs 计划（把 folio 与 page 彻底拆开）必须先搬走的两块地基。
      - label: 方案
        text: >-
          这一版不碰结构体，只做清理：把 mm/*.c 里剩下的 <code>&amp;folio-&gt;page</code> 引用
          （分布在 25 个文件）改成不依赖内嵌 page 的写法，只留 mm/debug.c 里三行不动——
          那里要读的 <code>page_type</code> 必须来自活着的 struct page，没有替代写法。
      - label: 为什么
        text: >-
          先把引用清干净、再动结构体，是为了让「结构体变更」那一版的影响面尽可能小：
          如果两件事同时做，出问题时分不清是替换写错了还是结构本身变了。
      - label: 效益
        text: >-
          memdescs 这条路又往前挪了一格。对写驱动的普通开发者没有立即可见的变化，
          但它决定了未来 folio 怎么被分配。
      - label: 下一步
        text: >-
          系列基于 Andrew Morton mm 树的 mm-unstable 分支，已经在 x86_64 KVM 下带着
          THP / hugetlbfs / HUGETLB_PAGE_OPTIMIZE_VMEMMAP / CMA / KSM / userfaultfd / memory-failure
          这一堆配置 build 过并启动过。
    verdict: >-
      「先清引用、再换结构」是内核做大规模结构变更的标准节奏，这一条同时也是一个值得记住的推进套路。
    link: https://lore.kernel.org/linux-mm/<20260929215206.516490-1-nilayvaish@google.com>/
  - type: divider
    label: "📰 media 摄像头"
    kind: section
  - type: highlight
    title: "camss 加 Kaanapali 到 v17：CSID 与 VFE 两代 IP 一起补上"
    meta: "〔09-29 14:00〕· [PATCH v17 00/11] media: qcom: camss: Add Kaanapali support"
    points:
      - label: 定位
        text: >-
          Qualcomm 的 camera 子系统驱动（camss），新增 Kaanapali 平台支持——
          属于 SoC 侧 CSI-2 收端那一层。
      - label: 做法
        text: >-
          11 帖里把 CSID 与 VFE 两代 IP（Gen4）以及 CSIPHY v2.4.0 的「两阶段」初始化都补上，
          连 TPG（测试图样发生器）v2.4.0 与 arm64 设备树（CCI 控制器、CAMSS 与 CSIPHY 节点、
          相机 MCLK pinctrl）一并带来。
      - label: 效益或下一步
        text: "v17 是目前讨论最充分的一版，新平台的相机链路在这条线上已经就绪。"
    relevance: >-
      如果你在跟 CSI-2 收端驱动，这版新增的看点是 CSIPHY 的「两阶段」上电顺序——
      它决定了多 PHY 配置下链路能不能锁上。
    link: https://lore.kernel.org/linux-media/<20260928-kaanapali-camss-v17-0-dcf3fd37f76c@oss.qualcomm.com>/
  - type: highlight
    title: "i.MX952 的 ISI 到 v4：RAW14 与对齐问题是这版重点"
    meta: "〔09-29 16:48〕· [PATCH v4 00/11] media: imx8-isi: Add i.MX952 ISI support"
    points:
      - label: 定位
        text: "NXP i.MX8 的图像传感接口（ISI）驱动，加 i.MX952 支持。"
      - label: 做法
        text: >-
          11 帖：重排 SoC 数据表、给格式枚举加 mbus_code 过滤、把输出格式掩码扩到 7 位、
          新增 RAW14 输出，并处理 i.MX95 上 RAW 输出的 MSB/LSB 对齐与运行期 workaround。
      - label: 效益或下一步
        text: "RAW10/12/14 的对齐处理是这版的核心，也是 sensor 到 ISP 之间最常见的对不上原因之一。"
    relevance: >-
      RAW 输出的对齐（MSB-aligned 还是 LSB-aligned）如果两边理解不一致，
      表现就是整幅图偏色或过曝，而寄存器看起来全对——这正是这类补丁在收的坑。
    link: https://lore.kernel.org/linux-media/<20260929-isi_imx952-v4-0-e69f89c7c651@oss.nxp.com>/
  - type: highlight
    title: "ov08x40 的「每帧只来第一行」：一份没有补丁的 bug 报告"
    meta: "〔09-29 16:18〕· [BUG] ov08x40: 2-lane 1928x1088 1500 Mbps mode delivers only the first line of each frame (Dell XPS 14, IPU7)"
    points:
      - label: 定位
        text: "位置在 sensor 驱动 + Intel IPU7 收端这条链路上，是一份纯粹的 bug report，暂时没有补丁。"
      - label: 做法
        text: >-
          Dell XPS 14 上，ov08x40 用 2-lane / 1928x1088 / 1500Mbps 这一组参数时，
          每帧只收到第一行；换别的模式正常。
      - label: 效益或下一步
        text: >-
          「只有某个参数组合不工作」通常指向 lane 数 / link frequency 与实际不匹配，
          或者收端的 settle 参数没跟着这组速率调整。
    relevance: >-
      这类报告比补丁更值得读——它是真实硬件给出的症状，而且是相机 bring-up 里最难查的那一类：
      参数组合里只有一组坏。
    link: https://lore.kernel.org/linux-media/<jOlmjcuoT4uLPTqIMMDtqQ@hlavki.eu>/
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "msm DP 补 MST 到 v7：35 帖把「一路流」的前提拆掉"
    meta: "〔09-29 12:26〕· [PATCH v7 00/35] drm/msm/dp: Add MST support for MSM chipsets"
    points:
      - label: 定位
        text: >-
          Qualcomm 显示子系统里的 DP 控制器驱动。MST（多流传输）是 DP 里结构最复杂的一块——
          一根线带多个显示器，控制器要为每个显示器维护一套独立状态。
      - label: 做法
        text: >-
          35 帖。给每个 panel 引入 stream_id、把寄存器访问全部改成 stream-aware、
          把 link 级操作与流级操作分离（新增 link_ready）、DPU 侧按 stream 分配编码器、
          新增 dp_mst_drm 模块承接 connector 与拓扑回调；还顺手改了共享层
          drm_bridge_connector，让 IRQ_HPD 在状态没变时不要触发 hotplug。
      - label: 效益或下一步
        text: >-
          改到 v7 已经触及 drm_bridge_connector 这种共享代码，说明评审走到了「影响面」阶段，
          不再是驱动内部自娱自乐。
    relevance: >-
      MST 的实现是「单实例驱动改造成多实例驱动」的教科书案例：
      所有原本是一个变量的状态都要变成 per-stream 结构，漏一个就是错乱。
    link: https://lore.kernel.org/dri-devel/<20260929-msm-dp-mst-v7-0-4b81473185e7@oss.qualcomm.com>/
  - type: highlight
    title: "StarFive JH7110 显示子系统到 v5：顺带抽出 Rockchip 也在用的 HDMI PHY"
    meta: "〔09-29 18:32〕· [PATCH v5 00/21] drm: starfive: jh7110: Enable display subsystem"
    points:
      - label: 定位
        text: >-
          RISC-V 板子（VisionFive 2 那一类）的整条显示链路：VOUT → DC8200 控制器 →
          Innosilicon HDMI。
      - label: 做法
        text: >-
          21 帖。核心是把 inno-hdmi 通用化：probe 从 bind 里拆出来、寄存器映射允许来自父节点、
          PHY 配置表变成可选、加 mode_valid / disable 平台回调、时钟源可选择；
          然后把 <strong>Rockchip 那版 inno-hdmi 也改成复用同一套 Innosilicon PHY 公共代码</strong>。
      - label: 效益或下一步
        text: "两家共用的 IP 被抽成公共层，重复实现少了一份。"
    relevance: >-
      「把两个厂商共用的 IP 抽成公共代码」和头条 GMSL 那条是同一个思路：
      先承认重复，再决定在哪一层收敛。
    link: https://lore.kernel.org/dri-devel/<20260929-jh7110-clean-send-v5-0-82b4d8e3c6c7@samsung.com>/
  - type: highlight
    title: "一个头文件重构引发的构建回归：7 个驱动补 include"
    meta: "〔09-29 21:40〕· [PATCH v2 0/7] drm: remove deprecated *_of_get_bridge() from non-OF drivers (fixes build regression)"
    points:
      - label: 定位
        text: >-
          drm_panel.h 的重构把 <code>devm_drm_of_get_bridge()</code> 的声明搬了家，
          但部分调用方没有一起改 include，某些配置下直接编译不过。
      - label: 做法
        text: >-
          v2 的 7 帖把 imx/lcdc、verisilicon、dw-mipi-dsi、dw-mipi-dsi2、vc4 的 dpi/dsi、
          renesas shmobile 全部补上正确的头文件。
      - label: 效益或下一步
        text: "修复保持最小，只补 include，不动逻辑。"
    relevance: >-
      如果你最近 rebase 到 -next 上编译报 <code>devm_drm_of_get_bridge</code> 隐式声明，
      就是这条。
    link: https://lore.kernel.org/dri-devel/<20260929-drm-fix-of_get_bridge-build-regression-v2-0-6da431d8f180@bootlin.com>/
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "hugetlb folio 也想被 swap：RFC 六帖试探这条路"
    meta: "〔09-29 15:54〕· [RFC PATCH 0/6] mm: swap support for hugetlb folios"
    points:
      - label: 定位
        text: "hugetlb 与 swap 在内核里长期是两套机制——hugetlb 页被排除在通用的回收与换出路径之外。"
      - label: 做法
        text: "RFC 6 帖，提出让 hugetlb folio 走 swap 路径。"
      - label: 效益或下一步
        text: "还在 RFC 阶段，是探索性的；但方向明确——把 hugetlb 接进通用的换出机制。"
    relevance: >-
      hugetlb 与常规页的机制分家是历史遗留，任何「合流」的尝试都会牵动大量假设，
      这也是它至今没做的重要原因。
    link: https://lore.kernel.org/linux-mm/<tencent_501F9D3CED07B66BAA97D5352FB63EE1A709@qq.com>/
  - type: highlight
    title: "NeilBrown 给目录锁大改铺路：先从「不要抱着 i_rwsem 调 d_alloc_parallel()」开始"
    meta: "〔09-29 11:42〕· [PATCH 0/7] multiple-filesystems: prepare for changes to VFS locking"
    points:
      - label: 定位
        text: >-
          VFS 层的目录锁。中期目标是把 <code>d_alloc_parallel()</code> 的上锁位置
          <strong>抬到 i_rwsem 之上</strong>，让它能在不持有 i_rwsem 的情况下运行。
      - label: 做法
        text: >-
          本系列是「多个文件系统各自的一小改」（nfs、afs、cifs、fuse、cephfs 的系列单独发）。
          对维护者的两条要求：不能在持有 i_rwsem 时调 d_alloc_parallel()
          （改用 d_alloc_trylock() / d_duplicate()，或者先放锁再取）；
          不能在操作进行中 d_drop()，否则 unlocked 的 d_alloc_parallel() 会造出同名 dentry。
      - label: 效益或下一步
        text: "这类「先说清约束、再逐个子系统让路」的推进方式，是锁改造能落地的前提。"
    relevance: >-
      如果你在跟任何文件系统的 dentry 生命周期代码，这两条约束就是接下来会被反复引用的规则。
    link: https://lore.kernel.org/linux-mm/<20260929034158.1455429-1-neilb@ownmail.net>/
  - type: highlight
    title: "DAMON 与 virtio-balloon，被 DeepSeek 的 DSec 论文点了名"
    meta: "〔09-29 20:50〕· [FYI] DAMON and virtio-balloon in DeepSeek's DSec paper"
    points:
      - label: 定位
        text: "一条 [FYI] 帖引出的跨域讨论，参与者包括 DAMON 维护者与 DeepSeek 的工程师。"
      - label: 做法
        text: >-
          DeepSeek 的工程师在 mm 列表上回应：DAMON 与 virtio-balloon 的空闲页上报
          对他们的负载很有用；同时说明他们对 virtio-pmem 的顾虑——
          把 I/O 放到 page fault 路径上会带来性能取舍，另外大镜像的 struct page 开销也不小。
          目前只在「中等大小、频繁使用的只读镜像」上开 virtio-pmem。
      - label: 效益或下一步
        text: >-
          DAMON 维护者 SJ Park 回复确认：这正是当初做这套东西的动机之一。
    relevance: >-
      这是少见的「工业界负载直接反馈到内核列表」的现场，而且来自国内团队——
      比读论文摘要更能看清这些机制实际被怎么用。
    link: https://lore.kernel.org/linux-mm/<20260929125030.1411980-1-huang-jl@deepseek.com>/
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "GRO 合并出来的包「不可全信」：新增一个 DODGY 标记"
    meta: "〔09-29 18:03〕· [PATCH] net: gro: mark frag_list GRO packets as SKB_GSO_DODGY when a list element exceeds gso_size"
    points:
      - label: 定位
        text: >-
          GRO（收包合并）在 frag_list 模式下会把多个 skb 串成一条链。
          当链里某个元素的长度超过 gso_size，下游按 GSO 规则切包就可能切错边界。
      - label: 做法
        text: "检测到这种情况，就把这个包标记为 <code>SKB_GSO_DODGY</code>。"
      - label: 效益或下一步
        text: "让软件 GSO / 转发路径知道这个包的合并结果不可全信，避免按错误边界切分。"
    relevance: >-
      DODGY 是内核里已有的「这个 skb 不可信」约定，这次是把一个之前没被覆盖的
      GRO 路径接进同一套契约。
    link: https://lore.kernel.org/netdev/<20260929100256.23192-1-shiming.cheng@mediatek.com>/
  - type: highlight
    title: "connected socket 上的原子数据报：IP ID 直接写 0"
    meta: "〔09-29 23:38〕· [PATCH net-next] ipv4: use zero IPID for atomic datagrams on connected sockets"
    points:
      - label: 定位
        text: >-
          IPv4 的 IP ID 字段在分片重组与去重里有语义；但对 connected socket 上的
          原子数据报（DF=1、不允许分片）来说，它其实没有意义。
      - label: 做法
        text: "这类报文统一使用 IP ID = 0。"
      - label: 效益或下一步
        text: "省掉一次原子操作，同时让报文更符合规范——RFC 6864 认可这种用法。"
    relevance: >-
      典型的「含义已经消失但代码还在维护」的字段，收掉它对抓包分析也更友好：
      IP ID 为 0 本身就是「这条不重要」的信号。
    link: https://lore.kernel.org/netdev/<20260929153834.566551-1-edumazet@kernel.org>/
  - type: highlight
    title: "ice 网卡驱动本轮到货：10 帖走 pull request"
    meta: "〔09-30 06:42〕· [PATCH net-next 00/10][pull request] Intel Wired LAN Driver Updates 2026-09-29 (ice)"
    points:
      - label: 定位
        text: "Intel 有线网卡驱动（ice）的例行更新，以 net-next 的 pull request 形式提交。"
      - label: 做法
        text: "10 帖打包，由维护者统一收口。"
      - label: 效益或下一步
        text: "这类批量更新能看出维护者树当前正在收什么，也是网卡驱动改动的主要入口。"
    relevance: >-
      看 pull request 比看单条补丁更省时间——它是维护者已经筛过一遍的结果。
    link: https://lore.kernel.org/netdev/<20260929224153.1455466-1-anthony.l.nguyen@intel.com>/
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "vfio 要把 PCI 错误恢复的状态告诉用户态：RFC v2 十六帖"
    meta: "〔09-30 01:33〕· [RFC PATCH v2 00/16] vfio/pci: Handle PCI error recovery and report state to userspace"
    points:
      - label: 定位
        text: >-
          vfio 把物理 PCI 设备直通给虚拟机时，设备出错（AER）之后的恢复路径
          一直没有完整暴露给用户态——虚拟机只看到设备「不见了」。
      - label: 做法
        text: "RFC v2 共 16 帖，处理 PCI error recovery，并把设备状态上报给 userspace。"
      - label: 效益或下一步
        text: "还在 RFC 阶段，对做设备直通与虚拟化的人来说是长期缺口的补课。"
    relevance: >-
      「错误恢复该怎么跨过直通边界」是 vfio 反复讨论的老问题：
      恢复流程在内核侧，但决定要不要恢复的往往是虚拟机里的驱动。
    link: https://lore.kernel.org/linux-pci/<20260929173305.204856-1-skolothumtho@nvidia.com>/
  - type: highlight
    title: "dw-rockchip 打开 INTx affinity"
    meta: "〔09-29 18:24〕· [PATCH] PCI: dw-rockchip: Enable INTx affinity support"
    points:
      - label: 定位
        text: "Rockchip 的 DesignWare PCIe 控制器驱动，中断路径这一层。"
      - label: 做法
        text: "开启 INTx 的 affinity 支持。"
      - label: 效益或下一步
        text: "老式的 INTx 中断也能被绑定到指定 CPU，不再全压在一个核上。"
    relevance: >-
      RK3588 上挂 PCIe 设备时，如果设备走的是 INTx 而不是 MSI，中断分布会直接影响吞吐。
    link: https://lore.kernel.org/linux-pci/<1790664898-207928-1-git-send-email-shawn.lin@rock-chips.com>/
  - type: highlight
    title: "SMMUv3 补上运行时与系统休眠支持：v11，十六帖"
    meta: "〔09-29 11:45〕· [PATCH v11 00/16] iommu/arm-smmu-v3: Implement Runtime/System Sleep ops"
    points:
      - label: 定位
        text: "SMMUv3 是 arm64 上做 DMA 地址翻译的那一层，它的状态直接决定设备能不能继续访问内存。"
      - label: 做法
        text: "16 帖实现 Runtime / System Sleep 两组 ops。"
      - label: 效益或下一步
        text: "系统进休眠时 SMMU 的上下文要能正确保存与恢复，这是 SoC 进低功耗态的前提。"
    relevance: >-
      IOMMU 的挂起恢复一旦不完整，症状通常是休眠唤醒后设备 DMA 直接打飞——
      而这类 bug 只在特定电源状态下出现。
    link: https://lore.kernel.org/linux-pci/<20260929034510.2023173-1-praan@google.com>/
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "netfs 用 bio_vec 数组链替掉 folio_queue：到 v13"
    meta: "〔09-29 18:34〕· [PATCH v13 00/10] netfs, iov_iter: Use a chain of bio_vec arrays instead of folio_queue"
    points:
      - label: 定位
        text: >-
          netfs 是网络文件系统的通用读路径，iov_iter 是内核里描述「一段一段缓冲区」的迭代器抽象。
          两者交界处目前用的是专用的 folio_queue 结构。
      - label: 做法
        text: "v13，10 帖，改用一个由 bio_vec 数组组成的链来替代 folio_queue。"
      - label: 效益或下一步
        text: "把网络文件系统的页管理收敛回通用的 bio_vec 表示，少一层专用结构要维护。"
    relevance: >-
      这类「专用结构回退到通用抽象」的重构，判断标准通常是：
      专用结构带来的收益还值不值得它多出来的维护成本。
    link: https://lore.kernel.org/linux-fsdevel/<20260929103412.2807494-1-dhowells@redhat.com>/
  - type: highlight
    title: "Rust 的 fd table 拆除：Al Viro 亲自盯了几轮"
    meta: "〔09-30 03:47〕· [PATCH v2] rust: file: handle fd table teardown in file descriptor APIs"
    points:
      - label: 定位
        text: >-
          Rust 抽象里的 file 层：文件描述符表被拆除的过程中，
          文件相关的 API 该怎么处理生命周期。
      - label: 做法
        text: "v2 帖在列表上被讨论得很细，Al Viro 参与了多轮往返。"
      - label: 效益或下一步
        text: "fd table 拆除期间的并发窗口，正是最容易出 use-after-free 的地方。"
    relevance: >-
      Rust 抽象最难的部分从来不是语法，而是「C 侧那些没写下来的生命周期约定」——
      这条线程就是把这个约定逐条问出来的过程。
    link: https://lore.kernel.org/linux-fsdevel/<20260929194726.GE989762@ZenIV>/
  - type: divider
    label: "📰 virtio"
    kind: section
  - type: highlight
    title: "virtio-blk 的 inline encryption：从 8 月底更到 v5，占了 virtio-dev 近期的大半"
    meta: "〔09-29 12:22〕· [PATCH v5 0/2] Add inline encryption support"
    points:
      - label: 定位
        text: >-
          virtio 的块设备。inline encryption 指的是把加密请求下沉到 host / 设备侧完成，
          而不是在 guest 里用软件加密。
      - label: 做法
        text: >-
          v5、2 帖。抓取的 virtio-dev 最近 20 条里，这条系列占了 14 条，
          从 08-28 一路更到 09-29。
      - label: 效益或下一步
        text: "数据在离开 guest 之前就被加密，是云上磁盘加密的常见诉求。"
    relevance: >-
      virtio-dev 是低频列表，一条系列占到近期流量的七成，
      说明这个特性在虚拟化存储里是被真实需要的。
    link: https://lore.kernel.org/virtio-dev/<20260929042152.4099414-1-linlin.zhang@oss.qualcomm.com>/
  - type: divider
    label: "📰 block"
    kind: section
  - type: highlight
    title: "NVMe 的原子性不止一种：RFC 提议 Multiple Atomicity Mode"
    meta: "〔09-29 19:18〕· [PATCH RFC 0/2] Support for Multiple Atomicity Mode"
    points:
      - label: 定位
        text: >-
          NVMe 的原子写语义。传统上设备只声明一个「原子写单元」的粒度，
          上层要么依赖它、要么自己加软件保证。
      - label: 做法
        text: >-
          RFC 2 帖：block 层新增 <code>BLK_FEAT_ATOMIC_WRITE_MULTI</code>，
          NVMe 侧启用多种原子性模式。
      - label: 效益或下一步
        text: "对数据库这类依赖原子写的负载，可以按需要选择不同等级的保障。"
    relevance: >-
      「原子写粒度」是存储栈里少数几个一旦定死就很难改的假设，动它必然牵动上层文件系统。
    link: https://lore.kernel.org/linux-block/<20260929-nvme-mam-v1-0-48dcbe79cece@samsung.com>/
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "Rust 的转换派生宏到 v6：把 From 的穷尽性支持补齐"
    meta: "〔09-29 22:00〕· [PATCH v6 00/10] rust: add conversion derives and exhaustive From support"
    points:
      - label: 定位
        text: "Rust for Linux 的宏层——为 From / TryFrom 提供派生宏。"
      - label: 做法
        text: "v6，10 帖，在派生宏之外补上「穷尽的 From」支持，并加了对应的 doctest。"
      - label: 效益或下一步
        text: "Rust 抽象里大量手写的转换 impl 样板可以省掉。"
    relevance: >-
      Rust for Linux 的推进有两条腿：内核 API 绑定，和让写绑定这件事本身更省力。
      这个系列属于后者。
    link: https://lore.kernel.org/rust-for-linux/<20260929135855.36775-1-chaoji_xinren@163.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-media/<20260929121802.2516868-1-sakari.ailus@linux.intel.com>/
        text: "media: i2c: Add Omnivision ov05c10 sensor driver（Sakari Ailus 提交的新 sensor 驱动）"
        time: 09-29 20:18
      - link: https://lore.kernel.org/linux-media/<20260929-mali-c55-irq-supend-resume-v1-0-e3af34afff12@kernel.org>/
        text: "media: mali-c55: Fix IRQ lifetime and wake handling（IRQ 生命周期与唤醒处理）"
        time: 09-29 20:02
      - link: https://lore.kernel.org/linux-media/<20260929094142.928758-1-jkeeping@inmusicbrands.com>/
        text: "media: rockchip: rga: fix rotation on rev0 hardware（v3）"
        time: 09-29 17:41
      - link: https://lore.kernel.org/dri-devel/<20260929181459.928468-1-lizhi.hou@amd.com>/
        text: "accel/amdxdna: Add support for AIE2 revision 9"
        time: 09-30 02:15
      - link: https://lore.kernel.org/dri-devel/<20260929-tyr-ioctls-v3-0-26955fb111d5@kylinos.cn>/
        text: "drm/tyr: add VM and BO ioctl support（v3，新驱动继续补 ioctl）"
        time: 09-29 10:16
      - link: https://lore.kernel.org/dri-devel/<20260929105407.484707-1-arunpravin.paneerselvam@amd.com>/
        text: "gpu/buddy: fix missing split-undo on allocation-search exhaustion"
        time: 09-29 18:54
      - link: https://lore.kernel.org/linux-pci/<20260929111003.3707239-1-stian@itx.no>/
        text: "PCI/MSI: Clear msi_desc::irq in the legacy teardown path"
        time: 09-29 19:10
      - link: https://lore.kernel.org/linux-block/<20260929070012.2325-1-lirongqing@baidu.com>/
        text: "ublk: use global index for reported zones"
        time: 09-29 15:00
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/lkml/<20260929201746.4078803-1-b-padhi@ti.com>/
        text: "Cleanup and Refactor TI-SCI driver（22 帖重构）"
        time: 09-30 04:18
      - link: https://lore.kernel.org/lkml/<20260929194711.2689811-1-christian.loehle@arm.com>/
        text: "sched/fair: Take slice protection into account when arming HRTICK"
        time: 09-30 03:47
      - link: https://lore.kernel.org/lkml/<cover.1790692295.git.salil.mehta@opnsrc.net>/
        text: "cpu/hotplug: use cpu_enabled_mask for SMT bringup（RFC）"
        time: 09-30 03:41
      - link: https://lore.kernel.org/linux-arch/<20260929223622.778617-1-mrathor@linux.microsoft.com>/
        text: "Hyper-V: root VM iommu kernel only driver（V2）"
        time: 09-30 06:36
      - link: https://lore.kernel.org/netdev/<20260929121025.20821-1-jszhang@kernel.org>/
        text: "net: stmmac: Disable checksum insertion for XDP frame TX"
        time: 09-29 20:30
      - link: https://lore.kernel.org/netdev/<20260929203400.1588868-1-justin.chen@broadcom.com>/
        text: "net: bcmasp: fix lost TX wakeup race with lockless queue API（v2）"
        time: 09-30 04:34
      - link: https://lore.kernel.org/linux-fsdevel/<20260929094812.93374-1-tkhandelwal32@gmail.com>/
        text: "fuse: propagate SB_POSIXACL to submounts"
        time: 09-29 17:48
      - link: https://lore.kernel.org/rust-for-linux/<20260929174613.DJ0adPxVeVyXVaqOKF2jNsOD8tTLC7uNSOEHZf26cGw@z>/
        text: "rust: io: Fix Region::drop releasing nested resources from the wrong parent"
        time: 09-30 01:46
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "INTERNAL pad flag"
        text: >-
          给 V4L2 的 pad 加一个「内部 sink pad」标志，用作 [GS]_ROUTING 的流起点；
          同时禁止对内部 pad 建 link、禁止 source pad 带这个标志。
          它是 GMSL 那套框架的前置依赖——<strong>UAPI 先动，驱动才能跟上</strong>。
          <a href="https://lore.kernel.org/linux-media/<20260930-gmsl2-3_serdes-v18-1-43117818f499@analog.com>/">原文</a>
      - label: "VFS 目录锁的前夜"
        text: >-
          把 d_alloc_parallel() 的上锁位置抬到 i_rwsem 之上。
          这一条今天以「多个文件系统各自让路」的形式出现（nfs / afs / cifs / fuse / cephfs 各自成系列），
          属于<strong>先改约束、再改实现</strong>的典型打法。
          <a href="https://lore.kernel.org/linux-mm/<20260929034158.1455429-1-neilb@ownmail.net>/">原文</a>
      - label: "memdescs"
        text: >-
          让 struct folio 不再内嵌 struct page、地址也不再等于 vmemmap 里的 head page。
          今天这一步只是清引用（25 个文件），但它是<strong>结构体本身变更</strong>的前置动作。
          <a href="https://lore.kernel.org/linux-mm/<20260929215206.516490-1-nilayvaish@google.com>/">原文</a>
      - label: "ptr_eq()"
        text: >-
          hazptr 系列给编译器一个显式表达「这两个指针相等」的手段，
          用来保住地址依赖（address dependency）不被优化掉——RCU 类代码的经典雷区。
          线程里能看到 Linus 的参与（回复挂在 CAHk- 的 message-id 下）。
          <a href="https://lore.kernel.org/linux-mm/<5a695b14-d25d-4c11-87f4-83c8d299d79f@efficios.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "串行器 / 解串器（serializer / deserializer）"
        text: >-
          GMSL、FPD-Link 这类车载与工业相机链路是成对使用的：串行器在摄像头端
          把并行信号并成一路高速串行，解串器在 SoC 端还原成 MIPI CSI-2 输出。
          本期头条的 MAX96717 / MAX9295A 是串行器，MAX96712 / MAX9296A 是解串器。
      - label: "tunnel 模式 / pixel 模式"
        text: >-
          GMSL 解串器把收到的数据转成 CSI-2 时有两条路：
          <strong>tunnel</strong> 是原样透传（要求虚拟通道号不变），
          <strong>pixel</strong> 是解出像素再重新打包（可以做 VC 重映射、double mode、padding）。
          后者更灵活但多一次处理，所以框架会自动判断能不能走前者。
      - label: "VC（Virtual Channel）"
        text: >-
          MIPI CSI-2 在一条物理链路上用虚拟通道号区分不同数据流（比如多个摄像头）。
          上游有多个源要汇到同一个 CSI-2 输出时，VC 号必须保持唯一——这正是框架要做自动重映射的原因。
      - label: "I2C ATR（Address Translation）"
        text: >-
          GMSL 链路里 SoC 侧通过 I2C 访问远端芯片。若解串器不支持按链路做 I2C 通道屏蔽，
          就没法用常规 mux 选路——只能改用地址翻译：在 probe 时把远端芯片的地址改掉。
      - label: "struct folio 与 memdescs"
        text: >-
          folio 描述「一组连续、被当作一个单位管理的页」。memdescs 是把它与 struct page
          彻底拆开的长期计划：不再内嵌、地址也不再相等，从而允许 folio 被动态分配。
      - label: "d_alloc_parallel() 与 i_rwsem"
        text: >-
          d_alloc_parallel() 负责在目录里查找或创建一个 dentry，i_rwsem 是 inode 层的读写信号量。
          目前前者经常在后者的保护下调，VFS 想把这两者的关系解开——本期 mm 那条就是在铺路。
      - label: "SKB_GSO_DODGY"
        text: >-
          skb 上的一个标记，含义是「这个包的合并/分段信息不可全信，下游别按它推断边界」。
          本期 net 那条把 frag_list 形式的 GRO 也接进了这个契约。
      - label: "inline encryption"
        text: >-
          把加密下沉到设备侧完成（而非在 guest 或主机 CPU 上做软件加密），
          本期出现在 virtio-blk 的提案里，是云上磁盘加密的常见做法。
  - type: closing
    tagline: "如果对你有用，点个赞，或转给做相机的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
