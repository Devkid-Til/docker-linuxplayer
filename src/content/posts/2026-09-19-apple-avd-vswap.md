---
title: "苹果视频解码器进内核：14 帖点亮 M1/M2/M3 四种编码；swap 第一次可以不占磁盘"
date: "2026-09-19"
desc: "Apple AVD 解码器上游化：14 帖、1.2 万行，支持 H.264/HEVC/VP9/AV1；Virtual Swap Space v5：zswap 不再需要预分配 swapfile；PCI 学会跨 kexec 保住设备。"
column: "daily"
tags: ["media", "mm", "PCI", "DRM", "arch", "fs", "LSM"]
blocks:
  - type: hook
    text: >-
      今天两个头条一个是「新硬件」、一个是「老地基」：<strong>Apple Silicon 的 AVD 视频解码器正式投稿上游</strong>，
      14 帖、1.2 万行，H.264/HEVC/VP9/AV1 一次配齐，全靠逆向工程；<strong>Virtual Swap Space 发到 v5</strong>，
      swap 条目第一次可以没有物理槽位——zswap 用户从此不用预分配 swapfile。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-19/cover.png"
    alt: "封面 · 9月19日 · 苹果解码器进内核 · swap 免磁盘"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "苹果 AVD 视频解码器进内核：逆向多年，14 帖一次点亮四种编码"
      - label: "头条"
        text: "Virtual Swap Space v5：swap 条目第一次可以不占物理槽位"
      - label: "media"
        text: "VD55G0 全局快门传感器：Surface Pro 9 的 IR 人脸识别有着落了"
      - label: "media"
        text: "RK3588 的 JPEG 解码器独立成驱动，第 4 版"
      - label: "mm"
        text: "mTHP 不再被 PMD 大页「连坐」；shmem 也能 collapse 了"
      - label: "PCI"
        text: "跨 kexec 保住 PCI 设备：Live Update 核心支持到 v9"
      - label: "PCI"
        text: "PCIe 6.0 的 Flit Logging 第一次进内核"
      - label: "DRM"
        text: "atomic 新增 RESET 标志：显示管线一键回到出厂状态"
      - label: "arch"
        text: "arm64 终于有了可靠的栈回溯：sframe unwinder 第 7 版"
      - label: "fs"
        text: "XFS 的 fs-verity 第 16 版；link(2) 被举报违反 POSIX"
      - label: "机制"
        text: "Landlock 修 tracepoint 上下文、iocost 成本模型可插拔、sched_ext 修 cmask"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-19/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-19 06:23 北京，近 24h 各板块真实计数：net 565 · mm 453 · DRM 299 · media 219 · fs 185 ·
      PCI 161 · block 63 · LSM 47 · Rust 27 · arch 27 · rt 21 · virtio 0（低频列表，本窗口按最近 20 条计）。
      mm 的高位来自 vswap、mTHP 两个大系列和围绕它们的长讨论串；media 则是 AVD、VD55G0 两个新驱动系列同时落地。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "苹果 AVD 视频解码器进内核：逆向多年，14 帖一次点亮 H.264/HEVC/VP9/AV1"
    meta: "〔09-18 21:15 北京〕· [PATCH 00/14] media: apple: add avd driver（linux-media）"
    points:
      - label: 现状
        text: >-
          Apple Silicon（M1/M2/M3）上有一块自研的视频解码器 AVD（Apple Video Decoder），Asahi Linux 社区逆向多年，
          一直只活在下游树里。上游内核的 Apple 平台因此一直没有硬件视频解码——看片全靠 CPU 软解。
      - label: 痛点
        text: >-
          AVD 这块 IP 的编程方式非常不常规：不是「一个参数一个寄存器」，而是只有<b>一个寄存器</b>，所有「指令」按序写入，
          写快了硬件就跟不上。块内还带一颗 Cortex-M3 协处理器，只收无签名代码——目前它只负责解码配置和转发中断，
          但它是拿到「解码完成」中断的唯一途径。
      - label: 方案
        text: >-
          14 帖把指令先攒成「段」列表，由共享函数按硬件节奏逐段下发。驱动实现 V4L2 M2M 无状态解码 API
          （stateless decoder：用户态负责解析码流参数，硬件只做熵解码和重建），框架大量借鉴 rkvdec。
          1.2 万行新增里近 4700 行是 AV1 的熵模式表。四种编码各一帖，外加 P210 像素格式和 7 代 SoC
          （t8103/t8112/t8122/t600x/t602x/t6030/t6031）的设备树节点。
      - label: 为什么
        text: >-
          选 stateless 而不是 stateful，是因为现代编解码（VP9/AV1）的参考帧管理太复杂，固件黑盒很难做对；
          把状态机留在用户态（GStreamer/FFmpeg），内核只当「加速器」。这也是 rkvdec、vivaldi 以来 media
          社区对解码器的主流答案。
      - label: 效益
        text: >-
          v4l2-compliance 49 项全过；fluster 跑分：HEVC 143/147、AV1 238/242、VP9 216/305、H.264 77/135
          （未支持的流没被拒，拉低了分数，依赖 apple-dart 的一个 IOMMU 复位补丁）。所有编码支持 8/10 bit
          的 4:2:0 与 4:2:2，输出 NV12/NV16/P010/P210；4:4:4 与 12 bit 暂未支持。
      - label: 下一步
        text: >-
          作者已在下游树测过大部分 Apple SoC，预期 M4/M5/M6 和 Neo 都能工作（M6 外的固件已在写）。
          参考帧用的苹果私有压缩 tile 格式「Interchange」的 DRM modifier 已另发补丁，用于和 GPU、显示控制器
          共享缓冲区——零拷贝显示是下一程。
    verdict: >-
      逆向工程到上游驱动，这条链路（社区逆向 → 下游验证 → 上游投稿）已经是 Apple 平台的固定节奏。
      对写解码器驱动的人，这份代码是「stateless 解码 + 单寄存器怪硬件」的稀有样本。
    link: "https://lore.kernel.org/linux-media/20260918-avd-v1-0-49977931f455@icloud.com/"
  - type: headline
    title: "Virtual Swap Space v5：swap 条目第一次可以不占物理槽位，zswap 不再需要 swapfile"
    meta: "〔09-19 02:02 北京〕· [PATCH v5 00/11] Virtual Swap Space (Swap Table Edition)（linux-mm）"
    points:
      - label: 现状
        text: >-
          匿名页被换出时，内核在交换设备上分配一个物理槽位，把这个槽位编号写进页表项——它既是找回数据的「钥匙」，
          又是 swap cache、memcg 记账的索引。swap 只是磁盘空间、swapoff 很少发生的年代，这个设计又快又省。
      - label: 痛点
        text: >-
          zswap（内存压缩交换）普及后矛盾暴露了：一个被压进内存、<b>永远不会落盘</b>的页，照样占一个物理槽位。
          Meta 的机器按内存的 25–50% 配 swapfile，全机群大部分都白白浪费；手机、嵌入式这种给不出磁盘做 swap
          的设备，只能退而用 zram，于是写回、cgroup 记账、THP 支持要在两套后端里各做一遍。
      - label: 方案
        text: >-
          把 swap 条目「虚拟化」：开机建一个 vswap 设备，可被 zswap 接收的匿名页换出时拿的是虚拟槽位，
          后端（zswap 条目 / 物理槽位 / 无）按需挂接，记录在每个集群的 virtual_table 里（8 字节/槽，
          低 3 位编码类型）。集群按需动态分配、挂进 xarray——swap 空间第一次可以「用到才长」。
          物理槽上的指针标记项充当 rmap（物理 → 虚拟的反向查找）。
      - label: 为什么
        text: >-
          后端切换的同步直接复用现有机制（swap cache + folio lock），不发明新锁；虚拟条目与直映射物理条目
          并存为一等公民，老路径不受影响。最后一帖（RFC）还把集群索引从 xarray 换成 xswap 作者设计的
          VM_SPARSE vmalloc 数组，证明「数据结构」和「设备模型」是可分离的。
      - label: 效益
        text: >-
          Meta 生产负载 A/B 实验（swapfile = 50% 内存）：请求吞吐持平，服务延迟降 1–3%，PSI 主动回收
          能回收更多内存。三个 microbenchmark 里 buildkernel 之类时间差在 ±7% 内，方向偏负但幅度不大；
          zswap-only 用户几乎没有额外空间开销（zswap 的 xarray 被合并进了 vswap 集群）。
      - label: 下一步
        text: >-
          v5 已去掉 RFC 标签、rebase 到 mm-unstable：OVERCOMMIT_GUESS 为无 swapfile 的 zswap 用法放宽到
          3 倍内存；vswap swapfile 上限定在 8TB 避免 memcg id 引用计数饱和。Johannes Weiner 在逐轮跟审——
          这条线离 mm-unstable 越来越近了。
    verdict: >-
      和 9 月 14 日报道的 xswap（swap 设备自动伸缩）是同一个方向的两条路：都在回答「swap 不该等于一块
      预先切好的磁盘」。v5 的亮点是拿出了 Meta 的生产数据，且第 11 帖直接演示两个方案的数据结构可以互换。
    link: "https://lore.kernel.org/linux-mm/20260918180241.3424851-1-nphamcs@gmail.com/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "VD55G0 全局快门传感器：Surface Pro 9 的 IR 人脸识别有着落了"
    meta: "〔09-19 06:17〕· [PATCH v2 00/11] media: i2c: st-vd55g1: Genericize driver and add VD55G0 support"
    points:
      - label: 定位
        text: >-
          ST 的 VD55G1 驱动原本只服务一个型号。VD55G0 是该家族的全局快门单色传感器（644×604），
          用在 Surface Pro 9 等设备上做 IR 人脸识别，寄存器映射和后代不同、不支持 HDR、
          还要求限制曝光占空比来控制补光灯电流。
      - label: 做法
        text: >-
          不重开驱动，而是把原驱动「泛化」：传感器型号/版本/特性抽象出来，寄存器全部走间接寻址封装
          （业务逻辑不再碰裸 CCI 地址），固件补丁内置进驱动不再外部加载；同时给 ipu-bridge、int3472
          （x86 平台的 sensor 供电/GPIO 桥）接上这颗料。
      - label: 效益
        text: >-
          Surface Pro 9（Intel IPU6 平台）实测配合 libcamera 0.7.0 工作。11 帖按逻辑步骤拆分，方便二分。
    relevance: "sensor 驱动「同家族多型号」的标准打法：特性表 + 寄存器间接层，值得 camera 方向的人对照看。"
    link: "https://lore.kernel.org/linux-media/20260918221705.323510-1-pm@petermarshall.ca/"
  - type: highlight
    title: "RK3588 的 JPEG 解码器独立成驱动：第 4 版，已收到两轮实质评审"
    meta: "〔09-18 14:07〕· [PATCH v4 0/4] media: rockchip: Add JPEG decoder driver"
    points:
      - label: 定位
        text: >-
          Rockchip 自研的 JPEG 解码 IP，集成在 RK3588、RK3568 等 SoC 上。早期版本曾塞进 Hantro 驱动里投稿，
          被证明是错的抽象——Hantro 是视频编解码器，JPEG 解码器的寄存器模型和流程都对不上。
      - label: 做法
        text: >-
          拆成独立驱动重来：v4 修 fmt_lock 下的 source change 标志、中断处理里查 runtime PM 状态、
          灰度 chroma 填充前后加 dma-buf CPU 访问同步；配套设备树节点挂进 rk3588-base 和 rk356x-base。
      - label: 效益
        text: >-
          RK3588 板子上实测，RK3568 报告也可用。走 V4L2 M2M 无状态解码路径，和用户态的常规流水线兼容。
    relevance: "RK3588 又一块媒体 IP 上游化——和之前在跟的 ISP、rkvdec 是同一张拼图。"
    link: "https://lore.kernel.org/linux-media/20260918-rockchip-jpegdec-v4-0-0dd97df47abb@pengutronix.de/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "mTHP 不再被 PMD 大页「连坐」：没有 PMD 的 CPU 也能用小尺寸透明大页"
    meta: "〔09-18 09:46〕· [PATCH v8 00/14] mm: thp: always enable mTHP support"
    points:
      - label: 定位
        text: >-
          现在 if 架构的 has_transparent_hugepage() 返回假（CPU 不支持 PMD 尺寸大页），THP 会被整体关掉——
          连 16K/64K 这类小尺寸 mTHP（multi-size THP）也一起陪葬。这个 helper 名字说「是否启用 THP」，
          实际查的是「CPU 有没有 PMD 大页」，语义混了多年。
      - label: 做法
        text: >-
          拆成两个语义明确的检查：THP 可用性看 IS_ENABLED(CONFIG_TRANSPARENT_HUGEPAGE)，
          PMD 大页支持走新 helper pgtable_has_pmd_leaves()（可在快路径用）。s390/powerpc/mips/x86
          的架构实现移出 CONFIG  guard 并改名 arch_has_pmd_leaves()。
      - label: 效益
        text: >-
          没有 PMD 大页的平台从此能用 mTHP 的中小尺寸；/sys/kernel/mm/transparent_hugepage 和
          hpage_pmd_size 在这些平台上也会正确出现。有 PMD 的平台行为不变。
    relevance: "「一个语义含混的 helper 污染整个子系统」的典型清理——和昨天 VM_SPECIAL 的拆解是同一类工程。"
    link: "https://lore.kernel.org/linux-mm/cover.1789695931.git.luizcap@redhat.com/"
  - type: highlight
    title: "shmem 也能 collapse 成 mTHP 了：khugepaged 学会按位图挑最划算的阶"
    meta: "〔09-18 11:58〕· [PATCH 00/12] add shmem mTHP collapse support"
    points:
      - label: 定位
        text: >-
          khugepaged 的 mTHP collapse（把零散小页合并成大页）此前只覆盖匿名页；shmem（tmpfs/共享内存）
          只能 collapse 成 PMD 尺寸一种，粒度太粗。
      - label: 做法
        text: >-
          复用匿名 mTHP 的框架：扫 PMD 范围时用位图记录在册页，扫完按位图算出「性价比最高」的 mTHP 阶再动手。
          前 8 帖是清理与准备，9–11 帖是 shmem 支持本体，第 12 帖补 selftests。
      - label: 效益
        text: >-
          tmpfs/共享内存负载的页表占用和 TLB 压力下降；文件页的大阶 collapse 作者明确先不做，
          留待社区讨论是否有必要。
    relevance: "mTHP 落地路线图的又一块：匿名 → shmem →（待定）文件页。"
    link: "https://lore.kernel.org/linux-mm/cover.1789701677.git.baolin.wang@linux.alibaba.com/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "跨 kexec 保住 PCI 设备：Live Update 核心支持发到 v9"
    meta: "〔09-19 04:06〕· [PATCH v9 00/13] PCI: liveupdate: PCI core support for Live Update"
    points:
      - label: 定位
        text: >-
          云厂商换宿主内核靠 kexec，但 kexec 瞬间所有 PCI 设备被重置——挂给虚机的 VFIO 设备一断，
          虚机跟着遭殃。Live Update 的目标是设备在整个内核替换过程中不停机、不丢状态。
      - label: 做法
        text: >-
          基于 Kexec Handover（KHO，跨 kexec 传递内核状态的框架）：PCI core 注册 FLB（文件生命周期绑定）
          handler 跟踪「被保留」设备；上游桥自动连带保留并加引用计数；总线号、ARI Forwarding、
          ACS 标志跨重启继承，保证 RequesterID 与 DMA 路由不变；shutdown 路径对保留设备不关 bus mastering，
          DMA 在 kexec 全程不中断。
      - label: 效益
        text: >-
          VFIO 场景下虚机可以「无感」跨过宿主内核升级。本版不含 P2P 与 VF 保留（后续系列）；
          附完整文档说清 PCI core、驱动、用户态三方各自的责任边界。
    relevance: "热升级的战场从「进程」打到「设备」——KHO 生态开始长出子系统级的用户了。"
    link: "https://lore.kernel.org/linux-pci/20260918200640.887030-1-dmatlack@google.com/"
  - type: highlight
    title: "PCIe 6.0 的 Flit Logging 第一次进内核"
    meta: "〔09-18 22:56〕· [PATCH v2 00/10] PCIe Flit Logging Ext Capability Support"
    points:
      - label: 定位
        text: >-
          PCIe 6.0 起链路以 Flit（固定大小的流控单元）为单位传输，Flit 错误是新一代链路层的诊断入口；
          内核此前对这个扩展能力（Extended Capability）完全没有支持。
      - label: 做法
        text: >-
          前 4 帖先修 AER sysfs 的旧账（负 ratelimit 钳位、单位改毫秒、AER 不可用时藏目录）；
          中间 2 帖把 portdrv 的服务掩码收拢；后 4 帖新增 flit.c（511 行）：登记能力、
          加 trace 事件、限流日志、sysfs 暴露错误计数控制。
      - label: 效益
        text: >-
          PCIe 6.0 链路的 Flit 级错误第一次能在内核里观测与计数；v2 主要处理 Sashiko（AI 评审）
          的反馈并补了 sysfs 控制面。
    relevance: "新总线特性的标准接法：先修旧 sysfs 债，再上新能力，trace + sysfs 双出口。"
    link: "https://lore.kernel.org/linux-pci/20260918145619.3016889-1-yazen.ghannam@amd.com/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "atomic 新增 RESET 标志：显示管线一键回到「出厂状态」"
    meta: "〔09-18 22:18〕· [PATCH v4 00/13] drm: Add DRM_MODE_ATOMIC_RESET flag"
    points:
      - label: 定位
        text: >-
          合成器（compositor）想把显示管线拉回已知基线时，只能把每个 KMS 对象的每个属性显式设回默认值——
          得自己跟踪有哪些属性、默认值各是什么，内核每加一个属性，用户态就得跟着改，非常脆。
      - label: 做法
        text: >-
          atomic ioctl 新增 DRM_MODE_ATOMIC_RESET：置位后内核先把所有 KMS 对象填上默认状态，
          再应用请求里显式给的属性；没给的属性就停在默认值。用户态从此「声明式」描述想要的终态。
          系列主体是把各 drm_atomic_get_*_state() 里的状态插入逻辑抽成独立 helper
          （默认值路径走 atomic_create_state 而非 duplicate，老函数复用不了）。
      - label: 效益
        text: >-
          Mutter 已有可用的实现分支，vkms 加了驱动私有属性专门做测试，IGT 用例也随贴附上。
          前提是所有驱动实现 atomic_create_state——转换还在进行中（正是 9 月 17 日报道的那波重构）。
    relevance: "用户态 ABI 加新标志的教科书姿势：语义清晰、测试先行、依赖的重构单独立项。"
    link: "https://lore.kernel.org/dri-devel/20260918-drm-reset-state-flag-v4-0-5ad106370f05@kernel.org/"
  - type: divider
    label: "📰 arch"
    kind: section
  - type: highlight
    title: "arm64 终于有了可靠的栈回溯：sframe unwinder 第 7 版"
    meta: "〔09-19 06:42〕· [PATCH v7 00/11] unwind, arm64: add sframe unwinder for kernel"
    points:
      - label: 定位
        text: >-
          x86 的可靠栈回溯靠 ORC unwinder（objtool 在构建期生成展开表）；arm64 没有 objtool 支持，
          异常边界（中断、异常入口）上的栈回溯一直不可靠——live patching、可靠栈检查都受影响。
      - label: 做法
        text: >-
          借道 SFrame（binutils 2.46 起的轻量展开格式，V3）：内核编译时带 -fasynchronous-unwind-tables
          生成 .sframe 段，内核内置一个 SFrame 查找库做展开，模块也支持。v7 起不再依赖用户态 sframe
          系列，直接从 v7.3-rc3 套用，并按 Sashiko 的评审修了 CFI 标注、CONFIG_MODULES=n 构建等问题。
      - label: 效益
        text: >-
          arm64 第一次有能力跨异常边界做 reliable stacktrace；与未来的用户态 sframe unwinder
          共享定义与算法的门也留着。
    relevance: "栈回溯是调试与 live patch 的地基——arm64 这块短板在被系统性补上。"
    link: "https://lore.kernel.org/lkml/20260918224157.1471085-1-dylanbhatch@google.com/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "XFS 的 fs-verity 第 16 版：Merkle 树放到 EOF 之后"
    meta: "〔09-18 19:15〕· [PATCH v16 00/21] fs-verity support for XFS with post EOF merkle tree"
    points:
      - label: 定位
        text: >-
          fs-verity（只读文件的 Merkle 树完整性校验）此前只有 ext4/f2fs/btrfs 等支持，XFS 一直缺位；
          难点在于 XFS 把 Merkle 树放在文件 EOF 之后，写路径、iomap、direct I/O 全要跟着适配。
      - label: 做法
        text: >-
          21 帖基于 block/for-next（依赖 lazy-bounce 系列）；v16 的主要变化是新增
          xfs_fsverity_ioend_cache 专用 kmem cache，不再往 iomap 的 ioend 结构里塞 work_struct。
          明确禁止 fs-verity 密封的 inode 开 DAX，direct read 路径对 verity 文件整体关闭。
      - label: 效益
        text: >-
          配套 xfsprogs 与 xfstests 分支同步在维护；距可合入又近一版，12–14 帖还在等 review。
    relevance: "一个特性在一个成熟文件系统里迭代 16 版——文件系统特性的评审成本可见一斑。"
    link: "https://lore.kernel.org/linux-fsdevel/20260918111539.1003439-1-aalbersh@kernel.org/"
  - type: highlight
    title: "link(2) 被举报不原子：和 unlink(2) 并发时违反 POSIX"
    meta: "〔09-19 03:24〕· [BUG] link(2) is not atomic with respect to unlink(2), violating POSIX XSH 2.9.7"
    points:
      - label: 定位
        text: >-
          POSIX XSH 2.9.7 要求 link() 相对 unlink() 是原子的：要么看到旧链接、要么看到新链接。
          报告者给出复现：两者并发时存在窗口，能观察到规范不允许的中间状态。
      - label: 做法
        text: >-
          目前还是 bug 报告阶段（无补丁），在 linux-fsdevel 上讨论——VFS 层的链接/解除链接
          各拿各的锁，原子性需要目录项层重新设计。
      - label: 效益
        text: >-
          影响的是「把 link/unlink 当原子重命名原语用」的用户态程序（部分邮件/队列软件有此假设）。
    relevance: "VFS 并发语义的深水区——这类 bug 一旦坐实，修法往往要动目录项锁。"
    link: "https://lore.kernel.org/linux-fsdevel/CACnTLT0f2jjDW-=Yk6mJcYU6XX8b9jkf6jFA0iU9GHyB-KG0fg@mail.gmail.com/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/20260918220743.2043647-1-d01.devel@gmail.com/"
        text: "media: em28xx 两帖——非隔行源补全帧、StarTech SVID2USB23 音频采集修复"
        time: "09-19 06:07"
      - link: "https://lore.kernel.org/linux-media/aq0siVcghDe6x9cs@stanley.mountain/"
        text: "media: uvcvideo 修 uvc_mapping_get_menu_value() 缓冲区溢出，当日已两轮 review"
        time: "09-18 20:20"
      - link: "https://lore.kernel.org/linux-media/20260918-upstream-it6625-follow-up-patch-v1-0-78d72d7886a5@ite.com.tw/"
        text: "media: it6625（HDMI 接收桥）21 帖清理：改用 subdev active state 集中管理，Sakari 逐帖跟审"
        time: "09-18 16:57"
      - link: "https://lore.kernel.org/dri-devel/CAPM=9tyHWoVvi75xn2duuoMm=MMux5fmBSx=UjbNkPAvbZZ3Nw@mail.gmail.com/"
        text: "DRM: 7.3-rc4 修复 PR 发出，drm-xe-next 与 drm-misc-fixes 同日合流"
        time: "09-19 06:17"
      - link: "https://lore.kernel.org/dri-devel/20260918-fp6-panel-v2-0-6695c4008920@fairphone.com/"
        text: "DRM: Fairphone 6 的 Novatek NT37705 面板驱动 v2（4 帖）"
        time: "09-18 22:40"
      - link: "https://lore.kernel.org/netdev/20260918-net-next-mptcp-msg_errqueue-v1-0-dd77e1738248@kernel.org/"
        text: "net: MPTCP 支持 MSG_ERRQUEUE（4 帖），父 socket 也能收错误队列"
        time: "09-19 02:38"
      - link: "https://lore.kernel.org/lkml/20260918193937.569414-1-zide.chen@intel.com/"
        text: "KVM: x86 PMU 硬件 Topdown 指标支持发到 v9（12 帖）"
        time: "09-19 03:49"
      - link: "https://lore.kernel.org/lkml/20260918215154.2481482-1-tchiu@tenstorrent.com/"
        text: "arch: RISC-V 优化 Vector 模式切换延迟（v6·8 帖，Tenstorrent）"
        time: "09-19 05:53"
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "Landlock 修 tracepoint"
        text: >-
          Landlock 的策略判定 tracepoint 的上下文与契约文档对不上（v1·9 帖）：修正定宽类型名、
          rule tracepoint 的上下文，并把契约文档改到与实现一致——审计/安全观测工具依赖的就是这些钩子。
          <a href="https://lore.kernel.org/linux-security-module/20260918185036.608651-1-mic@digikod.net/">原文</a>
      - label: "iocost 成本模型可插拔"
        text: >-
          blk-iocost 的 BPF struct_ops 成本模型到 v6（5 帖）：磁盘定价从内核硬编码变成 BPF 程序可替换，
          9 月 15 日报道过的「112 倍定价偏差」证据就是这套的动机。
          <a href="https://lore.kernel.org/linux-block/20260918055001.1273840-1-cui.tao@linux.dev/">原文</a>
      - label: "sched_ext 修 cmask"
        text: >-
          sched_ext 进 7.3 修复分支：cid 形式的 ops.enable() 第一次调用时拿不到初始 cpumask，
          v2 单帖补上——BPF 调度器初始化路径的实际 bug。
          <a href="https://lore.kernel.org/lkml/2f0eb5c762d55edba5365f1006dbb395@kernel.org/">原文</a>
      - label: "proc 读 vma 加锁"
        text: >-
          /proc/pid/smaps_rollup 改到 per-vma lock 下读（v5·7 帖），并附 tearing 自检——
          proc 读数与 mmap 写并发时的撕裂问题有了锁方案。
          <a href="https://lore.kernel.org/linux-mm/20260918153318.758387-1-surenb@google.com/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "stateless 解码器"
        text: "V4L2 解码器的一种形态：用户态解析码流参数、喂给硬件只做熵解码与重建，状态机不进内核；VP9/AV1 时代的主流选择。"
      - label: "fluster"
        text: "GStreamer 社区的解码器一致性测试套件，用标准测试向量给实现打分（如 HEVC 143/147）。"
      - label: "zswap"
        text: "内存压缩交换：换出的页先压缩存内存池，装不下或回写时才落盘；vswap 让它第一次可以脱离 swapfile 存在。"
      - label: "KHO（Kexec Handover）"
        text: "跨 kexec 传递内核状态的框架：旧内核把选定的内存与状态「交接」给新内核，Live Update 的设备保留就建立在它之上。"
      - label: "Flit"
        text: "PCIe 6.0 起的链路传输单元（固定大小、带 FEC）；Flit Logging 是诊断链路错误的扩展能力。"
      - label: "SFrame"
        text: "binutils 2.46 引入的轻量栈展开格式（Simple Frame），比 .eh_frame 简单，目标是低开销的可靠栈回溯。"
      - label: "fs-verity"
        text: "只读文件的完整性保护：按 Merkle 树哈希，读时逐块校验；Android 验证启动、容器镜像都用它。"
      - label: "mTHP"
        text: "multi-size THP：透明大页不再只有 PMD 一种尺寸，16K/64K 等小阶也能匿名/共享内存合并。"
      - label: "khugepaged"
        text: "后台内核线程，定期扫描地址空间，把零散的合格小页 collapse 成大页。"
  - type: closing
    tagline: "如果对你有用，点个赞。"
    source: "数据来源：lore.kernel.org（全内核 12 列表）· 北京时间"
---
