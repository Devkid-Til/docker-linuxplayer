---
title: "AI 补丁洪流撞上维护者：netdev 两个月禁投令；Linus 要 hazard pointers「先给我看钱」"
date: "2026-09-20"
desc: "125 帖补丁一天涌入 13 个列表，netdev 下两个月禁投令；hazard pointers 28 帖被 Linus 要求拿真实收益。"
column: "daily"
tags: ["net", "mm", "media", "DRM", "PCI", "fs", "block", "sched"]
blocks:
  - type: hook
    text: >-
      今天的 Linux 内核邮件列表上，两件事撞在一起：一边是 <strong>125 帖补丁</strong>
      在 24 小时内涌进 13 个列表，netdev 维护者 Jakub Kicinski 挑中一帖回了句「现在停止发补丁」，
      并开出<strong>两个月禁投令</strong>；另一边，<strong>hazard pointers 的 28 帖系列</strong>被 Linus
      用一句「Show me the money」挡在门外——他不反对机制，他要一条真实路径的转换。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-20/cover.png"
    alt: "封面 · 9月20日 · AI 补丁潮撞上维护者"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "一天 125 帖补丁涌入 13 个列表，netdev 开出两个月禁投令"
      - label: "头条"
        text: "hazard pointers 28 帖：Linus 要真实用户，不要微基准"
      - label: "media"
        text: "V4L2 维护者：这像是 LLM 生成的、完全错误的修法"
      - label: "mm"
        text: "40 帖重构给 VMA 标志去歧义；虚拟化 swap 在争「一次合多少」"
      - label: "DRM"
        text: "Nova 的 BAR1 必须可选：维护者的 SPARK 上只有 BAR0"
      - label: "net"
        text: "RK3568 的 XPCS/SGMII 支持发到 v8，11 帖"
      - label: "PCI"
        text: "PCIe 原生所有权简化到 v13；NXP S32G SerDes 12 帖 RFC"
      - label: "机制"
        text: "hrtimer_sleeper 数据竞争 12 帖、block 新增 run_todo()、iocost 成本模型可插拔"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-20/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-20 06:46 北京，近 24h 各板块真实计数：net 292 · mm 136 · fs 77 · media 43 · DRM 40 ·
      PCI 40 · arch 15 · Rust 15 · block 14 · LSM 13 · rt 7 · virtio 0（virtio-dev 是低频列表，本窗口按最近
      20 条计，24h 内无新帖）。net 一家占了三分之一，其中 45 帖来自今天头条里那条扫荡式投稿；mm 的高位
      则来自 hazptr 与 40 帖 VMA 重构两条长线。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "一天 125 帖补丁涌入内核邮件列表，netdev 维护者开出两个月禁投令"
    meta: "〔09-20 06:26 北京〕· Re: [PATCH] ipmr: validate IPv4 header length in reg_vif_xmit()（netdev）"
    points:
      - label: 现状
        text: >-
          内核补丁走邮件列表评审：作者投稿 → 维护者逐条 review → 作者改版重投。这条流水线的瓶颈从来不是「写」，
          而是「审」——维护者的时间是最稀缺的资源，社区不成文的规矩是「一次投稿聚焦一个改动、先消化上一轮反馈」。
      - label: 痛点
        text: >-
          9 月 19 日这一天，Hui Peng 一个账号在 13 个列表投出 125 帖补丁，覆盖
          netdev、遗留文件系统（minix / qnx4 / omfs / hpfs / romfs /
          hfs / jfs / adfs / udf / bfs / ufs / befs / isofs…）、DRM 小驱动、binder、蓝牙、USB。
          风格高度一致：一帖里塞三四个互不相关的边界检查修复。其中一部分明确标注了
          <b>Assisted-by: LLM</b>——Jakub 回复的那帖就带着它。光是 netdev 一个列表就被灌进约 40 帖。
      - label: 方案
        text: >-
          netdev 维护者 Jakub Kicinski 挑了一帖回复：<b>「Stop sending patches right now..」</b>——
          先等已投补丁的反馈再发别的；允许发 revision（新版本），但「因为你一次性倾倒 40 帖、违反社区规范」，
          未来两个月不得再投任何新的网络补丁。邮件签名一行：<b>pv-ban: 2mo</b>。
      - label: 为什么
        text: >-
          这批补丁里个别修复可能真的指出了问题，但把它们「审出来」的成本被完整转嫁给了维护者——
          而维护者无法用「不审」来对抗，因为漏掉一个真 bug 的责任在他这边。这正是 AI 生成补丁的核心矛盾：
          写补丁的边际成本降到接近零，评审的边际成本一点没降。
      - label: 效益
        text: >-
          这句话划了一条线：AI 可以帮你写补丁，但不能把邮件列表当成吞吐量指标。同一个 24 小时里，
          media 维护者 Laurent Pinchart 的回复更直白——他把一份 subdev 竞态修复判为「这像是 LLM 生成的、
          完全错误的修法」，并要求作者「不带 LLM、自己真的把它想清楚」。
      - label: 下一步
        text: >-
          内核社区还没有成文的 AI 投稿规则，处理方式仍是维护者个案裁量。想长期参与的人，
          把「补丁数量」换成「一条能被合入的改动」，是这次事件给出的最实际建议。
    verdict: >-
      值得注意的不是封禁本身，而是 24 小时内两个互不相干的子系统、两位维护者做出了方向一致的判断——
      这比任何一条成文的 AI 政策都更能说明当前的默认态度。
    link: "https://lore.kernel.org/netdev/<20260919152635.77563149@kernel.org>/"
  - type: headline
    title: "hazard pointers 28 帖系列：Linus 说「我要看到真实收益」，不是微基准"
    meta: "〔09-19 08:01 北京·讨论持续至 09-20 02:18〕· [PATCH 01/28] hazptr: Implement Hazard Pointers（linux-mm）"
    points:
      - label: 现状
        text: >-
          RCU 是内核无锁读的基石：读侧几乎零开销，代价是回收要等一个宽限期（grace period）——
          必须确认所有读者都已离开临界区，才能释放对象。这个模型撑起了内核里绝大多数高频只读路径。
      - label: 痛点
        text: >-
          有些场景对象数量大、生命周期短，等一个宽限期再回收意味着内存被无谓地占住；内核为此在局部
          叠了各种变通。hazard pointers 是学术界给出的另一条路：读者显式「挂」一个指针表示自己正在用，
          回收者只在没人挂时立刻释放，不需要宽限期。
      - label: 方案
        text: >-
          Mathieu Desnoyers 的 28 帖系列把 hazptr 做成内核 API（include/linux/hazptr.h + kernel/hazptr.c）：
          每 CPU 4 个静态 hazard 槽走快路径，用户另备一个栈上槽作兜底；调度器在上下文切换时把 per-CPU 槽
          迁到备份槽，保证被阻塞或被抢占的任务不会长期霸占槽位。Paul McKenney 联署。
      - label: 为什么
        text: >-
          Linus 的取舍写得很清楚——他不反对机制本身，反对的是「只有测 hazard pointers 自己的微基准」。
          「一场循环十亿次、热缓存里什么都不干的负载」在他眼里比无关更糟，因为它有误导性。
          <b>他要的是一条真实内核路径的转换 + 可测量的收益</b>，并点名 dcache：如果能转、还有真实提升，
          他就买单；「不是驱动、不是测试模块，要真代码」。
      - label: 效益
        text: >-
          如果落地，受益的是所有需要「快回收 + 无锁读」的路径。但在此之前，这条线缺的不是实现，是证据——
          系列本身只有 5 个文件、444 行新增，真正的工程量在「找一个愿意被转换的核心用户」。
      - label: 下一步
        text: >-
          讨论已经持续了几年。Linus 的话等于给出验收条件：谁能拿出一个核心路径的转换案例和数字，
          谁就能推动它进主线；拿不出来，它就继续停在讨论里。
    verdict: >-
      这是内核里少见的「机制已经写好、评审标准却由收益定义」的场景——技术上的优雅不构成合并理由。
      这一点值得每个想投稿的人记住：在内核，「漂亮」永远排在「有用」后面。
    link: "https://lore.kernel.org/linux-mm/<20260919000056.3132131-1-paulmck@kernel.org>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "V4L2 维护者把一份 subdev 竞态修复判为「LLM 生成的完全错误的修法」"
    meta: "〔09-20 01:02 北京〕· [PATCH] media: v4l2-subdev: fix NULL deref in subdev_open() racing with unbind（linux-media）"
    points:
      - label: 定位
        text: >-
          v4l2-core 的设备节点打开路径。subdev_open() 会解引用 sd->v4l2_dev->mdev 和 entity 上的
          mdev->dev->driver->owner，但 v4l2_open() 只检查节点是否还注册着；而
          v4l2_device_unregister_subdev() 是在注销 devnode <b>之前</b>就把 sd->v4l2_dev 和 entity 的 mdev
          清空的——窗口就在这两步之间。
      - label: 做法
        text: >-
          syzbot 报的 GPF（16 个线程打开 /dev/v4l-subdevN，撞上一个线程反复做 vimc bind/unbind）。
          补丁在打开时把 entity 的 mdev 快照一次、NULL 当作「没有 media device」，并在 device_lock() 下
          取驱动模块引用，驱动已走就返回 -ENODEV。
      - label: 效益或下一步
        text: >-
          Laurent Pinchart 的判断是：快照只缩小了窗口，sd 仍可能在 mdev 检查之后、internal_ops->open()
          之前被注销，所以这个修法「完全错误」。他要求作者不带 LLM 自己把问题想清楚再谈修法，
          候选方向是让 v4l2_device_unregister_subdev() 先注销 devnode、并使 open 与 unregister 互斥。
    relevance: >-
      你天天打交道的 v4l2-subdev 打开路径，正是「驱动 unbind 与用户态 open 并发」类竞态的高发区——
      这条线程给了一个可以直接对照的失败样本，也示范了维护者会怎么驳回一个看似合理的修法。
    link: "https://lore.kernel.org/linux-media/<20260919171754.GF1124359@killaraus.ideasonboard.com>/"
  - type: highlight
    title: "virtio-media 骨架驱动到 v9：虚拟机里的摄像头有标准通道了"
    meta: "〔09-20 03:52 北京〕· [PATCH v9 1/4] media: virtio: Add skeleton virtio-media driver（linux-media）"
    points:
      - label: 定位
        text: >-
          virtio 家族的 media 侧缺位。virtio 已经把块设备、网卡、GPU、输入设备虚拟化了，
          但虚拟机里要访问宿主侧的摄像头或编解码器，一直没有标准半虚拟化通道，只能靠 USB 透传或干脆没有。
      - label: 做法
        text: >-
          v9 四帖给出骨架驱动（绑定 virtio 设备、注册 V4L2 device 与 video device、定义 UAPI 协议头）
          + session 管理 + scatterlist 构造。virtio 维护者 Michael Tsirkin 当天回复两轮。
      - label: 效益或下一步
        text: >-
          Tsirkin 的意见是「不喜欢这种没有使用者的头文件单独成帖」——他认为 reserved 字段漏了初始化，
          正是因为定义结构体的这帖没有配套的使用者。这类意见指向的是补丁切分方式，不是设计本身；
          协议还早，但它决定的是「云上跑摄像头/编解码流水线」有没有原生路径。
    relevance: >-
      你在 RK3588 上搭的 camera/DRM 栈，未来一半的运行环境可能是虚拟机或容器；
      virtio-media 是这条路上目前唯一在推进的标准方案。
    link: "https://lore.kernel.org/linux-media/<20260919160109-mutt-send-email-mst@kernel.org>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "Nova 驱动的 BAR1 用户接口：维护者提醒「BAR1 必须是可选的」"
    meta: "〔09-20 05:26 北京〕· [PATCH 15/16] gpu: nova-core: mm: Add BAR1 user interface（dri-devel）"
    points:
      - label: 定位
        text: >-
          Nova 是用 Rust 重写的 NVIDIA GPU 内核驱动，目标是接替 Nouveau。BAR1 是 GPU 暴露给 CPU 的
          显存窗口（aperture）——用户态通过它直接读写 GPU 虚拟内存，省掉一次拷贝。
      - label: 做法
        text: >-
          这一帖给 Nova 加上 BAR1 用户接口：在 NovaCore 里映射 BAR1，由 Gpu / BarUser 借用，
          走新的 VramAddress 原始 API，不用 devres 托管。
      - label: 效益或下一步
        text: >-
          Dave Airlie 指出 BAR1/BAR2 必须<b>可选探测</b>——他手上测试的 SPARK 设备只有 BAR0，
          为此不得不改这版代码；另一个问题是 FB console 占用 BAR1 时驱动会撞车，
          他认为 nova-core 迟早要调 remove_conflicting 把重叠驱动踢开。
    relevance: >-
      Rust 驱动 + 显存映射，这两件事凑一起就是内核接下来两年的看点；Airlie 的 review 也示范了
      「新驱动必须先假设硬件会缩水」这条实践。
    link: "https://lore.kernel.org/dri-devel/<CAPM=9tzFaYp6=3nJ3yxEhjaHzUOnyQT0eV884eKR7ma2sHp73w@mail.gmail.com>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "40 帖重构：给 VMA 标志位去歧义，干掉 VM_SPECIAL 这个「杂物抽屉」"
    meta: "〔09-19 23:06 北京〕· [PATCH v2 00/40] mm: make VMA flag semantics explicit, eliminate VM_SPECIAL（linux-mm）"
    points:
      - label: 定位
        text: >-
          VMA（虚拟内存区域）用一组标志位描述「这段地址是什么」。其中 VM_SPECIAL 是个兜底位，
          被好几种互不相同的语义共用——内核里到处是「如果 VM_SPECIAL 就另作处理」的分支，
          但没人说得清它此刻代表哪一种。
      - label: 做法
        text: >-
          v2 版 40 帖把 VM_SPECIAL 拆开，让每个标志位的语义显式化，并逐个改造依赖它的判断点。
          这不是功能改动，是把 mm 里一处长期含混的状态拆成可推理的东西。
      - label: 效益或下一步
        text: >-
          Lorenzo Stoakes、Suren Baghdasaryan、David Hildenbrand 当天都进场评审——mm 的核心维护者
          同时在跟，说明方向被接受了。这类重构的价值不在当天，而在它之后每一个读 mm 代码的人。
    relevance: >-
      VMA 标志位是 mmap 语义的根，也是你读 mm 代码时最先撞上的「看不懂的分支」——
      重构之后，那些分支的意图会写在标志名里。
    link: "https://lore.kernel.org/linux-mm/<aq6lW9FvL69QeA9H@gremlin>/"
  - type: highlight
    title: "虚拟化 swap 怎么落地：Chris Li 与 Rik van Riel 在争「一次合多少」"
    meta: "〔09-20 05:22 北京〕· Path forward for Virtualized Swap?（linux-mm）"
    points:
      - label: 定位
        text: >-
          虚拟化 swap（vswap / xswap 这条线）要回答的是「swap 条目能不能不预先绑定物理槽位」。
          机制本身 9 月中旬已经报过，今天讨论的是路线：分几步合、先合哪部分。
      - label: 做法
        text: >-
          Chris Li 主张别把系列摊得太大、分步合入；Rik van Riel 同意分步，但强调设计必须能长出
          用户要的功能、用户接口要稳定。两人逐条对齐，Chris Li 在 24 小时内连发 6 帖。
      - label: 效益或下一步
        text: >-
          这场讨论的结论直接决定 vswap 什么时候进 mm-unstable——「先最小可用、撞到坑再改」
          在这里同样是主流意见。
    relevance: >-
      这是内核里少见的「先定路线再写代码」的公开样本，能直接看到维护者对「大系列 vs 小步走」
      的真实取舍标准。
    link: "https://lore.kernel.org/linux-mm/<CACePvbVA+DnDJprMx3qOrGb98y1ORQ-LfaENy_Btfx3uW=E4eQ@mail.gmail.com>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "RK3568 的 SGMII 有着落了：XPCS 支持发到 v8，11 帖"
    meta: "〔09-19 20:51 北京〕· [PATCH net-next v8 00/11] net: pcs: add basic support for RK3568 XPCS（netdev）"
    points:
      - label: 定位
        text: >-
          PCS（Physical Coding Sublayer）是 MAC 与 PHY 之间的那层编码子层。RK3568 的 GMAC 要跑 SGMII，
          就得有对应的 XPCS 驱动；此前这条链路一直缺上游支持。
      - label: 做法
        text: >-
          11 帖把 XPCS 的生命周期管理从 stmmac 挪到平台驱动，新增 Rockchip RK3568 的 XPCS glue 驱动、
          naneng-combphy 的 SGMII MAC 选择、dt-bindings 与设备树节点，并给 SGMII 链路恢复补上
          ANRESTART 支持。
      - label: 效益或下一步
        text: >-
          到 v8 说明 review 已经收得差不多。改动落在 stmmac / PCS 的公共层上——Rockchip 平台共用这套代码，
          即便你的板子不是 RK3568，这版「XPCS 生命周期归平台驱动」的重构也会波及。
    relevance: >-
      你在 RK3588 上做 camera/DRM，以太网不是主线；但这条改动动的是 stmmac 与 PCS 的边界划分，
      和你在 GMSL2 上碰到的「多协议共用一条高速链路，谁来管」是同一类架构问题。
    link: "https://lore.kernel.org/netdev/<20260919125119.2107089-1-coiaprant@gmail.com>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "VFS 把 atomic_open 的契约写清楚：vfs_lookup_open 与 nfsd 整合到第 2 版"
    meta: "〔09-19 10:25 北京〕· [PATCH v2 01/14] fixes for vfs_lookup_open, and integration with nfsd（linux-fsdevel）"
    points:
      - label: 定位
        text: >-
          「按名字打开文件、必要时创建」是 VFS 里最绕的一段。atomic_open 让文件系统在一次调用里完成
          查找 + 创建，避免重试；但它的契约长期只有口头约定，各家实现（nfs / ceph / gfs2 / cifs）
          各写各的。
      - label: 做法
        text: >-
          14 帖先补上 atomic_open 的文档、把 vfs_lookup_open() 改用 do_open() 并收紧允许的打开标志、
          不再返回 -ENODEV，再让 nfsd 的非创建型 OPEN 也走同一条路径（含 O_NONBLOCK 等边角）。
      - label: 效益或下一步
        text: >-
          网络文件系统的 OPEN 语义会第一次对齐到本地 VFS 的同一套规则上——那些「为什么 NFS 和本地
          表现不一样」的问题，源头就在这里。
    relevance: >-
      你读 fs/namei.c 和 fs/open.c 时碰到的 atomic_open 契约，这次终于有个权威版本可查了。
    link: "https://lore.kernel.org/linux-fsdevel/<20260919022441.3305170-1-neilb@ownmail.net>/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "PCIe 原生所有权模型简化到 v13：AER、DPC 和 portdrv 到底谁在管"
    meta: "〔09-20 00:27 北京〕· [PATCH v13 0/5] Simplify PCIe native ownership（linux-pci）"
    points:
      - label: 定位
        text: >-
          PCIe 的若干高级能力（AER 错误报告、DPC 下行端口遏制、portdrv 服务）可以在固件（ACPI _OSC）
          手里，也可以由 OS 接管。「谁在管」的判断散落在多个函数里，条件互相重叠。
      - label: 做法
        text: >-
          5 帖把 pcie_ports_native、_OSC 控制位、pci_aer_available() 的检查集中到一处，
          并让 DPC 忽略没有 AER 能力的设备、portdrv 未启用时不去接管相关特性。
      - label: 效益或下一步
        text: >-
          到 v13 说明这轮收敛得差不多了。集中之后，AER/DPC 在固件接管场景下的行为不再依赖
          某个函数的调用顺序——这类「看起来只是整理」的重构，实际是错误处理路径可靠性的前提。
    relevance: >-
      AER 报不报、DPC 走不走，直接影响你排查 PCIe 链路错误时看到的行为；这几帖就是那段逻辑的权威整理。
    link: "https://lore.kernel.org/linux-pci/<20260919162655.3499010-1-sathyanarayanan.kuppuswamy@linux.intel.com>/"
  - type: highlight
    title: "NXP S32G 的 SerDes 子系统：12 帖 RFC，PHY + xPCS + PCIe + 以太网一次配齐"
    meta: "〔09-19 14:54 北京〕· [PATCH RFC v3 00/12] Add support for the NXP S32G SerDes subsystem（linux-pci）"
    points:
      - label: 定位
        text: >-
          SerDes（串行器/解串器）是高速接口的物理层底座：PCIe、SGMII 都跑在它上面。
          S32G 车规 SoC 的 SerDes 此前没有上游支持。
      - label: 做法
        text: >-
          12 帖分四层：dt-bindings 描述 SerDes 子系统；phy 驱动管 SerDes 本体；net: pcs 新增共享的
          XPCS 核心 + S32G 专用 xPCS 驱动；上层接 dwmac-s32 的 SGMII 与 PCIe 控制器节点。
      - label: 效益或下一步
        text: >-
          仍是 RFC（第 3 版），接口还在收敛。但这套分层——<b>PHY 管 SerDes 本体、PCS 管编码层、
          MAC/PCIe 各取所需</b>——是当下内核处理 SerDes 的标准切法。
    relevance: >-
      和你在 GMSL2 上碰到的是同一类问题：一条高速链路被多种协议共用，谁管 lane、谁管编码层。
      这 12 帖的分层方式是可直接借鉴的架构样本。
    link: "https://lore.kernel.org/linux-pci/<20260919-s32g_serdes-v3-0-9d68868c1e89@oss.nxp.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/netdev/<5dca353c-6b3f-4d01-8808-bef2c0dd7af7@paulmck-laptop>/"
        text: "hrtimer_sleeper->task 数据竞争修复到 v2：12 帖覆盖 futex / aio / io_uring / wait / pktgen，裸读写改访问器 + READ_ONCE"
        time: "09-19 08:13"
      - link: "https://lore.kernel.org/linux-block/<748ca00e-61af-4698-86a9-cb28a41c7471@linux.dev>/"
        text: "blk-iocost 的 BPF struct_ops 成本模型到 RFC v5：磁盘定价从内核硬编码变成 BPF 程序可替换"
        time: "09-19 15:35"
      - link: "https://lore.kernel.org/linux-block/<084ec3b97432a6d1520948417d9b9bc1@kernel.org>/"
        text: "block 层新增 run_todo() 操作（v4·2 帖）：loop 的 __loop_clr_fd() 搬到回调里执行，绕开 open_mutex 持有期的顺序问题"
        time: "09-19 18:51"
      - link: "https://lore.kernel.org/linux-security-module/<20260919035351.88453-1-ngocthang2710.1999@gmail.com>/"
        text: "smack: 拒绝来自 io_uring worker 的 relabel-self 写入——io_uring 上下文里的凭据语义又一处收口"
        time: "09-19 11:53"
      - link: "https://lore.kernel.org/linux-rt-devel/<20260919044124.8268-1-singhpra@juniper.net>/"
        text: "efivarfs 新增 nostatfs 挂载选项（v2）：跳过 QueryVariableInfo()，规避固件在启动早期卡住"
        time: "09-19 12:41"
      - link: "https://lore.kernel.org/linux-media/<20260919-nord-iris-v1-0-94428761ec06@oss.qualcomm.com>/"
        text: "media: iris 给 nord 平台加视频编解码支持（4 帖）：设备树节点 + iris 节点接线"
        time: "09-19 12:46"
      - link: "https://lore.kernel.org/virtio-dev/<20260913161628.368484-1-linlin.zhang@oss.qualcomm.com>/"
        text: "virtio-blk 内联加密第 3 版（2 帖）：新增控制 virtqueue —— 低频列表，非当日新帖，作信号记录"
        time: "09-13 16:16"
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "hrtimer_sleeper 数据竞争"
        text: >-
          hrtimer_sleeper 的 ->task 字段被无锁读写（v2·12 帖）：在 hrtimer/futex/aio/wait/io_uring/pktgen
          六个子系统里统一改成访问器 + READ_ONCE，并把字段标为 __private。
          定时器与等待队列交界处的数据竞争，一次跨子系统清理。
          <a href="https://lore.kernel.org/netdev/<5dca353c-6b3f-4d01-8808-bef2c0dd7af7@paulmck-laptop>/">原文</a>
      - label: "block: run_todo()"
        text: >-
          block 层新增一个「稍后执行」的回调机制（v4·2 帖），loop 设备的拆解搬到回调里执行——
          解决 open_mutex 持有期间必须完成清理、又不能反向加锁的顺序问题。
          <a href="https://lore.kernel.org/rust-for-linux/<e615fb71-f386-4029-8ceb-22e375ad9e94@I-love.SAKURA.ne.jp>/">原文</a>
      - label: "iocost 成本模型可插拔"
        text: >-
          blk-iocost 的 BPF struct_ops 成本模型到 RFC v5：磁盘定价从内核硬编码变成 BPF 程序可替换，
          延续了 9 月 15 日报道过的「112 倍定价偏差」那条线。
          <a href="https://lore.kernel.org/linux-block/<748ca00e-61af-4698-86a9-cb28a41c7471@linux.dev>/">原文</a>
      - label: "PREEMPT_RT 收紧 trylock"
        text: >-
          RFC：把 can_spin_trylock() 的使用限制到可抢占上下文——PREEMPT_RT 上自旋等待路径的一处边界条件。
          RT 列表今天只有 7 帖，这条最重。
          <a href="https://lore.kernel.org/linux-mm/<20260919171443.90512-1-kmehltretter@gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "hazard pointers（危险指针）"
        text: "一种无锁内存回收原语：读者显式标记「我正在用这个指针」，回收者只在没有任何人标记时释放对象，因此不需要 RCU 那样的宽限期。"
      - label: "grace period（宽限期）"
        text: "RCU 的回收前提：必须确认所有已进入读侧临界区的读者都已退出，才能释放对象——这是 RCU 快读慢回收的来源。"
      - label: "Assisted-by: LLM"
        text: "补丁末尾的声明标签，表明该改动有 LLM 参与；与 Co-developed-by / Signed-off-by 并存。今天这批扫荡式补丁里有一部分带它。"
      - label: "BAR1 / aperture"
        text: "GPU 暴露给 CPU 的一段显存窗口，用户态通过它直接读写显存，避免先拷到系统内存。"
      - label: "PCS（Physical Coding Sublayer）"
        text: "MAC 与 PHY 之间的编码子层，SGMII 等链路协议在这里实现；XPCS 是其中一种可复用的实现。"
      - label: "SerDes"
        text: "串行器/解串器，高速接口的物理层底座。PCIe、SGMII 等协议都跑在它上面，因此它的驱动分层（PHY 管本体、PCS 管编码）很关键。"
      - label: "VM_SPECIAL"
        text: "VMA 标志位里的兜底位，被多种互不相同的语义共用；今天 40 帖重构的目标就是拆掉它。"
      - label: "atomic_open"
        text: "VFS 提供的「一次调用完成查找 + 创建」的文件打开路径，各文件系统实现语义长期不一致；今天 14 帖在给它补文档并统一。"
  - type: closing
    tagline: "如果对你有用，点个赞。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
