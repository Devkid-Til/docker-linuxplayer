---
title: "页缓存不再抢引用，容器变成一个内核对象"
date: "2026-10-20"
desc: "免引用读让 64 线程小读提升 4.5 倍；cells RFC 把容器抽象成内核对象。"
column: "daily"
tags: ["mm", "fs", "media", "DRM", "net", "PCI", "block", "Rust", "LSM", "sched"]
blocks:
  - type: hook
    text: >-
      今天两件事值得看完：<strong>页缓存读路径不再为每个 folio 抢一次引用</strong>，
      64 线程小读从约 1500 万次/秒到 7000 万次；以及
      <strong>Josef Bacik 的 cells RFC 想把容器做成单个内核对象</strong>，
      任务出生在 cell 里、永不离开。硬件侧，ThinkPad 的 IR camera
      和 RK3576 的原生 HPD 都有了可用路径。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-20/cover.png"
    alt: "封面 · 10月20日 · 页缓存不再抢引用"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-20/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-20 06:47 北京，近 24h 各板块真实计数：net 675 · DRM 361 · mm 314 ·
      PCI 167 · media 162 · fs 117 · LSM 94 · block 48 · Rust 47 · rt 32 ·
      virtio 3 · arch 3。net 的量仍来自合并窗口前的修复潮，但今天真正的机制讨论
      集中在内存与容器抽象：<strong>页缓存读路径</strong>和
      <strong>把容器变成一个对象</strong>同一天出现。

  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: 头条一
        text: 页缓存免引用读取：64 线程小读提升 4.5 倍，Linus 的 RFC 被工程化
      - label: 头条二
        text: cells RFC：容器成为内核对象，没有 setns，也没有 unshare
      - label: 硬件
        text: Sony Starvis 2 公共驱动、ThinkPad IR camera、RK3576 HPD
      - label: 安全
        text: virtio-net 校验和加固与 KEYS 整数溢出修复

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "页缓存不再为每次读抢引用：64 线程小读提升 4.5 倍"
    meta: >-
      〔10-19 23:49 北京〕· [RFC PATCH 00/18] mm: read the page cache without folio references
      （Kiryl Shutsemau / Linus Torvalds）
    points:
      - label: 现状
        text: >-
          多个 CPU 反复小读同一个文件时，<code>filemap_read()</code> 每次都要对同一个
          folio 取引用、再放引用，refcount 在核心之间来回弹。tmpfs 更重：
          <code>shmem_get_folio()</code> 每次读都要拿 folio lock，64 个线程和 1 个线程一样快。
      - label: 痛点
        text: >-
          页缓存的并行读被引用计数和锁串行化。文件本身是热的、数据已经在内存里，
          吞吐却上不去；单线程不受影响，所以这个问题在单线程基准上看不见。
      - label: 方案
        text: >-
          Kiryl Shutsemau 把 Linus 的 RFC 做成 18 补丁：新增
          <code>PG_rcu_free</code>，带这个标记的 folio 只在 RCU grace period
          之后才释放；<code>filemap_read()</code> 与 shmem 直接从未加引用的 folio
          拷贝。只有 <code>folio_mark_accessed()</code> 认定为热页的 folio
          才打标记，流式读和冷数据不延迟释放。
      - label: 为什么
        text: >-
          语义没有变，只是把「释放」推迟到所有 lockless 读者都安全的时间点。
          系列同时处理了 splice、fuse、<code>memory_failure()</code>、
          <code>alloc_contig_range()</code>、内存 offline 和 memcg uncharge，
          并在 CPU 积压或内存紧张时提前催 RCU grace period。
      - label: 效益
        text: >-
          64 vCPU KVM 访客、16 字节 <code>pread()</code>：ext4 从 15.0–15.7M 次/秒
          升到 68.9–70.1M；<code>mitigations=off</code> 时从 17.2M 升到 217–220M；
          tmpfs 从 1.6–1.7M 升到 71–72M。64K large folio 顺序读，huge tmpfs
          从 96–100 MiB/s 升到 1370–1390 MiB/s。单线程读数与基线持平。
      - label: 下一步
        text: >-
          作者列出的开放项：patch 12 依赖 <code>mapping_exiting()</code> 的语义
          （f2fs 在打开的 inode 上调 <code>truncate_inode_pages_final()</code>，
          修复已在路上）；tmpfs 读不再拿 folio lock，需要 Hugh 复核；
          迁移后的带标记页要等 grace period 才能回到 pageblock；标记是 page flag，
          只支持 64 位；另有 debugfs 开关可以整体关闭这条路径。
    verdict: "这不是给读路径加缓存，而是把「引用计数」从热读里拿走。数字比 v7.3 基线高一个量级，真正决定能否合入的是回收、迁移、offline 这些慢路径的正确性。"
    link: "https://lore.kernel.org/linux-mm/<20261019154913.1765974-1-kas@kernel.org>/"

  - type: headline
    title: "容器变成内核里的一个对象：cells RFC 提议删掉 setns 与 unshare"
    meta: >-
      〔10-20 00:50 北京〕· [RFC] cells: a container as one kernel object（Josef Bacik）
    points:
      - label: 现状
        text: >-
          容器在内核里不是「一个东西」：它是八种 namespace、一个 cgroup、
          一个 seccomp filter，加上运行时维护的一堆约定。内核不能给它命名，
          不能一次性杀掉它，也说不清里面有什么。
      - label: 痛点
        text: >-
          特权挂在 uid 和 user namespace 上；任务可以在两套 namespace 之间
          停在一半，这是大量 bug 的来源。运行时只能靠约定把边界拼起来，
          内核没有可以检查的边界。
      - label: 方案
        text: >-
          Josef Bacik 的 cells RFC 把容器做成单个对象。任务出生在 cell 里、
          永不离开，也没有任何东西能进入，因此没有 <code>setns()</code>，
          也没有 <code>unshare()</code>。建法是从外面用已持有的 fd 填命名槽，
          seal 之后再 spawn；持有 cellfd 就是全部权限，最后一个 cellfd
          关闭时 cell 被杀。配套的 <code>clone3(CLONE_EMBRYO)</code>
          给出一个存在但从未运行过的任务的 pidfd，再用
          <code>task_configure()</code> 配置，最后 start 并 exec。
      - label: 为什么
        text: >-
          边界要真的有意义：kuid 从保留窗口分配；文件不传递特权，所有任务
          <code>no_new_privs</code>，set-id 位在创建、chmod、写打开时丢弃；
          Unix socket 只传字节，不传 SCM_RIGHTS 与 peer credentials；
          mount 树从零构建，不让任何东西藏起来。作者把 id 窗口、capability
          双向隔离、MNT_LOCKED、seccomp 与生命周期等 8 个问题留给社区。
      - label: 效益
        text: >-
          如果方向成立，容器第一次可以被内核命名、一次性回收，权限模型从
          「uid + capability」收拢为「持有 cellfd 或什么都没有」。作者也承认
          代价：host 不能再把文件 chown 给 2^31 以上的 id，因为检查要按值做。
      - label: 下一步
        text: >-
          这是设计讨论，不是可合入系列：代码是 62 个补丁，叠在 13 补丁的
          cred 系列上，放在作者分支里；邮件正文是 pitch、8 个开放问题和完整
          设计文档。作者明确说先看形状对不对，形状不对后面都免谈。
    verdict: "形状很激进：没有 setns、没有 unshare、权力等于 fd。但它把「容器」从运行时约定变成内核可检查的对象，值得 containers 与 fs 社区认真回应。"
    link: "https://lore.kernel.org/linux-fsdevel/<20261019-cells-rfc-6f4c85415f29@toxicpanda.com>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "共享 vmemmap tail 页一律只读：device DAX 也补上保护"
    meta: "〔10-19 17:08〕· [PATCH 0/4] mm: Enforce read-only shared vmemmap tail mappings（Muchun Song）"
    points:
      - label: 定位
        text: >-
          HugeTLB 与 device DAX 都会在 vmemmap population 时安装共享 tail 映射。
          一个共享 tail vmemmap 页为许多 tail page 提供元数据，本该只读；
          HugeTLB 在后面单独做了一次写保护，device DAX 没有。
      - label: 做法
        text: >-
          把只读保护移进通用的 sparse-vmemmap 与 powerpc radix population 路径，
          于是 device DAX 也被覆盖，HugeTLB 专属的
          <code>vmemmap_wrprotect_hvo()</code> 与 bootmem 包装可以删掉。
          4 个补丁合计 +17/−70。
      - label: 效益
        text: >-
          共享 tail 页不再可写，HVO 从 HugeTLB 向 device DAX 泛化走出一步；
          代码反而变短。距离完整的 HVO 泛化还差命名与开关合并。
    relevance: "vmemmap 是物理页元数据的地图。做 NUMA、内存热插拔或 DAX 时，这类保护决定了一个 bug 是踩坏元数据还是立刻报错。"
    link: "https://lore.kernel.org/linux-mm/<20261019090830.1917657-1-songmuchun@bytedance.com>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "beamfs：单设备上做 Reed-Solomon 纠错，读不出正确字节就报 EIO"
    meta: "〔10-19 12:17〕· [RFC PATCH 00/18] beamfs: Reed-Solomon protected filesystem（Aurelien Desbrieres）"
    points:
      - label: 定位
        text: >-
          块设备文件系统，只有一个设备、没有第二份副本可修。每个数据块由
          16 个交织的 RS(255,239) 码字组成，基于 <code>lib/reed_solomon</code>；
          目录块、inode、分配位图、superblock 和 indirect block 也带奇偶校验。
          默认布局每 4096 字节里 288 字节（7%）是开销。
      - label: 做法
        text: >-
          每次读都解码；解码器不能担保的读直接 <code>-EIO</code>，
          绝不返回无法验证的字节。作者给出了 xfstests auto 组的逐项结果：
          x86-64 上运行的 122 个全过，aarch64 上 122/123。单比特翻转注入下，
          beamfs 从未返回错数据，只拒绝过一次读；同场 ext4/ext3 静默返回了
          坏数据，btrfs 单副本也拒绝读。
      - label: 效益
        text: >-
          目标场景是辐射环境里的单设备系统：卫星、放疗室、粒子加速器。
          作者明确列出限制：翻转是模拟的不是真实束流；没有 journal 与 COW；
          超过 8 个错误符号可能 miscorrect；性能尚未测量。
    relevance: "存储链路上的位翻转不只在介质里，也在控制器、总线和 DMA 缓冲里。beamfs 把「读不到就失败」做成了文件系统级契约。"
    link: "https://lore.kernel.org/linux-fsdevel/<20261019041728.327785-1-aurelien@hackers.camp>/"

  - type: highlight
    title: "负 dentry 的两个老症状：引用计数溢出与 d_children 遍历卡死"
    meta: "〔10-19 08:08〕· [PATCH v4 0/5] Fix easy bits of the negative dentry problem（NeilBrown）"
    points:
      - label: 定位
        text: >-
          负 dentry 可以有数十亿个，父 inode 的引用计数可能溢出；
          <code>d_children</code> 链表的遍历时间没有上界，fsnotify 这类
          影响面广的路径会触发 soft lockup。
      - label: 做法
        text: >-
          v4 只聚焦 fsnotify：先修引用计数溢出；再用一个统一的 helper
          遍历 <code>d_children</code>，需要时放锁并 <code>cond_resched()</code>，
          用 cursor 记住位置。其他文件系统专属的遍历路径留到后续。
      - label: 效益
        text: >-
          两个可报告的故障被拆开处理，先拿影响面最大的 fsnotify 开刀；
          作者说这层就位后，才有信心去处理「遍历任意长」本身。
    relevance: "dentry 缓存、fsnotify 和容器里的海量小文件直接相关。这是不改变缓存策略、只修症状的一小步。"
    link: "https://lore.kernel.org/linux-fsdevel/<20261019000810.1837917-1-neilb@ownmail.net>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "imx678 变成 Starvis 2 公共驱动：一次覆盖五颗 Sony sensor"
    meta: "〔10-19 22:28〕· [PATCH v5 00/16] Update imx678 to act as a common Sony Starvis 2 driver（Dave Stevenson）"
    points:
      - label: 定位
        text: >-
          IMX678 驱动已经在树内。作者在准备 IMX662 时发现它与 IMX678
          的共性足够大，于是把驱动改造成 Starvis 2 的公共驱动，用
          <code>variant_def</code> 描述各型号，覆盖 IMX662、IMX675、IMX585
          与 IMX832。
      - label: 做法
        text: >-
          各型号共享寄存器路径与 CCI 访问，差异集中到 variant 表。
          HMAX/VMAX 的取值来自 Sony datasheet 的整数帧率档；datasheet
          没给全的 IMX675/IMX585，作者用实测开始出问题的 HMAX 值定界。
          v5 修了 LINK_FREQ 菜单创建失败的报错、common_regs_written 的
          条件判断，并新增 pm_runtime autosuspend。
      - label: 效益
        text: >-
          五颗 sensor 走一条驱动路径，新增 sensor 只需加 variant，
          不再各提一份驱动。作者是 Raspberry Pi 的 Dave Stevenson，
          这条路径也会成为 Pi 相机栈的上游基础。
    relevance: "这是 camera 驱动里最典型的「先写一颗，再把共性抽出来」的演进。GMSL2/CSI-2 链路上换 sensor 时，公共驱动能省掉一整套 bring-up。"
    link: "https://lore.kernel.org/linux-media/<20261019-media-starvis2-v5-0-eef935347ce9@raspberrypi.com>/"

  - type: highlight
    title: "ThinkPad 的 IR camera 为什么从不出帧：port B 少了 1-lane PHY 表"
    meta: "〔10-20 05:56〕· [PATCH 0/2] media: ipu6: make 1-lane sensors on MCD PHY port B stream（Dan Person）"
    points:
      - label: 定位
        text: >-
          Lenovo ThinkPad X1 Carbon Gen 11 的 OV9234 IR camera 在 Linux 上
          从未出过帧：sensor 在流、ISYS 固件确认 open/start、PHY 报 ready、
          CSI-2 错误状态为空，但每次 capture 都超时。
      - label: 做法
        text: >-
          作者对比 Windows 与 Linux 的 I2C 流量，初始化写完全相同；再对比
          <code>ipu6-isys-mcd-phy.c</code> 与 Windows IPU6 驱动的 PHY 表，
          发现 port B 没有 1-lane 表——Windows 用 2-lane 表配 1-lane sensor。
          Linux 照做后，Y10 644x364@30fps 能出帧，并与另一 port 的 2-lane
          OV2740 同时工作。第二个补丁把 OV9234 加进 ipu-bridge。
      - label: 效益
        text: >-
          笔记本 IR camera 可用。sensor 驱动本身仍在树外（模式表来自厂商驱动），
          作者把它放在 GitHub，等社区写正式上游驱动。
    relevance: "IPU6 的 PHY 表是按 lane 数和端口写死的。这类「Windows 能跑、Linux 不出帧」的差异，往往就藏在一张寄存器表里。"
    link: "https://lore.kernel.org/linux-media/<CABZx5Lu3ShYsPtEsKFfL+Ch6G6KywH9eZ8e=YDYgJqu-k33kJw@mail.gmail.com>/"

  - type: highlight
    title: "UVC 读 imported DMA-BUF 不同步 cache：Pi 400 上拿到的是旧帧"
    meta: "〔10-19 15:14〕· [PATCH 0/4] media: synchronize CPU access to imported DMA-BUFs（Karl Mehltretter）"
    points:
      - label: 定位
        text: >-
          UVC 与 vivid 用 CPU 访问 imported DMA-BUF 时没有做 cache
          同步。在 Pi 400 上，capture 的数据留在 CPU cache 里，
          物理内存还是旧的，用户态读到 stale 帧。
      - label: 做法
        text: >-
          给 vb2 queue 加一个 opt-in flag，在 <code>buf_prepare()</code>
          到 <code>buf_finish()</code> 之间 bracket CPU access；
          <code>VIDIOC_REMOVE_BUFS</code> 补上 finish 操作以保持平衡。
          不用默认开启，因为有些 vb2-vmalloc 驱动会把 buffer 交给硬件。
      - label: 效益
        text: >-
          Pi 400 上 12 轮、每轮 8 帧：UVC/vivid 的 vb2-vmalloc 与
          vb2-dma-contig 都是 0/96 stale；没有 DRM mapping 的对照组
          仍有 4/16 stale。SAM9X75 与 BeagleV Ahead 也跑了生命周期测试。
    relevance: "imported DMA-BUF 的 CPU/设备一致性是 camera 与显示共享缓冲的核心问题。这个 flag 把「谁负责同步」写成了队列契约。"
    link: "https://lore.kernel.org/linux-media/<cover.1792392288.git.kmehltretter@gmail.com>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "RK3576 的原生 HPD 中断：显示管线关着也要能收到插拔"
    meta: "〔10-19 16:59〕· [PATCH v4 00/14] Add HPD support for Rockchip Analogix DP（Dmitry Osipenko）"
    points:
      - label: 定位
        text: >-
          Rockchip 上 Analogix DP 的原生 HPD pin IRQ 要求 DP controller
          保持上电、时钟和初始化，才能产生插拔中断。旧驱动在 bridge
          enable/disable 时开关 IRQ，管线不活跃时就没有 HPD 检测。
      - label: 做法
        text: >-
          把 IRQ 与 pm_runtime 管理移到 bind/unbind；加
          <code>IRQF_ONESHOT</code> 消除 hardirq 与 threaded handler
          对 mask 寄存器的读改写竞态；中断类型改为 bitmask，支持细粒度
          mute/unmute/clear；Rockchip 平台使用 HOTPLUG_CHG 中断并加
          2ms HPD deglitch；下游 bridge 的 HPD 走 <code>.hpd_notify</code>。
      - label: 效益
        text: >-
          在 RK3576 上验证了原生 HPD pin 与 GPIO HPD 两种配置。
          对使用 eDP 的板子，这意味着屏幕拔插不再依赖显示管线是否开着。
    relevance: "这是 RK3588/RK3576 系列 DP/eDP 板级支持里最容易被忽略的一层：HPD 是中断语义，不是 GPIO 电平。"
    link: "https://lore.kernel.org/dri-devel/<20261019085836.3065008-1-damon.ding@rock-chips.com>/"

  - type: highlight
    title: "电子纸进 DRM：SSD16xx 驱动支持三种刷新波形与深睡"
    meta: "〔10-20 05:38〕· [PATCH v3 00/14] Add DRM driver for Solomon SSD16xx e-paper display controllers（Devarsh Thakkar）"
    points:
      - label: 定位
        text: >-
          Solomon SSD1673/1680/1681/1683 电子纸控制器没有 DRM 驱动。
          电子纸是双稳态、低功耗设备，刷新波形和睡眠模式与普通 LCD
          完全不同。
      - label: 做法
        text: >-
          接入 DRM atomic modesetting：SPI 4-wire 与 3-wire；
          用 Data Entry Mode 做四向旋转，不经过 GPU 或内存拷贝；
          支持 partial（约 300–500ms）、full（约 1.5–2s）、fast
          （约 1.0–1.5s）三种波形；BWR 三色；XRGB8888 与 R1；
          runtime PM 进入 Mode 1 深睡（保留 RAM），system suspend
          进入 Mode 2。
      - label: 效益
        text: >-
          首个面板是 Gooddisplay GDEY042T81（4.2 英寸 400×300，
          SSD1683）。刷新模式、颜色模式与会话控制通过 DRM plane
          property 暴露，用户可以按场景选速度与功耗。
    relevance: "电子纸的刷新不是「每帧重画」，而是「什么时候允许闪」。把它接进 DRM atomic，才能让合成器参与时序决策。"
    link: "https://lore.kernel.org/dri-devel/<20261019213726.4145532-1-devarsht@ti.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "TLS 的空记录不再是 EOF：splice 与 recvmsg 的两个错误路径一起修"
    meta: "〔10-20 00:55〕· [PATCH net-next v6 0/9] net/tls: Receive-path fixes for zero-length data records（Chuck Lever）"
    points:
      - label: 定位
        text: >-
          TLS 1.2 与 1.3 都允许零长度的 application_data 记录，作为
          流量分析对抗手段，对端会主动发。此前的修复只覆盖了
          <code>tls_sw_read_sock()</code>，<code>splice(2)</code> 仍把空记录
          当 EOF，<code>recvmsg(2)</code> 遇到空记录不前进。
      - label: 做法
        text: >-
          splice/recvmsg 消费空记录后检查 <code>signal_pending()</code>；
          in-kernel 的 <code>sock_recvmsg()</code> 不能收信号，于是给
          read_sock 用「连续无字节记录计数」设上限；MSG_PEEK 或异步解密
          时，空记录不再无限堆在 rx_list。
      - label: 效益
        text: >-
          对端持续发空记录不再能把调用者困在内核里；splice 不再误判连接
          断开。作者如实列出行为变化：非阻塞 splice/sendfile 现在返回
          <code>-EAGAIN</code>，空记录后面的控制记录返回
          <code>-EINVAL</code>，收到信号返回 <code>-EINTR</code>。
    relevance: "TLS 空记录是合法的流量整形，不是攻击。协议允许的东西，内核读路径必须能前进。"
    link: "https://lore.kernel.org/netdev/<20261019-tls-follow-on-v6-0-ab01c4ecca0c@kernel.org>/"

  - type: highlight
    title: "virtio-net 校验和加固：不受信硬件不能再改包后再让栈校验"
    meta: "〔10-19 20:03〕· [PATCH net v3 0/8] more virtio-net csum hardening（Willem de Bruijn）"
    points:
      - label: 定位
        text: >-
          允许不受信硬件为 <code>CHECKSUM_PARTIAL</code> 指定 csum
          start/offset，硬件可以编辑校验和之外的字节；网络栈可能在编辑前
          和编辑后各看一次包，得到不同结果。此前的
          <code>6785011f8b16</code> 只堵了已知的 IPv4 实例。
      - label: 做法
        text: >-
          真正的修法是只允许编辑校验和字段，或者在栈看包前完成校验。
          系列在 ingress 解析 uncommon partial checksums，加一个 sysctl
          可以关闭校验验证以降低回归风险，并清理相关路径。
      - label: 效益
        text: >-
          把「硬件说什么就信什么」收回到「栈自己验证」。作者判断这是
          net 材料，且因体积较大不适合直接回移植 stable。
    relevance: "virtio 是虚拟化里最常被当作可信边界的地方。这个系列说明：guest 里的硬件描述符同样不受信。"
    link: "https://lore.kernel.org/netdev/<cover.1792411304.git.mst@redhat.com>/"

  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "PF 复位时 VF 不再丢状态：SR-IOV 的 reset 顺序被重新定义"
    meta: "〔10-19 16:35〕· [PATCH v1 00/13] PCI/IOV: Improve reset handling with VFs enabled（Lukasz Laguna）"
    points:
      - label: 定位
        text: >-
          VF 开启时 reset 有三个缺口：PF reset 会丢 VF 的硬件状态，VF 驱动
          不被告知；bus/slot reset 的遍历是自上而下，PF 的
          <code>reset_prepare()</code> 先于 VF；PF 带着 VF 时 bus reset
          不可用，因为 VF 和 PF 在同一条 bus 上。
      - label: 做法
        text: >-
          reset 时把 PF 与所有 VF 一起锁住，保存/恢复 VF config，
          调用 VF 驱动的 <code>reset_prepare()</code>/<code>reset_done()</code>；
          bus/slot reset 跳过 VF、通过 PF 处理，VF 先 prepare、后 restore；
          <code>pci_parent_bus_reset()</code> 忽略 PF 自己的 VF。
          ionic、pds_core、i40e 随之调整。
      - label: 效益
        text: >-
          VF 状态在 PF reset 后不再丢，复位顺序与硬件层级一致；PF 带 VF 时
          也能走 bus reset。后几个补丁用新的 VF 迭代 helper 替换 open-coded
          查找，覆盖 PCI/TSM、ixgbe、ice、liquidio 与 xe。
    relevance: "SR-IOV 的 VF 不是独立设备，它在 PF 的 reset domain 里。这个系列把「谁先复位、谁保存状态」写进了 PCI core。"
    link: "https://lore.kernel.org/linux-pci/<20261019083514.838640-1-lukasz.laguna@intel.com>/"

  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "dm 的 report zones 死循环：zone 边界上的最后一个 sector"
    meta: "〔10-20 03:29〕· [PATCH] dm: fix infinite loop in dm_blk_do_report_zones()（Ming Lei）"
    points:
      - label: 定位
        text: >-
          <code>dm_blk_do_report_zones()</code> 在遍历 device mapper
          设备的 zone 时可能不前进，形成无限循环。
      - label: 做法
        text: >-
          修正循环推进条件，保证每次 report 至少跨过一个 zone 边界，
          不再重复处理同一个 sector。
      - label: 效益
        text: >-
          zone 设备上的 report zones 不再卡死。对使用 dm 叠加 zoned
          块设备的存储栈，这是会直接挂住 ioctl 的故障。
    relevance: "zoned 存储把「顺序写」变成硬约束。report zones 是用户态发现 zone 布局的入口，循环不前进就是工具挂死。"
    link: "https://lore.kernel.org/linux-block/<20261019192819.3962873-1-mkbund@amazon.com>/"

  - type: divider
    label: "📰 sched / RT 调度"
    kind: section
  - type: highlight
    title: "Qualcomm SAW 的 IPI 路径不能再拿睡眠锁"
    meta: "〔10-19 22:39〕· [PATCH 0/3] soc: qcom: several fixes for SAW handling（Konrad Dybcio）"
    points:
      - label: 定位
        text: >-
          SAW（SPM）是 Qualcomm 的电源/频率控制块，regulator 通过 IPI
          访问它。PREEMPT_RT 下，这条路径里出现睡眠锁会破坏实时语义；
          另外 SDM660 silver L2 的 AVS 控制值不对，SAW control 寄存器
          也会被覆盖。
      - label: 做法
        text: >-
          3 个补丁：修正 SDM660 silver L2 的 AVS 控制值；不再覆盖 SAW
          control 寄存器；regulator 的 SAW IPI 路径不再取睡眠锁。
      - label: 效益
        text: >-
          SAW 访问在 RT 内核上不再触发 sleeping-in-atomic 类问题，
          同时修正了 SDM660 的电压/频率控制值。
    relevance: "CPU 调频与 regulator 的 IPI 路径同时受 RT 与电源管理约束，是典型的「两个子系统各自正确、合起来出错」的位置。"
    link: "https://lore.kernel.org/linux-rt-devel/<20261019-fix-qcom-saw-v1-0-9c7ba3fc2493@oss.qualcomm.com>/"

  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: 合并窗口
        text: >-
          v7.3 已由 Linus 打上 final tag，net-next 关闭；新 net-next 提交要等
          合并窗口结束。这一轮合并窗口计划 3 周，net-next 11 月 9 日重开 ·
          <a href="https://lore.kernel.org/netdev/<7a0446eb-8539-4300-ae0b-a3d66a692cbc@redhat.com>/">原文</a>
      - label: PCI Live Update
        text: >-
          保留设备跨 kexec 继续 DMA 还不够：下一内核枚举时会 sizing/probe/重排
          BAR 与 bridge window，可能关掉解码或移走地址。系列改为传递 BAR mask
          与 probe 结果，并在扫描时 claim 保留资源 ·
          <a href="https://lore.kernel.org/linux-mm/<20261019213054.3157159-1-dmatlack@google.com>/">原文</a>
      - label: Nova uAPI
        text: >-
          nova 把不稳定 uAPI 拆到 <code>nova_drm_unstable.h</code>，要求用户
          显式确认才启用，并 taint 内核；稳定后再移回 <code>nova_drm.h</code> ·
          <a href="https://lore.kernel.org/dri-devel/<20261019212535.88390-1-dakr@kernel.org>/">原文</a>
      - label: MPAM 域拆分
        text: >-
          MPAM 原来用一个结构同时装 control 与 monitoring domain，强制两者
          同 scope；RFC 把两类域拆开、随 CPU online/offline 独立建拆，
          为「每资源多控制」铺路 ·
          <a href="https://lore.kernel.org/lkml/<cover.1792443633.git.reinette.chatre@intel.com>/">原文</a>
      - label: eventpoll 并行化
        text: >-
          嵌套 epoll 加叶子原来要拿全局 epnested_mutex；RFC 用共享 rwsem
          冻结拓扑、per-file 哈希 mutex 做检查，ARM64 上 nested pairs/s
          从 1.56M 升到 5.33M（+242%） ·
          <a href="https://lore.kernel.org/linux-fsdevel/<cover.1792432666.git.bobby.prani@gmail.com>/">原文</a>

  - type: more
    title: "更多网络与驱动动态"
    items:
      - link: "https://lore.kernel.org/netdev/<20261019153628.15912-1-leon.hwang@linux.dev>/"
        text: "[PATCH bpf-next v2 0/6] bpf: Add syscall common attrs support for xdp link_create"
        time: "10-19 23:36"
      - link: "https://lore.kernel.org/netdev/<20261019-nb-otx2-xfrm-unshare-net-v1-1-ee9b24f9e673@tipi-net.de>/"
        text: "[PATCH net] octeontx2-pf: fix skb use-after-free with ipsec crypto offload"
        time: "10-19 23:04"
      - link: "https://lore.kernel.org/netdev/<20261019105155.3793063-1-aaron.ma@canonical.com>/"
        text: "[PATCH 0/5] ice: fix reset and suspend paths"
        time: "10-19 18:52"
      - link: "https://lore.kernel.org/netdev/<20261019162453.1244120-1-piotr@kubik.pl>/"
        text: "[PATCH net 0/2] net: pse-pd: si3474: two driver fixes"
        time: "10-20 00:26"
      - link: "https://lore.kernel.org/netdev/<20261019222626.745408-1-rjethwani@purestorage.com>/"
        text: "[PATCH net] tls: check the right open record in TLS_TX_MAX_PAYLOAD_LEN"
        time: "10-20 06:26"
      - link: "https://lore.kernel.org/netdev/<QDISC-BA27.v7.r0.20261019115505@mojatatu.com>/"
        text: "[PATCH net-next v7 0/4] net/sched: cap the accounted backlog before it can wrap"
        time: "10-20 00:00"
      - link: "https://lore.kernel.org/netdev/<20261019193148.1381545-1-prashantsengar25031@gmail.com>/"
        text: "[PATCH net v2] net: usb: lan78xx: avoid NULL PHY dereference in WoL setup"
        time: "10-20 03:36"
      - link: "https://lore.kernel.org/netdev/<20261019145505.176036-1-ngocthang2710.1999@gmail.com>/"
        text: "[PATCH] nfc: pn533: bound the OUT URB wait in pn533_usb_send_frame()"
        time: "10-19 22:55"

  - type: more
    title: "更多跨域动态"
    items:
      - link: "https://lore.kernel.org/rust-for-linux/<cover.1792417858.git.nico.antinori.7@gmail.com>/"
        text: "[PATCH 0/2] rust: remove TryFrom<&Device> implementation for pci and platform"
        time: "10-20 00:13"
      - link: "https://lore.kernel.org/rust-for-linux/<20261019151243.1595858-1-gprocida@google.com>/"
        text: "[PATCH] rust: exports: emit ___EXPORT_SYMBOL without C declarations"
        time: "10-19 23:13"
      - link: "https://lore.kernel.org/linux-security-module/<20261019181732.449591-1-jarkko@kernel.org>/"
        text: "[PATCH v2 0/6] KEYS: rhashtable bug fixes"
        time: "10-20 02:17"
      - link: "https://lore.kernel.org/linux-security-module/<20261019-b4-ipe-keyring-rfc-v1-0-156f0b93e843@nvidia.com>/"
        text: "[PATCH RFC 0/4] IPE: add a dedicated policy keyring"
        time: "10-20 05:40"
      - link: "https://lore.kernel.org/dri-devel/<20261019102824.3157044-1-damon.ding@rock-chips.com>/"
        text: "[PATCH v2 0/6] Add eDP support for RK3568"
        time: "10-19 18:29"
      - link: "https://lore.kernel.org/linux-mm/<20261019054531.87652-1-hao.ge@linux.dev>/"
        text: "[PATCH v2 0/5] mm/vmalloc: make the mapping functions undo their partial mappings"
        time: "10-19 13:44"
      - link: "https://lore.kernel.org/lkml/<20261019213221.2919481-1-tj@kernel.org>/"
        text: "[PATCHSET sched_ext/for-7.5] sched_ext: scx_qmap: fix a lowpri starvation"
        time: "10-20 05:32"
      - link: "https://lore.kernel.org/linux-media/<20261019162722.25587-1-lsa.uz@pm.me>/"
        text: "[PATCH 0/4] media: Add the ST VD55G0 global shutter sensor"
        time: "10-20 00:27"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: PG_rcu_free
        text: 页缓存 folio 的延迟释放标记；带标记的 folio 只在 RCU grace period 后才真正释放。
      - label: RS(255,239)
        text: Reed-Solomon 纠错码；255 个符号里 239 个数据、16 个校验，beamfs 用它从单设备读里纠正坏字节。
      - label: clone3(CLONE_EMBRYO)
        text: cells 提案里的新克隆方式；返回一个已存在但从未运行过的任务的 pidfd，配置后再 start。
      - label: Live Update
        text: kexec 进入新内核时保留设备状态；本期的 PCI 系列保证保留设备的 BAR 与 bridge window 不被动。
      - label: P2PDMA
        text: 两个 PCI 设备之间直接做 DMA，不经过系统内存；保留设备跨 Live Update 时要保持这条路径。
      - label: HPD
        text: 显示接口的热插拔检测；DP/eDP 上它是一条中断，不是简单的 GPIO 电平。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
