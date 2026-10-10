---
title: "引用计数一增一减对不上：内核在四个地方漏内存；高通的相机子系统把 6 路 CSI PHY 接进主线"
date: "2026-10-11"
desc: "netmem 的引用计数一增一减不对称，四条路径在漏内存；高通 Kaanapali 相机子系统走完二十版进主线。"
column: "daily"
tags: ["net", "media", "arch", "mm", "fs", "block", "DRM", "PCI", "Rust", "sched"]
blocks:
  - type: hook
    text: >-
      今天两条头条都不是新功能，而是<strong>把已经写错的地方纠正过来</strong>：net 核心的 netmem
      引用计数<strong>一增一减对不上</strong>，四条路径正在悄悄漏内存；另一头高通把相机子系统的
      <strong>6 路 CSI PHY 全链路送进主线</strong>，走完二十版才落地。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-11/cover.png"
    alt: "封面 · 10月11日 · 引用计数一增一减，漏在四个地方"

  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "net：netmem 引用计数「加一个、减另一个」，IP-TFS / skb_split / skb_shift / 克隆 SKB 四条路径在漏内存"
      - label: "头条"
        text: "media：高通 Kaanapali 相机子系统 v20——6 路 CSI PHY、3 路 CSID、3 个 VFE 全链路接进来"
      - label: "arch"
        text: "Apple M4 Pro/Max 第一批设备树，一份 2297 行的电源管理节点表是整台机器能不能跑起来的地基"
      - label: "mm"
        text: "memory.high 不再在收费现场回收；CXL 报的坏页被拦在伙伴系统之外"
      - label: "fs"
        text: "exfat 数据覆盖回归找到根因：转到 iomap 时丢了「清理陈旧别名」这一步"
      - label: "block"
        text: "kyber 从一个空链表里「取」出了请求——7.3-rc6 的通用保护性错误"
      - label: "DRM"
        text: "imagination 的 GPUVM 切成立即模式，为异步 VM_BIND 铺路"
      - label: "机制"
        text: "cpuset housekeeping 检查、sched/fair 的 push task、Rust 分配器进 7.4-rc1、bpf arena 可 pin 成文件"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-11/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-11 06:23 北京，近 24h 各板块真实计数：net 365 · DRM 167 · mm 109 · media 89 ·
      fs 29 · PCI 25 · LSM 19 · block 17 · Rust 13 · arch 4 · virtio 1 · rt 0。
      周末的量整体回落（比周五少了近一半），但重量反而集中在两处：net 侧是核心引用计数对称化，
      media 侧是高通那条走了二十版的相机子系统；fs 侧则给昨天的数据覆盖回归补上了根因。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "引用计数「加一个、减另一个」：核心网络栈的四条路径正在漏内存"
    meta: "〔10-10 16:39 北京〕· [PATCH net-next v1 0/6] net: unify symmetric netmem and page_pool refcounting（Mina Almasry / Google）"
    points:
      - label: 现状
        text: >-
          netmem（网络栈里的「一块内存」抽象，既可能是普通页，也可能是设备侧内存 net_iov）
          身上挂着<strong>两套彼此独立的引用计数</strong>：一套管这块内存本身什么时候能释放
          （普通页是 <code>page-&gt;_refcount</code>，net_iov 是 <code>binding-&gt;ref</code>，
          统称非 pp 计数）；另一套管它在 page_pool 里的回收（<code>pp_ref_count</code>）。
          page_pool 自己持有那份非 pp 计数。带 <code>pp_recycle=1</code> 的 SKB 持有的是 pp 计数，
          带 <code>pp_recycle=0</code> 的持有非 pp 计数。
      - label: 痛点
        text: >-
          问题出在核心 helper 把这两套用得不一致：<code>skb_frag_ref()</code>
          <strong>永远加非 pp 计数</strong>（走 <code>get_netmem()</code>），而
          <code>skb_frag_unref()</code> 在 <code>skb-&gt;pp_recycle</code> 置位时<strong>减的是
          pp_ref_count</strong>。任何「在一个 pp_recycle=1 的 SKB 上 ref 分片」、
          或者用写死的 <code>recycle=false</code> 去 unref 的路径，都是给一个计数器加、给另一个减——
          内存从此泄漏，同时 pp_ref_count 一路下溢。已经中招的路径有一串：
          IP-TFS、<code>skb_split()</code>、<code>skb_shift()</code>，以及克隆 SKB 的 uncloning。
      - label: 方案
        text: >-
          把分片引用计数拆成几组<strong>对称的配对</strong>，每一层明确自己动的是哪个计数：
          非 pp 计数走 <code>get/put_page()</code>、<code>get/put_net_iov()</code>、
          <code>get/put_netmem()</code>；pp 计数走 <code>napi_pp_get/put_page()</code>；
          SKB 层的 netmem 走 <code>skb_netmem_ref/unref(netmem, recycle)</code>；
          SKB 分片走 <code>skb_frag_ref/unref(skb, f)</code>。系列一共 6 帖，
          最后一帖补上 747 行 kunit 测试。
      - label: 为什么
        text: >-
          原来的 API 太含糊了，含糊的代价是所有人都自己动手：驱动和上层协议
          （ULP）干脆 open-code 操作 <code>pp_ref_count</code>，
          或者各写一个一次性 helper——<code>skb_pp_frag_ref()</code> 就是这么来的。
          与其继续补丁摞补丁，不如让「加」和「减」按计数种类成对出现，
          调用点就<strong>没有办法写错</strong>。这就是这次重构真正的取舍。
      - label: 效益
        text: >-
          IP-TFS 上那个分片共享导致的 pp_ref_count 下溢被从根上修掉；
          驱动与 ULP 不再需要自造 helper。新增的 kunit 测试专门盯
          netmem / page_pool / SKB 分片这三者的引用计数——引用计数 bug 最怕的就是「没人能在 CI 里复现」。
      - label: 下一步
        text: >-
          v1 正在 netdev 评审。被替换掉的 <code>skb_page_unref()</code>、
          <code>__skb_frag_unref()</code> 这些旧 API 会逐步消失，
          之后接进来的新代码统一走新配对。
    verdict: >-
      引用计数 bug 的典型形态就是「加一个、减另一个」——它不会当场崩，只会让内存慢慢漏、计数慢慢下溢。
      这类修复的价值不在补丁大小，在于<strong>把对称性写进了 API 名字里</strong>，
      让下一个人想说错都说不出。
    link: "https://lore.kernel.org/netdev/<20261010083935.3274178-1-almasrymina@google.com>/"

  - type: headline
    title: "高通把相机子系统的 6 路 CSI PHY 接进主线：Kaanapali 走到第二十版"
    meta: "〔10-11 00:01 北京〕· [PATCH v20 00/13] media: qcom: camss: Add Kaanapali support（Hangxiang Ma / Qualcomm）"
    points:
      - label: 现状
        text: >-
          在 Qualcomm 平台上，camera 采集链路由 CAMSS 驱动承担：CSIPHY 把 MIPI CSI-2 的差分信号收进来，
          CSID 解出像素，VFE（Video Front End）处理后再从 RDI 端口交给 <code>/dev/videoX</code>。
          这条 RDI（Raw Dump Interface）路径做的是<strong>原始数据直接搬进内存</strong>，不做 ISP 后处理。
      - label: 痛点
        text: >-
          新一代 Kaanapali 的相机子系统换了几块硬件：CSIPHY 变成两相（two-phase）的 v2.4.0、
          CSID 与 VFE 上了 1080 版本、TPG（测试图案发生器）也升到 v2.4.0。
          更麻烦的是它<strong>需要 CAMNOC 的 <code>qdss_debug_xo</code> 时钟才能工作</strong>——
          老驱动既认不出这些新版本号，也没有这条时钟。
      - label: 方案
        text: >-
          13 帖按维护者一分为二。PHY 侧（Vinod Koul）3 帖：加 Kaanapali CSI2 PHY，
          并把公共状态寄存器的偏移参数化——硬件变了，寄存器布局也跟着挪，
          不如让偏移变成数据。CAMSS 侧（Bryan O'Donoghue）10 帖：加 Kaanapali compatible、
          给 csiphy / csid / vfe / tpg 各自补上新版本支持，再补上 Kaanapali 的 CAMSS 与 CSIPHY
          设备树块、CCI 控制器节点、相机 MCLK pinctrl，最后叠一块 S5KJN5 传感器的 DT overlay。
      - label: 为什么
        text: >-
          这一版把 <strong>RDI only</strong> 写在开头——只做 raw dump 那条最直接的路径，
          ISP 后处理不上。对一个刚接入主线的平台，这是最稳的切法：
          先让数据能出来、能验证，再谈处理管线。反过来一次全上，评审会卡在细节里出不来。
      - label: 效益
        text: >-
          硬件规模是 6×CSIPHY、3×TPG、3×CSID + 2×CSID Lite、
          3×VFE（每个 5 个 RDI）+ 2×VFE Lite（每个 4 个 RDI）。
          作者用 S5KJN5 在 4096×3072 SGBRG10 上跑通了完整链路：
          <code>media-ctl</code> 配 <code>msm_csiphy2 → msm_csid0 → msm_vfe0_rdi0</code>，
          再用 yavta 抓 20 帧。
      - label: 下一步
        text: >-
          v20 的改动全是评审意见的收尾：去掉 VFE 里冗余的空检查、给 CSIPHY 节点定义 port 属性、
          把 CCI 的 I2C 引脚从 bias-pull-up 改成 bias-disable（板级已有外部上拉，
          内部弱上拉反而添乱）。PHY 与 CAMSS 两部分各自走对应的维护者树。
    verdict: >-
      二十版才收敛，说明这条路径的评审有多细。对做 camera 驱动的人，
      这 13 帖是一份现成的<strong>新平台接入清单</strong>——PHY、解码、前端、时钟、DT，一样都不能少。
    relevance: >-
      从 CSIPHY 到 VFE 到 RDI，这就是一条 MIPI CSI-2 接收链路的完整硬件分层。
      和 GMSL2 链路一样，新平台的第一关从来不是「图像好不好看」，
      而是「时钟对不对、链路能不能锁」。
    link: "https://lore.kernel.org/linux-media/<20261010-kaanapali-camss-v20-0-63e98ce9ac0c@oss.qualcomm.com>/"

  - type: divider
    label: "📰 arch 平台"
    kind: section
  - type: highlight
    title: "Apple M4 Pro/Max 的第一批设备树：先只点亮最少的那部分硬件"
    meta: "〔10-11 00:59 北京〕· [PATCH 00/10] Initial Apple Silicon M4 Pro/Max device trees and dt-bindings（Yureka Lilian）"
    points:
      - label: 定位
        text: >-
          arm64 上的 Apple Silicon 平台支持（<code>arch/arm64/boot/dts/apple/</code>），
          从「能被认出来」这一步做起。
      - label: 做法
        text: >-
          10 帖里 9 帖是 dt-bindings——watchdog、AIC2 中断控制器、CPU core、pmgr 电源管理、
          PWM、pinctrl、i2c 各自加上 t6041 compatible；剩下一帖是设备树本身：
          给 MacBook Pro（j614 / j616）与 Mac mini / Mac Studio（j575 / j773）建最小 dts。
          其中 <code>t6041-pmgr.dtsi</code> 一份就 2297 行——那是从硬件里导出来的电源域节点表。
      - label: 效益
        text: >-
          作者说这些硬件在 M3 与 M4 之间基本没变，所以这批 dtsi 以后能直接复用到 M5 Pro/Max。
          整份没有驱动改动，合入走 apple-soc 树。
    relevance: >-
      平台 bring-up 的第一步永远是「让它能被认出来」。这份 3364 行的系列里真正有信息量的是
      pmgr 那张表——电源域是一台机器能不能跑起来的地基，也是后来所有驱动的前提。
    link: "https://lore.kernel.org/lkml/<20261010-apple-m4-pro-max-initial-devicetrees-v1-0-781fb3f2d9f6@cyberchaos.dev>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/lkml/<20261011-b4-helios64-gpu-v1-1-bd83c6ecd19e@iav.lv>/"
        text: "arch：Kobol Helios64（RK3399 NAS）一次性补四块板级支持——GPU、USB host0、eMMC HS400 增强选通、蜂鸣器"
        time: 10-11 05:53
      - link: "https://lore.kernel.org/linux-pci/<20261010172301.12764-1-aditya.garg@linux.dev>/"
        text: "PCI/AER：在 T2 SEP 上不再解除 Advisory Non-Fatal Error 的屏蔽（for-linus）——MacBookPro16,1 那边的实测结论落了地"
        time: 10-11 01:23
      - link: "https://lore.kernel.org/linux-pci/<20261010160529.27974-1-gruhlke@mailbox.org>/"
        text: "PCI：对不遵守 Immediate Readiness 的设备，FLR 之后多等一会儿（2 帖）"
        time: 10-11 00:05
      - link: "https://lore.kernel.org/rust-for-linux/<DM1774SH56A5.136OP30FCYTK4@kernel.org>/"
        text: "Rust：分配器变更进 7.4-rc1——KBox::pin_slice() 允许不同错误类型（于是能用不会失败的初始化器）、新增 NumaNode::id()；Alice Ryhl 成为 Rust [ALLOC] 共同维护者"
        time: 10-10 21:38
      - link: "https://lore.kernel.org/lkml/<20261010142533.974797-1-linmag7@gmail.com>/"
        text: "arch：alpha 的陈旧 TLB 翻译会破坏写时复制与回写，修到 v5（8 帖）"
        time: 10-10 22:25
      - link: "https://lore.kernel.org/linux-security-module/<20261010164450.194439-1-ngocthang2710.1999@gmail.com>/"
        text: "LSM：landlock 去掉 landlock_domain.layers 上的 __counted_by——柔性数组成员与标注不匹配"
        time: 10-11 00:45

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "memory.high 不再在收费现场回收：内核线程与「远程收费」改交给 worker"
    meta: "〔10-11 05:10 北京〕· [PATCH for-7.5 0/5] memcg: clean up memory.high enforcement（Shakeel Butt）"
    points:
      - label: 定位
        text: >-
          cgroup v2 内存控制器（<code>mm/memcontrol.c</code>）里 memory.high 这条「软上限」的执法路径。
          它不像 memory.max 那样硬拦，而是超了就触发回收、给用户态一点压力。
      - label: 做法
        text: >-
          把执法逻辑从 <code>try_charge_memcg()</code> 里抽出来，改由 <code>high_work</code>
          这个 worker 承担两类特殊收费：<strong>内核线程</strong>——它们永远不会回到用户态去跑延迟回收，
          而且在收费路径上回收、睡眠还会拖慢它们替别人干的活；<strong>远程收费</strong>——
          收费记到的 cgroup 和调用者的 mm 不是同一个（比如文件系统通知，或者替别的进程缺页），
          原来的 high handler 用 <code>current-&gt;mm</code> 判断限额，
          看的会是<strong>调用者的限额而不是被收费 cgroup 的限额</strong>。
      - label: 效益
        text: >-
          用 <code>mm_match_cgroup()</code> 识别出「不在当前 mm 的 cgroup 及其祖先里」的收费，
          这类改走 worker；本地用户态收费保持原样。另外跳过 PF_MEMALLOC 任务排队——
          回收本身也会收费（比如 zswap 存页时），不加这道闸，<code>high_work</code> 会给自己续命。
          作者实测一个不可压缩的 zswap 场景，不带这道闸时它给自己的回收排了 163 次队。
      - label: 下一步
        text: >-
          作者写明了这是 <strong>best effort</strong>：快手分配器仍能把用量顶在 memory.high 之上；
          worker 路径也不做 memory.swap.high 的限流与 high 事件上报。
          memory.max 与 memory.swap.max 的检查不变。系列基于 next-20261009，五帖里首尾两帖不改行为。
    relevance: >-
      「在收费现场做回收」是 memcg 里反复被拿出来讨论的取舍——快，但会把延迟塞进别人的上下文。
      这次是把两种最不该在现场做的情况挑出来外包，思路可以直接搬到任何「同步路径上做重活」的地方。
    link: "https://lore.kernel.org/linux-mm/<20261010210957.1350874-1-shakeel.butt@linux.dev>/"

  - type: highlight
    title: "CXL 报出来的坏页别进伙伴系统：一份把「毒」拦在分配器之外的 RFC"
    meta: "〔10-11 00:21 北京〕· [RFC PATCH 0/5] cxl, mm: Keep device-reported poison out of the page allocator"
    points:
      - label: 定位
        text: >-
          CXL 内存设备会上报介质损坏的地址表（poison），而 mm 的页分配器是决定
          「这块内存能不能给别人用」的关口。RFC 动的是这两者之间的接口。
      - label: 做法
        text: >-
          加一份<strong>上线前的毒页注册表</strong>：CXL 侧先把设备侧的 poison 列表取快照，
          在区域把这段内存当作 RAM 暴露给系统之前就登记进去；
          <code>mm/page_alloc</code> 在把页交给伙伴系统时检查它是否在表里。
      - label: 效益
        text: >-
          目标是让已知损坏的地址根本<strong>不进入分配器</strong>，
          而不是分配出去之后靠 memory-failure 事后兜底。RFC 阶段，接口与命名大概率还会变。
    relevance: >-
      「坏硬件的坏消息如何在子系统之间传递」是驱动与核心之间最容易扯皮的地方。
      这份 RFC 换了个角度：不问谁负责修，先问谁先知道、谁负责拦。
    link: "https://lore.kernel.org/linux-mm/<20261010162017.62506-1-shaikhkamal2012@gmail.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "vsock 的 RX worker 不再每包抢一次锁：把一个包的开销摊到一批上"
    meta: "〔10-10 22:23 北京〕· [PATCH net-next v2 0/5] vsock/virtio: reduce RX per-packet socket overhead"
    points:
      - label: 定位
        text: >-
          virtio-vsock 的接收路径——虚拟机与宿主之间那条 socket 通道的 RX worker。
          它的开销大头不在搬数据，而在<strong>每个包都要重新查 socket、重新抢一次锁</strong>。
      - label: 做法
        text: >-
          五步逐层把锁开销摊开：把 socket 查找从加锁的包处理里拆出来；对同一个 native socket 上
          一连串连续的 STREAM/RW 包，只持一次 socket 锁；后面同地址元组的包复用这把锁；
          在锁还持着的时候把默认的写空间通知合并掉；默认的「可读」回调推迟到整批解锁之后再发。
      - label: 效益
        text: >-
          作者给了完整的基准方法：单流 vsock 连接、接收线程与 virtio 中断分别钉在不同核、
          传输量随 payload 等比放大以避免长跑被宿主噪声污染，共 16 组 AB/BA 配对。
          这类「每包一次锁」变「每批一次锁」对虚拟化里的高包速率场景是直接收益。
    relevance: >-
      这个套路——把逐包操作攒成批、把通知合并到批边界——在 NAPI、io_uring、
      以及任何 RX 批处理路径上都通用，值得当模板记。
    link: "https://lore.kernel.org/netdev/<20261010142247.99223-1-physicalmtea@gmail.com>/"
  - type: highlight
    title: "devmem 的两处「设备注销时没收尾」：netlink socket 关掉时踩已释放的 dma_dev"
    meta: "〔10-10 10:55 北京〕· [PATCH net v1 0/4] net: devmem: fix RX and TX binding teardown on device unregistration（Mina Almasry / Google）"
    points:
      - label: 定位
        text: >-
          devmem TCP——把一块 dma_buf 直接绑到网络收发路径上。绑定对象（binding）分 RX / TX 两种，
          各自跟着队列或设备的生命周期走。
      - label: 做法
        text: >-
          RX 侧：在最后一个接收队列卸载时，同步在 <code>binding-&gt;lock</code> 下解绑并 unmap
          dma_buf——原来 netlink socket 会拖到 dma_dev 释放之后才关，
          于是 <code>dma_unmap_sg_attrs()</code> 里撞上 slab-use-after-free。
          TX 侧：补一个 <code>NETDEV_UNREGISTER</code> 钩子，设备注销时把 TX binding 完整解绑并 unmap。
      - label: 效益
        text: >-
          顺带给 netdevsim 加上 devmem RX/TX 绑定能力，于是这两个生命周期 bug
          可以在软件里用 selftest 复现——两个新测试直接进了
          <code>tools/testing/selftests/net/nl_netdev.py</code>。
    relevance: >-
      「谁先死」是驱动里最经典的顺序问题。这条值得抄的地方不是修法，
      而是<strong>修 bug 的同时补了一条能在 CI 里跑的复现路径</strong>——否则同一个坑还会被人挖第二遍。
    link: "https://lore.kernel.org/linux-media/<20261010025532.839559-1-almasrymina@google.com>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "摄像头模块卸载一次就回不来了：ipu-bridge 把软件节点的生命周期理清楚"
    meta: "〔10-10 23:56 北京〕· [PATCH v4 0/2] media: ipu-bridge: survive module unload and reuse the software nodes on rebind"
    points:
      - label: 定位
        text: >-
          Intel IPU6 平台上，ipu-bridge 负责替 MIPI 传感器建「软件节点」
          （software nodes：用软件而非固件描述设备属性，给 ACPI 描述不全的传感器兜底）。
      - label: 做法
        text: >-
          两处：一是别再从软件节点里引用模块镜像本身（模块卸载后那个引用就悬空了），
          二是重绑定时复用已有的软件节点，而不是重新建一套。
      - label: 效益
        text: >-
          修的是条真实序列：PCI remove → 模块卸载 → rescan → modprobe。
          今天这条走到第二次 prob 就会以 <code>-EEXIST</code> 直接失败。
          作者在 Surface Pro 7+（IPU6，OV5693 + OV8865 + OV7251）上验证三颗相机
          在每次重绑定后都能出流。
    relevance: >-
      「软件节点」是 ACPI 描述不全时的补丁式方案，它的引用与生命周期归谁管一直是模糊地带。
      这条把一个具体到不能再具体的运维动作（卸载再加载）修通了——
      这类问题在产线上比在任何理论分析里都更容易被撞到。
    link: "https://lore.kernel.org/linux-media/<20261010155626.2766298-1-dmanresa@gmail.com>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "exfat 的数据覆盖回归有解了：转到 iomap 时丢了「清理陈旧别名」这一步"
    meta: "〔10-11 03:15 北京〕· [PATCH] exfat: clean stale bdev buffers of newly allocated clusters"
    points:
      - label: 定位
        text: >-
          exfat 的目录项与文件数据都通过块设备的 buffer_head 读写。删除目录项，会把那个 buffer 弄脏。
      - label: 做法
        text: >-
          如果这个目录随后被删掉、它占的簇又分给了文件数据，而写回还没发生，
          那个脏 buffer 就留在块设备映射里；下一次设备级 flush（fsync / syncfs / umount）
          会把它写回去，<strong>覆盖掉新文件的数据</strong>——文件静静读回时，
          有一个扇区已经被替换成已删目录项的内容。修法是在
          <code>exfat_alloc_cluster()</code> 里对每一段连续分配的簇清理陈旧别名。
      - label: 为什么
        text: >-
          这个 bug 是 iomap 迁移带出来的：数据 I/O 还走 <code>exfat_get_block()</code> 的时候，
          <code>__block_write_begin_int()</code> 与 <code>do_direct_IO()</code>
          会替新分配的块清理别名；换成 iomap 之后没人再做这件事。
          修在选择<strong>分配时刻</strong>而不是映射时刻清理，是为了覆盖所有分配路径——
          缓冲写、直接写，以及 fallocate() 与扩展 truncate 这类「先分配、后写数据」的路径。
      - label: 效益
        text: >-
          复现器在 KVM 里跑：删目录项 → 删目录 → 用文件覆盖刚释放的簇，
          覆盖了缓冲写（含与不含 fsync）、O_DIRECT、fallocate 之后、扩展 ftruncate 之后，
          以及释放簇落在碎片化分配中间的情形。
          <strong>不带补丁 55/55 全部损坏，带补丁 0/55</strong>。
          补丁带 Fixes 标签，指向两个 iomap 提交。
    verdict: >-
      值得留意的是补丁署名里那行 Assisted-by——「老路径有个不起眼的副作用、新路径没接上」
      正是最容易被评审漏掉、又最适合拿来问一遍的类型。
    relevance: >-
      昨天报的回归，今天有了根因与修复。这是一个标准案例：框架迁移时，
      老的<strong>隐式清理动作</strong>最容易漏，而且漏了之后的表现是数据损坏而不是崩溃。
    link: "https://lore.kernel.org/linux-fsdevel/<010001a1273da435-1b6e4385-3185-451f-821b-8d8723ba78d3-000000@email.amazonses.com>/"

  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "kyber 从一个空链表里「取」出了请求：7.3-rc6 的通用保护性错误"
    meta: "〔10-10 15:44 北京〕· [BUG] 7.3-rc6: GPF in __blk_mq_do_dispatch_sched - kyber returns entry from empty khd->rqs list"
    points:
      - label: 定位
        text: >-
          blk-mq 的 kyber 调度器——按读/写/丢弃三个域分别排队，
          用 sbitmap（<code>kcq_map</code>）记录哪个域还有活。
      - label: 做法
        text: >-
          报告者在 7.3-rc6 上重压写（装 Flatpak）+ NVMe（dm-crypt/LUKS + btrfs）时拿到 GPF。
          解码寄存器后定位到：<code>kyber_dispatch_cur_domain()</code>
          <strong>把链表头本身当成请求返回了</strong>。可能的路径是
          <code>sbitmap_any_bit_set(&amp;khd-&gt;kcq_map[WRITE])</code> 为真，
          但 <code>kyber_flush_busy_kcqs()</code> 实际什么都没摘出来，
          而代码用的是 <code>list_first_entry()</code>（不是 <code>_or_null</code>）——
          对空链表取首元素。那段代码注释里的假设是「kcq_map 的位被置上就一定有排队的请求」。
      - label: 效益
        text: >-
          开 <code>slub_debug=FZP</code> 让它在越界读的第一时间就报出来
          （RAX 读到的是紧邻 khd 前面的 slub 红区）。这类「位图说有货、链表说没有」的不一致，
          如果只在别的分配器配置下发生，会被伪装成一个难以复现的随机崩溃。
    relevance: >-
      这是状态机里「两个数据结构不同步」的经典形态。对写块层、
      或者任何「bit 图 + 链表」双结构的代码，这一课很值：
      置位与入队如果不是同一个原子动作，取元素就必须用 <code>_or_null</code> 兜住。
    link: "https://lore.kernel.org/linux-block/<58cade69-419a-45bb-8a81-01c080dd25ab@mail.com>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "为异步 VM_BIND 铺路：imagination 的 GPUVM 切成「立即模式」"
    meta: "〔10-11 01:22 北京〕· [PATCH 0/2] drm/imagination: Switch the GPUVM to immediate mode"
    points:
      - label: 定位
        text: >-
          drm/imagination（Imagination PowerVR 驱动）的 GPU 虚拟内存管理，
          以及压在它上面的 VM_BIND 接口。
      - label: 做法
        text: >-
          把 GPUVM 从延迟更新改成<strong>立即模式</strong>——不再把映射与解绑攒起来批量提交，
          而是立即生效。顺带修掉 Sashiko 报出的一个问题：更新其它对象的 GPUVA 链表时，
          没有持有它们各自的 reservation。
      - label: 效益
        text: >-
          这是异步 VM_BIND 的前置条件（作者说改版后的 VM_BIND 系列会单独发）。
          在 BeagleY-AI 上开 lockdep / KASAN / failslab 跑，
          IGT 的 imagination 测试全过，包括 <code>pvr_vm_map</code>。
    relevance: >-
      「先把同步路径改成立即生效，再做异步」是 VM_BIND 这类接口的常规推进节奏。
      两条补丁加起来只动了 <code>pvr_vm.c</code> 的 80 行，
      但它是后面大改的地基——这种「看起来什么都没做」的补丁，往往最值得读。
    link: "https://lore.kernel.org/dri-devel/<20261011-pvr-gpuvm-immediate-v1-0-5b298dfce4f8@gmail.com>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20261009-b4-mmap-prepare-vma-flag-sanify-v5-0-923b70125b1e@kernel.org>/"
        text: "mm：VMA 标志语义重构（38 帖）到 v5，按评审意见做重命名与不变量收紧——昨天头条的追更"
        time: 10-10 20:37
      - link: "https://lore.kernel.org/dri-devel/<CAPM=9ty-Gh9_5sqdFzz6gVvvVjQ4erOSEg_bm8S9a5O4Seu7Nw@mail.gmail.com>/"
        text: "DRM：7.3-rc7 的 drm 修复拉取"
        time: 10-11 03:23
      - link: "https://lore.kernel.org/dri-devel/<20261010-pipe_order-v1-0-9d8bd29fd78a@oss.qualcomm.com>/"
        text: "DRM：msm DPU 修 source-split 平面的 pipe 顺序（4 帖）——拆分平面在 DPU 5.0 前后要分别按优先级与目标 X 坐标排布 SSPP"
        time: 10-10 21:38
      - link: "https://lore.kernel.org/linux-media/<cover.1791623422.git.kyrie.wu@mediatek.com>/"
        text: "media：MT8189 编解码使能到 v11（10 帖）"
        time: 10-10 17:24
      - link: "https://lore.kernel.org/linux-media/<cover.1791619742.git.kyrie.wu@mediatek.com>/"
        text: "media：mediatek vcodec 支持 MT8196 解码（v8，14 帖）——这一版把 vcp 架构与共享内存地址带进来"
        time: 10-10 16:36
      - link: "https://lore.kernel.org/linux-media/<010601a1251fbfb9-9afc4070-5194-4714-86b1-5358791e7770-000000@ap-northeast-1.amazonses.com>/"
        text: "media：qcom-mipi-csi2 把请求的 settle 间隔向上取整（RFC）——MIPI 接收端时序上的一个常见偏差"
        time: 10-10 17:23
      - link: "https://lore.kernel.org/linux-fsdevel/<20261010175649.700233-1-hengyul@cs.unc.edu>/"
        text: "fs：isofs 修小逻辑块目录的处理"
        time: 10-11 01:57
      - link: "https://lore.kernel.org/linux-block/<20261010132705.1693690-1-efremov@linux.com>/"
        text: "block：floppy 先加盘、再注册块主设备号——顺手治了磁盘还没就位就先露头的顺序问题"
        time: 10-10 21:27

  - type: divider
    label: "📌 机制雷达：5 条跨域改动"
    kind: primary
  - type: toc
    items:
      - label: "cpuset housekeeping"
        text: >-
          把 <code>isolated_cpus_can_update()</code> 合并进 <code>prstate_housekeeping_conflict()</code>，
          做 housekeeping 检查时考虑全部独占 CPU，并修掉分区状态切换失败时没能正确禁用分区的问题（v2，6 帖）·
          <a href="https://lore.kernel.org/lkml/<20261010221938.243859-1-longman@redhat.com>/">原文</a>
      - label: "sched/fair push task"
        text: >-
          把「cache-aware 调度触发的 push」与其它 push 分开——只有前者会把任务推向首选 LLC。
          讨论里提到唤醒路径上做 cache-aware 迁移会因多 CPU 无同步地推向同一 LLC 造成任务弹跳，
          所以当前做法只在 push 路径生效，并要回头确认新内核里是否还成立 ·
          <a href="https://lore.kernel.org/lkml/<aspc8doovTKdBqPC@chenyu-dev>/">原文</a>
      - label: "Rust 分配器进 7.4-rc1"
        text: >-
          merge window 的拉取请求开始出现：<code>KBox::pin_slice()</code> 允许不同错误类型
          （于是可以用不会失败的初始化器）、新增 <code>NumaNode::id()</code>，
          并给 Rust [ALLOC] 加了 Alice Ryhl 作为共同维护者（3 帖）·
          <a href="https://lore.kernel.org/rust-for-linux/<DM1774SH56A5.136OP30FCYTK4@kernel.org>/">原文</a>
      - label: "bpf arena 可 pin 成文件"
        text: >-
          新增 arena 标志以保留已分配的页，把 pin 住的 arena 暴露成有大小限制的 bpffs 文件映射；
          配套 selftest 测试两个客户机双向访问同一个 arena（bpf-next，5 帖）·
          <a href="https://lore.kernel.org/lkml/<20261010224902.1232178-1-arighi@nvidia.com>/">原文</a>
      - label: "hazptr 讨论继续"
        text: >-
          hazard pointer 这套新的无锁回收原语（RFC v3，15 帖）这一轮在改共享扫描等待者的
          Bloom filter 与 try-acquire 快路径，争议集中在内存序与溢出链表的扫描成本上 ·
          <a href="https://lore.kernel.org/linux-arch/<FEE371F2-1B9F-43FA-AF21-F237504A11F1@nvidia.com>/">原文</a>

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "netmem"
        text: "网络栈里「一块内存」的抽象，既可能是普通 page，也可能是设备侧内存 net_iov。"
      - label: "pp_recycle"
        text: "SKB 上的标志位：置位表示这份分片属于 page_pool，回收走 pp_ref_count，而不是普通页引用计数。"
      - label: "CAMSS / RDI"
        text: "CAMSS 是高通的相机子系统驱动；RDI（Raw Dump Interface）是 VFE 里把原始数据直接搬进内存的出口。"
      - label: "软件节点（software nodes）"
        text: "用软件而非固件描述设备属性的机制，专门给 ACPI 描述不全的传感器兜底。"
      - label: "bdev 别名"
        text: "同一块磁盘扇区被页缓存以多个 buffer 引用时的俗称；清理陈旧别名 = 把已经失效的那些引用丢掉。"
      - label: "GPUVM / VM_BIND"
        text: "GPU 驱动的虚拟内存管理，以及「用户态直接提交映射」的接口；立即模式指映射不做批量延迟提交。"

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
