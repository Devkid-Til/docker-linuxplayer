---
title: "ext4 十年换新轨，mm 地基双落地，BPF 有了自己的嘴"
date: "2026-08-16"
desc: "本周内核全局：ext4 buffered I/O 32 篇换装 iomap（1MB 写+35%）；per-VMA 锁放开全配置 + scalable COW 地基；BPF 出网双响（bpf_ksock 合入 bpf-next + skb_ext 元数据）；X32 ABI 移除启动。"
column: "weekly"
tags: ["内存管理", "进程调度", "PCI/总线", "架构动向"]
blocks:
  - type: hook
    text: >-
      本周内核全局，三件事最值得记：<strong>ext4 把 buffered I/O 的最后一块 buffer_head 阵地交给了 iomap</strong>（32 篇，1MB 写 +35%）；<strong>mm 的 per-VMA 锁放开全配置、scalable COW 地基落定</strong>；<strong>BPF 第一次有了「自己的嘴」</strong>——bpf_ksock 合入 bpf-next、skb_ext 给 BPF 元数据安家。此外 X32 ABI 移除启动、negative dentry 软锁死被摁住。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-16/cover.png"
    alt: "封面 · 8月17日 · 每周内核雷达"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-16/board-heat-week.png"
    alt: "板块活跃度条形图 · 本周（周一~周日）"
  - type: paragraph
    text: >-
      本周（08-10~08-16，7 天累计）各板块热度：<strong>lkml 7540</strong> · <strong>net 2558</strong> · <strong>DRM 1784</strong> · <strong>mm 1541</strong> · fs 603 · PCI 592 · Rust 423 · media 366 · block 336 · LSM 121 · rt 105 · arch 102 · virtio 1。net 超越 DRM 成为次热板块，BPF/skb 系列贡献显著；virtio 列表极低（规范讨论分散到 lkml/netdev）。
  - type: divider
    label: "💡 本周头条"
    kind: primary
  - type: headline
    title: "ext4 buffered I/O 全面换装 iomap：32 篇拿下最后一块 buffer_head 阵地"
    meta: "〔08-14 17:39 北京〕· [PATCH -next v5 00/32] ext4: use iomap for regular file's buffered I/O path"
    link: "https://lore.kernel.org/linux-fsdevel/<20260814093331.1703882-1-yi.zhang@huaweicloud.com>/"
    points:
      - label: "现状"
        text: "文件系统读写有两条路线：老式 buffer_head（块缓冲）与新式 iomap（映射框架）。xfs / btrfs 已全量 iomap，ext4 直写已迁完，但走 page cache 的常规 buffered I/O 还留在 buffer_head + 传统写回路径上——这是 ext4 最后的旧阵地。"
      - label: "方案"
        text: "32 篇 v5：把 ext4 buffered 读 / 写 / 写回 / mmap 全部迁到 iomap；data=ordered 的锁序与 iomap 冲突，改为按 inode 走 iomap + append 写分配 unwritten extent + DISKSIZE_GROW_PENDING 位延迟 i_disksize 更新。"
      - label: "为什么"
        text: "data=ordered 的「folio 锁→事务锁」顺序与 iomap 相反，硬迁会死锁，所以按 inode 切换并用 unwritten extent 保证崩溃安全；在线 defrag 暂不支持留给未来。"
      - label: "效益"
        text: "FIO 实测 1MB 块写 +35%、64k +9%；写回按长度分配减过度分配；ext4 与现代 I/O 栈彻底对齐。"
      - label: "下一步"
        text: "挂载开关默认 off 先跑，xfstests 无新增失败；后续逐步默认开启并移除 dioread_nolock 旧开关。"
    verdict: "全宇宙用得最多的文件系统，把十年旧栈换成了新轨"
  - type: headline
    title: "mm 地基双落地：per-VMA 锁放开全配置 + scalable COW 的匿名索引"
    meta: "〔08-14〕linux-mm · 两个系列：per-VMA locks v6 + MAP_PRIVATE anon pgoff v5"
    link: "https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/"
    points:
      - label: "per-VMA 锁"
        text: "把 VMA 粒度读锁从「部分架构可用」改成全配置可用（其依赖的 RCU / maple tree / 引用计数本就不挑 SMP/MMU）；新增 vma_start_read_unlocked() 让 binder / TCP 扔掉 mmap_lock 回退，全局锁竞争下降。"
      - label: "scalable COW 地基"
        text: "给 VMA 引入「匿名页偏移」，让 MAP_PRIVATE 文件映射 CoW 出的匿名 folio 按匿名偏移索引（与纯匿名一致），消除偏移冲突、让 maple tree 快速路径走得上。"
      - label: "为什么重要"
        text: "两件事都是「把地基夯实」型：一把锁全配置化换代码干净 + 锁竞争双赢；一张索引重绘让 scalable COW 的快速路径终于能跑。"
      - label: "下一步"
        text: "per-VMA 锁等 ack/review；anon pgoff v5 已收敛，scalable COW 本体继续推进。"
    verdict: "mm 层少见的低风险高收益组合——今天的地基比楼房多"
  - type: headline
    title: "BPF 有了自己的嘴：bpf_ksock 合入 bpf-next，skb_ext 给元数据安家"
    meta: "〔08-16〕netdev · bpf_ksock v7 + skb extension for BPF metadata 00/14"
    link: "https://lore.kernel.org/netdev/<20260813110540.103550-1-mahe.tardy@gmail.com>/"
    points:
      - label: "bpf_ksock"
        text: "一组新 kfunc 让 BPF 程序自己创建 UDP socket 发数据——安全告警 / 遥测不再依赖用户态 agent（agent 挂 = 断流）。Daniel Borkmann 已合入 bpf-next，7.3 合入主线可期。"
      - label: "skb_ext 元数据"
        text: "Cloudflare 14 篇：新增 SKB_EXT_BPF 扩展类型 + bpf_dynptr_from_skb_ext，BPF 元数据能跨隧道 / 命名空间存活（scrub 不掉件）；生产实测会带元数据的 skb <1%（~0.7%），开销可接受。"
      - label: "为什么重要"
        text: "BPF 第一次有了不经过用户态的对外通道；元数据终于有官方「行李架」——Tetragon 想免常驻 agent、Meta 想替换 ringbuffer 日志。"
    verdict: "BPF 从「只能看」到「能说」——可观测与安全的边界又扩了一层"
  - type: divider
    label: "📰 各板块分章"
    kind: primary
  - type: highlight
    title: "mm：大 folio 迁移 rmap 批量遍历（+44%）"
    meta: "linux-mm · PATCH v2 0/7"
    link: "https://lore.kernel.org/linux-mm/<20260813-migrate-rmap-batch-v2-0-3c5424c555c7@amd.com>/"
    points:
      - label: "定位"
        text: "mm/rmap 迁移路径：1M folio 迁移要逐 base page 走 256 次 × 2 遍 rmap。"
      - label: "做法"
        text: "v2 对映射同一 folio 的连续 PTE 做批量 walk，AMD EPYC Zen3 实测 1M folio 迁移吞吐 +44%。"
      - label: "效益"
        text: "延续 folio 化后清除「逐页假设」的趋势，迁移 / 规整热路径受益。"
    relevance: "内存迁移 / 碎片整理负载可关注。"
  - type: highlight
    title: "mm：hot page tracking（pghot）引热议 + MGLRU 加频率引导"
    meta: "linux-mm · RFC/讨论"
    link: "https://lore.kernel.org/linux-mm/<20260804-mglru-fg-v1-0-4d8dad39dad6@tencent.com>/"
    points:
      - label: "pghot"
        text: "AMD 的 hot page tracking 系列本周因 Gregory Price 大规模生产用例回复而热议——分层内存迁移的访问记录来源。"
      - label: "MGLRU-FG"
        text: "Kairui Song 的 RFC 15 篇：给 MGLRU 加访问频率引导，让同代内高频页更被当作工作集保住。"
    relevance: "关注回收 / 分层内存的同学可参与 RFC。"
  - type: highlight
    title: "fs：negative dentry 18 篇治软锁死（Neil Brown）"
    meta: "linux-fsdevel · PATCH RFC/RFT v2 00/18"
    link: "https://lore.kernel.org/linux-fsdevel/<20260815042707.2535717-1-neilb@ownmail.net>/"
    points:
      - label: "定位"
        text: "路径查找失败缓存的「负目录项」海量堆积时，父目录 refcount 可能被数十亿子项顶到溢出、目录遍历可能软锁死。"
      - label: "做法"
        text: "18 篇只挑 easy bits：公共迭代器教它 drop 锁 + 按需调度 + 游标续走；不再经 ->d_parent 计引用；libfs/autofs/coda/nfs 统一新迭代器。"
      - label: "效益"
        text: "目录级 soft lockup 消除、refcount 溢出风险清零；RFT 请求测试验证。"
    relevance: "VFS 地基稳定性，文件系统负载均可关注。"
  - type: highlight
    title: "fs：fs-verity 落定 XFS + ext4 系列配套"
    meta: "linux-fsdevel · PATCH v15 00/25 + ext4 iomap"
    link: "https://lore.kernel.org/linux-fsdevel/<20260814092448.1818082-1-aalbersh@kernel.org>/"
    points:
      - label: "fs-verity on XFS"
        text: "XFS 是主流大文件系统里最后一个没原生 fs-verity 的；v15 把 Merkle 树块放进 post-EOF 空间（免改 on-disk 布局），收尾启用 ro-compat 标志。"
      - label: "配套"
        text: "btrfs 放开 idmapped 挂载下的 DEFRAG ioctl（容器场景）；O_DSYNC 直写在 FUA 设备上不再做多余 flush。"
    relevance: "安全 / 完整性 + 容器化文件系统场景。"
  - type: highlight
    title: "net：devmem 收包 rx-page-size 放开 + 邻居表 netns 隔离"
    meta: "netdev · PATCH"
    link: "https://lore.kernel.org/netdev/<5276bb00-388b-4d44-ab02-022fd8119b55@blackwall.org>/"
    points:
      - label: "devmem"
        text: "net core 通用 dmabuf/devmem 绑定级新增 NETDEV_A_DMABUF_RX_BUF_SIZE，rx-page-size 可大于 PAGE_SIZE，已合入 net-next（mlx5e 等受益）。"
      - label: "邻居表隔离"
        text: "ARP 表 / ND 邻居表按网络命名空间隔离（15 篇），多租户 / 容器网络状态隔离。"
    relevance: "做高速收包 / 容器网络的同学可关注。"
  - type: highlight
    title: "DRM：panel_bridge 全覆盖 + nouveau 默认 atomic"
    meta: "dri-devel · PATCH 00/11 + RESEND v7"
    link: "https://lore.kernel.org/dri-devel/<20260814-drm-bridge-every-panel-v1-0-19cd5277cc8d@bootlin.com>/"
    points:
      - label: "panel_bridge"
        text: "每个 panel 驱动创建时自动包装出 panel_bridge，接入标准 bridge 框架——全量 bridge hotplug 长线工程的一环。"
      - label: "nouveau atomic"
        text: "NV50+ 默认启用 atomic modesetting（NV04 保持原样、<NV50 强制关），老卡用户跟上现代 KMS 栈。"
      - label: "配套"
        text: "YUV→RGB 转换 colorop 补齐色彩管线最大缺口；drm/tyr（Rust 驱动）上 GPU 复位基础设施。"
    relevance: "显示栈 / 面板开发 / 新 N 卡用户。"
  - type: highlight
    title: "PCI：CXL Type-2 直通 + endpoint DMA（27+10 篇）"
    meta: "linux-pci · PATCH v4 + v7"
    link: "https://lore.kernel.org/linux-pci/<20260813093631.2288172-1-mhonap@nvidia.com>/"
    points:
      - label: "CXL Type-2"
        text: "27 篇 vfio/cxl：把 CXL Type-2 加速器整体透传给 guest，虚拟化 CXL DVSEC、陷阱 HDM decoder——CXL 从存储走向计算的关键。"
      - label: "EP DMA"
        text: "10 篇：PCIe endpoint 补上 DMA 能力（dmaengine 静态通道 ID + dw-edma 委托），endpoint 不再只靠寄存器 / 中断交互。"
    relevance: "CXL / 虚拟化直通 / 高性能 EP 场景。"
  - type: highlight
    title: "media：frame descriptors 重构 v2 + 虚拟媒体设备 v7"
    meta: "linux-media · PATCH v2 00/17 + v7 0/4"
    link: "https://lore.kernel.org/linux-media/<20260813180026.2636879-1-briandaniels@google.com>/"
    points:
      - label: "frame descriptors"
        text: "Sakari 的 17 篇把 subdev frame descriptor 改为动态分配 + v4l2_subdev_get_frame_desc() 收敛校验，机制级 API 定型讨论中。"
      - label: "virtio-media"
        text: "v7 4 篇：virtio 之上的 V4L2 relay 驱动（刻意不用 VB2），虚拟摄像头 / 编解码器有统一通道。"
      - label: "编码 ROI"
        text: "iris 编码器新增 ROI 控件（delta QP），关键区域给高质量。"
    relevance: "虚拟化媒体 / 视频编码 / 传感器栈。"
  - type: highlight
    title: "block：zoned 离线/只读 zone 统一（v5 13 篇）+ Rust workqueue"
    meta: "linux-block · PATCH v5 00/13"
    link: "https://lore.kernel.org/linux-block/<20260814134750.2100304-1-dlemoal@kernel.org>/"
    points:
      - label: "zoned"
        text: "Damien 13 篇统一离线 / 只读 zone 的识别与状态机（为存储单元退化 depopulation 铺路），zoned 设备稳定性提升。"
      - label: "Rust workqueue"
        text: "Danilo 的 OwnedQueue / ScopedQueue / ScopedWork——Rust workqueue 绑定扩展，允许驱动创建自己的队列。"
    relevance: "SMR / zoned 存储 + 内核 Rust 驱动开发。"
  - type: highlight
    title: "LSM：skb secmark 换 xarray 索引（7 篇）"
    meta: "linux-security-module · PATCH 0/7"
    link: "https://lore.kernel.org/linux-security-module/<20260813204854.19211-1-casey@schaufler-ca.com>/"
    points:
      - label: "定位"
        text: "skb 的 secmark 是 32 位整数，多个 LSM 共享语义空间会冲突。"
      - label: "做法"
        text: "新增两个操作 struct lsm_prop 的 hook，SELinux / Smack / AppArmor 适配，secmark 改为 xarray 索引。"
      - label: "效益"
        text: "摆脱定宽整数语义困局，为多 LSM 并存铺路。"
    relevance: "安全子系统 / 多 LSM 架构。"
  - type: highlight
    title: "arch：X32 ABI 移除启动 + LoongArch BPF 栈回溯"
    meta: "linux-arch · PATCH v3 0/2 + 机制级"
    link: "https://lore.kernel.org/linux-arch/<20260813045306.21571-1-yangtiezhu@loongson.cn>/"
    points:
      - label: "X32 移除"
        text: "x86 32 位兼容 ABI（X86_X32_ABI）移除第一步（v3 0/2）——x86 compat 层瘦身的开始，影响面大。"
      - label: "LoongArch"
        text: "补 BPF 栈回溯钩子（Loongson-3A6000 实测），一个 arch 钩子打通一整个框架能力。"
    relevance: "架构兼容层维护者 / LoongArch / x86 用户。"
  - type: highlight
    title: "sched：RT_PUSH_IPI 回归 + CFS LB_PROMOTE + EEVDF 修复"
    meta: "sched · REGRESSION + PATCH"
    link: "https://lore.kernel.org/lkml/<CAEB5A_91hob8ddOhW=PrO1=O7GrFmSxY3r1-_Ard6x8KHHuJGA@mail.gmail.com>/"
    points:
      - label: "RT 回归"
        text: "NO_RT_PUSH_IPI（为避 softirq 活锁默认关闭）引发专业音频负载数秒级 PI 饥饿（实测丢音），绕行 echo RT_PUSH_IPI，预计会推补丁回炉。"
      - label: "CFS"
        text: "LB_PROMOTE 系列 10 篇：newly idle 尽力迁移、active balance 放宽，提升 CFS 延迟敏感任务响应。"
      - label: "EEVDF"
        text: "flat hierarchy 修复（update_curr 顺序）+ pick_eevdf() 去重，已推 tip。"
    relevance: "RT / 音频实时负载 + 调度器动态。"
  - type: highlight
    title: "virtio：DRIVER_OK 合规修复 + 块内联加密"
    meta: "virtio-dev · PATCH"
    link: "https://lore.kernel.org/virtio-dev/<20260814142306.3934029-1-linlin.zhang@oss.qualcomm.com>/"
    points:
      - label: "DRIVER_OK"
        text: "virtio_scsi / virtio-spi / misc:nsm 批量修「DRIVER_OK 前就绪」规范合规问题。"
      - label: "块内联加密"
        text: "virtio-blk 加内联加密支持，把加解密下放到设备 / 控制器，guest 全盘加密性能提升、密钥不暴露给 guest CPU。"
    relevance: "虚拟化 / 云存储安全。"
  - type: divider
    label: "📌 机制雷达：跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "ext4 → iomap"
        text: "32 篇把 ext4 缓冲 I/O 全量迁到 iomap，1MB 写 +35% · <a href=\"https://lore.kernel.org/linux-fsdevel/<20260814093331.1703882-1-yi.zhang@huaweicloud.com>/\">原文</a>"
      - label: "per-VMA 锁全配置"
        text: "VMA 级读锁从部分配置变全配置，binder / TCP 扔 mmap_lock 回退 · <a href=\"https://lore.kernel.org/linux-mm/<20260813193433.3318288-1-surenb@google.com>/\">原文</a>"
      - label: "匿名 pgoff"
        text: "MAP_PRIVATE 匿名 folio 改按匿名偏移索引，scalable COW 地基 · <a href=\"https://lore.kernel.org/linux-mm/<20260813-b4-scalable-cow-virt-pgoff-v5-0-c21581c0c3c8@kernel.org>/\">原文</a>"
      - label: "skb_ext BPF"
        text: "SKB_EXT_BPF 让 BPF 元数据跨隧道存活，scrub 不掉件 · <a href=\"https://lore.kernel.org/netdev/<20260814-bpf-meta-inside-skb-ext-v1-0-767edd862656@cloudflare.com>/\">原文</a>"
      - label: "skb secmark → xarray"
        text: "网络包安全标记换可扩展索引，多 LSM 语义解耦 · <a href=\"https://lore.kernel.org/linux-security-module/<20260813204854.19211-1-casey@schaufler-ca.com>/\">原文</a>"
      - label: "panel_bridge 全覆盖"
        text: "所有 panel 自动包装 panel_bridge，bridge hotplug 长线工程 · <a href=\"https://lore.kernel.org/dri-devel/<20260814-drm-bridge-every-panel-v1-0-19cd5277cc8d@bootlin.com>/\">原文</a>"
      - label: "X32 ABI 移除"
        text: "x86 32 位兼容 ABI 移除第一步，compat 层瘦身 · <a href=\"https://lore.kernel.org/lkml/<20260813-x32_removal-v3-0-e8f96cd15478@linutronix.de>/\">原文</a>"
  - type: divider
    label: "🧭 合入状态（三镜像反查）"
    kind: section
  - type: paragraph
    text: >-
      对本周报道的 10 个关键补丁批量反查本地三镜像（mainline / linux-next / stable）：<strong>全部未合入 mainline、不在 linux-next 队列、未回移植 stable</strong>——符合本周补丁集中在 review / 排队期的规律（7.3 merge window 未到）。唯一例外是 <strong>bpf_ksock 已合入 bpf/bpf-next</strong>（Daniel Borkmann），但那是独立维护者树、非主线，7.3 合入主线可期。未命中不排除被后续版本取代 / mid 改动，如 b4 风格 mid 部分无法反查，如实标注。
  - type: divider
    label: "📰 LWN 本周"
    kind: section
  - type: toc
    items:
      - label: "BPF"
        text: "BPF, continuous testing, and stable kernels · https://lwn.net/Articles/1087823/"
      - label: "架构"
        text: "128-Bit page tables for Arm · https://lwn.net/Articles/1088125/"
      - label: "块层"
        text: "Block-layer error injection · https://lwn.net/Articles/1086344/"
      - label: "虚拟化"
        text: "KVM planes head for takeoff · https://lwn.net/Articles/1087590/"
      - label: "BPF"
        text: "Even more formal verification for BPF · https://lwn.net/Articles/1087069/"
      - label: "BPF"
        text: "Bringing BPF to binfmt_misc · https://lwn.net/Articles/1086947/"
      - label: "BPF"
        text: "Examining other network namespaces using BPF · https://lwn.net/Articles/1085896/"
      - label: "FUSE"
        text: "FUSE status and plans · https://lwn.net/Articles/1086336/"
      - label: "进程"
        text: "The beginning of a process-builder API · https://lwn.net/Articles/1086330/"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "iomap"
        text: "现代文件系统 I/O 映射框架，XFS / btrfs 已全量使用，正取代 buffer_head"
      - label: "buffer_head"
        text: "老式块缓冲描述结构，ext4 传统 buffered I/O 的最后依赖"
      - label: "per-VMA lock"
        text: "VMA 粒度读锁（RCU + maple tree），可替代 mmap_lock 的热路径加锁"
      - label: "scalable COW"
        text: "面向深 fork 的写时复制优化，靠 VMA 在 maple tree 快速定位"
      - label: "skb_ext"
        text: "网络包 skb 的按需扩展槽，可跨隧道 / 命名空间存活"
      - label: "kfunc"
        text: "允许 BPF 程序直接调用的内核导出函数，bpf_ksock 即一组 kfunc"
      - label: "negative dentry"
        text: "路径查找失败后缓存的「不存在」目录项；海量堆积会引引用溢出 / 遍历锁死"
      - label: "panel_bridge"
        text: "DRM 面板与显示链路之间的桥接对象，本次改为每个 panel 自动创建"
      - label: "fs-verity"
        text: "文件系统级逐文件完整性校验（Merkle 树），XFS 本周收编"
      - label: "X32 ABI"
        text: "x86 上以 64 位内核跑 32 位 ABI 的兼容模式，本次开始移除"
  - type: closing
    tagline: "ext4 十年换轨、mm 地基双落地、BPF 有了自己的嘴——这一周的地基比楼房多。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· LWN · 三镜像反查"
---
