---
title: "Rust 写的 GPU 驱动长出显存管理；P2P DMA 改按 TLP 类别路由"
date: "2026-10-13"
desc: "v7.4 合并窗口里 Nova 拿到 dma_fence 抽象与显存管理；NVIDIA 用 18 封重做 P2P DMA 的路由判定。"
column: "daily"
tags: ["Rust", "PCI", "mm", "media", "DRM", "net", "fs"]
blocks:
  - type: hook
    text: >-
      今天的合并窗口里，<strong>Rust 写的 GPU 驱动 Nova</strong> 一次拿到了 dma_fence
      抽象、显存管理和 MMU 页表；PCI 那边，NVIDIA 用 18 封把 <strong>P2P DMA 的路由</strong>
      从「一条路径一个答案」改成「按 TLP 类别分别算」。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-13/cover.png"
    alt: "封面 · 10月13日 · Rust 写的 GPU 驱动 Nova 长出显存管理"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-13/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-13 06:45 北京，近 24h 各板块真实计数：net 619 · DRM 399 · fs 215 ·
      mm 209 · media 175 · PCI 153 · block 73 · Rust 65 · arch 44 · LSM 19 · rt 19 ·
      virtio 1。net 的量最大但结构很散——多数是零散修复；真正成体系的设计讨论落在
      mm（DMA_PMD 的 IO 缓冲池）、PCI（P2PDMA 路由）和 media（相机链路）。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "Rust 写的 GPU 驱动开始长肉：dma_fence 抽象与 Nova 的显存管理一起进 v7.4"
    meta: "〔10-13 05:56 北京〕· [GIT PULL] DRM Rust changes for v7.4-rc1（Danilo Krummrich）"
    points:
      - label: 现状
        text: >-
          DRM 是内核里 Rust 抽象推进最快的子系统之一：从最早的几个 demo，一层层搭出
          <code>drm::Device</code>、GEM、registration。Nova 是 NVIDIA 用 Rust 写的开源
          GPU 驱动（面向 Turing 及以后的卡）。这类驱动要跨引擎同步，靠的是
          <strong>dma_fence</strong>——把「这件事做完了」变成一个可等待的对象，另一个驱动或用户态去等它。
      - label: 痛点
        text: >-
          Rust 这一侧此前没有 dma_fence 抽象，写 GPU 驱动时同步只能退回 C 设施；而真正让
          GPU 跑起来的显存管理、MMU 页表，也一直没进树。
      - label: 方案
        text: >-
          这周期 pull 的 DRM Rust 改动分两块。DRM 侧：新增 Rust dma_fence 抽象，把
          <strong>生产者（DriverFence）与消费者（Fence）拆成两个类型</strong>，带
          per-context 序列号、signal 回调与预分配，后端操作留作后续；registration 改成就地初始化、
          去掉多余的分配。Nova 侧：NovaCoreApi 与可扩展的 INFO ioctl、经 BAR0 的 PRAMIN
          窗口访问显存、VRAM buddy 分配、TLB flush、<strong>MMU v2/v3 页表</strong>
          （PteOps / PdeOps / MmuConfig 一类 trait 泛型）与通用遍历器、maple-tree 虚拟地址跟踪、
          经 BAR1 访问显存、GIN 中断树（MSI-X，MSI 兜底）与 GSP 事件排空。
      - label: 为什么
        text: >-
          有两处依赖来自 driver-core 树——<code>register!()</code> 从宏改成 proc-macro、
          以及 DMA 的生命周期约束——用<strong>签名 tag</strong>共享；作者说本周期打算先给
          Linus 发一个早期的 driver-core PR。dma_fence 的后端操作没做完，明确挂成 follow-up。
      - label: 效益
        text: >-
          「用 Rust 写 GPU 驱动」缺的两块地基——DRM 抽象层和显存管理——这周期一起进主线。
          Nova 从「能 probe」往「能用」走了一格。
      - label: 下一步
        text: >-
          dma_fence 的 backend ops、Tyr 的小修等 follow-up。另有 pin-init、Rust XArray 几个
          pull 同批进窗口，Rust 这一轮在合并窗口里存在感很强。
    verdict: 这条不是某个驱动的功能补丁，是 Rust 在 DRM 里从「能编译」走到「能写显存管理」的一步——评论里那句「dma_fence 后端操作留作后续」，说明这套东西后面还有的磨。
    link: "https://lore.kernel.org/dri-devel/<DM371PN4TBJT.3LY1B0EYWSI4@kernel.org>/"

  - type: headline
    title: "P2P DMA 能不能走，不该只给一个答案：NVIDIA 按 TLP 类别重做路由判定"
    meta: "〔10-12 21:08 北京〕· [PATCH v10 00/18] PCI/P2PDMA: Route peer-to-peer DMA by TLP class（Leon Romanovsky / NVIDIA）"
    points:
      - label: 现状
        text: >-
          P2P DMA 是两台 PCIe 设备之间直接搬数据、不绕主机内存。能不能 P2P 由拓扑决定，
          内核靠 <strong>ACS</strong>（Access Control Services）——交换机和根口上那几位访问控制——
          来判断某条路径通不通。
      - label: 痛点
        text: >-
          现在的实现把 Request Redirect 与 Completion Redirect 无差别地套在整条路径的
          <strong>两端</strong>，对非对称交换机和嵌套交换机判断错；更要命的是，
          <strong>对所有 TLP 只给一个答案</strong>。
      - label: 方案
        text: >-
          作者指出这三个 ACS 控制位其实作用在 <strong>TLP 自己的属性</strong>上（由 Requester
          选），而不是拓扑：Translation Blocking 与 Direct Translated P2P 作用于 Request 的
          Address Type，Completion Redirect 则跳过带 Relaxed Ordering 的 Completion。
          于是改成<strong>在路径分叉点按方向求值</strong>，一次遍历把每个 TLP 类别都判出来；
          开了 ATS 的 client 视为 translating，除非驱动声明了 per-mapping ATS。
      - label: 为什么
        text: >-
          因为 TLP 的类别（Posted / Non-Posted / Completion、带不带 RO、是否 translated）
          才决定它会不会被重定向。一个答案覆盖所有类别，在简单拓扑上碰巧对，在复杂拓扑上必然错。
      - label: 效益
        text: >-
          修掉非对称 / 嵌套拓扑下的误判。这条路径上的判断一旦错，要么该 P2P 的被判成不能 P2P，
          要么不该走的两台设备被放进同一条通道。
      - label: 下一步
        text: >-
          这版的说法是「P2PDMA 这一侧做完了」——dma-buf 和 mlx5 的改动<strong>单独跟进</strong>
          （前一版里它们被暂时摘出去过）。所以这条链还没走完。
    verdict: 到 v10 说明这块磨了很久。有意思的是它纠正的那个直觉：我们习惯把 ACS 当成拓扑属性，而它实际作用在 TLP 属性上——错在这一层，判定就会整片错。
    link: "https://lore.kernel.org/linux-media/<20261012-fix-p2p-acs-v4-0-v10-0-6ffe7b7a4517@nvidia.com>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "给设备 IO 造一个「大页粒度的缓冲池」：22 封 RFC 讨论 DMA_PMD 该不该叫 PMD"
    meta: "〔10-13 03:44 北京〕· [RFC: DMA_PMD 00/22] DMA_PMD: PMD_SIZE-backed IO buffer pools（Luigi Rizzo / Google）"
    points:
      - label: 定位
        text: >-
          设备 DMA 用的缓冲区要物理连续——相机、视频、加速器都吃这一口。内核现在的手段是
          CMA、dma-contiguous allocator，网络侧还有 page_pool 那套。
      - label: 做法
        text: >-
          RFC 提出一个叫 <strong>DMA_PMD</strong> 的子系统：以 PMD（大页）为粒度组织 IO
          buffer 池，强调物理连续、按可配置粒度分配。当前原型限制在 2MB。
      - label: 效益
        text: >-
          回帖里最直接的一问来自 David Hildenbrand：为什么要建在 PMD 上、还写进名字里——
          arm64 用 64K 页时 PMD 是 <strong>512MB</strong>，未必想一次要那么大。讨论的落点是把它
          当成「一个关注物理连续性、粒度可配的池子」，把分配粒度与 PMD 大小解耦。
    relevance: 相机链路里最贵的 bug 往往是「内存明明够，却凑不出一块连续的」。这类池子若成立，直接影响 GMSL2 / CSI 那侧的缓冲怎么要。
    link: "https://lore.kernel.org/linux-mm/<b31efcd5-149c-4edf-81a2-1744d363c390@kernel.org>/"

  - type: highlight
    title: "MGLRU 在 memcg 上的轮转太贵：5 封把它压下来"
    meta: "〔10-13 04:55 北京〕· [PATCH 0/5] mm: multi-gen LRU: reduce memcg rotation overhead（Max Kellermann / IONOS）"
    points:
      - label: 定位
        text: >-
          <strong>MGLRU</strong>（多代 LRU）按「代」组织页面回收，每个 memcg 有自己的一批代，
          回收时要在这批代之间轮转。
      - label: 做法
        text: >-
          五封分工很明确：新增 <code>hlist_nulls_add_behind_rcu()</code>；把 vmscan 里的代码抽成
          <code>lru_gen_{add,del}_memcg()</code>；<strong>缓存最后一个 memcg 节点</strong>，
          让尾部插入从遍历变成 O(1)；避免对「年轻」memcg 做冗余轮转；再在两次 memcg 回收尝试之间
          重新调度。
      - label: 效益
        text: >-
          目标是让轮转本身的开销降下来——这类改动的收益不在单次回收快多少，而在 memcg 很多时
          省掉的重复劳动。
    relevance: 容器密度高的机器上，memcg 数量一大，这类「每次回收都要走一遍」的结构性开销会被放大。
    link: "https://lore.kernel.org/linux-mm/<20261012205447.2717801-1-max.kellermann@ionos.com>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "两颗 GalaxyCore 传感器驱动到 v2：GC5035 与 GC8034"
    meta: "〔10-12 22:35 北京〕· [PATCH v2 0/7] media: Add GalaxyCore GC5035 and GC8034 sensor drivers" 
    points:
      - label: 定位
        text: >-
          V4L2 的 sensor 驱动层：i2c 上挂一个 <strong>v4l2_subdev</strong>，通过 media bus
          format 与 CSI-2 host 对接，再交给 media controller 组图。
      - label: 做法
        text: >-
          一次交了 GC5035、GC8034 两颗 GalaxyCore 图像传感器的驱动，7 封，已到 v2。
      - label: 效益
        text: >-
          这类补丁是相机链路最底下那块——上游多一颗传感器，下游的板子就少一份 out-of-tree 驱动。
          回帖里维护者已经在讨论细节，说明进了正常 review 流程。
    relevance: 传感器驱动是相机工程师的日常。看它的 v2 diff，能看清「一颗 sensor 进主线」要交代哪些东西：上电时序、寄存器表、media bus format、DT 绑定。
    link: "https://lore.kernel.org/linux-media/<20261012143443.34897-1-nicfio@gmail.com>/"

  - type: highlight
    title: "Qualcomm CAMSS 加 Kaanapali：已经磨到 v21 的 14 封"
    meta: "〔10-12 14:45 北京〕· [PATCH v21 00/14] media: qcom: camss: Add Kaanapali support"
    points:
      - label: 定位
        text: >-
          Qualcomm 的 <strong>CAMSS</strong>（camera subsystem）驱动 + MIPI CSI-2 PHY 驱动，
          落在 V4L2 subdev 那一层，负责把 CSIPHY → CSID → VFE 串成一条采集管线。
      - label: 做法
        text: >-
          14 封把 Kaanapali 这颗 SoC 接进来：CSI2 PHY（v2.4.0 的 two-phase CSIPHY，
          共同状态寄存器偏移参数化）、CSID 1080、VFE 1080、由 CSID 发 stream-on 的 REG_UPDATE、
          CAMSS 设备与 compatible，最后附一份 DT overlay。
      - label: 效益
        text: >-
          已经到 <strong>v21</strong>。这个版本号本身就是信息：SoC 相机链路进上游，通常要陪着
          维护者把寄存器语义一层层说清楚。
    relevance: 和 IPU6/IPU4P 那类补丁对照着看很有意思——都是「SoC 侧采集管线进主线」，一个 Intel 一个 Qualcomm，要补的地基高度相似。
    link: "https://lore.kernel.org/linux-media/<20261011-kaanapali-camss-v21-0-04fd28d815c6@oss.qualcomm.com>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "vc4 的 HDMI 2.0 加扰不再自己写一份：改用公共基础设施"
    meta: "〔10-13 06:38 北京〕· [PATCH v2 0/8] drm/vc4: hdmi: Convert to common HDMI 2.0 scrambling infrastructure"
    points:
      - label: 定位
        text: >-
          DRM 的 connector / bridge 层，以及 <code>drm_hdmi_helper</code> 这套公共库。
          HDMI 2.0 的高速率下 TMDS 要<strong>加扰</strong>（scrambling），否则信号完整性撑不住。
      - label: 做法
        text: >-
          把 vc4（树莓派）自己那份加扰逻辑换成公共 helper：用
          <code>drm_hdmi_mode_needs_scrambling()</code> 判断该不该加扰、
          <code>drmm_connector_hdmi_init()</code> 做初始化、<code>.force_ctx()</code> 回调用公共
          context，TMDS 字符率常量共用，pixel clock 校验也交给 helper；顺带把 BCM2835 的最大
          pixel clock 提到 165 MHz。
      - label: 效益
        text: >-
          HDMI 2.0 那套「要不要加扰、按什么速率算」的逻辑不再各驱动各写一份。这是 DRM 里很典型
          的一种演进：先在一个驱动里试出来，再抽成公共层让所有人用。
    relevance: 显示链路的公共 helper 化，和相机侧 media bus format 的收敛是同一个思路——上游更愿意收「共用一套语义」的驱动。
    link: "https://lore.kernel.org/dri-devel/<20261013-vc4-common-scramb-v2-0-a41d15e131ad@collabora.com>/"

  - type: highlight
    title: "自己导出的 dma-buf 又导回自己：加个 helper 把它认出来"
    meta: "〔10-13 02:06 北京〕· [PATCH 0/2] drm: add a self-import PRIME dma-buf helper and use it in Xe"
    points:
      - label: 定位
        text: >-
          <code>drm_gem</code> 与 PRIME（dma-buf 的导出 / 导入）这一层。dma-buf 是跨驱动共享
          显存的标准做法：一个驱动导出，另一个导入。
      - label: 做法
        text: >-
          在 drm/gem 里加一个 helper，判断一个 dma-buf 是不是<strong>自导入</strong>
          （自己导出又导回自己），并在 Xe 里先用上。
      - label: 效益
        text: >-
          自导入会让驱动在 mmap、迁移这些路径上做错决策。以前每家各写一份判断（或者干脆没判），
          现在收成公共 helper。
    relevance: dma-buf 是相机 / 显示 / 加速器共用的那层。这类「边界情况收进公共 helper」的补丁，正是跨子系统协作时最容易踩坑的地方。
    link: "https://lore.kernel.org/dri-devel/<20261012180543.1488703-4-niranjana.vishwanathapura@intel.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "把 XSK 内存池接成 page_pool 的 memory provider：fbnic 的零拷贝接收"
    meta: "〔10-12 22:14 北京〕· [RFC net-next 09/15] xsk: Add a page-pool memory provider for UMEM（Björn Töpel / Meta）"
    points:
      - label: 定位
        text: >-
          netdev 的 XDP / AF_XDP 路径与 <strong>page_pool</strong>。page_pool 早就有
          <strong>memory provider</strong> 抽象——页池里的页不一定是「内核自己分配的页」，
          可以有人供给它。
      - label: 做法
        text: >-
          这组 RFC 把 fbnic 的 RX 接到 AF_XDP 零拷贝上：用 XSK buffer pool 作为该队列的
          page-pool memory provider，<strong>分配、DMA sync、回收、refill 全留在 page_pool</strong>；
          只支持对齐的 4KiB UMEM chunk；header queue 上每帧一个包，header-split 阈值提到 3072
          字节以上；MTU 超过阈值就需要 XDP_USE_SG 加带 frags 的 XDP 程序；BDQ refill 在
          header / payload 之间交替，保持两个 ring 平衡；另补上 fbnic 的 XDP_REDIRECT
          （含 <code>xdp_do_flush()</code>）。TX 支持到位前不宣告 zero-copy。
      - label: 效益
        text: >-
          一个真实 NIC 驱动把零拷贝接收跑起来，等于给「memory provider」这套抽象做了验证——
          供给内存的一方可以完全不是内核页分配器。
    relevance: page_pool 的 memory provider 和 mm 侧的 dma-buf memory provider 是同一脉络：都在回答「这块内存从哪来」。跨域看这条线，比看单个网卡补丁值钱。
    link: "https://lore.kernel.org/netdev/<87y0c3atv5.fsf@all.your.base.are.belong.to.us>/"

  - type: highlight
    title: "又一块新网卡直接往上游送：15 封，以太网和 RDMA 一起交"
    meta: "〔10-12 19:44 北京〕· [PATCH 00/15] Yunsilicon ethernet and RDMA drivers"
    points:
      - label: 定位
        text: >-
          一块新 NIC 的完整驱动栈：PCI 骨架 → 寄存器 HAL → 命令队列 → 资源池 → TX/RX →
          netdev 注册，再加 RDMA 那一侧。
      - label: 做法
        text: >-
          15 封一次交齐：PCI core 驱动骨架、寄存器 HAL、命令队列、CQ/QP 资源池、以太网 RX/TX
          路径与统计、netdev 注册、事件队列与中断，以及 RDMA 设备与 PD/MR。
      - label: 效益
        text: >-
          新厂商直接按上游规范送驱动，而不是先走一份 downstream。对读者来说，这类系列是
          「一个网卡驱动进主线需要哪几层」的完整样本。
    relevance: 和相机驱动对照看：一个 NIC 驱动和一个 sensor 驱动要交代的地基，结构上惊人地像——寄存器、队列、中断、资源生命周期。
    link: "https://lore.kernel.org/netdev/<20261012114352.2471317-1-tianx@yunsilicon.com>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "没人再持有这个挂载时，卸载不必等宽限期"
    meta: "〔10-12 23:39 北京〕· [PATCH 0/9] fs: unmount without a grace period when nothing else holds the mounts"
    points:
      - label: 定位
        text: >-
          VFS 的挂载点生命周期。卸载一个挂载点要确认没人在用，这中间有个<strong>宽限期</strong>
          （grace period）的概念——传统上要等引用干净了才能销毁。
      - label: 做法
        text: >-
          9 封的提案：当「没有别的持有者」时，卸载<strong>不必再等宽限期</strong>，直接走。
          系列里还包括把 ipc 的 mqueue 挂载改用 <code>kern_unmount()</code>。
      - label: 效益
        text: >-
          反复挂载 / 卸载的场景（容器、命名空间）能少等一轮。这类改动的难点不在省时间，而在
          「证明真的没人持有」——9 封的分量主要在论证上。
    relevance: VFS 的宽限期思路在别处也见得到（RCU、文件描述符回收）。看它怎么论证「可以不等」，比结论本身更有用。
    link: "https://lore.kernel.org/linux-fsdevel/<20261012-work-mount-gp_on_demand-proposal-v1-0-43f60221a7d0@kernel.org>/"

  - type: highlight
    title: "RWF_DIRECT：不必动整个 fd，就能让单次 IO 走直接写"
    meta: "〔10-13 02:47 北京〕· [PATCH] fs: add RWF_DIRECT for preadv2/pwritev2/io_uring to set IOCB_DIRECT per io"
    points:
      - label: 定位
        text: >-
          <code>read</code>/<code>write</code> 的 flag 语义，以及 io_uring 的提交路径。
          直接 IO（O_DIRECT）过去是<strong>文件描述符级</strong>的属性。
      - label: 做法
        text: >-
          新增 <code>RWF_DIRECT</code>，让 <code>preadv2</code>/<code>pwritev2</code> 与
          io_uring 能<strong>按单次 IO</strong> 设置 <code>IOCB_DIRECT</code>。
      - label: 效益
        text: >-
          混用直接 IO 与缓冲 IO 的应用（文件服务器、数据库）不必为了几次直接写去改整个 fd 的
          打开标志，也不用在同一个文件上开两个 fd。
    relevance: 「把 fd 级属性下沉成单次操作级」这个模式，在 epoll、io_uring 一路都出现过。它每次都会引出同一个问题：状态该存在哪。
    link: "https://lore.kernel.org/linux-fsdevel/<20261012184642.558349-1-metze@samba.org>/"

  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "rust: ww_mutex 到 v12——给 Rust 驱动补上显存管理要用的锁"
    meta: "〔10-12 18:27 北京〕· [PATCH v12 0/6] rust: add ww_mutex support"
    points:
      - label: 定位
        text: >-
          Rust-for-Linux 对内核锁原语的封装层。<strong>ww_mutex</strong> 是 wound-wait
          互斥锁：拿不到就整体回退重来，DRM 用它一次锁住一组 buffer 以避免 ABBA 死锁。
      - label: 做法
        text: >-
          ww_mutex 的 Rust 支持到 v12；这一版还带了 MAINTAINERS 条目，把作者加为 ww mutex 的维护者。
      - label: 效益
        text: >-
          给 Rust 写的 DRM 驱动补上显存管理需要的锁原语——和今天头条那条 Nova 正好接上：
          抽象层和锁都是同一批人在往前推。
    relevance: 想给内核写 Rust 驱动的，这一系列是很好的样本：一个 C 侧成熟原语，要在 Rust 里安全地表达出来，需要反复几版。
    link: "https://lore.kernel.org/rust-for-linux/<cover.1791799751.git.work@onurozkan.dev>/"

  - type: highlight
    title: "把「非空」写进类型：rust: add NonEmpty"
    meta: "〔10-12 19:53 北京〕· [PATCH 0/2] rust: add NonEmpty"
    points:
      - label: 定位
        text: >-
          Rust 侧的核心库类型层——也就是 <code>rust/kernel</code> 里那些给驱动用的基础封装。
      - label: 做法
        text: >-
          提议新增 <code>NonEmpty</code>（配一个 slice 版本），并先在
          <code>uaccess</code> 的 <code>strcpy_into_buf()</code> 里用上。
      - label: 效益
        text: >-
          把「这段切片一定非空」从运行时检查前移成<strong>类型级保证</strong>——调用者不用再写
          if，编译器替他记着。
    relevance: 「让类型承担约束」是 Rust 进内核的主要理由之一。这类小类型看着不起眼，但它们是抽象层能站住的前提。
    link: "https://lore.kernel.org/rust-for-linux/<20261012-nonempty-slice-v1-0-37d1fecff82c@proton.me>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-fsdevel/<20261013-work-fs-idle_fs-v1-0-2063d1bcb5aa@kernel.org>/"
        text: "fs：别让空闲线程把 initramfs 钉住（0/2，空闲线程共用 init_fs）"
        time: 10-13 06:11
      - link: "https://lore.kernel.org/linux-fsdevel/<lFkvlZiS6r6eoluUzuePTelWdD4Z7Vx5SbEhV7qUqYcDJUtoXpyLVDm3cA05RHQ0CqR5-vnhJtEsghutpE3rlXwC3czdrydo1f1sG-t4CqA=@proton.me>/"
        text: "fs：qnx4 越界读报告——xblk_num_xtnts 没按 QNX4_MAX_XTNTS_PER_XBLK 校验"
        time: 10-13 05:27
      - link: "https://lore.kernel.org/linux-pci/<20261012-pcie-hotplug-nullref-v1-1-6e21c2e89ea4@google.com>/"
        text: "PCI：pciehp 热插拔里 pciehp_configure_device() 的空指针解引用修复"
        time: 10-13 06:04
      - link: "https://lore.kernel.org/linux-pci/<20261012-pcie-link-endpoints-v7-0-36aba9c91f10@google.com>/"
        text: "PCI：Lane Margining at the Receiver 的 debugfs 接口（v7，2 封）"
        time: 10-13 01:37
      - link: "https://lore.kernel.org/linux-pci/<20261012-fix-aer-mask-override-v1-0-49a0d7aeaea0@google.com>/"
        text: "PCI/AER：让 aer_inject 的 aer_mask_override 真的生效，并补上文档（2 封）"
        time: 10-13 04:58
      - link: "https://lore.kernel.org/dri-devel/<20261012-claude-fixes-v15-0-bc0a6c498553@collabora.com>/"
        text: "DRM：Panfrost 修复集（v15，15 封——perfcnt、RPM/refcnt、初始化重构）"
        time: 10-12 22:48
      - link: "https://lore.kernel.org/dri-devel/<20261012-sahara_protocol_new_v2-v8-0-e12939d229a1@oss.qualcomm.com>/"
        text: "DRM/bus：Qualcomm Sahara 协议增强（v8，7 封——DDR 训练数据、QDU100 变体）"
        time: 10-13 02:18
      - link: "https://lore.kernel.org/linux-media/<cover.1791831649.git.antti.laakso@linux.intel.com>/"
        text: "media：Intel CVS 在快速连续采集时卡住（2 封，含移除 runtime PM）"
        time: 10-13 03:25

  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: Rust 也能查数据竞争了
        text: "kbuild: rust: enable KCSAN support（KCSAN 数据竞争检测器开始覆盖 Rust 代码），并配了 KUnit 测试验证能真的抓到竞争 · <a href=\"https://lore.kernel.org/rust-for-linux/<20261012134159.912183-1-elver@google.com>/\">原文</a>"
      - label: xarray 一天三个生命周期修复
        text: "同一个作者连发三封：释放旧 head 前先清掉新 head 的 parent、释放节点前先 unlink、新根节点要初始化 offset——都是「谁先谁后」的次序问题 · <a href=\"https://lore.kernel.org/linux-mm/<20261012174230.772325-1-nickolai@csail.mit.edu>/\">原文</a>"
      - label: 存储元件降级（depopulation）
        text: "block: Add support for storage element depopulation（v5，9 封）——让上层知道某块存储介质已被摘掉，而不是当成可写 · <a href=\"https://lore.kernel.org/linux-block/<20261012130121.1902634-1-dlemoal@kernel.org>/\">原文</a>"
      - label: 给架构一个配 LLC 属性的口子
        text: "lib/sbm（RFC v3，13 封）——引入让各架构描述自己 LLC（末级缓存）属性的 helper，powerpc / s390 先在 topology 初始化时用上 · <a href=\"https://lore.kernel.org/linux-arch/<460a7726022740feeee606538e4cf63adf6090c2.camel@linux.intel.com>/\">原文</a>"
      - label: KUnit 参数化用例重名
        text: "kunit: Add KUNIT_CASE_PARAM_UNIQUE()（9 封）——参数化用例此前会撞名字，新增两个宏让每个用例名唯一，顺手把 ext4 / cs_dsp / ASoC 的用例都改过来 · <a href=\"https://lore.kernel.org/lkml/<20261013-kunit-param-names-v1-0-4b22ec5b85b9@kernel.org>/\">原文</a>"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: dma_fence
        text: DRM 的跨驱动同步原语。一个驱动把「某件事做完了」变成一个可等待对象，另一个驱动或用户态去等它——GPU 的跨引擎同步全靠它。
      - label: PMD
        text: 页中间目录（Page Middle Directory）。页表的中间一层，一个 PMD 项对应的映射粒度在 x86-64 上是 2MB，arm64 用 64K 页时是 512MB。
      - label: ACS（Access Control Services）
        text: PCIe 上的访问控制。交换机和根口的几个控制位，决定设备之间能不能 P2P、能不能互相转发事务。
      - label: TLP（Transaction Layer Packet）
        text: PCIe 事务层包，总线上跑的基本单位。分 Posted / Non-Posted / Completion 几类，还带属性位（比如 Relaxed Ordering、Address Type）。
      - label: Relaxed Ordering
        text: TLP 的一个属性位，表示这个请求不要求严格顺序。带上它的 Completion 会被 ACS 的 Completion Redirect 跳过——这正是今天那条 P2PDMA 补丁的关键之一。
      - label: memory provider
        text: page_pool 的「内存从哪来」抽象。页池里的页可以由内核分配，也可以由别人供给（比如 AF_XDP 的 UMEM）。
      - label: UMEM
        text: AF_XDP 的用户态内存区。应用自己分配一块内存交给内核，收包时直接写进去，省掉一次拷贝。
      - label: MGLRU
        text: 多代 LRU。按「代」组织页面回收，比传统 LRU 更能区分冷热页面，每个 memcg 各有一批代。
      - label: ww_mutex
        text: wound-wait 互斥锁。拿不到就整体回退重来，DRM 用它一次锁一组 buffer 以避免 ABBA 死锁。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
