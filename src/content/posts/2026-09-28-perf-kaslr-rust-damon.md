---
title: "perf 把内核基址泄露给了无特权用户；Rust 第一次伸进 mm 的 DAMON"
date: "2026-09-28"
desc: "一个无特权用户能经 perf tracepoint filter 读出 KASLR slide，附可跑的 PoC；Rust 给 DAMON 写抽象，却撞上「没有 sysfs」这道硬墙。"
column: "daily"
tags: ["mm", "DRM", "PCI", "net", "fs", "Rust", "LSM", "block", "arch"]
blocks:
  - type: hook
    text: >-
      今天最该看的一条是<strong>安全问题</strong>：有人发现无特权用户能通过 perf 的 tracepoint filter
      把内核的 KASLR slide 读出来，附了能跑的 PoC；另一条，<strong>Rust 第一次伸进 mm 子系统</strong>——
      给 DAMON 写了一套抽象，结果撞上「Rust 还没有 sysfs 封装」这道硬墙。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-28/cover.png"
    alt: "封面 · 9月28日 · perf 泄露内核基址"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "perf tracepoint filter 泄露内核文本基址：无特权用户即可复原 KASLR slide（含 PoC）"
      - label: "头条"
        text: "Rust 给 DAMON 写抽象：能跑，但控制接口被迫从 module param 改成 debugfs"
      - label: "DRM"
        text: "nova-core 命令队列重构到 v2；Solomon SSD16xx 电子纸驱动 14 帖；it6505 DP 音频到 v8"
      - label: "mm"
        text: "device DAX 转 section-based vmemmap 到 v5；热页跟踪 v8 讨论激烈"
      - label: "PCI"
        text: "给「无 AER 能力设备」补错误上报：7 帖重构 PCIe 错误路径"
      - label: "net"
        text: "ARM64 融合的 copy+校验和；网络设备释放托管 IRQ 的时机修正"
      - label: "fs"
        text: "io_uring 想要 copy_file_range；errseq 会吞掉后续写回错误"
      - label: "机制"
        text: "x86 AES 旧实现整体删除（20 帖）；sparc32 用 memblock 替换 sp_banks"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-28/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-28 06:23 北京，近 24h 各板块真实计数：net 411 · DRM 118 · mm 80 · PCI 66 ·
      Rust 51 · media 33 · fs 25 · block 13 · LSM 8 · arch 2 · rt 1 · virtio 0。
      net 的量依旧最大，但今天最重的两条都不在量最大的板块——一条在 lkml（安全），一条在 mm（Rust 进新子系统）。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "perf 的 tracepoint filter 把内核基址漏给了无特权用户"
    meta: "〔09-28 08:00 北京〕· [PATCH 0/1] perf tracepoint filter exposes the kernel text base（Zhengchuan Liang）"
    points:
      - label: 现状
        text: >-
          KASLR 的整套安全性建立在「攻击者不知道内核被加载到哪」之上。内核文本基址（_stext）一旦泄露，
          面向内核的漏洞利用（ROP 链、覆盖函数指针）就有了落点——所以任何能把 _stext 读出来的路径都算信息泄露。
      - label: 痛点
        text: >-
          作者发现 <code>kernel/trace/trace_events_filter.c</code> 有一条路径没设防：
          一个<strong>禁用的、只计数的</strong> perf tracepoint 事件（<code>exclude_kernel=1</code>、
          <code>sample_type=0</code>）本不该碰内核，但 <code>PERF_EVENT_IOC_SET_FILTER</code>
          依然接受 <code>.function</code> 谓词。数值操作数会被送进 <code>kallsyms_lookup_size_offset()</code>，
          于是「调用成功还是失败」本身就区分了「这个地址在不在内核镜像里」。
      - label: 方案
        text: >-
          修复给过滤器的解析上下文加了一个 <code>from_perf</code> 标志：当 <code>function</code> 谓词来自 perf 时，
          先走 <code>perf_allow_tracepoint()</code> 做权限检查。改动落在
          <code>trace_events_filter.c</code>，+29/-10。
      - label: 为什么
        text: >-
          攻击门槛极低：<strong>无需 tracefs 访问、无需任何 perf 采样数据</strong>，只要按 2 MiB 步长
          扫一遍 1 GiB 的虚拟 KASLR 窗口（2 MiB 是 x86_64 上 <code>CONFIG_PHYSICAL_ALIGN</code> 允许的最小值），
          看哪次 ioctl 返回成功即可。上游默认 <code>perf_event_paranoid=2</code> 下就能复现。
      - label: 效益
        text: >-
          作者在「当前上游树构建的内核」上以无特权身份复现，读出的 _stext 与 root 读
          <code>/proc/kallsyms</code> 得到的值一致。修复后这条路径要过权限检查，泄露面收窄。
      - label: 下一步
        text: >-
          这是一帖的独立修复，形态干净。值得留意的是评审会怎么定 <code>perf_allow_tracepoint()</code>
          的语义边界——放行过宽会留下别的旁路，过严又可能挡住合法用法。
    verdict: 典型的「功能开关设了、但旁路没关」。修复本身很小，暴露的却是 trace 与 perf 交界处长期没被审视的权限面。
    link: "https://lore.kernel.org/lkml/<cover.1790553331.git.zcliangcn@gmail.com>/"
  - type: headline
    title: "Rust 第一次伸进 mm：DAMON 有了抽象层，却撞上「Rust 还没有 sysfs」"
    meta: "〔09-27 15:28 北京〕· [RFC PATCH 0/4] rust: damon: a first small step, plus a Rust prcl sample（Enze Li）"
    points:
      - label: 现状
        text: >-
          DAMON 是内核的数据访问监控框架，<code>samples/damon/prcl.c</code> 是它的主动回收示例：
          盯住一个进程的虚拟地址空间，把冷区按 DAMOS_PAGEOUT 换出去。
      - label: 方案
        text: >-
          4 帖，刻意做小：① 为 <code>include/linux/damon.h</code> 生成 Rust 绑定；
          ② 在新的 <code>rust::kernel::damon</code> 里加一层薄安全封装（context / target / access pattern /
          quota / watermark / scheme，以及 start/stop），FFI 全部关在封装里、错误码走
          <code>kernel::Result</code>；③ 把 prcl.c 移植成 <code>samples/damon/rust_prcl.rs</code>；
          ④ 补 MAINTAINERS。
      - label: 为什么
        text: >-
          <strong>最有价值的不是「跑通了」，而是它撞上的那道墙</strong>：C 版 prcl 用运行时可写的
          module param（<code>target_pid</code>、<code>enabled</code>）做控制接口，而
          <strong>Rust 的 module param 目前只能在加载时设、不出现在 <code>/sys/module/</code> 下</strong>，
          且 mainline 与 rust-next 都还没有通用的 sysfs 封装。作者只好改用 debugfs
          （<code>/sys/kernel/debug/rust_prcl/</code>）。
      - label: 取舍
        text: >-
          作者把这件事说得很清楚：<b>This is a temporary detour, not a design preference</b>——
          等 Rust 支持 sysfs 支撑的 module param，示例会切回与 C 一致的接口。
          功能上也有缩水：C 版还会经 <code>damon_call()</code> 回调反复上报工作集大小（wss），
          这版只覆盖监控/回收主路径。
      - label: 下一步
        text: >-
          DAMON 维护者 SeongJae Park 当天已在列表回复。作者说这个念头起于近一年前——
          当时他问「DAMON 的部分模块用 Rust 写值不值得探索」，SJ 的回答是开放态度。
    verdict: >-
      Rust 进一个新子系统时，最先暴露的往往不是语言能力，而是基础设施缺哪一块。
      这次缺的是 sysfs 封装——比任何 benchmark 都更清楚地标出了 Rust for Linux 当前的位置。
    link: "https://lore.kernel.org/linux-mm/<20260927072812.2393456-1-lienze@kylinos.cn>/"
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "nova-core 命令队列重构到 v2：为 r000 双消息类型铺路"
    meta: "〔09-27 21:46 北京〕· [PATCH v2 0/9] gpu: nova-core: gsp: prepare the command queue for r000 dual-message types"
    points:
      - label: 定位
        text: >-
          nova 是 NVIDIA GPU 的 Rust 开源驱动。GSP 是 GPU 上的固件处理器，
          命令队列是内核侧与它对话的通道。
      - label: 做法
        text: >-
          先发 v1（10 帖）、当天再发 v2（9 帖），净减一帖——重构过程中收敛掉了冗余。
          目标是把命令队列改造成能承载 r000 代际的<strong>双消息类型</strong>。
      - label: 效益或下一步
        text: >-
          一天内 v1→v2 说明评审反馈在快速消化。Rust 写 GPU 驱动的这条线本周多条并行推进
          （另有 GSP 日志留存、falcon 寄存器抽取），节奏值得持续跟。
    relevance: >-
      Rust 驱动的抽象边界（固件接口、寄存器访问、队列生命周期）做法对任何驱动都有参照价值。
    link: "https://lore.kernel.org/dri-devel/<20260927-cmdq-rpc-v2-0-c3f66ae73be4@nvidia.com>/"
  - type: highlight
    title: "Solomon SSD16xx 电子纸显示控制器：14 帖的完整新驱动"
    meta: "〔09-28 02:24 北京〕· [PATCH v2 00/14] Add DRM driver for Solomon SSD16xx e-paper display controllers"
    points:
      - label: 定位
        text: >-
          DRM 显示驱动的完整新提交：dt-bindings + 驱动本体，14 帖。
          电子纸（e-paper）的刷新语义与常规显示不同——局部刷新、全屏刷新、部分模式各有代价。
      - label: 效益或下一步
        text: >-
          到 v2 说明首轮评审意见已消化。新驱动进主线通常要过 bindings 合规、电源管理、
          以及「刷新模式怎么暴露给用户态」这几关。
    link: "https://lore.kernel.org/dri-devel/<20260927182329.4193961-1-devarsht@ti.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<cover.1790552614.git.daniel@makrotopia.org>/"
        text: "it6505 桥接芯片 DP 音频 + shared-DAI 修复到 v8（14 帖）"
        time: 09-27 23:49
      - link: "https://lore.kernel.org/dri-devel/<20260927-pvr-fixes-a-v1-1-7f5b18ab989a@gmail.com>/"
        text: "drm/imagination：修一批被 Sashiko 评审标出的既有 bug"
        time: 09-27 16:27
      - link: "https://lore.kernel.org/dri-devel/<DS6PR02MB049014D5E90D07BE9D4B7C40E1D38E2@DS6PR02MB049014.namprd02.prod.outlook.com>/"
        text: "Synx 全局同步框架讨论继续：与 dma-fence 的关系是焦点"
        time: 09-28 01:19
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "device DAX 转向 section-based vmemmap 优化，到 v5"
    meta: "〔09-27 10:54 北京〕· [PATCH v5 00/12] mm: Switch device DAX to section-based vmemmap optimization"
    points:
      - label: 定位
        text: >-
          vmemmap 是「物理页 → struct page」的映射。device DAX（持久内存直通）过去需要为整段
          设备内存保留 struct page，即便大部分从未被用到。
      - label: 做法
        text: >-
          v5 改走 section-based 的 vmemmap 优化——只为真正存在的 section 建映射，
          而不是给整块设备预留。
      - label: 效益
        text: >-
          大容量持久内存设备的内存开销显著下降。v5 阶段，评审集中在 section 边界与
          与 memory hotplug 的交互上。
    relevance: 内存开销换映射粒度，是「按需建页表」思路在 vmemmap 上的又一次落地。
    link: "https://lore.kernel.org/linux-mm/<20260927025441.741633-1-songmuchun@bytedance.com>/"
  - type: highlight
    title: "热页跟踪与晋升 v8：pghot 仍在密集讨论"
    meta: "〔09-28 07:26 北京〕· [PATCH v8 0/8] mm: Hot page tracking and promotion infrastructure"
    points:
      - label: 定位
        text: >-
          追踪哪些页是「热的」，把它们晋升到更合适的层级（更快的 NUMA 节点、或更高带宽的内存）。
      - label: 做法
        text: >-
          v8 的 pghot 机制负责热页统计与晋升决策。当天多轮回复（含 AMD 侧意见）集中在
          采样精度与晋升阈值上。
      - label: 效益或下一步
        text: >-
          内存分层（memory tiering）方向的基础设施。讨论密度说明形态尚未定，值得跟。
    link: "https://lore.kernel.org/linux-mm/<20260927232552.u6iypdeadjf4nyla@offworld>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-mm/<20260927130530.60524-1-sj@kernel.org>/"
        text: "mm/damon：quota goal 目标度量补集标志（RFC v4，7 帖）"
        time: 09-27 21:05
      - link: "https://lore.kernel.org/linux-mm/<20260927150257.c9558f807114f2ce9c6675e0@linux-foundation.org>/"
        text: "hibernation：让 safe_copy_page 更健壮，并移除 debug_pagealloc 支持（v2，5 帖）"
        time: 09-27 23:02
      - link: "https://lore.kernel.org/linux-mm/<20260927-tools-mm-update-slabinfo-v1-0-a4ea0d4dc136@snu.ac.kr>/"
        text: "tools/mm/slabinfo：上报 sheaf 与 barn 统计"
        time: 09-27 13:57
  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "给「没有 AER 能力的设备」补上错误上报"
    meta: "〔09-28 02:02 北京〕· [PATCH 0/7] Error reporting for AER-incapable devices（Lukas Wunner）"
    points:
      - label: 定位
        text: >-
          AER（Advanced Error Reporting）是 PCIe 的高级错误上报能力，但不是所有设备都实现它。
          PCIe 规范对「无 AER 设备」仍定义了错误上报路径，只是内核侧一直没走通。
      - label: 做法
        text: >-
          7 帖重构 PCIe 错误路径：其中一帖明确是「恢复对无 AER 端口的支持」
          （<code>PCI/DPC: Reinstate support for AER-incapable ports</code>）——
          说明这条路径曾经有、后来在重构中丢了。
      - label: 效益
        text: >-
          板载/低端 PCIe 设备出错时不再无声无息。作者 Lukas Wunner 是 PCI 热插拔与
          runtime PM 方向的长期贡献者，这类「补齐规范里定义过、内核里缺失」的工作是他的典型风格。
    relevance: 你在 RK3588 上挂 PCIe 设备时，若对端不实现 AER，错误就只能靠这条路径暴露。
    link: "https://lore.kernel.org/linux-pci/<cover.1790531238.git.lukas@wunner.de>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<179053848466.2777566.15245149270723962711.pr-tracker-bot@kernel.org>/"
        text: "PCI fixes for v7.3 的 pull request 进入讨论"
        time: 09-28 03:48
      - link: "https://lore.kernel.org/linux-pci/<179049319618.587386.17801056230411978179.b4-ty@kernel.org>/"
        text: "AMD IOMMU 64 位寻址下的存储损坏修复被合入（subset）"
        time: 09-27 15:16
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/netdev/<20260927184414.6c0c8867@pumpkin>/"
        text: "arm64：新增融合的 copy + 网络校验和实现——一次遍历同时完成拷贝与 checksum"
        time: 09-28 02:44
      - link: "https://lore.kernel.org/netdev/<20260927153020.5311dba6@kernel.org>/"
        text: "网络设备释放托管 IRQ 的时机修正：应在 netdev 释放之前（v2，7 帖）"
        time: 09-27 23:30
      - link: "https://lore.kernel.org/netdev/<86e368cd-9f5a-49cb-a798-0f26a661fc30@gmail.com>/"
        text: "通用 PON 框架 RFC 讨论继续：无源光网络想进内核"
        time: 09-27 22:30
      - link: "https://lore.kernel.org/netdev/<14a281e2-c88e-42e3-acd3-b20f111a4c28@lunn.ch>/"
        text: "ftgmac100：新增 AST2700 支持（5 帖）"
        time: 09-27 17:39
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-fsdevel/<20260927-cfr-rfc-v1-0-5b9ddbe0490f@gmail.com>/"
        text: "io_uring 想要 copy_file_range：新增 IORING_OP_COPY_FILE_RANGE（RFC）"
        time: 09-27 17:48
      - link: "https://lore.kernel.org/linux-fsdevel/<0c8ff34adf831b7926468c83a2df8c67062ed3bc.camel@kernel.org>/"
        text: "errseq 会掩盖后续写回错误：两个补丁修 errseq_check_and_advance，并补并发自测"
        time: 09-27 23:48
      - link: "https://lore.kernel.org/linux-fsdevel/<6ab97ce4.a24da115.4bfe6.0f74@mx.google.com>/"
        text: "ntfs3：修目录权限与符号链接一致性（2 帖）"
        time: 09-28 04:30
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/rust-for-linux/<20260927104528.103881-1-mohamed.osama189110@gmail.com>/"
        text: "rust: DropGuard 到 v4：把「析构时执行动作」抽象成类型，已在锁、block、serdev 上试点"
        time: 09-27 18:45
      - link: "https://lore.kernel.org/rust-for-linux/<20260927125622.676342-1-sagartaunk@proton.me>/"
        text: "rust_binder：新增事务缓冲区 tracepoints（4 帖）"
        time: 09-27 20:56
      - link: "https://lore.kernel.org/rust-for-linux/<tencent_3BE378F939A2D19F002A693282ABDDE7AA05@qq.com>/"
        text: "rust: configfs 要求回调数据线程安全（v2）"
        time: 09-27 22:18
      - link: "https://lore.kernel.org/rust-for-linux/<20260927181154.1757237-1-lnsdev@proton.me>/"
        text: "rust: io：ResourceSize 改为 transparent newtype（v4）"
        time: 09-28 02:11
  - type: divider
    label: "📰 LSM / block / arch / rt / virtio"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-security-module/<20260927162528.943886-1-nicoyip.dev@gmail.com>/"
        text: "keys：修 ownership 变更期间的 key_user 生命周期与计费竞态（v3，2 帖）"
        time: 09-28 00:25
      - link: "https://lore.kernel.org/linux-block/<CAKjZdKgwt=o-UyRM4QQ60Fba1WSVTv0YE7OQiRf5ybzzOBQXYw@mail.gmail.com>/"
        text: "dm-crypt 拆卸路径的 mempool_free_bulk 空指针解引用（6.8 → 7.0 回归）"
        time: 09-27 16:56
      - link: "https://lore.kernel.org/linux-block/<20260927051528.34698-1-ngocthang2710.1999@gmail.com>/"
        text: "block：让 blkdev_fallocate() 的 zeroout 可被信号打断"
        time: 09-27 13:15
      - link: "https://lore.kernel.org/linux-arch/<20260927161227.1179863-1-sashal@kernel.org>/"
        text: "kbuild：vmlinux 用 --gc-sections 链接时保留 .modinfo"
        time: 09-28 00:12
      - link: "https://lore.kernel.org/virtio-dev/<20260925140133.1214443-1-linlin.zhang@oss.qualcomm.com>/"
        text: "virtio-blk 内联加密到 v4：新增控制 virtqueue"
        time: 09-25 22:01
  - type: divider
    label: "📌 机制雷达：3 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "x86 AES 旧实现整体删除"
        text: >-
          Eric Biggers 的 v2 共 20 帖，把 x86 上被取代的 AES skcipher 实现（ECB/CBC/CTR/XTS）
          逐个删掉（<code>Remove superseded ... skcipher</code>）——新版走 AES-NI/VAES 路径，
          旧的手写实现已成维护负担。
          <a href="https://lore.kernel.org/lkml/<20260927224418.109759-13-ebiggers@kernel.org>/">原文</a>
      - label: "sparc32 用 memblock 替掉 sp_banks"
        text: >-
          v4 共 6 帖：老架构的内存描述从自研的 <code>sp_banks</code> 数组切到通用 memblock。
          让 sparc32 跟上其余架构的引导期内存模型。
          <a href="https://lore.kernel.org/lkml/<20260927214334.886582-1-linmag7@gmail.com>/">原文</a>
      - label: "perf/trace 权限面收紧"
        text: >-
          头条那条 KASLR 泄露的修复本身也是机制级——它在 filter 解析层引入了
          <code>from_perf</code> 概念，把「这条过滤表达式从哪来」变成权限判定的依据。
          <a href="https://lore.kernel.org/lkml/<cover.1790553331.git.zcliangcn@gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "KASLR slide"
        text: >-
          内核地址空间布局随机化：内核每次启动被加载到不同的虚拟基址，偏移量即 slide。
          slide 一旦泄露，面向内核的攻击就能算出 _stext 等符号的实际地址。
      - label: "AER（Advanced Error Reporting）"
        text: >-
          PCIe 的高级错误上报能力。实现它的设备可以上报可纠正/不可纠正错误并触发恢复；
          不实现的设备仍应按规范走另一条错误路径——本期 PCI 系列补的就是这条。
      - label: "vmemmap"
        text: >-
          内核为每个物理页维护的 <code>struct page</code> 数组所映射的虚拟内存区。
          device DAX 场景下为整段设备内存预留 struct page 代价很大，
          section-based 优化改为按需建映射。
      - label: "模块参数（module parameter）"
        text: >-
          驱动暴露给用户的运行时开关，C 侧可写 <code>module_param_cb</code> 让参数在
          <code>/sys/module/&lt;mod&gt;/parameters/</code> 下可读可写。
          Rust 侧目前只支持加载时设定，这是本期 Rust DAMON 改用 debugfs 的直接原因。
      - label: "PON（Passive Optical Network）"
        text: >-
          无源光网络，光纤接入的主流形态（GPON/EPON 等）。内核长期没有通用框架，
          驱动各写各的；RFC 想把它抽象出来。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
