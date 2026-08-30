---
title: "Rust 驱动批量落地、vmemmap 换轨、7.3 合并窗口开启"
date: "2026-08-30"
desc: "本周内核全局：Rust 驱动生态集中提速（PCI SR-IOV / DRM KMS 抽象 / vino 验证驱动 / runtime PM）；mm 把 HugeTLB 专属 vmemmap 优化并入通用 sparse-vmemmap（HVO 泛化）；7.3 合并窗口开启、net-next 关闭只收修复；tcp 一处 UAF 修复已合入 net。"
column: "weekly"
tags: ["内存管理", "进程调度", "PCI/总线", "架构动向"]
blocks:
  - type: hook
    text: >-
      本周内核全局，三件事最值得记：<strong>Rust 驱动生态集中提速</strong>——PCI capability/SR-IOV、DRM KMS 抽象、vino 验证驱动、runtime PM 同周推进（NVIDIA/Arm 双厂）；<strong>mm 把 HugeTLB 的 vmemmap 优化并入通用 sparse-vmemmap 路径</strong>，机制级换轨；<strong>7.3 合并窗口开启</strong>，net-next 关闭只收修复。此外 tcp 一处 UAF 修复已合入 net、virtio 映射层 API 继续收缩。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-30/weekly-cover.png"
    alt: "封面 · 8月30日 · 每周内核雷达"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-30/board-heat-week.png"
    alt: "板块活跃度条形图 · 本周（周一~今日 · 2天累计）"
  - type: paragraph
    text: >-
      本周（08-24~08-30，2 天累计，历史热度部分缺失）各板块热度：<strong>lkml 1475</strong> · <strong>net 205</strong> · <strong>mm 174</strong> · <strong>DRM 103</strong> · fs 86 · PCI 36 · block 32 · media 30 · Rust 18 · rt 14 · LSM 9 · arch 2 · virtio 0。net 与 mm 领跑（net-next 关窗前的修复密集期 + mm 机制大系列）；virtio 规范讨论分散到 lkml/netdev，列表热度极低。
  - type: divider
    label: "💡 本周头条"
    kind: primary
  - type: headline
    title: "Rust 驱动生态集中提速：PCI SR-IOV + DRM KMS + vino + runtime PM 同周推进"
    meta: "〔08-26~08-28〕rust-for-linux / dri-devel / linux-pci · 四个机制级系列"
    link: "https://lore.kernel.org/rust-for-linux/<20260826163359.4998-1-mike@fireburn.co.uk>/"
    points:
      - label: "现状"
        text: "Rust 写内核驱动聊了很多年，但一直缺「安全、可用的地基」：PCI 能力访问、显示 KMS 对象、电源管理等核心子系统都没有类型化抽象，驱动作者要么绕过（用 unsafe），要么干脆不用 Rust 写。"
      - label: "痛点"
        text: "没有这些基础设施，Rust 驱动就是空谈——尤其 NVIDIA 的 nova-core vGPU 驱动、DisplayLink 坞站这类真驱动，一到 PCI 扩展能力、KMS 生命周期、runtime PM 就卡壳。"
      - label: "方案"
        text: "四个系列同周到位：Zhi Wang 的 Rust PCI capability + SR-IOV（v9，新增 rust/kernel/pci/cap.rs 类型化能力查找）；Mike Turquette 的 DRM KMS 抽象（v3 23 篇，模式对象生命周期/属性/回调/帧缓冲安全绑定）＋验证驱动 drm/vino（DisplayLink DL3 坞站，零 unsafe）；Beata Michalska 的 runtime PM 抽象（v3，生成式 dev_pm_ops + PMOps trait）。"
      - label: "为什么"
        text: "PCI 能力/SR-IOV 是 nova vGPU 的前置依赖，KMS 抽象则是「Rust 能否支撑真实显示驱动」的关键验证——vino 用纯 safe Rust 点亮三种坞站世代，就是给这条路背书。"
      - label: "效益"
        text: "Rust 侧第一次有了可落地的显示/PCI/电源三件套：新驱动可以写安全的并发与生命周期，unsafe 集中到内核抽象内部而不是散在驱动里。"
      - label: "下一步"
        text: "四个系列都在 review 收敛期（v9/v3/v3），下一合并窗口见分晓；nova-core vGPU 是首个吃这套基建的旗舰驱动。"
    verdict: "Rust 内核驱动从「能不能」走向「批量落地」——本周的地基比楼多"
  - type: headline
    title: "mm 把 HugeTLB 的 vmemmap 优化并入通用 sparse-vmemmap：HVO 泛化"
    meta: "〔08-25〕linux-mm · PATCH v5 00/17（Muchun Song，字节跳动）"
    link: "https://lore.kernel.org/linux-mm/<20260825084608.47437-1-songmuchun@bytedance.com>/"
    points:
      - label: "现状"
        text: "大页（HugeTLB）的内存开销有一块隐性成本：vmemmap——每个物理页都有一份 struct page 元数据。为了省这块内存，HugeTLB 很早就实现了 HVO（tail 页共享同份 vmemmap），但它走的是自己的一套早启动预填充路径，sparsemem 子系统为此专门保留了 SPARSEMEM_VMEMMAP_PREINIT 开关。"
      - label: "痛点"
        text: "HugeTLB 专属的 bootmem vmemmap 优化和通用 sparse-vmemmap 是两套代码，DAX 设备页想享受同样的去重却没通道——机制重复、无法复用。"
      - label: "方案"
        text: "v5 17 篇让通用 sparse-vmemmap 具备 section 感知优化能力：HugeTLB 把 compound order 记进 struct mem_section，由通用填充路径分配/复用共享 tail vmemmap 页，随后删除 SPARSEMEM_VMEMMAP_PREINIT、HUGE_BOOTMEM_HVO 等专属机制。v5 净删 449 行、加 299 行。"
      - label: "为什么"
        text: "这是更大的「Generalize HVO for HugeTLB and device DAX」系列的自包含第一步——把去重能力下沉到通用层，DAX 设备页未来直接吃同一套路径，不用再造轮子。"
      - label: "效益"
        text: "机制层去重：大页内存元数据开销下降，且 HugeTLB 与通用 vmemmap 路径合一，后续维护点减少。"
      - label: "下一步"
        text: "已由 Andrew Morton 合入 mm.git 的 mm-new 暂存分支（-rc1 后转 mm-unstable → linux-next）；device DAX 转换留给后续系列。"
    verdict: "把「省内存的机制」本身也通用化——少一套专属代码，多一条 DAX 通道"
  - type: divider
    label: "📰 各板块分章"
    kind: primary
  - type: highlight
    title: "mm：mglru 保护击穿修复 + vmalloc 活锁 + zswap dropbehind"
    meta: "linux-mm · 三个修复/机制系列"
    link: "https://lore.kernel.org/linux-mm/<20260828110919.1324028-1-ridong.chen@linux.dev>/"
    points:
      - label: "mglru 保护"
        text: "非 kswapd 回收路径完全跳过保护计算，cgroup 的 memory.min=100M 被静默回收到 6M；修复沿 root→目标祖先链算有效 min/low（O(depth)）。"
      - label: "vmalloc 活锁"
        text: "内存压力下 __purge_vmap_area_lazy() 持锁等 flush，直接回收又反抢同一把锁→死锁整机；改 mutex_trylock 破环。"
      - label: "zswap dropbehind"
        text: "写回后的冷 folio 即时释放（99.996% 命中），把 dropbehind 从 page cache 泛化到 swap cache。"
    relevance: "多租户内存隔离、内存压力稳定性、zswap 部署，均值得关注。"
  - type: highlight
    title: "media：IMX908 v3 + 无 datasheet 的 OV32C4 屏下摄像头"
    meta: "linux-media · 新增 sensor 驱动"
    link: "https://lore.kernel.org/linux-media/<20260828064843.65047-1-lachlan.michael@sony.com>/"
    points:
      - label: "IMX908"
        text: "Sony 8.39MP Type 1/2.8 传感器驱动 v3 趋稳：CCI 寄存器访问 + subdev 状态锁，libcamera + RPi5 实测，新一代 Sony 驱动范式。"
      - label: "OV32C4"
        text: "32MP RGBC 屏下前摄（Lenovo Yoga Slim 9）：无公开 datasheet，1787 条寄存器表从 vendor Windows 驱动反推——「无 datasheet 驱动」的合入范式。"
    relevance: "摄像头/传感器栈、Intel IPU 平台。"
  - type: highlight
    title: "DRM：通用 USB-C DP HPD bridge（v7）+ Renesas RZ/G3E"
    meta: "dri-devel · 桥接机制 + 新 SoC 支持"
    link: "https://lore.kernel.org/dri-devel/<20260828084737.565-1-kernel@airkyi.com>/"
    points:
      - label: "HPD bridge"
        text: "多款 USB-C 控制器此前各自重复注册 HPD bridge，做成通用 Type-C DP HPD bridge + RK3399 多 bridge 模型，并推进弃用 extcon。"
      - label: "RZ/G3E"
        text: "Renesas 双 Display Unit + LVDS/DSI/并行输出的完整支持（v8）。"
    relevance: "显示桥接热插拔、Renesas 显示栈。"
  - type: highlight
    title: "net：tcp UAF 合入 + hv_netvsc 给 CoCo VM 解禁 SR-IOV"
    meta: "netdev · 合并窗口期以修复为主"
    link: "https://lore.kernel.org/netdev/<20260826171344.4133-1-blbllhy@gmail.com>/"
    points:
      - label: "tcp UAF"
        text: "BPF 拥塞控制使 icsk_ca_ops 指向动态内存，getsockopt 无锁读 + 并发换指针 → slab UAF（含 KASAN 复现），已合入 net（5271b79b7ad6 / 385e474086c2）。"
      - label: "CoCo SR-IOV"
        text: "反向回退 2021 年的「隔离 guest 禁用 SR-IOV」：MANA 加固后，机密计算 VM + 高吞吐 VF 从不可行变可行。"
    relevance: "TCP 安全修复（走 stable 预期）、机密计算网络。"
  - type: highlight
    title: "fs：famfs v14 + NeilBrown negative dentry v3 + hfsplus 迁 iomap"
    meta: "linux-fsdevel · 新 FS + VFS 核心 + 去 buffer_head"
    link: "https://lore.kernel.org/linux-fsdevel/<20260825221459.966875-1-neilb@ownmail.net>/"
    points:
      - label: "famfs"
        text: "Fabric-Attached Memory FS 回 standalone 形态（v14），DAX 设备按路径注册次级 daxdev，新 FS 系列。"
      - label: "dentry v3"
        text: "负目录项问题又切一刀：d_sib 链表不再乱搬、fsnotify 不再持 i_lock——为 dentry 并发迭代改造解锁。"
      - label: "hfsplus"
        text: "常规文件 I/O 全量迁 iomap，与 minix/nilfs2 构成「去 buffer_head 直 IO」运动。"
    relevance: "DAX/持久内存、VFS 地基、老文件系统现代化。"
  - type: highlight
    title: "PCI：endpoint 远程 DMA via vNTB（v2 机制级）"
    meta: "linux-pci · endpoint DMA auxiliary resource"
    link: "https://lore.kernel.org/linux-pci/<20260828170932.2735807-1-den@valinux.co.jp>/"
    points:
      - label: "定位"
        text: "PCIe 端点设备侧 DMA 通道此前对 NTB 主机侧不可见。"
      - label: "做法"
        text: "endpoint 加 DMA auxiliary resource 元数据 → dwc 暴露 → epf-vntb 导出 → 主机侧发现 vNTB-embedded DMA，实现「vNTB 远程 DMA」。"
    relevance: "PCIe endpoint/NTB 场景，端点 DMA 复用点。"
  - type: highlight
    title: "virtio：映射层 API 收缩（DMB 系列）+ RX 卡死看门狗"
    meta: "virtio-dev / linux-kernel · 机制 + 新检测框架"
    link: "https://lore.kernel.org/linux-pci/<20260818211425.91009-1-graf@amazon.com>/"
    points:
      - label: "DMB"
        text: "Device Memory Buffer 让设备自有内存支撑 virtqueue，直指机密计算（免 swiotlb）与 vhost-user 隔离；virtio_map_ops 删除 sync 回调，操作数 9→6。"
      - label: "RX 看门狗"
        text: "virtio_net 首次给 RX 侧加卡死检测（hypervisor 漏中断 → 队列静默卡死，此前 TX 有 watchdog RX 是空白）。"
    relevance: "机密计算、vhost-user、virtio 网络稳定性。"
  - type: highlight
    title: "LSM：BPF 下发 Landlock 规则 + SELinux 拦 FOLL_FORCE"
    meta: "linux-security-module · 沙箱接口 + /proc/self/mem 加固"
    link: "https://lore.kernel.org/linux-security-module/<20260825-selinux-pokemem-v2-0-b46bc64916d8@google.com>/"
    points:
      - label: "Landlock × BPF"
        text: "让 BPF 程序直接应用 Landlock 规则集——沙箱规则从 syscall 路径接到 eBPF 生态，容器/卸载器可按 cgroup 动态下发。"
      - label: "FOLL_FORCE"
        text: "SELinux 对 /proc/self/mem 的强制读内省开始要求 PROCESS__PTRACE 权限，堵住绕过 ptrace 的进程内存自省路径。"
    relevance: "沙箱生态、安全加固、容器隔离。"
  - type: highlight
    title: "block：错误注入支持延迟 + blkdev 文件操作修复 v2"
    meta: "linux-block · 机制 + 修复"
    link: "https://lore.kernel.org/linux-block/<20260828-blkdev-fixes-v2-0-32f3f40cebed@columbia.edu>/"
    points:
      - label: "错误注入 delay_us"
        text: "block 错误注入框架扩展延迟能力，故障注入更贴近真实 IO 时序。"
      - label: "blkdev 修复"
        text: "七处竞态/语义修复：CONFIG_BUFFER_HEAD=n 的 mmap 写丢失、splice 读路径 i_rwsem 竞态、IOCB_ATOMIC 改为失败而非撕裂等。"
    relevance: "故障演练、块设备 I/O 正确性。"
  - type: highlight
    title: "arch：arm64 fixmap 页表只读化 + s390 命令行告警"
    meta: "linux-arch · 防御纵深 + 诊断"
    link: "https://lore.kernel.org/linux-arm-kernel/<20260827164409.3421848-6-ardb+git@google.com>/"
    points:
      - label: "fixmap 只读"
        text: "Ard Biesheuvel 把页表只读覆盖从 PTE 扩到中间级页表，fixmap 中间页表移入 .rodata——arm64 内存布局防御纵深。"
      - label: "s390 EBCDIC"
        text: "内核命令行含非可打印 EBCDIC 字符时告警，排查字符集转换错误。"
    relevance: "架构安全加固、s390 启动诊断。"
  - type: highlight
    title: "sched / rt：LLC 粒度缓存感知调度（RFC v2）+ sched/proxy 代理解析重构"
    meta: "lkml / linux-rt-devel · 调度机制"
    link: "https://lore.kernel.org/lkml/<20260827122816.756234-1-wujianyong@hygon.cn>/"
    points:
      - label: "LLC 聚合"
        text: "Hygon 23 篇把 cache-aware 聚合从固定 LLC 中心改为 LLC 粒度 + NUMA 距离序，hackbench 中位 +27.7%。"
      - label: "sched/proxy"
        text: "v3 把 donor 提交推迟到代理解析成功之后，消除大量废弃提交（proxy-mutex 压力测试实证）。"
    relevance: "调度拓扑感知、代理执行主线，RT/dl-server 语义。"
  - type: divider
    label: "📌 机制雷达：跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "Rust PCI capability/SR-IOV"
        text: "类型化 PCIe 能力查找 + SR-IOV 寄存器布局，nova vGPU 前置 · <a href=\"https://lore.kernel.org/linux-pci/<cover.1787830828.git.zhiw@nvidia.com>/\">原文</a>"
      - label: "Rust DRM KMS 抽象"
        text: "模式对象生命周期/属性/回调/帧缓冲的安全绑定，vino 验证驱动 · <a href=\"https://lore.kernel.org/dri-devel/<20260826163359.4998-1-mike@fireburn.co.uk>/\">原文</a>"
      - label: "HVO 泛化"
        text: "HugeTLB vmemmap 优化并入通用 sparse-vmemmap，删专属机制 · <a href=\"https://lore.kernel.org/linux-mm/<20260825084608.47437-1-songmuchun@bytedance.com>/\">原文</a>"
      - label: "virtio 映射层收缩"
        text: "DMB 系列删 virtio_map_ops sync 回调，操作数 9→6 · <a href=\"https://lore.kernel.org/linux-pci/<20260818211425.91009-1-graf@amazon.com>/\">原文</a>"
      - label: "LLC 缓存感知调度"
        text: "cache-aware 聚合改 LLC 粒度 + NUMA 距离序，23 篇 · <a href=\"https://lore.kernel.org/lkml/<20260827122816.756234-1-wujianyong@hygon.cn>/\">原文</a>"
      - label: "hfsplus → iomap"
        text: "常规文件 I/O 迁 iomap，去 buffer_head 直 IO 运动一环 · <a href=\"https://lore.kernel.org/linux-fsdevel/<20260826225614.486112-1-slava@dubeyko.com>/\">原文</a>"
      - label: "Landlock × BPF"
        text: "BPF 接口下发 Landlock 规则集，沙箱接到 eBPF 生态 · <a href=\"https://lore.kernel.org/linux-security-module/<apHN2WNQWeM9lzHc@zenbox>/\">原文</a>"
  - type: divider
    label: "🧭 合入状态（三镜像反查）"
    kind: section
  - type: paragraph
    text: >-
      对本周报道的重点补丁批量反查本地三镜像（mainline / linux-next / stable）：<strong>本周在途系列全部未合入 mainline、不在 linux-next 队列、未回移植 stable</strong>——符合 review/排队期规律（7.3 merge window 刚开，多数要落后续窗口）。两个例外值得记：<strong>HVO v5 已由 Andrew Morton 合入 mm.git 的 mm-new 暂存分支</strong>（主线排队中）；<strong>tcp UAF 修复已合入 net 修复树</strong>（5271b79b7ad6 / 385e474086c2，走 stable 预期）。未命中不排除 mid 变动/被后续版本取代，如实标注。
  - type: divider
    label: "📰 LWN 本周"
    kind: section
  - type: toc
    items:
      - label: "合并窗口"
        text: "The beginning of the 7.3 merge window · https://lwn.net/Articles/1089244/"
      - label: "Rust/块"
        text: "The \"rnull\" Rust block driver · https://lwn.net/Articles/1090378/"
      - label: "调度"
        text: "Using steal time to moderate CPU demands · https://lwn.net/Articles/1090381/"
      - label: "版本"
        text: "Development statistics for the 7.2 kernel · https://lwn.net/Articles/1088776/"
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
      - label: "FUSE"
        text: "FUSE status and plans · https://lwn.net/Articles/1086336/"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "vmemmap"
        text: "稀疏内存的页元数据（struct page 数组）；大页下它本身也是内存开销"
      - label: "HVO"
        text: "HugeTLB Vmemmap Optimization：大页 tail 页共享同一份 vmemmap，省元数据内存"
      - label: "sparse-vmemmap"
        text: "按 section 惰性填充的页表布局；HVO 泛化把去重能力下沉到这里"
      - label: "endpoint DMA"
        text: "PCIe 端点设备自身的 DMA 引擎；vNTB 远程 DMA 让其对 NTB 主机侧可用"
      - label: "vNTB"
        text: "虚拟 NTB：把端点设备模拟成 NTB 主机桥，跨主机共享 DMA 通道"
      - label: "iomap"
        text: "现代文件系统 I/O 映射框架，正逐步取代 buffer_head 直 IO 路径"
      - label: "buffer_head"
        text: "老式块缓冲描述结构；hfsplus/minix 等正迁离它"
      - label: "Landlock"
        text: "无特权可用的沙箱 LSM；本周讨论用 BPF 接口下发规则集"
      - label: "KMS"
        text: "DRM 内核模式设置（显示状态管理）；Rust 侧开始提供安全抽象"
      - label: "DMB"
        text: "Device Memory Buffer：virtio 设备自有内存支撑 virtqueue，面向机密计算"
  - type: closing
    tagline: "Rust 驱动批量落地、vmemmap 换轨、7.3 窗口开启——这一周的地基比楼多。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· LWN · 三镜像反查"
---
