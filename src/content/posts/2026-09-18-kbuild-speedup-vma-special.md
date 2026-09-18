---
title: "内核构建提速 36%：20 帖拆掉编译瓶颈，Linus 当场揪出一个被 LLM 弄错的数字"
date: "2026-09-18"
desc: "20 帖让内核构建最快提速 36%，Linus 亲自追问基准数字；40 帖让 VM_SPECIAL 退场，已进 mm-unstable。"
column: "daily"
tags: ["mm", "net", "media", "DRM", "fs", "driver-core"]
blocks:
  - type: hook
    text: >-
      今天两个最大的系列出自同一人之手：<strong>20 帖把内核构建提速最多 36%</strong>（Linus 亲自在列表上追问基准数字），
      <strong>40 帖让 VM_SPECIAL 退出历史舞台</strong>（akpm 当天就收进 mm-unstable）。
      两套都带 <code>Assisted-by</code> —— LLM 写、人审、人在列表上被追问。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-18/cover.png"
    alt: "封面 · 9月18日 · 内核构建提速 36%"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "内核构建提速 36%：编译流水线上的单线程瓶颈被一条条拆掉"
      - label: "头条"
        text: "VM_SPECIAL 退场：40 帖让 VMA 标志「说人话」，当天进 mm-unstable"
      - label: "media"
        text: "V4L2 穿过 virtio：客户机里的摄像头驱动发到 v9"
      - label: "media"
        text: "IPU6 为「一个源、多条流」铺路（v2·21 帖）"
      - label: "DRM"
        text: "显存有多少、用了多少？DRM 想给出一套厂商无关的答案（RFC）"
      - label: "mm"
        text: "RK3588 上实测：连续物理内存的 vmap 快 8.3 倍（v8·10 帖）"
      - label: "net"
        text: "TLS 1.3 硬件卸载第 17 版：把 rekey 也交给网卡"
      - label: "fs"
        text: "sparc64 上 pldd 挂掉，牵出两个位置参数的 VFS 老 bug"
      - label: "机制"
        text: "休眠快照加密、设备异步关机、block 新增 post_release()"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-18/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 13 列表"
  - type: paragraph
    text: >-
      数据截至 09-18 06:23 北京，近 24h 各板块真实计数：lkml 1200（全内核广播源，已限流）· net 802 ·
      mm 330 · DRM 312 · media 210 · fs 167 · PCI 115 · arch 102 · Rust 77 · block 43 ·
      rt 24 · LSM 14 · virtio 0（低频列表，本窗口无新帖）。net 里很大一部分是同一批引用计数/资源泄漏修复；
      mm 与 DRM 的高位则来自下面两个大系列。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "内核构建提速 36%：编译流水线上的单线程瓶颈，被一条条拆掉"
    meta: "〔09-18 00:06 北京〕· [PATCH v3 00/20] kbuild: significantly speed up kernel builds（lkml）"
    points:
      - label: 现状
        text: >-
          一次内核构建里，真正吃时间的不是编译那一堆 .c，而是夹在中间的一串单线程环节：kallsyms 压符号表、
          modpost 扫模块、objtool 反汇编校验、模块 finalisation 启动成千上万个微型进程，最后还有 gzip 压缩。
          核再多，这些环节也只跑一个核。
      - label: 痛点
        text: >-
          allmodconfig 全量构建在双路 EPYC（gcc）上要 188 秒，增量 71 秒，啥都不改的空跑也要 30 秒——
          后两者才是每天真正在等的。改一行代码等十几秒，绝大部分时间花在这些固定开销上。
      - label: 方案
        text: >-
          20 帖逐项并行化 + 去重复：kallsyms 不再调 nm，直接读 ELF 符号表并加缓存；modpost 加缓存；
          模块描述符从 C（.mod.c）改成汇编（.mod.S）生成，模块收尾从几万次小进程改成批量分片；
          objtool 用 per-section 索引替掉重定位哈希、按文本规模定哈希表大小、大对象多线程解码；
          kbuild 自己缓存对象状态、依赖时间戳检查加速、编译器和链接器能力只探测一次；
          Rust crate 与 C 代码并行构建；装了 pigz 就默认用它压缩。
      - label: 为什么
        text: >-
          作者刻意避开「改一堆 C 头文件」这类侵入性方案——收益递减还容易炸。选的是「删掉已不需要的工作」
          和「把单线程任务摊开」，所以构建行为与产物都不变：多个架构下 System.map 与原实现逐符号一致。
      - label: 效益
        text: >-
          allmodconfig 全量：EPYC gcc 188.0s → 121.1s（-36%）、Threadripper gcc 344.2s → 278.6s（-19%）；
          增量：Threadripper gcc 40.1s → 15.4s（-62%）；空跑：EPYC gcc 30.6s → 1.5s（-95%）。
          每个内核开发者每天敲的每一次 make 都受益。
      - label: 下一步
        text: >-
          v3 已按 Linus、Kees、Josh、Miguel 等多轮意见改过；原计划默认开启的 rustc 前端多线程那帖被拿掉
          （线程参数名未定），想开的人可以自己 KRUSTFLAGS=-Zthreads=8。
    verdict: >-
      值得记一笔的是插曲：Linus 一眼看出 M2 那行数字不对劲（只快 1%，与其他机器规律不符），作者随后承认
      「LLM 把基准数字弄乱了」，自己重跑后修正为 -9%。LLM 参与内核开发已是既成事实，但数字得人复核。
    link: "https://lore.kernel.org/lkml/20260917-build-speedup-v3-0-9ecf4163ff36@kernel.org/"
  - type: headline
    title: "VM_SPECIAL 退场：40 帖让 VMA 标志「说人话」，akpm 当天收进 mm-unstable"
    meta: "〔09-18 00:23 北京〕· [PATCH v3 00/40] mm: make VMA flag semantics explicit, eliminate VM_SPECIAL（linux-mm）"
    points:
      - label: 现状
        text: >-
          每个 VMA（虚拟内存区域，一段连续的进程地址空间）身上挂着一组标志位，其中 VM_SPECIAL 是个「杂物抽屉」
          宏：VM_IO、VM_PFNMAP、VM_MIXEDMAP、VM_DONTEXPAND、VM_DONTDUMP 被打包在一起。
          它同时混着四种毫不相干的性质——「这块内存是内核/驱动自己管的」、「能不能合并扩展」、
          「mlock 这种迁移会打架的特殊情况」、「别让 GUP 碰它」。
      - label: 痛点
        text: >-
          驱动作者常年被它绕晕：VMA_IO_BIT 名义上表示 IO 内存，但驱动在滥用、mlock 也在滥用，于是没人敢假设
          它真的意味着 IOMMU；hugetlb 想设 DONTEXPAND 又不想被当成 special；THP 还自己另有一套
          vma_is_special_huge()，认为 PFN map / mixed map 是 special 而 DAX 不是。
      - label: 方案
        text: >-
          把「测试某个任意标志位」换成「描述行为的谓词」：vma_is_kernel_owned()、vma_is_fixed_mapping()、
          vma_is_persistent()、vma_can_merge()、vma_can_gup()。同时立下不变量——只有内核自有的映射才允许
          设 VMA_IO_BIT 或清 VMA_MAYWRITE_BIT，每次 mmap/mmap_prepare 钩子返回后校验 VMA 状态，
          违规直接挡下；并顺手要求映射内核内存必须设 VMA_MIXEDMAP_BIT（defio、cmt_speech、uprobes、
          bpf arena 四个漏网之鱼补齐）。
      - label: 为什么
        text: >-
          不继续打补丁而是立不变量 + 每次校验，是因为标志位的语义已经无法靠约定维持了。让非法状态在钩子返回时
          就失败，驱动才不会继续「反正设了也没人管」。
      - label: 效益
        text: >-
          读 mm 的人和写驱动的 vendor 工程师终于能看懂「这里到底在判断什么」；usbmon 与 sg 改用新的
          mmap_prepare 路径（新增「映射不连续内核页」的 mmap action），hfi1 和 ALSA PCM status page
          改成急切映射。
      - label: 下一步
        text: >-
          akpm 已在列表上回复「已把 mm.git 的 mm-unstable 分支更新到这个版本」——进入 linux-next 前的最后一站。
    verdict: >-
      一个存在多年、被公认「一锅粥」的宏，靠立不变量而不是改名来拆解。Sashiko（AI 评审）在 4/40、8/40、17/40
      里挑出的问题都在 v3 里修掉了——和昨天一样，AI 评审已经在 mm 这种核心子系统里日常干活。
    link: "https://lore.kernel.org/linux-mm/20260917-b4-mmap-prepare-vma-flag-sanify-v3-0-4583d8a23bca@kernel.org/"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "V4L2 直接穿过 virtio：客户机里的摄像头，只差 DMABUF 就齐了"
    meta: "〔09-18 01:19〕· [PATCH v9 0/4] media: add virtio-media driver"
    points:
      - label: 定位
        text: >-
          虚拟化层与 media 层的交叉处：客户机想用宿主机的摄像头，传统做法是在 guest 里跑一个真驱动再转发；
          virtio-media 让 guest 内核当「V4L2 中继」，把 ioctl 直接转给宿主机的 virtio 设备。
      - label: 做法
        text: >-
          不走 VB2 等常规 V4L2 框架，复杂度全集中在「零拷贝地拼 virtio 描述符链」上（新增
          scatterlist_builder）；v9 拆成骨架驱动、会话管理、描述符构造、ioctl 与驱动逻辑 4 帖，支持 MMAP 缓冲。
      - label: 效益
        text: >-
          已在 crosvm + Debian 12 客户机里用罗技 C925e 跑通 v4l2-compliance（测试时用补丁把 guest 里的
          驱动名改回真实驱动名，保证与宿主结果可比）；DMABUF 支持仍在路上。
    relevance: "摄像头虚拟化的上游路线——将来要在 guest 里跑 GMSL/CSI 采集链路，这里就是入口。"
    link: "https://lore.kernel.org/linux-media/20260917171921.2810550-1-briandaniels@google.com/"
  - type: highlight
    title: "IPU6 为「一个源、多条流」铺路：21 帖先把地基挖好"
    meta: "〔09-17 19:39〕· [PATCH v2 00/21] IPU6 multi-stream and metadata support preparation"
    points:
      - label: 定位
        text: >-
          Intel IPU6 是笔记本上的 ISP。它目前是「一条流一个上下文」：video 节点与 CSI-2 接收端之间的流状态
          散落各处，多流（比如同时出 RAW 和 metadata）没有地方挂。
      - label: 做法
        text: >-
          把流的状态收进 CSI-2 接收端子设备的上下文：streaming 控制从 video 节点搬到 receiver 驱动、
          流号在 source pad 上恒为 0、所有流都就绪后才真正开流、水位线（watermark）配置直接从 ipdata 取、
          firmware init/cleanup 挪进 runtime PM 回调、并给流指针加锁。
      - label: 效益
        text: >-
          作者（Sakari Ailus）明说这组可以先合——它只是准备，真正的 metadata 支持在后续系列里；
          好处是把「多流」这件事从 firmware 细节里解耦出来。
    relevance: "多流 sensor（RAW + embedded data）在内核里怎么挂到 subdev 上，这是 Intel 给的答案。"
    link: "https://lore.kernel.org/linux-media/20260917113923.59004-1-sakari.ailus@linux.intel.com/"
  - type: highlight
    title: "树莓派老款 ISP 的上游驱动，第 5 版：从下游 6.12 树搬上来"
    meta: "〔09-17 16:25〕· [PATCH v5 00/10] media: Add support for Broadcom/RPi BCM2835 ISP"
    points:
      - label: 定位
        text: >-
          老款树莓派（Pi 4 及更早）的 BCM2835 ISP 一直只有下游驱动，上游缺位；硬件还得绕道 VideoCore VPU，
          通过 VCHIQ/MMAL 接口访问。
      - label: 做法
        text: >-
          相对下游版本做了大改：从自定义 V4L2 control 换成参数缓冲区来配置 ISP；依赖刚去 staging 的
          platform/raspberrypi VCHIQ/MMAL 与 VCSM CMA 共享内存驱动（镜头阴影校正用）。
      - label: 效益
        text: >-
          配套 libcamera 分支可测；v5 主要在清 media-ci（coccinelle、smatch）的告警，并补上对最新
          firmware 的依赖说明。
    relevance: "树莓派相机链路（sensor → CSI-2 → ISP）上游化的最后一环，也是 vendor 驱动上游化的一个样本。"
    link: "https://lore.kernel.org/linux-media/20260917-b4-vchiq-isp-v5-0-2d8870add2c0@ideasonboard.com/"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "显存多大、用了多少？DRM 想给出一套厂商无关的答案"
    meta: "〔09-17 20:04〕· [RFC 0/2] DRM standardized memory stats"
    points:
      - label: 定位
        text: >-
          用户态目前拿不到「这张卡有多少显存、已经用了多少」的标准接口——连装系统时按 VRAM 大小决定 swap
          分区都做不到，各家工具只能各显神通。
      - label: 做法
        text: >-
          在 /sys/class/drm/cardN/ 下开一个 memstat 目录，每个内存区域一个子目录，各带 total_mb / used_mb；
          驱动只要实现一个回调，报告「关心的内存区域清单 + 统计」，区域名直接成为目录名。
      - label: 效益
        text: >-
          amdgpu 已作为示例接上；作者自己也把疑问摆在台面上——dmabuf 的 dmem cgroup 已经能查类似数据，
          再开一套 sysfs 接口是否值得，正在收意见。
    relevance: "用户态工具（安装器、监控面板）需要的正是这种「厂商无关的显存视图」。"
    link: "https://lore.kernel.org/dri-devel/20260917120444.86471-1-tvrtko.ursulin@igalia.com/"
  - type: highlight
    title: "virtio-gpu 让客户机把用户态内存直接递给宿主机，省掉一次拷贝"
    meta: "〔09-17 18:26〕· [PATCH v6 0/4] virtio-gpu: Add userptr support for compute workloads"
    points:
      - label: 定位
        text: >-
          虚拟化 GPU 上跑 ROCm/HIP 计算时，客户机得先把用户缓冲区拷进共享内存，再作为 blob 交给宿主机——
          多一次分配、多一次 memcpy。
      - label: 做法
        text: >-
          客户机内核用 FOLL_LONGTERM pin 住已有的用户态映射，直接当作 CREATE_BLOB 的后备存储；
          USE_USERPTR / USERPTR_RDONLY 是 guest-only 的 ioctl 标志，不进 virtio 线协议（设备侧不需要新 flag）。
      - label: 效益
        text: >-
          ROCm 5.7 / 7.0 平台上 OpenCL CTS 与大部分 HIP catch 测试通过；v6 去掉了线协议那帖，
          并修了 userptr 生命周期、DMA 映射、memlock 记账、对齐检查与 PRIME SG 导出。
    relevance: "GPU 虚拟化里「零拷贝」的通用手法，和 media 侧 DMABUF 的诉求是同一件事。"
    link: "https://lore.kernel.org/dri-devel/20260917102540.1312102-1-honghuan@amd.com/"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "RK3588 上实测：物理连续内存的 ioremap/vmap 最快提速 8.3 倍"
    meta: "〔09-17 13:29〕· [PATCH v8 00/10] mm/vmalloc: Speed up ioremap, vmalloc and vmap with contiguous memory"
    points:
      - label: 定位
        text: >-
          mm/vmalloc 给物理连续的内存建映射时，是一块块走、每次重走一遍页表；大映射因此特别慢。
          更糟的是 vmap 的块映射路径复用了 HugeTLB 的辅助函数，被 CONFIG_HUGETLB_PAGE 卡着——
          关了 HugeTLB 的内核直接享受不到，还让 mm/vmalloc.c 耦合进 HugeTLB 内部。
      - label: 做法
        text: >-
          前 4 帖把 PTE 级块映射从 HugeTLB 解耦（新增 pte_set_huge()/pte_clear_huge()，arm64 与
          powerpc/8xx 先实现）；接着给 arm64 的批量映射一次处理多个 CONT_PTE 块、抽出统一的
          vmap_set_ptes()、让页表走查支持非 PAGE_SHIFT 的位移并消除重复走查；最后给 vmap 补上
          大页映射能力（含非 compound 页的 pfn 对齐校验）。
      - label: 效益
        text: >-
          RK3588（8 核 ARM64）上：ioremap(1MB) 快 1.35×、vmalloc(1MB) 1.42×、vmap(100MB, order-8) 快 8.3×。
          ARM trace（TRBE/SPE）实测 l2d TLB refill 最多降 99.7%——大 AUX 缓冲区的页表压力明显下降。
    relevance: "这组的性能数字就是在 RK3588 上跑出来的，而且直接关系到 ioremap 密集的驱动初始化路径。"
    link: "https://lore.kernel.org/linux-mm/20260917052933.188679-1-jiangwenxiaomi@gmail.com/"
  - type: highlight
    title: "内存出错时的引用计数判断：MF_DELAYED 不该只看 shmem"
    meta: "〔09-18 04:45〕· [PATCH v6 0/5] mm: Fix MF_DELAYED handling on memory failure"
    points:
      - label: 定位
        text: >-
          memory-failure 在决定能不能把出错的页从进程里摘掉之前，要先判断这页是不是被别处多拿了引用计数
          （extra_pins）——拿不准就不敢摘。
      - label: 做法
        text: >-
          原来只有 shmem_mapping 这一种情况被认为「还挂着额外的 pin」，现在把 MF_DELAYED 这个返回值本身
          当作判据：返回 MF_DELAYED 就意味着 filemap 还持有引用，extra_pins 直接置真。
      - label: 效益
        text: >-
          与 me_swapcache_dirty() 里已有的实现对齐，少一处特判；改动只有 2 增 6 删，
          David Hildenbrand 与 Miaohe Lin 已 Ack。
    relevance: "hwpoison 路径上「这页能不能摘」的判断，直接决定进程是活着还是被杀。"
    link: "https://lore.kernel.org/linux-mm/20260917-memory-failure-mf-delayed-fix-v6-0-4b00856b5364@google.com/"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "TLS 1.3 硬件卸载第 17 版：把 rekey 也交给网卡"
    meta: "〔09-18 06:44〕· [PATCH net-next v17 00/15] tls: Add TLS 1.3 hardware offload support"
    points:
      - label: 定位
        text: >-
          kTLS 让网卡直接加解密 TLS 记录，但此前只覆盖 TLS 1.2 那类静态密钥场景。TLS 1.3 会在连接中途
          KeyUpdate（换密钥），硬件路径没有对应处理，所以 1.3 一直只能退回软件。
      - label: 做法
        text: >-
          15 帖把 KeyUpdate 的 TX / RX 两条路径接进 tls_device 层；顺带处理重传队列里已解密 skb 的重新校验、
          新增 skb->decrypt_failed 标志位与 tx/rx tracepoint。mlx5e 先接上，chcr_ktls 和 nfp 则明确拒绝
          TLS 1.3 卸载——避免出现「以为卸载了其实没卸」。
      - label: 效益
        text: >-
          附带一个 selftest 和 175 行文档更新，把 rekey 期间的边界条件写清楚。
    relevance: "内核网络数据面的经典节奏——新协议特性先在软件路径跑通，再一点点挪进硬件。"
    link: "https://lore.kernel.org/netdev/20260917224355.2288021-1-rjethwani@purestorage.com/"
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "sparc64 上 pldd 挂掉，牵出两个位置参数的 VFS 老 bug"
    meta: "〔09-17 23:16〕· [PATCH 0/2] fs: honor FOP_UNSIGNED_OFFSET in llseek and positional I/O"
    points:
      - label: 定位
        text: >-
          FOP_UNSIGNED_OFFSET 表示这个文件的偏移量是无符号的（/proc/PID/mem、/dev/mem、sparc ADI、
          DRM/accel 设备文件）。vfs_llseek()、rw_verify_area() 和 mmap 路径都认这个标志，
          但有两组 syscall 包装层不认。sparc64 上用户态地址映射在 2^63 以上，文件位置最高位是 1，
          于是「认标志」和「不认标志」的路径就打架了。
      - label: 做法
        text: >-
          两处：一、sys_llseek() 把 vfs_llseek() 的负返回值当成错误、截断成 int 返回，却没填 *result；
          二、pread64/pwrite64/preadv/pwritev 在查到文件之前就把负数位置拒了。两帖都只改
          「带该标志 + 位置最高位为 1」这一种情况。
      - label: 效益
        text: >-
          UltraSPARC T4 上实测：pread/preadv/pwrite/pwritev/lseek 在 /proc/PID/mem 的 2^63 以上位置
          返回正确数据，pldd(1) 恢复工作；其他架构、其他文件的行为不变。
    relevance: "典型的「修一个用户态工具的 bug，最后改到内核里」——位置参数是有符号还是无符号，一直是个坑。"
    link: "https://lore.kernel.org/linux-fsdevel/20260917151614.376867-1-stian@itx.no/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/20260917-glymur-v11-0-e0c8bc914742@oss.qualcomm.com/"
        text: "media: iris 编码器加 glymur 平台支持（v11·9 帖），同平台 CAMSS 侧也发到 v3、CSI2 D-PHY 发到 v18"
        time: "09-17 13:01"
      - link: "https://lore.kernel.org/linux-media/20260917-x1e-camss-csi2-phy-dtsi-v7-0-1a63eb35838b@linaro.org/"
        text: "media: x1e/Hamoa 相机 DTSI 第 7 版（12 帖），给 CRD、T14s、Yoga Slim 7x 分别挂上 ov08x40 / ov02c10"
        time: "09-17 21:20"
      - link: "https://lore.kernel.org/linux-media/CAD++jLn4hHrNSerRyb-AP=rDG35v-uStzZDF1RSbT3cAzJggSg@mail.gmail.com/"
        text: "media: mali-c55 的 CCM 参数结构要不要显式补 __pad？Arnd 报的跨架构 padding 问题，Vincenzo 与 Linus Walleij 在掰初始化方式能不能替代"
        time: "09-18 06:15"
      - link: "https://lore.kernel.org/dri-devel/20260917185916.1089621-1-lyude@redhat.com/"
        text: "DRM: nouveau GSP r570 的运行时 PM 流程向 OpenRM 靠拢（v6·5 帖）"
        time: "09-18 03:09"
      - link: "https://lore.kernel.org/linux-mm/20260916224437.1164512-1-joannelkoong@gmail.com/"
        text: "mm: 拆分「欠用」的匿名 mTHP 大页（v2·3 帖），别让没吃满的大页白占内存"
        time: "09-17 06:55"
      - link: "https://lore.kernel.org/linux-arch/20260917-dfustini-atl-sc-cbqri-dt-v8-0-7964e8d73fe8@kernel.org/"
        text: "arch: RISC-V 的 CBQRI 资源控制（resctrl）初版支持发到 v8"
        time: "09-18 00:40"
      - link: "https://lore.kernel.org/rust-for-linux/cover.1789426258.git.pgovind2@uci.edu/"
        text: "Rust: module_param 里 SetOnce<T> 的访问方式可能不正确，单帖修复"
        time: "09-18 01:43"
      - link: "https://lore.kernel.org/linux-pci/20260917071651.14174-1-jtornosm@redhat.com/"
        text: "PCI: Qualcomm 设备的 device-specific reset（v14·2 帖）"
        time: "09-17 15:17"
  - type: divider
    label: "📌 机制雷达：4 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "休眠快照加密"
        text: >-
          lockdown 下禁止休眠，是因为恢复时内核内存来自用户态可以改的镜像。这组（v3·4 帖）在内核里加密并认证快照，
          镜像密钥由 trusted early userspace 提供的种子包裹，TPM policy 与 unseal 仍留在 PM 代码之外。
          <a href="https://lore.kernel.org/linux-mm/cover.1789651581.git.sean@starlabs.systems/">原文</a>
      - label: "设备异步关机"
        text: >-
          默认仍同步关，只有显式启用的设备走异步、且互不相关的设备可并行（v22·9 帖）。某系统关机时间从
          11 分钟降到 55 秒，另一台从 80 秒降到 11 秒。v18 起主要在修 device_add 并发引起的死锁与竞态。
          <a href="https://lore.kernel.org/linux-pci/20260917163744.191748-1-djeffery@redhat.com/">原文</a>
      - label: "block 新增 post_release()"
        text: >-
          v7.1 合并窗口的改动破坏了「lo_release() 返回时没有未完成 I/O」的假设，loop 里触发 NULL 解引用
          （v2·2 帖）。新增的块设备操作让同步清理能在不持 disk->open_mutex 的情况下完成，避开
          drain_workqueue() 的 lockdep 警告。<a href="https://lore.kernel.org/linux-block/cover.1789679858.git.bvanassche@acm.org/">原文</a>
      - label: "FD_PREPARE() 瘦身"
        text: >-
          file 的 cleanup guard 用了一堆不必要的基建（4 帖）：struct 变小、去掉 err 字段、删掉 CLASS_INIT()，
          并用 UNIQUE_ID() 藏起底层变量以防 shadow，覆盖 20 个文件——代码生成结果完全一致，只是更好读。
          <a href="https://lore.kernel.org/linux-fsdevel/20260917-work-file-fd_prepare-v1-0-b87534ca49f3@kernel.org/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "VMA"
        text: "虚拟内存区域，一段连续的进程地址空间及其权限与行为标志。"
      - label: "VM_SPECIAL"
        text: "历史上把 VM_IO / VM_PFNMAP / VM_MIXEDMAP / VM_DONTEXPAND / VM_DONTDUMP 打包在一起的宏，本期被拆成一组谓词。"
      - label: "GUP（get_user_pages）"
        text: "内核把用户页「钉」住并拿到 struct page 的机制；被钉住的页不能随便迁移回收，vma_can_gup() 就是判断某段 VMA 能不能被钉。"
      - label: "kallsyms"
        text: "内核内的符号表，构建时生成，供 /proc/kallsyms 与 oops 解析用；本期它不再依赖 nm 工具。"
      - label: "modpost / objtool"
        text: "构建期两个静态检查器：modpost 检查模块符号与版本，objtool 反汇编并校验栈帧/ORC 信息。"
      - label: "kTLS"
        text: "内核 TLS，把 TLS 记录层的加解密从用户态挪进内核，可进一步卸载到网卡。"
      - label: "virtio / virtqueue"
        text: "半虚拟化设备框架：客户机与宿主机通过 virtqueue（描述符链）通信，本期 media 与 GPU 两条线都在用它。"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
