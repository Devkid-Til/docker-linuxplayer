---
title: "硬件影子栈进客户机，设备认证交给 Rust：内核安全地基一天双响"
date: "2026-09-02"
desc: "KVM arm64 GCS 影子栈进客户机；Rust 重写 SPDM 设备认证；HDMI2.0/PRI/resctrl 齐动。"
column: "daily"
tags: ["arch", "Rust", "PCI", "DRM", "mm", "net", "fs", "media"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看两件事：<strong>硬件影子栈进客户机</strong>——arm64 的 GCS（受保护控制栈）第 20 版开始完整交给 KVM 客户机管理，云里的 ROP 防护要成真了；以及 <strong>设备认证交给 Rust</strong>——WDC 用 Rust 重写 SPDM 协议栈，理由是「复杂规范 × 不可信输入，正是内存安全该上阵的位置」。外加一批机制大动：DW HDMI QP 补上 HDMI 2.0、SMMUv3 接上硬件页请求、RISC-V 第一次有 resctrl。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-02/cover.png"
    alt: "封面 · 9月2日 · 硬件影子栈进客户机 · Rust 重写设备认证"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "KVM arm64 GCS 硬件影子栈完整交给客户机（v20，14 帖）——云上 arm64 客户机将拿到硬件 ROP 防护"
      - label: "头条"
        text: "WDC 用 Rust 重写 SPDM 设备认证（v3，21 帖）——「复杂协议 × 不可信输入」是内存安全的主场"
      - label: "DRM"
        text: "DW HDMI QP 补上 HDMI 2.0（v11，74 帖）——Rockchip RK3576/RK3588 上 4K@60，VC4 同步迁移公共设施"
      - label: "mm"
        text: "页表释放全面 RCU 化 + DAMON 把「访问」当数据属性"
      - label: "PCI"
        text: "SMMUv3 接上硬件页请求（PRI）——PASID / SVA 的地基"
      - label: "net"
        text: "ARP/ND 邻居表按网络命名空间隔离 + flowtable 隧道 offload 铺路"
      - label: "arch"
        text: "RISC-V 第一次有 resctrl（CBQRI，v7）——L2/L3 缓存容量分配"
      - label: "media"
        text: "联想 Yoga Book 相机复活（v6，16 帖）——atomisp 整条链对齐"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "硬件影子栈进客户机：KVM 把 arm64 GCS 完整交给 guest"
    meta: "〔09-02 05:50 北京〕· [PATCH v20 00/14] KVM: arm64: Provide guest support for GCS"
    link: "https://lore.kernel.org/lkml/<20260901-arm64-gcs-v20-0-f31750bdfadb@kernel.org>/"
    points:
      - label: "现状"
        text: >-
          arm64 GCS（Guarded Control Stack，受保护的控制栈）是硬件实现的影子栈：函数调用 BL 时把返回地址压进一个特殊栈页，RET 时弹出比对，栈页只能由 GCS 专用指令写入、用户态改不了返回地址——专门对付 ROP（返回导向编程）攻击。它已经进了主线。
      - label: "痛点"
        text: >-
          GCS 涉及一大票 EL1/EL2 寄存器（GCSCR/GCSPR、S1PIE/FGT 拦截、GCS 异常语义），云上的客户机跑在虚拟机里，hypervisor 不接管这些，防护就用不上；嵌套虚拟化（VM 里再开 VM）还要把异常一路转发，难度再翻一番。
      - label: "方案"
        text: >-
          14 帖把 GCS 完整交给客户机：暴露并管理 GCS 寄存器、允许 guest 开启 GCS、GCS 异常转发到 guest、EXLOCK（异常锁）语义模拟、把 EL2 侧的 GCS 指令用 FGT 关掉，嵌套客户机也一路支持，KVM selftests 补上 EXLOCK 用例。
      - label: "为什么"
        text: >-
          硬件强制 + 函数进出路径不加额外指令，比 clang 的软件影子栈开销更低、更难绕过——所以宁可把 hypervisor 侧做复杂，也要让硬件防护直达 guest。v20 rebase 到 v7.3-rc1，评审基本收尾。
      - label: "效益"
        text: >-
          云上的 arm64 客户机（含嵌套）可以启用硬件 ROP 防护；调用栈更完整也让 profiling 更可靠。对机密计算 / 安全敏感工作负载价值直接。
      - label: "下一步"
        text: >-
          第 20 版已相当成熟，剩下是评审收尾、等合入窗口；对 KVM / 硬件安全感兴趣的人可盯 kvmarm 列表跟进。
    verdict: "硬件安全特性做到「客户机也能用」才算真正落地——这是 arm64 安全地基收口前的一块关键拼图"
  - type: headline
    title: "设备认证用 Rust 重写：SPDM 说「复杂规范 × 不可信输入，正是内存安全该上阵的地方」"
    meta: "〔09-01 09:04 北京〕· [PATCH v3 00/21] lib: Rust implementation of SPDM"
    link: "https://lore.kernel.org/linux-pci/<20260901010347.2614656-1-alistair.francis@wdc.com>/"
    points:
      - label: "现状"
        text: >-
          设备在交给内核信任之前要验明正身——SPDM（Security Protocols and Data Models）负责认证、证明（attestation）与密钥交换，走 PCIe、MCTP、ATA、NVMe、TCP 等传输。内核把设备视为「未经证实的不可信对象」，验证过了才用。
      - label: "痛点"
        text: >-
          SPDM 规范庞大（1.2.1 近 200 页、1.3.0 近 250 页），而且内核要解析的是设备发来的不可信响应——复杂规范 + 敌对输入，教科书式的攻击面。用 C 手写解析这套，等于把可利用面敞开。
      - label: "方案"
        text: >-
          WDC（Alistair Francis）用 Rust 写了一个 SPDM requester（发起方）：PCI-CMA 走 TSM 驱动接入，当前是最小可用子集——能握手、向设备要 digest / certificate 并校验，最后回用户态一个「已认证」。v3 是独立系列，不依赖此前 Lukas 的 C 实现。
      - label: "为什么"
        text: >-
          与 C 手写解析这种两百页规范相比，Rust 的类型系统 + 内存安全天然适合复杂协议解析；RFC 阶段已验证过证书 / 证据能力，只是暂时不放进来，把最小可合入面先送上游。
      - label: "效益"
        text: >-
          内核态设备认证有了一块内存安全的实现地基，后续扩展证书、证据、自定义 nonce 都有干净落点；PCI TSM 与 CMA 共用一套用户接口，接口一致性更好。
      - label: "下一步"
        text: >-
          更高级特性逐步打开；需要基础框架（[4]）先上游，Rust SPDM 才能挂上 TSM 走完整链路——盯 linux-pci / TSM 两条线。
    verdict: "「Rust 最适合安全解析不可信协议」这次不是口号——SPDM 就是第一个为这个理由写进内核的协议栈"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "DW HDMI QP 补上 HDMI 2.0：Rockchip 4K@60 加 SCDC 加扰，VC4 一起迁到公共设施"
    meta: "〔09-02 02:50 北京〕· [PATCH v11 00/74] Add HDMI 2.0 support to DW HDMI QP TX"
    points:
      - label: "定位"
        text: "Synopsys DW HDMI QP TX（Rockchip RK3576 / RK3588 的显示输出）此前只能跑到 HDMI 1.4；要上 2.0 的 4K@60，需要 SCDC 管理高 TMDS 时钟比例与加扰（scrambling）。"
      - label: "做法"
        text: "74 帖（v11）先铺 DRM 基础设施——新增 HDMI 版本枚举、把 drmm_connector_hdmi_init() 的参数收进 hdmi_funcs 结构、SCDC 帮助函数、源端 TMDS 速率校验、HDMI 2.0 加扰回调；再在 DW HDMI QP bridge 落地加扰实现，Rockchip 平台接 HPD / PHY，最后把 VC4 HDMI 迁到公共设施当复用样板。"
      - label: "效益或下一步"
        text: "RK3576/RK3588 盒子、开发板的 4K@60 成为可能；公共的 SCDC / 加扰基础设施让后续驱动少吃一遍苦。v11 已是第 11 版，接近合入。"
    relevance: "用 Rockchip 做产品、或写 HDMI 驱动栈的同学，这套「基础设施先行、驱动再迁」是必读的范例。"
    link: "https://lore.kernel.org/dri-devel/<20260901-dw-hdmi-qp-scramb-v11-0-bc12954a0688@collabora.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "sysfb 修复 Lenovo D330 显示（v3）——固件 framebuffer 正确交棒给真实驱动"
        time: "09-01 16:20"
        link: "https://lore.kernel.org/dri-devel/<20260901082057.37617-1-tzimmermann@suse.de>/"
      - text: "amdgpu：v7.3-rc1 引入 alpha blend 模式未设置警告（REGRESSION 报告）"
        time: "09-01 15:37"
        link: "https://lore.kernel.org/dri-devel/<CANkdJ2VvJQSBzyOq=LgSW1=Z8-YiN_r9Py2iJ0UJDo55+dbfuA@mail.gmail.com>/"
      - text: "nouveau：nvif_object_mthd KASAN UAF + uvmm bind job UAF 修复"
        time: "09-01 15:36"
        link: "https://lore.kernel.org/dri-devel/<0101FF6B4641D94C+63f6ab39-aa06-4697-92fe-9241aef45218@smail.nju.edu.cn>/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "页表释放全面 RCU 化：锁无关的页表遍历要成真了"
    meta: "〔09-01 19:05 北京〕· [PATCH 00/12] mm: make userland page table freeing RCU-safe"
    points:
      - label: "定位"
        text: "页表页（page table pages）何时能安全释放、释放后能不能无锁遍历，一直是 mm 与各架构共同操心的事；多数架构早已在 RCU 宽限期后延迟释放，但还剩一批架构没有跟上。"
      - label: "做法"
        text: "12 帖把所有剩余架构统一成「RCU 宽限期后再释放」，顺带删掉 CONFIG_MMU_GATHER_RCU_TABLE_FREE 开关，并把 deposited page table 的 zap 也挪到 RCU 宽限期后。"
      - label: "效益或下一步"
        text: "唯一前提解决后，「RCU 单独保证下无锁遍历页表」成为可能——降低锁竞争、避免锁顺序问题，还砍掉一批架构特判代码；这是多年铺垫（Hugh / Qi Zheng / Lance Yang 等）之后的临门一脚。"
    relevance: "关心 mm 并发或页表遍历性能的，这条把「只剩 RCU 就能安全 walk」的基础彻底打通。"
    link: "https://lore.kernel.org/linux-mm/<20260901-rcu-pagetable-freeing-v1-0-5456a81c8212@kernel.org>/"
  - type: highlight
    title: "DAMON 把「访问」也当数据属性：探针模式下不再丢掉访问监控"
    meta: "〔09-01 21:25 北京〕· [PATCH v1.1 00/17] mm/damon: introduce data access-as-a-data attribute"
    points:
      - label: "定位"
        text: "DAMON 的探针系统（probe）监控各类数据属性（所属 cgroup、后备页类型等），但启用探针权重后就不再监控访问模式——同时关心属性又关心访问的用户两头顾不全。"
      - label: "做法"
        text: "17 帖把「数据访问」也做成一种数据属性：新增 pgidle_unset 探针（读页表 accessed bit + PG_idle 标志），配合 set_pgidle 预备动作在每个采样间隔清 accessed bit / 置 PG_idle，等价于把经典访问监控搬进探针体系。"
      - label: "效益或下一步"
        text: "属性和访问可以同时看，DAMON 对「既要过滤属性、又要看热点」的场景（内存冷热分层、迁移决策）更完整；v1.1 已吸收评审反馈，仍在 mm 列表推进。"
    relevance: "用 DAMON 做内存分层 / 迁移或观测内存热点的，这套「访问即属性」是架构语义上的小革命。"
    link: "https://lore.kernel.org/linux-mm/<20260901132506.99243-1-sj@kernel.org>/"
  - type: more
    title: "更多动态"
    items:
      - text: "mm/vmscan：修 MGLRU 回收路径 NR_ISOLATED 计数与节流（v5）"
        time: "09-01 17:13"
        link: "https://lore.kernel.org/linux-mm/<cover.1788252038.git.zhuhui@kylinos.cn>/"
      - text: "arm64 hugetlb：修 mprotect() 在连续 PTE 上的 BBM 问题"
        time: "09-01 21:18"
        link: "https://lore.kernel.org/linux-mm/<20260901131823.15799-1-kmehltretter@gmail.com>/"
      - text: "mm/damon：修 core / paddr / vaddr 的 DAMOS 系列 bug（0/8）"
        time: "09-01 21:19"
        link: "https://lore.kernel.org/linux-mm/<20260901131850.98037-1-sj@kernel.org>/"
      - text: "memblock：保留 reserve_mem 区域时修正页计数"
        time: "09-02 00:52"
        link: "https://lore.kernel.org/linux-mm/<20260901165237.1025973-1-ekffu200098@gmail.com>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "ARP/ND 邻居表按命名空间隔离：v5 用 15 帖把全局表关进 netns"
    meta: "〔09-02 02:33 北京〕· [PATCH v5 net-next 00/15] neighbour: Namespacify arp_tbl and nd_tbl"
    points:
      - label: "定位"
        text: "内核的邻居表（arp_tbl / nd_tbl，IP→MAC 映射）历来是全局单例，所有网络命名空间共用一套 sysctl 阈值和 GC 节奏。"
      - label: "做法"
        text: "15 帖把两张表做成 per-netns：net->neigh_tables[] 数组接管、新 helper 替换直接访问、新增 net.core.neigh_inherit_init_net 控制新命名空间是否继承初始表设置。"
      - label: "效益或下一步"
        text: "每个 netns 可独立调 GC 阈值，容器 / 虚拟路由场景不再互相拖累；v5 是谷歌 kuniyu 打磨多轮的成熟版。"
    relevance: "做容器网络、路由虚拟化的，「每个 netns 一张邻居表」直接关系隔离粒度与 GC 行为。"
    link: "https://lore.kernel.org/netdev/<20260901183327.3332855-1-kuniyu@google.com>/"
  - type: highlight
    title: "netfilter flowtable 开打隧道 offload：IPv4-in-IPv6 与 SIT 先铺路"
    meta: "〔09-02 00:32 北京〕· [PATCH nf-next 0/6] preliminary support for IPv4 over IPv6 and SIT flowtable offload"
    points:
      - label: "定位"
        text: "flowtable 把已建立的连接从协议栈软路径切到硬件 / 快速路径（offload），但隧道流（inner / outer 协议不同）的匹配与封装此前支持不全。"
      - label: "做法"
        text: "6 帖给 nf_flow_table 补隧道语义：识别 IPv4 / IPv6 内外协议、pop 隧道头时写回 inner proto、统一 IPv4 / IPv6 的 tunnel push、把 encap_proto 带进 offload 元数据。"
      - label: "效益或下一步"
        text: "为 ip6ip / SIT 这类隧道做 flowtable 硬件加速铺平道路（Qualcomm 在推）；对公网隧道 / 负载均衡场景吞吐有实际价值。"
    relevance: "做 SD-WAN、隧道网关、边缘负载均衡的，隧道流进硬件快速路径是省 CPU 的好消息。"
    link: "https://lore.kernel.org/netdev/<20260901-nf-flowtable-sw-accel-ip6ip-sit-preliminary-v1-0-72e49be8c31f@oss.qualcomm.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "net：修 UDP 长度在 PMTU 探测 + 大 MTU 下的溢出（net v5，0/4）"
        time: "09-02 03:57"
        link: "https://lore.kernel.org/netdev/<20260901195714.673548-1-alice.kernel@fastmail.im>/"
      - text: "netfilter：x_tables 不再在可 fault 的用户拷贝上持锁（安全加固）"
        time: "09-01 21:48"
        link: "https://lore.kernel.org/netdev/<cover.1788244146.git.zihanx@nebusec.ai>/"
      - text: "net：gro 修 TCP GSO SKB 的嵌套问题"
        time: "09-01 16:23"
        link: "https://lore.kernel.org/netdev/<20260901082312.14596-1-zhaoping.shu@mediatek.com>/"
      - text: "mptcp：修 request 迁移的持有权（net v5，0/2）"
        time: "09-01 18:33"
        link: "https://lore.kernel.org/netdev/<cover.1788202924.git.caoruide123@gmail.com>/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "SMMUv3 接上硬件页请求（PRI）：PCIe 设备也能「缺页缺到 IOMMU」"
    meta: "〔09-01 08:34 北京〕· [PATCH v3 00/13] iommu/arm-smmu-v3: Add PRI support"
    points:
      - label: "定位"
        text: "做 PASID / SVA（共享虚拟地址）时，设备要能像 CPU 一样缺页——PCIe 的 PRI（Page Request Interface）就是干这个的；而 SMMUv3 驱动此前不处理 PRI 队列事件、也不回 IOPF 故障。"
      - label: "做法"
        text: "13 帖补齐：分配 IOPF 队列、把 PRI 页请求转成 iopf_fault、用 CMDQ_OP_PRI_RESP 回响应；配套硬件队列排空（arm_smmu_drain_queue）、把 teardown 移出全局锁、IRQ 同步收尾。NVIDIA 工程师已实测验证 PRI 特性。"
      - label: "效益或下一步"
        text: "加速器 / 网卡做 SVA 时不再依赖软件补丁式页管理，缺页路径走硬件 PRI；这也是 PASID、共享虚拟地址在 arm64 上落地的关键一环。v3 rebase 到 v7.3-rc1，评审进行中。"
    relevance: "做 GPU / NIC / 加速器驱动、或搞 PASID / SVA 的，SMMUv3 的 PRI 是设备内存管理的地基。"
    link: "https://lore.kernel.org/linux-pci/<cover.1788222485.git.nicolinc@nvidia.com>/"
  - type: divider
    label: "📰 arch"
    kind: section
  - type: highlight
    title: "RISC-V 第一次有 resctrl：CBQRI 缓存容量分配落地（v7）"
    meta: "〔09-02 06:32 北京〕· [PATCH v7 0/5] riscv: Add Ssqosid and initial CBQRI resctrl support"
    points:
      - label: "定位"
        text: "x86 有 CAT / CDP、能按 CPU 分组分缓存；RISC-V 生态一直缺对等的资源控制。Ssqosid 扩展（srmcfg CSR）+ CBQRI 控制器给了硬件基础。"
      - label: "做法"
        text: "5 帖把 RISC-V 接进 resctrl：Ssqosid 支持、CBQRI 控制器接口、DT 平台驱动，已在 Tenstorrent Ascalon 共享缓存控制器和 QEMU 上验证；L2 / L3 缓存容量分配（CBM）走 resctrl schemata。"
      - label: "效益或下一步"
        text: "多租户 / 混合负载下可以像 x86 那样按分组切缓存；带宽分配因与 resctrl MB 语义不匹配暂未做，留给通用 schema 描述后续补。"
    relevance: "做 RISC-V 服务器、边缘多租户或缓存 QoS 的，这是 RISC-V 资源控制从 0 到 1 的时刻。"
    link: "https://lore.kernel.org/linux-rt-devel/<20260901-dfustini-atl-sc-cbqri-dt-v7-0-ca2935d85622@kernel.org>/"
  - type: more
    title: "更多动态"
    items:
      - text: "sparc64：补上 seccomp 过滤器支持（0/2）"
        time: "09-02 06:08"
        link: "https://lore.kernel.org/lkml/<20260901220811.3369666-1-stian@itx.no>/"
      - text: "cpufreq：Zen6 客户端 CPPC——AMD boost ratio 处理重构（v2，0/3）"
        time: "09-02 05:59"
        link: "https://lore.kernel.org/lkml/<20260901215913.3042182-1-mario.limonciello@amd.com>/"
      - text: "arch：microblaze 信号处理与 ABI 参数归位修复（讨论中）"
        time: "09-01 19:51"
        link: "https://lore.kernel.org/linux-arch/<1bea6e00-1917-4544-b8ea-f28415e21db7@monstr.eu>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "mount 的 idmap 用 const 锁死：27 帖把 VFS 全家桶参数 const 化"
    meta: "〔09-01 20:14 北京〕· [PATCH 00/27] fs: port to const struct mnt_idmap"
    points:
      - label: "定位"
        text: "每次 mount 的 idmapping（uid / gid 映射）一旦挂载就不可变，只有引用计数可变；但 VFS 各 inode 操作签名里传的都是非 const 指针。"
      - label: "做法"
        text: "27 帖（Brauner）从底层往上把所有 mnt_idmap 参数 const 化：权限检查 helper、inode 操作（create / mkdir / symlink / rename / setattr / getattr…）、quota、nop / invalid idmap 全部改成 const 指针。"
      - label: "效益或下一步"
        text: "类型系统把「只能读、不能改」写进 API，防止任何代码在持有 idmap 时顺手改动它——安全 + 可读性双收；顺带为 lsm 把 mount idmap 暴露给 inode hook（v2）铺路。"
    relevance: "做 VFS、容器挂载或写文件系统的，这套跨全内核的 const 化是「不可变性写进类型」的教科书。"
    link: "https://lore.kernel.org/linux-fsdevel/<20260901-work-idmap-const-v1-0-54ccd48e100b@kernel.org>/"
  - type: more
    title: "更多动态"
    items:
      - text: "lsm：把 mount idmaps 暴露给 inode hooks（v2）——fs 与 LSM 的接缝"
        time: "09-01 20:50"
        link: "https://lore.kernel.org/linux-fsdevel/<20260901-lsm-mount-idmaps-v2-1-3309b9d1eda2@amutable.com>/"
      - text: "fs/dax：只在 entry 拿到 folio 之后才取它"
        time: "09-02 03:57"
        link: "https://lore.kernel.org/linux-fsdevel/<20260901195658.4027962-1-cinereal@riseup.net>/"
      - text: "ufs：校验 cylinder group 空闲位图偏移（安全）"
        time: "09-02 02:06"
        link: "https://lore.kernel.org/linux-fsdevel/<20260901180600.10394-1-cenzhang@linux.microsoft.com>/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "联想 Yoga Book 的相机活了：atomisp 平台 + OV 传感器 + 对焦马达驱动齐上"
    meta: "〔09-02 03:04 北京〕· [PATCH v6 00/16] media: Add Yoga Book camera support"
    points:
      - label: "定位"
        text: "Lenovo Yoga Book 用 Intel atomisp 平台配 OV2740 / OV8858 传感器，但内核里 atomisp 长期在 staging、传感器 / 桥配置都没对齐，相机基本不可用。"
      - label: "做法"
        text: "16 帖打通：ov2740 / ov8858 加 ACPI ID 与时钟 / 增益支持、新增 WV517S 对焦马达（lens actuator）驱动、ipu-bridge 加 Yoga Book 传感器配置、atomisp 允许 raw Bayer 捕获并支持按传感器链路频率推 CSI-2 时序。"
      - label: "效益或下一步"
        text: "一台老 Yoga Book 的摄像头从「坏了」变「能出图」；atomisp 往正规化的路上又进一步。v6 已在收集评审。"
    relevance: "玩 atomisp 老机、或做 x86 摄像头平台适配的，这条把「传感器 → bridge → ISP」整条链对齐了一遍。"
    link: "https://lore.kernel.org/linux-media/<cover.1788286339.git.mauriziocasciano7@gmail.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "回归：ipu-bridge IVSC 相机被 7.2 的 CVS 支持补丁弄坏（7.1 → 7.2 REGRESSION）"
        time: "09-02 03:48"
        link: "https://lore.kernel.org/linux-media/<20260901194526.6369-1-gvozdoder@gmail.com>/"
      - text: "media rc：修 rc core 的 ABBA 死锁与 attach / unregister 竞态（v2，0/6）"
        time: "09-01 22:25"
        link: "https://lore.kernel.org/linux-media/<cover.1788272198.git.sean@mess.org>/"
      - text: "media：staging max96712 remove / 错误路径清理"
        time: "09-02 02:55"
        link: "https://lore.kernel.org/linux-media/<CALVpWBsXgOYSeTH6omxbfcwfrEg0kEv=cQ+Z8nRjksFBvHaSaw@mail.gmail.com>/"
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "rust_binder 加固：禁 mremap、禁 VMA 分裂（v4）"
    meta: "〔09-02 04:53 北京〕· [PATCH v4 7/7] rust_binder: reject mremap()"
    points:
      - label: "定位"
        text: "rust_binder 是 Android Binder 的 Rust 移植，内存映射语义与 C 版对齐是重点——mremap 和 VMA 分裂会让 binder 维护的映射拓扑与 mm 侧实际状态脱节。"
      - label: "做法"
        text: "7 帖加固：禁止对 binder 映射 mremap()、禁止 VMA 分裂（forbid vma splitting），从 VMA 层面锁死映射生命周期。"
      - label: "效益或下一步"
        text: "减少一类因映射被改动引发的悬挂 / 崩溃路径，Rust 版 binder 更接近可上生产；v4 在 google 与维护者间来回打磨。"
    relevance: "关注 Android / 移动内核、或 Rust 驱动里「Rust 内存模型与 mm 对齐」的，这条是实例。"
    link: "https://lore.kernel.org/rust-for-linux/<20260901205250.1638304-8-cmllamas@google.com>/"
  - type: highlight
    title: "Rust io：寄存器投影（projection）支持，删掉相对寄存器（v4，16 帖）"
    meta: "〔09-02 00:50 北京〕· [PATCH v4 00/16] rust: io: support register projections and remove relative registers"
    points:
      - label: "定位"
        text: "内核 Rust 的 io 寄存器抽象（register / register 字段）在表达「结构体内嵌、带位域的寄存器组」时能力有限，相对寄存器（relative register）语义也纠缠不清。"
      - label: "做法"
        text: "16 帖给 register 加类型化基址（typed base）、支持 fixed offset 无位域寄存器、寄存器投影（projection），最终移除相对寄存器。"
      - label: "效益或下一步"
        text: "Rust 设备驱动写 MMIO 寄存器更贴近硬件布局、类型更安全；Nova（NVIDIA GPU 的 Rust 驱动）正是这层的直接用户。"
    relevance: "写 Rust 内核驱动、或关注 Nova 进展的，寄存器抽象是驱动落地的第一块砖。"
    link: "https://lore.kernel.org/dri-devel/<20260901-typed_register-v4-0-5552b1d59525@garyguo.net>/"
  - type: more
    title: "更多动态"
    items:
      - text: "gpu/nova-core：修 CPU ↔ GSP 消息路径的 barrier 用法（v4，0/2）"
        time: "09-02 04:59"
        link: "https://lore.kernel.org/dri-devel/<20260901-rust-barrier-v4-0-94427f445310@garyguo.net>/"
      - text: "rust: pci 拒绝装不进 u32 的 IRQ 向量索引（讨论中）"
        time: "09-01 23:58"
        link: "https://lore.kernel.org/linux-pci/<DL41F1VLHKH1.2KME3J6V7CZH1@nvidia.com>/"
  - type: divider
    label: "📊 板块活跃度 · 近 24h"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-02/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h（lkml 1200 · net 593 · mm 437 居前）"
  - type: toc
    items:
      - label: "Top3"
        text: "lkml 1200 · net 593 · mm 437（radar.sh stats 全 13 列表 T24 计数）"
      - label: "观察"
        text: "net 最活跃（593），mm（437）紧咬；DRM（363）、PCI（271）与 Rust（134）跟随；virtio-dev 窗口内 0 条，virtio 板块信号靠跨帖捕获（今日 virtio-blk 内联加密讨论来自 block / crypto 侧）。"
  - type: divider
    label: "⚙️ 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "virtio"
        text: "virtio-blk 客户机内联加密（讨论继续，多轮）——qcom 推动，跨 virtio / crypto / block 三层 <a href=\"https://lore.kernel.org/virtio-dev/<20260821125526.2801257-1-linlin.zhang@oss.qualcomm.com>/\">原文</a>"
      - label: "vfio"
        text: "拒绝 cdev 二次 open 后再动共享设备状态（Alex Williamson，0/4）——加固设备共享路径 <a href=\"https://lore.kernel.org/lkml/<20260901215358.2421359-1-alex.williamson@nvidia.com>/\">原文</a>"
      - label: "dma-buf"
        text: "修 phys vec → sgt 的静默溢出与对齐（v8，mm ↔ 视频）——物理向量转分散表时长度可能悄悄截断 <a href=\"https://lore.kernel.org/linux-media/<20260901170849.4052816-1-dhu@x6u.co>/\">原文</a>"
      - label: "security"
        text: "KEYS/TPM：修 tpm2_load_cmd() 边界检查（jarkko）——TPM2 加载命令的越界防护 <a href=\"https://lore.kernel.org/linux-security-module/<20260901205809.2028454-1-jarkko@kernel.org>/\">原文</a>"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "GCS"
        text: "arm64 的受保护控制栈（硬件影子栈）——返回地址栈页只能由专用指令写，防 ROP 攻击；今日头条主角。"
      - label: "EXLOCK"
        text: "arm64 异常锁——进入异常时锁定寄存器状态，GCS 的 KVM 模拟核心。"
      - label: "SCDC / 加扰"
        text: "HDMI 2.0 的状态与数据通道 / 高 TMDS 时钟下的伪随机加扰（降低 EMI）——DW HDMI QP 上 2.0 的关键。"
      - label: "SPDM"
        text: "安全协议与数据模型——设备认证 / 证明 / 密钥交换，跨 PCIe / MCTP / ATA / NVMe / TCP；今日头条之二。"
      - label: "TSM"
        text: "Trusted Security Module——内核统一的受信安全模块抽象，PCI-CMA 经它暴露给用户态。"
      - label: "PRI / IOPF"
        text: "PCIe 页请求接口 / IOMMU 页请求故障——设备像 CPU 一样缺页，IOMMU 转成软件可处理的 fault。"
      - label: "resctrl / CBM"
        text: "资源控制文件系统 / 容量位图——按 CPU 分组分配缓存；RISC-V 今日用 CBQRI 接入。"
      - label: "mnt_idmap"
        text: "挂载点的 uid / gid 映射，挂载后不可变——今日被 27 帖 const 化写进类型。"
      - label: "PG_idle"
        text: "页标志位，表示页已被标记为回收候选；DAMON 的 pgidle_unset 探针靠它把「访问」变成可监控属性。"
  - type: closing
    tagline: "如果觉得有用，点个赞，或留言聊聊你最关心的内核话题。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
