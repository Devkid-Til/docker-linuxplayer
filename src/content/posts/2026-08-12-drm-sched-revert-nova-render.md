---
title: "GPU 调度策略翻车回滚，NVIDIA 开源驱动公开渲染节点"
date: "2026-08-12"
desc: "DRM 调度器 FAIR 策略确认翻车，19 补丁整包回滚并降级实验；NVIDIA Rust 驱动 nova 公开渲染节点。"
column: "daily"
tags: ["DRM", "mm", "net", "PCI", "fs", "sched", "LSM"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看两件事：<strong>DRM 调度器的公平策略翻车后，19 个补丁整包回滚</strong>，和 <strong>NVIDIA 的 Rust 驱动 nova 正式公开了渲染节点</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-12/cover.png"
    alt: "封面 · 8月12日 · DRM 调度器回滚 + nova 渲染节点"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "drm/sched FAIR 策略确认满载掉性能，19 补丁整包回滚 + 降级实验性"
      - label: "头条"
        text: "nova 公开渲染节点：NVIDIA Rust 驱动从内核模块走向用户态入口"
      - label: "机制"
        text: "CRASH_WIPE_SECRETS：kdump 崩溃转储前先擦掉密钥"
      - label: "机制"
        text: "fscrypt 标准化到 blk-crypto；memcg 移除 v1 soft limit"
      - label: "机制"
        text: "Landlock 加 tracepoint；sched proxy execution 推至 v31"
      - label: "亮点"
        text: "mm 报 UFFDIO_COPY shmem killpriv 提权；net 的 io_uring zcrx 拆缓存行"
      - label: "亮点"
        text: "PCI P2PDMA 修 ACS 出口控制；fs 的 coredump 稀疏化协议"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: 满载掉性能的 GPU 调度策略：不修了，整包回滚
    meta: "〔08-12 00:31 北京〕· [PATCH v3 00/19] Revert switching default DRM scheduler policy to fair"
    points:
      - label: "现状"
        text: "drm/sched 是所有 GPU 驱动（AMD/NVIDIA/Intel/Mali 各家）共享的内核作业调度器——谁先谁后、多引擎怎么分，它说了算。它原本用一套简单策略，最近被切到了新的 FAIR 公平调度（按 min_vruntime 权值排队，思路类似 CPU 的 CFS）。"
      - label: "痛点"
        text: "切换后 AMD RX 9070 XT 在最大 GPU 负载下出现严重性能退化（昨天日报已报过这个回归）——满载时不仅没公平，反而整体掉帧。"
      - label: "方案"
        text: "今晨作者连发到 v3 的回滚系列（19 补丁），把 drm/sched 默认策略改回原路径，横跨 amdgpu/panfrost/panthor/msm/xe/nouveau/lima/etnaviv/v3d/imagination/ethosu/rocket/amdxdna 全部驱动；并配套 Ensure monotonic min_vruntime 修掉 fair 调度的单调性缺陷，把 FAIR 标记为实验性（experimental）不再作默认。"
      - label: "为什么"
        text: "fair 策略的 run queue 简化与 min_vruntime 单调性问题在高负载下集中爆发，与其带病作默认，不如整体回滚到成熟路径；降级实验性而非删除，保留继续打磨的空间。"
      - label: "效益"
        text: "AMD 系显卡满载性能立刻恢复正常；其他 GPU 驱动不再背负 fair 的潜在调度问题；回滚也给 fair 的重做留了干净基线。"
      - label: "下一步"
        text: "fair 会以实验性身份重做，先补 min_vruntime 单调性与多引擎公平语义；这次的教训将影响 drm/sched 未来任何策略切换的验证流程。"
    verdict: "一条调度策略改动牵动全部显卡驱动，最终以整包回滚收场——机制改小步验证，比功能本身更重要。"
    link: "https://lore.kernel.org/dri-devel/<20260811163139.99746-1-tvrtko.ursulin@igalia.com>/"
  - type: headline
    title: nova 公开渲染节点：NVIDIA Rust 驱动终于有用户态入口
    meta: "〔08-11 13:07 北京〕· [PATCH v4 0/7] gpu: nova: Export parameters from nova-core to nova-drm"
    points:
      - label: "现状"
        text: "nova 是 NVIDIA 用 Rust 重写的新一代开源 GPU 驱动（昨天讲了它的 PRAMIN 显存窗口）。此前 nova 只有内核侧的 nova-core 模块，没有对用户态的完整设备接口。"
      - label: "痛点"
        text: "光有内核内存管理还不够——用户态（Mesa/运行时）得能打开设备、查 GPU 参数、知道显存多大，驱动才算「可用」，否则只是内核内部的研究件。"
      - label: "方案"
        text: "v4 系列把 nova-core 的公共 API 暴露给 nova-drm，完成 DRM 设备注册：暴露 render node、新增 GPU info ioctl（返回 chipid 与可用 VRAM 大小）、从 nova-core 读取 VRAM_BAR_SIZE 参数，7 补丁成套落地。"
      - label: "为什么"
        text: "nova-core（Rust 内存/窗口抽象）与 nova-drm（DRM 设备封装）分层——DRM 侧只做注册与 ioctl 透传，复用已建好的 Rust 抽象，不让 C 侧重复实现设备内存逻辑。"
      - label: "效益"
        text: "nova 首次具备用户态入口：render node 意味着非特权进程将来也能打开设备，Mesa 的 nova 后端可以开始对接真实硬件。"
      - label: "下一步"
        text: "离能跑 Vulkan/GL 还差渲染提交、命令缓冲与 fence 路径；Mesa 侧对接与 Blackwell 硬件验证是并行推进的关键。"
    verdict: "从「内核自嗨」到「用户态入口」——render node 是 nova 从研究项目变成可用驱动的临门一脚。"
    link: "https://lore.kernel.org/dri-devel/<20260811050657.646799-1-apopple@nvidia.com>/"
  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "kdump 前擦密钥"
        text: "CRASH_WIPE_SECRETS：崩溃转储前擦掉 keys/dm-crypt/crypto context/secretmem 里的密钥，防内存转储泄漏敏感数据（v2 13 补丁）· <a href=\"https://lore.kernel.org/linux-mm/<20260811-crash-zeroize-rework-v2-0-9561d13c2340@jaseg.de>/\">原文</a>"
      - label: "fscrypt 标准化"
        text: "文件系统加密统一到 blk-crypto（块层硬件加密接口），让加密能卸载到支持加密的存储设备（v3 17 补丁）· <a href=\"https://lore.kernel.org/linux-fsdevel/<20260811180413.GA2895176@google.com>/\">原文</a>"
      - label: "memcg 瘦身"
        text: "移除 cgroup v1 的 soft limit（软限制）整套机制——v1 遗留复杂度清账，为 v7.4 合并窗口准备（for-7.4 9 补丁）· <a href=\"https://lore.kernel.org/linux-mm/<20260811203203.3456029-1-shakeel.butt@linux.dev>/\">原文</a>"
      - label: "Landlock 可观测"
        text: "给无特权沙箱 Landlock 加 tracepoint：规则拒绝、domain 建立、enforce 决策全部可见可审计（v4 19 补丁）· <a href=\"https://lore.kernel.org/linux-security-module/<20260811094338.288094-1-mic@digikod.net>/\">原文</a>"
      - label: "proxy execution"
        text: "调度器代理执行推进到 v31：用伙伴线程代跑持锁线程，处理休眠持锁 owner，剑指优先级反转· <a href=\"https://lore.kernel.org/lkml/<CANDhNCp58SJPNYW_dkYSbKvwoci+9sD6w1SGutB4NYVjgFUW1g@mail.gmail.com>/\">原文</a>"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: AMD 把 HDMI 2.1 的 VRR 与 ALLM 补进内核（v3）
    meta: "〔08-11 08:38 北京〕· [PATCH v3 0/4] HDMI 2.1 VRR and ALLM support"
    points:
      - label: "定位"
        text: "drm/edid + amd/display——从 EDID 的 HF-VSDB 块解析 HDMI 2.1 游戏特性，落到 AMD 显示驱动的 FreeSync/VRR/ALLM 支持。"
      - label: "做法"
        text: "v3 四连：解析 HF-VSDB 里的 ALLM/VRR 能力位、2.1 FreeSync 支持 AMD VSDB、HDMI VRR 与 ALLM 落地，并补 HDMI ALLM 支持。"
      - label: "效益"
        text: "HDMI 2.1 游戏显示器在 AMD 显卡上能真正吃到 VRR（防撕裂）与 ALLM（低延迟）——跟上周那篇 HDMI 2.1 系列是同一战线的延续。"
    relevance: "打游戏接 HDMI 2.1 显示器的读者，这就是「内核让显示器特性生效」的一线进展。"
    link: "https://lore.kernel.org/dri-devel/<20260811003921.1398292-1-jerry.zuo@amd.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20260811171011.184964-1-mwen@igalia.com>/"
        text: "drm/atomic：不活动 colorops 禁止改动，色彩管线状态更严谨（v4 11 补丁）"
        time: "08-12 01:11"
      - link: "https://lore.kernel.org/dri-devel/<20260811-fix-fops-owner-v10-0-7e71776f9dbe@linux.dev>/"
        text: "Rust 补全 fops.owner：drm/misc/configfs 抽象统一从驱动模块指针设 owner（v10 10 补丁）"
        time: "08-11 14:41"
      - link: "https://lore.kernel.org/dri-devel/<20260811204842.877616-1-taimuraz@kaitmazov.com>/"
        text: "amdxdna 拒绝 I/O 内存映射导入的 BO，堵防越界路径（3 补丁）"
        time: "08-12 04:46"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: mm 又报提权：UFFDIO_COPY 对 shmem 的 killpriv 绕过
    meta: "〔08-12 00:16 北京〕· Fwd: BadBunny: UFFDIO_COPY shmem killpriv bypass leading to local privilege escalation"
    points:
      - label: "定位"
        text: "userfaultfd 的 UFFDIO_COPY 拷贝操作 + shmem（共享内存文件）的 killpriv（清特权位）逻辑——两者交互出现绕过。"
      - label: "做法"
        text: "漏洞讨论：UFFDIO_COPY 在 shmem 上可绕过 killpriv，导致本地提权（BadBunny 命名）；社区正在跟踪成因与修复口径。"
      - label: "下一步"
        text: "等待官方修复落点——涉及 userfaultfd 与 shmem 语义的补丁会进稳定分支，跑虚拟化/沙箱的读者注意升级。"
    relevance: "提权类漏洞是安全红线的重头，userfaultfd 又是虚拟化常用通道——值得盯 CVE 落点。"
    link: "https://lore.kernel.org/linux-mm/<CAGBKPgPanzn8WuHK1hm44FLCXwJcnk7W=J6b17D9UzScWW7SJQ@mail.gmail.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<ac29dd48-c150-454f-a3ed-d5971db10f19@kernel.org>/"
        text: "mm/vma 用匿名 pgoff 追踪 MAP_PRIVATE 文件映射，VMA 合并语义收口（v4 20 补丁）"
        time: "08-12 00:44"
      - link: "https://lore.kernel.org/dri-devel/<u457qwrnkaquvqfn4op2a4wcdflm6d4gzut5ii4ialbeqjiyfj@qpn5fu5kwn4z>/"
        text: "mm 引入 hw_pte_t 让通用 PTE 接口可见硬件页表类型，跨架构重构（9 补丁系列）"
        time: "08-11 17:48"
      - link: "https://lore.kernel.org/linux-mm/<20260811025157.1632867-1-riel@surriel.com>/"
        text: "gup 批量化 follow_page_mask()：同 folio 连续 PTE 一次抓引用（RFC v3 8 补丁）"
        time: "08-11 10:53"
      - link: "https://lore.kernel.org/linux-mm/<20260811-work-coredump-sparse-v1-0-cd3e8b1e356d@kernel.org>/"
        text: "coredump 新增 COREDUMP_SPARSE 协议：套接字传输的转储支持稀疏空洞（v1 11 补丁）"
        time: "08-11 23:27"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: io_uring 零拷贝收包：把队列头尾拆到独立缓存行
    meta: "〔08-12 00:58 北京〕· [PATCH io_uring 02/16] io_uring/zcrx: move RQ head/tail to separate cache lines"
    points:
      - label: "定位"
        text: "io_uring 的 zcrx（零拷贝收包）路径——用户态直接收 DMA 进来的数据帧，绕过内核协议栈拷贝。"
      - label: "做法"
        text: "16 补丁系列里，把接收队列的 head/tail 指针拆到独立缓存行，配合页面池与批处理，减少多核争用。"
      - label: "效益"
        text: "高 PPS 收包场景的缓存行乒乓（false sharing）下降，零拷贝网络再快一档。"
    relevance: "网络性能优化是 datapath 读者的常青话题，零拷贝收包与 mm 的页池耦合点值得跟。"
    link: "https://lore.kernel.org/netdev/<70b36cb8-bcb3-400f-a3f6-d038bff88723@gmail.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/netdev/<20260811022448.116235-1-kuniyu@google.com>/"
        text: "neighbour 把 arp_tbl/nd_tbl 按网络命名空间化，全局邻居表拆细（v3 15 补丁）"
        time: "08-11 10:24"
      - link: "https://lore.kernel.org/netdev/<20260811085246.2267779-1-edumazet@google.com>/"
        text: "vlan 修 HW offload 切换时的 skb_under_panic 与竞态"
        time: "08-11 16:52"
      - link: "https://lore.kernel.org/netdev/<20260811195405.3979177-1-almasrymina@google.com>/"
        text: "net 阻止标准 payload 注入 devmem skb，零拷贝内存安全收口（v3 2 补丁）"
        time: "08-12 03:54"
      - link: "https://lore.kernel.org/netdev/<20260811085257.814556-1-horms@kernel.org>/"
        text: "nf_tables 连报两例：pipapo/rbtree 区间集行为不一致、netdev chain 误删"
        time: "08-11 18:22"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: P2PDMA 修 ACS 出口控制：17 补丁的隔离安全补课
    meta: "〔08-11 17:31 北京〕· [PATCH v3 00/17] PCI/P2PDMA: Fix ACS egress control handling"
    points:
      - label: "定位"
        text: "PCI 的 P2PDMA（设备间直通 DMA）层——校验 ACS（Access Control Services）隔离位，决定两设备能否安全地绕过内存直连。"
      - label: "做法"
        text: "v3 系列补齐 ACS egress control 处理：新增访问器、隔离检查纳入出口控制向量、直译 P2P 路由判定，并加 KUnit 覆盖（17 补丁）。"
      - label: "效益"
        text: "P2PDMA 的隔离判定与硬件 ACS 语义对齐——防止隔离不足的设备被误判可直连，堵住绕过宿主内存的安全口子。"
    relevance: "NVMe 直连、GPU 显存互拷这类 P2P 场景的读者，隔离判定直接影响能不能安全开。"
    link: "https://lore.kernel.org/linux-pci/<20260811-fix-p2p-acs-v3-0-efc488ee7c03@nvidia.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<20260811155022.108148-1-zhangyu1@linux.microsoft.com>/"
        text: "Hyper-V 半虚拟化 IOMMU：Linux guest 拿 para-virt 设备直通能力（v3 5 补丁）"
        time: "08-11 23:50"
      - link: "https://lore.kernel.org/linux-pci/<CADoo8uyrmw_GkNgNf+bV_pieYN_gn5i49rOF8jUvSsfPOcqCJA@mail.gmail.com>/"
        text: "Pericom PI7C9X2G608 缺 ACS quirk，开 IOMMU 时弄坏 Renesas USB3 卡"
        time: "08-11 09:01"
      - link: "https://lore.kernel.org/linux-pci/<20260811164640.587078-1-vidyas@nvidia.com>/"
        text: "PCI 补 DEV3 14-bit Tag：链路离开 Flit 模式时清残留使能位（V2 4 补丁）"
        time: "08-12 00:47"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: coredump 稀疏化：转储协议学会描述「空洞」
    meta: "〔08-11 23:27 北京〕· [PATCH 00/11] coredump: allow to create sparse coredumps on the coredump socket"
    points:
      - label: "定位"
        text: "fs 的 coredump 层——进程崩溃时把内存镜像写到 coredump 文件/套接字，是故障排查的命根子。"
      - label: "做法"
        text: "新系列给 coredump 套接字协议加 COREDUMP_SPARSE 协商：转储里未使用页不填零，而是记录「空洞」，配套 COREDUMP_HEADER 帧头（11 补丁）。"
      - label: "效益"
        text: "大内存进程的转储体积骤降，落盘/传输快得多——稀疏转储对嵌入式与容器场景尤其友好。"
    relevance: "做故障排查、跑大内存服务的读者，转储变小直接省磁盘与传输时间。"
    link: "https://lore.kernel.org/linux-mm/<20260811-work-coredump-sparse-v1-0-cd3e8b1e356d@kernel.org>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-fsdevel/<20260811031538.2782906-1-syhuang.nju@gmail.com>/"
        text: "eventpoll 给 eventfd 加无锁快速路径（RFC）"
        time: "08-11 11:15"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260811045350.164272-1-libaokun@linux.alibaba.com>/"
        text: "fuse 拒绝重复的 fd= 挂载选项"
        time: "08-11 12:53"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "drm/sched FAIR"
        text: "GPU 作业调度器的公平策略（按 min_vruntime 权值排队）；作默认后满载掉性能，已回滚为实验性。"
      - label: "render node"
        text: "DRM 的用户态渲染节点（/dev/dri/renderD*），非特权进程可打开，承载 GPU 渲染/计算 ioctl。"
      - label: "killpriv / UFFDIO_COPY"
        text: "mmap 私有文件的清特权位逻辑；UFFDIO_COPY 是 userfaultfd 的页拷贝操作，二者交互出现提权绕过。"
      - label: "blk-crypto"
        text: "块层硬件加密接口——存储设备自带加密时，文件系统加密（fscrypt）可卸载给它。"
      - label: "kdump"
        text: "内核崩溃时用保留内存启动转储内核抓现场；CRASH_WIPE_SECRETS 保证转储前擦掉密钥。"
      - label: "proxy execution"
        text: "调度器代理执行：用伙伴线程代跑持锁线程，解决优先级反转；已推进到 v31。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
