---
title: "显存归 Rust 管，机密内存免拷贝"
date: "2026-08-11"
desc: "NVIDIA Rust 驱动 nova-core 加 PRAMIN 窗口；guest_memfd 支持 shared↔private 原地转换。"
column: "daily"
tags: ["DRM", "mm", "media", "net", "fs", "PCI", "Rust"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看两件事：<strong>NVIDIA 的 Rust 驱动 nova-core 给「CPU 写显存」立了新规矩</strong>，和 <strong>机密虚拟机的内存切换终于要免拷贝了</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-11/cover.png"
    alt: "封面 · 8月11日 · nova-core PRAMIN 窗口 + guest_memfd 原地转换"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "nova-core 加 PRAMIN 窗口：Rust 驱动把「CPU 写显存」变成类型安全 API"
      - label: "头条"
        text: "guest_memfd 原地转换：机密计算 shared↔private 切换免拷贝"
      - label: "机制"
        text: "rcu/srcu：call_rcu/call_srcu 以后任意上下文都能调"
      - label: "机制"
        text: "netfs 用 bvecq 队列换掉 folio_queue"
      - label: "机制"
        text: "mm per-VMA 锁放开到全配置，tcp 顺势删掉 mmap_lock 兜底"
      - label: "亮点"
        text: "Rockchip rkvdec 视频解码器支持多核并行"
      - label: "亮点"
        text: "Broadcom bnxt_en 网卡补上 kTLS 发送卸载"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: nova-core 加 PRAMIN 窗口：NVIDIA Rust 驱动正式接管显存访问
    meta: "〔08-10 21:57 北京〕· [PATCH v2 00/12] gpu: nova-core: add PRAMIN window support"
    points:
      - label: "现状"
        text: "nova-core 是 NVIDIA 正在用 Rust 重写的新一代开源 GPU 驱动。GPU 和 CPU 之间有一条固定通道：CPU 通过 PRAMIN（PCI 映射窗口）读写显存/寄存器，绕过完整的 DMA 路径，用于上传纹理、命令缓冲这类数据。"
      - label: "痛点"
        text: "窗口怎么开、开多大、写进去的地址对不对，过去全靠驱动里的散装代码把账，缺少统一的内存管理器，地址类型也不安全——用错偏移就是写进错误显存位置。"
      - label: "方案"
        text: "v2 系列（12 补丁）搭出 nova-core 的显存访问骨架：GpuMm 集中式内存管理器 + PRAMIN 窗口寄存器抽象 + VramAddress 类型 + 一整套自测断言宏。核心是把「开窗口→写显存」封成带类型的 Rust API。"
      - label: "为什么"
        text: "用 Rust 类型系统把窗口偏移、映射生命周期编码进类型，越界/错位在编译期就拦住，而不是运行时炸在 GPU 上；对齐 PRAMIN 窗口粒度，地址语义自解释。"
      - label: "效益"
        text: "nova-core 的内存管理层成型，为后续显存分配、命令缓冲、与 DRM 抽象对接铺路；也给出「Rust 驱动怎么写设备内存」的完整范本。"
      - label: "下一步"
        text: "PRAMIN 自测落地后，窗口机制会向上长成完整显存分配器；同批 Rust 驱动（如 drm/tyr）也在共用这套内存抽象。"
    verdict: "GPU 驱动的内存账，第一次交给类型系统去算——这是 Rust 内核驱动含金量最高的一步。"
    link: "https://lore.kernel.org/dri-devel/<20260810-pramin-split-v2-0-65a00b3c7309@nvidia.com>/"
  - type: headline
    title: guest_memfd 原地转换：机密 VM 的 shared/private 切换终于不用整页拷贝
    meta: "〔08-10 16:43 北京〕· [PATCH v10 00/41] guest_memfd: In-place conversion support"
    points:
      - label: "现状"
        text: "机密虚拟机（TDX/SNP）把内存分成 shared/private 两侧：private 页归 guest 私有、被 TEE 加密保护，shared 页与宿主机共享。guest_memfd 是管理 private 内存的 fd 抽象。"
      - label: "痛点"
        text: "今天页在 shared↔private 之间切换要搬整页（拷贝或重建映射），高频共享场景（DPU 卸载、页共享）切换开销直接拖累吞吐。"
      - label: "方案"
        text: "v10 大系列（41 补丁）给 guest_memfd 加原地（in-place）转换能力：直接在原页上改属性，配套 per-gmem 属性位、映射冻结、LUO 保留等机制，并带上完整 KVM selftests。"
      - label: "为什么"
        text: "省掉整页拷贝与页迁移的往返，是机密计算里共享/私有高频切换的关键优化；属性按 gmem 实例细分，权限边界更清晰。"
      - label: "效益"
        text: "云端机密 VM 的页共享、vCPU 热插拔、设备卸载路径切换延迟大幅下降，TEE 内存利用率更高。"
      - label: "下一步"
        text: "v10 讨论中，冻结映射与 LUO 保留的语义还在收口；合入后会影响 TDX/SNP 全栈的内存路径。"
    verdict: "机密内存从「搬来搬去」走向「原地改属性」——云计算 TEE 的性能大头又砍掉一块。"
    link: "https://lore.kernel.org/linux-mm/<20260807-gmem-inplace-conversion-v10-0-2fc18ee6d3ba@google.com>/"
  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "RCU 任意上下文"
        text: "call_rcu()/call_srcu() 做到 NMI、原子上下文都能安全调用（v4）· <a href=\"https://lore.kernel.org/linux-rt-devel/<20260810122758.183765-1-puranjay@kernel.org>/\">原文</a>"
      - label: "netfs bvecq"
        text: "用分段 bio_vec 队列（bvecq）取代 folio_queue，afs/cifs/smbdirect/cachefiles 全量切换，删掉 ITER_FOLIOQ（v9 26 补丁）· <a href=\"https://lore.kernel.org/linux-fsdevel/<20260810144746.574036-1-dhowells@redhat.com>/\">原文</a>"
      - label: "per-VMA 锁通用化"
        text: "per-VMA 锁（细粒度 mmap 读锁）放开到全配置可用，配 RCU 版 VMA 查找；tcp 也删掉 mmap_lock 兜底路径（v4）· <a href=\"https://lore.kernel.org/linux-mm/<CAJuCfpHicSdLmz3gPyY6x+M6KWFe-FC5DR2QivX90bc+V_0O9g@mail.gmail.com>/\">原文</a>"
      - label: "热页追踪"
        text: "mm 热页追踪与促升级基础设施，面向分层内存（CXL/DRAM）的页迁移策略（v8）· <a href=\"https://lore.kernel.org/linux-mm/<20260810143706.93163-1-sj@kernel.org>/\">原文</a>"
      - label: "DRM RAS 上报"
        text: "drm_ras 用 netlink 事件向用户态上报 GPU 可纠正/不可纠正错误（v7）· <a href=\"https://lore.kernel.org/dri-devel/<20260810112008.1858731-5-riana.tauro@intel.com>/\">原文</a>"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: Rockchip rkvdec 视频解码器支持多核并行
    meta: "〔08-10 23:22 北京〕· [PATCH v2 0/5] media: rkvdec: Enable multi-core support"
    points:
      - label: "定位"
        text: "media 的 v4l2-mem2mem 层——Rockchip 的视频硬解驱动 rkvdec 此前只能用一个解码核，多核芯片的算力闲置。"
      - label: "做法"
        text: "v2 系列把 rkvdec 拆成 core + master 双驱动，导出 v4l2_m2m_set_max_parallel_jobs，让 v4l2-mem2mem 并行跑多个解码 job，并把解码核按队列分发。"
      - label: "效益"
        text: "多核 SoC 上解码吞吐逼近线性扩展；v4l2-mem2mem 拿到「并行 job」通用能力，其他编解码驱动可复用。"
    relevance: "v4l2-mem2mem 走向并行，硬解性能调优和驱动移植都可以照抄这套拆法。"
    link: "https://lore.kernel.org/linux-media/<20260810-rkvdec-multicore-v2-0-986f89d22cdc@collabora.com>/"
  - type: highlight
    title: v4l2-subdev 客户端能力大重构（v7 14/14）
    meta: "〔08-10 23:32 北京〕· [PATCH v7 0/14] media: v4l2-subdev: Restructure client capabilities"
    points:
      - label: "定位"
        text: "media 的 subdev 抽象层——v4l2_subdev 是摄像头/ISP 子设备的通用接口，能力位（capabilities）散在各处。"
      - label: "做法"
        text: "把 subdev 客户端能力收进独立结构体，get_fmt/set_fmt 语义收敛，并新增 ci_state 状态查询接口，删掉重复实现。"
      - label: "效益"
        text: "subdev 接口语义更干净，新 sensor/ISP 驱动接入时的重复代码变少。"
    relevance: "摄像头子设备接口是嵌入式相机栈的公共地基，接口收敛直接影响驱动开发量。"
    link: "https://lore.kernel.org/linux-media/<20260810153207.GC3011310@killaraus.ideasonboard.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<CANiDSCs37sMQM+zjVnWTqnVejpu8uCb_sax5w3bHikb8z9TnkQ@mail.gmail.com>/"
        text: "uvcvideo 修帧缓冲大小计算的整数溢出"
        time: "08-10 22:12"
      - link: "https://lore.kernel.org/linux-media/<20260810062521.1709379-1-congnt264@gmail.com>/"
        text: "sun4i-csi 修 probe/streaming 生命周期泄漏（v2，3 补丁）"
        time: "08-10 14:25"
      - link: "https://lore.kernel.org/linux-media/<660DEFF8A732CF1A+20260810095012.2213444-1-raoxu@uniontech.com>/"
        text: "v4l2-async 修 link error 时误删未链接 ASC 条目"
        time: "08-10 17:54"
      - link: "https://lore.kernel.org/linux-media/<20260810055128.119618-1-fanwu01@zju.edu.cn>/"
        text: "au0828 修断开时 bulk_timeout 定时器 use-after-free"
        time: "08-10 13:52"
      - link: "https://lore.kernel.org/linux-media/<20260810162406.118981-2-A.Nasrolahi01@gmail.com>/"
        text: "v4l2-core 让 video 设备数量可配置"
        time: "08-11 00:25"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: vmwgfx 再报安全洞：guest 传 pitch 可越界读
    meta: "〔08-10 14:38 北京〕· [SECURITY] drm/vmwgfx: unprivileged OOB read in vmw_kms_cursor_snoop via unbounded guest.pitch"
    points:
      - label: "定位"
        text: "vmwgfx（VMware 虚拟显卡）的 KMS 命令解析层——cursor snoop 读像素时直接信任 guest 传入的 pitch（行距）。"
      - label: "做法"
        text: "漏洞报告：未受限的 guest.pitch 可触发非特权越界读；内核侧此前已连续加固 pitch/命令边界校验。"
      - label: "下一步"
        text: "等待修复补丁落地——恶意 guest 借此可读宿主机内存，虚拟化显卡安全值得盯着。"
    relevance: "虚拟化显卡的安全修复节奏，跑虚拟机的读者值得留意 CVE 落点。"
    link: "https://lore.kernel.org/dri-devel/<CAP7KL_8Q-R38p5XxE1_DEGk1P5kW3vHvm8czAiMnPFRuq=f0og@mail.gmail.com>/"
  - type: highlight
    title: drm/sched 新调度策略翻车：满载时 9070XT 严重掉性能
    meta: "〔08-10 21:48 北京〕· [REGRESSION] drm/sched: FAIR policy causes serious performance degradation at max GPU load on 9070XT"
    points:
      - label: "定位"
        text: "drm/sched（GPU 内核调度器）新引入的 FAIR 公平调度策略，目标是在多引擎间公平分配 job。"
      - label: "做法"
        text: "实测在 AMD RX 9070 XT 满载时 FAIR 策略造成严重性能退化，已作为回归上报，进入回退或修复讨论。"
      - label: "下一步"
        text: "调度策略涉及所有 GPU 驱动，修复/回退决策会影响 AMD 系显卡的用户体验。"
    relevance: "GPU 调度是玩家直接能感知的层——满载掉帧的锅这次指向调度器。"
    link: "https://lore.kernel.org/dri-devel/<6e2a207e-4db6-4d47-b1f6-9cb13b8d6eeb@igalia.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20260810165322.24682-1-pierre-eric.pelloux-prayer@amd.com>/"
        text: "amdgpu 加 wedge 事件：设备彻底挂死后跳过 TLB flush/GART 解绑"
        time: "08-11 00:54"
      - link: "https://lore.kernel.org/dri-devel/<CAKTNdwFPhVrjb4iVpN19f0Nw+MA_BxXLOLs4V50fuyf+_rbEPg@mail.gmail.com>/"
        text: "Rockchip 平台 Synopsys DP 控制器改进（v11，21 补丁）"
        time: "08-10 20:08"
      - link: "https://lore.kernel.org/dri-devel/<38ED9D73-7BF3-4005-8E1C-4F7125906A20@goldelico.com>/"
        text: "backlight 移除古早 pandora_bl 驱动（16 补丁清理）"
        time: "08-11 04:58"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: mm/cma RFC：不释放仍在使用的 CMA 页
    meta: "〔08-11 02:53 北京〕· [RFC v2] mm/cma: don't release CMA pages still in use"
    points:
      - label: "定位"
        text: "CMA（连续内存分配器）为驱动保留大块连续内存，页释放逻辑把仍被占用的页提前放走会破坏连续性承诺。"
      - label: "做法"
        text: "RFC v2 让 CMA 在判断可释放前先确认页确实不再被使用，堵住连续性被提前破坏的路径。"
      - label: "效益"
        text: "相机/GPU 等吃连续内存的驱动拿到更稳的内存承诺，少见 OOM 时连续性不足。"
    relevance: "跑嵌入式/多媒体设备的读者会直接受益——CMA 是摄像头与 GPU 常客。"
    link: "https://lore.kernel.org/linux-mm/<50b1dadb-37f1-48a0-adf6-c6ff8b704582@kernel.org>/"
  - type: highlight
    title: mm/swap：坏 swap 条目不再死循环刷屏
    meta: "〔08-11 01:20 北京〕· [PATCH 0/3] mm, swap: don't spin or flood the console on a bad swap entry"
    points:
      - label: "定位"
        text: "swap 层遇到畸形条目时，get_swap_device() 可能自旋重试并刷爆内核日志。"
      - label: "做法"
        text: "3 补丁区分「畸形条目」与「设备死亡」，坏条目报错限速、不重试，页面故障直接失败。"
      - label: "效益"
        text: "坏 swap 场景从内核卡死变成一次干净失败，可观测性更好。"
    relevance: "swap 是内存兜底，坏条目处理决定系统是「卡死」还是「优雅降级」。"
    link: "https://lore.kernel.org/linux-mm/<20260810102034.547699380bbe7aeb232344a9@linux-foundation.org>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: Broadcom bnxt_en 网卡补上 kTLS 发送卸载
    meta: "〔08-10 13:14 北京〕· [PATCH net-next v6 00/15] bnxt_en: Add kTLS TX offload support"
    points:
      - label: "定位"
        text: "net 的硬件卸载层——kTLS 让 TLS 加解密在内核/网卡做，应用无需感知证书协议；bnxt_en 是 Broadcom 网卡驱动。"
      - label: "做法"
        text: "v6 系列实现 TLS TX 卸载：MPC 通道分配、加密 key 上下文管理、inline 发送 BD 与 kTLS 正常路径，15 补丁成套落地。"
      - label: "效益"
        text: "数据中心走 TLS 的流量（nginx/网关）从 CPU 卸到网卡，加密不再抢核。"
    relevance: "高吞吐加密卸载的又一块拼图，跑大流量服务的读者最关心。"
    link: "https://lore.kernel.org/netdev/<20260810051358.1244418-1-michael.chan@broadcom.com>/"
  - type: highlight
    title: Netfilter/IPVS 13 连发：一轮修复批量上线
    meta: "〔08-11 03:06 北京〕· [PATCH net 00/13] Netfilter/IPVS fixes for net"
    points:
      - label: "定位"
        text: "netfilter 与 IPVS（内核负载均衡）——防火墙/NAT/四层转发的地基。"
      - label: "做法"
        text: "13 补丁批次：ipset list:set 的 refcount 竞态、ipvs 校验 ihl 防越界、IPv4 options 清理、flowtable GC 可见性等。"
      - label: "效益"
        text: "一批稳定版候选修复，直接进入 net 分支，后续回流 stable。"
    relevance: "iptables/nftables/IPVS 用户多，这批是实打实的稳定性修复。"
    link: "https://lore.kernel.org/netdev/<20260810190621.894119-1-pablo@netfilter.org>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: famfs v13：面向内存池（FAM）的新文件系统继续推进
    meta: "〔08-11 04:23 北京〕· [PATCH v13 00/12] famfs: the Fabric-Attached Memory File System (standalone)"
    points:
      - label: "定位"
        text: "fs 层的新文件系统——Fabric-Attached Memory（内存池/机架级内存）这类设备内存，用 DAX 直访而非普通块设备。"
      - label: "做法"
        text: "v13 提供 mmap/VM fault、MAP_CREATE ioctl 与 fmap 摄取、daxdev 注册与 notify_failure 支持，独立成卷。"
      - label: "效益"
        text: "CXL/内存池设备在 Linux 里有了原生文件语义——mmap 即内存，df 能看容量。"
    relevance: "内存池/CXL 是内存未来的方向，famfs 是这套生态的内核入口之一。"
    link: "https://lore.kernel.org/linux-fsdevel/<0100019fed5850ec-2bdfb17a-3086-44ea-8fdd-777d3ce12a33-000000@email.amazonses.com>/"
  - type: highlight
    title: xfs 迎来 fs-verity，带 post-EOF Merkle 树
    meta: "〔08-10 16:28 北京〕· [PATCH v14 00/21] fs-verity support for XFS with post EOF merkle tree"
    points:
      - label: "定位"
        text: "fs-verity（文件内容完整性校验，安卓 OTA/容器镜像在用）长期只有 ext4/f2fs 支持，XFS 是最大的一块空白。"
      - label: "做法"
        text: "v14 系列为 XFS 实现 fs-verity，Merkle 树放在 post-EOF 区，fsverity 填零哈希流程一并优化。"
      - label: "效益"
        text: "XFS 用户（服务器/发行版）拿到文件级防篡改校验能力。"
    relevance: "服务器文件完整性校验补齐到主力文件系统，安全与运维直接受益。"
    link: "https://lore.kernel.org/linux-fsdevel/<anmFWhPNOqe4uyht@aalbersh-thinkpadx1carbongen13.rmtcz.csb>/"
  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: vfio/pci 补上 PCIe TPH 支持（v20）
    meta: "〔08-10 09:15 北京〕· [PATCH v20 00/16] vfio/pci: Add PCIe TPH support"
    points:
      - label: "定位"
        text: "PCIe 的 TPH（TLP Processing Hints，报文处理提示）让设备按负载提示路由缓存；vfio 透传场景此前不带 TPH。"
      - label: "做法"
        text: "v20 系列给 vfio/pci 透传设备加上 TPH 能力透出，16 补丁含 PCI 与 vfio 两层配合。"
      - label: "效益"
        text: "透传网卡/NVMe 到虚拟机也能吃到 TPH 的缓存优化红利。"
    relevance: "PCIe 生态的新特性进透传路径，虚拟化硬件直通玩家关注。"
    link: "https://lore.kernel.org/linux-pci/<e31b0dcf-1a10-4fb5-b364-5f821df6f8dc@huawei.com>/"
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: Rust 驱动再进一步：可重入关中断 + SpinLockIrq
    meta: "〔08-10 18:50 北京〕· [PATCH v5 00/18] Refcounted interrupt disable and SpinLockIrq for Rust"
    points:
      - label: "定位"
        text: "Rust 内核抽象的安全原语——把「关本地中断」引用计数化（Refcounted interrupt disable），并新增 SpinLockIrq（关中断自旋锁）。"
      - label: "做法"
        text: "v5 系列把中断状态编码进类型系统，锁的获取/释放不再依赖调用方手写局部关中断。"
      - label: "效益"
        text: "Rust 驱动写并发逻辑更安全、更短——中断/锁的错误用法在编译期被拦下。"
    relevance: "Rust 内核的并发抽象在快速补齐，nova-core/tyr 这类驱动是直接受益者。"
    link: "https://lore.kernel.org/rust-for-linux/<20260810104922.GI1642880@noisy.programming.kicks-ass.net>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<20260810134339.6B4641F00A3D@smtp.kernel.org>/"
        text: "PCI: qcom 在链路 down 时阻止对下游设备的访问"
        time: "08-10 21:43"
      - link: "https://lore.kernel.org/linux-block/<20260810202241.2436603-1-devnexen@gmail.com>/"
        text: "zram 修大端 64 位 slot lock 位错位"
        time: "08-11 04:22"
      - link: "https://lore.kernel.org/linux-block/<anpU4oV46MDVDixj@devvm16600.scu0.facebook.com>/"
        text: "block 新增 BPF kfunc 读 blkcg io.stat（cgroup IO 观测）"
        time: "08-11 06:47"
      - link: "https://lore.kernel.org/linux-arch/<20260810185036.GA2496954@liuwe-devbox-debian-v2.local>/"
        text: "Hyper-V MSHV Dom0 root-partition 启动使能（EFI HvLoader，v2 13 补丁）"
        time: "08-11 02:50"
      - link: "https://lore.kernel.org/linux-security-module/<anmfJev64DOumiA9@v4bel>/"
        text: "apparmor 修 label 向量空终止越界写 + verify_tags 整数溢出"
        time: "08-10 17:51"
      - link: "https://lore.kernel.org/netdev/<20260810050621.82035-1-jiayuan.chen@linux.dev>/"
        text: "bpf: 阻止 offload 程序在宿主机 tcx/netkit 上运行（v4）"
        time: "08-10 13:07"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "PRAMIN 窗口"
        text: "GPU 把显存/寄存器映射到 CPU 侧的可访问窗口，CPU 经它读写显存而不走完整 DMA 路径。"
      - label: "guest_memfd"
        text: "机密虚拟机私有内存的文件描述符抽象，页归属 guest 且受 TEE 加密保护。"
      - label: "per-VMA 锁"
        text: "按 VMA 粒度拆分 mmap 全局锁的细粒度锁，缓解多线程内存操作的锁争用。"
      - label: "bio_vec / bvecq"
        text: "描述「一段物理内存」的向量结构；bvecq 是分段链接的 bio_vec 队列，netfs 用它重写缓冲路径。"
      - label: "kTLS"
        text: "内核态 TLS 加解密，可整段卸载到支持该特性的网卡。"
      - label: "TPH"
        text: "TLP Processing Hints——PCIe 报文携带的处理提示，让对端按负载类型优化缓存/路由。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
