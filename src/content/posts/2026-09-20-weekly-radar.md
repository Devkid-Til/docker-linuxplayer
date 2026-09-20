---
title: "fd 想改生死簿，AI 补丁撞上维护者：内核这一周在给「产能」立规矩"
date: "2026-09-20"
desc: "本周内核全局：Brauner 用 50 帖 POC 把 fd 的安装与回滚搬到系统调用出口，直接动全架构返回路径；VM_SPECIAL 40 帖退场并进 mm-unstable；kbuild 提速最高 36%；另一条主线是 AI 补丁洪流撞上维护者——125 帖一天涌入 13 个列表、netdev 下两个月禁投令、Linus 要 hazard pointers 先拿真实收益。"
column: "weekly"
tags: ["内存管理", "架构动向", "社区/生态", "PCI/总线"]
blocks:
  - type: hook
    text: >-
      本周内核两条线并行：一条在<strong>改地基</strong>——fd 的安装与回滚要从各驱动手里收归系统调用出口（50 帖 POC），<strong>VM_SPECIAL 这个把四类不相干属性搅在一起 20 年的掩码退场</strong>（40 帖，已进 mm-unstable），内核构建最多提速 36%；另一条在<strong>立规矩</strong>——<strong>AI 生成的补丁一天涌进 13 个列表共 125 帖</strong>，netdev 直接下两个月禁投令，Linus 对 hazard pointers 只回一句「先给我看钱」。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-20/weekly-cover.png"
    alt: "封面 · 9月20日 · 每周内核雷达"
  - type: divider
    label: "📊 板块热度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-20/board-heat-week.png"
    alt: "板块热度条形图 · 本周（周一~周日 · 7 天累计）"
  - type: paragraph
    text: >-
      本周（09-14~09-20，7 天完整累计）各板块邮件量：<strong>net 3616</strong> · <strong>DRM 2254</strong> · <strong>mm 2164</strong> · media 1092 · fs 926 · PCI 669 · Rust 355 · arch 354 · block 258 · rt 148 · LSM 138 · virtio 3。net 大幅领跑——但值得留意的是，这份量里有一部分来自本周那场 AI 补丁洪流，量高不等于 signal 多。virtio 仍是 12 板块里最冷的（3 条），实际讨论已整体迁到 virtualization 合并列表。
  - type: divider
    label: "💡 本周头条"
    kind: primary
  - type: headline
    title: "fd 想改生死簿：把「安装与回滚」从驱动手里收归系统调用出口"
    meta: "〔09-15〕linux-fsdevel · [PATCH RFC POC 00/50] file: handle files on syscall exit · 本周最热线程（52 封回复）"
    link: "https://lore.kernel.org/linux-fsdevel/20260915-work-fd-reserve-unify-folded-v1-0-4d5217d6b246@kernel.org/"
    points:
      - label: "现状"
        text: "一个系统调用要返回一个 fd（打开文件、建 dma-buf、建 eventfd…），得自己做三件事：先预留一个 fd 号、再决定成功时把 file 装上、失败时把号还回去。这套「预留—提交或回滚」的样板，被抄在每一处会返回 fd 的代码里。"
      - label: "痛点"
        text: "抄得多就一定会抄错。装到一半失败要回滚，回滚路径最容易被漏；drm ioctl 里就有一大坨「失败时把 dma-buf fd 塞回去」的手工代码。而且回滚顺序错了会泄漏 fd 号，多次失败累积下来就是「fd 表满」这类难查的故障。"
      - label: "方案"
        text: "Christian Brauner 提出把这件事上收到系统调用出口：fd_prepare() 先在 task 上预留一个槽，fd_stage() 把 file 挂上去；系统调用成功，出口路径统一安装所有暂存的 file，失败则统一丢弃。调用方不再需要任何 unwind 代码。50 帖里绝大多数就是在删这些样板——KVM、amdgpu、io_uring 等一处处拆。"
      - label: "为什么"
        text: "关键取舍是「不碰热路径」：get_unused_fd_flags() 和 fd_install() 语义保持不变，open()/dup() 这些每天跑亿万次的路径继续走老路，只有需要复杂回滚的驱动改用新接口。另一个边界划得很清楚——预留属于「线程+发起它的那次系统调用」，fork 的子进程不继承，有未完成预留的线程不能 unshare fdtable。"
      - label: "效益"
        text: "驱动侧少掉一整套易错的错误处理代码。更深远的是它把「fd 的生命周期」这个契约从「每个调用方各自实现」变成「VFS 统一保证」，回滚正确性从此只需在一处验证。"
      - label: "下一步"
        text: "这是 RFC POC，作者自己写明「even if it's just for illustrative purposes」。它动的面很大——全 17 个架构的 entry 层都要配合。讨论窗口正开着，是介入的好时机。"
    verdict: "本周最有分量的一次「收权」——VFS 把一件人人都在自己做的事收回去自己做。50 帖的体量说明作者是认真的，POC 的标签说明他也知道这事没那么快。"
  - type: headline
    title: "AI 补丁洪流撞上维护者：netdev 下禁投令，Linus 只回一句「先给我看钱」"
    meta: "〔09-16~09-19〕lkml / netdev / linux-mm · 一周内三起标志性事件"
    link: "https://lore.kernel.org/linux-mm/<20260919000056.3132131-1-paulmck@kernel.org>/"
    points:
      - label: "现状"
        text: "AI 写内核补丁这件事，过去一年从「能不能写」变成了「一天能写多少」。生成成本趋近于零之后，投递成本还在原地——每一封都要维护者亲自读、亲自评审。"
      - label: "痛点"
        text: "本周这笔账集中爆了：一次 AI 辅助的引用计数审计，在三个多小时里往 dri-devel 连发 <strong>69 封</strong>修复补丁；同期 hazard pointers 的 28 帖系列、以及一天内涌进 13 个列表的 125 帖，都在挤占同一批维护者的注意力。"
      - label: "方案"
        text: "维护者开始用规则回应。netdev 直接下<strong>两个月禁投令</strong>——不接受该来源的补丁，直到对方改掉批量投递的做法。Linus 对 hazard pointers 的回复是一句「Show me the money」：不是反对这个机制，而是要求先拿出真实场景的收益数据再谈。"
      - label: "为什么"
        text: "这里有个容易被误读的点：被挡下的不是「AI 写的代码」，而是「不承担评审成本的投递行为」。同一周里，AI 评审工具 Sashiko 在 vulab 的第 69 封里当场抓出一处 type confusion——那个「修复」会把虚表指针减一。工具既能放大噪音，也能抓出真 bug，分野在于是否有人对结果负责。"
      - label: "效益"
        text: "禁投令和收益门槛都是「把成本还给投递方」的做法。对认真的贡献者反而是好消息——注意力是内核最稀缺的资源，把它从噪音里解放出来，真正有数据的系列才排得上队。"
      - label: "下一步"
        text: "这套规则会怎么固化还不清楚——是变成各子系统的惯例，还是需要一份跨子系统的声明。可以确定的是，以后提机制级改动，「收益数据」会从加分项变成入场券。"
    verdict: "本周真正的分水岭不在代码里。内核社区第一次用「禁投 + 要数据」这种硬规则回应生成式产能，而不是继续靠维护者硬扛。"
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: toc
    items:
      - label: "VM_SPECIAL 退场"
        text: "把「是否内核自持 / 能否 expand-merge / 是否 mlock 特例 / 是否阻止 GUP」四类互不相干的属性揉在一个掩码里 20 年，驱动作者长期误用。40 帖改为描述行为的谓词（vma_is_kernel_owned / vma_can_merge / vma_can_gup…）并建立不变式：只有 kernel-owned 映射才允许改 VMA_IO_BIT。akpm 已确认收进 mm-unstable，本周讨论持续到 09-19。 <a href=\"https://lore.kernel.org/linux-arch/20260917-b4-mmap-prepare-vma-flag-sanify-v3-0-4583d8a23bca@kernel.org/\">原文</a>"
      - label: "mTHP 拆页 v2"
        text: "把「未充分使用的大页拆分回收」从 PMD 级 THP 扩到 mTHP。v1 的两个设计被 David Hildenbrand / Barry Song / Johannes Weiner 逐一否掉，v2 采纳折中：knob 保持绝对值。代价是同一个 knob 要服务两个层级，等于牺牲 PMD THP 的 collapse 积极性。 <a href=\"https://lwn.net/Articles/1095022/\">原文</a>"
      - label: "swap tier RFC v11"
        text: "v11 推翻重做——不再用「优先级区间」定义 tier，而是把每个不同的 swap priority 直接视为一个 tier。memcg 通过 debugfs 选 tier，mask 以 cgroup ID 为键，不改 struct mem_cgroup、不加 Kconfig。从 v1（2025-11）磨到 v11，是「先最小可用、撞坑再改」的样本。 <a href=\"https://lwn.net/Articles/1094974/\">原文</a>"
      - label: "device DAX 并入通用 vmemmap"
        text: "HVO（HugeTLB vmemmap 优化）泛化的第三步：device DAX 从「专属尾部页预留 + 各架构私有逻辑」迁到基于 memory section 的通用模型，净删代码（20 文件 +244/-459）。已收 Mike Rapoport / David Hildenbrand / Qi Zheng 的 Acked-by。 <a href=\"https://lwn.net/Articles/1091560/\">原文</a>"
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: toc
    items:
      - label: "TCP GSO 重组（机制）"
        text: "BIG TCP 按 netdevice 协商，一条路径上两种口可共存。BIG TCP 包走到不支持的口时 GSO 状态丢失，协议栈退化成逐 MSS 单包——实测 veth→bridge→TAP→guest virtio-net 掉 69% 吞吐（51.55→15.85 Gbps），修复后回到 52.62。关键取舍：明确放弃 per-device 开关，不加 netlink ABI、不加 net_device 状态，因此无 UAPI、无驱动改动，自动生效。 <a href=\"https://lore.kernel.org/netdev/<20260918084651.3022878-1-wang.zhan@smartx.com>/\">原文</a>"
      - label: "BPF 时间戳 2.0 RFC"
        text: "本周唯一「新框架 + 新 UAPI」级 RFC，动 TCP 发送路径的 skb 元数据。设计上复用 skb_shared_hwtstamps 而不新增字段，代价是要专门用两块补丁兜与真实硬件时间戳的冲突。粒度做到每个被拆分的 skb 都记 start time。 <a href=\"https://lore.kernel.org/netdev/<20260919143732.11772-1-kerneljasonxing@gmail.com>/\">原文</a>"
      - label: "bridge 泛洪快路径"
        text: "bridge 维护者亲自动手，把 VLAN 哈希查找从快路径上拆掉。新增 port-VLAN RCU 链表 + >8 成员时的 RCU 数组，泛洪时只考虑真正参与该 VLAN 的端口。病态拓扑（一个 VM 口 + 一个上游口参与、其余不参与）收益最大。 <a href=\"https://lore.kernel.org/netdev/<20260918152950.1938259-1-razor@blackwall.org>/\">原文</a>"
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: toc
    items:
      - label: "path_* API 加固"
        text: "建立一条不变量：一个已填充的 struct path 恰好持有一份引用。原来 path_get() 可被消费者任意加减引用，历史上反复引出泄漏/悬空 bug。新增 path_create / path_move / path_clone 三个原语，转换几乎全量（大部分走 coccinelle 脚本）。典型的「先立规矩再改代码」——本身几乎是零行为变更。 <a href=\"https://lore.kernel.org/linux-fsdevel/20260913144918.1606123-1-mjguzik@gmail.com/\">原文</a>"
      - label: "O_CREAT|O_DIRECTORY 被打回"
        text: "⚠️ 这条要纠正一个流行说法：多个来源称该系列「Applied to vfs-7.4.lookup」，但拉邮件原文可见 Brauner 09-17 确实先说了 Applied，09-18 又在同一线程补了一句「Dropped after I reviewed it once more」。镜像反查一致：未合入、不在 next。 <strong>凡涉及合入状态，必须以邮件原文或镜像反查为准。</strong> <a href=\"https://lore.kernel.org/linux-fsdevel/20260913185016.523376-1-jkoolstra@xs4all.nl/\">原文</a>"
      - label: "XFS fs-verity v16"
        text: "fs-verity 从 ext4/f2fs 扩到 XFS 的长线系列。v16 关键变化是用独立 kmem cache 取代往 iomap ioend 里塞 work_struct，不再为 verity 污染通用结构。作者明确列出仍未获 review 的 3 个 patch——要参与就从这三个切入。 <a href=\"https://lore.kernel.org/linux-fsdevel/20260918111539.1003439-1-aalbersh@kernel.org/\">原文</a>"
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: toc
    items:
      - label: "drm_panel 内嵌 bridge（最大结构改动）"
        text: "现状是 panel 创建时不带 bridge，panel_bridge 由下游临时包出来，造成生命周期/devm 归属错配、消费者分不清拿到的是什么、销毁还得猜谁该调 remove。改成 panel 内嵌 bridge 后，上游一律用统一 bridge API 交互。这是 bridge 热插拔的前置条件，终点是删掉整块旧代码。v3 共 19 帖：中段内嵌、后段 deprecate 旧 API、末段批量改造 tc358767/tc358768/analogix_dp 等驱动。 <a href=\"https://lists.openwall.net/linux-kernel/2026/09/16/1747\">原文</a>"
      - label: "ATOMIC_RESET 新 uAPI"
        text: "给 atomic ioctl 加声明式「复位到初始状态」：带该 flag 时内核先用所有 KMS 对象的默认状态填 commit，再叠加请求里显式给出的属性。现状是合成器想要已知基线必须把每个对象每个属性都显式设回默认。Mutter 已有可用实现。真实阻塞点是它依赖所有驱动都实现 atomic_create_state。 <a href=\"https://lwn.net/Articles/1095303/\">原文</a>"
      - label: "drm/sched FAIR 回归争论"
        text: "一周内热度最高的讨论线：9070XT 满载下 FAIR 策略性能严重退化。Philipp Stanner 与 Tvrtko Ursulin 的交锋，Stanner 称「为性能站台的外部啦啦队」是 drm_sched 设计失误的根因之一。情绪之外，这条线指向的是调度策略与真实负载的匹配问题。"
  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: toc
    items:
      - label: "virtio-media v9（框架级新驱动）"
        text: "把 V4L2 语义搬到 virtio 上——guest 侧注册 V4L2 + video device，host 侧是 virtio 虚拟设备，host 上现有的 uvcvideo 等被整体「代理」进 guest。作者明确说刻意不用 VB2、也不用其它 V4L2 常规框架。前置的 VIRTIO_ID_MEDIA（ID 48）已进 v7.3-rc1。Tsirkin 在 09-19 连回三封。 <a href=\"https://lore.kernel.org/linux-media/20260917171921.2810550-1-briandaniels@google.com/\">原文</a>"
      - label: "v4l2-subdev metadata 铺路 v8"
        text: "13 帖做三件事：把「谁在调这个 pad」结构体化并挂进 pad ops、把 op 存在性检查从各驱动上移到核心 wrapper、收敛 set_fmt/get_fmt 的语义歧义。这三步是「subdev 元数据流」的前置条件——只有 subdev 能区分调用方，多路流/元数据流的权限与路由才表达得出来。 <a href=\"https://lore.kernel.org/linux-media/20260914114145.574791-1-sakari.ailus@linux.intel.com/\">原文</a>"
      - label: "mem2mem 多 job 并行"
        text: "此前框架隐含「一个 m2m_dev 同时只有一个 curr_ctx」，多核硬件只能靠驱动在 device_run 里直接调 v4l2_m2m_job_finish 去「骗」框架调度下一个 job——作者在 cover letter 里直说这是 dirty hack。这次把「多上下文并行」做成一等公民（新增 max_parallel_jobs）。取舍值得学：调度只做 context 级，单流不提速，N 路并行才吃满 N 核，以此规避跨核帧序错乱。 <a href=\"https://lore.kernel.org/linux-media/20260916-spu-rga3multicore-v2-0-23aa2cb74e61@pengutronix.de/\">原文</a>"
  - type: divider
    label: "📰 PCI / 总线"
    kind: section
  - type: toc
    items:
      - label: "Flit Logging 首次接入"
        text: "PCIe 6.0 起错误上报从 TLP 转向 Flit，需要走 _OSC 协商 + 新扩展能力，此前内核里是空白。v2 共 10 帖：前 4 条先修 AER sysfs 既有问题，5-6 铺垫重构，7-10 才落 Flit Logging 本体（含限流 sysfs 控件）。属新硬件代际的链路层诊断能力接入。 <a href=\"https://lwn.net/Articles/1095309/\">原文</a>"
      - label: "endpoint 支持硬件自有 MSI-X 布局"
        text: "新增 struct pci_epc_msix_layout，打破旧的「PBA 紧跟 Table」假设。<strong>与 RK3588 直接相关</strong>：RK3588 的 MSI-X Table 固定在 BAR4+0x4000、PBA 在 BAR4+0x5000，位于预留 BAR 而非 EPF 自有 config BAR。设计上刻意不让 endpoint core 自动选择该布局，选择权留给 EPF 驱动。实测反馈：EP 侧打印正确，但 host 侧 MSI-X1 返 -110（ETIMEDOUT），双方可复现，尚在定位。 <a href=\"https://lkml.org/lkml/2026/9/14/1504\">原文</a>"
      - label: "动态 OF 节点回归修复"
        text: "CONFIG_PCI_DYNAMIC_OF_NODES=y 下，设备报告 Type-1 桥 header 但没有下游总线时 of_pci_make_dev_node() 挂死。争论点是修复姿势：最初提 quirk 改 class/header type，Bjorn Helgaas 明确反对，最终采用「无下游总线则省略 bus 属性」——理由是 Type-1 header 设备没有 pci_bus 是<strong>合法状态</strong>（Intel uncore 常见），不该用 quirk 改硬件声明。 <a href=\"https://lkml.org/lkml/2026/9/16/1926\">原文</a>"
  - type: divider
    label: "📰 virtio 虚拟化"
    kind: section
  - type: toc
    items:
      - label: "remoteproc 支持任意 virtio 设备"
        text: "现在 remoteproc 上只能跑 rpmsg 和 virtio-console，根因是 vring 预分配在共享内存，但 virtio 驱动用 kmalloc 分配的 buffer 远端处理器够不着。引入对驱动透明的 bounce buffering——在 vdev 的 map/unmap 回调里按 swiotlb 思路搬数据，并用地址区间判断做 bypass。测试跑在 i.MX93 的 Cortex-M33 + Zephyr 上。维护者已开始 review。 <a href=\"https://lwn.net/Articles/1094981/\">原文</a>"
      - label: "virtio-blk 内联加密 v3"
        text: "关键在新增了 <strong>control virtqueue</strong>——virtio-blk 一直是「单 vq 到多 vq」的简单模型，加 control vq 等于开了一条带外控制通道，后续所有配置类特性都会挂上去。该线程从 2026-01 迭代到 v3，跨 8 个月反复被打回，协议侧分歧不小。 <a href=\"https://lore.kernel.org/virtio-dev/<20260913161628.368484-1-linlin.zhang@oss.qualcomm.com>/\">原文</a>"
      - label: "virtio-gpu userptr（一周 v6/v7/v8）"
        text: "virtio-gpu 从「渲染」转向「计算」的接口扩展：数据面从 blob 改成 userptr 零拷贝映射，新增 blob userptr resource 和 VIRTIO_GPU_CAPSET_ROCM 能力。09-17、09-18 两天连发三版，v8 立刻收到逐条 review，是当前 review 最活跃的线程。uAPI 一旦定型难改，值得早看。 <a href=\"https://lore.kernel.org/virtualization/<20260918095940.2253018-1-honghuan@amd.com>/\">原文</a>"
      - label: "virtio 列表迁移的事实"
        text: "virtio-dev@lists.oasis-open.org 本周几乎空转——最新一封停在 09-13，整周只有 1 个线程。实际流量已整体迁到 virtualization@lists.linux.dev（vhost/vdpa/virtio/vsock 合并列表）。做 virtio 的人盯错列表就会以为这周没事发生。"
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: toc
    items:
      - label: "PCI SR-IOV 抽象与它的反对意见"
        text: "Rust 抽象第一次要跨 PF/VF 驱动边界并跨语言共享数据，直接顶到「安全抽象的边界画在哪」。Danilo Krummrich 的反对是方向之争：FFI 层代码量超过实际需要、更易错，且会激励写跨语言混合驱动，主张 FFI 面停在子系统层而非给单个驱动开后门。<strong>这条结论会决定 Rust for Linux 之后怎么与存量 C 驱动共存。</strong> <a href=\"https://lore.kernel.org/rust-for-linux/20260915205659.76841-1-zhiw@nvidia.com/\">原文</a>"
      - label: "netlink zerocopy 顺带炸出真缺陷"
        text: "迁移到 zerocopy 时发现 GenlMsg::put 把 usize 长度 unchecked 转成 c_int，长度超过 i32::MAX 时翻负，绕过 nla_put() 里有符号的 skb_tailroom() 检查，随后被当成极大无符号长度，触发 skb_over_panic()。评审要求把「转换」和「长度校验」拆成两个补丁。 ✅ <strong>v3 已进 linux-next</strong>（tags/next-20260918）。 <a href=\"https://lore.kernel.org/rust-for-linux/20260915144231.31932-1-sagartaunk@proton.me/\">原文</a>"
      - label: "unsoundness 批量审计"
        text: "queue_rq 回调与 module_param SetOnce 两处相隔三天、指向同类问题——安全 API 被证明可导致 UB，等于 Rust 对调用者的承诺失效。unsoundness 在 Rust 抽象里的级别高于普通 bug，维护者必须处理。对读补丁的人是很好的模式样本。"
      - label: "leds 抽象打到 v25"
        text: "价值不在补丁本身而在这个数字——它是「一个 Rust 子系统抽象要被接受得跨过多少轮评审」最直观的标尺。对目标是成为内核 patch 贡献者的人，比读任何单个补丁都更能看清审阅者到底卡什么。"
  - type: divider
    label: "📰 LSM 安全"
    kind: section
  - type: toc
    items:
      - label: "LSM boundaries 大讨论（本周最重）"
        text: "焦点是 BPF-LSM 这一个模块能不能拥有自己的 policy object 及其 kfunc 生命周期——直接决定 bpf_lsm_policy_* 这组 kfunc 是否成立、析构归内核还是归 BPF 侧。参与者含 Christian Brauner 与 Günther Noack。本质是「LSM 该不该为 BPF 程序开放内核态对象」的架构级争论。"
      - label: "landlock tracepoint 修复"
        text: "tracepoint 是内核少有的「明示 ABI」区域。这里同时修了宽度类型名（影响 BTF/BPF 侧匹配）、blocker 上报错误、ptrace tracer 报错对象错误、信号号上报的不是实际生效值——四条都是「观测到的原因 ≠ 真实原因」这类最难查的错。消费者（bpftrace/自研解析器）会受影响。 <a href=\"https://lore.kernel.org/linux-security-module/<20260918185036.608651-1-mic@digikod.net>/\">原文</a>"
      - label: "AppArmor 一周 5 连发"
        text: "5 条来自 4 个互不相干的作者，集中在引用计数泄漏与边界检查两类——通常意味着前一轮 refcount/CFI 类误用被扫描器批量发现。其中 accept index + 1 那条机制值得记：owner-conditional 的 accept 项在 perms 表里占两个 slot，校验器只查了 index 本身，把 ACCEPT_FLAG_OWNER 放最后一项即可越界。 <a href=\"https://lore.kernel.org/linux-security-module/<20260916115307.454593-1-zhugl3@xiaopeng.com>/\">原文</a>"
      - label: "verity keyring 固定 ID"
        text: "现状是进程只能按名字 search verity keyring，而名字是可被污染的字符串。给 fs-verity/dm-verity 一个 KEY_SPEC_* 级别的固定 ID，等于让校验路径可以不依赖名字解析直接定位 keyring——「减少信任输入」的接口设计。 <a href=\"https://lore.kernel.org/linux-security-module/<20260914-ajhalaney-dmverity-key-identifier-v1-0-01922dc1366a@amutable.com>/\">原文</a>"
  - type: divider
    label: "📰 block 块设备"
    kind: section
  - type: toc
    items:
      - label: "virtio-blk 钳制 max_segments"
        text: "未协商 VIRTIO_RING_F_INDIRECT_DESC 时，SG 段直接占用环槽。host 报 seg_max=1024 + 1024 槽环时，1023-1024 段数据加 2 个 header 描述符 = 1025-1026 > vring.num，virtqueue_add_split() 返 -ENOSPC → <strong>blk-mq 队列被永久卡死</strong>（I/O 挂 D 态）。修法是把不变式写进 virtblk_read_limits()，无条件按 ring_size - 2 钳制。 <a href=\"https://patchew.org/linux/20260918135120.1261150-1-sergiiushakov@google.com/\">原文</a>"
      - label: "block: run_todo() 新回调"
        text: "7.1 合并窗口的改动打破了「__loop_clr_fd() 调用时已无未完成 I/O」的旧假设，导致空指针解引用；但要 flush 就得 drain_workqueue()，而它不能在持有 disk->open_mutex 时调用。run_todo() 提供<strong>在 open_mutex 释放之后</strong>执行的同步清理钩子，代价是序列化责任转移给驱动实现者。典型的「加 API 换掉锁语义」。 <a href=\"https://lkml.org/lkml/2026/9/19/395\">原文</a>"
      - label: "ublk CVE-2026-90323"
        text: "sqe->addr 非法时 ublk_fill_io_cmd() 已置 UBLK_IO_FLAG_ACTIVE，uring_cmd 完成但 tag 仍处 active → teardown 挂死。修法是把「校验」与「应用 buffer」拆开，确保 io->buf 不在状态检查前被写。属「完成/状态机不变量被破坏」的典型类别。"
  - type: divider
    label: "📰 arch 架构 / 构建"
    kind: section
  - type: toc
    items:
      - label: "内核构建提速 36%（机制级）"
        text: "把所有架构共用的构建瓶颈并行化：kallsyms 用 C 重写 mksysmap、modpost 描述符改汇编输出、objtool 并行解码、depcheck 取代时间戳依赖检查、rustc 与其余构建并行。收益：allmodconfig 全量 -19%~-36%，增量 -61%~-66%，<strong>no-op 构建 -89%~-95%</strong>（EPYC 30.6s → 1.5s）。跨 x86/arm64/arm/riscv/s390/loongarch 全部测过。 <a href=\"https://lore.kernel.org/linux-arch/20260917-build-speedup-v3-0-9ecf4163ff36@kernel.org/\">原文</a>"
      - label: "hv 捐赠页从 direct map 摘除"
        text: "真实故障链：hv_call_deposit_pages() 把页捐给 hypervisor 后页仍留在 direct map，load_unaligned_zeropad() 这类故意越界读的 helper 一踩进去，hypervisor 抛 #GP，异常表 fixup 救不了。修法是先把页从 direct map 摘掉再交出去。它暴露的是<strong>架构间 set_direct_map() 语义分歧</strong>——同期 Mike Rapoport 发了专门文档说明各架构哪里不一致。 <a href=\"https://lore.kernel.org/linux-arch/20260917201052.2123701-1-magnuskulke@linux.microsoft.com/\">原文</a>"
      - label: "arm64 vDSO robust futex v9"
        text: "进程持有 robust mutex 时被杀死，内核需原子地「解锁并清 op_pending」，落在 vDSO 里做才没有 syscall 开销。x86 已有，arm64 补上，属跨架构 ABI 对齐。v9 主动砍掉 compat vdso32 入口（要先在 arch/arm/ 落地），说明这个 ABI 会分两步铺开。 <a href=\"https://lore.kernel.org/linux-arch/20260917-tonyk-robust_arm-v9-0-ab082b1b4c4b@igalia.com/\">原文</a>"
      - label: "折叠页表的冗余读 RFC"
        text: "用 ptep_get()/pmdp_get() 等在编译期折叠页表的配置上会退化成多余的 READ_ONCE()。arm64 CONFIG_PGTABLE_LEVEL=3 的反汇编证据显示同一值读两遍。改法是让 pXdp_get() 对折叠层级返回 dummy entry + 编译期校验——用类型约束替代运行期检查。作者预告下周去掉 RFC 标签。 <a href=\"https://lore.kernel.org/linux-arch/20260902-dummy_ptxp3-v3-0-5d8f5b17c25c@arm.com/\">原文</a>"
  - type: divider
    label: "📰 rt 实时调度"
    kind: section
  - type: toc
    items:
      - label: "RT 可睡眠锁误报修复"
        text: "non_block_start()/end() 的本意是抓「回调里依赖锁或可睡眠条件」，当年明确把 spinlock 排除。但 RT 上 spinlock_t/rwlock_t 变成可睡眠锁、带 might_sleep()，于是 mm 的 non_block 区间与 pwm 的 hrtimer 路径直接 splat。修法不是放松检查，而是给检查加判据「这次重调度请求是否来自可睡眠锁」。 <a href=\"https://lore.kernel.org/linux-rt-devel/20260916155105.qDi2MiYW@linutronix.de/\">原文</a>"
      - label: "can_spin_trylock 收紧引反对"
        text: "把 v6.19 的 kmalloc_nolock() 检查从「仅 NMI/硬中断」收紧为 !preemptible()。<strong>Alexei Starovoitov 当场反对</strong>：7.0 起 bpf arena 在 raw_res_spin_lock_irqsave 下调用 alloc_pages_nolock()，改后会让人所有 BPF 程序（含 sleepable）的 bpf_arena_alloc_pages() 返回 NULL、用户态缺页直接 SIGSEGV。倾向是「检查应针对 pi_lock/rq lock 这几把，而不是所有 irq/preempt disabled 区间」。 <a href=\"https://lore.kernel.org/linux-rt-devel/20260919171443.90512-1-kmehltretter@gmail.com/\">原文</a>"
      - label: "softirq 上下文表示"
        text: "IRQ 退出、softirq 开始前有一段窗口：HARDIRQ_OFFSET 已减、softirq 尚未开始，任何读上下文的人看到的都是「被中断的任务」。RT 上 can_spin_trylock() 与 local_trylock() 会在这个窗口不再拒绝硬中断上下文；oops_end() 会把中断里的 oops 误判为任务上下文而杀掉被打断的任务。该路径本身是 !PREEMPT_RT only。"
  - type: divider
    label: "📰 LWN / 本周综述"
    kind: section
  - type: paragraph
    text: >-
      本周 LWN 值得对读的几篇：<strong>Accelerating the kernel's build process</strong>（与上面 kbuild 提速 36% 那条同源）、<strong>Thread-identity switcheroo for io_uring</strong>（io_uring 的提交者身份迁移）、<strong>Recent work in memory tiering</strong>（与上面 page_counter stock 下移那条相辅相成——先搬地基、后加 tiered limits）、<strong>The "rnull" Rust block driver</strong>、<strong>Adding BPF to blk-iocost</strong>、<strong>Using steal time to moderate CPU demands</strong>、<strong>Fixing the TCMalloc regression with RSEQ operations</strong>，以及 7.3 合并窗口的上下篇与 7.2 开发统计。⚠️ LWN 部分文章有订阅墙，标题可抓、正文可能需订阅——本期只对标题与公开摘要做归纳，未逐篇核对正文。
  - type: divider
    label: "🧭 合入状态"
    kind: section
  - type: toc
    items:
      - label: "✅ 已进 linux-next（本周确认）"
        text: "<strong>mm: eliminate VM_SPECIAL, VMA_SPECIAL_FLAGS</strong>（mm 树 mm-unstable，next 内可见 e24a88477cfb）· <strong>Rust netlink zerocopy v3</strong>（tags/next-20260918~101^2~6）· <strong>drm_bridge every-panel v2 的两个子补丁</strong>（dd8950786bd2 drm/omap、acb05c825e39 drm/tve200，主体内嵌 bridge 尚未排队）· <strong>drm ATOMIC_RESET v3 前置补丁</strong>（38d8b5a35367，tags/next-20260914）"
      - label: "⬜ 未合入（邮件列表阶段）"
        text: "本周 20 条重点补丁经本地三镜像反查（索引快照 2026-09-20 05:38，mainline 201183 / next 206916 / stable 331356 条），其余全部为「mainline 未合入 · 不在 linux-next 队列 · 未回移植」——符合预期，这些补丁多在一周内刚发出，合入有数周滞后。"
      - label: "⚠️ 工具盲区（如实标注）"
        text: "mirror-lookup.sh 的 mid 正则只认 <code>时间戳.序号-…@domain</code> 形态。<strong>b4 生成的新式 mid</strong>（如 <code>20260917-build-speedup-v3-0-9ecf4163ff36@kernel.org</code>）既建不进索引、query 也被判非法——意味着 Brauner 全家（vfs 树）和 netfs 系列等大量现代补丁系列<strong>查不了状态</strong>。本期这些条目改用 <code>git log --grep</code> 直扫镜像手工确认。这是工具盲区，不是「未合入」的证据。"
  - type: divider
    label: "📰 架构动向"
    kind: section
  - type: toc
    items:
      - label: "收权：把散落的契约收归一处"
        text: "本周最清晰的一条线。<strong>fd 的安装/回滚</strong>从各驱动收归系统调用出口；<strong>struct path 的引用计数</strong>从不变量缺位收归 path_create/path_move/path_clone 三原语；<strong>VMA 的 flag 语义</strong>从「任选 flag」收归描述行为的谓词 + 不变式校验。三件事形态一致：把一件人人各自实现、各自出错的事，变成一层统一保证。"
      - label: "去特例：专有路径并入通用设施"
        text: "同样反复出现。<strong>device DAX</strong> 的 vmemmap 优化并入通用 memory section 模型（净删代码）；<strong>HugeTLB</strong> 的专属优化并入 sparse-vmemmap；<strong>nfsd 的 OPEN</strong> 想收敛回 vfs_lookup_open() 主干，消除自建并行实现；<strong>bridge</strong> 把 panel 这个特例内嵌进来，让上游不必关心对方是 panel 还是 bus-to-bus bridge。"
      - label: "约束前移：用编译期和类型替代运行期检查"
        text: "<strong>折叠页表</strong>让 pXdp_get() 返回 dummy entry 并编译期校验；<strong>VMA</strong> 建立「只有 kernel-owned 才允许改 IO_BIT」的不变式并在每次 mmap 后校验；<strong>Rust 侧</strong>持续讨论能否用类型态保证 DMA 参数在任何操作前设定（结论倾向：问题是并发不是顺序，type-state 做不到）。"
      - label: "AI 参与留下可见痕迹"
        text: "本周多条补丁带 <code>Assisted-by: LLM</code> 标签（如 RT 列表的 gpio mvebu raw spinlock 修复），同时 kbuild 提速系列因「LLM somehow corrupted the numbers」被 Linus 当场揪出一个被弄错的基准数字。工具在提效和引入错误两端都在留下痕迹——这也是本周 AI 洪流讨论的现实底色。"
  - type: divider
    label: "📰 与你方向的交叉点"
    kind: section
  - type: toc
    items:
      - label: "RK3588 MSI-X 布局（PCI endpoint）"
        text: "直接对上。RK3588 的 MSI-X Table 固定在 BAR4+0x4000、PBA 在 BAR4+0x5000，位于预留 BAR 而非 EPF 自有 config BAR。新系列用 struct pci_epc_msix_layout 把这种硬件自有布局做成合法配置，选择权留给 EPF 驱动（dw-rockchip 走 msix_doorbell）。目前 host 侧 MSI-X1 返回 -110 的问题双方可复现，是介入讨论的窗口。"
      - label: "camera / GMSL2 侧"
        text: "两条直接影响你：<strong>dt-bindings 的 orientation 宏</strong>（FRONT/BACK/EXTERNAL 从各家裸数字收敛成正式宏，核心头已 accepted，5 个 SoC 家族的 DTS 在分批迁移）——<strong>你自己板子 dts 里的 orientation 迟早要换成新宏</strong>；<strong>v4l2-subdev 的 metadata 铺路</strong>系列把「谁在调这个 pad」结构体化，这是多路流/元数据流权限路由的前置条件。"
      - label: "桥接与显示链路"
        text: "两条值得跟：<strong>drm_panel 内嵌 bridge</strong>——终点是删掉 bridge/panel.c 与 drm_of_find_panel_or_bridge() 整块旧代码，凡自己写 bridge/panel 胶水的驱动最终都要迁；<strong>tc358762 v4 修复</strong>——作者在 Beagleboard 上跑 RPi display 时发现的一批问题，含「丢掉 drm_bridge_funcs.mode_set」「始终启用 VTG」，是「一条链上 bridge 与 panel 要一起修」的完整案例。注意该系列基于 v7.2，不适用于 v7.3-rcX 及更新。"
      - label: "virtio（块设备与传输层）"
        text: "<strong>virtio-blk 加 control virtqueue</strong>（内联加密打头，后续所有配置类特性都会挂上去）与 <strong>virtblk max_segments 钳制</strong>（队列被永久卡死的修复）都直接落在你熟的 virtio-blk 传输层。"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "fd 延迟安装"
        text: "把 fd 的安装与回滚从各驱动搬到系统调用出口路径统一处理，调用方不再需要 unwind 代码。fd_prepare() 预留槽位，fd_stage() 挂 file，出口路径按系统调用成败统一提交或丢弃。"
      - label: "VM_SPECIAL"
        text: "一个把四类互不相干属性（内核自持 / 能否 expand-merge / mlock 特例 / 阻止 GUP）揉在一起的 VMA 掩码。驱动作者无法从 flag 反推语义，长期误用。本周被拆成一组描述行为的谓词。"
      - label: "mTHP"
        text: "multi-size THP，除 2MB PMD 之外的多档匿名大页（如 64KB）。它让「大页」不再只有一档，也让按 order 缩放阈值的旧做法失效。"
      - label: "Flit Mode"
        text: "PCIe 6.0 起用 PAM4 编码的 FLIT 模式替代 8b/10b，错误上报随之从 TLP 转向 Flit，需要新的扩展能力与 _OSC 协商。"
      - label: "hazard pointers"
        text: "一种无锁内存回收机制：读者把自己正在访问的对象指针发布到「危险指针」槽，回收者据此判断对象是否还有人引用。本周 Linus 要求先拿出真实场景的收益数据。"
      - label: "control virtqueue"
        text: "virtio-blk 在数据 virtqueue 之外新增的控制通道。该设备此前一直是纯数据面模型，加控制队列后，配置类特性（加密、后续更多）有了挂载点。"
      - label: "bounce buffering"
        text: "当设备/远端处理器够不着驱动分配的 buffer 时，把数据搬到一个双方都能访问的中间缓冲区。本文场景是远端处理器够不着 kmalloc 内存。"
      - label: "unsoundness"
        text: "Rust 语境下指安全 API 实际可导致未定义行为——等于 Rust 对调用者的安全承诺失效。级别高于普通 bug，维护者必须处理而非可选修复。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: ""
---
