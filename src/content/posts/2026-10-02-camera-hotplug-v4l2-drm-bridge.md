---
title: "相机断了管线也不能垮：V4L2 容错管线 RFC；DRM bridge 热插拔到 v2"
date: "2026-10-02"
desc: "同一天冒出两条热插拔线：media 侧提出 V4L2 subdev 连接状态 ioctl，让汽车相机掉线不再拖垮整条管线；DRM 侧 bridge 热插拔 RFC 到 v2，24 帖给 DRM 核心加 drm_hotplug_helper。另外 workqueue 拿到了实时优先级。"
column: "daily"
tags: ["media", "DRM", "driver-core", "mm", "PCI", "fs", "Rust", "block", "arch", "net"]
blocks:
  - type: hook
    text: >-
      今天的主题意外地集中：<strong>两条独立的热插拔线同一天出现在列表上</strong>。
      media 侧，有人提出让 V4L2 管线容错——某个相机（甚至中间的 SerDes）掉线时，其余相机还能用；
      DRM 侧，bridge 热插拔的 RFC 走到 v2，24 帖给 DRM 核心加了一个 <code>drm_hotplug_helper</code>。
      另外一条值得单说的机制改动：<strong>workqueue 拿到了实时优先级</strong>，panthor 的 GPU 提交延迟从毫秒级压到 14 微秒。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-02/cover.png"
    alt: "封面 · 10月2日 · 相机热插拔"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "media 容错 V4L2（RFC 5 帖）：给 subdev 加连接状态 ioctl，相机掉线整条管线不再陪葬"
      - label: "头条"
        text: "DRM bridge 热插拔到 v2（24 帖）：核心加 drm_hotplug_helper，管线补齐才建 connector"
      - label: "sched / driver-core"
        text: "workqueue 拿到 WQ_RT：panthor 提交延迟 95 分位从 163–809µs 降到 23µs"
      - label: "DRM"
        text: "splash DRM 客户端到 RFC v4；BPF 驱动 MIPI-DSI panel 的讨论在列表上往返"
      - label: "arch"
        text: "跨节点 cpumask 写风暴：sparsebitmap 到 RFC v3（13 帖）"
      - label: "PCI"
        text: "P2PDMA 按 TLP class 路由到 v9（18 帖）；CXL Type-2 reset 到 v14"
      - label: "fs"
        text: "netfs 用 bio_vec 链换掉 folio_queue 到 v15；open 的 O_CREAT 讨论往返 11 次"
      - label: "机制"
        text: "热插拔成主线；workqueue 为单一消费者开洞"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-02/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-02 06:51 北京，近 24h 各板块真实计数：net 610 · DRM 387 · mm 169 · PCI 154 ·
      media 153 · fs 113 · Rust 75 · arch 44 · block 39 · LSM 13 · rt 10 · virtio 0。
      net 依然是量最大的一头；DRM 的 387 有一大半是 PULL 请求与 bridge 那条 24 帖的系列在撑。
      virtio 挂着 0——virtio-dev 静默期里最新的邮件还停在 09-29，不是抓取失败。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "相机掉线，别让整条管线陪葬：V4L2 容错管线 RFC"
    meta: "〔10-01 20:55 北京〕· [PATCH RFC 0/5] media: Fault-Tolerant V4L2（Mattijs Korpershoek）"
    points:
      - label: 现状
        text: >-
          V4L2 的相机管线在开机时就是静态的：设备树里写死有哪些实体——传感器、SerDes、
          CSI-2 接收器各是谁，彼此怎么连。<strong>框架假定这些实体永远在位</strong>。
      - label: 痛点
        text: >-
          笔记本、手机的内置相机可以这么假设。但汽车上的后视/环视相机可能损坏或被拔掉，
          而一旦框架认定传感器都该在，<b>一个缺失的相机就能让整条管线瘫痪</b>。
          投稿信给了一个和 GMSL2 直接相关的例子：两路 imx219 各经一片 ds90ub953 进 ds90ub960。
          9-0010 那路 imx219 探测失败还好；可要是<b>中间的 953（7-0044）探测失败</b>，
          <code>media-ctl -p</code> 就只剩下 cdns_csi2rx → ticsi2rx——
          另一路完好的 imx219 10-0010 也跟着一起消失了。
      - label: 方案
        text: >-
          思路直接借自 DRM connector：给 subdev 加一个 ioctl 报告自己的连接状态
          （<code>VIDIOC_SUBDEV_G_CONNECTION_STATUS</code>），状态变化时发 uevent，
          应用订阅即可。前提是传感器驱动必须在设备不在位时也能 probe 成功——所以后三帖专门改造 imx219：
          把 LP-11 状态切换挪进 <code>power_on()</code>、允许缺传感器 probe、
          实现 <code>.detect()</code> 传感器操作、再用它做状态轮询。
      - label: 为什么
        text: >-
          作者明确说这是「简单优先」的取舍：只加一个 ioctl 加一路 uevent，驱动侧好写也好维护。
          代价是要动每一个驱动，因为得打破「设备不在就不 probe」这条老规矩。
      - label: 下一步
        text: >-
          作者自己讲「不指望能直接合入」，这个系列是拿去 Plumbers 和邮件列表<b>开讨论的起点</b>。
          已知限制也列了：处在管线中间的实体（比如 SerDes）掉线还没处理。
    verdict: >-
      这条对做车载/工业相机的方向最有价值——它正面回答了「GMSL2 链路里某一环失效了怎么办」。
      以前没有别的答案，只能整条管线一起报废。
    link: "https://lore.kernel.org/linux-media/<20261001-v4l2-sensor-detect-v1-0-a45993be17b8@kernel.org>/"
  - type: headline
    title: "管线补齐才建 connector：DRM bridge 热插拔到 RFC v2（24 帖）"
    meta: "〔10-01 20:42 北京〕· [PATCH RFC v2 00/24] drm bridge hotplug（Luca Ceresoli / Bootlin）"
    points:
      - label: 现状
        text: >-
          <code>drm_bridge_connector</code> 现在是「用一串 bridge 实现 DRM connector」的推荐做法。
          bridge 是显示管线里的中间环节（DSI 转 LVDS、桥接芯片、SerDes 之类），
          内核把它们串成一条链挂在 encoder 下面，出口再包成一个 connector 交给用户态。
      - label: 痛点
        text: >-
          这条链假定开机时就是完整的。但有些设备的最终显示组件——一个或多个 bridge——
          是<b>可以在运行时插拔的</b>（用例来自 GE HealthCare）。链不完整时就没有 connector，显示根本起不来。
      - label: 方案
        text: >-
          系列给 DRM 核心加一个小 helper：<code>drm_hotplug_helper</code>。让 encoder 能做三件事——
          收到热插拔相关事件；新 bridge 加入、管线变完整时动态加上 drm_bridge_connector；
          bridge 被移除时把 connector 撤掉。
      - label: 为什么
        text: >-
          关键前提是 connector 得能动态分配和销毁：所以开头几帖先把
          <code>drmm_connector_hdmi_init()</code> 拆成可动态调用的形式，再让 bridge-connector 用上动态 connector。
          中间还有一套事件通知机制，以及给 bridge 的新回调 <code>.get_next_bridge</code>——
          只有每个 bridge 都能报出「我的下一个是谁」，才判断得出管线到底完整了没有。
      - label: 效益
        text: >-
          24 帖按 A–G 分七组，作者在投稿信里专门标了「时间有限的评审者只看 23、24、5-6、17-22」：
          23 是核心 helper，24 是 i.MX LCDIF 上的示例用法。
      - label: 下一步
        text: >-
          这是「DRM bridge 引用计数」那盘大棋的第 6 步。作者的路线图从 2026 年 5 月开始排，
          前 5 步（新分配 API、全驱动迁移、get/put 语义、加锁、connector 迁移）都已经按版本落了地，
          当前标的就是 <b>bridge hotplug</b>。
    verdict: >-
      这类横跨多个版本的大计划，看点是它的路线图：单次提交容不下，但每一步都能独立评审、独立合入，
      维护者也就愿意一步步放行。
    link: "https://lore.kernel.org/dri-devel/<20261001-drm-bridge-hotplug-v2-0-8e34986dcb68@bootlin.com>/"
  - type: divider
    label: "📰 sched / driver-core"
    kind: section
  - type: highlight
    title: "工作队列拿到实时优先级：panthor 提交延迟从毫秒压到 14 微秒"
    meta: "〔10-02 00:07 北京〕· [RFC v6 0/3] Realtime workqueues and panthor realtime submission（Tvrtko Ursulin / Igalia）"
    points:
      - label: 定位
        text: >-
          workqueue 是内核的通用异步工作机制；GPU 驱动（这里是以 Arm Mali 为目标的 panthor）
          用它把用户态提交的命令搬进硬件队列。搬运动作本身要排队，排队就会引入延迟。
      - label: 做法
        text: >-
          给 workqueue 加上 <code>WQ_RT</code>——让工作队列的 worker 以实时优先级运行；
          然后让 panthor 的高优先级 GPU 队列用上它。
      - label: 效益
        text: >-
          投稿信里给了实测：默认配置下提交延迟 95 分位在 163–809µs、98 分位最高 1882µs；
          换成实时工作队列后中位数 14µs、95/98 分位 23/25µs。
          作者还补了一句边界：<code>VK_QUEUE_GLOBAL_PRIORITY_REALTIME</code> 本来就要 CAP_SYS_NICE，
          所以访问实时工作队列也天然被这个能力挡住。
    relevance: >-
      典型的「核心机制为某一类消费者开洞」：改的是 workqueue，受益者眼下只有 GPU 提交一条路径，
      但接口一旦进主线，音频、实时采集这些延迟敏感的子系统都可能来接。
      Cc 列表里有 Tejun Heo——workqueue 维护者点头才算数。
    link: "https://lore.kernel.org/dri-devel/<20261001160711.59888-1-tvrtko.ursulin@igalia.com>/"
  - type: divider
    label: "📰 DRM 显示 · arch 基础设施"
    kind: section
  - type: highlight
    title: "启动画面进 DRM：splash 客户端到 RFC v4（13 帖）"
    meta: "〔10-02 03:58 北京〕· [PATCH RFC v4 00/13] Add splash DRM client"
    points:
      - label: 定位
        text: >-
          开机早期屏幕上的 logo，现在多半是 bootloader 留下的画面或 fbdev 在撑；
          DRM 接管显示之后要重新画一遍。
      - label: 做法
        text: >-
          系列往 DRM 里加一个「splash client」——一个只负责在 DRM 管线就绪后把启动画面显示出来的轻量客户端。
      - label: 下一步
        text: >-
          走到 RFC v4，说明「DRM 核心内置一个自己的用户」这个形态，社区还在讨论要不要接受。
    relevance: 与 DRM 的 master 所有权模型相关，属于「核心多一层」的机制变动。
    link: "https://lore.kernel.org/dri-devel/<20261001195847.141192-1-maximpedraza@gmail.com>/"
  - type: highlight
    title: "大机器上 cpumask 的写风暴：sparsebitmap 到 RFC v3（13 帖）"
    meta: "〔10-02 03:29 北京〕· [RFC PATCH v3 00/13] lib, sched: Introduce sparsebitmap (sbm)（Kprateek Nayak / AMD）"
    points:
      - label: 现状
        text: >-
          多节点大机器上，全局 cpumask（调度器、定时器的状态位图）被高频更新，
          多个节点同时写同一组 cacheline，C2C 来回弹，带宽就这么被吃掉。
      - label: 方案
        text: >-
          把每个 cacheline 对齐的 bitmap word 只表示少数几个 CPU，具体数量由拓扑推导；
          sbm 的一个 index 同时编码「数组下标」和「该元素里的位偏移」。
      - label: 为什么
        text: >-
          作者专门回答了一个必然会有的问题：lib/sbitmap.c 不就是干这个的？
          答复是 sbitmap 每个叶子占两条 cacheline、还带额外语义，对 cpumask 场景太重；
          <b>sbm 之于 sbitmap，就像 cpumask 之于普通 bitmap</b>——同一件事，执行方式轻一档。
    relevance: >-
      数据结构的通用化（落在 lib/ 与 sched/），Peter Zijlstra 有参与。
      典型的「先改核心基础设施，再让各子系统受益」路径。
    link: "https://lore.kernel.org/linux-arch/<20261001192849.74788-1-kprateek.nayak@amd.com>/"
  - type: divider
    label: "📰 今日动态"
    kind: section
  - type: more
    title: "media / DRM"
    items:
      - link: "https://lore.kernel.org/dri-devel/<ar6RSRd99jbTdYOR@houat>/"
        text: "BPF 驱动 MIPI-DSI panel 的讨论还在往返：用 BPF 程序描述 panel 时序，免去给每块 panel 写内核驱动"
        time: 10-02 01:03
      - link: "https://lore.kernel.org/linux-media/<20261001173610.158931-1-diederik@cknow-tech.com>/"
        text: "Rockchip 显示/解码侧现代化 PM_OPS：rkvdec、rga、rkisp1 三个驱动换掉旧电源管理回调"
        time: 10-02 01:36
      - link: "https://lore.kernel.org/linux-media/<20261001-kaanapali-iris-v4-0-642f9ac5e699@oss.qualcomm.com>/"
        text: "qcom iris 视频编解码加 kaanapali 平台（6 帖）：新平台数据 + H265 行缓冲算法"
        time: 10-01 23:17
      - link: "https://lore.kernel.org/linux-media/<20261001073134.4031143-1-divyamani.tripathi@intel.com>/"
        text: "Intel ipu6 加 IPU8 支持到 v2（7 帖）：新 ABI、MMU、PLL 上电时序"
        time: 10-01 15:31
      - link: "https://lore.kernel.org/dri-devel/<20261001133736.802604-3-tzimmermann@suse.de>/"
        text: "[PATCH 2/2] 移除 drm_simple_display_pipe 及其 helper：KMS 里最老的简化路径要退场，讨论中"
        time: 10-01 21:37
      - link: "https://lore.kernel.org/dri-devel/<20261001220632.3190896-1-matthew.brost@intel.com>/"
        text: "drm/gpuvm 给 exec 加两趟锁到 v3（8 帖）：VM_BIND 路径上的锁粒度重排"
        time: 10-02 06:06
  - type: more
    title: "mm / PCI / fs / Rust / block / net"
    items:
      - link: "https://lore.kernel.org/linux-media/<20261001-fix-p2p-acs-v4-0-v9-0-1a8e0f50ddd9@nvidia.com>/"
        text: "P2PDMA 按 TLP class 路由点对点 DMA，到 v9（18 帖）：让设备间直连流量选对路径"
        time: 10-01 19:55
      - link: "https://lore.kernel.org/linux-pci/<20261001092227.3004747-1-smadhavan@nvidia.com>/"
        text: "CXL 给 Type-2 设备加 reset 支持到 v14（16 帖）：带内存的加速器如何复位"
        time: 10-01 17:22
      - link: "https://lore.kernel.org/linux-fsdevel/<20261001091239.3343034-1-dhowells@redhat.com>/"
        text: "netfs 用 bio_vec 数组链替掉 folio_queue 到 v15（10 帖）：数据描述与块层对齐"
        time: 10-01 17:13
      - link: "https://lore.kernel.org/linux-fsdevel/<CAOQ4uxiZBgg6WNRCNifsMRkuhX0176oef10TyhzdmTvqkEVnUw@mail.gmail.com>/"
        text: "open*(2) 加 O_CREAT|O_DIRECTORY 的讨论今天在列表上往返了 11 次：v6 第 7 帖仍是焦点"
        time: 10-02 01:53
      - link: "https://lore.kernel.org/linux-mm/<20261001-bug-mm-thp-async-compact-defer-v1-0-0174c7923430@gmail.com>/"
        text: "mm/compaction：别再让每次 THP 缺页都重试一遍已经失败的异步压缩"
        time: 10-01 23:34
      - link: "https://lore.kernel.org/rust-for-linux/<20261001145940.1077801-1-zhiw@nvidia.com>/"
        text: "Rust 的 pr_debug! / dev_dbg! 接上 dynamic debug，到 v3（5 帖）"
        time: 10-01 23:00
      - link: "https://lore.kernel.org/linux-block/<20261001-bug-ublk-no-sched-by-default-v1-1-0bc91b6f075e@gmail.com>/"
        text: "ublk 默认不再使用 I/O 调度器；配套一帖：设置默认 elevator 时不必 quiesce 队列"
        time: 10-01 11:10
      - link: "https://lore.kernel.org/netdev/<20261001-tls-follow-on-v2-0-2dd1947bb642@kernel.org>/"
        text: "net/tls 接收路径的零长度记录修复到 v2（8 帖）：kernel.org 自己发的系列"
        time: 10-02 06:41
  - type: divider
    label: "📌 机制雷达"
    kind: primary
  - type: toc
    items:
      - label: "「热插拔」今天同时出现在两个子系统"
        text: >-
          media 的 V4L2 容错管线与 DRM 的 bridge 热插拔是两条独立线，但打的是同一个隐含假设——
          <b>启动时拓扑固定、实体永远在位</b>。一个从 subdev ioctl 入手报告连接状态，
          一个从「connector 动态分配」入手重建显示输出。两边都还是 RFC，都明确说了「先讨论」。
          <a href="https://lore.kernel.org/linux-media/<20261001-v4l2-sensor-detect-v1-0-a45993be17b8@kernel.org>/">V4L2 侧原文</a>
      - label: "workqueue 为单一消费者开洞"
        text: >-
          WQ_RT 改的是 workqueue 这个通用核心机制，眼下只有 GPU 提交一条路径用得上。
          这类改动的评审重点从来不在功能，而在
          <b>接口一旦进核心，后面有多少子系统会来接、各自的语义能不能对上</b>。
          <a href="https://lore.kernel.org/dri-devel/<20261001160711.59888-3-tvrtko.ursulin@igalia.com>/">workqueue 侧原文</a>
      - label: "能力门禁：用一个已有 capability 挡住新接口"
        text: >-
          实时工作队列没设新权限位，而是复用 CAP_SYS_NICE——理由是 GPU 的实时优先级队列本来就要求它。
          这是内核里常见的做法：<b>新接口尽量挂在已有的权限语义上，而不是新造一个</b>。
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "GMSL2 / SerDes（ds90ub953 / ds90ub960）"
        text: >-
          GMSL2 是车用串行链路。ds90ub953 是相机侧串行器（和 sensor 并排放），
          ds90ub960 是主机侧解串器（多路输入）。今天 V4L2 那条的例子里，
          两路 imx219 各经一片 953 汇进一片 960。
      - label: "VIDIOC_SUBDEV_G_CONNECTION_STATUS"
        text: >-
          今天提的新 ioctl：让 V4L2 subdev 报告自己当前连着没有；状态变化时发 uevent，
          用户态据此决定要不要重新起流。
      - label: ".detect()"
        text: >-
          给 V4L2 传感器驱动加的新操作，用来在运行时探测传感器还在不在。
          配合「允许缺设备也能 probe」，传感器掉线不再等于驱动消失。
      - label: "drm_bridge / drm_bridge_connector / drm_hotplug_helper"
        text: >-
          bridge 是显示管线里的中间环节；bridge-connector 把一串 bridge 当作一个 DRM connector 来用。
          今天的 drm_hotplug_helper 是新增的核心 helper，让 encoder 能在 bridge 插拔时动态加/删 connector。
      - label: "WQ_RT"
        text: >-
          今天给 workqueue 提的标记：带它的 worker 以实时优先级运行。
          对延迟敏感的工作（如 GPU 提交）能显著压低尾延迟。
      - label: "P2PDMA / TLP class"
        text: >-
          P2PDMA 是设备之间直接做 DMA（数据不经主机内存）；TLP 是 PCIe 事务层包。
          v9 的改动是按 TLP 的类型来决定点对点流量走哪条路。
      - label: "sparsebitmap (sbm)"
        text: >-
          面向多节点大机器的稀疏位图：每个 bitmap word 只表示少数几个 CPU，
          把高频写的 cacheline 打散到各节点本地，代价是遍历时要跳着走。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
