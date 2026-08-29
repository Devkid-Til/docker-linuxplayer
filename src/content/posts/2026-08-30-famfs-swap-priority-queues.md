---
title: "famfs 把『远程内存』变成文件：CXL 时代的新文件系统"
date: "2026-08-30"
desc: "famfs v14 把 CXL 远程内存挂成文件系统；mm swap 分配改 per-priority 队列；media 新增 OV32C4 sensor；net 让晚到的 PHY 也能被识别。"
column: "daily"
tags: ["mm", "fs", "media", "net", "PCI", "block", "virtio", "sched"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看三件事：<strong>famfs 走到 v14</strong>——把 CXL 这类「远程内存」挂成文件系统；<strong>mm 重排 swap 设备分配</strong>——13 帖 RFC 引入 per-priority 队列；以及 <strong>media 上新 OV32C4 sensor 驱动</strong>，mm 里还有一长串机制改动在排队。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-30/cover.png"
    alt: "封面 · 8月30日 · famfs v14 · CXL 远程内存挂成文件系统"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "famfs v14 独立发布——把 CXL 这类「远程内存」以文件 + DAX 语义挂进系统，df 能看到、mmap 能映射"
      - label: "头条"
        text: "mm swap 分配重构 RFC：用 per-priority 队列替换 plist + available 列表，swapon 锁改 percpu rwsem"
      - label: "mm"
        text: "arm64 内核复制（18 帖 RFC）+ folio 化 swap 写回 + dropbehind 保留映射页——mm 大动作日"
      - label: "media"
        text: "OV32C4 新 sensor 驱动（v3）；imx258 补复位 GPIO 与上电等待"
      - label: "net"
        text: "9 帖 RFC 让『固件比 MAC 晚』的 PHY 也能被识别；NTP_PPS 适配无 tick 内核"
      - label: "fs"
        text: "f2fs 为运行时块大小重构元数据布局（11 帖）；sysctl 引入 typed field 描述符"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "famfs v14：把『CXL 远程内存』变成文件——新内存层级的头号玩家"
    meta: "〔08-30 01:10 北京〕· [PATCH v14 00/12] famfs: the Fabric-Attached Memory File System (standalone)"
    link: "https://lore.kernel.org/linux-fsdevel/<010001a04e801a4e-8eb212cd-b263-4043-ab65-33e480d2d7d4-000000@email.amazonses.com>/"
    points:
      - label: "现状"
        text: >-
          传统文件系统挂在本地磁盘/SSD 上，访问路径是「块设备 → 页缓存 → 文件」。另一类内存（DAX 直连的持久内存）则绕过页缓存、直接映射。而 CXL 这类 fabric-attached memory（通过总线附加、可被多个控制器访问的「远程内存」）是新出现的第三种内存层级。
      - label: "痛点"
        text: >-
          这块新内存现在没有标准抽象：当成普通块设备用，就丢了「内存」语义（不能 mmap、没 DAX）；当成匿名内存用，又没文件名、权限、持久化边界，多机共享无从谈起。
      - label: "方案"
        text: >-
          famfs（Fabric-Attached Memory File System）v14，作者 John Groves，现在以独立文件系统提交（standalone）。12 帖：以 DAX 语义把 fabric 内存挂成文件——mmap 直接映射、read/write、MAP_CREATE ioctl + fmap 引入映射、iomap_begin 解析 file→dax 偏移、statfs 上报设备容量（df 可用）、daxdev 表 + notify_failure 处理坏页。
      - label: "为什么"
        text: >-
          保留内存语义（DAX、零拷贝）的同时，获得文件系统的管理能力（命名、权限、共享、故障上报）——内存能像文件一样被组织、被监控、被持久化。
      - label: "效益"
        text: >-
          CXL 内存生态有了一等公民的访问方式：df 看到容量、mmap 直接读、坏页能上报；为多机共享 fabric 内存铺了路。
      - label: "下一步"
        text: >-
          v14 仍在迭代，进 mainline 的路径（哪个树、何时合入）未定；跨多控制器/多机的语义边界、性能调优是接下来要啃的骨头。
    verdict: "新内存层级一出现，就会催生配套的文件系统——famfs 是 CXL 生态里最值得盯的一条线"
  - type: headline
    title: "swap 设备分配重排：per-priority 队列替掉 plist，swapon 锁换 percpu rwsem"
    meta: "〔08-29 15:44 北京〕· [RESEND RFC PATCH v2 00/13] mm/swap: introduce per-priority allocation queues"
    link: "https://lore.kernel.org/linux-mm/<20260829-swap-pcp-priq-v2-resend-0-68d3d925578c@gmail.com>/"
    points:
      - label: "现状"
        text: >-
          内核允许挂多个 swap 设备，分配时按 priority（优先级）选：高优先级 swap 先被用满，才轮到低优先级。选择逻辑靠 plist（优先级链表）+ 一张 available 列表维护，swapon/swapoff 用一把全局 mutex 串行化。
      - label: "痛点"
        text: >-
          这条路径有历史包袱：plist 的 requeue 机制绕来绕去、available 列表冗余、全局 mutex 在多 swap 设备并发分配时锁竞争明显，分配时的同步 discard 还可能卡住调用方。
      - label: "方案"
        text: >-
          13 帖 RFC：把「按优先级选设备」改成 per-priority 分配队列（每个优先级一个设备队列）；swapon 锁换成 percpu rwsem；删掉 available 列表与 swap active plist；lib/plist.c 的 requeue 函数直接移除；分配路径上的同步 discard 加 bound（上限）。
      - label: "为什么"
        text: >-
          队列化让「选哪个设备」变成常数时间、锁粒度从全局降到 percpu；plist 在 swap 里只剩这一个用户，整个删掉是净简化而非加复杂度。
      - label: "效益"
        text: >-
          多 swap 设备下分配路径更可预测、并发更好；代码变短，后续在 swap 上做新机制（比如 zram/压缩 swap 优先级）更干净。
      - label: "下一步"
        text: >-
          仍是 RFC v2（resend），等待 mm 维护者反馈；作者大概率要按 Andrew/Yosry 的意见再打磨一轮。
    verdict: "一个把历史数据结构换成更直白队列的重构——但多 swap 设备生产环境的锁竞争与可预测性收益是实打实的"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "新 sensor 驱动 OV32C4（v3）：13MP 级模组 + ipu-bridge 接入"
    meta: "〔08-29 19:58 北京〕· [PATCH v3 0/3] media: Add OmniVision OV32C4 sensor driver"
    points:
      - label: "定位"
        text: "v4l2 subdev 层新驱动：OmniVision OV32C4（3200 万像素级 CMOS sensor），dt-bindings + 驱动 + ipu-bridge 三帖一套。"
      - label: "做法"
        text: "新增 OV32C4 驱动、补 DT 绑定，并把 sensor 注册进 ipu-bridge（Intel IPU 平台用 sensor 集合描述）。"
      - label: "效益或下一步"
        text: "搭载 OV32C4 的笔记本/设备在 Linux 上可用；v3 已在按评审迭代，等 maintainer 合入。"
    relevance: "新 sensor 驱动是 media 板块最常见的贡献入口——这套三帖结构（bindings + driver + bridge）就是标准姿势。"
    link: "https://lore.kernel.org/linux-media/<20260829115832.8749-1-robertbozik@gmail.com>/"
  - type: highlight
    title: "imx258 补复位 GPIO + 上电等待（v2）：板级时序不再『随缘』"
    meta: "〔08-29 21:06 北京〕· [PATCH v2 0/2] Add Reset GPIO to imx258"
    points:
      - label: "定位"
        text: "Sony imx258 sensor 驱动此前缺 reset-gpio（复位引脚）支持，上电后也没有等待，复位时序不稳。"
      - label: "做法"
        text: "v2 两帖：加 reset-gpio 支持 + 使能后加等待，让复位/上电时序确定化。"
      - label: "效益或下一步"
        text: "不同板子上的 imx258 上电更稳，reset 引脚有 GPIO 时不再随机失败。"
    relevance: "sensor 复位/上电时序是摄像头板级调试最常见的问题——这帖就是标准解法样板。"
    link: "https://lore.kernel.org/linux-media/<20260829-imx258-add-reset-gpio-patch-v2-0-bfd27891e225@mainlining.org>/"
  - type: highlight
    title: "VCM 驱动 ak7375 扩型号：支持 AK7377 对焦马达"
    meta: "〔08-29 13:35 北京〕· [PATCH 0/3] media: ak7375: Add AK7377 support"
    points:
      - label: "定位"
        text: "VCM（音圈马达，摄像头自动对焦执行器）驱动 ak7375 扩展支持同系 AK7377。"
      - label: "做法"
        text: "dt-bindings + 驱动两帖加 AK7377，并修了上电前就把 VCM 标成 active 的时序问题。"
      - label: "效益或下一步"
        text: "用 AK7377 的模组对焦可用，上电顺序更正确。"
    relevance: "VCM 是相机对焦链路的执行器——做手机/笔记本相机驱动的会常碰。"
    link: "https://lore.kernel.org/linux-media/<20260829052514.18178-1-jan.brummer@tabos.org>/"
  - type: more
    title: "更多动态"
    items:
      - text: "platform/x86 int3472：支持 POWER1 GPIO 类型（sensor 供电 GPIO 的驱动补全）"
        time: "08-29 16:29"
        link: "https://lore.kernel.org/linux-media/<20260829-sp7plus-int3472-v3-1-454b50485ce2@berg.pm>/"
      - text: "ov5693 / ov8865：修复水平翻转极性（flip control polarity）与 Bayer 相位"
        time: "08-29 07:18"
        link: "https://lore.kernel.org/linux-media/<20260828231805.29790-1-dmanresa@gmail.com>/"
      - text: "usbio：Synaptics SVP7500 在第 12 次 I2C 事务后掉下 USB 总线——bug 报告"
        time: "08-29 23:22"
        link: "https://lore.kernel.org/linux-media/<CAFsoTZWHf3uExaSH8J_HpcjFyLJCGT77btZx48B=qJF8GuxZPg@mail.gmail.com>/"
      - text: "fpga + dma-buf：基于 dma-buf 的 FPGA 编程接口（跨域线程，AMD）"
        time: "08-29 15:52"
        link: "https://lore.kernel.org/linux-media/<9c6c08d3-9ec1-481a-8d66-4b0183036c39@amd.com>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "arm64 内核复制 RFC（18 帖）：把内核只读段『复制多份』换性能"
    meta: "〔08-29 20:08 北京〕· [RFC PATCH 00/18] mm: arm64: Add kernel replication feature"
    points:
      - label: "定位"
        text: "mm + arm64 架构层：kernel replication（内核复制）——把内核只读段在物理上复制多份，用页表/内存手段缓解「页表隔离」的性能代价。"
      - label: "做法"
        text: "18 帖 RFC：Kconfig 开关、arch 回调、电源管理适配；华为主导，现处早期评审。"
      - label: "效益或下一步"
        text: "若成立，KPTI 一类页表隔离能少付 TLB/切换税；RFC 早期，机制细节以 patch 为准，值得盯后续版本。"
    relevance: "做 arm64 安全/性能、或关心页表隔离性能开销的同学，这是今天架构层最重要的信号之一。"
    link: "https://lore.kernel.org/linux-mm/<20260829115525.915867-1-panov.nikita@huawei.com>/"
  - type: highlight
    title: "swap 写回路径 folio 化收尾：删 PageReclaim，__swap_writepage 改名 __swap_writeout"
    meta: "〔08-30 03:09 北京〕· [PATCH v2 0/6] mm/page_io: folio conversion cleanups"
    points:
      - label: "定位"
        text: "mm page_io（swap 写回路径）做 folio 化收尾——把遗留的 page 语义彻底换成 folio。"
      - label: "做法"
        text: "6 帖：写完成回调转 folio、zeromap helper 直接用 swap entry、删除 PageReclaim 标志位、__swap_writepage() 改名 __swap_writeout() 对齐语义。"
      - label: "效益或下一步"
        text: "swap 写回路径彻底 folio 化，命名与新语义一致——folio 化主线的又一里程碑。"
    relevance: "folio 化是 mm 长期主线；这类『收尾』补丁是读懂 swap 内部结构的好入口。"
    link: "https://lore.kernel.org/linux-mm/<20260829-b4-page_io-folios-v2-0-649728091117@columbia.edu>/"
  - type: highlight
    title: "dropbehind 不再误伤映射页：mapped folio 保留（v3）"
    meta: "〔08-30 01:36 北京〕· [PATCH v3] mm: filemap: retain mapped dropbehind folios"
    points:
      - label: "定位"
        text: "readahead 的 dropbehind（读后即丢）现在会连『仍被 mmap 映射』的 folio 一起驱逐，导致映射页被回收。"
      - label: "做法"
        text: "v3 改为：dropbehind 时保留仍被映射的 folio；xiaomi 工程师 qiwenjie 提交，多轮评审中。"
      - label: "效益或下一步"
        text: "读大文件时映射中的页不再被误驱逐，mmap + readahead 场景更稳。"
    relevance: "做文件读取/内存回收的会关心——dropbehind 是内核『主动丢冷页』的代表机制。"
    link: "https://lore.kernel.org/linux-mm/<4aba05e1a2c3b61cb337d373eb9b7a8db4ddd822.1788024049.git.qiwenjie@xiaomi.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "khugepaged：不折叠注册了 uffd-minor 的 VMA（多轮讨论中）"
        time: "08-29 10:50"
        link: "https://lore.kernel.org/linux-mm/<20260829025034.2500920-1-jthoughton@google.com>/"
      - text: "memcg（for-7.4）：移除 v1 soft limit——老接口退役"
        time: "08-29 11:13"
        link: "https://lore.kernel.org/linux-mm/<20260811203203.3456029-1-shakeel.butt@linux.dev>/"
      - text: "/dev/zero 与 /dev/full：splice 直接映射 zero page（零页免拷贝）"
        time: "08-29 12:41"
        link: "https://lore.kernel.org/linux-mm/<20260829043746.2929210-1-kris.pan@intel.com>/"
      - text: "mempolicy：weighted interleave 路径停止复制 nodemask（SRCU）"
        time: "08-29 09:59"
        link: "https://lore.kernel.org/linux-mm/<20260829015943.1258774-1-gourry@gourry.net>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "f2fs 为『运行时块大小』重构元数据布局（v2，11 帖）"
    meta: "〔08-30 01:49 北京〕· [PATCH v2 00/11] f2fs: prepare metadata layouts for runtime block sizes"
    points:
      - label: "定位"
        text: "f2fs 的块大小目前写死在构建期，SIT/NAT/dentry/xattr 等元数据布局都按固定块大小硬编码。"
      - label: "做法"
        text: "11 帖：sb_info 早期初始化、字节/块/扇区转换宏参数化、各元数据块布局动态描述、节点树几何动态生成。"
      - label: "效益或下一步"
        text: "为运行时可变块大小（大块设备/特殊存储）铺路——布局不再绑定编译期常量。"
    relevance: "用 f2fs（嵌入式/安卓）的读者，块大小可变后大容量设备布局更灵活。"
    link: "https://lore.kernel.org/lkml/<CAH=xXfHWW_J92z3YgvoLSx8+z6rekq=p2kiP15KE9=2+Ju2RjQ@mail.gmail.com>/"
  - type: highlight
    title: "sysctl 引入 typed field 描述符（RFC）：per-device / per-net 注册类型安全"
    meta: "〔08-30 00:15 北京〕· [RFC PATCH 0/4] sysctl: add typed field descriptors"
    points:
      - label: "定位"
        text: "sysctl 目前用 (table, nargs, args) 弱类型注册，mpls / sctp / IPC 命名空间的每设备/每 net sysctl 各自手写。"
      - label: "做法"
        text: "RFC 4 帖：新增 typed field 描述符，把 per-device / per-net sysctl 统一到一套类型化描述。"
      - label: "效益或下一步"
        text: "sysctl 注册类型安全、可校验；若成行，是一套跨子系统的机制级统一。"
    relevance: "做网络命名空间/系统参数管理的会喜欢——sysctl 是几乎所有子系统都碰的基础设施。"
    link: "https://lore.kernel.org/linux-fsdevel/<cover.1788018958.git.legion@kernel.org>/"
  - type: more
    title: "更多动态"
    items:
      - text: "selinux：嵌套 backing-file 的 mprotect 复查（v3）——修 SID 丢失与旁路"
        time: "08-30 05:33"
        link: "https://lore.kernel.org/linux-fsdevel/<20260829213256.51527-1-kmehltretter@gmail.com>/"
      - text: "squashfs：加固 fragment index 表尺寸计算"
        time: "08-29 10:52"
        link: "https://lore.kernel.org/linux-fsdevel/<918464087.420455.1787971711604@eu1.myprofessionalmail.com>/"
      - text: "loop：修 lo_rw_aio() 的 NULL 解引用（v7）"
        time: "08-29 13:56"
        link: "https://lore.kernel.org/linux-fsdevel/<903a22a2-432c-4e72-bc09-7898becf2f3e@I-love.SAKURA.ne.jp>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "9 帖 RFC：让『固件比 MAC 晚』的 PHY 也能被识别"
    meta: "〔08-29 13:25 北京〕· [RFC PATCH net-next 0/9] net: survive a PHY whose firmware arrives after the MAC probes"
    points:
      - label: "定位"
        text: "部分 PHY（如 Airoha EN8811H）固件由 MCU 侧加载，MAC 先 probe 时 PHY 还没就绪——现在只能靠启动顺序碰运气。"
      - label: "做法"
        text: "9 帖：phylink 等待晚到的 PHY、缺 PHY 时报告 no link mode、新增 slow-to-probe dt-bindings、EN8811H 的 MDIO 驱动与嵌套 passthrough 总线。"
      - label: "效益或下一步"
        text: "『固件比 MAC 晚』的设备能稳定识别，不依赖时序；是板级『PHY 没起来』的机制级解法。"
    relevance: "做嵌入式/网络板级调试的读者会直接受益——PHY 初始化顺序问题非常常见。"
    link: "https://lore.kernel.org/netdev/<20260829052546.1152446-1-f@lex.la>/"
  - type: highlight
    title: "NTP_PPS 适配无 tick 内核（v4）：时间同步不再依赖固定节拍"
    meta: "〔08-30 05:00 北京〕· [PATCH v4 0/4] Add ntp_error to clock snapshot, enable NTP_PPS on tickless kernel"
    points:
      - label: "定位"
        text: "PPS（脉冲秒信号，时间同步硬同步源）依赖固定 tick 触发，tickless（无固定节拍）内核上 NTP_PPS 受限。"
      - label: "做法"
        text: "4 帖（David Woodhouse）：timekeeping 对外推的 ntp_error 做时钟快照、pps 统一 ktime_get_snapshot_id()、去掉 NO_HZ_COMMON 依赖、ptp_vmclock 加模拟 1PPS（[DO NOT MERGE] 演示）。"
      - label: "效益或下一步"
        text: "无 tick 内核上 PPS 可用，虚拟化时钟也能测——时间同步的 tickless 化。"
    relevance: "做时间同步/NTP/PTP 的会关心；也是理解『tick 在哪几路被砍掉』的好案例。"
    link: "https://lore.kernel.org/netdev/<20260829210041.40649-1-dwmw2@infradead.org>/"
  - type: more
    title: "更多动态"
    items:
      - text: "net/sched 8 帖：统一在 change 路径 clamp quantum / psched_mtu"
        time: "08-29 16:12"
        link: "https://lore.kernel.org/netdev/<20260829081229.81708-1-jhs@mojatatu.com>/"
      - text: "mac802154：修 local->assoc_dev 数据竞争 + NULL 解引用"
        time: "08-29 07:06"
        link: "https://lore.kernel.org/netdev/<20260829230551.1787432-1-skwkevin@mail.ustc.edu.cn>/"
      - text: "enc28j60：修 remove 时 use-after-free"
        time: "08-30 04:35"
        link: "https://lore.kernel.org/netdev/<20260830-enc28j60-cancel-works-v1-1-4c40f17d401e@cherr.cc>/"
      - text: "xfrm：espintcp 拒绝无法表示的传输头（防 skb 传输头警告）"
        time: "08-29 23:44"
        link: "https://lore.kernel.org/netdev/<d138815e0f52e8898e83c5db62b3938993f813a2.1787986691.git.wf.kernel.dev@gmail.com>/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "iwlwifi 从 D3cold 掉电里把自己捞回来"
    meta: "〔08-29 17:54 北京〕· [PATCH wireless 0/2] wifi: iwlwifi: recover the device after it loses power in D3cold"
    points:
      - label: "定位"
        text: "笔记本 Wi-Fi 在 D3cold（PCIe 设备完全断电）后可能『消失』——resume 后设备 gone。"
      - label: "做法"
        text: "两帖：probe 时 arm product reset，resume 发现设备 gone 后请求一次 product reset 恢复。"
      - label: "效益或下一步"
        text: "休眠/断电恢复后 Wi-Fi 不再需要整机重启。"
    relevance: "笔记本用户、以及做 PCIe 电源管理（D3cold）的读者值得一看。"
    link: "https://lore.kernel.org/linux-pci/<20260829095437.44716-1-navonjohnlukose@gmail.com>/"
  - type: highlight
    title: "Resizable BAR 预取窗口预留 headroom（v3）"
    meta: "〔08-29 08:43 北京〕· [PATCH v3] PCI: Reserve prefetchable window headroom for Resizable BARs"
    points:
      - label: "定位"
        text: "Resizable BAR（可调尺寸 BAR，GPU/加速卡常用）扩容时，预取窗口（prefetchable window）可能不够。"
      - label: "做法"
        text: "v3 在分配时给预取窗口预留 headroom，给 BAR 扩容留空间。"
      - label: "效益或下一步"
        text: "需要 Resizable BAR 的 GPU/加速卡资源分配更稳。"
    relevance: "GPU/加速卡玩家会关心——Resizable BAR 就是显卡性能选项背后的机制。"
    link: "https://lore.kernel.org/linux-pci/<10fb16fb-2069-4d89-b473-1006ae5abfbc@jqluv.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "dw-rockchip：RK3588 固定 MSI-X table 与 PBA 支持"
        time: "08-29 22:11"
        link: "https://lore.kernel.org/linux-pci/<6qpbmznz2w6pgrjkrlpjiq2rwmxouwgmqwefp4bpe4gkdimigf@pk4sromhxms2>/"
      - text: "endpoint：修 BAR 后备 DMA 地址对齐"
        time: "08-30 00:22"
        link: "https://lore.kernel.org/linux-pci/<nvgnu3enktslxuiv7kdapcotoaxlfqhivar4jbf2tqvrk4otz5@exapzemrq37q>/"
  - type: divider
    label: "📊 板块活跃度 · 近 24h"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-30/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h（lkml 804 · mm 115 · net 100 居前）"
  - type: toc
    items:
      - label: "Top3"
        text: "lkml 804 · mm 115 · net 100（refresh-heat 06:23 自动刷新）"
      - label: "观察"
        text: "mm 是今日机制最密集的域（swap 队列 RFC / 内核复制 / folio 收尾）；net 持续活跃；dri-devel 今日静默、DRM 信号靠跨帖。"
  - type: divider
    label: "⚙️ 机制雷达"
    kind: primary
  - type: toc
    items:
      - label: "workqueue"
        text: "新增遥测 tracepoint：CPU hog、mayday/rescued、BH budget yield——workqueue 卡死可观测化 <a href=\"https://lore.kernel.org/lkml/<20260829230517.42468-1-atomlin@atomlin.com>/\">原文</a>"
      - label: "driver-core"
        text: "kthread worker 系列：ivtv / encx24j600 / sc16is7xx / cpufreq schedutil 迁移到 kthread worker + 移除 worker->task 自赋值 <a href=\"https://lore.kernel.org/lkml/<20260829161150.16301-1-include@grrlz.net>/\">原文</a>"
      - label: "sched / rseq"
        text: "RFC：rseq 操作通过 prctl 注册/注销（Mathieu Desnoyers）——把 rseq 的注册收进 prctl 语义 <a href=\"https://lore.kernel.org/lkml/<CACT4Y+ZbJShJeFiD=FRHTCouoY-9AcQCeDmB8pEKgZe4zKPNzA@mail.gmail.com>/\">原文</a>"
      - label: "Bluetooth"
        text: "L2CAP 16 帖：修正并注解 l2cap_conn::chan_l 加锁——并发安全大修 <a href=\"https://lore.kernel.org/lkml/<cover.1788013041.git.pav@iki.fi>/\">原文</a>"
      - label: "virtio"
        text: "virtio-blk 内联加密（v2，线程持续讨论）——虚拟磁盘加解密进硬件（低频信号，暂不展开） <a href=\"https://lore.kernel.org/virtio-dev/<20260821125526.2801257-1-linlin.zhang@oss.qualcomm.com>/\">原文</a>"
      - label: "block"
        text: "RamShared：把硬件加速 VRAM 暴露成块设备（RFC 新驱动） <a href=\"https://lore.kernel.org/linux-block/<6a924051.e22746c9.8f0fc.bdc2@mx.google.com>/\">原文</a>"
      - label: "Rust"
        text: "nova-core 用无损失整数转换；rust 运行时 PM 支持推进——Rust 驱动进展 <a href=\"https://lore.kernel.org/rust-for-linux/<DL1O1NFXUX6N.1LFASWF425I4Y@kernel.org>/\">原文</a>"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "famfs"
        text: "Fabric-Attached Memory File System——把 CXL 这类「远程附加内存」以文件 + DAX 语义呈现的文件系统。今日头条主角。"
      - label: "DAX"
        text: "直接访问（Direct Access）：绕过 page cache，文件数据直接映射到设备内存本身，零拷贝。famfs / 持久内存用它。"
      - label: "plist"
        text: "优先级链表（priority list）——按优先级排序的链表；swap 今天用 plist 管理设备选择，RFC 想把它换成 per-priority 队列。"
      - label: "dropbehind"
        text: "readahead 读完就丢弃的冷页机制——「读后即丢」；今天那帖在修它误伤仍被映射的页。"
      - label: "PPS"
        text: "脉冲秒信号（Pulse Per Second）——时间同步的硬同步源；tickless 内核上触发受限，今天有补丁在解。"
      - label: "VCM"
        text: "音圈马达（Voice Coil Motor）——摄像头自动对焦的执行器，ak7375 就是它的驱动。"
      - label: "D3cold"
        text: "PCIe 设备完全断电的电源状态；掉电后设备需重新初始化，iwlwifi 今天的补丁就是处理这个。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的内核话题。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间 · 数据截至 08-30 07:00"
---
