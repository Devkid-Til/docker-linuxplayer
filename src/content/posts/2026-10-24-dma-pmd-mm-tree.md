---
title: "2MB 大页切 IO 缓冲池，MM 子系统拆成多棵树"
date: "2026-10-24"
desc: "DMA_PMD 想用 2MB 大页切 4K 片段做设备缓冲池；新 core MM 树首次向 Linus 发 pull。"
column: "daily"
tags: ["media", "DRM", "mm", "net", "fs", "Rust", "LSM", "block", "arch", "sched"]
blocks:
  - type: hook
    text: >-
      今天两条大改动都指向「IO 与内存的边界」：<strong>DMA_PMD</strong>
      想用 2MB 大页切出 4K 片段来做设备缓冲池；
      同时内核 <strong>MM 子系统</strong>刚拆出新的 core MM 树，从 7.4 起分路合入。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-24/cover.png"
    alt: "封面 · 10月24日 · 2MB 大页做 IO 缓冲池"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-24/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-24 06:23 北京，近 24h 各板块真实计数：net 434 · mm 272 · DRM 240 ·
      fs 175 · media 132 · PCI 42 · LSM 33 · block 32 · Rust 26 · rt 19 · arch 14 ·
      virtio 0。net 仍然最高，但今天的重心其实是 <strong>mm 的 IO 缓冲池</strong>
      与 <strong>7.4 合并窗口的 pull</strong>。

  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: 头条
        text: 用 2MB 大页切 4K 片段，IO 缓冲池想少做映射
      - label: 头条
        text: MM 拆出 core 树，首个 pull 已发 Linus
      - label: 采集
        text: MIPI C-PHY 要有通用 PHY API；CAMSS 加 Waipio
      - label: 显示
        text: Rust VFIO/vGPU 第 2 版；panthor 统一电源委托
      - label: 内存
        text: mremap 扩展 VM_MIXEDMAP 的 6.1 回归
      - label: 网络
        text: stmmac XDP 六处修复；e1000e 巨帧 BUG
      - label: 机制
        text: attestation 子系统 RFC、RCU 伪事务、Proxy Execution v33

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "用 2MB 大页切 4K 片段，IO 缓冲池想少做映射"
    meta: >-
      〔10-24 04:23 北京〕· [RFC: DMA_PMD 00/22] DMA_PMD: PMD_SIZE-backed IO buffer pools
    points:
      - label: 现状
        text: >-
          网卡、磁盘、相机这些 IO 设备拿缓冲，基本是 4KB 页为单位，
          每个 skb、每个帧都要单独做一次 DMA 映射，IOMMU 的 IOTLB 里很快塞满小条目。
      - label: 痛点
        text: >-
          映射/解映射有 CPU 成本，IOTLB 小条目多了会抖动；
          机密计算（CC）场景下，设备不能直接访问加密内存，还要额外走 bounce buffer 拷贝。
      - label: 方案
        text: >-
          Luigi Rizzo 的 22 补丁 RFC 把 PMD 大小（2MB）的连续页做成 IO 缓冲池，
          再切成 4K 片段独立回收；片段状态放不进 <code>struct page</code>，
          于是按 pfn 查一份 <code>dma_pmd_meta</code>。多设备/多 IOMMU domain 映射同一块 2MB 时，
          它直接给所有设备分配同一个特殊 IOVA 区间。
      - label: 为什么
        text: >-
          争议正在这里。Jason Gunthorpe 认为 netdev 不该碰 IOMMU——
          用普通 DMA API 拿 2MB 页再映射就够了，「全局共享 IOVA」是绕过所有分层；
          Jakub Kicinski 则说 netdev 乐意把 2MB 映射加进 page_pool，
          dmabuf 的 memory provider 已经合入，加大映射是顺手的事。
      - label: 效益
        text: >-
          如果方案成立，收包/采帧的映射次数从每 4K 一次降到每 2MB 一次，
          CC 下也省掉一整轮 bounce buffer 拷贝。
      - label: 下一步
        text: >-
          作者说下一版把 CC 共享内存改成按设备、按方向 opt-in；
          Jason 建议收缩成一个「DMA 分配时请求全局共享 IOVA」的小系列。这里也留出了贡献空间。
    verdict: 方向有价值，但分层之争没谈拢；先做一个窄的 DMA API 提案更可能落地。
    link: https://lore.kernel.org/linux-mm/<CAMOZA0KZi1EkJaAFKfwOm8jo1ydyGh=W1RE0iMfte-ZQkOx9AA@mail.gmail.com>/

  - type: headline
    title: "MM 拆出 core 树，首个 pull 已发 Linus"
    meta: >-
      〔10-24 01:21 北京〕· [GIT PULL] Core MM updates for 7.4 (new MM tree)
      （David Hildenbrand）
    points:
      - label: 现状
        text: >-
          多年以来，内存管理的补丁主要经由 Andrew Morton 的 -mm 树汇总，
          再由他一个人向 Linus 发 pull。
      - label: 痛点
        text: >-
          这条单点通道负载太重，slab、memblock、内存热插拔这些组件
          也很难有独立的集成节奏——维护者峰会上讨论了这个问题。
      - label: 方案
        text: >-
          David Hildenbrand 建了 <code>mm/core.git</code>，
          这次把 <code>mm-core-7.4-rc1</code> 作为新 core MM 树的第一个 pull 发给 Linus；
          7.4 的 MM 更新改走 slab、memblock、Andrew 的 MM、core MM 四条路。
      - label: 为什么
        text: >-
          系列用 merge commit 承载改写后的 cover letter，topic branch 用合并提交汇总；
          这样既保留每个系列的说明，也让组件维护者能独立集成。
      - label: 效益
        text: >-
          大改动按组件分流，Linus 拉取时看到的是分层的 tag 摘要，
          而不是一锅端的大杂烩。
      - label: 下一步
        text: >-
          7.5 会减少走 Andrew 树的补丁，把 memblock、slab、core 逐步并进统一的 MM 集成树。
          对写 MM 补丁的人来说，接下来要留意的「该发哪棵树」会变。
    verdict: 一次流程重构，但会改变之后每个 MM 补丁的路径。
    link: https://lore.kernel.org/linux-mm/<20261023172100.49643-1-david@kernel.org>/

  - type: divider
    label: "📰 media 采集"
    kind: section
  - type: highlight
    title: "MIPI C-PHY 要有通用 PHY API 了"
    meta: "〔10-23 10:15〕· [PATCH 1/3] phy: core: add generic MIPI C-PHY configuration API"
    points:
      - label: 定位
        text: >-
          在 phy core 层。D-PHY 有一条通用的 <code>phy_configure_opts_mipi_dphy</code>，
          但 C-PHY（一条 lane 三根线）没有对应结构，厂商各自的相机 PHY 驱动只能自己传参。
      - label: 做法
        text: >-
          新增 <code>phy_configure_opts_mipi_cphy</code>，沿用 D-PHY 的
          <code>lanes</code> 语义（一条 data lane = 三根线，不引入 trios 新词），
          去掉不需要的 lane_positions/lane_polarities，并补上 symbol_rate。
      - label: 效益
        text: >-
          由 PHY 统一表达配置，CSI 接收端（CSID）按 symbol_rate 投 NoC/相机时钟票，
          避免每个 SoC 厂商各写一套。
    relevance: 调 C-PHY 相机链路时，PHY 配置终于不用跟着具体驱动走了。
    link: https://lore.kernel.org/linux-media/<e3d322a0-43d5-4369-bd09-128152f4b233@linaro.org>/

  - type: highlight
    title: "CAMSS 补上 Waipio（SM8450）支持"
    meta: "〔10-24 00:31〕· [PATCH 0/7] media: qcom: camss: Add Waipio CAMSS support"
    points:
      - label: 定位
        text: >-
          drivers/media/platform/qcom/camss 驱动 + arm64 设备树。
      - label: 做法
        text: >-
          新增 Waipio CAMSS 与 CSI2 PHY 的 DT 绑定和节点，
          并允许 CSI2 PHY 设备不带 CSIPHY resource 注册。
      - label: 效益
        text: >-
          SM8450 平台可以用上游 CAMSS 驱动直接跑相机，不必再背下游补丁。
    relevance: 高通平台相机链路的又一块上游化拼图。
    link: https://lore.kernel.org/linux-media/<20261023163057.775917-1-vz@kernel.org>/

  - type: highlight
    title: "Intel IPU6 一口气修 11 处边界与泄漏"
    meta: "〔10-24 03:55〕· [PATCH v1 00/11] media: intel/ipu6: bounds, leak, and error handling fixes"
    points:
      - label: 定位
        text: >-
          IPU6 相机驱动的 MMU 与固件消息路径。
      - label: 做法
        text: >-
          修 IOVA 泄漏、fw 消息缓冲泄漏、pin 越界、crop 偏移、dummy L2 页表未 unmap、
          sgtable 映射失败未返回错误等一串错误路径问题。
      - label: 效益
        text: >-
          长时间开关流、反复 probe 时不再慢慢漏内存，出错也能干净回滚。
    relevance: 相机驱动错误路径是最容易漏的地方，这份清单可以当模板看。
    link: https://lore.kernel.org/linux-media/<20261023195446.22578-1-valerii.sokolov@pm.me>/

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "Rust 写的 NVIDIA vGPU 驱动，第 2 版"
    meta: "〔10-23 23:41〕· [PATCH v2 00/12] Rust VFIO PCI support and NVIDIA vGPU driver"
    points:
      - label: 定位
        text: >-
          Rust 的 PCI/VFIO 抽象层，服务 Nova（Rust 版 NVIDIA GPU 驱动）。
      - label: 做法
        text: >-
          12 个补丁先补 PCI helper 和 VFIO PCI 抽象，再把 bind/reset/AER/runtime-PM
          回调加进共享 PCI adapter，VFIO 跟着迁移；最后用 nova-core 的类型化 SR-IOV PF 接口
          注册 NVIDIA VFIO variant driver，负责创建、复位、释放 vGPU 实例。
      - label: 效益
        text: >-
          用户态通过 VFIO 拿到 vGPU，而管理面全在 Rust 驱动里完成；
          VFIO 从此不再假设「只有 C 驱动才配 PCI」。
    relevance: Rust 驱动从「能跑」走到「能管硬件生命周期」的标志性一步。
    link: https://lore.kernel.org/dri-devel/<20261023154009.2246627-1-xinmengs@nvidia.com>/

  - type: divider
    label: "📰 mm 内存"
    kind: section
  - type: highlight
    title: "mremap 扩 VM_MIXEDMAP，从 6.1 起就一直失败"
    meta: "〔10-23 10:31〕· [REGRESSION] mremap() fails VMA expansion when VM_MIXEDMAP is set"
    points:
      - label: 定位
        text: >-
          mm/mremap 的 VMA 扩展路径。
      - label: 做法
        text: >-
          6.1 的 <code>ca3d76b0aa80</code> 把扩展从 <code>vma_adjust()</code>
          改成 <code>vma_merge()</code>，而 <code>vma_merge()</code> 对任何
          VM_SPECIAL（含 VM_MIXEDMAP）的 VMA 直接返回 NULL，于是扩展报 -ENOMEM。
        relevance: 你的驱动如果用 <code>vm_insert_page()</code> 并带 VM_MIXEDMAP，用户态扩映射一样会踩到。
      - label: 效益
        text: >-
          Lorenzo Stoakes 已确认报告有效，正在写修复；上游同样受影响的还有 cramfs 与 FUSE DAX。
    link: https://lore.kernel.org/linux-mm/<20261023023106.515365-1-luizcap@redhat.com>/

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "stmmac 的 XDP 路径一次修六处"
    meta: "〔10-23 16:10〕· [PATCH net 0/6] net: stmmac: XDP path fixes"
    points:
      - label: 定位
        text: >-
          stmmac 以太网驱动的 XDP RX 路径。
      - label: 做法
        text: >-
          处理 AF_XDP 零拷贝下被拆分的帧、多缓冲帧、VLAN 标签剥离、
          RX 缓冲 DMA sync 长度，以及在 poll 入口接管保存的 RX 状态。
      - label: 效益
        text: >-
          开 XDP 后不再因为非线性帧/巨帧读错内存或算错校验。
    relevance: 嵌入式网口（RK3588 也在用 stmmac）开 XDP 时的稳定性直接受益。
    link: https://lore.kernel.org/netdev/<20261023-stmmac-xdp-fixes-v1-0-efb37e19f5bd@oss.qualcomm.com>/

  - type: highlight
    title: "e1000e 巨帧：目的地址不在 RAR 就报 RX CRC 错"
    meta: "〔10-24 06:23〕· [BUG] e1000e: I219 with jumbo MTU: RX CRC errors"
    points:
      - label: 定位
        text: >-
          e1000e 驱动的接收过滤路径，I219 网卡。
      - label: 做法
        text: >-
          报告指出开巨帧 MTU 后，单播目的地址不在 RAR（接收地址寄存器）里时，
          混杂/桥接端口会出现 RX CRC 错误。
      - label: 效益
        text: >-
          若确认，桥接或 promisc 场景下的巨帧丢包有了解释和修复入口。
    relevance: 典型「硬件过滤表 + 巨帧」交互问题，适合拿来练排查。
    link: https://lore.kernel.org/netdev/<20261023222252.2528909-1-me@andrei-z.com>/

  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-media/<20261024-ov08d10-get-selection-v2-0-f8c49972ca18@leica-geosystems.com>/
        text: "ov08d10 传感器改用 subdev active state，并补 get_selection（v2）"
        time: 10-24 06:31
      - link: https://lore.kernel.org/dri-devel/<20261023125319.35905-1-daniels@collabora.com>/
        text: "panthor 统一把 shader 电源决策委托给固件（v3）"
        time: 10-23 20:53
      - link: https://lore.kernel.org/linux-block/<20261023043423.176002-1-yupeng0921@gmail.com>/
        text: "nvmet 给 namespace I/O 带上 cgroup_id，按 cgroup 记账"
        time: 10-23 12:34
      - link: https://lore.kernel.org/linux-fsdevel/<20261023-b4-s-umount-killable-v1-0-844a341ff1df@toxicpanda.com>/
        text: "等 s_umount 的五个系统调用改成可被信号打断"
        time: 10-24 04:39
      - link: https://lore.kernel.org/linux-fsdevel/<20261023151850.96475-1-breno3011alves@gmail.com>/
        text: "提议删除 hpfs 文件系统；同一天还有人提 qnx4"
        time: 10-24 00:08
      - link: https://lore.kernel.org/rust-for-linux/<20261023130413.178487-1-chenhan0017.work@gmail.com>/
        text: "Rust 的 Delta 时间算术修一致性，并加有符号除余辅助"
        time: 10-23 21:04
      - link: https://lore.kernel.org/netdev/<20261023082308.23080670@kernel.org>/
        text: "page_pool 在索引 dev->_rx[] 前先约束 queue_idx"
        time: 10-23 23:23
      - link: https://lore.kernel.org/rust-for-linux/<atuOKm_Yj5JXsrb0@zenone.zhora.eu>/
        text: "rust-i2c-next 已向 7.4 发 pull"
        time: 10-24 00:41

  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: attestation 子系统
        text: >-
          20 补丁 RFC 要把 TDX、CCA 等机密计算的远程证明收敛成一个公共子系统，
          讨论集中在 SPDM 证书链与 DOE 通道的归属 ·
          <a href="https://lore.kernel.org/lkml/<20261023201319.1bc44cfa@jic23-hlaptop>">原文</a>
      - label: RCU 伪事务
        text: >-
          12 补丁 RFC 引入 <code>rcu_txn</code>：单写者把一组链表修改打包成事务，
          读者始终看到一致视图，附带 hash/list 示例与测试 ·
          <a href="https://lore.kernel.org/lkml/<20261023181940.457424-1-puranjay@kernel.org>">原文</a>
      - label: Proxy Execution v33
        text: >-
          长跑系列推进到「睡眠 owner 处理」：owner 在睡时先把 waiter 挂到 owner 的链上，
          醒来再在同一 runqueue 激活、反向 boost ·
          <a href="https://lore.kernel.org/lkml/<20261023220431.1106611-1-jstultz@google.com>">原文</a>
      - label: x86 去掉 sys_ni_syscall
        text: >-
          18 补丁系列清理系统调用入口的间接跳转，省掉一层无用的函数指针间接 ·
          <a href="https://lore.kernel.org/linux-arch/<20261023214353.Q3pZID23@linutronix.de>">原文</a>
      - label: KEYS 换 rhashtable
        text: >-
          Jarkko 的 v2 把 keyring 的 assoc_array 换成 rhashtable，
          顺带限制描述长度、校验 key 身份 ·
          <a href="https://lore.kernel.org/linux-security-module/<20261023120953.1206778-6-jarkko@kernel.org>">原文</a>

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: PMD
        text: >-
          Page Middle Directory，x86-64 上通常对应 2MB 的大页粒度；
          「PMD_SIZE-backed」就是用 2MB 页做底层分配单位。
      - label: IOMMU / IOTLB
        text: >-
          IOMMU 给设备做地址翻译，IOTLB 缓存翻译结果；
          小页映射多，缓存容易装不下。
      - label: VM_MIXEDMAP
        text: >-
          表示这个 VMA 里的页来源混合，驱动可用 <code>vm_insert_page()</code> 一页页插进来；
          它属于 VM_SPECIAL，<code>vma_merge()</code> 不会合并这类 VMA。
      - label: C-PHY / D-PHY
        text: >-
          MIPI 的两套物理层：D-PHY 一条 lane 两根线（差分），
          C-PHY 一条 lane 三根线（三线编码），后者在高速相机链路上更常见。
      - label: VFIO variant driver
        text: >-
          挂在 VFIO 框架下的设备专用驱动，负责 reset、电源、错误处理等硬件生命周期；
          SR-IOV PF 则是能切出多个 VF 的物理功能。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
