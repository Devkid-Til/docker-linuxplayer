---
title: "进程咽气那一刻的十几处竞态：Brauner 用 TLA+ 审 coredump；dma-buf 接进 io_uring 直通 NVMe"
date: "2026-09-22"
desc: "Brauner 17 帖修 coredump/signals 竞态，并用 TLA+ 建模；dma-buf 接进 io_uring 直通 NVMe；VRR 限速器 uAPI 落在 RK3588。"
column: "daily"
tags: ["mm", "fs", "block", "DRM", "media", "net", "Rust", "LSM"]
blocks:
  - type: hook
    text: >-
      今天邮件列表上最有分量的一条，藏在最不起眼的地方：<strong>进程退出、core dump、信号投递</strong>——
      这些每台机器每秒都在跑、却几乎没人愿意细看的路径，被 Christian Brauner 翻出
      <strong>十几处竞态和 UAF</strong>（cover letter 里逐条列了 12 条），
      而且用上了 <strong>TLA+ 形式化建模</strong>来审它。另一头，<strong>dma-buf 被注册进 io_uring</strong>，
      NVMe 读写可以直接落进显存/共享缓冲区，跳过中间那次拷贝。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-22/cover.png"
    alt: "封面 · 9月22日 · 进程咽气那一刻的十几处竞态"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "coredump & signals 17 帖：TLA+ 建模翻出进程退出路径的一串竞态"
      - label: "头条"
        text: "dma-buf 注册进 io_uring：NVMe 读写直落共享缓冲区，IOMMU 场景 570 KIOPS → 5.01 MIOPS"
      - label: "media"
        text: "RK3576 VICAP 进 rkcif；Sony IMX681 第 5 版；ov5640 想实现 get_mbus_config"
      - label: "DRM"
        text: "VRR 限速器 KMS uAPI 25 帖：4 个 CRTC 属性 + QMS，在 RK3588 上跑通"
      - label: "mm"
        text: "memcg_ext RFC：把 memcg 策略交给 cgroup 上挂的 BPF struct_ops"
      - label: "net"
        text: "af_packet 整数溢出、xfrm iptfs page_pool 引用下溢，修复流为主"
      - label: "fs"
        text: "close_range() 想加 CLOEXEC_ONLY / EXCEPT 两个标志位"
      - label: "block"
        text: "NVMe 多路径 partition diskstats 修复到 v4；blk-iocost 开始计 flush 与 zone append"
      - label: "机制"
        text: "drm/fabric 加速器拓扑 RFC、CoCo 共享粒度分配器 13 帖、objtool 动态识别 noreturn"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-22/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-22 06:23 北京，近 24h 各板块真实计数：net 639 · mm 406 · DRM 388 · fs 209 ·
      PCI 159 · media 144 · block 80 · LSM 51 · arch 46 · Rust 25 · rt 13 · virtio 3。
      今天是典型的「大列表高位、大系列撑场」：mm 的 406 里，coredump 17 帖与 memcg_ext RFC 是主要推手；
      DRM 的 388 由 VRR 25 帖和 MSM8952 19 帖两条系列顶上；net 依旧第一，但今天几乎全是
      net/ipsec 的修复流，没有机制级新东西。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "进程咽气那一刻的十几处竞态：Brauner 把 TLA+ 用在了 coredump 上"
    meta: "〔09-21 21:45 北京〕· [PATCH v3 00/17] coredump & signals: an impossible affair（linux-mm）"
    points:
      - label: 现状
        text: >-
          一个进程死掉要走完一整套收尾：投递致命信号、判定谁该被 dump、把 core 写出去、
          关闭文件描述符表、撤销 io_uring、回收线程组。这些步骤分散在信号子系统、mm 的 coredump 代码、
          fs 的 files_struct、以及 io_uring 的 io-wq 里，彼此靠 <b>PF_SIGNALED / PF_POSTCOREDUMP</b>
          这类进程标志和几把 rwsem 串起来——没有一份代码能完整看到全貌。
      - label: 痛点
        text: >-
          正因为没有全貌，这条路径上的竞态极难复现、更难验证：跑一万次不出问题，不代表第 10001 次的
          机器负载下不出。Brauner 在 cover letter 里说得很直白——他请 Chris Mason 用 kres 看了这段代码，
          找出一批；他自己接着看，又找出一批。清单里包括
          <b>coredump_finish() 的 UAF</b>（parked 线程可能在唤醒前就被释放）、
          <b>共享信号被重定向到 dumper 导致 core 被截断</b>、
          fork 失败时在 scx_fork_rwsem 下释放文件引发死锁、以及会话首进程退出时前台作业丢掉 SIGHUP。
      - label: 方案
        text: >-
          17 帖全是修复，不动架构。几个有意思的取舍：现在<b>只有 SIGKILL 和 freezer 能打断 dump</b>
          （cgroup v2 也算在内）——以前别的信号也能打断，语义太散；
          core_pattern 改成从<b>快照</b>解析，不再和 sysctl 写路径赛跑；
          io_uring 侧，SQPOLL ring 的 io-wq worker 如果自己变成 dumper 会把整个 group 拖死，
          现在<b>用户 worker 不再承担 dump</b>；PTRACE_SETSIGMASK 也不再能把用户 worker 解罩。
          exec 路径改成在 de_thread() 之前先取消 io_uring，保证之后没人再往线程组里加线程。
      - label: 为什么
        text: >-
          最值得注意的是方法论：<b>这一版用 TLA+ 做了形式化建模</b>。并发收尾路径靠人眼 review 和跑测试
          都不够——状态空间太小概率的交叉点恰恰是最致命的。用模型把所有交错枚举一遍，
          是把「跑不出来」这件事本身变成证据。这在内核补丁里还相当罕见。
      - label: 效益
        text: >-
          所有会崩溃、会被 OOM kill、会被 core dump 的进程都在这条路径上。修完之后：
          崩溃时 core 更不容易被截断或写丢、cgroup 压力下退出不再莫名卡住、
          关了 io_uring 再 exec 不会有人往线程组里加线程、
          描述符表恢复成<b>从大 fd 往小 fd</b> 关闭（和当初 deferred puts 的顺序一致，避免顺序反转带来的依赖问题）。
      - label: 下一步
        text: >-
          已是 v3，changelog 第一条就是「address Oleg's reviews」——Oleg Nesterov 是信号子系统
          这条线上的资深评审者，拿到他的 Reviewed-by 基本是进 mm 树的临门一脚。
          标题里的「an impossible affair」读起来像作者的自嘲：这套交互本身，
          可能已经复杂到要靠建模工具才审得动了。
    verdict: 今天最该读的一条。它示范的不是某个 bug 怎么修，而是「并发收尾路径该怎么做验证」。
    link: https://lore.kernel.org/linux-mm/<20260921-work-coredump-fixes-v3-0-8e4adb1619e6@kernel.org>/
  - type: headline
    title: "把 dma-buf 注册进 io_uring：NVMe 读写直接落进共享缓冲区"
    meta: "〔09-21 21:39 北京〕· [PATCH v6 00/13] Add dmabuf read/write via io_uring（linux-media / io-uring）"
    points:
      - label: 现状
        text: >-
          <b>dma-buf</b> 是内核里跨设备共享缓冲区的通用抽象（GPU、相机、编解码器、显示控制器之间传图像，
          传的就是 dma-buf）；<b>io_uring</b> 是异步 I/O 的主力接口，它的「注册缓冲区」机制可以把
          用户态内存长期钉住，省掉每次请求的映射开销。两边各管一段，中间没有桥。
      - label: 痛点
        text: >-
          GPU 渲染完一帧、想让 NVMe 直接落盘，或者相机采集的帧要直写存储，都得先经过一次
          用户态或内核态的拷贝中转。对高吞吐场景（AI 训练的 checkpoint、视频流水线）这是实打实的带宽损失。
      - label: 方案
        text: >-
          Pavel Begunkov 的 13 帖把 dma-buf 挂到 io_uring 实例上：通过一个<b>新 file operation</b>
          把 dma-buf 按指定文件注册进来，之后它就能当普通 registered buffer 用，
          配合 IORING_OP_{READ,WRITE}_FIXED 发起读写。map 出来的东西以一种<b>新的 iterator 类型</b>
          穿过整个 I/O 栈，配套还有请求计数、生命周期管理和失效（invalidation）处理。
          目前只打通了 NVMe 块设备。
      - label: 为什么
        text: >-
          两个设计取舍值得记：其一，<b>这套基础设施不绑定 io_uring</b>，作者明确说将来可以有别的使用者——
          它本质是一个通用的「dma-buf ↔ 文件 I/O」映射机制，io_uring 只是第一个消费者。
          其二，用户接口<b>复用 io_uring 已有的 registered buffer 语义</b>，而不是新开一个 syscall。
          这系列还借用了 Keith Busch 2022 年的旧尝试，Tu 等人接着做过几轮。
      - label: 效益
        text: >-
          早期一版在 udmabuf 上做 IOMMU 优化的实测：<b>STRICT 模式 570 KIOPS → 5.01 MIOPS</b>，
          LAZY 模式 1.93 MIOPS → 5.01 MIOPS——两者追平 PASSTHROUGH 的上限。
          也就是说，打开 IOMMU 不再意味着吞吐腰斩。
      - label: 下一步
        text: >-
          停在 v6，改动集中在「去掉 fence、改为同步等失效」「放宽 1G 注册上限」「加固 dma-buf + buffered I/O
          的拒绝路径」这些收尾项上。liburing 的测试代码已公开。要进 mainline，还得看 block 与 io_uring
          两边维护者对「往文件上注册 dma-buf」这个新资源绑定模型的接受度。
    verdict: 数值漂亮的方案，但「一个新 file operation」是长期 ABI 负担，评审不会轻放。
    link: https://lore.kernel.org/linux-media/<cover.1789997898.git.asml.silence@gmail.com>/
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "RK3576 的 VICAP 进 rkcif：同名外设，寄存器布局全换了一遍"
    meta: "〔09-21 23:31 北京〕· [PATCH v2 0/5] media: rockchip: add support for the RK3576 Video Capture unit"
    points:
      - label: 定位
        text: >-
          VICAP 是 Rockchip SoC 上的视频采集单元，驱动落在 <b>rkcif</b> 里，位于 media 子系统的
          平台驱动层，负责把 DVP / MIPI CSI-2 进来的像素写进内存。
      - label: 做法
        text: >-
          RK3576 的 VICAP 带一个 DVP 加五路 MIPI CSI-2，但<i>和 RK3588 不是一套寄存器</i>：
          MIPI 寄存器块布局变了、ID_CTRL0 的位定义变了、<b>VC/DT 过滤器从 ID_CTRL0 搬到了 ID_CTRL1</b>、
          采集尺寸挪进新的 ID_SET_SIZE 寄存器；每个 MIPI 口的像素时钟还要走 CRU 里一道专属门控，
          于是驱动要声明<b>五个 interface clock 和五个 interface reset</b>。
          前两帖先给 rkcif 加上「采集尺寸寄存器索引」和「ID_CTRL1 回调」两个钩子，不改动老 SoC 的行为。
      - label: 效益
        text: >-
          这套改法是「同一个驱动覆盖多代硬件」的典型走法：能参数化的抽成索引/回调，
          实在不一样的部分再分叉，避免复制一份 rkcif 出来。对 RK3576 板子来说是从 0 到 1。
      - label: 下一步
        text: >-
          停在 v2。DT binding 和设备树节点还没进，等 media 维护者先认寄存器抽象这层。
    relevance: 你在 RK3588 上做 camera，3576 这代寄存器的改法就是「下一代会不会再变」的预演——抽钩子的位置选得对不对，直接影响你后面移植的成本。
    link: https://lore.kernel.org/linux-media/<20260921-vicap-rk3576-v2-0-0a4582e20c72@gmail.com>/
  - type: highlight
    title: "Sony IMX681 传感器驱动到第 5 版，这次带上 ipu-bridge"
    meta: "〔09-22 03:25 北京〕· [PATCH v5 0/3] Add support for the Sony IMX681 camera sensor"
    points:
      - label: 定位
        text: >-
          标准的三件套：dt-bindings 声明硬件、i2c 驱动实现 v4l2_subdev 操作、再挂进 Intel 的
          ipu-bridge（把 ACPI 描述的相机拓扑翻译成 V4L2 的 sensor 连接关系）。
      - label: 做法
        text: >-
          v5 相比 v4 的主要变化是把 ipu-bridge 那一片补上，说明这条链路已经不只是「驱动能 probe」，
          而是在往「笔记本上开箱可用」的方向推。
      - label: 效益
        text: >-
          对普通用户的意义很直接：新一批 Intel 平台的笔记本摄像头能出图。
    relevance: 传感器驱动是最标准的 v4l2_subdev 范本——bindings / subdev ops / bridge 三段式，写自己的新 sensor 时照着抄结构就对了。
    link: https://lore.kernel.org/linux-media/<20260921192450.21811-1-lsa.uz@pm.me>/
  - type: highlight
    title: "ov5640 想实现 get_mbus_config：一个 RFC 问的是 media bus 该怎么描述"
    meta: "〔09-22 02:05 北京〕· [RFC] media: i2c: ov5640: Implement get_mbus_config"
    points:
      - label: 定位
        text: >-
          <b>media bus format</b>（MEDIA_BUS_FMT_*）描述的是「sensor 到 CSI-2 host 之间那根线上，
          像素以什么格式、几个 lane、什么时序传」——它属于 subdev 之间的接口层，
          和「帧从哪来」的内核内部格式是两码事；get_mbus_config 就是让 subdev 回答这个接口怎么配的。
      - label: 做法
        text: >-
          ov5640 是一个被广泛复用的老 sensor，作者发 RFC 试探把它接进 get_mbus_config 这条路。
          RFC 而非 PATCH，说明他自己也在等维护者表态：这层抽象该由谁来承担。
      - label: 效益
        text: >-
          如果成立，好处是 host 侧驱动不用再靠猜或硬编码去推 sensor 的 lane 数和链路频率。
    relevance: 这是 v4l2 里最容易被新人忽略的一层。你做 GMSL2 serdes 时，「谁负责声明链路参数」这个问题的答案就藏在这类补丁的讨论里。
    link: https://lore.kernel.org/linux-media/<ho5e5huh2b5biibucht2bxyj2hzih2dkqpskrxtvsaf34niboc@s5e6pok36m5i>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-media/<20260921-camss-isp-ope-v8-0-dd1c86a3c8a0@oss.qualcomm.com>/
        text: "高通 CAMSS 的离线处理引擎 OPE 到 v8（9 帖）：把 ISP 的后处理从 CPU 上卸下来，含 V4L2 meta 格式与 UAPI 定义"
        time: 09-21 23:36
      - link: https://lore.kernel.org/linux-media/<20260921-dma_buf_improvement-v1-1-23d82e771dec@oss.qualcomm.com>/
        text: "dma-buf system_heap：分配阶数对齐 ARM64 大页尺寸"
        time: 09-21 23:14
      - link: https://lore.kernel.org/linux-media/<20260921081542.210151-1-lgs201920130244@gmail.com>/
        text: "rtl28xxu 的 SDR platform device 泄漏，维护者来回讨论了四五轮"
        time: 09-21 16:15
      - link: https://lore.kernel.org/linux-media/<20260921-msm8952-initial-support-v3-13-b96fd3fe298b@mainlining.org>/
        text: "MSM8952 全平台初始支持到 v3（19 帖），含 MDP5 显示配置与 General Mobile Shamrock 新设备"
        time: 09-22 02:19
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "VRR 限速器 KMS uAPI：给可变刷新率画一条「只准在这之间跑」的线"
    meta: "〔09-21 23:52 北京〕· [PATCH RFC 00/25] VRR Target Rate Limiter KMS uAPI and Implementation"
    points:
      - label: 定位
        text: >-
          <b>VRR</b>（Variable Refresh Rate）让显示器刷新率跟着内容走，避免撕裂和卡顿；
          <b>QMS</b>（Quick Media Switching）则允许在切刷新率时不留黑屏。这两个能力都在
          KMS（内核显示模式设置）层，通过 CRTC / connector 属性暴露给用户态。
      - label: 做法
        text: >-
          Nicolas Frattaroli 的 25 帖提出 <b>4 个新的 CRTC 属性</b>（帧率目标的 min/max）+
          <b>1 个新的 connector 属性</b>（开 QMS 信令）。前约 11 帖是给 HDMI state helper 实现
          「游戏模式」VRR 并接上 Rockchip，<b>在 RK3588 上开发和测试</b>。
      - label: 效益
        text: >-
          解决的问题很具体：真实面板的 VRR 范围有限，跑到某些帧率会<b>肉眼可见地闪亮度</b>。
          把 VRR 约束在「内容预期帧率」的区间内，既拿到无抖动（或低延迟）的呈现，
          又不会掉进闪烁区。QMS 则让 connector 提前预告要变帧率，电视端的画质处理算法不用为了
          「随时可能变」而被整个关掉。
      - label: 下一步
        text: >-
          还在 RFC 阶段，而且作者特意解释了一个 API 细节：帧率用<b>分子/分母的比值</b>而不是帧间隔或微赫兹——
          因为 QMS 只支持很有限的一组目标帧率（比如 24 Hz 和 24/1.001 Hz 这种 0.1% 差别的），
          让用户态直接给有理数，内核就不用去反推「你原本想要的是哪个」。IGT 测试已随附。
    relevance: 在 RK3588 上开发并测试，rockchip 这条线直接受益；只要你关心显示输出的时延和观感，这个 uAPI 定型后就是你的调参入口。
    link: https://lore.kernel.org/dri-devel/<20260921-vrr-limiter-uapi-v1-0-2fcd7d011646@collabora.com>/
  - type: highlight
    title: "cgroup/dmem 的软上限：到 v8 了，靠主动回收来兜 memory.high"
    meta: "〔09-21 20:18 北京〕· [PATCH v8] cgroup/dmem: implement dmem.high soft limit with proactive reclaim"
    points:
      - label: 定位
        text: >-
          dmem cgroup 控制器管的是<b>设备内存</b>（显存这类），不是系统 RAM。dmem.high 想提供的是
          和 memcg 的 memory.high 类似的「软上限」语义：不硬挡，超了就主动回收。
      - label: 做法
        text: >-
          v8 的核心是把主动回收（proactive reclaim）接进 dmem 的 charge 路径，
          让超限的分配方自己去还债，而不是一律拒绝。
      - label: 效益
        text: >-
          意义在 GPU/加速器场景：显存吃紧时，应用能被压着缩一点，而不是直接 OOM 掉整个进程。
    relevance: 设备内存的 cgroup 化是这两年才补上的课，做 GPU/相机这类吃设备内存的子系统绕不开。
    link: https://lore.kernel.org/dri-devel/<20260921-feature-dmem-high-v8-1-6371fa83d6c3@gmail.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/dri-devel/<20260915104328.45901-1-gahing@gahingwoo.com>/
        text: "Rockchip 电源域系列到 v13（14 帖），含 RK3576 的 NPU（RKNN）节点"
        time: 09-22 05:51
      - link: https://lore.kernel.org/dri-devel/<20260921184226.18941-1-lizhi.hou@amd.com>/
        text: "accel/amdxdna：去掉对 ubuf 的 dma-buf 包装"
        time: 09-22 02:42
      - link: https://lore.kernel.org/dri-devel/<20260921190014.38231-1-karanja99erick@gmail.com>/
        text: "drm/v3d：把 v3d_perfmon_stop_locked() 收回 v3d_perfmon.c"
        time: 09-22 03:00
      - link: https://lore.kernel.org/dri-devel/<20260921-v3d-quick-exit-perfmon-serialize-v1-0-e58aea1075e2@igalia.com>/
        text: "drm/v3d：没有 perfmon 可观测时，跳过 perfmon 串行化（2 帖）"
        time: 09-22 05:24
      - link: https://lore.kernel.org/dri-devel/<20260917191512.38838-1-andersen.theo@gmail.com>/
        text: "amdgpu：switcheroo 停放的 GPU 跳过 noirq suspend reset"
        time: 09-22 05:48
      - link: https://lore.kernel.org/dri-devel/<20260921182121.308217-2-talesam@gmail.com>/
        text: "drm/xe：TLB 失效超时前先抓 devcoredump（v5）"
        time: 09-22 02:49
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "zswap 冷回写页尽早释放，到 v6"
    meta: "〔09-21 23:13 北京〕· [PATCH v6 0/3] mm: zswap: free cold writeback folios promptly"
    points:
      - label: 定位
        text: >-
          zswap 是 swap 前面的一道压缩缓存：内存页被换出时先压缩存在 RAM 里，
          真扛不住才写回磁盘。写回完成的那些页什么时候释放，属回收层的事。
      - label: 做法
        text: >-
          问题在于「冷」的回写页（已经写完、不会再被访问）如果迟迟不释放，就白占着内存。
          这 3 帖让它们在写回完成时被及时放掉。
      - label: 效益
        text: >-
          内存紧张时 zswap 的实际可用容量更接近标称值，减少「明明压缩了却还是 OOM」的假象。
    relevance: 如果做嵌入式或内存受限设备上的大页/高吞吐采集，zswap 的回收时机直接影响你能否跑满帧率。
    link: https://lore.kernel.org/linux-mm/<20260921151306.625134-1-alex@ghiti.fr>/
  - type: highlight
    title: "MADV_PAGEOUT 的页，等 swap 写回完成再丢"
    meta: "〔09-21 23:25 北京〕· [PATCH] mm: madvise: drop MADV_PAGEOUT folios at swap writeback completion"
    points:
      - label: 定位
        text: >-
          MADV_PAGEOUT 是用户态主动告诉内核「这些页我不要了，换出去吧」的接口——
          常见于 Android 的低内存杀手和各类内存敏感服务。
      - label: 做法
        text: >-
          帖子把「丢弃」这个动作推迟到 swap 写回真正完成的那一刻，而不是更早。
      - label: 效益
        text: >-
          避免页在写回还没落盘时就被判定为可丢弃，减少压力路径上的反复颠簸。
    relevance: 主动内存回收是你调优采集缓冲池时最直接的一根旋钮。
    link: https://lore.kernel.org/linux-mm/<70cae945-3a4a-40db-96ac-5ce66a3fa186@kernel.org>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-mm/<20260921-feature-dmem-high-v8-1-6371fa83d6c3@gmail.com>/
        text: "cgroup/dmem 软上限 + 主动回收到 v8（见 DRM 栏）"
        time: 09-21 20:18
      - link: https://lore.kernel.org/linux-mm/<20260921-dummy_ptxp3-v1-0-cd40cf68242e@arm.com>/
        text: "21 帖改 pXd_get()/pXd_page() 在编译期折叠页表下的行为"
        time: 09-21 18:56
      - link: https://lore.kernel.org/linux-mm/<20260921-b4-sparsemem_cleanups-v2-0-54d81d65e125@kernel.org>/
        text: "mm/sparse 去掉 SECTION_MARKED_PRESENT 并继续清理（v2，13 帖）"
        time: 09-22 03:59
      - link: https://lore.kernel.org/linux-mm/<20260921-vmalloc_dump_obj-v2-0-73fceb3ed1c8@linux.dev>/
        text: "vmalloc_dump_obj 的 VA 查找修错（v2）"
        time: 09-21 21:17
      - link: https://lore.kernel.org/linux-mm/<20260921-b4-kmemleak-page-scan-v1-0-fb97d4801b3a@debian.org>/
        text: "kmemleak：把 struct page 扫描批量化，降低漏检扫描的停顿"
        time: 09-21 20:31
      - link: https://lore.kernel.org/linux-mm/<20260921151547.78472-1-sj@kernel.org>/
        text: "DAMON：效率、错误处理与文档的一批改进（4 帖）"
        time: 09-21 23:15
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "af_packet 的整数溢出：TPACKET_V3 收包超时的乘法"
    meta: "〔09-22 03:26 北京〕· [PATCH net] af_packet: fix integer overflow in prb_calc_retire_blk_tmo()"
    points:
      - label: 定位
        text: >-
          af_packet 是抓包（tcpdump、各类 IDS）走的原始套接字路径；TPACKET_V3 的环形缓冲区
          用「块」为单位收包，prb_calc_retire_blk_tmo() 算的是一块数据多久该被退休。
      - label: 做法
        text: >-
          这里的运算是乘法，参数由用户态给的超时和块大小决定——乘出来溢出就会算出一个荒谬的 tmo 值。
          补丁加上溢出保护。
      - label: 效益
        text: >-
          避免用户态用一个刁钻参数把内核侧的计算带进未定义区间。
    relevance: 抓包工具是你调 camera pipeline 时序时的常备手段，这条路径的健壮性值得留意。
    link: https://lore.kernel.org/netdev/<20260921192608.1420047-1-zhangdairui@gmail.com>/
  - type: highlight
    title: "xfrm iptfs：共享 page_pool 分片时的 pp_ref_count 下溢"
    meta: "〔09-22 05:06 北京〕· [PATCH ipsec] xfrm: iptfs: fix pp_ref_count underflow when sharing page_pool frags"
    points:
      - label: 定位
        text: >-
          IP-TFS（IP Traffic Flow Security）是 xfrm/IPsec 里把流量做成恒定速率、掩盖真实包长与时序的机制；
          page_pool 则是网卡驱动的页池——这是 net 与 mm 的交界处。
      - label: 做法
        text: >-
          多个分片共享同一个 page_pool 页时，引用计数在某个路径上被多减了一次，导致下溢。
          补丁修正引用计数。
      - label: 效益
        text: >-
          引用计数下溢通常意味着页会被提前归还甚至重用，是典型的内存破坏前兆。
    relevance: page_pool 是 net 与 mm 耦合最紧的地方，这类「谁该持有这个页」的账本错误在两边都会出现。
    link: https://lore.kernel.org/netdev/<xfrm-iptfs-pp_ref_count-underflow-v1-1-5fb363833d41@secunet.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/netdev/<20260921-fix-macsec-net-v3-1-accf94f93f5e@gmail.com>/
        text: "macsec：先初始化 SecY 再注册 netdevice（v3）"
        time: 09-22 04:40
      - link: https://lore.kernel.org/netdev/<20260922-seg6-maclen-headroom-v3-1-7b2f982ef79d@gmail.com>/
        text: "ipv6：dst_dev_overhead() 要给 mac header 留位置（v3）"
        time: 09-22 04:50
      - link: https://lore.kernel.org/netdev/<20260921222609.50824-4-jeffjo@openai.com>/
        text: "tcp：修正已接收旧 ACK 的时间戳回显"
        time: 09-22 06:26
      - link: https://lore.kernel.org/netdev/<20260921215027.174657-1-achender@kernel.org>/
        text: "net/rds：连接路径集按最终选定的传输方式定尺寸"
        time: 09-22 05:50
      - link: https://lore.kernel.org/netdev/<178996980298.2160803.13730440636881546701@kernel.org>/
        text: "ipvs：加 per-service secure_tcp（v5，3 帖）"
        time: 09-22 04:57
      - link: https://lore.kernel.org/netdev/<20260921183758.1812310-1-edumazet@google.com>/
        text: "ethtool：让 netdev_rss_key_fill() 把流分散到所有队列（5 帖）"
        time: 09-22 02:38
      - link: https://lore.kernel.org/netdev/<20260921195545.493253-1-almasrymina@google.com>/
        text: "net: devmem 文档明确 bind-tx 按设计不需特权"
        time: 09-22 03:55
      - link: https://lore.kernel.org/netdev/<20260921201108.42676-1-arouhi@sitime.com>/
        text: "dpll：SiTime SiT9531x DPLL 时钟驱动到 v10（14 帖）"
        time: 09-22 04:11
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "close_range() 想再要两个标志：只关 CLOEXEC 的，或者除了某个 fd 全关"
    meta: "〔09-21 22:15 北京〕· [PATCH 00/10] files, close_range: add CLOSE_RANGE_{CLOEXEC_ONLY,EXCEPT}"
    points:
      - label: 定位
        text: >-
          close_range(2) 是 5.9 引入的批量关 fd 接口，主要用于 fork/exec 和容器运行时清理描述符表。
          今天它已经带了 CLOSE_RANGE_UNSHARE 和 CLOSE_RANGE_CLOEXEC 两个标志。
      - label: 做法
        text: >-
          这 10 帖再加两个：<b>CLOEXEC_ONLY</b>——只处理那些设了 close-on-exec 的 fd；
          <b>EXCEPT</b>——给一个 fd，除它以外全关。后者对「exec 前保留一个 socket 或日志 fd」的场景很顺手。
      - label: 效益
        text: >-
          现在要做同样的事，用户态得遍历 /proc/self/fd 逐个判断，既慢又有竞态（遍历期间 fd 号可能被复用）。
          放进内核一次做完，既原子又快。
    relevance: 容器运行时和 sandbox 是这两个标志的直接用户；这也是一堂「用户态 workaround 何时该收进内核」的现成案例。
    link: https://lore.kernel.org/linux-fsdevel/<20260921-work-file-close_range_except-v1-0-c20d0b49270d@kernel.org>/
  - type: highlight
    title: "XFS 写流（write streams）到 v5：给写入按流分组"
    meta: "〔09-21 17:32 北京〕· [PATCH v5 0/8] xfs write streams"
    points:
      - label: 定位
        text: >-
          write streams 想解决的是「同一块盘上不同来源的写入互相干扰」——典型如容器镜像层、
          数据库 WAL 与数据文件的写放大问题，落在 XFS 的分配与回写层。
      - label: 做法
        text: >-
          v5 延续按流分组的思路，让内核知道哪些写属于同一逻辑来源，从而在分配和回写上区别对待。
      - label: 效益
        text: >-
          如果成型，多租户或混合负载下的尾延迟会更稳。
    relevance: 回写与分配策略的改动最终会体现在你的采集落盘延迟上。
    link: https://lore.kernel.org/linux-fsdevel/<20260921093147.59935-1-joshi.k@samsung.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-fsdevel/<20260921083133.2960-1-parri.andrea@gmail.com>/
        text: "iomap：修一组错误处理的回归（3 帖）"
        time: 09-21 16:31
      - link: https://lore.kernel.org/linux-fsdevel/<cover.1789987960.git.legion@kernel.org>/
        text: "sysctl：加带类型的字段描述符（v2，6 帖）"
        time: 09-21 18:55
      - link: https://lore.kernel.org/linux-fsdevel/<20260921153729.600313-1-bruno.produit@trailofbits.com>/
        text: "hfs/hfsplus：B-tree 关闭与 folio 释放串行化（v2）"
        time: 09-21 23:37
      - link: https://lore.kernel.org/linux-fsdevel/<20260921104013.40475-1-amir73il@gmail.com>/
        text: "overlayfs：修 ovl_do_mkdir() 调试打印里的 UAF"
        time: 09-21 18:40
      - link: https://lore.kernel.org/linux-fsdevel/<20260921211712.1563575-1-agruenba@redhat.com>/
        text: "gfs2：阻止 prune_icache_sb 中的过早 evict"
        time: 09-22 05:17
  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "NVMe 多路径下 partition 的 diskstats 记错，修到 v4"
    meta: "〔09-21 16:38 北京〕· [PATCH v4 0/4] fix NVMe multipath partition diskstats"
    points:
      - label: 定位
        text: >-
          NVMe 原生多路径下，一个 namespace 在多个控制器上各有一份，加上分区之后，
          每个分区对应哪个块设备、统计该记在谁头上，就成了账本问题——落在 block 层的
          gendisk/partition 与 NVMe 多路径的交界。
      - label: 做法
        text: >-
          v4 继续修正分区 level 的 stats 归属，让 iostat 这类工具读到的是真实值。
      - label: 效益
        text: >-
          多路径是企业存储的默认配置，统计错会直接误导容量与性能规划。
    relevance: diskstats 是你判断存储是否成为采集瓶颈时最先看的数字，它错了后面全是误判。
    link: https://lore.kernel.org/linux-block/<20260921083752.1154316-1-john.garry@linux.dev>/
  - type: highlight
    title: "blk-iocost 开始给 flush 和 zone append 记账"
    meta: "〔09-21 11:35 北京〕· [PATCH v3 0/4] blk-iocost: charge flushes and zone appends"
    points:
      - label: 定位
        text: >-
          iocost 是按 I/O 成本给 cgroup 分配带宽的控制器。它的成本模型得知道每种 I/O 有多贵，
          而 flush（刷写屏障）和 zone append 恰恰是之前没被计入的两类。
      - label: 做法
        text: >-
          v3 把它们纳入计费。flush 的实际代价远高于同尺寸的普通写——它要等设备把缓存落盘。
      - label: 效益
        text: >-
          不记账意味着这些开销被平摊给了别人，控制器给出的限速和实际体验对不上。
    relevance: 做高吞吐落盘时，flush 成本被正确计量与否，直接决定你的限流参数该怎么设。
    link: https://lore.kernel.org/linux-block/<20260921033453.1912971-1-cui.tao@linux.dev>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-block/<20260921212624.1942234-1-kbusch@meta.com>/
        text: "blk-mq：操作类型已知时直接设 RQF_USE_SCHED"
        time: 09-22 05:26
      - link: https://lore.kernel.org/linux-block/<20260921132058.2091567-1-usama.arif@linux.dev>/
        text: "blk-cgroup：没有 blkg 的 cgroup 跳过 rstat flush（v2）"
        time: 09-21 21:21
      - link: https://lore.kernel.org/linux-block/<20260921070647.1928289-1-cui.tao@linux.dev>/
        text: "RFC：把透传请求记到提交者的 cgroup 账上"
        time: 09-21 15:07
      - link: https://lore.kernel.org/linux-block/<20260921205951.3023714-1-mkhalfella@purestorage.com>/
        text: "blktests nvme/071：多路径 fabrics namespace 上的 CCR/CQT 恢复测试"
        time: 09-22 05:00
      - link: https://lore.kernel.org/linux-block/<20260921200728.84114-1-artem@trailofbits.com>/
        text: "blk-mq：把 CVE-2023-54227 回移植到 6.1.y（2 帖）"
        time: 09-22 04:07
  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "memcg_ext"
        text: >-
          把 memcg 策略交给 cgroup 上挂的 BPF struct_ops：charge 会依次跑自己与所有祖先的策略，
          内核负责合并结果，而 BPF <b>只在内核已有的动作之间做选择，自己从不干活、也不碰页计数器</b>。
          第一个成员 high_policy() 解决的问题很具体——try_charge_memcg() 会在持锁路径上就地回收并限流，
          kernfs notify worker 拿着 kernfs_rwsem 读锁去回收，会把 cgroupfs 卡住好几秒。
          实测把 kernfs_rwsem 最长持锁从 <b>2.049 s 压到 199 us</b>。
          作者特别声明：每次只加一个成员，且必须配一个具体问题和一个测量结果。
          <a href="https://lore.kernel.org/linux-mm/<20260921192559.2619635-1-shakeel.butt@linux.dev>/">原文</a>
      - label: "drm/fabric"
        text: >-
          scale-up 加速器互联（把多张卡连成一台逻辑加速器）的<b>厂商中立拓扑基础设施</b> RFC，
          12 帖。目标是让内核有一套公共语言描述加速器之间的连接关系，而不是每家各写一份。
          仍在 RFC 且讨论活跃。
          <a href="https://lore.kernel.org/dri-devel/<20260921131911.532d81f4@kernel.org>/">原文</a>
      - label: "CoCo 共享粒度分配器"
        text: >-
          arm64 CCA Realm（机密计算客户机）里，guest 与 host 共享的内存必须按「共享粒度」对齐。
          13 帖 RFC 新增一个 shared-granule allocator，并把 dma-buf system_heap、dma-direct、
          dma-pool、swiotlb、GICv3 ITS 表全部接上去。是一次从 mm 一路打到中断控制器的横切改动。
          <a href="https://lore.kernel.org/linux-media/<20260921144847.501151-1-aneesh.kumar@kernel.org>/">原文</a>
      - label: "objtool 动态识别 noreturn"
        text: >-
          28 帖。noreturn 函数过去靠静态列表或编译器属性维护，漏一个就可能在栈回溯里出错。
          改成由 objtool 动态检测，属于工具链层的机制补齐。
          <a href="https://lore.kernel.org/rust-for-linux/<cover.1790028654.git.jpoimboe@kernel.org>/">原文</a>
      - label: "dma-buf file I/O 基础设施"
        text: >-
          今日头条那条系列的底座部分：dma-buf 侧新增的 file I/O 基础设施本身与 io_uring 解耦，
          作者明说将来可以有别的使用者。换句话说，真正要评审的不是「NVMe 快了多少」，
          而是<b>「往一个文件上注册 dma-buf」这个新的资源绑定模型是否成立</b>。
          <a href="https://lore.kernel.org/linux-media/<cover.1789997898.git.asml.silence@gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "TLA+"
        text: >-
          一种形式化规约语言，用状态机与不变式描述并发系统，再由模型检查器把所有可能的交错枚举一遍。
          内核补丁里用它来审竞态还很少见——本期的 coredump 系列是例子。
      - label: "core_pattern"
        text: >-
          /proc/sys/kernel/core_pattern，决定 core dump 往哪写、交给谁处理（本地文件、管道给 systemd-coredump 等）。
          它是运行时可变的内核参数，所以读它的人和改它的人天然存在竞态。
      - label: "VRR / QMS"
        text: >-
          VRR（可变刷新率）让显示器刷新率跟随内容；QMS（Quick Media Switching）让切换刷新率时不黑屏。
          两者都在 HDMI 2.1 时代成为消费电子的基础能力，也是本期那个 25 帖 uAPI 的主题。
      - label: "struct_ops"
        text: >-
          BPF 的一种程序类型：把一组函数指针打包成「内核里某个操作集」的实现，由 BPF 程序提供。
          它让 BPF 能替换内核既有的策略接口，而不只是挂在 hook 上被动观察——memcg_ext 用的就是它。
      - label: "dma-buf"
        text: >-
          内核里跨设备共享缓冲区的通用抽象。GPU 渲染的结果要交给显示控制器、相机采集的帧要交给编码器，
          中间传递的就是 dma-buf，它把「这块内存在哪、谁能访问」包装成一个可传递的文件描述符。
      - label: "media bus format"
        text: >-
          MEDIA_BUS_FMT_* 描述的是两枚芯片之间那根物理线上的像素格式与链路参数（lane 数、时序），
          区别于「帧在内存里长什么样」的像素格式。v4l2 里这两层经常被混淆。
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的板块。
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
