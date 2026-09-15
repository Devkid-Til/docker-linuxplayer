---
title: "内核想接管 fd 的生死，Linus 说不；VMA 标志的 40 帖重构进了 mm 树"
date: "2026-09-16"
desc: "Christian Brauner 用 50 帖证明 fd 可以推迟到系统调用出口统一安装与回滚，Linus 与 Jann Horn 当场反对（改用 task_work，或干脆忽略 put_user 失败）；Lorenzo 消除 VM_SPECIAL 的 40 帖被 akpm 收进 mm 树；另有 Rust 首次拿到 PCI SR-IOV 抽象、DP2.1 ALPM 18 帖、SMMUv3 PRI 15 帖、V4L2 为编码器 ROI 引入新控制类型。"
column: "daily"
tags: ["mm", "Rust", "media", "DRM", "PCI", "net", "fs", "block", "LSM", "sched"]
blocks:
  - type: hook
    text: >-
      今天的内核列表绕着一个词转：<strong>收尾</strong>。文件描述符的安装与回滚，该不该推迟到系统调用出口统一处理——Christian Brauner 用 50 帖做了完整证明，Linus 当场回「我一点也不喜欢」。而在内存这边，<strong>把四类互不相干的性质搅在一起的 VM_SPECIAL 掩码</strong>，正被 40 帖拆成一组「说行为」的谓词，已被 akpm 收进 mm 树。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-16/cover.png"
    alt: "封面 · 9月16日 · 内核想接管 fd 的生死，Linus 说不"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "fd 的安装与回滚要不要推到系统调用出口？50 帖 RFC 撞上 Linus 的反对"
      - label: "头条"
        text: "VM_SPECIAL 退场：VMA 标志改成 40 帖谓词（v2），已被收进 mm 树"
      - label: "Rust"
        text: "Rust 第一次拿到 PCI SR-IOV 抽象，还自带 C↔Rust 跳板（14 帖）"
      - label: "media"
        text: "V4L2 为编码器 ROI 引入新控制类型，一次先把 V4L2_CTRL_TYPE_S8 补上（v6·5 帖）"
      - label: "media"
        text: "红外子系统 rc core 的 20 帖锁重构：ABBA 死锁、bpf 与注销竞争"
      - label: "DRM"
        text: "i915 把 ALPM 从 eDP 扩到 DP2.1（v6·18 帖）"
      - label: "DRM"
        text: "KMS 的 crtc reset 钩子要整个删掉（v5·11 帖）"
      - label: "PCI"
        text: "SMMUv3 补上 PRI 队列与 IOPF 故障处理（v5·15 帖）"
      - label: "net"
        text: "vxlan 配置转向 RCU，dump 不再抢 RTNL（v4·8 帖）"
      - label: "机制"
        text: "sched_ext 拿到惰性抢占；LSM 边界之争重启"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "fd 的安装与回滚，该不该推到系统调用出口？Linus：我一点也不喜欢"
    meta: "〔09-15 19:31 北京〕· [PATCH RFC POC 00/50] file: handle files on syscall exit"
    link: "https://lore.kernel.org/dri-devel/<20260915-work-fd-reserve-unify-folded-v1-0-4d5217d6b246@kernel.org>/"
    points:
      - label: "现状"
        text: >-
          fd（文件描述符）的分配与安装一直是就地完成的两步：内核先用 get_unused_fd_flags() 占一个号，业务逻辑跑完后调 fd_install() 把 file 挂上去。中间任何一步失败，都得由调用者手写一段回滚——把刚占的号还回去、把刚建的 file 释放掉。
      - label: "痛点"
        text: >-
          真正的麻烦不是回滚本身，而是顺序。fd 一旦安装就暴露给用户态了，而安装之后往往还有 copy_to_user() 这类会失败的动作——失败就得把已经可见的 fd 再抠回来，这是个很容易写出安全 bug 的位置。dma-buf 的 sync_file、KVM 的 guest_memfd、vfio 的 migration fd、io_uring 的导出描述符都在这条线上，而且每个子系统各写各的回滚，写法还不一样。
      - label: "方案"
        text: >-
          v1 把这套时序整体倒过来：fd_prepare() 只占号并把槽位记在 task 上，fd_stage() 把 file 绑到槽位并把号交给用户态；<strong>系统调用返回成功，出口路径统一安装所有已 stage 的 file；返回错误，统一丢弃槽位与 file</strong>。task 内联两个槽位，SCM_RIGHTS 这类多描述符场景再挂一个溢出数组。50 帖里有一大半是给每个架构的 entry.S / ptrace.c 加出口钩子（alpha、ARC、ARM、arm64、csky、hexagon、m68k、microblaze、MIPS、nios2、openrisc、parisc、sh、sparc、um、xtensa 全在列），其余把 drm、dma-buf、KVM、vfio、iommufd、io_uring、perf、seccomp、iio 的手工收尾逐个删掉。
      - label: "为什么"
        text: >-
          作者说这个想法「放了很久，一直没放下」，属于探索性 RFC——「哪怕只是说明用途也要发到列表上一次」。他看重的是调用者能随时把号交给用户态、随时建 file、随时返回错误，不用再展开回滚。没有走 task_work，是因为目标是让错误路径在 syscall 出口被架构代码统一看见。
      - label: "效益"
        text: >-
          106 个文件、962 增 861 删。收益是「先安装、再可能失败」这个边界从根上消失；代价是每个架构的底层汇编入口都要多出一段。
      - label: "下一步"
        text: >-
          Linus 的意见直接：<strong>「我一点也不喜欢，完全不喜欢」（I am not a fan. At all.）</strong>——这增加了复杂度而不是减少，而且加在了最不该变复杂的底层架构汇编里，diffstat 还净增一百行。Jann Horn 给了两条替代路线：用 task_work 而不是直接改 entry/exit 路径；或者改变策略，遇到 put_user() 写不进去就「当它成功了继续跑」。Linus 回帖认可后一条，还翻出 kernel/fork.c 里现成的两处不检查 put_user() 返回值的先例。所以这个 RFC 大概率不会以现在这个形态落地，但它把「fd 生命周期该谁管」这个老话题重新摆上了台面。
    verdict: "值得读的是这场争论本身：同一个「消除重复回滚」的目标，一条路往入口汇编里加钩子，另一条把错误当噪音忽略掉——Linus 选了后者。"
  - type: headline
    title: "VM_SPECIAL 退场：把「说不清」的 VMA 标志，换成一组建模行为的谓词"
    meta: "〔09-15 15:28 北京〕· [PATCH v2 00/40] mm: make VMA flag semantics explicit, eliminate VM_SPECIAL"
    link: "https://lore.kernel.org/dri-devel/<20260914-b4-mmap-prepare-vma-flag-sanify-v2-0-7d9781ed5361@kernel.org>/"
    points:
      - label: "现状"
        text: >-
          每个 mmap 出来的 VMA（虚拟内存区域）身上都挂着一堆标志位。其中 VM_SPECIAL / VMA_SPECIAL_FLAGS 不是单个标志，而是一个掩码，把四类互不相干的性质混在一起：这块内存是不是内核自己拥有的（MMIO、内核分配的页、驱动自己映射的页）；能不能被 expand / merge；是不是 mlock 那种「迁移可能竞争」的怪情况；以及只想拦住 GUP 的情况。
      - label: "痛点"
        text: >-
          混在一起的后果是没人能对标志做可靠推断——看到 VMA_IO_BIT 不能假设这是 IOMMU 映射，因为驱动在滥用它、mlock 也在滥用它；hugetlb 会设 VMA_DONTEXPAND_BIT，但它并不想被当成 special；THP 对 special 的定义又是另一套（认 PFN map 和 mixed map，不认 DAX）。作者的原话是「这一团相当乱」，驱动作者经常被搞糊涂。
      - label: "方案"
        text: >-
          40 帖做两件事。一是<strong>收紧驱动能做的事</strong>：确立不变量——只有内核拥有的映射才允许在 mmap 钩子里设 VMA_IO_BIT 或清 VMA_MAYWRITE_BIT，并在每次 mmap / mmap_prepare 钩子之后校验 VMA 状态；为此把 usbmon 与 sg 迁到 mmap_prepare，新增一个「映射离散内核页」的 mmap action，让 hfi1 和 ALSA PCM status page 改成提前映射。同时确立「映射内核内存必须置 VMA_MIXEDMAP_BIT」的不变量，把 defio、cmt_speech、uprobes、bpf arena 几处漏网的补上。二是<strong>把标志测试换成谓词</strong>：vma_is_kernel_owned()（谁管生命周期）、vma_is_fixed_mapping()（不许扩不许并）、vma_is_persistent()（写进去的还在）、vma_can_merge()、vma_can_gup()（GUP 能不能取页）。散在 mm 各处的 VMA_IO_BIT / VMA_PFNMAP_BIT / VMA_MIXEDMAP_BIT 原始判断一并换掉，THP 那个一直让人困惑的 vma_is_special_huge() 直接删除。
      - label: "为什么"
        text: >-
          选择「用谓词替代标志位」而不是「重新分配标志位」——谓词描述的是行为，读代码的人不必知道标志位的历史包袱；而且谓词能随语义演化，标志位一旦定义就会被驱动甚至 UAPI 固化下来。
      - label: "效益"
        text: >-
          驱动作者第一次能读到「这段代码在检查什么」，而不是「这段代码在检查哪个 bit」；内核拥有映射的边界也被强制化，减少滥用 VMA_IO_BIT 这类隐患。代价是 1153 增 582 删、40 个补丁要逐个过。
      - label: "下一步"
        text: >-
          Andrew Morton 已经收进 mm 树（All queued up, thanks.），同时留了一句很实在的评审意见：「补丁太多了，评审很薄，而且我不指望会改善多少——大量『无功能变化』的改动。也许你可以标出希望评审重点看哪几个补丁？」对想参与内核的人来说这是个直接的机会点：这 40 帖里哪些是真语义变更、哪些只是机械重命名，现在还没人系统梳理过。
    verdict: "标准的「把隐式约定变成显式谓词」的重构——价值不在于改了什么行为，而在于让后来的人不用再靠猜。"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "DAMON 多了一种筛法：按「背后是不是指定尺寸的大页」过滤访问"
    meta: "〔09-15 22:34 北京〕· [PATCH 0/8] mm/damon: introduce hugepage_size probe filter"
    points:
      - label: "定位"
        text: "DAMON 是内核的数据访问监控框架，probe filter 决定「哪些访问才值得记录」。此前能按地址范围、NUMA 节点等条件筛，但没法按「这块内存背后是不是指定尺寸的大页」筛——而这恰好是判断大页用得值不值的关键维度。"
      - label: "做法"
        text: "新增 probe filter 类型 hugepage_size，语义与 DAMOS 里同名的 filter 对齐：只对背后是给定尺寸区间大页的内存生效。系列 8 帖。"
      - label: "下一步"
        text: "作者同日还发了一版 RFC v3（同样 8 帖），两条路线并行。作者提到自动评审工具 Sashiko 只挑出一个文档语法错，认为不值得为此重发。"
    relevance: "在做 THP / hugetlb 调优或写 DAMON 策略的话，这条可以直接用上——不必再自己轮询 /proc 再去和访问热力做关联。"
    link: "https://lore.kernel.org/linux-mm/<20260915143359.91472-1-sj@kernel.org>/"
  - type: highlight
    title: "被硬件毒化的页，不该跟着 kexec 一起进下一个内核"
    meta: "〔09-15 20:54 北京〕· [PATCH v5 0/9] mm/memory-failure: keep hardware-poisoned pages out of the next kexec"
    points:
      - label: "定位"
        text: "memory-failure 层要把「硬件报告不可用」的页标记出来，避免继续分配。但 kexec 换内核时，这份脏页记录没有传递给下一个内核——新内核会把毒页当成好页用。"
      - label: "做法"
        text: "v5 共 9 帖，把毒页信息跨 kexec 边界保留下来，让下一个内核知道哪些物理页不能用。"
      - label: "效益"
        text: "崩溃转储 / 快速重启这类「换内核不换硬件」的场景里，避免新内核反复踩同一批坏页。"
    relevance: "如果你维护 RAS、内存热插拔或者崩溃恢复流程，这是直接影响可靠性的那一类改动。"
    link: "https://lore.kernel.org/linux-mm/<20260915-hwpoison-kho-v5-0-3bc7a57bd503@debian.org>/"
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "Rust 第一次拿到 PCI SR-IOV：还顺手修好了 C 与 Rust 驱动互相调用的问题"
    meta: "〔09-16 04:57 北京〕· [PATCH 00/14] Add Rust PCI SR-IOV support"
    points:
      - label: "定位"
        text: "SR-IOV 让一个 PCIe 物理功能（PF）切出多个虚拟功能（VF）分给不同驱动。Rust 驱动此前完全没有这层能力，更麻烦的是 PF 与 VF 要共享数据，而 VF 驱动可能是 C 写的——共享数据必须在 C 代码持有期间仍然有效，这在 Rust 的所有权模型下不好表达。"
      - label: "做法"
        text: "14 帖分三块：给 pci::Driver 补上 SR-IOV 能力（enable/disable_sriov、is_physfn、is_virtfn、num_vf、sysfs 的 sriov_configure 回调、驱动移除时托管 VF 下线）；新增<strong>带类型的 PF 注册数据</strong>与一套 C↔Rust FFI 描述符 + 自动生成的跳板（trampoline），Rust 的 VF 直接借用这份数据，C 的 VF 走 ABI 校验过的描述符；最后把注册接进 nova-core（NVIDIA GPU 的 Rust 驱动），并补上文档说明借用生命周期与拆卸顺序。"
      - label: "下一步"
        text: "系列建立在 Peter Colberg 的 Rust PCI SR-IOV v3 与 Danilo Krummrich 的 Rust vGPU/VFIO 原型之上。因为 Rust/VFIO 的路线还在吵，作者特意同时提供了 C 和 Rust 两个 VF 驱动样例，两条路都留着。"
    relevance: "这是 Rust for Linux 往「能写真实复杂驱动」迈的一步——FFI 跳板这套机制，之后写别的跨语言驱动也会复用。"
    link: "https://lore.kernel.org/rust-for-linux/<20260915205659.76841-1-zhiw@nvidia.com>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "V4L2 为视频编码器加了 ROI：先补一个新控制类型 V4L2_CTRL_TYPE_S8"
    meta: "〔09-16 06:00 北京〕· [PATCH v6 0/5] Implement Region of Interest(ROI) support"
    points:
      - label: "定位"
        text: "编码器可以对画面不同区域用不同的量化参数（QP），把码率花在人眼在意的地方。V4L2 此前没有表达「逐宏块 delta QP」的手段，也只能传无符号值——而 delta QP 是要取负的。"
      - label: "做法"
        text: "新增两个自定义控制：V4L2_CID_MPEG_VIDEO_ROI_MB_DELTA_QP（带 payload 的数组）与 ROI_MB_SIZE；因为要传有符号字节，系列先补上 V4L2_CTRL_TYPE_S8 这个新的控制类型，再在其上实现 ROI。驱动侧先在 Qualcomm iris 编码器落地。"
      - label: "效益"
        text: "用户态可以一次性下发整帧的逐宏块 QP 偏移。评审者 Hans 前几轮反馈集中在数组化、帧分辨率不按 MB 对齐的处理，v6 已按这些意见重做。"
    relevance: "做相机/编码器链路的话，这是 UAPI 层面的新增能力——新控制类型 S8 后续还会被别的驱动复用。"
    link: "https://lore.kernel.org/linux-media/<20260915-enc_roi_enable-v6-0-29dd4c8bccff@oss.qualcomm.com>/"
  - type: highlight
    title: "红外遥控子系统 20 帖锁重构：一个 ABBA 死锁、一处 bpf 与注销的竞争"
    meta: "〔09-15 16:33 北京〕· [PATCH v5 00/20] media: Fix locking issues in rc core"
    points:
      - label: "定位"
        text: "media 的 rc（红外遥控）核心把 keymap、设备注册、定时器、bpf 钩子混在几把粗锁下面，既有 ABBA 死锁，也有「设备已注销但定时器还在重新武装」这类生命周期问题。"
      - label: "做法"
        text: "20 帖把锁拆细，修掉 ABBA 死锁、补上 keymap 缺失的加锁、解决 bpf(BPF_PROG_ATTACH) 与设备注销之间的竞争，并用 timer_shutdown_sync() 关掉注销后重装定时器的窗口；另外顺手清理了一批未用结构体字段、给 ir_toy / meson-ir-tx 补上载波范围校验（后者修的是除零）。"
      - label: "下一步"
        text: "作者在 changelog 里明确写了「修复 Sashiko 和 claude 找到的问题」——自动评审工具已经进入这类子系统的常规流程。"
    relevance: "典型「新人可接手」的子系统维护工作：问题明确、范围清晰、评审响应快。"
    link: "https://lore.kernel.org/linux-media/<cover.1789460680.git.sean@mess.org>/"
  - type: highlight
    title: "当天 media 最大的动静不是新功能，而是一批 remove 错误路径的清理"
    meta: "〔09-15 15:45–22:24 北京〕· 多个作者"
    points:
      - label: "定位"
        text: "驱动 remove() 与 probe 失败路径上的资源清理（运行时 PM 引用计数、控制 handler、video device 注销、保留内存、工作队列）长期是媒体驱动最容易出错的地方。"
      - label: "做法"
        text: "当天集中出现一批同类补丁：一位贡献者在 linux-media 上提交了 20 余条（alvium-csi2、ov2740、t4ka3、vgxy61、tw686x、mediatek vpu/vcodec、mtk-mdp3、atmel-isi、dm1105、ti omap 等），而 media 共同维护者 Sakari Ailus 也亲自在修 i2c 传感器一侧（imx290、gc0308、ov13b10 等）。DRM 那边当天也有同形态的清理（drm/virtio GEM 泄漏、fbdev 的 write-combining 释放、gma500 的 MSI/IRQ 状态）。"
      - label: "效益"
        text: "单条都很小，但合起来说明一件事：热插拔相机、反复 rmmod/insmod 这类场景下的泄漏在被系统性地补。"
    relevance: "写驱动的读者可以把这批补丁当「错误路径清单」看——它列出的正是最常被漏掉的那几个释放点。"
    link: "https://lore.kernel.org/linux-media/<20260915085903.2337086-1-lgs201920130244@gmail.com>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "i915 把 ALPM 从 eDP 扩到 DP2.1：18 帖补齐链路上的时间参数"
    meta: "〔09-16 02:39 北京〕· [PATCH v6 00/18] Enable DP2.1 alpm"
    points:
      - label: "定位"
        text: "ALPM（Advanced Link Power Management）让显示链路在空闲时进入低功耗，靠 LFPS 信号而不是 AUX 通道唤醒。此前的实现只覆盖 eDP，DP2.1 的链路时序不同（LTTPR、UHBR 速率、新的 wake time 计算）。"
      - label: "做法"
        text: "18 帖全部在 i915 显示侧：补 DP2.1 的 ALPM DPCD 定义、把 sink 能力读取拆成独立函数、重做 auxless wake time 计算、改成表驱动的建立周期、重算 LFPS 半周期与周期计数、给 LT PHY 打开 MAC 侧 LFPS 发送、把 has_alpm 从 PSR2/LOBF 解耦。"
      - label: "效益"
        text: "为 Xe3p 平台支持 DP2.1 ALPM 铺路；最后一帖明确禁止 UHBR 链路上使用 ALPM。"
    relevance: "显示功耗是笔电续航的大头，这类改动最终会体现在你能测到的待机电流上。"
    link: "https://lore.kernel.org/dri-devel/<20260915180449.277933-1-animesh.manna@intel.com>/"
  - type: highlight
    title: "KMS 的 crtc reset 钩子要被整个删掉：两个角色本来就不该共用一个函数"
    meta: "〔09-15 22:24 北京〕· [PATCH v5 00/11] drm/crtc: Convert all drivers to atomic_create_state and remove reset"
    points:
      - label: "定位"
        text: "drm_crtc_funcs 的 reset 钩子身兼两职：probe 时创建初始软件状态，以及 suspend/resume 时重置软硬件状态。这两个角色的要求完全不同，而且 reset 不可失败，让初始状态分配的错误处理很难写。"
      - label: "做法"
        text: "绝大多数实现（以及所有 helper）其实只重置软件状态，行为上等价于 atomic_create_state——那就把这件事挑明：新的 atomic_create_state 只分配并初始化一份干净状态，无副作用，返回状态指针或 ERR_PTR。11 帖把所有 CRTC 驱动树内迁移过去，然后从 struct drm_crtc_funcs 里彻底删掉 reset。tilcdc 和 loongson 两家的 reset 里混了真实硬件复位逻辑，被挪到 CRTC 创建路径。迁移用了 Coccinelle 语义补丁加手工调整。"
      - label: "下一步"
        text: "这是 Maxime Ripard「把所有 KMS 对象的 reset 钩子删掉」计划的一部分——plane 那批已经做完了。"
    relevance: "对写 DRM 驱动的人，这是接口层面的强制迁移；对读代码的人，以后不必再猜 reset 到底会不会碰硬件。"
    link: "https://lore.kernel.org/dri-devel/<20260915-drm-no-more-crtc-reset-v5-0-bda007735748@kernel.org>/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "SMMUv3 补上 PRI：设备缺页第一次能走 IOMMU 的页请求通道"
    meta: "〔09-16 00:39 北京〕· [PATCH v5 00/15] iommu/arm-smmu-v3: Add PRI support"
    points:
      - label: "定位"
        text: "PRI（Page Request Interface）让设备在缺页时向 IOMMU 发请求，由内核补上映射而不是直接失败。arm-smmu-v3 驱动此前既不处理 PRI 队列上的事件，也不响应 IOPF（IO 页错误）。"
      - label: "做法"
        text: "15 帖把 PRI 页请求转成 iopf_fault，并下发 CMDQ_OP_PRI_RESP 回应。难点在 iopf_queue_flush_dev() 的契约要求：驱动必须先排空硬件 PRI 队列，再用线程化 IRQ 同步。因此相比 v1 多出 arm_smmu_wait_for_queue_drained()（靠计数线程化 IRQ 消费了多少条来确认排空）、把 arm_smmu_attach_release() 的拆卸移出全局锁、以及最后 flush 之前补一次 synchronize_irq() 收口。"
      - label: "下一步"
        text: "Q_POS()、Q_DIFF() 和排空等待这几个 helper 会和另一份 RPM 系列共用，作者说 CMDQ 之后也会用上。"
    relevance: "共享虚拟地址（SVA）、设备端缺页、GPU/加速器的按需换页都走这条路——是 IOMMU 侧比较硬的一块地基。"
    link: "https://lore.kernel.org/linux-pci/<cover.1789446520.git.nicolinc@nvidia.com>/"
  - type: highlight
    title: "M.2 蓝牙不再靠「运行时造一个设备树节点」来匹配驱动"
    meta: "〔09-15 22:24 北京〕· [PATCH 0/5] Rework M.2 Bluetooth instantiation using the auxiliary bus"
    points:
      - label: "定位"
        text: "QCA2066、WCN6855、WCN7850、88W8987 这些 M.2 模块的蓝牙口走 UART，但模块本身是在运行时从 PCIe 上冒出来的，固件里没有描述。为了让 serdev 总线匹配上蓝牙驱动，原来的 power sequencing 驱动用 of_changeset 在运行时凭空造了一个设备树节点。"
      - label: "做法"
        text: "改成用 auxiliary bus：power sequencing 驱动仍然分配 UART serdev，但通过一个 auxiliary device 把 serdev 和电源时序目标一起交出去；hci_qca 与 btnxpuart 各加一个 auxiliary 驱动来绑定，最后删掉两边基于 serdev 的 M.2 代码。"
      - label: "为什么"
        text: "「只为了让驱动能匹配就造一个设备树节点」是被明确劝退的做法——设备树应当描述硬件，而不是充当匹配的中介。"
    relevance: "auxiliary bus 正在成为「父设备发现子设备、但子设备不在固件里」这类场景的标准解法，值得认识这个模式。"
    link: "https://lore.kernel.org/linux-pci/<20260915-pci-m2-bt-rework-v1-0-3c7d9cf9c010@oss.qualcomm.com>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "vxlan 的配置转成 RCU：dump 终于不用再抢 RTNL 锁"
    meta: "〔09-16 01:55 北京〕· [PATCH v4 net-next 0/8] vxlan: convert configuration to RCU and enable lockless dumps"
    points:
      - label: "定位"
        text: "vxlan 的配置结构此前受 RTNL 全局锁保护，导致 vxlan_fill_info() 这类 dump 路径必须拿 RTNL——一个网卡的信息查询会把整个网络配置面卡住。"
      - label: "做法"
        text: "8 帖（Eric Dumazet）把 struct vxlan_config 转成 RCU 保护，删掉冗余的目标字段（default_dst、remote_ifindex 改用 lowerdev 表达），把 VXLAN_F_MDB 从 cfg->flags 挪到 vxlan_dev flags，并让 dump 不需要 RTNL。"
      - label: "效益"
        text: "vxlan 的 link dump 变成无锁。v4 还按评审意见补了 RTM_GETTUNNEL dump 中断信号（每 netns 一个原子 generation 计数 + nl_dump_check_consistent()），并单独拆出「下层设备变更时刷新默认 FDB 项」的修复补丁带 Fixes 标签。"
    relevance: "容器网络里 vxlan 用得极广——大规模场景下，dump 不再抢全局锁意味着监控和排查不会再拖累转发。"
    link: "https://lore.kernel.org/netdev/<20260915175501.391567-1-edumazet@google.com>/"
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "Treewide 静态存储"
        text: >-
          17 帖跨树强制「声明宏静态初始化的锁必须放在静态存储里」——lockdep 打开时，自动变量上的锁拿不到持久 class key，会在关闭自己之前先报 INFO: trying to register non-static key。作者 Yury Norov 的观察是：之所以没被淹没在报告里，可能只是因为发行版默认不开 lockdep。 · <a href="https://lore.kernel.org/linux-mm/<20260915030336.1192299-1-ynorov@nvidia.com>/">原文</a>
      - label: "sched_ext 惰性抢占"
        text: >-
          v5 给 BPF 调度器补上惰性抢占：fair 调度类早就能把调度边界推迟到返回用户态或下一个 tick，sched_ext 此前只有立即抢占。新增 SCX_OPS_LAZY_SLICE_EXPIRY 与逐任务的 scx_bpf_task_set_slice_expiry()，并在 NO_HZ_FULL 的无限时间片场景下主动恢复 tick 保证前进。 · <a href="https://lore.kernel.org/lkml/<20260915194611.2674127-1-arighi@nvidia.com>/">原文</a>
      - label: "LSM 边界之争"
        text: >-
          bpf_lsm_policy_release kfunc 引发的讨论转向了根本问题：BPF LSM 能做什么、LSM 之间的边界在哪。参与方包括 Paul Moore、Christian Brauner、Alexei Starovoitov 与 Dr. Greg，属于「先定边界再谈实现」的那类讨论，当日来回至少 5 封。 · <a href="https://lore.kernel.org/linux-security-module/<20260915-laken-ferngeblieben-verflachen-bafe1f296b02@brauner>/">原文</a>
      - label: "Rust block 健全性"
        text: >-
          rust: block 的 Operations::queue_rq 健全性修复仍在多轮讨论中（当日至少 5 封回帖，含内核机器人构建报告）——safe trait 与真实硬件队列语义之间的缝隙还没合上。 · <a href="https://lore.kernel.org/rust-for-linux/<CAPPBnEYRjm80r2v=jBnRS8xGf4WS1g0vo1=xagu+xPxixxb9wA@mail.gmail.com>/">原文</a>
  - type: divider
    label: "📰 其他板块"
    kind: section
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-block/<20260915202534.468958-1-tanawat.jukmon@gmail.com>/"
        text: "fs/buffer: __bh_submit() 里对没有 folio 的 buffer_head 空指针解引用，补上判空"
        time: "09-16 04:25"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260915044912.3183440-1-sunjunchao@bytedance.com>/"
        text: "evict_inodes() 反复扫描 inode 链表，改成一次扫描完成"
        time: "09-15 12:49"
      - link: "https://lore.kernel.org/linux-fsdevel/<20260914233941.2966421-1-slava@dubeyko.com>/"
        text: "hfsplus 把常规文件 I/O 迁到 iomap（v4·7 帖）——老文件系统现代化"
        time: "09-15 07:40"
      - link: "https://lore.kernel.org/linux-block/<20260915200107.3522560-1-arnd@kernel.org>/"
        text: "ublk: __ublk_shmem_remove_ranges() 栈占用过大，改为堆分配"
        time: "09-16 04:01"
      - link: "https://lore.kernel.org/linux-security-module/<20260915201036.3527935-1-arnd@kernel.org>/"
        text: "landlock 绕开 gcc-16 的 -Wuninitialized 误报（v2）"
        time: "09-16 04:10"
      - link: "https://lore.kernel.org/linux-rt-devel/<20260915222609.194216-1-rosenp@gmail.com>/"
        text: "gpio: mvebu 的 MMIO regmap 改用 raw spinlock——RT 内核下普通 spinlock 会被睡眠化"
        time: "09-16 06:26"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-16/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 13 列表"
  - type: paragraph
    text: >-
      近 24h 各板块真实计数：lkml 1200（全内核广播源，已限流）· net 753 · DRM 550 · mm 429 · media 247 · fs 227 · PCI 97 · Rust 74 · rt 65 · block 37 · arch 29 · LSM 14 · virtio 0（低频列表，本窗口无新帖）。
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "VM_SPECIAL"
        text: "VMA 上的标志掩码，把「内核拥有 / 可否合并 / mlock 怪例 / 拦 GUP」四类性质混在一起，本期待被 40 帖拆掉。"
      - label: "fd_prepare / fd_stage"
        text: "本期的争议方案：前者只占一个描述符号并记在 task 上，后者把 file 绑到槽位。成功则在系统调用出口统一安装，失败则统一丢弃。"
      - label: "SR-IOV（PF / VF）"
        text: "单张 PCIe 物理功能（PF）切出多个虚拟功能（VF）分给不同驱动，常见于网卡与 GPU 的虚拟化。"
      - label: "ALPM"
        text: "Advanced Link Power Management，显示链路空闲时进入低功耗，靠 LFPS 信号而非 AUX 通道唤醒。"
      - label: "PRI / IOPF"
        text: "PRI 是设备缺页时向 IOMMU 发页请求的接口；IOPF 是内核侧接收并处理这些 IO 页错误的框架。"
      - label: "probe filter（DAMON）"
        text: "DAMON 里决定「哪些内存区域的访问才值得记录」的过滤条件；本期新增按大页尺寸筛。"
      - label: "auxiliary bus"
        text: "内核里让父设备在运行时创建子设备的机制，用于子设备不在固件描述中的场景（如 M.2 模块的蓝牙口）。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 数据截至 09-16 06:50 北京 · 时区均为北京时间"
---
