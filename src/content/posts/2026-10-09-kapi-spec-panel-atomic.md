---
title: "内核 API 契约第一次变成机读规格；drm_panel 终于进了 atomic 状态机"
date: "2026-10-09"
desc: "内核 API 契约第一次可机读、可运行时校验（KAPI v5）；drm_panel 终于进 atomic 状态机。"
column: "daily"
tags: ["fs", "DRM", "mm", "net", "PCI", "Rust", "media", "LSM", "block"]
blocks:
  - type: hook
    text: >-
      今天两条都关于<strong>「把已经承诺的事情写成能被检查的形式」</strong>：内核一直承诺不破坏用户空间，
      但每个接口的契约只写在散文里——KAPI 框架第一次把它变成<strong>机器可读、还能在运行时校验</strong>的规格；
      另一边，<strong>drm_panel 终于进了 atomic 状态机</strong>，面板从「旁听」变成能拒绝配置的一方。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-09/cover.png"
    alt: "封面 · 10月9日 · 内核 API 契约终于机器可读"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "KAPI v5：把内核 API 的契约写成机器可读的规格，还能在运行时校验"
      - label: "头条"
        text: "drm_panel 获得 atomic 状态：面板终于能参与校验、能拒绝配置"
      - label: "mm"
        text: "zswap 改批量压缩（8 页一批）；直接回收「够了就停」——一次只要 32 页，最坏却扫了 13 万页"
      - label: "net"
        text: "TCP 多两个 BPF 挂载点：把 Google 跑了 5 年的 AutoLOWAT 做成通用机制"
      - label: "PCI"
        text: "机密虚拟机的 vIOMMU 与 TSM 接口到 v7，16 帖"
      - label: "Rust"
        text: "pin-init 让 Rust 驱动能安全写自引用结构（20 帖），DRM jobqueue 在等它"
      - label: "media"
        text: "Qualcomm Kaanapali 相机子系统到 v19：6 个 CSIPHY、5 个 VFE"
      - label: "机制"
        text: "AI 已经站在内核协作链的三个位置上：写代码、报 bug、做评审"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-09/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-09 06:23 北京，近 24h 各板块真实计数：net 784 · DRM 217 · mm 128 · fs 110 ·
      media 94 · LSM 90 · PCI 74 · Rust 69 · block 26 · arch 4 · rt 4 · virtio 2。
      net 仍然是量最大的一头（大头是驱动修复流）；今天的重量则分散在几处：
      fs 侧是 KAPI 这个新框架，DRM 侧是 panel 进 atomic 与 msm/dpu 的资源分配重构，
      mm 侧是压缩与回收两条路都在改粒度。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "内核承诺不破坏用户空间，但这个承诺一直只写在散文里"
    meta: "〔10-08 16:50 北京〕· [PATCH v5 00/11] Kernel API Specification Framework（Sasha Levin / kernel.org）"
    points:
      - label: 现状
        text: >-
          内核有一条硬承诺：已发布的用户空间接口<strong>只能加、不能改</strong>。
          但每个接口的契约本身，只以散文形式散落在 man page 和代码注释里——
          参数类型与合法范围、对齐要求、返回值的成功条件、每个错误码的含义、
          能不能在软中断上下文里调、需要持哪把锁、有什么副作用。
          散文没法被工具检查。
      - label: 痛点
        text: >-
          于是这一切只能靠人。静态分析器不知道 <code>read()</code> 允许返回多少字节，
          测试生成器不知道 <code>madvise()</code> 的哪些参数组合是合法的，
          文档工具只能照抄注释。契约说不清的地方，就只剩下「谁踩过谁记得」。
      - label: 方案
        text: >-
          v5 共 11 帖，做三件事：一是加一套<strong>规格描述 DSL</strong>，
          以 kerneldoc 形式写在代码旁边、可被机器解析；二是把规格<strong>编进内核镜像</strong>（ELF section 存储），
          并开一个 debugfs 接口给用户空间查询；三是加 <code>CONFIG_KAPI_RUNTIME_CHECKS</code>，
          在系统调用入口与出口<strong>运行时校验</strong>，还配了 ftrace 追踪点报告每次调用的具名参数与返回值。
          配套给 <code>sys_open</code> / <code>sys_close</code> / <code>sys_read</code> / <code>sys_write</code> /
          <code>sys_madvise</code> 五个系统调用写了示范规格，另有 33 个 KUnit 测试和 31 个 TAP 运行时 selftest。
      - label: 为什么
        text: >-
          关键取舍是<strong>规格跟着代码走</strong>——写在同一个源文件里、随代码一起改，
          而不是另建一份文档仓库。另建一份的结局通常是慢慢腐烂；挂在代码旁边，腐烂的概率低得多。
          提取工具用 Rust 写（<code>tools/kapi</code>），输出 JSON / RST / 纯文本三种格式，
          静态分析器、测试生成器、文档工具都能直接消费。
      - label: 效益
        text: >-
          内核第一次有了一条「契约可被工具验证」的路径。目标消费者写得很明确：静态分析器与测试生成器——
          也就是让机器去发现「这个实现违反了自己声明的契约」。
      - label: 下一步
        text: >-
          这个系列从去年 12 月的 RFC 走到 v5，已 rebase 到 v7.3-rc6。目前只覆盖 5 个系统调用，
          框架本身才是重点。接下来看 linux-api 与 doc 维护者对「DSL 该长什么样」的意见——
          一旦语法定下来，后面每加一个系统调用都是增量工作。
    verdict: >-
      这是把「口头承诺」变成「可检验合同」的尝试。真正决定成败的不是运行时校验开关（那更像演示），
      而是这套 DSL 能不能被分析工具长期吃下去——语法一旦被工具依赖，改起来就贵了。
    link: "https://lore.kernel.org/linux-fsdevel/<20261008084956.2911790-1-sashal@kernel.org>/"
  - type: headline
    title: "drm_panel 终于有了 atomic 状态：面板从「旁听」变成能拒绝配置的一方"
    meta: "〔10-08 21:15 北京〕· [PATCH RFC 0/9] drm/panel: add atomic state（Dmitry Baryshkov / Qualcomm）"
    points:
      - label: 现状
        text: >-
          DRM 的显示管线走「原子提交」：用户空间一次性提交整条管线的新配置，
          内核先跑一遍 <code>atomic_check</code> 判断可行不可行，再一起生效。
          但 <strong>drm_panel（屏幕面板驱动）不参与这套</strong>——它压根没有 atomic state。
          矛盾的是，panel 内部就嵌着一个 drm_bridge，而 bridge <strong>有</strong> atomic state，且已经被妥善处理。
      - label: 痛点
        text: >-
          面板因此既无法在 atomic_check 阶段保存数据，也无法在 enable/disable 时取回来。
          作者举了一个很具体的例子：panel-novatek-nt35950 在 <code>get_modes()</code> 里把 connector 指针存下来，
          之后在 <code>prepare()</code> 里解引用 <code>connector-&gt;state-&gt;crtc-&gt;state</code>，
          <strong>全程不加锁</strong>。更普遍的问题是：面板没有任何办法拒绝自己处理不了的配置
          （它不参与 atomic check），而且多显示模式、把 DSC 变成可选，都很难干净地写出来。
      - label: 方案
        text: >-
          9 帖，核心是<strong>让 panel 复用内嵌 bridge 的 atomic state</strong>（子类化），
          并新增一组可选回调：<code>atomic_check</code>、enable/disable 的 atomic 版本、<code>atomic_print_state</code>；
          顺带把 panel follower 的通知拆成独立函数。bridge 侧也做了清理：
          <code>drm_bridge_state</code> 去掉 <code>bridge</code> 指针、给 bridge 加 <code>atomic_print_state</code>。
      - label: 为什么
        text: >-
          两个设计点值得注意。一是<strong>可选参与</strong>：没实现回调的面板行为完全不变，
          现有驱动一行都不用改——把迁移成本降到零，是大改动能被接受的前提。
          二是路线选择：走 bridge 这条已经被验证过的路，而不是上一版（Val Packett）那套把 state 传 NULL 的 API 设计。
          代价也很实在：实现了 atomic 的面板<strong>只能通过内嵌 bridge 驱动</strong>，
          host 直接调 <code>drm_panel_prepare()</code> 的老路径会告警并拒绝——目前还有十几个 display driver 走老路。
      - label: 效益
        text: >-
          面板从此能参与 atomic_check（于是可以拒绝不支持的配置）、摆脱无锁解引用，
          并为多显示模式与可选 DSC 铺好路。
      - label: 下一步
        text: >-
          RFC 阶段，而且作者<strong>明说了只做了编译测试</strong>。真正的前置条件是那十几个还在直接调
          <code>drm_panel_prepare()</code> 的 host 先切到 panel bridge——这是一条比 9 帖长得多的迁移长尾。
    verdict: >-
      「可选参与」这个设计是全文最值钱的部分：不强制迁移，让新能力先长出来，等 host 慢慢跟上。
      DRM 里 drm_bridge 当年就是这么转过来的——旧路留着、新路先通，最后自然收敛。
    link: "https://lore.kernel.org/dri-devel/<20261008-panel-atomic-state-v1-0-b157fddb8de1@oss.qualcomm.com>/"
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "zswap 改批量压缩：从「一次一页」到「一批 8 页」"
    meta: "〔10-08 18:28 北京〕· [PATCH v1 0/8] Batched zswap_store() with compression batching"
    points:
      - label: 定位
        text: >-
          zswap 是写 swap 之前的一道压缩缓存——内存回收时先别急着落盘，压进内存看看。
          但整条路径是<strong>按页</strong>走的：一次处理一个 folio，落到压缩器（crypto 的 acomp 接口）那里就是一页一页压。
      - label: 做法
        text: >-
          8 帖分两层改。先在 <strong>crypto acomp API</strong> 上加批量能力：
          给 <code>acomp_req</code> 加 <code>unit_size</code>、让算法能声明自己支持的 batch-size、再配一个分段包装器。
          然后让 zswap 把大 folio 切成 <code>ZSWAP_MAX_BATCH_SIZE</code>（8 页）一批地压、一批地存。
          顺带把 <code>zswap_pool</code> 与 <code>zswap_entry</code> 的成员排布也优化了一下。
      - label: 效益
        text: >-
          只有按批之后，才能用上 <code>kmem_cache_alloc_bulk()</code> 这类「一次拿一批、少加锁」的接口；
          每批的核心工作（分配 entry、压缩、存进 zsmalloc）也留在缓存里，少一轮 cache 抖动。
    relevance: >-
      「把逐页操作改成按批处理」是内核里反复出现的优化范式——今天 mm 这一节两条都是它的变体。
      这条的特别之处是<strong>顺着 API 往下改</strong>：先扩 crypto 层的接口，使用方才跟着受益。
    link: "https://lore.kernel.org/linux-mm/<20261008182814.27450-1-kanchanapsridhar2026@gmail.com>/"
  - type: highlight
    title: "直接回收「够了就停」：一次只要 32 页，最坏扫了 13 万页"
    meta: "〔10-08 20:01 北京〕· [RFC PATCH] mm: vmscan: avoid over-reclaim in classic LRU direct reclaim path"
    points:
      - label: 定位
        text: >-
          「直接回收」是内存分配失败的兜底：分配方自己下场去扫 LRU 找回可释放的页。
          它每次只需要 <code>SWAP_CLUSTER_MAX</code> = <strong>32 页</strong>，正常情况下远不到一毫秒就够。
      - label: 做法
        text: >-
          这封 RFC 指出经典 LRU 路径缺一个「达标即停」的检查，两处：
          <code>shrink_lruvec()</code> 满足 <code>nr_to_reclaim</code> 之后还在继续扫剩下的 LRU 批次；
          <code>shrink_node_memcgs()</code> 只在「部分遍历」时提前退出，
          一旦首次部分遍历没凑够目标就改走全量遍历，而<strong>全量遍历没有任何达标检查</strong>，
          会把整棵 memcg 树都缩一遍。
      - label: 效益
        text: >-
          作者给的是生产环境数据（Android）。取最慢的 20 次直接回收来对比：
          改之前最坏一次扫了 <strong>130,079 页</strong>、回收 1,635 页；平均扫 37,955 页、回收 881 页——
          比它要的 32 页多出两个数量级。改完之后回收量贴着目标走，直接回收的延迟尖刺不再是不可预测的。
    relevance: >-
      驱动侧最怕的就是偶发的几十毫秒分配延迟：相机与显示的实时路径上，
      一次超额回收就够丢一帧。这条修的是「为什么延迟会突然不可预测」。
    link: "https://lore.kernel.org/linux-mm/<20261008120056.575272-1-zhangbo0325@gmail.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-mm/<20261008073021.2512665-1-songmuchun@bytedance.com>/"
        text: "内存热移除时页表的构造/析构配对（4 帖，跨 x86 / RISC-V / arm64）：用 PageTable() 判断该不该跑析构，修 NR_PAGETABLE 计数错乱"
        time: 10-08 15:30
      - link: "https://lore.kernel.org/linux-mm/<20261007215240.377006c9206afa07f769e92f@linux-foundation.org>/"
        text: "Andrew Morton 发 MM hotfixes for 7.3-rc7"
        time: 10-08 12:52
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "TCP 多两个 BPF 挂载点：把 Google 跑了 5 年的 AutoLOWAT 做成通用机制"
    meta: "〔10-08 11:16 北京〕· [PATCH v5 bpf-next 00/10] bpf: Add bpf_tcp_ops hooks for TCP AutoLOWAT"
    points:
      - label: 定位
        text: >-
          <code>bpf_tcp_ops</code> 是一组挂在 TCP 协议实现内部的 BPF 回调，允许 BPF 程序改 TCP 行为。
          这一版加的是<strong>接收队列的入队 / 出队钩子</strong>：
          <code>enqueue_rcvq()</code> 在协议栈把 skb 放进 <code>sk_receive_queue</code> 时触发，
          <code>dequeue_rcvq()</code> 在 <code>tcp_cleanup_rbuf()</code> 把数据取出之后触发。
      - label: 做法
        text: >-
          两个回调通过一个新的 per-socket 标志按需启用——kfunc
          <code>bpf_tcp_ops_set_flags(sk, BPF_TCP_OPS_FLAG_RCVQ, 0)</code>。
          启用之后，BPF 程序就能动态调整 <code>sk-&gt;sk_rcvlowat</code>，
          在接收队列里数据还不够时<strong>压住不必要的 EPOLLIN 唤醒</strong>。
          系列还把 <code>bpf_{get,set}sockopt()</code> 的拒绝名单（deny-list）翻成了允许名单（allow-list）。
      - label: 效益
        text: >-
          这套东西作者叫它 <strong>TCP AutoLOWAT</strong>：2020 年由 Tenzin Ukyab 写出来，
          Soheil Hassas Yeganeh、Arjun Roy、Eric Dumazet 参与，已经在 Google 的 RPC 负载上跑了 5 年多。
          配合 TCP RX zerocopy，通常能<strong>用一次唤醒、一次系统调用读完整个 RPC 帧</strong>。
          原来的实现是为 Google 内部的 RPC 格式专门写的，这一版借 BPF 做成通用机制。
    relevance: >-
      网络方向的很多坑都是「协议栈的行为不合我的场景」。多一个 BPF 挂载点，
      就多一条不用改内核也能调整行为的路——这正是 bpf_tcp_ops 这类接口存在的意义。
    link: "https://lore.kernel.org/netdev/<20261008031604.256498-1-kuniyu@google.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/netdev/<20261008175225.3375274-1-coiaprant@gmail.com>/"
        text: "net: pcs 加 RK3568 XPCS 支持（v11，6 帖）——Rockchip 平台的以太网 PCS"
        time: 10-09 01:52
      - link: "https://lore.kernel.org/netdev/<20261008-dsa_lan9645x_switch_driver_base-v14-0-3d2a72661213@microchip.com>/"
        text: "Microchip LAN9645x 的 DSA 交换机驱动（v14，9 帖）"
        time: 10-08 17:05
      - link: "https://lore.kernel.org/netdev/<20261008023030.1089616-1-almasrymina@google.com>/"
        text: "netmem 的设计原则被写进注释与文档（v2，2 帖）：把「内存提供方」这个抽象的意图说清楚"
        time: 10-08 10:30
  - type: divider
    label: "📰 PCI / 虚拟化"
    kind: section
  - type: highlight
    title: "机密虚拟机的设备直通：vIOMMU 与 TSM 的接口到 v7"
    meta: "〔10-08 14:00 北京〕· [PATCH v7 00/16] iommufd: vIOMMUs and TSM guest requests for confidential guests"
    points:
      - label: 定位
        text: >-
          机密计算（CoCo）里，guest 的内存对宿主不可见。设备要直通给这样的 guest，
          就需要一个<strong>只对该 guest 可见的 IOMMU</strong>——这就是 vIOMMU。
          上层还需要一条「guest 向 TSM（设备侧可信安全模块）发请求」的通道。
      - label: 做法
        text: >-
          v7 共 16 帖。核心变化是把 vIOMMU 的能力<strong>下移到各后端自己提供</strong>：
          物理 IOMMU 驱动或 PCI/TSM 后端，在 IOMMUFD 校验 parent HWPT 之前就给出 vIOMMU ops
          （决定分配大小、初始化，以及是否需要 parent HWPT）。
          同时用<strong>引用计数的 context</strong> 替换旧的 TSM bind/unbind 接口，
          并新增 <code>IOMMU_VDEVICE_TSM_REQ</code> ioctl 用来转发 guest 请求。
      - label: 效益
        text: >-
          TSM 后端可以自己决定要不要 parent HWPT（不再被框架写死）；查找不再走全局注册表而是<strong>按设备查</strong>；
          后端模块在 vIOMMU 存活期间被 pin 住，避免后端在用的过程中消失。
    relevance: >-
      这条和 KVM 侧 file 引用计数、VFIO/iommufd 设备模型那几轮改动是同一条线上的：
      机密计算要把「内存、vCPU、设备」一环环补齐，这轮补的是设备。
    link: "https://lore.kernel.org/linux-pci/<20261008055955.4014342-1-aneesh.kumar@kernel.org>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<0552ed277e40a288e0157af799257ee6ec722534.1791460615.git.lukas@wunner.de>/"
        text: "PCI/AER：误报时跳过错误恢复（for-linus）"
        time: 10-08 20:34
      - link: "https://lore.kernel.org/linux-pci/<1791446700-100166-1-git-send-email-shawn.lin@rock-chips.com>/"
        text: "PCI/pwrctrl：只销毁由 pwrctrl core 自己创建的设备（Rockchip）"
        time: 10-08 16:20
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "Rust 驱动终于能安全地写「自引用结构」了"
    meta: "〔10-09 03:26 北京〕· [PATCH v2 00/20] rust: pin-init: create self references safely"
    points:
      - label: 定位
        text: >-
          内核里大量结构是自引用的——最典型的是带锁的容器：锁和它保护的数据放在同一个结构里，
          指向数据的指针在结构搬家之后必须仍然有效。C 侧靠 <code>list_head</code> 这类「用指针加回来」的模式凑合，
          Rust 侧一直缺一个安全、又不用额外分配的写法。
      - label: 做法
        text: >-
          v2 共 20 帖，扩展 <code>pin-init</code>：只要一个字段的生命周期名与另一个字段同名，
          就表示「这个字段引用那个兄弟字段」——例如 <code>dev: &amp;'bound Device</code> 配合
          <code>bar: Bar&lt;'bound, N&gt;</code>。更复杂的用法需要显式注解
          （<code>#[uses('bar: invariant)]</code> 声明不变借用）和<strong>存在量化生命周期</strong>
          （<code>exists&lt;'dev&gt;: 'a</code>，把不该冒泡给用户的不变生命周期抹掉）。
          宏这边补齐了自引用字段的 drop 顺序检查、协变性检查与投影。
      - label: 效益
        text: >-
          不需要额外分配、不需要 <code>unsafe</code>——同一结构内字段互指这件事，
          交给编译期检查，而不是交给注释和约定。
      - label: 下一步
        text: >-
          上游排期在 Plumbers 上谈定了：<strong>所有特性一次上游</strong>，
          但高级特性（variance 注解、存在生命周期）只限预先约定的使用方——
          因为 DRM jobqueue 需要前者、Nova 的 Cmdq 需要后者。限制使用范围，是为了万一要返工时把影响面控住。
          详细文档下一周期再补，等用法稳定下来。
    relevance: >-
      这条直接和显示 / GPU 驱动相关：DRM jobqueue 就是在等这个特性才能往下写。
      Rust 侧的基础设施一旦补上，受益的不是某个驱动，而是一整类「结构内部互相引用」的写法。
    link: "https://lore.kernel.org/rust-for-linux/<20261008-dev-selfref-v2-0-e280b3c8fba5@garyguo.net>/"
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "Qualcomm Kaanapali 相机子系统到 v19：一次补齐 6 个 CSIPHY 与 5 个 VFE"
    meta: "〔10-08 15:14 北京〕· [PATCH v19 00/12] media: qcom: camss: Add Kaanapali support"
    points:
      - label: 定位
        text: >-
          CAMSS 是 Qualcomm 的相机子系统驱动，串起 <strong>CSIPHY（MIPI CSI-2 物理层）→ CSID（CSI 解码）→ VFE（视频前端）</strong>，
          是相机数据进内存的主干。这条系列给新 SoC Kaanapali 加支持。
      - label: 做法
        text: >-
          v19 共 12 帖，分给两位维护者：PHY 部分新增 CSIPHY v2.4.0 的<strong>两相（two-phase）</strong>支持、
          把公共状态寄存器偏移参数化；CAMSS 部分新增 CSID 1080、VFE 1080、TPG v2.4.0，
          以及 Kaanapali 的 compatible 与 DTS 节点（CAMSS 块、CCI 控制器、相机 MCLK pinctrl）。
          硬件规模是实打实的：<strong>6 个 CSIPHY、3 个 TPG、3 个 CSID + 2 个 CSID Lite、
          3 个 VFE（每个 5 个 RDI）+ 2 个 VFE Lite（每个 4 个 RDI）</strong>。
          这一版只启用 RDI 通路，另外 CAMNOC 要工作还需要 <code>qdss_debug_xo</code> 时钟。
      - label: 效益
        text: >-
          传感器接上就能出帧。作者给的验证链是标准 V4L2 media controller 流程：
          用 <code>media-ctl</code> 配好 CSIPHY → CSID → VFE 的格式与链接，再用 <code>yavta</code> 抓 20 帧——
          配的是 S5KJN5 传感器、SGBRG10 格式、4096x3072。
    relevance: >-
      这条是相机链路在主线上的标准落地路径。从 v1 走到 v19 的迭代史，
      本身就是一份「新 SoC 相机子系统怎么进主线」的现成教程——分层、拆系列、按维护者分组、给出可复现的验证命令。
    link: "https://lore.kernel.org/linux-media/<20261008-kaanapali-camss-v19-0-b2c583ef50e0@oss.qualcomm.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20261008042600.275884-1-nicfio@gmail.com>/"
        text: "v4l2-subdev：修 subdev 与 unbind 竞态导致的空指针（v3，2 帖）——动的是 core 层"
        time: 10-08 12:26
      - link: "https://lore.kernel.org/linux-media/<20261008160650.73927-1-tien.nguyenminh@embeddedlinux.blog>/"
        text: "新增 OmniVision OV3660 传感器驱动（2 帖，含 dt-bindings）"
        time: 10-09 00:07
      - link: "https://lore.kernel.org/linux-media/<20261008085247.798156-1-sakari.ailus@linux.intel.com>/"
        text: "ipu6 重做 reset workaround（5 帖）：把「需不需要复位」的判断从返回的 buffer 上挪开"
        time: 10-08 16:55
      - link: "https://lore.kernel.org/linux-media/<20261008092745.20-1-shxzhaosr@163.com>/"
        text: "cx231xx：丢弃残缺 bulk 包，修堆溢出（v2）"
        time: 10-08 17:27
  - type: divider
    label: "📰 其余板块"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-security-module/<20261008142604.39107-2-gnoack3000@gmail.com>/"
        text: "LSM：Landlock 自测套件大扫除（27 帖）：补断言、修内存泄漏、清理陈旧注释"
        time: 10-08 22:26
      - link: "https://lore.kernel.org/linux-security-module/<20261008-ajhalaney-dmverity-key-identifier-v2-0-008456d189cb@amutable.com>/"
        text: "LSM：keys 新增 dm-verity / fs-verity 的 well-known keyring ID（v2，3 帖）"
        time: 10-09 04:58
      - link: "https://lore.kernel.org/linux-fsdevel/<20261008102253.1003776-1-dhowells@redhat.com>/"
        text: "fs：netfs 用 bvecq chain position 抽象表示缓冲区位置（v17，8 帖）"
        time: 10-08 18:23
      - link: "https://lore.kernel.org/linux-block/<20261008113907.4000838-1-tom.leiming@gmail.com>/"
        text: "block：ublk 不再向已取消的 io 命令派发（v2，11 帖）"
        time: 10-08 19:39
  - type: divider
    label: "📌 机制雷达：3 条跨域信号"
    kind: primary
  - type: toc
    items:
      - label: "v7.4 合入窗口临近"
        text: >-
          当前是 7.3-rc7，pull 潮已经开始：amdgpu 发了 <b>drm-next-7.4</b> 的 pull request，
          同期还有 V4L2 fixes for 7.4、drm-xe-fixes、drm-intel-fixes，以及 MM hotfixes 与 Networking 的 7.3-rc7 pull。
          接下来两周是「哪些系列能赶上这一班车」的窗口期——带 <b>for v7.4</b> 字样的系列会集中出现。
          <a href="https://lore.kernel.org/dri-devel/<20261008212310.2508510-1-alexander.deucher@amd.com>/">原文</a>
      - label: "AI 已经站在内核协作链的三个位置上"
        text: >-
          今天有三个互相独立的信号。一，iommufd vIOMMU 系列的 cover letter 里明写
          「<b>Codex 被用于协助 commit message 格式与代码重排</b>」——作者主动披露。
          二，Takashi Iwai 发了一组 11 帖的 ALSA 修复，标题直接是
          「yet a few more fixes for <b>AI bug reports</b>」——AI 报的 bug 已经成批进维护者的队列。
          三，AI 评审机器人 <b>Sashiko</b> 在最近 24 小时内向各列表投了 <b>93 封</b>评审邮件
          （dri-devel 36、LSM 34、PCI 20、mm 2、lkml 1）。写代码、报 bug、做评审——三个环节都有人在了。
          <a href="https://lore.kernel.org/lkml/<20261008192553.300025-1-tiwai@suse.de>/">原文</a>
      - label: "keys 多了两个 well-known ID"
        text: >-
          dm-verity 与 fs-verity 都要用密钥验签，但用户空间此前没有一个固定 ID 能「按名字」找到对应的 keyring。
          这条给两者各定义了一个专用的特殊 keyring ID（<code>KEY_SPEC_DM_VERITY_KEYRING</code> /
          <code>KEY_SPEC_FS_VERITY_KEYRING</code>）。机制不大，但它是「验证密钥怎么被稳定引用」这类问题的标准解法。
          <a href="https://lore.kernel.org/linux-security-module/<20261008-ajhalaney-dmverity-key-identifier-v2-1-008456d189cb@amutable.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "API 规格（KAPI）"
        text: >-
          把系统调用的契约写成代码旁的可机读描述：参数类型与范围、约束、对齐要求，
          返回值的成功条件与每个错误码的含义，执行上下文要求、能力要求、锁约束、信号行为、副作用。
          本期框架的名字就叫 KAPI。
      - label: "drm_panel / atomic state"
        text: >-
          drm_panel 是屏幕面板驱动对象。atomic state 是 DRM 原子提交里「某个对象本帧的新配置」的载体——
          有它才能在 atomic_check 阶段校验、在提交时读回。本期把 panel 也纳入进来（复用内嵌 bridge 的 state）。
      - label: "acomp（异步压缩）"
        text: >-
          内核 crypto 子系统的异步压缩接口，zswap 用它压缩页。
          本期给它加上了「一次压一批」的能力：<code>acomp_req.unit_size</code> 加上算法自报的 batch-size。
      - label: "直接回收（direct reclaim）"
        text: >-
          内存分配失败时，分配方自己下场扫 LRU 回收页，而不是交给后台的 kswapd。
          单次目标只有 SWAP_CLUSTER_MAX = 32 页，但延迟敏感路径上最怕它超额扫描。
      - label: "bpf_tcp_ops"
        text: >-
          挂在 TCP 实现内部的 BPF 回调集合，让 BPF 程序改 TCP 行为。
          本期新增接收队列的入队 / 出队钩子（<code>enqueue_rcvq</code> / <code>dequeue_rcvq</code>），
          按 per-socket 标志启用。
      - label: "vIOMMU / TSM"
        text: >-
          vIOMMU 是机密虚拟机里只对该 guest 可见的 IOMMU；TSM 是设备侧的可信安全模块。
          本期给两者之间加了一条通道：<code>IOMMU_VDEVICE_TSM_REQ</code> ioctl。
      - label: "pin-init 自引用"
        text: >-
          Rust for Linux 的初始化框架。「自引用」指同一结构内某字段引用兄弟字段；
          本期让它在 pinned 前提下可以被安全表达，且不需要额外分配。
      - label: "CAMSS / CSIPHY / VFE"
        text: >-
          Qualcomm 相机子系统的三层：CSIPHY 是 MIPI CSI-2 物理层，CSID 是 CSI 解码，
          VFE 是视频前端（含多个 RDI 输出端口，每个端口对应一个 /dev/videoN）。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
