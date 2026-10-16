---
title: "设备内存直接当 I/O 缓冲区；XFS 核心维护者告别内核"
date: "2026-10-17"
desc: "dma-buf 一天内从 fs 的 iomap 走到 nvme 的 passthrough；同日 XFS 核心维护者 Darrick J. Wong 宣布离开。"
column: "daily"
tags: ["fs", "block", "media", "DRM", "mm", "net", "arch", "LSM", "Rust", "PCI", "virtio"]
blocks:
  - type: hook
    text: >-
      今天值得花 3 分钟看三件事：<strong>设备内存开始直接当 I/O 缓冲区</strong>——同一个作者
      一天之内把它从文件系统的 iomap 铺到 nvme 的命令通路；<strong>XFS 核心维护者 Darrick J. Wong
      宣布离开内核</strong>，23 年，一封 6 行的邮件；还有 <strong>RK3588 的 ISP 驱动被搬到
      RV1126 上实机跑了一遍</strong>，逐条评出哪些假设只对 3.0 成立。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-17/cover.png"
    alt: "封面 · 10月17日 · 设备内存直接当 I/O 缓冲区"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-17/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-17 06:23 北京，近 24h 各板块真实计数：net 596 · mm 251 · DRM 221 · media 156 ·
      fs 140 · PCI 117 · block 77 · Rust 66 · rt 48 · arch 36 · LSM 25 · virtio 2。net 与 mm
      量最大，但今天真正成体系的设计讨论落在三处：<strong>fs 与 block 的 dma-buf 通路</strong>、
      <strong>media 的 Rockchip ISP</strong>、以及 <strong>LSM 里把 1724 行专用数据结构删掉</strong>
      的那次替换。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "设备内存直接当 I/O 缓冲区：dma-buf 一天补齐 fs 与 nvme 两端"
    meta: "〔10-16 17:19 北京〕· [RFC 0/4] fs: support dma-buf backed direct I/O（Anuj Gupta，Samsung）"
    points:
      - label: 现状
        text: >-
          内核里的 I/O 缓冲区分两个世界。<strong>主机内存</strong>这边是页：page cache 或用户态
          地址，文件系统的 direct I/O 把它们组织成 bio 交给块层；<strong>设备内存</strong>这边是
          <strong>dma-buf</strong>——显存、加速器内存、相机与编码器产出，被导出成一个可跨驱动传递
          的句柄。两个世界长期靠拷贝连接：设备写完了，先拷回主机内存，再走普通读写。
      - label: 痛点
        text: >-
          可数据本来就产生在设备内存里。GPU 渲染完一帧、NPU 推理出一批结果、编码器产出一段码流，
          要落盘就得先整个搬回主机内存。<code>blk_rq_map_user_iov()</code> 面对非页的迭代器，
          默认路径是 <strong>bounce copy</strong>（先拷进内核临时缓冲再发给硬件）——一次读写两趟搬运。
      - label: 方案
        text: >-
          四封 RFC 让应用可以把一个 dma-buf <strong>注册到某个文件</strong>上（
          <code>dma_buf_io_ctx</code>），此后该文件上的读写直接生成 <strong>dma-buf backed bio</strong>：
          数据从设备内存直连块设备。<code>block/bio.c</code> 拆出
          <code>bdev_init_dma_buf_io_ctx()</code>；<code>bdev</code> 侧拒绝「这块缓冲没在这个磁盘上
          注册过」的 bio；<code>fs/iomap/direct-io.c</code> 加注册 helper 与守卫；XFS 接第一批。
      - label: 为什么
        text: >-
          它不重造块层的 dma-buf 通路——那部分建立在 Pavel Begunkov 的 dma-buf block 支持 v11 之上，
          已经进了 Jens Axboe 的 <code>for-7.4/io_uring-dmabuf</code> 分支。这一系列补的是
          <strong>文件系统侧怎么认这块缓冲</strong>：注册、校验归属、把 bio 组装起来。同一天，
          同一个作者还发了 <code>nvme/io_uring</code> 那一半——把 dma-buf 注册到 NVMe 命名空间字符
          设备，作为 fixed <code>uring_cmd</code> 的数据缓冲，并让
          <code>blk_rq_map_user_iov()</code> 对 dma-buf 迭代器直接映射，因为它<strong>没法退回
          bounce copy</strong>。
      - label: 效益
        text: >-
          少一次全量拷贝，且路径上不留临时内核缓冲。版图也清楚了：fs 的 direct I/O、块层的 bio、
          io_uring 的固定缓冲、NVMe 的 passthrough，四处在同一天被同一套抽象串起来。
      - label: 下一步
        text: >-
          RFC，7 个文件、98 行新增，只有 XFS 开了头。要成为通用能力，iomap 覆盖的其它文件系统得逐个
          跟上；注册制本身也意味着<strong>不能拿任意 dma-buf 往任意磁盘写</strong>——这条安全边界
          是系列里专门一封信在守。
    verdict: "「缓冲区的类型在扩张」是 I/O 栈这几年的主线之一：从页，到 iov，到 iovec，现在到 dma-buf。这条线这次走得保守——先要显式注册，再拒绝未注册的组合，宁可多一道检查也不放开默认路径。"
    link: "https://lore.kernel.org/linux-fsdevel/<20261016091919.971295-1-anuj1072538@gmail.com>/"

  - type: divider
    label: "🕯️ 社区"
    kind: section
  - type: quote
    text: >-
      After 14 years at Oracle and 23 years working on Linux, I've decided to take an extended
      break. Today, October 16th, 2026, is my last day. … I have very much enjoyed working with
      you all, and I'm proud of what we've accomplished together. Good luck!
  - type: paragraph
    text: >-
      XFS 文件系统的核心维护者 <strong>Darrick J. Wong</strong>（djwong@kernel.org）用一封六行的
      邮件宣布离开。邮件里没有说交接安排，只留了 <code>djwong@kernel.org</code> 的转发地址——「最终
      由系统管理员决定」。当天 linux-fsdevel 上多封回复都在道别；而 XFS 相关的技术讨论并没有停：
      write streams v6 的往返在同一时间线里继续。对一个靠个人长期投入维持 review 带宽的子系统来说，
      这类离开带来的空缺通常要几个月才显形。
  - type: paragraph
    text: >-
      （本条为社区动态，非技术补丁。原文：<a href="https://lore.kernel.org/linux-fsdevel/<20261016160037.GA107919@frogsfrogsfrogs>/">Farewell!</a>）

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "RK3588 的 ISP 驱动被搬到 RV1126 上跑了一遍，问题逐条列出"
    meta: "〔10-17 00:06 北京〕· Re: [PATCH v3 0/5] media: rockchip: rkisp2: Add driver for ISP on RK3588（Jacopo Mondi 评审）"
    points:
      - label: 定位
        text: >-
          <strong>ISP</strong> 是相机链路里把 Bayer 原始数据变成可用图像的那一层，位置在 sensor
          与采集端之间。rkisp2 是新写的驱动，目标是覆盖 Rockchip 2.x / 3.x 两代 ISP，第一个目标是
          RK3588（3.0 版）。v3 共五封：驱动本体、params 输出节点、statistics 采集节点、media 控制器、
          以及 RK3588 的设备树节点。
      - label: 做法
        text: >-
          评审者没有 RK3588，但有 RV1126（ISP 2.0）。他把整个系列跑在 RV1126 + IMX415 +
          libcamera 上，然后给出逐补丁意见和一整份「2.0 需要什么」的清单：CR 平面基址从未写入（三平面
          格式的第三平面写到没编程的地址）；4:2:0 采集格式挂的 media bus code 是 ISP 源 pad 根本没提供的
          <code>YUYV8_1_5X8</code>，link validation 直接失败；MPFBC 格式表里 NV21M 出现两次、缺 NV12M
          与 YUV420；params 缓冲在流启动时被消费后不还给用户态；stats 表把 HIST_BIG1 列了两次，HIST_BIG2
          丢失。他自己还补了 12 条 2.0 专属改动：多读 24 行、时钟寄存器布局不同、读回缓冲要在 ISP 帧完成
          中断而不是主路径帧结束才交还，等等。
      - label: 效益
        text: >-
          这是一次罕见的「用另一个硬件版本反查驱动假设」的评审。清单明确区分了三类：只对 2.0 成立的、
          可能同时影响 3.0 的、以及纯属代码写错的。<strong>对做 Rockchip 相机链路的人来说，这就是一份
          现成的对照表。</strong>
    relevance: 今天离 RK3588 相机链路最近的一条。它也说明新 ISP 驱动进主线慢的真正原因——不是没人写，是没有足够多的硬件版本被真正跑过。
    link: "https://lore.kernel.org/linux-media/<atJLbtG3cGDOWMSx@makrotopia.org>/"

  - type: highlight
    title: "OV13858 上 Snapdragon：一整个白天在 sensor 与设备树之间来回"
    meta: "〔10-17 05:02 北京〕· [PATCH v4] media: i2c: ov13858: add regulator, clock and reset GPIO handling"
    points:
      - label: 定位
        text: >-
          <strong>ov13858</strong> 是 OmniVision 的一颗 1300 万像素 sensor 驱动。它此前只有基础
          支持，没有设备树描述。目标是 Surface Pro 11（Snapdragon）上的那颗。
      - label: 做法
        text: >-
          这一线今天在 dt-bindings 与驱动之间来回多轮：先是新增 OmniVision OV13858 的 bindings，
          再补 <code>dongwoon,dw9719</code> 的 DW9714VA 对焦线圈文档，驱动侧加到 v4 收敛为
          <strong>regulator / clock / reset GPIO</strong> 三件套。
      - label: 效益
        text: >-
          sensor 要能被 probe，供电、时钟、复位缺一不可。这类驱动从「能编过」到「能真正点起来」，
          差的往往就是这三样——而它们在设备树里的写法每次都要被 bindings 评审来回磨。
    relevance: sensor 驱动的常规工作量就在这里：没有机制创新，但每个平台都要重来一遍，而错一个 GPIO 极性就是一片黑屏。
    link: "https://lore.kernel.org/linux-media/<20261016210246.58562-1-lsa.uz@pm.me>/"

  - type: highlight
    title: "Rockchip VICAP 与 Synopsys CSI2RX 补上灰度格式 Y8 与 Y10"
    meta: "〔10-16 21:47 北京〕· [PATCH 0/3] media: support Y8/GREY and Y10 bus/pixel formats for Rockchip VICAP and Synopsys CSI2RX"
    points:
      - label: 定位
        text: >-
          V4L2 用两层描述数据：<strong>media bus code</strong> 说「线上传的是什么」，<strong>pixel
          format</strong> 说「内存里怎么放」。两者要对得上，链路才能协商成功。
      - label: 做法
        text: >-
          三封信同时给采集端（Rockchip VICAP）和接收端（Synopsys CSI2RX）加上
          <strong>Y8 / GREY</strong>（8 位灰度）与 <strong>Y10</strong>（10 位灰度）两族格式。
          两端一起补，是因为只补一端仍然协商不起来。
      - label: 效益
        text: >-
          不少工业相机与近红外 sensor 输出的是灰度。此前这类 sensor 接到 Rockchip 链路上，格式对不上
          就直接卡在协商阶段。相机链路里「少一格格式」和「少一层 PHY」一样，是硬缺口。
    relevance: 和昨天头条的 C-PHY 是同一种补法——链路缺的往往不是算法，是某一格描述没被定义。
    link: "https://lore.kernel.org/linux-media/<20261016-v4l-y8-y10-csi-vicap-v1-0-27bb87aa745d@cherry.de>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "Rust 的 DRM JobQueue 到 RFC v6：四封信都在修 DmaFence 的生命周期"
    meta: "〔10-16 16:57 北京〕· [RFC PATCH v6 0/5] rust: Add drm::JobQueue"
    points:
      - label: 定位
        text: >-
          <strong>JobQueue</strong> 是把「提交一批 GPU 工作、跟踪它做完」这个模型带进 Rust 侧的
          抽象。它要跟 <strong>DmaFence</strong>（dma-buf 的完成信号，可以跨驱动、跨进程传递）
          配合。
      - label: 做法
        text: >-
          v6 五封信里有四封在改 DmaFence：去掉 <code>static</code> 生命周期、给
          <code>FenceContext</code> 实现 <code>Deref</code>、明确「信号发出后不要 drop」的语义、
          把 <code>call_rcu()</code> 换成 <code>synchronize_rcu()</code>。第五封才加 JobQueue
          本体。
      - label: 效益
        text: >-
          一个 RFC 磨到第六版，改的全是前置的内存模型。这说明 Rust 抽象真正难的地方不是把 C 接口包一层，
          而是把生命周期约束写进类型系统——这些约束在 C 里靠注释和约定，在 Rust 里必须能被编译器检查。
    relevance: 对做 DRM 驱动的人，这条值得跟：JobQueue 一旦定型，以后写 GPU 调度相关代码的方式会跟着变。
    link: "https://lore.kernel.org/linux-media/<20261016085724.1031766-2-phasta@kernel.org>/"

  - type: highlight
    title: "fbcon 旋转字体缓冲，第三版才把时机改对"
    meta: "〔10-16 15:36 北京〕· [PATCH v3 0/3] fbcon: fix rotated font buffer handling on font change"
    points:
      - label: 定位
        text: >-
          <strong>fbcon</strong> 是 framebuffer 控制台。DRM 时代它仍然承担启动阶段和崩溃之后的
          文本输出，屏幕旋转时要把字体位图按旋转角度重建缓冲。
      - label: 做法
        text: >-
          v3 三封信，标题从 v2 的 on font change 到 v3 仍是同一件事，但改动收敛到
          <strong>字体变更时旋转缓冲的重建时机</strong>。
      - label: 效益
        text: >-
          旋转屏幕上换字体不再用错位的字体缓冲。属于平时看不到、一错就整屏花的一类——恰恰因为它出现在
          启动和 panic 之后，用户几乎没有别的通道可看。
    relevance: fbcon 是「图形栈全挂之后你还能看到字」的那条兜底路径。它很少改，改的多半是这类时序问题。
    link: "https://lore.kernel.org/dri-devel/<20261016073023.490430-1-yyaqia@gmail.com>/"

  - type: highlight
    title: "fbdev 热插拔时，别急着把大模式从 connector 里删掉"
    meta: "〔10-16 15:35 北京〕· [PATCH 0/2] drm/client: Keep larger modes in connector->modes on fbdev hotplug"
    points:
      - label: 定位
        text: >-
          <strong>drm/client</strong> 是 DRM 给 fbdev 兼容层用的模式选择逻辑。显示器热插拔后，
          它要把当前模式重新对齐到新接上的设备。
      - label: 做法
        text: >-
          两封信让 drm_client 在 fbdev 热插拔时<strong>保留 <code>connector-&gt;modes</code> 里
          更大的模式</strong>，而不是顺手裁到当前 fbdev 的分辨率。
      - label: 效益
        text: >-
          热插拔后还能切回高分模式。讨论里有 Intel 侧的意见往返——模式列表一旦被裁剪，上层再想恢复就得
          重新探测。
    relevance: 「上层只想要一个够用的值，下层却把整个列表改小了」是内核里反复出现的边界问题，和昨天 mm 那批 VMA 语义收敛是同一类。
    link: "https://lore.kernel.org/dri-devel/<20261015212545.1989962-1-hugo@hsal.es>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "zswap 开始按批压缩：大页切成 8 页一组"
    meta: "〔10-17 05:48 北京〕· [PATCH v1 0/8] Batched zswap_store() with compression batching（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>zswap</strong> 是 swap 前面的压缩缓存层：页面在真正写进 swap 设备之前先被压缩
          留在内存里。它的 <code>zswap_store()</code> 长期是<strong>一次一个 folio</strong> 地调用
          压缩器。
      - label: 做法
        text: >-
          八封信把批处理引入 <code>zswap_store()</code>：对软件压缩器，把一个大 folio 切成
          <code>ZSWAP_MAX_BATCH_SIZE</code>（8 页）一批逐批存储；同时在 <code>crypto/acomp</code>
          侧加通用的批量接口。这一版是 2026-01 那个带 IAA 加速器驱动的 v14 系列里拆出来的通用部分，
          作者换邮箱与公司之后重启。
      - label: 效益
        text: >-
          大 folio 不必再一页一页走压缩器，硬件加速器与软件压缩器都能按批吃。今天的讨论很密（十条往返，
          涉及 Yosry Ahmed、Barry Song、Herbert Xu 等），焦点在批大小怎么定、以及 acomp 的批量 API
          该长什么样。
    relevance: 「把逐项操作改成批量」是 mm 里的高频套路，但每换一层就要重新谈 API 形状——zsmalloc 今天也在做同一件事。
    link: "https://lore.kernel.org/linux-mm/<CAO9r8zO+0h3LLuaFGi6RF02sBYrG71Zf9qMei73UPvRi2onGxg@mail.gmail.com>/"

  - type: highlight
    title: "guest_memfd 的内存可以有多个来源了"
    meta: "〔10-16 18:58 北京〕· [RFC PATCH v2 00/11] mm: Memory providers for guest_memfd and iommufd（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>guest_memfd</strong> 是机密计算（TDX / SEV 这类）给客户机用的、宿主看不见的内存。
          它此前只能来自匿名页这一种来源。
      - label: 做法
        text: >-
          十一封信引入<strong>内存提供者</strong>（memory provider）抽象，让 guest_memfd 的内存
          可以由不同后端提供；配套那一封让 <strong>iommufd</strong> 用大 IOMMU 页做映射，而不是
          一页一页建表。
      - label: 效益
        text: >-
          机密虚机的内存来源与映射效率同时被打开。这是机密计算那条线上比较靠底层的一次抽象——而且
          guest_memfd 正好也是 dma-buf 导出的常见来源，两条线在同一个方向汇合。
    relevance: 和今天的头条是同一片水域：一旦内存可以来自设备或固件，Linux 里的「一页就是一段匿名内存」这个默认假设就要一层层被拆开。
    link: "https://lore.kernel.org/linux-mm/<20261016105752.68015-1-griffoul@gmail.com>/"

  - type: highlight
    title: "kdump 到 v8：同时缩小 vmcore 体积与抓取时间"
    meta: "〔10-16 14:16 北京〕· [PATCH v8 0/8] kdump: reduce vmcore size and capture time"
    points:
      - label: 定位
        text: >-
          <strong>kdump</strong> 是内核崩溃后用第二个内核把现场内存导出成 <strong>vmcore</strong>
          的机制。vmcore 的体积和抓取时间，直接决定线上崩溃后能不能及时留下证据。
      - label: 做法
        text: >-
          八封信同时压缩体积与时间。今天先发了一版 RESEND、随后又发了 v8——同一天两次投递，通常意味着
          维护者那边催过。
      - label: 效益
        text: >-
          机器内存越大，vmcore 越夸张。这类改动不产生新功能，但决定了大机器崩溃后是「三分钟拿到现场」
          还是「半小时还在转」。
    relevance: 和 mm 的 memory-failure 那六封（毒页不进下一次 kexec）是同一条线上的两端：一个负责留住现场，一个负责别把坏页带到下一次启动。
    link: "https://lore.kernel.org/linux-mm/<20261016061549.4181390-1-chenwandun1@gmail.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "本地出向的 TX headroom 变成可配置项"
    meta: "〔10-16 07:54 北京〕· [RFC net-next 0/6] net: configurable extra TX headroom for local egress"
    points:
      - label: 定位
        text: >-
          skb 在发送前要为各层头部预留空间（<strong>headroom</strong>）：隧道封装、硬件标签、
          各种 offload 都要往里塞东西。当前这个预留量是按最大需求写死的。
      - label: 做法
        text: >-
          六封信加 <code>tx_extra_headroom</code> 与 <code>LL_ALLOC_SPACE()</code>，通过
          rtnetlink 的 <code>IFLA_TX_EXTRA_HEADROOM</code> 让管理员配置本地出向额外预留多少。
      - label: 效益
        text: >-
          按需预留，而不是所有场景一律按最坏情况留。讨论里有来自 Amazon、NVIDIA、Mellanox 侧的意见，
          其中一派主张用 skb 元数据而不是全局配置来表达——这条线的形状还没定。
    relevance: 「为最坏情况预留」和「按需分配」是网络栈里反复出现的取舍，headroom 只是最新一处。
    link: "https://lore.kernel.org/netdev/<20261015235335.4162993-1-dkeogh@amazon.com>/"

  - type: highlight
    title: "AF_XDP 零拷贝的 skb head 算错了，越界写 48 字节"
    meta: "〔10-16 19:12 北京〕· [RFC net-next 01/15] xdp: Size zero-copy skb heads by their contents（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>AF_XDP</strong> 零拷贝路径把网络帧直接构建在用户态的 UMEM 页上。
          <code>xdp_build_skb_from_zc()</code> 决定 skb 的 head 区多大——那里要放
          <code>skb_shared_info</code> 等元数据。
      - label: 做法
        text: >-
          原来的代码按 <strong>XSK 帧大小</strong>来定 head 区，于是 2 KiB 的 chunk 里一个 1514
          字节的帧会把 <code>skb_shared_info</code> 覆盖掉 48 字节。修复方案是按
          <strong>headroom + 数据</strong>实际内容定尺寸、精确拷贝、并丢弃 head 放不进一页的帧。
          作者在 QEMU 里用 fbnic 复现，并新增 <code>XDP_PASS_FULL_FRAME</code> 测试覆盖。
      - label: 效益
        text: >-
          一个真正的越界写被拦下。值得一提的是它的来源：<strong>由 AI 代码审查代理发现</strong>，
          修复后配了可复现的测试。
    relevance: 内核里「按最坏情况算尺寸」和「按实际内容算尺寸」的差别，在这里直接变成了内存安全问题——和今天头条里块层拒绝未注册 dma-buf 是同一类边界思维。
    link: "https://lore.kernel.org/netdev/<87y0bx527k.fsf@all.your.base.are.belong.to.us>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "exfat 的 valid_size 竞态到第三版"
    meta: "〔10-16 11:34 北京〕· [PATCH v3 0/8] exfat: fix valid_size update races"
    points:
      - label: 定位
        text: >-
          <strong>exfat</strong> 是 SD 卡与 U 盘上最常见的文件系统。它用
          <code>valid_size</code> 记录一个目录项里已经初始化了多少字节——查找路径和写入路径都会读写它。
      - label: 做法
        text: >-
          八封信修 <code>valid_size</code> 更新过程中的竞态，磨到第三版。
      - label: 效益
        text: >-
          可移动介质上并发访问与突然拔卡最容易暴露这类问题。修好了，目录项不会因为「一半写着、一半读着」而错乱。
    relevance: exfat 是拔插最频繁的介质上的文件系统，这类竞态的代价直接是用户数据。
    link: "https://lore.kernel.org/linux-fsdevel/<20261016033349.3104509-1-chizhiling@163.com>/"

  - type: highlight
    title: "writeback 切换 wb 时的时间戳与脏状态"
    meta: "〔10-16 19:52 北京〕· [PATCH 0/2] writeback: fix timestamp and dirty-state handling in wb switches"
    points:
      - label: 定位
        text: >-
          <strong>writeback</strong> 是后台回写：<code>wb</code> 结构代表一条回写上下文
          （每个块设备、每个 cgroup 都有自己的），页面在它们之间会转移。
      - label: 做法
        text: >-
          两封信修 wb 切换时的时间戳与脏状态处理。
      - label: 效益
        text: >-
          切 cgroup 或切设备之后，脏页不会因为归属换了而漏回写或被重复计时。
    relevance: 「状态跟着对象走」是内核里最容易漏的一类记账——和 exfat 那条一样，错的是账本，不是算法。
    link: "https://lore.kernel.org/linux-fsdevel/<20261016115230.3640770-1-sunjunchao@bytedance.com>/"

  - type: divider
    label: "📰 LSM 安全"
    kind: section
  - type: highlight
    title: "keyring 丢掉了自己的专用数据结构，删掉 1724 行"
    meta: "〔10-17 05:53 北京〕· [RFC PATCH 0/6] KEYS: From assoc_array to rhashtable migration（Jarkko Sakkinen）"
    points:
      - label: 定位
        text: >-
          <strong>assoc_array</strong> 是一个只在内核 keyring 子系统里使用的关联数组实现，专门为
          key 的层级结构设计。它维护成本高、只在一位维护者手里，长期被视为技术债。
      - label: 做法
        text: >-
          六封信把它换成通用的 <strong>rhashtable</strong>：先修几个配额与身份校验的边角问题，再加
          <code>struct keyring_index</code> 与 <code>keyring_is_empty()</code>，最后从
          <code>lib/</code> 里删掉 <code>assoc_array.c</code>（1724 行）及其文档。
      - label: 效益
        text: >-
          内核少一份「只有一个用户、只有一个人懂」的基础设施。作者在封面信里直说动机：
          「As a constant source of LLM attention this must be done.」
    relevance: 这条还有一层值得注意：作者写明系列的起点是<strong>别人用 LLM 生成的代码</strong>，他花一天把它整理成规范补丁，并用另一个模型去找越界 bug。加上今天 AF_XDP 那条由 AI 审查代理发现的越界写——同一天里 AI 在内核开发流程里出现了两次，位置都在「辅助审查」而不是「替代判断」。
    link: "https://lore.kernel.org/linux-security-module/<20261016215326.4110064-1-jarkko@kernel.org>/"

  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "CVE-2026-64017：blk-mq 缓存请求的修复回移植到 6.6.y"
    meta: "〔10-17 02:47 北京〕· [PATCH 6.6.y 0/2] CVE-2026-64017: backport fix series"
    points:
      - label: 定位
        text: >-
          <strong>blk-mq</strong> 的请求缓存：空闲请求被放进 per-CPU 缓存，复用时先尝试从缓存里
          弹一个出来。
      - label: 做法
        text: >-
          两封信分别修「弹出缓存请求时判断是否可用」和「把缓存请求放回链表」，作为
          <strong>CVE-2026-64017</strong> 的修复回移植到 6.6.y 长期稳定分支。
      - label: 效益
        text: >-
          这是会被分发到大量在跑设备上的一条。看到系列名带 CVE 编号 + 具体 stable 版本，就意味着
          上游认定它有安全影响。
    relevance: 长稳分支的回移植是内核维护里最容易被忽视、却离真实部署最近的一环——你手上的板子跑的很可能就是 6.6.y。
    link: "https://lore.kernel.org/linux-block/<20261016184753.27189-1-artem@trailofbits.com>/"

  - type: highlight
    title: "iocost 的成本模型可以被 BPF 接管，到 RFC v10"
    meta: "〔10-17 01:49 北京〕· [RFC PATCH v10 0/4] blk-iocost: add BPF struct_ops cost model support（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>iocost</strong> 是块层的 I/O 成本控制器：给每个 cgroup 分配「预算」，按各设备
          的模型决定一次 I/O 要花多少预算。
      - label: 做法
        text: >-
          四封信用 <strong>BPF struct_ops</strong> 让成本模型可以由 BPF 程序提供，并加了一个
          per-period 汇总的 tracepoint 与 selftest。已经磨到第十版。
      - label: 效益
        text: >-
          成本模型从内核写死变成可替换策略。这类「把策略从内核搬到 BPF」的改动这几年在多个子系统出现，
          代价是接口一旦发布就得长期兼容。
    relevance: 和 sched_ext 是同一条思路的两个落点。留意它们公布的接口形状——那是会被锁死的部分。
    link: "https://lore.kernel.org/linux-block/<d6fb17fccb2338485821141c2ddc3d58@kernel.org>/"

  - type: divider
    label: "📰 arch 架构"
    kind: section
  - type: highlight
    title: "带超时的条件加载到 v16：一次铺到七个地方"
    meta: "〔10-16 15:09 北京〕· [PATCH v16 00/16] barrier: Add smp_cond_load_{relaxed,acquire}_timeout()"
    points:
      - label: 定位
        text: >-
          <code>smp_cond_load_*()</code> 是内核的「自旋等待某个内存位置变成期望值」原语，配合
          <strong>WFE</strong>（ARM 的等待事件指令）能让 CPU 在等待时不空转。它<strong>没有超时</strong>——
          等不到就一直等。
      - label: 做法
        text: >-
          十六封信给它加上 <code>_timeout()</code> 变体，并把改动铺开到七个地方：
          <code>asm-generic</code> 的屏障、arm64 的 <code>WFET</code> 支持与
          <code>usecs_to_cycles()</code>、<code>locking/atomic</code> 的脚本生成的
          <code>atomic_cond_read_*_timeout()</code>、bpf 的 rqspinlock、sched 的定时等待接口、
          cpuidle 的 poll 状态，以及一套针对超时有效性的测试。
      - label: 效益
        text: >-
          自旋等待终于可以说「等到什么时候为止」。已经磨到第 16 版，说明争议不在能不能做，而在
          <strong>接口该怎么长</strong>——这种基础原语一旦发布，全内核都会依赖它。
    relevance: 内核里加原语比加驱动谨慎得多。看一个原语从 v1 磨到 v16 改了哪些地方，就是在看维护者的顾虑清单。
    link: "https://lore.kernel.org/linux-arch/<20261016070837.440748-1-ankur.a.arora@oracle.com>/"

  - type: highlight
    title: "arm64 的 DRTM 启动部分到 v2"
    meta: "〔10-17 00:51 北京〕· [PATCH v2 00/15] arm64: DRTM, boot portion（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>DRTM</strong>（动态可信度量根）是在系统已经启动之后，再建立一次「可信起点」的
          机制：把 CPU 拉进一个受控环境，度量一段固件，然后带着可信记录回到正常世界。
      - label: 做法
        text: >-
          十五封信实现 arm64 侧的启动部分，包括在 EFI stub 里实现 ARM64 DRTM。
      - label: 效益
        text: >-
          arm64 服务器上「启动链的可信起点」多了一条动态路径——对不信任固件的场景，它是可选答案之一。
    relevance: 和 mm 的 guest_memfd 一起看：两条线都在处理「哪些内存与代码是可以被信任的」，只是一个从启动链切入，一个从虚机内存切入。
    link: "https://lore.kernel.org/linux-arch/<20261016165135.GA494690@nvidia.com>/"

  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "ASPM 加了一个「强制打开链路省电」的 API"
    meta: "〔10-17 06:09 北京〕· [PATCH v3 0/8] PCI/ASPM: Add pci_force_enable_link_state() API and convert Atheros drivers"
    points:
      - label: 定位
        text: >-
          <strong>ASPM</strong> 是 PCIe 的链路省电状态管理：让链路在不传数据时进入低功耗状态。
          某些设备会有「必须强制打开某个链路状态，否则功能异常」的怪癖。
      - label: 做法
        text: >-
          八封信加 <code>pci_force_enable_link_state()</code> API，并把 Atheros 相关驱动从
          各自写的私有开关转过来用它。
      - label: 效益
        text: >-
          驱动里的硬件怪癖处理从各写各的，变成走一个统一的、由 PCI 核心负责记录的接口。Bjorn
          Helgaas 今天有回复——这条已经到了维护者逐条看的阶段。
    relevance: 「把驱动里的私有 workaround 收进核心」是 PCI 子系统一直在做的事，收得动的前提是怪癖确实能被抽象成一个 API。
    link: "https://lore.kernel.org/linux-pci/<20261016220900.GA2020355@bhelgaas>/"

  - type: divider
    label: "📰 Rust 与 virtio"
    kind: section
  - type: highlight
    title: "Rust serdev 重构到 v4；顺带把 IIO 的 Rust 抽象推进一步"
    meta: "〔10-17 02:00 北京〕· [PATCH v4 0/4] rust: serdev: Refactor"
    points:
      - label: 定位
        text: >-
          <strong>serdev</strong> 是串口设备总线：给挂在 UART 上的设备（蓝牙、GNSS、传感器）
          提供设备模型。Rust 侧的绑定此前用一把互斥锁加一个 active 标志控制回调。
      - label: 做法
        text: >-
          v4 四封信把它换掉：先在 tty 侧导出暂停 <code>receive_buf</code> 回调的函数，再用
          「暂停接收」替代 <code>active</code> 互斥锁，最后简化回调签名。同一天还有另一条线：
          <code>[RFC PATCH v6 0/4] iio: position: add Rust driver for ams AS5600</code>——为
          Rust 加最小 IIO 子系统抽象，并写一个 AS5600 磁编码器驱动。
      - label: 效益
        text: >-
          Rust 这边正在从「能写驱动」走向「有子系统抽象可用」。IIO 是继平台设备、PCI、USB 之后
          又一个被 Rust 碰到的子系统。
    relevance: 对做相机/传感器链路的人，IIO 的 Rust 抽象值得盯——环境光、位置、温湿度这类配套传感器都走 IIO。
    link: "https://lore.kernel.org/rust-for-linux/<20261016-rust_serdev_probe_refactor-v4-0-46832e034757@posteo.de>/"

  - type: highlight
    title: "virtio-blk 的 inline 加密还在磨"
    meta: "〔10-15 23:46 北京〕· [PATCH v3 0/2] virtio-blk: Add inline encryption support（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>inline 加密</strong>指加密动作由存储设备自己完成，密钥通过标准接口下发，内核
          不做加解密。对虚拟磁盘来说，这意味着要有一条 virtio 侧的通路把密钥交给后端。
      - label: 做法
        text: >-
          v3 两封信加 inline 加密支持与配套的控制 virtqueue。讨论从 10-09 一直延续到今天，
          Qualcomm、NVIDIA、Red Hat 几方在来回。
      - label: 效益
        text: >-
          虚机里的加密盘可以不占宿主机 CPU。virtio-dev 是低频列表，今天只抓到 2 条——所以这里
          出现跨周的长讨论，通常意味着规范层面还没谈拢。
    relevance: virtio 的规范一旦定下就很难改。这类跨厂商拉锯值得作为「规范怎么长出来」的样本看。
    link: "https://lore.kernel.org/virtio-dev/<8c75e5ba-3f9a-4511-9183-4ebedf473a4b@oss.qualcomm.com>/"

  - type: divider
    label: "📰 rt 实时"
    kind: section
  - type: highlight
    title: "RCU CPU stall 警告要报得更清楚，Paul McKenney 亲自来回"
    meta: "〔10-17 01:40 北京〕· Possible enhancement to RCU CPU stall warning messages（讨论）"
    points:
      - label: 定位
        text: >-
          <strong>RCU CPU stall</strong> 是「某个 CPU 在 RCU 宽限期里卡住太久」的警告。它出现时
          往往已经系统级异常，但消息本身给出的线索有限。
      - label: 做法
        text: >-
          讨论围绕给这条警告补充信息：谁在跑、卡在哪、和什么有关。Paul McKenney 与 Red Hat 侧
          来回多轮。
      - label: 效益
        text: >-
          警告信息的价值在于「不用再接调试器就能定位」。RT 场景下 stall 的成因和普通内核不同，
          消息里多一两个字段，排查可能就少几个小时。
    relevance: 这条本身不产代码，但它展示了内核的一种常见改进方式——先把现场描述清楚，再谈修不修。
    link: "https://lore.kernel.org/linux-rt-devel/<20261016134030.6791c1e4@gandalf.local.home>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20261016-x1e-cphy-rfc-v3-0-40a346a72153@gmail.com>/"
        text: "media：C-PHY 继续推进，Qualcomm CSI2 PHY 到 v3（昨天头条那条线的新版本）"
        time: 10-16 22:56
      - link: "https://lore.kernel.org/linux-media/<20261016222513.23355-1-geocausa@gmail.com>/"
        text: "media：imx681 的 C-PHY 支持讨论继续，sensor 侧也要认 C-PHY"
        time: 10-17 06:25
      - link: "https://lore.kernel.org/dri-devel/<20261016-b4-nvkv-v4-0-e8b92b91aa5b@nvidia.com>/"
        text: "DRM：nova-core（Rust 写的 NVIDIA 驱动）加 NVKV 键值编解码，到 v4"
        time: 10-16 09:54
      - link: "https://lore.kernel.org/dri-devel/<20261016-adreno-a620-v1-0-4a7ed6210d7d@brar.si>/"
        text: "DRM：msm/adreno 加 Adreno 620 GPU 支持（4 封）"
        time: 10-16 20:55
      - link: "https://lore.kernel.org/dri-devel/<20261016094638.2958431-1-asif.ikbal@amd.com>/"
        text: "DRM：panel-simple 加 AUO B101UAN01 面板"
        time: 10-16 17:47
      - link: "https://lore.kernel.org/linux-mm/<20261016120927.3191690-1-hongfengchen@xiaomi.com>/"
        text: "mm：zsmalloc 把对象释放攒成 per-cpu 批，RFC v4"
        time: 10-16 20:10
      - link: "https://lore.kernel.org/linux-mm/<20261016-hwpoison-kho-v6-0-f304255147da@debian.org>/"
        text: "mm：memory-failure 让硬件毒页不进入下一次 kexec，v6（7 封）"
        time: 10-16 20:17
      - link: "https://lore.kernel.org/linux-mm/<cover.1792136742.git.zhengqi.arch@bytedance.com>/"
        text: "mm：hugetlb 的 PMD 大页支持从 CMA 分配"
        time: 10-16 18:08

  - type: divider
    label: "📌 机制雷达：5 条跨域改动"
    kind: primary
  - type: toc
    items:
      - label: 缓冲区的类型在扩张
        text: "同一个作者一天之内把 dma-buf 从 iomap 铺到 nvme：fs 侧 4 封给 iomap 加注册守卫与 XFS 支持，块侧 1 封让 blk_rq_map_user_iov() 对 dma-buf 迭代器直接映射 · <a href=\"https://lore.kernel.org/linux-fsdevel/<20261016091919.971295-1-anuj1072538@gmail.com>/\">原文</a>"
      - label: 用通用结构替掉专用实现
        text: "KEYS 用 rhashtable 换掉只为 keyring 存在的 assoc_array，lib/assoc_array.c 的 1724 行与其文档一并删除；作者注明起点是别人用 LLM 生成的代码 · <a href=\"https://lore.kernel.org/linux-security-module/<20261016215326.4110064-1-jarkko@kernel.org>/\">原文</a>"
      - label: 给自旋等待加超时
        text: "smp_cond_load_*_timeout() 到 v16，一次铺到 asm-generic / arm64 WFET / locking-atomic 脚本 / bpf rqspinlock / sched / cpuidle 六处，外加一套超时有效性测试 · <a href=\"https://lore.kernel.org/linux-arch/<20261016070837.440748-1-ankur.a.arora@oracle.com>/\">原文</a>"
      - label: 把逐项改成批量
        text: "zswap 把大 folio 切成 8 页一批压缩并在 crypto/acomp 加批量接口；zsmalloc 把对象释放攒成 per-cpu 批加一个 drain worker —— 内存回收路径同一方向的两次尝试 · <a href=\"https://lore.kernel.org/linux-mm/<CAO9r8zO+0h3LLuaFGi6RF02sBYrG71Zf9qMei73UPvRi2onGxg@mail.gmail.com>/\">原文</a>"
      - label: AI 进入内核的辅助位置
        text: "同一天两例：KEYS 系列的起点是 Linus 转来的 LLM 生成代码（作者花一天整理成规范补丁）；AF_XDP 那个越界写由 AI 代码审查代理发现，修复后配了可复现测试。两处都落在辅助审查，而不是替代判断 · <a href=\"https://lore.kernel.org/netdev/<87y0bx527k.fsf@all.your.base.are.belong.to.us>/\">原文</a>"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: dma-buf
        text: 设备内存的跨驱动句柄。显存、加速器内存、相机与编码器产出都通过它传递，谁拿到句柄谁就能映射使用——不需要知道对方用什么硬件。
      - label: bounce buffer
        text: 中间缓冲。当硬件不能直接读写目标内存（地址或对齐不满足）时，内核先拷进一块能用的缓冲，传完再拷回去。省掉它就是今天头条的全部动机。
      - label: headroom
        text: skb 里数据前面预留的空间。封装协议、硬件标签、offload 都要往里加头，留多少是「按最坏情况」还是「按需」的经典取舍。
      - label: media bus code / pixel format
        text: V4L2 的两层描述。前者说线上传输的格式，后者说内存里的排布。链路两端必须都能说同一种，协商才能通过。
      - label: ISP / VICAP / params / stats
        text: ISP 把 Bayer 原始数据变成图像；VICAP 是 Rockchip 的采集端；params 是用户态下发的参数节点，stats 是 ISP 回传的统计（测光、白平衡）节点。
      - label: assoc_array / rhashtable
        text: 前者是只为 keyring 写的专用关联数组（1724 行，一个用户），后者是内核通用的可扩展哈希表。今天的替换就是「专用实现回归通用设施」。
      - label: smp_cond_load / WFE / WFET
        text: 自旋等待内存值变化的原语。ARM 的 WFE 让 CPU 在等待时进入低功耗，WFET 再带一个超时——今天这批补丁就是给它补上超时。
      - label: zswap / zsmalloc
        text: 都在 swap 路径上。zswap 在写 swap 前先压缩留在内存；zsmalloc 是给压缩页用的分配器，专为「很多大小不一的小对象」设计。
      - label: guest_memfd
        text: 机密计算给客户机用的内存，宿主不可见。此前只能来自匿名页，今天讨论的「内存提供者」是让它支持多种后端来源。
      - label: AF_XDP
        text: XDP 的高速通道。把网络帧直接放进用户态预分配的 UMEM 页，做到零拷贝收发——正因为零拷贝，尺寸算错就是直接踩到别人的内存。
      - label: iocost / struct_ops
        text: iocost 按预算控制每个 cgroup 能用多少 I/O 带宽；struct_ops 是 BPF 替换内核结构体操作集的机制，让「策略」可以从内核搬到 BPF 程序里。
      - label: DRTM
        text: 动态可信度量根。系统已经起来之后，再建立一次可信起点：把 CPU 拉进受控环境、度量固件、带着可信记录回来。
      - label: kdump / vmcore
        text: kdump 是崩溃后用第二个内核导出内存现场，产物叫 vmcore。机器内存越大，这份现场越大、导出越慢。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
