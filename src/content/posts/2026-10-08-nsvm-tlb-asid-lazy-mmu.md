---
title: "嵌套虚拟化的 TLB 终于有自己的 ASID：nSVM 29 帖；s390 在惰性 MMU 下批量改 PTE"
date: "2026-10-08"
desc: "KVM nSVM 给 L2 单独分配 ASID，嵌套切换不再全量刷 TLB（29 帖）；s390 在惰性 MMU 模式里批量更新 PTE；Hyper-V vmbus 要让 ring 与主机可见缓冲跨重启存活。"
column: "daily"
tags: ["mm", "DRM", "PCI", "net", "fs", "block", "arch", "LSM", "Rust"]
blocks:
  - type: hook
    text: >-
      今天两条都关于<strong>「别再每次都做全量工作」</strong>：KVM 的嵌套 SVM 以前每进出一层就刷掉整个 TLB，
      现在给 L2 <strong>单独分配 ASID</strong>；s390 则是在惰性 MMU 模式下<strong>批量化 PTE 更新</strong>，
      不再一条一条写。另一条值得看的是 Hyper-V vmbus——<strong>让 ring 与主机可见缓冲跨重启存活</strong>，
      为的是 guest 热更新。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-08/cover.png"
    alt: "封面 · 10月8日 · 嵌套虚拟化的 TLB 有自己的 ASID"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "KVM nSVM 29 帖：给 L2 单独 ASID，不再每次嵌套切换全量刷 TLB"
      - label: "头条"
        text: "s390/mm 15 帖：惰性 MMU 模式下批量更新 PTE"
      - label: "net"
        text: "Hyper-V vmbus 14 帖：让 ring 与主机可见缓冲跨内核热更新存活"
      - label: "media"
        text: "dma-buf 经 io_uring 读写到 v9：一天内从 v8 走到 v9"
      - label: "fs"
        text: "Landlock 管到 namespace 与 capability（v5，8 帖）；netfs 抽出 bvecq chain position（v14）"
      - label: "DRM"
        text: "Panfrost 大修到 v13：perfcnt、runtime PM、重构"
      - label: "PCI"
        text: "RZ/G3S PCIe 热插拔到 v6；xfs/nfsd 一次映射整个 pNFS block layout"
      - label: "机制"
        text: "v7.4 合入窗口前的准备系列集中出现（RCU、rcutorture、DCD）"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-08/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-08 06:23 北京，近 24h 各板块真实计数：net 468 · DRM 203 · media 183 · mm 103 ·
      PCI 87 · fs 70 · block 41 · LSM 31 · Rust 27 · arch 13 · rt 8 · virtio 0。
      net 依旧是量最大的一头（多为驱动修复流）；今天的重量集中在 lkml 与 mm 两条——
      nSVM 的 29 帖与 RCU 系列属前者，s390 的批量 PTE 属后者。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "嵌套虚拟化不必每次刷掉整个 TLB：nSVM 给 L2 单独分配 ASID"
    meta: "〔10-08 08:14 北京〕· [PATCH v2 00/29] KVM: nSVM: Optimize nSVM TLB flushes"
    points:
      - label: 现状
        text: >-
          AMD 的嵌套虚拟化（nSVM）里，L1 是宿主、L2 是跑在 L1 里的客户机。
          此前 L2 <b>和 L1 共用同一个 ASID</b>——ASID 是 CPU 用来区分不同地址空间的标记，
          TLB 条目挂在它上面。共用就意味着：<b>每次 L1↔L2 切换都得把 TLB 刷干净</b>，
          因为不然无法区分哪些条目属于谁。
      - label: 痛点
        text: >-
          嵌套切换在这种负载下非常频繁，全量刷新等于每切一次就把积累的地址翻译全部丢掉，
          切回来再重建。<b>成本随嵌套层数线性放大</b>，这是嵌套虚拟化性能长期的一个痛点。
      - label: 方案
        text: >-
          29 帖做两件事：一是<b>给每个 vCPU 的 L2 维护独立的 ASID</b>，切进切出只失效属于对方的那些条目，
          而不是整表刷新；二是<b>取消动态 ASID 分配，改为每 vCPU 静态分配</b>（启用嵌套时用两个）。
          作者给出的依据很直接：现代 CPU（Rome / Milan / Genoa / Turin）<b>宣称支持 32K 个 ASID</b>，
          动态分配那套复用机制已经没有存在必要。
      - label: 为什么
        text: >-
          路线选择的本质是<b>向 VMX 看齐</b>——Intel 侧早就用 VPID 给 L2 单独标识，
          nSVM 这轮是把 AMD 侧补到同一个模型上。取消动态分配同样是简化：
          既然 ASID 空间够大，就不用再维护一套分配/回收逻辑。
      - label: 效益
        text: >-
          嵌套场景下 TLB 失效的范围从「整表」缩小到「属于某一层的那部分」，
          地址翻译的复用率提高。对跑多层虚拟化的云平台是直接的性能收益。
      - label: 下一步
        text: >-
          v2 阶段，且作者<b>明确标注了测试覆盖的边界</b>：新增 selftest 覆盖 L1 为 L2 刷 TLB、
          以及 KVM 同时为 L1 和 L2 触发刷新的场景；但 Hyper-V 相关部分<b>只做了编译测试</b>，
          SEV 部分只用 SEV selftest 验证过。这种坦白对评审很有用——它指出哪里还需要人肉把关。
    verdict: >-
      「硬件能力够了，旧机制就该退休」的典型。取消动态 ASID 分配比新增独立 ASID 更能说明这个系列的性质：
      它做的是减负，不是加功能。
    link: "https://lore.kernel.org/lkml/<20261008001425.2458927-1-yosry@kernel.org>/"
  - type: headline
    title: "s390 在惰性 MMU 模式下批量改 PTE"
    meta: "〔10-07 19:43 北京〕· [PATCH v8 00/15] s390/mm: Batch PTE updates in lazy MMU mode（Alexander Gordeev / IBM）"
    points:
      - label: 现状
        text: >-
          「惰性 MMU 模式」是 s390 上的一种加速开关：在这种模式下，页表更新不是立刻生效，
          而是先攒起来、稍后一次性提交。它牺牲一部分语义的即时性，换取更少的机器开销。
      - label: 痛点
        text: >-
          但即便进了惰性模式，PTE 仍然是<b>逐条更新</b>的——批量提交的好处没能吃满。
          更新的条数一多，逐条写的开销就回来了。
      - label: 方案
        text: >-
          v8 共 15 帖，把 PTE 更新在惰性 MMU 模式下改成<b>批量处理</b>：
          一批页表项一起构造、一起提交，而不是一条一条走完整流程。
      - label: 下一步
        text: >-
          已到 v8，属于长期打磨的架构专属优化。看 s390 维护者对批量边界的意见——
          批量越大收益越高，但中间态的一致性要求也越紧。
    relevance: >-
      「把逐条操作改成批量」是内核里反复出现的优化范式，和本期 nSVM 的「缩小失效范围」是同一类思路：
      找一个每次都在做全量工作的点，把它变成增量的。
    link: "https://lore.kernel.org/linux-mm/<cover.1791365932.git.agordeev@linux.ibm.com>/"
  - type: divider
    label: "📰 net / 虚拟化"
    kind: section
  - type: highlight
    title: "Hyper-V vmbus：让 ring 与主机可见缓冲跨内核热更新存活"
    meta: "〔10-08 03:08 北京〕· [PATCH v2 0/14] hv: vmbus: make rings and host-visible buffers survive boot"
    points:
      - label: 定位
        text: >-
          vmbus 是 Hyper-V 虚拟机的虚拟总线。ring 是 guest 与主机之间传递消息的环形缓冲，
          「主机可见缓冲」则是双方共享的内存区——这两块都是设备状态的核心。
      - label: 做法
        text: >-
          14 帖让这些缓冲区<b>跨重启存活</b>。放在内核热更新（live update）的大背景下看就清楚了：
          新内核接管时，如果 vmbus 的 ring 和共享缓冲还在原位，<b>虚拟机就不必重新枚举虚拟设备</b>。
      - label: 下一步
        text: >-
          v2 阶段。这条线与本周反复出现的 KHO/LUO 热更新系列是同一条长线，
          区别只是它在 Hyper-V 这一侧。
    relevance: >-
      内核热更新正在从「内存、设备、vCPU」一路铺到各虚拟化平台的具体总线上。
      vmbus 这轮是 Hyper-V 侧的适配。
    link: "https://lore.kernel.org/netdev/<20261007190752.336426-1-emersonbusson@gmail.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<cover.1791336930.git.asml.silence@gmail.com>/"
        text: "dma-buf 经 io_uring 读写到 v9：一天之内从 v8 走到 v9，收敛很快"
        time: 10-07 09:43
      - link: "https://lore.kernel.org/linux-pci/<20261007053645.1391545-1-claudiu.beznea@kernel.org>/"
        text: "RZ/G3S 的 PCIe 热插拔支持到 v6（9 帖）"
        time: 10-07 13:37
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-fsdevel/<20261007100255.1333386-1-mic@digikod.net>/"
        text: "Landlock 扩到 namespace 与 capability 控制（v5，8 帖）：沙箱能管的东西又多两类"
        time: 10-07 18:10
      - link: "https://lore.kernel.org/linux-fsdevel/<20261007142001.851620-1-dhowells@redhat.com>/"
        text: "netfs 抽出 bvecq chain position 抽象（v14，8 帖）：上一轮 bio_vec 链的后续清理"
        time: 10-07 22:20
      - link: "https://lore.kernel.org/lkml/<20261008-xfs-nfsd-map-blocks-v1-0-560026cdccb6@samsung.com>/"
        text: "xfs, nfsd：一次映射整个 pNFS block layout，而不是逐块走"
        time: 10-08 09:39
  - type: divider
    label: "📰 其余板块"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20261008-claude-fixes-v13-0-d6a493185860@collabora.com>/"
        text: "Panfrost 修复合集到 v13（15 帖）：perfcnt、runtime PM 与重构"
        time: 10-08 07:43
  - type: divider
    label: "📌 机制雷达：v7.4 合入窗口前的准备系列"
    kind: primary
  - type: toc
    items:
      - label: "RCU 系列集中出现"
        text: >-
          同一天里 RCU 相关至少两批：<b>atomic SRCU</b>（21 帖）与 <b>Miscellaneous RCU updates for v7.4</b>（10 帖），
          另有 rcutorture 的 torture-test updates（8 帖）。标题里带「for v7.4」意味着这是<b>面向下一个合入窗口的
          预定动作</b>——RCU 的更新习惯以固定节奏成批进入。
          <a href="https://lore.kernel.org/lkml/<20261007210408.1983713-8-paulmck@kernel.org>/">原文</a>
      - label: "DCD Prep Series 到 v15"
        text: >-
          「DCD」（Detached Control Device 相关）的准备系列已到第 15 版。
          带 Prep 字样的系列通常是<b>为某个更大改动先做铺垫</b>，本身不含功能，但决定后续能否顺利落地。
          <a href="https://lore.kernel.org/lkml/<20261007201828.952-1-anisa.su@samsung.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "ASID（Address Space ID）"
        text: >-
          CPU 用来区分不同地址空间的标记，TLB 条目挂在它上面。不同 ASID 的翻译可以共存于 TLB，
          切换地址空间时不必全表刷新——本期 nSVM 的核心就是给 L2 单独分配 ASID。
      - label: "nSVM / nested SVM"
        text: >-
          AMD 的嵌套虚拟化：L1 是宿主，L2 是跑在 L1 里的客户机。KVM 要同时处理两层地址翻译。
      - label: "惰性 MMU 模式（lazy MMU）"
        text: >-
          s390 上的加速开关：页表更新不立刻生效，先攒起来稍后一次性提交，用语义即时性换机器开销。
      - label: "vmbus / ring"
        text: >-
          vmbus 是 Hyper-V 虚拟机的虚拟总线；ring 是 guest 与主机之间的环形消息缓冲。
          本期系列让它们跨内核热更新存活，避免重新枚举虚拟设备。
      - label: "bvecq chain position"
        text: >-
          netfs 里描述「数据在 bio_vec 链上的哪个位置」的抽象。上一轮把 folio_queue 换成 bio_vec 链之后，
          这轮把位置表示也抽出来。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
