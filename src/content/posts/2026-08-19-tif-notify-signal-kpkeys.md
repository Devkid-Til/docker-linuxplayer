---
title: "TIF_NOTIFY_SIGNAL 也能截断 coredump：内核给『不可重来的活』加了道闸"
date: "2026-08-19"
desc: "TIF_NOTIFY_SIGNAL 会悄悄截断 coredump，Brauner 加 PF_NO_NOTIFY_SIGNAL 闸门；kpkeys 让页表『平时只读』（RFC v9）；virtio DMB 跨域新机制。"
column: "daily"
tags: ["mm", "net", "DRM", "virtio", "fs", "LSM", "block", "sched"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看三件事：<strong>TIF_NOTIFY_SIGNAL 会悄悄截断 coredump</strong>——io_uring 在途请求越多、核心转储丢得越多，Brauner 用 per-task 闸门修复；<strong>kpkeys 页表加固到 RFC v9</strong>——用内存保护键让页表『平时只读』；以及 <strong>virtio 的 DMB 机制</strong>——给每个设备一块自己的内存区，vhost-user 不再能看整台客户机。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-19/cover.png"
    alt: "封面 · 8月19日 · TIF_NOTIFY_SIGNAL 截断 coredump · kpkeys 页表加固"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "TIF_NOTIFY_SIGNAL 打断 coredump——io_uring 用户的核心转储可能被悄悄截断，PF_NO_NOTIFY_SIGNAL 闸门修复"
      - label: "头条"
        text: "kpkeys：用内存保护键让页表『平时只读』，架构无关的页表加固框架（RFC v9，25 帖）"
      - label: "virtio"
        text: "DMB（Device Memory Buffer）：给每个 virtio 设备独立内存区，机密计算告别 swiotlb 权宜"
      - label: "net"
        text: "inetpeer 树比较用 SipHash 随机化——堵掉一个 SAD DNS 式侧信道"
      - label: "security"
        text: "SELinux 拦 FOLL_FORCE 写 /proc/self/mem，呼应 Project Zero 的 Pixel 远程利用"
      - label: "mm"
        text: "zswap 冷回写 folio 立即释放（dropbehind 扩展）；BPF 主动回收 memcg"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "TIF_NOTIFY_SIGNAL 也能打断 coredump：内核给『不可重来的活』加了道闸"
    meta: "〔08-19 02:30 北京〕· [PATCH 0/4] Stop TIF_NOTIFY_SIGNAL from interrupting work that can't be restarted"
    link: "https://lore.kernel.org/linux-mm/<20260818-work-tif_notify_signal-v1-0-1ee1fcc5b3ff@kernel.org>/"
    points:
      - label: "现状"
        text: >-
          TIF_NOTIFY_SIGNAL 是任务的一个标志位（task flag），专门用来把正在『不可中断睡眠』的任务踢回用户态跑 pending 的 task work（比如 io_uring 的完成回调），跑完再睡回去。内核里 signal_pending() 会把它当成『有信号待处理』。
      - label: "痛点"
        text: >-
          coredump 写转储时 dump_interrupted() 只允许致命信号打断，但真正写数据的深调用链（pipe / socket 代码）会调用 signal_pending()，看到 TIF_NOTIFY_SIGNAL 误以为有信号，写就被中断了。结果：io_uring 在途请求越多，coredump 丢得越多——测试里一个 5MB 的转储，pipe 下被截到 357KB、socket 下截到 467KB。
      - label: "方案"
        text: >-
          新增进程标志 PF_NO_NOTIFY_SIGNAL 和配套 save/restore helper，模式照抄内存分配域的 memalloc_nofs_save() / memalloc_nofs_restore()。在关键区里，signal_pending() 不再把 TIF_NOTIFY_SIGNAL 当信号。coredump 与 SMB 大批量写路径首批接入。
      - label: "为什么"
        text: >-
          这个位的 setter 多到没法在单子系统修：io_uring（poll task_work / msg_ring / tctx exit / io-wq）、bpf_task_work_schedule_signal()、klp_send_signals()、landlock tsync，甚至 kthread_stop() 和 printk 的 KUnit 都是直接置位；还可能从 irq 上下文对任意任务设置。而写被中断发生在 anon_pipe_write、unix_stream_sendmsg、sk_stream_wait_memory 这类深处，没法逐个传参。所以状态必须 per-task、环境式（ambient）——这正是作者说的『状态得自带』。
      - label: "效益"
        text: >-
          coredump 不再被 io_uring 截断；SMB 的大批量写不怕被中途打断；其他『不可重来的活』都能复用同一套 helper。
      - label: "下一步"
        text: >-
          作者 Christian Brauner（fs 域维护者）自嘲『历史上一堆补丁都没解决，我再来添一个』，并点名 signal 专家 Oleg Nesterov 评审；系列里还提到几个潜在用户没包进来——这是一个低门槛的跟进点。
    verdict: "一个不起眼的标志位，因为 setter 太多、调用链太深，最后只能靠 per-task 闸门解决——内核里『状态必须 ambient』的典型教材"
  - type: headline
    title: "kpkeys：用内存保护键让页表『平时只读』，写坏一字节不再全线失守"
    meta: "〔08-18 22:11 北京〕· [PATCH RFC v9 00/25] pkeys-based page table hardening"
    link: "https://lore.kernel.org/linux-mm/<20260818-kpkeys-v9-0-743ad31b2c8f@arm.com>/"
    points:
      - label: "现状"
        text: >-
          页表是内核里『写坏代价最高』的数据之一——一字节错误改写，就可能让任意页面对任意上下文（包括用户态）可见。内核数据默认全可写，防护靠的是『别写错』。
      - label: "痛点"
        text: >-
          一旦内存破坏 bug 或 exploit 落到页表区，就是全面失守。此前有 x86 专属的 PKS 写保护页表方案（Rick Edgecombe 的系列），但绑死 x86，没法推广到别的架构。
      - label: "方案"
        text: >-
          25 帖系列，先造一个通用框架 kpkeys，再在其上实现页表加固：被保护数据用 set_memory_pkey() 标上保护键 pkey P，pkey 寄存器默认只给 P『只读』；要写时当前 CPU 临时切寄存器放行写权限，写完还原。arm64 上做 PoC，设计对任何支持 pkeys 的架构通用。
      - label: "为什么"
        text: >-
          成立的前提是被保护数据『只经由有限、明确的 API 被写』——这样只需在少量可信代码处切寄存器，不必全内核审计；页表恰好满足这个条件。与 PKS 方案同思路，但把 pkey 机制抽象成架构无关的框架。
      - label: "效益"
        text: >-
          页表平时只读，单一写破坏不再直接转化为任意内存暴露；本版专注功能正确性，适合做 debug 与加固特性，性能优化留到后续。
      - label: "下一步"
        text: >-
          v9 仍是 RFC，作者明确说不赶 7.3，合并窗口期间发出来等评审；该思路曾在 Linux Security Summit Europe 2025 分享。功能定型后的性能是一块待啃的骨头。
    verdict: "安全加固的正确姿势不是『防住所有写』，而是『只让可信路径写』——kpkeys 把这条思路做成了架构无关的框架"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "zswap 冷回写 folio 立还：把 PG_dropbehind 扩展到 swap cache"
    meta: "〔08-19 00:32 北京〕· [PATCH v3 0/3] mm: zswap: free cold writeback folios promptly"
    points:
      - label: "定位"
        text: "zswap 回写时申请 swap cache folio、解压、写入，写完的 folio 本是『冷』的，却留在 LRU 上等回收扫描再来一次，浪费一次扫描还让冷内存常驻。"
      - label: "做法"
        text: "不在 zswap 里单点修，而是把 PG_dropbehind 机制扩展到 swap cache folio；回写完成即由 per-CPU llist 上的 worker 批量移除并释放。patch 1 先把 LRU 插入从 swap cache 分配器挪到调用方，让『要 drop 的 folio』可以直接绕过 LRU 分配。"
      - label: "效益或下一步"
        text: "冷内存不再常驻、回收扫描更省；dropbehind 成为『写完即扔』的通路，swap 与 zswap 两侧都能复用。"
    relevance: "做 zram/zswap 或内存回收性能的同学值得盯：回写热路径少一次扫描就是少一分延迟。"
    link: "https://lore.kernel.org/linux-mm/<20260818163221.589352-1-alex@ghiti.fr>/"
  - type: highlight
    title: "BPF 来当『内存水管工』：程序决定何时、多激进地回收 memcg"
    meta: "〔08-18 16:36 北京〕· [PATCH bpf-next v2 0/2] bpf: BPF-driven proactive memcg reclaim"
    points:
      - label: "定位"
        text: "现在 cgroup 内存回收只在超过固定阈值时被触发；这套系列把『何时回收、多激进』的决定权交给 BPF 程序。"
      - label: "做法"
        text: "新增 sleepable kfunc bpf_proactive_reclaim() 与 bpf_proactive_reclaim_swappiness()，用与 memory.reclaim 相同的参数做一轮主动回收（允许 swap、anon/file 比例随 swappiness 或显式覆盖）。v2 按评审把接口从裸 gfp/reclaim 旋钮改成用例驱动，并弃用了此前的 cgroup-aware workqueue（被 bpf_kthread / bpf_waitq 取代）。"
      - label: "效益或下一步"
        text: "基于 runtime 信号（如 WORKINGSET_REFAULT_FILE 攀升）主动回收高优先级 cgroup，而不是等撞阈值；selftest 给出一套完整示例。"
    relevance: "想用 eBPF 做『观察—决策—执行』闭环的，这是一份能照抄的模板。"
    link: "https://lore.kernel.org/linux-mm/<cover.1787040082.git.zhuhui@kylinos.cn>/"
  - type: highlight
    title: "MGLRU 的 NR_ISOLATED 记账与限流修复（v3）"
    meta: "〔08-18 20:49 北京〕· [PATCH mm-unstable v3 0/2] mm/vmscan: fix NR_ISOLATED accounting and throttling for MGLRU"
    points:
      - label: "定位"
        text: "MGLRU（多代 LRU）在『隔离页』与限流之间的记账有个缺口，会干扰内存回收节奏。"
      - label: "做法"
        text: "修正 NR_ISOLATED 计数在 MGLRU 路径的增减口径，并让限流逻辑与真实隔离量对齐。"
      - label: "效益或下一步"
        text: "回收更稳、避免因记账偏差导致的过早/过晚限流；继续在 mm-unstable 分支打磨。"
    relevance: "用 MGLRU 的发行版（Android 及部分云内核）会直接受益。"
    link: "https://lore.kernel.org/linux-mm/<cover.1787056208.git.zhuhui@kylinos.cn>/"
  - type: more
    title: "更多动态"
    items:
      - text: "mm, swap: don't spin on a bad swap entry（v3）"
        time: "08-18 18:08"
        link: "https://lore.kernel.org/linux-mm/<20260818-swap-v3-0-d3fa52598a59@debian.org>/"
      - text: "mm: add cond_resched() to free_pud_range()——大范围释放路径补调度点"
        time: "08-18 21:50"
        link: "https://lore.kernel.org/linux-mm/<20260818134934.92354-1-leon.hwang@linux.dev>/"
      - text: "hugetlb: add cond_resched() to __unmap_hugepage_range()"
        time: "08-18 21:50"
        link: "https://lore.kernel.org/linux-mm/<20260818135029.93288-1-leon.hwang@linux.dev>/"
      - text: "mm: drop stale MAX_ORDER references"
        time: "08-18 20:39"
        link: "https://lore.kernel.org/linux-mm/<20260818122408.4182417-1-xiqi2@huawei.com>/"
      - text: "mm/page_isolation: fix UBSAN shift-out-of-bounds warning"
        time: "08-18 19:44"
        link: "https://lore.kernel.org/linux-mm/<20260818112855.3831692-1-xiqi2@huawei.com>/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "inetpeer 树比较 SipHash 化：堵掉一个 SAD DNS 式侧信道"
    meta: "〔08-18 23:12 北京〕· [PATCH v3 net] inetpeer: randomize RB-tree node comparison using SipHash"
    points:
      - label: "定位"
        text: "inet_peer 限速系统把对端 IP 存进红黑树，树查找用确定性字典序比较（inetpeer_addr_cmp）——外部攻击者能预测树拓扑与 GC 遍历路径。"
      - label: "做法"
        text: "用带密钥的 SipHash（inetpeer_hash_key，net_get_random_once() 初始化）排序节点，把 hash 缓存进 struct inet_peer、目标 dhash 在 inet_getpeer() 开头只算一次，避免每步重算。"
      - label: "效益或下一步"
        text: "『确定性遍历 + 激进 GC 逐出』的组合攻击失效：无法再通过强制逐出目标节点、重置令牌桶来绕过 IP 限流、推断开放 UDP 端口（SAD DNS 一类攻击）。"
    relevance: "这是那种『看着像优化、其实是安全』的改动——公网暴露的服务尤其相关。"
    link: "https://lore.kernel.org/netdev/<20260818151213.3953963-1-edumazet@google.com>/"
  - type: highlight
    title: "转发路径别再剥掉 zerocopy 碎片标记（v3）"
    meta: "〔08-18 16:43 北京〕· [PATCH net v3 0/3] net: don't strip zerocopy frag markers from a forwarded skb"
    points:
      - label: "定位"
        text: "收到带 zerocopy 碎片标记的 skb 再转发时，旧代码把标记剥掉了，下游会把普通碎片误当 zerocopy 处理，语义错乱。"
      - label: "做法"
        text: "转发路径保留 frag marker，三帖系列补上修复与用例。"
      - label: "效益或下一步"
        text: "zerocopy 语义在转发链上保持完整，避免错误的内存/引用语义；由安全研究者（doyensec）提交。"
    relevance: "做转发设备（路由器/网关）或开 zerocopy 收发的会受影响。"
    link: "https://lore.kernel.org/netdev/<F3B9E5BA-0AC1-4AD1-A7D9-F38033304270@doyensec.com>/"
  - type: highlight
    title: "taprio 软件调度限最小间隔：别让 qdisc 自锁"
    meta: "〔08-18 15:17 北京〕· [PATCH net 0/3] net/sched: taprio: fix software schedule livelocks"
    points:
      - label: "定位"
        text: "taprio（时间感知整形 TAS）在纯软件调度下，调度间隔过小会让调度器空转（livelock），烧 CPU。"
      - label: "做法"
        text: "对软件调度强制一个最小间隔，并补 selftest 用例覆盖该场景。"
      - label: "效益或下一步"
        text: "CPU 不再被空转烧掉，TAS 在无硬件辅助时也能稳。"
    relevance: "做 TSN / 时间敏感网络、或跑 taprio 软调度的设备相关。"
    link: "https://lore.kernel.org/netdev/<20260818071706.251035-1-junjie.cao@intel.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "net-next RFC: netconsole 支持消息限速（0/6）"
        time: "08-18 18:29"
        link: "https://lore.kernel.org/netdev/<20260818-netcons_ratelimit-v1-0-8c5d2d17789c@debian.org>/"
      - text: "tcp: fix AO info use-after-free in tcp_ao_connect_init()"
        time: "08-19 00:21"
        link: "https://lore.kernel.org/netdev/<20260818162108.11456-1-a0yami@mailbox.org>/"
      - text: "tcp: reject completely old segments during sequence validation"
        time: "08-19 04:53"
        link: "https://lore.kernel.org/netdev/<20260818205230.1146138-1-michael.cohen3@mail.huji.ac.il>/"
      - text: "x25 / tipc / pptp 报文长度校验——一组协议内存安全修复"
        time: "08-19 00:22"
        link: "https://lore.kernel.org/netdev/<20260818162229.yOFI43Vfo0v911uVw0AFpyHQ_aOe_fsjoQXPZP70vMI@z>/"
      - text: "netfilter: flowtable: publish HW_DEAD after worker is done"
        time: "08-19 04:00"
        link: "https://lore.kernel.org/netdev/<20260818200014.2218933-2-Jeremy.Jean@oss.cyber.gouv.fr>/"
      - text: "driver core + net: fw_devlink 处理 class device 与 PHY 封装（v3，跨域）"
        time: "08-18 14:59"
        link: "https://lore.kernel.org/netdev/<20260818-submit-phy-package-fwdevlink-v1-v3-0-40a905ea16b6@gmail.com>/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "drm/panic 拆成 core + helpers：画代码退出 DRM 核心"
    meta: "〔08-18 20:51 北京〕· [PATCH 00/12] drm/panic: Split into core and helpers"
    points:
      - label: "定位"
        text: "DRM 的 panic 处理（内核崩溃时在屏幕显示二维码/画面的子系统）把绘制代码塞在 DRM 核心库里，违背 DRM 一贯的『核心接口 + 各驱动实现 + helpers 共享』分层。"
      - label: "做法"
        text: "12 帖把 panic 处理拆开：核心保留入口、参数、debugfs 与全部状态/锁（收敛进 drm_panic_display_panic_screen()），绘制细节移到 KMS helpers；驱动只需提供单个回调 display_panic_screen。patch 1-4 顺手修了 QR 缓冲、zlib workspace 等健壮性问题。"
      - label: "效益或下一步"
        text: "绘制代码不再卡在 DRM core，未来可与 DRM 其他绘制/格式转换共享一个模块；功能无变化，可测性更好（KUnit 可独立于内核配置运行）。"
    relevance: "做显示/GPU 驱动、或关心内核 panic 可观测性的，这套分层是必读样板。"
    link: "https://lore.kernel.org/dri-devel/<20260818125012.468092-1-tzimmermann@suse.de>/"
  - type: more
    title: "更多动态"
    items:
      - text: "drm/xe: Introduce error threshold to drm_ras（v6，跨驱动 RAS 门限）"
        time: "08-18 21:54"
        link: "https://lore.kernel.org/dri-devel/<20260818135304.497098-5-raag.jadav@intel.com>/"
      - text: "drm/ssd130x: 支持 Solomon SSD1351 OLED 控制器（v4）"
        time: "08-18 16:07"
        link: "https://lore.kernel.org/dri-devel/<20260818080626.30430-7-amit.barzilai22@gmail.com>/"
      - text: "accel/amdxdna: SYNC_BO correctness fixes（v4）"
        time: "08-18 07:07"
        link: "https://lore.kernel.org/dri-devel/<20260817230707.356828-1-taimuraz@kaitmazov.com>/"
      - text: "drm/panthor: debugfs 显示调度组优先级"
        time: "08-19 03:36"
        link: "https://lore.kernel.org/dri-devel/<20260818-panthor-sched-group-prio-v1-1-1836857c53e9@collabora.com>/"
  - type: divider
    label: "📰 virtio"
    kind: section
  - type: highlight
    title: "DMB：给每个 virtio 设备一块自己的内存区，vhost-user 不再能看整台客户机"
    meta: "〔08-19 05:14 北京〕· [PATCH v2 00/12] virtio: support devices that own their virtqueue memory"
    points:
      - label: "现状"
        text: "virtio 驱动默认用客户机内存作 virtqueue 和缓冲。VMM 需要能映射客户机内存，这在普通虚拟化下没问题；但机密计算下要么靠 swiotlb 兜底，要么让隔离的 vhost-user 后端拿到整块客户机内存的访问权——安全隔离形同虚设。"
      - label: "方案"
        text: "在 virtio 传输层引入 DMB（Device Memory Buffer）：每个 virtio 设备独占一块双方约定的共享内存区，原本指向客户机 RAM 的偏移都改为指向这块 DMB。受信任的 hypervisor 可强制启用；传输层通用，高一层驱动几乎不用改。"
      - label: "为什么"
        text: "先考虑过 swiotlb 建独立 pool——但它不是 OS 通用原语、DMA 空间混在一起、设备也无法选择；virtio-iommu 则要动态建映射、设备与 IOMMU 的关系复杂。DMB 在传输层解决：任何 OS 都能实现（利于 Windows 支持）、每设备独立 DMA 空间、还能让『不可信供应商实现的设备』只看得见自己的 DMB。"
      - label: "效益"
        text: "vhost-user 后端进程只见 DMB 区域、不见整块客户机内存；机密计算不再需要 swiotlb 权宜；按设备粒度隔离，可信与不可信设备互不可见。"
      - label: "下一步"
        text: "目前只接了 PCI；feature bit 44 与两个寄存器偏移（0x40/0x42）为临时占位，等 OASIS 委员会正式分配。"
    relevance: "这是虚拟化 / 机密计算方向值得持续跟的一条线——如果你的业务碰 vhost-user 或 CoCo 环境。"
    link: "https://lore.kernel.org/dri-devel/<20260818211425.91009-1-graf@amazon.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "virtio-blk: 内联加密支持（v1，08-14 帖子，virtio-dev 低频窗口内）"
        time: "08-14 22:23"
        link: "https://lore.kernel.org/virtio-dev/<20260814142306.3934029-1-linlin.zhang@oss.qualcomm.com>/"
      - text: "virtio-mmio: 支持传输层版本 3（旧帖，按时间标注）"
        time: "06-05 22:30"
        link: "https://lore.kernel.org/virtio-dev/<20260605142921.2824-1-peter.hilber@oss.qualcomm.com>/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "ceph 12 帖打磨 struct 布局：缓存行、锁、u32 语义一起清"
    meta: "〔08-19 02:11 北京〕· [PATCH v4 00/12] fs/ceph: optimize struct layouts"
    points:
      - label: "定位"
        text: "ceph 客户端在 inode / cap 路径上的结构体有填充空洞、锁重复、宽度浪费——文件系统热路径上的『慢性内存病』。"
      - label: "做法"
        text: "12 帖按 v4 打磨：重排字段消除 padding 空洞、删多余字段（i_truncate_mutex 并入 i_fragtree_mutex、去掉 i_cap_migration_resv）、把 time_warp_seq / pool_id 统一成 u32、helper 加 const、inode number 冗余删除。"
      - label: "效益或下一步"
        text: "结构更小更齐、缓存行命中更好；也是一份『struct 布局优化』的现成教案。"
    relevance: "写驱动或文件系统时，字段重排省 padding、锁合并省竞态——这套是实操范例。"
    link: "https://lore.kernel.org/lkml/<20260818181144.3541770-1-max.kellermann@ionos.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "MAINTAINERS: CIFS 维护者换帅——Steve French 因健康原因卸任，Paulo Alcantara 接任、Namjae Jeon 副手"
        time: "08-18 22:07"
        link: "https://lore.kernel.org/linux-fsdevel/<20260818140738.314254-1-pc@manguebit.org>/"
      - text: "f2fs: support pinned boundary section and unify pinned allocation"
        time: "08-19 03:51"
        link: "https://lore.kernel.org/lkml/<20260818195150.102048-1-daeho43@gmail.com>/"
      - text: "f2fs: accurately adjust free_sections during free_segment_range"
        time: "08-19 01:14"
        link: "https://lore.kernel.org/lkml/<20260818171412.3201082-1-daeho43@gmail.com>/"
      - text: "ntfs3: fix out-of-bounds access in log replay and ni_remove_name"
        time: "08-19 02:34"
        link: "https://lore.kernel.org/lkml/<o4ztNNNkpdDLI2xt81YfrL6QXaRJyrorsj6ouTqr1_uStTBnW4siOIZeDlmIUiznHvfghwWtTK4piK6rgE23Kr6w9XwxpfiMM7THLMcfsRQ=@proton.me>/"
      - text: "fs: refuse to drop a dentry reference d_make_persistent() never took"
        time: "08-18 20:55"
        link: "https://lore.kernel.org/linux-fsdevel/<20260818125549.2315538-1-njilav@gmail.com>/"
  - type: divider
    label: "📰 security"
    kind: section
  - type: highlight
    title: "SELinux 拦下 FOLL_FORCE 写 /proc/self/mem：堵住 Android 提权的一条路"
    meta: "〔08-19 03:51 北京〕· [PATCH 0/3] proc,security,selinux: let SELinux block FOLL_FORCE for /proc/self/mem"
    points:
      - label: "定位"
        text: "FOLL_FORCE（GUP 的强制映射标志）配合 /proc/self/mem 写入，能让进程在 PROC_MEM_FORCE_ALWAYS 系统里绕过『只有可信代码可被映射为可执行』的 SELinux 策略——Android 设备默认开启这个开关。"
      - label: "做法"
        text: "Jann Horn 的三帖：proc 把 mem 文件重构为用 struct 作 private_data，在 PROC_MEM_FORCE_ALWAYS 下查询 LSM 意见；SELinux 侧要求调用方具备 EXECMEM 或 PTRACE 权限才放行 FOLL_FORCE 的 introspection。"
      - label: "效益或下一步"
        text: "Project Zero 对 Pixel 的 0-click 远程利用部分就是靠 /proc/self/mem——这条路径现在要过 LSM；改走 VFS 或 LSM 树合入。"
    relevance: "做 Android 安全/平台层的同学值得第一时间跟进；对普通读者也是一次 GUP/LSM 机制科普。"
    link: "https://lore.kernel.org/linux-mm/<20260818-selinux-pokemem-v1-0-90cd2357ee05@google.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "ima: don't measure/appraise files on configfs"
        time: "08-19 03:35"
        link: "https://lore.kernel.org/linux-security-module/<20260818-configfs-v1-2-a2329043cf86@cloudflare.com>/"
  - type: divider
    label: "📰 block"
    kind: section
  - type: more
    title: "更多动态"
    items:
      - text: "blk-cgroup: wait for old blkgs to leave queue before disk rebind"
        time: "08-18 14:58"
        link: "https://lore.kernel.org/linux-block/<20260818065823.753357-1-yukuai@kernel.org>/"
      - text: "RFC v2: fix NVMe multipath partition diskstats"
        time: "08-18 20:09"
        link: "https://lore.kernel.org/linux-block/<20260818120854.3151628-1-john.g.garry@oracle.com>/"
  - type: divider
    label: "📰 sched"
    kind: section
  - type: highlight
    title: "sched_ext：允许 ops.cgroup_set_bandwidth() 变为可睡眠（v2）"
    meta: "〔08-19 00:04 北京〕· [PATCH v2] sched_ext: allow ops.cgroup_set_bandwidth() to be sleepable"
    points:
      - label: "定位"
        text: "sched_ext 让调度器用 BPF 实现；cgroup 带宽设置回调此前必须非睡眠（不可在回调里 sleep），限制了调度器实现的自由度。"
      - label: "做法"
        text: "v2 放开限制，让该回调可 sleepable，调度器实现可以用更重的逻辑。"
      - label: "效益或下一步"
        text: "sched_ext 调度器写起来更自由，持续向『完整调度器语义』逼近。"
    relevance: "玩 sched_ext 调度器（类 EEVDF / Core Scheduling 场景）的会直接用上。"
    link: "https://lore.kernel.org/lkml/<20260818160429.932265-1-changwoo@igalia.com>/"
  - type: more
    title: "更多动态"
    items:
      - text: "sched_ext: Sync tools headers from the scx repo（7.3-fixes PATCHSET）"
        time: "08-19 04:57"
        link: "https://lore.kernel.org/lkml/<20260818205711.3175265-1-tj@kernel.org>/"
      - text: "RT: [ANNOUNCE] v7.2-rt5"
        time: "08-18 18:36"
        link: "https://lore.kernel.org/linux-rt-devel/"
      - text: "RT: [ANNOUNCE] 5.10.264-rt160"
        time: "08-19 01:24"
        link: "https://lore.kernel.org/linux-rt-devel/"
  - type: divider
    label: "📊 板块活跃度 · 近 24h"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-19/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h（lkml 1200 · net 442 · mm 348 居前）"
  - type: toc
    items:
      - label: "Top3"
        text: "lkml 1200 · net 442 · mm 348（refresh-heat 06:23 自动刷新）"
      - label: "观察"
        text: "net 本日仍最活跃（442），mm 次之（348）；virtio-dev 低频窗口内仅 1 条，virtio 板块信号主要靠跨帖捕获（本日 DMB 即来自 dri-devel）。"
  - type: divider
    label: "⚙️ 机制雷达"
    kind: primary
  - type: toc
    items:
      - label: "block"
        text: "RFC: blk-cgroup 把 blkcg 存进 bio（取代 blkg）——为 blkcg_mutex 改造铺路 <a href=\"https://lore.kernel.org/linux-mm/<20260818070641.756747-3-yukuai@kernel.org>/\">原文</a>"
      - label: "Rust"
        text: "rust: kunit 强制测试可配置性——不可配的测试直接编译期排除 <a href=\"https://lore.kernel.org/rust-for-linux/<20260818152324.587932-1-ynorov@nvidia.com>/\">原文</a>"
      - label: "arch"
        text: "riscv: 用 Zalrsc 扩展实现原子操作（v4）——ISA 级原子指令替代库实现 <a href=\"https://lore.kernel.org/linux-arch/\">原文</a>"
      - label: "driver-core"
        text: "fw_devlink 把 class device / PHY 封装纳入设备链接解析（v3）——probe 顺序更可预测"
  - type: divider
    label: "📖 概念速查"
    kind: primary
  - type: toc
    items:
      - label: "TIF_NOTIFY_SIGNAL"
        text: "任务标志位：把不可中断睡眠的任务踢回用户态跑 task work。setter 多、可从 irq 上下文置位，今日头条主角。"
      - label: "pkey（内存保护键）"
        text: "CPU 的『按页标注 + 寄存器授权』机制：页标 pkey P，pkey 寄存器决定当前 CPU 对 P 的读写权限。kpkeys 用它把页表设成『平时只读、要写时临时放行』。"
      - label: "FOLL_FORCE"
        text: "GUP 的强制映射标志，允许绕过 VMA 权限读写。SELinux 补丁对 /proc/self/mem 的 FOLL_FORCE 引入 LSM 把关。"
  - type: closing
    tagline: "如果觉得有用，点个赞，或留言聊聊你最关心的内核话题。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
