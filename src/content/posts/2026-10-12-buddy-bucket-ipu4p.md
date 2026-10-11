---
title: "buddy 分配器要不要按物理地址分桶；Intel 把 IPU4P 接回 IPU6 驱动"
date: "2026-10-12"
desc: "ARM 提抗碎片化的 buddy 分桶设计，维护者建议先做 pageblock；Intel 用 12 封 RFC 补齐 IPU4P 全链路。"
column: "daily"
tags: ["mm", "media", "fs", "block", "Rust", "DRM", "PCI", "net", "sched", "LSM"]
blocks:
  - type: hook
    text: >-
      今天 mm 列表把一件很多年没人动的事重新摆上台面：ARM 想让 <strong>buddy
      分配器按物理地址分桶</strong>来主动抗碎片，Rik van Riel 六分钟内回帖，请他先看 pageblock
      那一版。media 那边则是 Intel 把 Ice Lake 的 <strong>IPU4P</strong> 接回了 IPU6
      驱动——12 封 RFC，从 PCI 设备 ID 一路补到 CSI PHY。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-12/cover.png"
    alt: "封面 · 10月12日 · buddy 分配器分桶抗碎片，社区说先修 pageblock"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-12/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-12 06:23 北京，近 24h 各板块真实计数：net 286 · PCI 99 · DRM 80 · fs 56 ·
      block 52 · Rust 50 · mm 39 · media 35 · LSM 9 · rt 6 · virtio 0 · arch 0。
      周日的总量整体回落，但结构很清楚：net 全是零散修复（最大的是一份 netfilter 例行拉取），
      PCI 靠 CXL reset 那条长系列撑起来，真正的<strong>设计讨论</strong>集中在 mm（buddy
      分桶）和 media（IPU4P）。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "buddy 分配器想按物理地址「分桶」抗碎片，维护者说：先看 pageblock 那一版"
    meta: "〔10-12 05:54 北京〕· [RFC NO CODE] [DISCUSSION] Anti-fragmenting ordered buddy allocator（Dev Jain / ARM）"
    points:
      - label: 现状
        text: >-
          buddy 分配器是 Linux 的物理页分配器：空闲页按 order（2 的幂次个连续页）挂在 freelist
          上，要更大的块就往上找、劈开，释放时如果「伙伴」也空闲就合并回去。它目前唯一的<strong>结构性</strong>抗碎片手段是
          migratetype——把页框分成可移动 / 不可移动 / 可回收三类，各挂各的 freelist，别互相打碎。
          但同一类内部，这次分配到底从哪块物理地址出来，是没有偏好的。
      - label: 痛点
        text: >-
          没有偏好就意味着<strong>外部碎片</strong>：总共还有足够多的空闲页，却凑不出一块足够大的连续内存。
          现在靠 compaction（内存规整）事后补救，而它是被动的——要搬页、要代价。
          作者的说法是：学术界管这叫 anti-fragmentation，内核这边除了 migratetype
          和 compaction，几乎没在 buddy 算法本身上做过事。
      - label: 方案
        text: >-
          提案把每个 zone 再按<strong>物理地址切成 N 个 bucket</strong>，每个 bucket 内各自一组
          (migratetype, order) freelist。可移动分配从低地址 bucket 往高走，不可移动 / 可回收<strong>反序</strong>从高往低——
          让同类分配在物理上扎堆；释放时按 pfn 反查 bucket 归位。给了两个设计：
          Design 1 固定 4 桶、实现最简；Design 2 桶数多时用「活跃桶 + 挂在该桶 order-0 list_head
          同一 cacheline 上的局部 bitmap」找下一桶，非活跃桶的释放先进一条 lockless 链表（类似
          <code>trylock_free_pages</code>），等活跃桶用尽再灌进来，把 cache miss 摊薄。
      - label: 为什么
        text: >-
          作者有个明确的自律：<strong>不动 buddy 的 freelist 结构</strong>。学术界有拿 bitmap
          替掉 buddy 的方案，他说那样只会换来 upstream 一句硬 NAK——所以他在既有 freelist
          之上加「地址偏置」这一层，别的不碰。代价他也认：alloc / free 路径会变慢，桶越多越慢，
          所以整个文档后半段都在讲怎么把这笔开销省回来。
      - label: 效益
        text: >-
          他自己测的数字很扎眼：桶数拉高时 <code>compact_stall</code> 从 4000 掉到
          <strong>5</strong>，内核编译的执行时间几乎没变化，<code>anon_fault_fallback</code>
          也下降。换个说法就是：把 compaction 事后要干的活，提前用分配策略省掉了。
      - label: 下一步
        text: >-
          维护者的回应是<strong>先别动分配器</strong>。Rik van Riel 六分钟后就回帖，请他先看自己的
          pageblock 系列，并把自己的计划讲清楚了——先在 pageblock 层面改善碎片，再在这之上加慢路径、
          按物理地址范围引导分配，以保住 gigablock（1GB 大页）分配的可能。
          也就是说：分桶这条路要先证明自己比 pageblock 那版强。
    verdict: 今天最值得读的一篇。它不是补丁，是把「分配器要不要为了抗碎片改算法」这个多年没人碰的问题重新摆上台面；回帖也把上游当前的优先级说得很白——pageblock 先行。
    link: "https://lore.kernel.org/linux-mm/<20261011215412.1181172-1-dev.jain@arm.com>/"

  - type: headline
    title: "Intel 把 Ice Lake 的 IPU4P 接回 IPU6 驱动：12 封补丁，从 PCI 设备 ID 补到 CSI PHY"
    meta: "〔10-11 22:24 北京〕· [RFC PATCH 00/12] media: ipu6: Add support for IPU4P hardware（Ruslan Bay）"
    points:
      - label: 现状
        text: >-
          IPU6 是 Intel 笔记本上的图像处理单元（ISP），主线驱动在
          <code>drivers/media/pci/intel/ipu6</code>，目前覆盖 IPU6 / IPU7 两代。
          它不是「一个传感器驱动」，而是一整条链路：PCI 设备 → buttress（固件加载与安全启动那一侧）→
          MMU → ISYS（输入系统，接 CSI-2）→ 固件通信 → V4L2 视频节点。
      - label: 痛点
        text: >-
          IPU4P 是 Ice Lake 那一代（Surface Pro 7 这类机器上的），它的<strong>固件 ABI、寄存器布局、
          CSI PHY</strong> 都和 IPU6 不一样。主线一直没覆盖，这些机器只能靠 Intel 的 downstream
          驱动活着，进不了上游。
      - label: 方案
        text: >-
          12 封把 IPU4P 作为 IPU6 驱动里的<strong>新变体</strong>接进来：IPU4P 识别 helper、MMU、
          buttress、ISYS 固件 ABI 定义与固件操作、DMEM-based SysCom 支持、固件特定的 ISYS 响应分发、
          CSI-2 寄存器定义、ISYS 中断处理，以及一个新的 <strong>IPU4P CSI PHY 驱动</strong>；
          最后一封启用 IPU4P 的 PCI 设备 ID。合计约 1957 行新增。
      - label: 为什么
        text: >-
          大部分地基是 Antti Laakso 在 IPU7 系列里铺好的，作者只补 IPU4P 专有部分，拿 Intel
          downstream 驱动做参照。有个细节很见功力：媒体设备名<strong>故意保持 "intel-ipu6"</strong>，
          这样未经修改的 libcamera Simple pipeline handler 能直接认出来——不为了名字好看去破坏用户态兼容。
      - label: 效益
        text: >-
          前后摄已经能出图。作者在 Surface Pro 7（Ice Lake，i5-1035G4）上实测，
          署名里也专门谢了 linux-surface 社区和 libcamera 开发者——下游社区先把驱动验了一遍，
          这封 RFC 是把它收回主线的动作。
      - label: 下一步
        text: >-
          仍标 RFC：<strong>后摄 stream-off 超时</strong>还没查清（作者附了现象链接）。
          这个修掉之前，大概不会进树。
    verdict: 相机链路的补丁最能看出「一个 ISP 驱动进主线到底要补多少层」——这 12 封里没有一封是传感器驱动，全是让硬件能被说清楚的地基。
    link: "https://lore.kernel.org/linux-media/<5oAFQQK4aV42L5EWnypG-lloKyb1XF33Qcd8JU3xf9Ik0JjBNXuPkx0f5mvFZzd4jDkt7orjqgppZJJUrH2UePK9HvAfIYfxyWVG4HYl7rU=@proton.me>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "每次 read() 边界丢一行：/proc/pid/maps 在 sparc64 上的老 bug"
    meta: "〔10-12 00:20 北京〕· [PATCH] fs/proc/task_mmu: fix lost maps entries above 2^63"
    points:
      - label: 定位
        text: >-
          <code>/proc/pid/{maps,smaps,numa_maps}</code> 的 seq_file 续读逻辑。缓冲区装不下的那条
          vma，下一次 read() 要重新显示一遍，靠的是把游标回退到 <code>last_pos</code>。
      - label: 做法
        text: >-
          判断「要不要回退」的条件写的是 <code>last_addr &gt; 0</code>，而 last_addr 是<strong>有符号的
          loff_t</strong>，存的是一个 <code>vm_end</code>。sparc64 把共享库、匿名内存、栈映射在
          0x8000000000000000 以上——vm_end 直接变成负数，回退不再发生，于是每次 read()
          边界丢一条。修法是只对「不是 vma 结束地址」的那两个哨兵值特判。
      - label: 效益
        text: >-
          实测 64~8192 字节的读尺寸、步进 64，128 种里有 <strong>126 种会丢行</strong>
          （smaps 123 种、numa_maps 97 种）；修完在 SPARC T7-1 / T4-1 / V240 上任意读尺寸都不丢，
          Python 的 <code>sys.remote_exec()</code>（用 fgets 读 maps）从间歇失败变成 20/20。
          标了 stable。
    relevance: 典型的「一个 signed 类型选错、只在某些架构上炸」。有意思的不是错误本身，而是修法——只特判那两个值，而不是去改比较语义。
    link: "https://lore.kernel.org/linux-mm/<20261011162019.922436-1-stian@itx.no>/"

  - type: highlight
    title: "CMA 的候选区间列表一直是乱序的：新区间插到了第一个比它小的前面"
    meta: "〔10-11 08:31 北京〕· [PATCH 1/2] mm/cma: fix list_insert_sorted() ordering"
    points:
      - label: 定位
        text: >-
          <code>cma_declare_contiguous_multi()</code> 用 <code>list_insert_sorted()</code>
          维护候选空闲区间，要求按大小降序、基址升序。
      - label: 做法
        text: >-
          比较器的语义是「前者排在前面返回 true」，而 helper 停在了<strong>第一个
          cmp(entry, new) 为 true</strong> 的位置往前插——方向反了；一个都没匹配上时，
          游标停在尾巴上，于是新区间被插到最后一个<em>前面</em>，而不是追加到末尾。
      - label: 效益
        text: >-
          后果不是崩，是<strong>悄悄退化</strong>：列表乱序之后，一个比已记录区间更大的候选会因为
          「比第一个找到的小」被跳过，于是明明存在可行布局，却分配失败、或者预留得比要求少。
          作者举的例子很干净——空闲区间 4G、7×1G、2G，请求 12G：那 2G 被丢掉了，而不是去替换某个 1G。
          代码审查发现，另用一份用户态复制品验证。Fixes 到 6.15+，标了 stable。
    relevance: 和你日常遇到的「明明有资源却分配失败」是同一类：不是没有，是记账记乱了。
    link: "https://lore.kernel.org/linux-mm/<20261011003059.169430-1-skunkolee@gmail.com>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "superblock 的冻结 / 重配 / 错误上报：一组 15 封的清账"
    meta: "〔10-11 23:56 北京〕· [PATCH 00/15] super: fixes for freezing, reconfiguration and error reporting"
    points:
      - label: 定位
        text: >-
          VFS 的 superblock 生命周期有三块互相咬合的地方：冻结（freeze，快照 / 备份要靠它）、
          重配（remount 与 fs_context）、错误上报（fserror）。它们的次序问题长期散在好几个子系统里。
      - label: 做法
        text: >-
          拆开分别修：remount context 不再放在 <code>s_umount</code> 下；
          resume 解冻一个用户态冻结时不再告警；<code>quotactl_block()</code> 真的等解冻；
          块设备冻结失败时不让 superblock 卡在 frozen；设备侧冻结已经消失时不保留冻结状态；
          fserror 在 superblock 诞生前拒绝错误上报、并把最后一个待处理错误的递减<strong>完全排序</strong>；
          重配没改动只读状态时保留原状态；再删掉 <code>SUPER_ITER_EXCL</code>、
          重置 <code>vfs_clean_context()</code> 的 flag mask。15 封里有 5 封是 selftests。
      - label: 效益
        text: >-
          冻结 / 解冻与 quota、块设备、错误上报之间的排队问题，这次一次性收拢，并且每条都配了测试——
          这类改动最怕的就是「修一处、别处又错位」。
    relevance: 文件系统一致性问题的经典形态：不是逻辑写错，是次序错。看这类补丁对写并发代码很有帮助。
    link: "https://lore.kernel.org/linux-fsdevel/<20261011-work-super-fixes-core-v1-0-c727176c5b53@kernel.org>/"

  - type: highlight
    title: "块大小大于页大小还要支持加密：13 封从 blk-crypto 一路打到 ext4"
    meta: "〔10-12 01:10 北京〕· [PATCH 00/13] block, ext4: allow encryption with a block size larger than the page size"
    points:
      - label: 定位
        text: >-
          文件系统加密（fscrypt）走 blk-crypto 做内联加解密，而加解密以 <strong>data unit</strong>
          为单位——这个粒度过去默认不跨页。
      - label: 做法
        text: >-
          先让 blk-crypto 支持<strong>大于一页的 data unit</strong>：一个 crypto request
          只处理一个 data unit、拒绝自己处理不了的 fallback 尺寸；再让 block 层按 data unit
          边界切 bio、不再要求 bio_vec 按 data unit 对齐、对切不开的 bio 直接告警。
          ext4 侧放开「块大小 &gt; 页大小」时对加密的拒绝，并让跨页回绕的 folio 走
          buffer_head 路径。
      - label: 效益
        text: >-
          此前「块大于页」和「加密」这两个配置是直接被互斥掉的，13 封把它们打开。
          ext4 那两封之所以要带一整套 block 层前提，是因为加密粒度不再等于页粒度——
          改动落点在 block，动机来自 fs。
    relevance: 页大小与块大小解耦是这几年反复出现的一条线（大 folio 是同一个方向的另一面），值得顺着看。
    link: "https://lore.kernel.org/linux-fsdevel/<20261011170958.1759230-1-libaokun@linux.alibaba.com>/"

  - type: divider
    label: "📰 Rust"
    kind: section
  - type: highlight
    title: "Rust 版 ww_mutex 走到 v11：把 wound-wait 锁和它的 LockSet 一起搬进来"
    meta: "〔10-12 02:40 北京〕· [PATCH v11 0/6] rust: add ww_mutex support"
    points:
      - label: 定位
        text: >-
          Rust for Linux 的锁抽象层。ww_mutex（wound-wait mutex）是 DRM 用来<strong>一次拿一组
          buffer 锁</strong>的机制：它是事务式的——拿不到就整体回退重来，以此避掉 ABBA 死锁；
          所以它需要 ww_class（标识「同一类锁」）和 acquire context（记录这次尝试拿了哪些）。
      - label: 做法
        text: >-
          6 封：C 侧 inline 函数的包装、把 ww_class 字段改成无条件存在、给 ww_class 实现
          Class、加 Mutex / AcquireCtx / MutexGuard、实现 LockSet（一次尝试里持有的那把锁的集合），
          最后把 Onur Özkan 加进 WW MUTEX 维护者名单。
      - label: 效益
        text: >-
          这是 Rust DRM 抽象的前置依赖：没有 ww_mutex，就没法在 Rust 里写「一次锁一组 BO」
          的驱动路径。走到 v11，说明 review 已经磨了很多轮。
    relevance: 你若看 panthor、或者想用 Rust 写 DRM，这条是绕不开的地基。
    link: "https://lore.kernel.org/rust-for-linux/<cover.1791743500.git.work@onurozkan.dev>/"

  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "panel 也要有 atomic state：挂到它内嵌的那个 drm_bridge 上"
    meta: "〔10-12 04:43 北京〕· [PATCH RFC 0/9] drm/panel: add atomic state（Val Packett 实测反馈）"
    points:
      - label: 定位
        text: >-
          DRM 的 atomic 提交是「先 check 再 commit」：CRTC、encoder、connector、bridge、plane
          都把自己的状态放进同一个 atomic state，一起校验。panel <strong>不在</strong>这套里——
          它没有 state，于是既不能在 atomic_check 阶段存 / 取数据，也没法拒绝自己处理不了的配置。
          有的 panel 驱动干脆把 connector 指针存进 <code>get_modes()</code>，之后在
          <code>prepare()</code> 里<em>不加锁</em>解引用 <code>connector-&gt;state-&gt;crtc-&gt;state</code>。
      - label: 做法
        text: >-
          提案让 panel <strong>子类化它已经内嵌的 drm_bridge</strong>，直接复用 bridge 那套已经处理好的
          atomic state；而且是 <strong>opt-in</strong>——不实现 state 回调的 panel 行为完全不变，
          现有驱动一个都不用动。
      - label: 效益
        text: >-
          这条是 Val Packett 的反馈：他之前自己提过一版（被否，问题在 API 设计——给 state 传 NULL），
          这次把自己的 nt37701 驱动改到新方案上，测下来「行为和原来那版 hack 一样好」，
          并给了 Tested-by。有实测背书的 RFC，往前推进的概率就大得多。
    relevance: 你若调 panel / DSI，这条会改写 panel 驱动「怎么拿到当前配置」的写法。
    link: "https://lore.kernel.org/dri-devel/<c5051b9d-2657-4852-809e-37ce2839e728@packett.cool>/"

  - type: highlight
    title: "panthor 的性能计数器到 v7：uAPI、采样会话、suspend/resume 都齐了"
    meta: "〔10-12 01:40 北京〕· [PATCH v7 0/8] drm/panthor: Performance counter implementation with single manual client support"
    points:
      - label: 定位
        text: >-
          panthor 是 ARM Mali 第五代架构的 DRM 驱动。
      - label: 做法
        text: >-
          8 封从 uAPI 开始（<code>DEV_QUERY.PERF_INFO</code> 与 perf ioctl）、寄存器定义、
          初始化与销毁、<strong>采样会话</strong>（sampling session，一个会话代表一个用户态客户端）、
          采样处理，一直到 suspend / resume / reset 时怎么处置这些会话。
      - label: 效益
        text: >-
          用户态从此能读 GPU 性能计数器了，而且先限定「单个手动客户端」——
          把最简并发模型做对，比一上来就支持多客户端共享计数器稳妥得多。
    relevance: 和内核对 GPU 可观测性「让用户态自己读硬件计数器」的整体方向一致。
    link: "https://lore.kernel.org/dri-devel/<20261011-panthor-performance-counters-v7-0-12c32495062f@arm.com>/"

  - type: divider
    label: "📰 PCI"
    kind: section
  - type: highlight
    title: "CXL Type 2 设备的 reset 走到 v15：reset 会把 HDM 配置冲掉，那就先存后恢复"
    meta: "〔10-11 10:14 北京〕· [PATCH v15 00/16] PCI/CXL: Add CXL reset support for Type 2 devices"
    points:
      - label: 定位
        text: >-
          CXL Type 2 指的是「带设备内存的加速器」。CXL 的 reset 语义和传统 PCI 的 FLR 不是一回事——
          真正麻烦的是设备内存。
      - label: 做法
        text: >-
          16 封的主线是「<strong>先缓存、再 reset、后恢复</strong>」：把 HDM decoder
          （描述设备内存怎么映射进主机地址空间的解码器）的配置提成独立结构、搬到共享头与 built-in
          代码；PCI 枚举时缓存 endpoint 的 HDM 状态；reset 时校验并同步 HDM ranges、
          拒绝影响范围不安全的 function scope；reset 之后恢复 CXL 状态。
          另外把 CXL Reset 暴露成一种 PCI reset 方法，并补上 reset 时序与工具侧的范围检查。
      - label: 效益
        text: >-
          reset 是热插拔、错误恢复、驱动重载的共同前提。v15 这个版本号本身就是信息——
          CXL 这块的 review 强度，从「HDM 配置要在 reset 前后保持一致」这件事上就能看出来。
    relevance: 看这组补丁能学到一个套路：硬件状态会被某类操作破坏时，正解通常是「枚举期快照 + 操作后恢复」，而不是让每个调用点自己重配。
    link: "https://lore.kernel.org/linux-pci/<20261011021422.3428136-1-smadhavan@nvidia.com>/"

  - type: divider
    label: "📰 block"
    kind: section
  - type: highlight
    title: "ublk：不要往已经取消的命令上分发请求"
    meta: "〔10-11 14:36 北京〕· [PATCH v3 00/12] ublk: don't dispatch to canceled io commands"
    points:
      - label: 定位
        text: >-
          ublk 是把块设备驱动搬到用户态的框架：内核侧只做转发，命令在「用户态服务进程」和内核之间来回。
          于是<strong>取消</strong>和<strong>分发</strong>成了一对必须严格排序的动作。
      - label: 做法
        text: >-
          12 封围绕一条规则展开——<strong>先把命令标记成可取消，再发布出去</strong>：
          io command 在发布前标记、batch fetch 命令在挂进链表前标记、FETCH round 在
          <code>ub-&gt;mutex</code> 下重置、release 时即使没有磁盘也重置、STOP_DEV 在释放服务端之前
          先取消它的命令、允许 cancel 回调里 <code>io-&gt;cmd</code> 为 NULL、命令被取消后拒绝
          go live，最后是 zones 改用全局 index 上报；配套 3 封 selftests。
      - label: 效益
        text: >-
          取消与分发竞态的后果，是「已经取消的命令又被派发出去」——表现为内核里的悬垂引用，
          或者用户态看到的莫名卡死。把「先标记、后发布」贯穿到每一个发布点，才是根治。
    relevance: 你在驱动里处理「取消 / 超时」和「正在进行的操作」时，会遇到一模一样的顺序问题。
    link: "https://lore.kernel.org/linux-block/<20261011063555.1142277-1-tom.leiming@gmail.com>/"

  - type: more
    title: 更多动态
    items:
      - link: "https://lore.kernel.org/netdev/<20261011215953.1334630-1-pablo@netfilter.org>/"
        text: "netfilter / IPVS 例行拉取（15 封，含 conntrack gc worker 的 UAF 与 IPVS 同步消息缓冲区溢出两处修复）"
        time: 10-12 06:00
      - link: "https://lore.kernel.org/netdev/<20261011-macsec-early-sci-check-2b1f06af193f@gmail.com>/"
        text: "macsec：注册设备前先检查 SCI 是否重复"
        time: 10-12 06:02
      - link: "https://lore.kernel.org/lkml/<20261011220755.1673367-1-alastair@d-silva.org>/"
        text: "rtw88 SDIO：修未处理的 RX 请求中断风暴（v5，4 封）"
        time: 10-12 06:08
      - link: "https://lore.kernel.org/linux-pci/<20261011190145.23621-1-gruhlke@mailbox.org>/"
        text: "PCI：三星 990 PRO 不遵守 Immediate Readiness，FLR 后等不到就绪（v3，另修 ~0 被当成就绪）"
        time: 10-12 03:02
      - link: "https://lore.kernel.org/linux-rt-devel/<20261011060742.30584-1-kmehltretter@gmail.com>/"
        text: "softirq：IRQ 退出时保留中断上下文（v6，rt 列表）"
        time: 10-11 14:08
      - link: "https://lore.kernel.org/linux-security-module/<20261011.queif1Ohf1Uf@digikod.net>/"
        text: "landlock：去掉 layers 上的 __counted_by（讨论收尾）"
        time: 10-12 00:16
      - link: "https://lore.kernel.org/linux-media/<20261011-upstream-s5k3t2-v4-0-d33b12fb3263@proton.me>/"
        text: "media：三星 S5K3T2 图像传感器驱动（v4，2 封）"
        time: 10-11 17:13
      - link: "https://lore.kernel.org/linux-media/<20261011-ov08d10-get-selection-v1-1-5debe6436765@leica-geosystems.com>/"
        text: "media：ov08d10 传感器补 get_selection 支持"
        time: 10-12 03:55

  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: sched_ext 修复
        text: "两个 bypass 传播 bug：bypass 深度变化没传给子调度器、祖先被 bypass 时 bypass dispatch claim 判错（7.3 修复系列）· <a href=\"https://lore.kernel.org/lkml/<20261011214028.743546-1-tj@kernel.org>/\">原文</a>"
      - label: Rust 动态调试
        text: "rust: add support for dynamic debug（RFC 11 封）——让 Rust 侧的 pr_debug!() / dev_dbg!() 也能被 dyndbg 运行时开关；顺带把 _ddebug::flags 拆成独立字段、用 READ_ONCE/WRITE_ONCE 访问 · <a href=\"https://lore.kernel.org/rust-for-linux/<20261011-rust-dyndbg-v1-0-832e4039b71f@weissschuh.net>/\">原文</a>"
      - label: RV 新监视器
        text: "rv: Add task latency over budget RV monitor（v7，14 封）——用运行时验证框架盯「任务延迟超预算」，含 uprobe 基础设施与 KUnit 测试 · <a href=\"https://lore.kernel.org/lkml/<cover.1791745088.git.wen.yang@linux.dev>/\">原文</a>"
      - label: sparc64 新机器
        text: "sparc64: add Fujitsu M3000 support（v2，6 封）——加 SPARC64 VII CPU/MMU/SMP、M3000 的 Oberon PCIe、以及 M3000 固件控制台后端 · <a href=\"https://lore.kernel.org/lkml/<20261011195729.981243-1-linmag7@gmail.com>/\">原文</a>"
      - label: CMA 修复（见上文 mm 节）
        text: "cma_declare_contiguous_multi() 的候选区间列表顺序修正，Fixes 到 6.15+ · <a href=\"https://lore.kernel.org/linux-mm/<20261011003059.169430-2-skunkolee@gmail.com>/\">原文</a>"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: buddy / 伙伴系统
        text: 物理页分配器：空闲页按 order 挂 freelist，需要更大的块就往上找并劈开，释放时若「伙伴」也空闲就合并。
      - label: pageblock
        text: 由 2^MAX_ORDER 个页组成的一块（通常是 2MB）。migratetype 是按页块记的——它是内核现有的抗碎片基本单位。
      - label: migratetype
        text: 可移动 / 不可移动 / 可回收三类分配，各挂各的 freelist，避免互相打碎连续内存。
      - label: data unit
        text: blk-crypto 做内联加解密的最小粒度。加密时 bio 要按它对齐 / 切分——本次改成可以大于一页。
      - label: ww_mutex
        text: wound-wait 互斥锁。拿不到就整体回退重来，DRM 用它一次锁一组 buffer 以避免 ABBA 死锁。
      - label: atomic state
        text: DRM 的提交状态对象。所有参与者先一起 check、再一起 commit；panel 此前不在这套里。
      - label: HDM decoder
        text: CXL 里描述设备内存如何映射进主机地址空间的解码器。CXL reset 会把它冲掉，所以要缓存后恢复。
      - label: ublk
        text: 把块设备驱动搬到用户态的框架，内核侧只做转发；取消与分发的排序是它的核心难点。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
