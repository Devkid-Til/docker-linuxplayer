---
title: "Mali GPU 学会分身术：panthor 27 帖硬件虚拟化落地；mm 把最后几个架构的页表释放统一到 RCU"
date: "2026-09-23"
desc: "panthor 27 帖为 Mali v15 加硬件分时虚拟化；mm 删除 RCU 页表释放配置项收官多年工程；IPU6 多流 21 帖到 v3。"
column: "daily"
tags: ["DRM", "mm", "media", "PCI", "net", "block", "sched", "driver-core"]
blocks:
  - type: hook
    text: >-
      今天最有分量的两条都在「收尾一件大事」：<strong>ARM 给 Mali v15 GPU 交出 27 帖硬件虚拟化</strong>——
      显卡从此可以在多个虚拟机之间分时切片；另一头，<strong>Lorenzo Stoakes 把用户态页表释放的 RCU 化推进到收官</strong>，
      最后一个架构特例配置项即将从内核里消失。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-23/cover.png"
    alt: "封面 · 9月23日 · Mali GPU 学会分身术"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "panthor 27 帖：Mali v15 的 16 组访问窗口 + 分时调度器，GPU 硬件级半虚拟化"
      - label: "头条"
        text: "mm 12 帖：所有架构页表释放统一走 RCU，CONFIG_MMU_GATHER_RCU_TABLE_FREE 整体删除"
      - label: "media"
        text: "IPU6 多流/元数据 21 帖到 v3；镜头 VCM 的 runtime PM 要跟随 sensor；gspca 老驱动讨论删除"
      - label: "DRM"
        text: "drm/xe 把「卡死的设备」隔离出硬件访问（v2，15 帖）；nouveau 补齐 HDMI 色深与色彩格式"
      - label: "mm"
        text: "截断跨大 folio 的数据丢失修到 v4；sched/numa 的 VMA 扫描别再挡晋升"
      - label: "PCI"
        text: "PCIe 原生控制权简化到 v14；CXL Type 2 复位 v13"
      - label: "net"
        text: "vxlan 配置全面 RCU 化、无锁 dump（v6，8 帖）；TCP 新拥塞控制 ROCCET 到 v8"
      - label: "机制"
        text: "hw_pte_t 给 PTE 存储立类型、PREEMPT_RT 7.3-rc4-rt1 发布、dma-buf backed bio 评审推进"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-23/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-23 06:23 北京，近 24h 各板块真实计数：net 831 · DRM 363 · mm 328 · fs 171 ·
      PCI 170 · media 147 · Rust 72 · block 70 · arch 64 · LSM 17 · rt 5 · virtio 3。
      net 依旧断层第一但多为驱动修复流；DRM 的 363 里 panthor 27 帖与 nouveau 两条色彩系列是主要推手；
      media 的 147 中 IPU6 的 21 帖系列和 MT8196 JPEG 多核 12 帖占去近四分之一。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "Mali GPU 学会分身术：panthor 27 帖把 v15 的硬件分时变成虚拟化"
    meta: "〔09-23 04:46 北京〕· [PATCH v1 00/27] drm/panthor: Add Mali v15 virtualization support（dri-devel）"
    points:
      - label: 现状
        text: >-
          panthor 是 ARM Mali GPU（CSF 架构这一代）的开源 DRM 驱动。到 Mali v15（Gen5），
          硬件本身就内置了虚拟化的底子：GPU 提供 <b>16 组「访问窗口」（access window, AW）</b>——
          每组是一套独立的任务提交寄存器，GPU 硬件在各窗口之间<b>分时切片</b>轮流执行。
      - label: 痛点
        text: >-
          在此之前，一块 Mali GPU 在内核眼里是一个整体：谁拿到设备谁独占。智能座舱、云端实例这类
          「一块 GPU 要同时伺候多个虚拟机」的场景，软件上没有对应的抽象可挂。
      - label: 方案
        text: >-
          ARM 的 Karunika Choo 把 27 帖切成四段：前 6 帖先解耦——缓存 GPU_ID 解码结果、
          把寄存器偏移收进 HW description，让驱动不再绑死固定寄存器布局；
          7-9 帖补设备树绑定与 v15 基础支持；10-21 帖是核心：<b>AM_SYSTEM 平台驱动 +
          中断驱动的 round-robin 仲裁调度器</b>，通过 AM_PARTITION_CONTROL / AM_RESOURCE_GROUP
          消息管理分区与资源组；最后 6 帖让 panthor 本体「感知分时」——GPU 随时可能被让出（yield），
          驱动要容忍访问窗口中途丢失、复位后不错过清理。
      - label: 为什么
        text: >-
          路线选择是<b>硬件辅助的半虚拟化</b>：不切分物理功能（SR-IOV 那套），而是利用 v15
          原生就有的 16 组寄存器窗口做时间片轮转，软件侧只负责仲裁与调度。代价是驱动必须处处
          「可被让出」——这正是补丁 22-27 全部在处理的事。
      - label: 效益
        text: >-
          车机仪表 + 中控共用一颗 GPU、云桌面实例共享算力这类「一卡多租」场景，从 v15 起有了
          上游可行的路径；panthor 也顺手完成了对固定寄存器布局的解耦，后续新型号接入成本更低。
      - label: 下一步
        text: >-
          RFC 今年 5 月底首发，这是 v1 正式版，重基到 drm-misc-next 并把 AM 消息协议升到 v2。
          发布当晚维护者侧已开始逐帖评审。27 帖的体量意味着会合周期不会短，但方向已经明确。
    verdict: 嵌入式 GPU 虚拟化长期是闭源方案的领地，这是开源栈里少见的一套完整答卷。
    link: https://lore.kernel.org/dri-devel/<20260922204535.2850094-1-karunika.choo@arm.com>/
  - type: headline
    title: "mm 页表释放的 RCU 化收官：所有架构统一语义，配置项整体删除"
    meta: "〔09-22 23:36 北京〕· [PATCH v4 00/12] mm: make userland page table freeing RCU-safe（linux-mm）"
    points:
      - label: 现状
        text: >-
          释放用户态页表页时，多数架构会把真正的释放推迟到 <b>RCU 宽限期</b>结束之后——
          这样无锁遍历页表的读者手里攥着的指针始终指向有效内存。这条路的铺垫已持续数年：
          Hugh Dickins 2023 年的 pte_free_defer()、Qi Zheng 的 x86 转换与多架构改造、
          Lance Yang 把批量分配兜底路径也改成 RCU 安全。
      - label: 痛点
        text: >-
          但仍有少数架构没走完这条路，行为差异靠 CONFIG_MMU_GATHER_RCU_TABLE_FREE 这个配置项区分。
          结果是：内核要为两类架构维护两套语义，「只靠 RCU 保护的无锁页表遍历」在通用代码里
          没法安全地写。
      - label: 方案
        text: >-
          Lorenzo Stoakes 的 12 帖把剩余架构全部转成 RCU 延迟释放，然后<b>整体删除
          CONFIG_MMU_GATHER_RCU_TABLE_FREE</b>——语义从此只有一份。其中一个前置动作值得点名：
          新分配的 PTE 页表先 deposit、旧页表走 RCU free，这个顺序对纯 RCU 遍历者是必要的。
      - label: 为什么
        text: >-
          统一之后，无锁页表遍历成为全架构可用的基础设施：<b>锁竞争更少、没有锁序烦恼</b>，
          还顺手删掉一批架构特例代码。作者明确把功劳归给前序工作——这是典型的「前人铺路、
          最后一帖收官」的内核长线工程。
      - label: 效益
        text: >-
          所有走页表遍历的热路径（fault 处理、各类统计与 introspection）都能以更低锁开销运行；
          对架构维护者来说，少一个配置项就是少一类「为什么这个架构行为不一样」的 bug。
      - label: 下一步
        text: >-
          v4 阶段，剩下的主要是各架构维护者的 ack。同一天的另一个信号也指向同一方向：
          hw_pte_t 系列在给 PTE 的「表内存储」和「软件值」立类型边界（见机制雷达）——
          页本子系统正在把多年的隐性约定逐条显性化。
    verdict: 不值得激动但值得尊敬的一类补丁：删配置项、统一语义，比加功能难得多。
    link: https://lore.kernel.org/linux-mm/<20260922-rcu-pagetable-freeing-v4-0-fe1ad1f1e303@kernel.org>/
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "IPU6 的多流与元数据大改造到 v3：21 帖重构 Intel 相机管线"
    meta: "〔09-22 20:05 北京〕· [PATCH v3 00/21] IPU6 multi-stream and metadata support preparation"
    points:
      - label: 定位
        text: >-
          IPU6 是 Intel 平台的图像处理单元，驱动落在 media 子系统的 CSI-2 接收与流处理层。
          这 21 帖是为「多流并发 + 元数据通道」铺路的前置重构。
      - label: 做法
        text: >-
          核心动作是把<b>流控制下沉到 CSI-2 接收器驱动</b>、流指针的访问用 isys stream_lock 串行化、
          水印（watermark）计算重写并直接从 ipdata 取配置、固件初始化/清理挪进 runtime PM 回调。
      - label: 效益
        text: >-
          笔记本摄像头常见的「主视频流 + 拍照流 + 元数据」并发拓扑，需要这些管线级重构打底。
          作者 Sakari Ailus 是 media 子系统核心维护者，这类系列基本等于官方路线图。
      - label: 下一步
        text: >-
          v3 继续打磨锁与 runtime PM 的边界，元数据支持本体在后续的 Metadata 系列里（v8 也在同步评审）。
    relevance: 你做 camera pipeline 的话，这系列是「多流怎么做并发控制」的官方范本——尤其是流指针加锁和启停时序那几帖。
    link: https://lore.kernel.org/linux-media/<20260922120538.896684-1-sakari.ailus@linux.intel.com>/
  - type: highlight
    title: "镜头 VCM 的 runtime PM 要和 sensor 联动，否则拍着拍着焦点漂了"
    meta: "〔09-23 03:48 北京〕· [PATCH] media: v4l2-async: link ancillary device runtime PM to the sensor's"
    points:
      - label: 定位
        text: >-
          v4l2-async 负责把 sensor 与它的附属设备（镜头音圈马达 VCM、闪光灯）绑定成一条链路——
          绑定只建了 media controller 的拓扑，<b>两者的 runtime PM 状态却各自独立</b>。
      - label: 做法
        text: >-
          问题在于 VCM 是弹簧回位的：维持对焦位置要持续供电，一旦允许它独立 runtime suspend，
          拍摄中途镜片会漂回原点。补丁新增 V4L2_SUBDEV_FL_PM_LINK 标志，
          让附属设备的 runtime PM 跟随所属 sensor。
      - label: 效益
        text: >-
          相机链路上「sensor 醒着、镜头却睡了」这一类隐蔽 bug 有了框架级的解法，
          不用每个驱动自己补。
    relevance: 这就是 camera 链路上最典型的一类坑——拓扑连了、电源没连。你以后接新 VCM/闪光灯驱动时，先查对方有没有挂这个标志。
    link: https://lore.kernel.org/linux-media/<20260922-sensors_pm-v1-1-05adf2098b5e@adishatz.org>/
  - type: highlight
    title: "GMSL2/3 串行器系列 v16 卡在 CI 上：smatch 误报怎么收场"
    meta: "〔09-22 19:17 北京〕· Re: [PATCH v16 00/22] media: i2c: add Maxim GMSL2/3 serializer and deserializer drivers"
    points:
      - label: 定位
        text: >-
          Maxim GMSL2/3 串行/解串器（serdes）驱动系列已到 v16，技术内容基本收敛，
          今天 Sakari Ailus 与 Ricardo Ribalda 讨论的是流程问题：<b>CI 里 smatch 的告警是误报</b>。
      - label: 做法
        text: >-
          告警与 v13 时 Niklas 报告的是同一批，Dan Carpenter 已在 smatch 的 devel 分支修复，
          但修复没进 master，CI 用的还是 master。讨论落在「给 CI 换 devel 分支」还是
          「cherry-pick 那笔修复到 CI 的补丁集」——Ricardo 贴出了 media-ci 的 third_party 补丁目录。
      - label: 效益
        text: >-
          对等待合入的人来说，卡点已从代码本身转移到工具链——这类「绿灯 engineering」
          往往是大系列最后一公里。
    relevance: 你的方向正是 GMSL2 serdes。这个系列一旦合入，就是上游第一个完整的 GMSL2/3 参考实现；眼下它的评审节奏和 CI 治理方式都值得跟。
    link: https://lore.kernel.org/linux-media/<arJjxjiWVlnHhioR@kekkonen.localdomain>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-media/<8d8203ba-a406-4730-9493-dbab8b3ec831@kernel.org>/
        text: "Hans Verkuil 提议直接删除 gspca 老摄像头与 ISA 收音机驱动（RFC）；Laurent Pinchart 不反对，顺势点名更想送走 em28xx"
        time: 09-22 23:37
      - link: https://lore.kernel.org/linux-media/<CAD4i_GQLH2D2OPk+1azN4gZUKiqG0FfTWChTwFa9ki0SBK6dyg@mail.gmail.com>/
        text: "virtio-media v9 评审继续，多轮回复集中在骨架驱动的设备模型细节上"
        time: 09-23 02:37
      - link: https://lore.kernel.org/linux-media/<179009274303.413027.3158173373538711991@kernelci.org>/
        text: "kernelci 报 media-committers/next 构建回归：rc_dev 结构体缺 lirc_dev 成员"
        time: 09-22 23:59
      - link: https://lore.kernel.org/linux-media/<20260922-dma-fence-set-deadline-v2-1-2338d6fac9aa@oss.qualcomm.com>/
        text: "dma-fence v2：fence 已 signaled 也要送达 set_deadline 回调"
        time: 09-23 00:58
      - link: https://lore.kernel.org/linux-media/<20260922091530.241762-1-kyrie.wu@mediatek.com>/
        text: "MT8196 JPEG 编解码多硬件支持到 v17（12 帖）"
        time: 09-22 17:15
      - link: https://lore.kernel.org/linux-media/<20260922-vpu4x_buffer_fix-v1-1-d1b6f1c24285@oss.qualcomm.com>/
        text: "高通 iris 视频驱动两帖修复 VPSS 行缓冲区宽高顺序与旋转场景尺寸"
        time: 09-22 11:24
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "drm/xe：把「卡死的设备」从硬件访问中隔离出去"
    meta: "〔09-22 18:17 北京〕· [PATCH v2 00/15] drm/xe: Isolate wedged devices from hardware access"
    points:
      - label: 定位
        text: >-
          GPU 驱动里的 wedged（卡死）状态指设备已不可用、但驱动对象还在被用户态持有。
          问题出在隔离层：wedged 之后仍可能有路径继续访问硬件寄存器。
      - label: 做法
        text: >-
          15 帖系统地收拢硬件访问入口，让 wedged 设备的所有访问都被挡在统一边界之外，
          而不是每个调用点各自判断。
      - label: 效益
        text: >-
          卡死后的驱动不再可能把硬件推向更糟的状态，恢复与上报路径更可控——
          对 GPU 虚拟化和多租户场景尤其重要。
    relevance: 「失败后的设备该拒绝谁、在哪一层拒绝」是驱动健壮性的通用问题，panthor 头条那套「随时被让出」的处理逻辑与它互为镜像。
    link: https://lore.kernel.org/dri-devel/<20260922101721.1583542-1-arvind.yadav@intel.com>/
  - type: highlight
    title: "nouveau 一口气补齐 HDMI 色彩链路：色深、YCbCr、量化范围"
    meta: "〔09-23 05:53 北京〕· [PATCH 0/6] drm/nouveau: HDMI output colour format and quantization range"
    points:
      - label: 定位
        text: >-
          nouveau 是 NVIDIA 显卡的开源驱动。HDMI 输出侧，色深（30/36/48 bpp 的 deep color）、
          YCbCr 采样格式、RGB 量化范围这三件事长期残缺——它们都在显示输出的「最后一厘米」。
      - label: 做法
        text: >-
          两条系列同一天发出：deep color 3 帖（选择链路色深、GCP 字段编程、状态穿过 NVIF），
          色彩格式 6 帖（NVC57D 输出 CSC 与钳位范围方法、Broadcast RGB 属性、
          GA102 起的 YCbCr 4:2:0、DVI 口也暴露 HDMI 输出属性）。
      - label: 效益
        text: >-
          接高色深显示器或电视时，nouveau 用户终于能选对色彩格式与范围——
          以前这类「画面发灰/过饱和」问题只能换驱动。
    relevance: 显示输出的色彩链路（CSC/量化/色深）是 bridge/connector 层的通用概念，和 camera 链路的像素格式协商是同一个思维模型。
    link: https://lore.kernel.org/dri-devel/<20260922215336.612239-1-Capitain_Jack@yahoo.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/dri-devel/<arJoCiRM1hRbgRb5@sirena.co.uk>/
        text: "linux-next：drm 树合入后构建失败（Mark Brown 报告）"
        time: 09-22 19:35
      - link: https://lore.kernel.org/dri-devel/<cover.1790083445.git.arthur_liberman@hotmail.com>=0A=/
        text: "drm/amd/display：修 MST HPD 与拆链路径的三处空指针解引用"
        time: 09-22 23:51
      - link: https://lore.kernel.org/dri-devel/<20260922100743.447700-1-akash.goel@arm.com>/
        text: "drm/panthor：修 NO_MMAP BO 的处理"
        time: 09-22 18:07
      - link: https://lore.kernel.org/dri-devel/<20260922-v3d-quick-exit-perfmon-serialize-v2-0-2a8021dc32f2@igalia.com>/
        text: "drm/v3d：perfmon 不可观测时跳过串行化（v2）"
        time: 09-22 21:27
      - link: https://lore.kernel.org/dri-devel/<20260922101721.1583542-1-arvind.yadav@intel.com>/
        text: "drm/xe wedge 隔离系列的姊妹线：v11 74 帖 drm/bridge 大重构也在同步评审"
        time: 09-22 18:17
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "截断跨大 folio 的文件会丢数据：修到 v4"
    meta: "〔09-22 19:07 北京〕· [PATCH v4 0/4] mm/truncate: fix data loss when truncating straddling large folios"
    points:
      - label: 定位
        text: >-
          large folio 让一个文件页可能跨越多个逻辑页的范围；当 truncate 的截断点落在
          大 folio 中间时，截断逻辑要处理「部分保留、部分丢弃」的边界。
      - label: 做法
        text: >-
          4 帖修复这个边界场景下的数据丢失。数据丢失类 bug 在 mm 里的优先级天然最高——
          它破坏的是「写进去的数据还在」这条底线。
      - label: 效益
        text: >-
          大 folio 落地越广，这类边界 bug 的影响面越大；在文件系统普遍启用大 folio 之前
          把它修掉，时间点刚好。
    relevance: 做采集落盘时 truncate/落盘边界是常见操作，large folio 的边界行为值得保持关注。
    link: https://lore.kernel.org/linux-mm/<20260922110703.468389-1-yi.zhang@huaweicloud.com>/
  - type: highlight
    title: "sched/numa：别让 VMA 扫描过滤器挡住页晋升"
    meta: "〔09-23 02:29 北京〕· [PATCH v3 0/7] sched/numa: stop VMA scan filters from gating promotion"
    points:
      - label: 定位
        text: >-
          NUMA 自动均衡靠定期扫描 VMA 找热点页、再把页迁移（晋升）到访问它的节点。
          扫描层的过滤器决定「哪些 VMA 值得扫」。
      - label: 做法
        text: >-
          7 帖指出过滤器不该成为晋升的门禁：扫不到不等于不该晋升，两层的判定要解耦。
      - label: 效益
        text: >-
          大内存多节点机器上，热点页迁移的时机更贴近真实访问模式，少一类「该迁不迁」的性能坑。
    relevance: NUMA 均衡是调度与内存的交界层，这类「过滤器和执行者解耦」的论点在任何带扫描/执行两级的子系统里都成立。
    link: https://lore.kernel.org/linux-mm/<20260922182928.2199090-1-gourry@gourry.net>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-mm/<20260921171728.57318b258faaa20e78c81b73@linux-foundation.org>/
        text: "Andrew Morton 发出 7.3-rc5 的 MM hotfixes pull request"
        time: 09-22 01:17
      - link: https://lore.kernel.org/linux-mm/<20260922125015.3435215-1-sunjunchao@bytedance.com>/
        text: "memcg/writeback：外来块设备映射单独回写（v8，3 帖）"
        time: 09-22 20:50
      - link: https://lore.kernel.org/linux-mm/<20260922084256.1515554-1-chenwandun1@gmail.com>/
        text: "kdump：缩小 vmcore 体积与抓取耗时（v7，9 帖）"
        time: 09-22 16:43
      - link: https://lore.kernel.org/linux-mm/<20260922090749.24905-1-lizhe.67@bytedance.com>/
        text: "hugetlb：非共享 PMD 的 MMU notifier 范围收窄（v2）"
        time: 09-22 17:08
  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "PCIe 原生控制权简化到 v14：谁说了算，一笔写清"
    meta: "〔09-23 04:45 北京〕· [PATCH v14 0/4] Simplify PCIe native ownership"
    points:
      - label: 定位
        text: >-
          PCIe 的 AER/热插拔/PME 等特性可以由固件（ACPI _OSC 协商）或内核原生接管，
          「谁拥有控制权」分散在多处判断。这是 PCI 核心层的治理逻辑。
      - label: 做法
        text: >-
          4 帖把 ownership 的判定收敛简化。14 个版本说明这类「看着简单」的收敛，
          难在所有边角平台的行为都不能变。
      - label: 效益
        text: >-
          判定路径越集中，平台兼容性回归越好排查——固件/内核交接出的玄学问题多半源自这里。
    relevance: 你的 GMSL2 链路挂在 PCI 之下时，AER 与热插拔的归属直接影响链路异常时谁来收拾。
    link: https://lore.kernel.org/linux-pci/<20260922204548.3884906-1-sathyanarayanan.kuppuswamy@linux.intel.com>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/linux-pci/<20260922083924.2451158-1-smadhavan@nvidia.com>/
        text: "PCI/CXL：Type 2 设备的 CXL 复位支持到 v13（15 帖）"
        time: 09-22 16:39
      - link: https://lore.kernel.org/linux-pci/<none-7b6286f03965e913bad0e515172ff056ec6f75f8>/
        text: "ACS Enhanced Capability 支持到 v10（6 帖）"
        time: 09-22 23:03
      - link: https://lore.kernel.org/linux-pci/<20260922144629.586997-1-claudiu.beznea@kernel.org>/
        text: "rzg3s-host：PCIe 热插拔支持（v4，8 帖）"
        time: 09-22 22:46
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "vxlan 配置全面 RCU 化：dump 路径不再拿锁"
    meta: "〔09-23 02:11 北京〕· [PATCH v6 net-next 0/8] vxlan: convert configuration to RCU and enable lockless dumps"
    points:
      - label: 定位
        text: >-
          vxlan 是数据中心 Overlay 网络的主力封装；它的配置读取（netlink dump）过去要拿锁，
          大规模场景下 dump 与转发路径会互相踩。
      - label: 做法
        text: >-
          Eric Dumazet 的 8 帖把 vxlan 配置改成 RCU 保护，dump 走无锁路径。
          这是「读多写少的配置表就该 RCU」这条老原则的又一次标准落地。
      - label: 效益
        text: >-
          管控面高频拉取配置时不再干扰数据面；规模越大收益越明显。
    relevance: RCU 化改造是内核里最经典的性能套路之一，这系列可以当现代范本读。
    link: https://lore.kernel.org/netdev/<20260922181102.3989489-1-edumazet@google.com>/
  - type: highlight
    title: "TCP 新拥塞控制 ROCCET 到 v8：又一个站在 BBR 对面的选手"
    meta: "〔09-23 01:20 北京〕· [PATCHv8 net-next] tcp: Add TCP ROCCET congestion control module"
    points:
      - label: 定位
        text: >-
          TCP 拥塞控制是可插拔模块（cubic/BBR 都走这个框架）。ROCCET 是一个新模块提案，
          八个版本说明评审在持续推进。
      - label: 做法
        text: >-
          单帖模块，走标准的 cong_control ops 注册路径。新拥塞控制要回答的核心问题永远是：
          在真实混合流量下比 cubic/BBR 好在哪、坏在哪。
      - label: 效益
        text: >-
          若被接受，用户多一个可按场景切换的选择；不过历史上新 CC 进主线的门槛一直很高。
    relevance: 拥塞控制模块是内核里少见的「纯算法可插拔」接口，想练手内核网络栈，这是边界最清晰的入口之一。
    link: https://lore.kernel.org/netdev/<arK46Rr0cB7gJ7JS@volt-roccet-vm>/
  - type: more
    title: "更多动态"
    items:
      - link: https://lore.kernel.org/netdev/<20260922113719.07315d78@kernel.org>/
        text: "netdev 基金会 TSC 例会与圆桌会议纪要发布（9 月 22 日）"
        time: 09-23 02:37
      - link: https://lore.kernel.org/netdev/<20260922164318.447049-1-achender@kernel.org>/
        text: "net/rds：连接生命周期改为引用计数管理（v6，12 帖）"
        time: 09-23 00:43
      - link: https://lore.kernel.org/netdev/<20260922172028.6269-1-emil@etsalapatis.com>/
        text: "bpf：skb/arena 修复一组（v2，11 帖）"
        time: 09-23 01:20
      - link: https://lore.kernel.org/netdev/<20260922194533.631387-1-joshwash@google.com>/
        text: "gve：一批 XDP 修复（v2，9 帖）"
        time: 09-23 03:45
  - type: divider
    label: "📌 机制雷达：6 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "hw_pte_t"
        text: >-
          给 PTE 立类型边界：<b>表内存储（hw_pte_t）与软件值（pte_t）在类型层面分开</b>，
          编译器从此能拦住「把栈上副本当表项写回」这类错误。v3 共 9 帖，本期不改任何架构行为
          （ARCH_HAS_HW_PTE_T 留给各架构后续 opt-in），arm64 的配套 6 帖同日发出。
          是页本「隐性约定显性化」长线工程的又一块砖。
          <a href="https://lore.kernel.org/linux-mm/<20260922-pte0-v3-0-5670b8cb9059@arm.com>/">原文</a>
      - label: "dma-buf backed bio"
        text: >-
          昨天头条那条 io_uring dma-buf 系列的 block 层底座：Christoph Hellwig 今天开始逐帖评审
          「dma map backed bio 类型」与「nvme-pci dma-buf backed requests」两帖——
          进入核心维护者细审阶段。
          <a href="https://lore.kernel.org/linux-media/<20260922131610.GA30468@lst.de>/">原文</a>
      - label: "PREEMPT_RT"
        text: >-
          v7.3-rc4-rt1 发布——RT 补丁集继续跟随主线 rc 节奏。
          <a href="https://lore.kernel.org/linux-rt-devel/<20260922144152.x2J3_tNz@linutronix.de>/">原文</a>
      - label: "hazptr 共享扫描"
        text: >-
          RFC/WIP 4 帖：给 hazard pointer（无锁编程里的安全回收机制）加共享扫描路径，
          并附 lockdep 用例。属于无锁基础设施层的早期探索。
          <a href="https://lore.kernel.org/linux-arch/<20260922070950.4173245-1-kunwu.chan@gmail.com>/">原文</a>
      - label: "TAINT_FORCED_BIND"
        text: >-
          driver core：用户态手动 bind 驱动到不匹配的设备时给内核打 taint 标记（v4）。
          意义在于事后定位「这个诡异崩溃是不是用户强扭的绑定造成的」。
          <a href="https://lore.kernel.org/lkml/<9bd3a34b-5e98-4038-80d6-da2c3b1948dd@gmx.de>/">原文</a>
      - label: "kallsyms 提速"
        text: >-
          符号名查找加速约 19 倍（v4，4 帖）——受益者是所有走 kallsyms 的调试与追踪路径。
          <a href="https://lore.kernel.org/lkml/<20260922-ksyms-tune-v4-0-92acea84b911@gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "access window（访问窗口）"
        text: >-
          Mali v15 GPU 的硬件虚拟化单元：16 组独立的任务提交寄存器组，每组像一个「窗口」，
          GPU 硬件在各窗口间分时执行——软件看到的虚拟化就是对这些窗口的分配与仲裁。
      - label: "RCU 宽限期"
        text: >-
          RCU（Read-Copy-Update）约定：所有读者都离开临界区之前的这段时间叫宽限期。
          把资源释放推迟到宽限期之后，读者就永远碰不到已释放的内存——本期 mm 头条靠的就是它。
      - label: "wedged（卡死态）"
        text: >-
          GPU 驱动里的术语：设备已判定不可用、停止服务，但驱动对象仍被用户态持有。
          难点在于这个状态下哪些硬件访问该被允许、在哪一层统一拒绝。
      - label: "hazard pointer"
        text: >-
          无锁数据结构的安全回收机制：读者先登记「我正在看这个节点」，回收方扫描登记簿确认
          没人用才真正释放。是 RCU 之外的另一条主流路线，语义更重但实时性更好。
      - label: "runtime PM 联动"
        text: >-
          运行时电源管理通常按设备独立决策；但相机链路里镜头马达这类附属设备的供电语义
          依赖主 sensor——V4L2_SUBDEV_FL_PM_LINK 就是把两者的电源状态绑成一体的机制。
      - label: "large folio"
        text: >-
          内存管理里用单个复合页表示一段连续大区间（替代多个 4K 小页），减少页表项与管理开销。
          代价是「截断点落在大 folio 中间」这类边界场景都要重新审视——本期 mm 栏目就是例子。
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的板块。
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
