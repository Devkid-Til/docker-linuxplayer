---
title: "内核给自己上影子栈，dma-buf 也要记 cgroup 账"
date: "2026-10-22"
desc: "Dave Hansen 发 24 补丁 RFC 让内核跑在影子栈上；dma-buf 迎来 memcg 记账 RFC v2。"
column: "daily"
tags: ["arch", "media", "DRM", "mm", "net", "fs", "LSM", "PCI", "block", "Rust"]
blocks:
  - type: hook
    text: >-
      今天两条大改动都指向同一件事：<strong>内核看不见的资源</strong>。
      Dave Hansen 用 24 个补丁让内核自己跑上<strong>影子栈</strong>；
      另一条 RFC 要把手机和车载上那些不记账的 <strong>dma-buf 图形内存</strong>
      拉进 memcg。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-22/cover.png"
    alt: "封面 · 10月22日 · 内核给自己上影子栈"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-22/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-22 06:23 北京，近 24h 各板块真实计数：net 657 · DRM 309 · mm 300 ·
      fs 213 · PCI 148 · media 122 · LSM 103 · arch 98 · block 68 · Rust 57 · rt 18 ·
      virtio 0。net 依然最高，但今天是<strong>安全修复与 skb 清理</strong>的密集日；
      PCI、block、Rust 也在同一天集中出现 7.4 合并窗口的拉取请求。

  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: 头条
        text: 内核第一次给自己也上影子栈（RFC，24 补丁）
      - label: 头条
        text: dma-buf 内存终于要进 memcg 记账
      - label: 采集
        text: Camera & ISP 会议纪要；camss SC7280 接入 streams API
      - label: 显示
        text: xe 把 wedge 设备彻底隔离；amdgpu SVM 改用公共核心
      - label: 内存
        text: 虚拟 swap 空间 v6；zram 拆开读写压缩流
      - label: 网络
        text: TCP 认证绕过两行修复；skb 校验和不再用 0 表示失败
      - label: 机制
        text: UUID 用户 ID 的 RFC 撞上历史教训；KAP 想给任务加「目标」边界

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "内核第一次给自己也上影子栈"
    meta: >-
      〔10-22 03:51 北京〕· [RFC][PATCH 00/24] x86 Kernel Shadow Stacks
      （Dave Hansen）
    points:
      - label: 现状
        text: >-
          影子栈是 CPU 提供的<strong>第二套栈</strong>：只存返回地址，页属性是只读加脏
          （Write=0, Dirty=1），普通写指令碰不到。用户态从 6.6 起就能开启 CET 影子栈，
          但内核自己仍把返回地址放在普通内核栈上。
      - label: 痛点
        text: >-
          内核栈是可写内存。一次栈溢出或任意写就能改掉返回地址，把控制流带到
          攻击者挑好的 gadget。硬件已经把防线做进硅片，Linux 却是少数没用上的系统。
      - label: 方案
        text: >-
          24 个补丁分四段：1 到 7 做与架构无关的基础设施，把影子栈塞进 thread/task
          结构；8 到 16 让内核单线程跑在影子栈上；16 到 19 处理用户态与任务切换；
          20 到 23 处理内核对 RIP 的修改。每个线程的影子栈从 <code>thread_info</code>
          旁切出，借 vmap 栈已有的 4K 别名建立特殊权限映射；异常影子栈复用 CEA
          基础设施；SSP（影子栈指针）按线程保存并随上下文切换。
      - label: 为什么
        text: >-
          作者把 <strong>FRED 定为硬前提</strong>：FRED 是 2026 年 CPU 上简化事件入口的
          新硬件机制，用它能较直接地维护影子栈；走旧 IDT 路径则是「一堆基本修不好的
          问题」。他也不打算兼容没有影子栈的任务——Peter Zijlstra 在回复里直接说，
          那会是一场噩梦。
      - label: 效益
        text: >-
          返回地址与数据栈彻底分开后，ROP 类攻击失去最直接的落点。Dave 的原话是：
          这可能是<strong>硅片里最重要的、Linux 还没用上的内核缓解</strong>。
      - label: 下一步
        text: >-
          这是 POC，不是可合并系列，作者自己没加 SoB，还列了几处硬伤：init_task
          没有影子栈；上下文切换汇编绕过了架构预期的 RSTORSSP/SAVEPREVSSP 序列；
          影子栈的直接映射别名没有撤掉，攻击者仍可绕过 WRSS 写它；eBPF 等
          「不兼容清单」还没清完。目前已在 Panther Lake 的 FRED 实机和 QEMU 上
          跑到用户态。
    verdict: "它最大的价值不是代码，而是把「内核要不要上影子栈」从设想变成了可以指着 diff 争论的问题。"
    link: "https://lore.kernel.org/lkml/<20261021195120.E61EC737@davehans-spike.ostc.intel.com>/"

  - type: headline
    title: "dma-buf 内存终于要进 memcg 记账"
    meta: >-
      〔10-21 23:42 北京〕· [PATCH RFC v2 0/8] memcg: dma-buf cgroup accounting
      and charge transfer（Albert Esteve）
    points:
      - label: 现状
        text: >-
          <code>dma-buf</code> 是 GPU、相机、显示之间共享缓冲区的统一抽象，
          dma-heap 负责分配。这块内存由分配它的进程持有，但默认不计入任何 memcg——
          cgroup 的内存限额对图形缓冲区基本不生效。
      - label: 痛点
        text: >-
          在手机和车机上，SurfaceFlinger 申请、gralloc 分配的缓冲区是内存大头，
          却游走在 cgroup 账本之外。一个受限容器可以持续吃显存和 CMA，
          而 <code>memory.current</code> 看不出来。
      - label: 方案
        text: >-
          v2 不走页级 <code>__GFP_ACCOUNT</code>，而是在 <code>struct dma_buf</code>
          上外挂一个 <code>MEMCG_DMABUF</code> 计数，所有记账收敛到单一路径，
          并把 system heap 的 <code>__GFP_ACCOUNT</code> 去掉以免重复计数。
          <code>DMA_HEAP_IOCTL_ALLOC</code> 新增 <code>charge_fd</code>，
          接受 pidfd 或 cgroupfd 指定目标 cgroup；新 ioctl
          <code>DMA_BUF_IOCTL_XFER_CHARGE</code> 可在分配后转移记账，
          覆盖 SurfaceFlinger 到 gralloc 的双跳分配。另加 LSM/SELinux 钩子。
      - label: 为什么
        text: >-
          页级记账要求每个 exporter 都实现一遍，而且跨 cgroup 转移时拿不到
          backing page，很难做。把计数挂在 dma_buf 上，exporter 只需在申请和释放时
          调一次 helper，转移也不需要碰页。
      - label: 效益
        text: >-
          图形内存第一次能进 cgroup 限额，且对 DRM、V4L2、dma-heap 各类 exporter
          通用；双跳分配器也能把账落到真正消费缓冲区的那一方。
      - label: 下一步
        text: >-
          限制也写得很明白：单 owner 模型，一个 dma_buf 只挂一笔账；只做 memcg，
          CMA 堆还要接 dmem 控制器；把 CMA 内存记到 memcg 等于记「不可回收内存」，
          打满限额时回收路径救不了，后续可能改成 per-heap 回调。
    verdict: "方向是对的，但 CMA 那一条决定了它在车载和嵌入式上还不能直接用——那里的相机与显示缓冲区常常正是从 CMA 来的。"
    link: "https://lore.kernel.org/linux-media/<20261021-v2_20230123_tjmercier_google_com-v2-0-ef6ee2dd8c5c@redhat.com>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "Camera & ISP 面对面会议：V4L2 要能容忍一颗坏 sensor"
    meta: >-
      〔10-22 06:41〕· [ANN] Camera & ISP "unconference" - Meeting minutes
      （Laurent Pinchart 整理）
    points:
      - label: 定位
        text: >-
          这是 LPC 之外单独开的半天会议，参与者来自 NXP、Qualcomm、TI、Sony、
          Collabora、Ideas on Board 等。讨论的是 V4L2 与 media graph 接下来一年的
          架构方向，不是单个驱动。
      - label: 做法
        text: >-
          主要讨论：故障容忍——sensor 驱动即使设备不在也要 probe 成功，media graph
          始终完整，新增 <code>.detect()</code> 通过 V4L2 control 和 uevent 暴露状态；
          RGB IR——用 group ID control 在 <code>VIDIOC_S_EXT_CTRLS</code> 里选流，
          并新增 I2C 时序事件 API；多上下文——NXP neoisp、Qualcomm OPE/IFE 都有需求；
          共享 media graph——进一步重设计，让 V4L2 只对 media device 操作，
          不再把 video device 和 subdev 暴露给用户态。
      - label: 效益
        text: >-
          多 sensor 系统不会再因为一颗 sensor 缺失或损坏导致整条 pipeline 探测失败；
          多流 sensor 有了明确的控制面；user space 的模型也在向「只需认识 media device」
          收敛。
    relevance: "做 camera bring-up 的，这份纪要基本就是明年要适配的 API 方向清单。"
    link: "https://lore.kernel.org/linux-media/<20261021224119.GA383235@killaraus.ideasonboard.com>/"

  - type: highlight
    title: "camss 把 streams 开关提到 SoC 层，顺手启用 SC7280"
    meta: >-
      〔10-21 21:50〕· [PATCH v6 0/4] media: qcom: camss: rebase fixes and
      SC7280 enablement for the streams API（Hitesh Kumar）
    points:
      - label: 定位
        text: >-
          <code>camss</code> 是 Qualcomm 摄像头的 V4L2 驱动。streams API 让一个
          subdev 同时服务多路流，Gjorgji 的 0/8 系列正在打基础；这 4 个补丁是
          叠在上面的适配与修复。
      - label: 做法
        text: >-
          <code>set_fmt</code> 增加了 <code>const struct v4l2_subdev_client_info *</code>
          参数后签名对不上，先修；把 <code>streams_enable</code> 从每个 CSIPHY/CSID
          挪到 per-SoC 的 <code>struct camss_resources</code>，SM8250 从 14 处赋值
          变成 1 处；SC7280 因此只需一行启用；最后修 pad 数量，否则整组补丁一加，
          camss 直接 probe 失败（<code>-EINVAL</code>）。
      - label: 效益
        text: >-
          SC7280 能用上 streams API，per-SoC 差异集中到一处描述符，
          后面新增 SoC 的成本明显下降。
    relevance: "Qualcomm 相机 bring-up 时，subdev 多流模型与 per-SoC 描述符是两条主线，这个系列把两者接在了一起。"
    link: "https://lore.kernel.org/linux-media/<20261021134959.2599575-1-hitesh@ebytelogic.com>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "xe 要把挂死的 GPU 彻底隔离在硬件之外"
    meta: >-
      〔10-21 18:03〕· [RFC v3 00/17] drm/xe: Isolate wedged devices from
      hardware access（Arvind Yadav）
    points:
      - label: 定位
        text: >-
          设备被判定永久挂死（wedge）后，用户态会收到恢复通知，但挂起的 work、
          后台 worker 和已有的 VRAM CPU 映射仍可能继续碰硬件，留下 DMA、中断或
          MMIO 访问。
      - label: 做法
        text: >-
          v3 在 DRM 的 SRCU 域上建统一 device I/O gate：所有硬件使用者进门前检查
          状态、出门后才算访问结束。PCI AER 恢复和永久 wedge 被拆成两种状态——
          AER 是临时 reset，被取消的 GuC 请求返回 <code>-ECANCELED</code>；
          永久 wedge 返回 <code>-ENOTRECOVERABLE</code>，且先发布阻塞状态、
          signal 掉待处理的 GT fence，再排空已有读者。隔离完成后丢 page fault、
          停 SVM 垃圾回收、关显示、停中断、清 PCI bus mastering，并把后续 CPU
          缺页映射到每个 BO 的 dummy page。
    relevance: "GPU 驱动的错误恢复路径一直是最难测的部分；这套「先关门再拆设备」的模型对其它 DRM 驱动也有参照价值。"
    link: "https://lore.kernel.org/dri-devel/<20261021100322.1014449-1-arvind.yadav@intel.com>/"

  - type: highlight
    title: "amdgpu SVM 不再另起炉灶，改用 xe 那套公共核心"
    meta: >-
      〔10-21 10:59〕· [PATCH v10 00/22] drm/amdgpu: AMDGPU SVM support based
      on DRM（Phase 1: single GPU, XNACK on）（Ray Huang）
    points:
      - label: 定位
        text: >-
          SVM（共享虚拟内存）让 CPU 和 GPU 用同一套地址；XNACK 打开时 GPU 缺页会
          重试。amdgpu 目前这套逻辑在 <code>amdkfd/kfd_svm.c</code> 里，是 KFD 私有实现。
      - label: 做法
        text: >-
          v10 的 22 个补丁改为基于公共的 <code>drm_gpusvm</code> 与
          <code>drm_pagemap</code> 核心——也就是 xe 已经在用的那套页迁移基础设施。
          Phase 1 只做单 GPU、XNACK 开启；锁定相关补丁直接建立在 Christian König
          的 amdgpu VM 重构之上，没有那组前置补丁就编不过。
      - label: 效益
        text: >-
          两条 GPU 驱动开始收敛到同一个 SVM/页迁移核心，而不是各自维护一套；
          长期看，HMM 统一内存的修复和优化只需要做一遍。
    relevance: "在 RK3588 这类带 GPU/NPU 共享内存的平台上，SVM 的页迁移路径决定了 CPU 与加速器之间的零拷贝能做到什么程度。"
    link: "https://lore.kernel.org/dri-devel/<20261021025915.2433837-1-ray.huang@amd.com>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "虚拟 swap 空间 v6：让 swap 槽不再等于磁盘槽位"
    meta: >-
      〔10-21 14:03〕· [PATCH v6 00/12] Virtual Swap Space (Swap Table Edition)
      （Nhat Pham）
    points:
      - label: 定位
        text: >-
          现在换出一个匿名页时，页表项里存的是物理 swap 设备上的槽位号，这个槽位
          同时充当 swap cache、cgroup 映射等结构的索引。对纯磁盘 swap 很高效，
          但 zswap、零页、被压缩器拒绝的页也照样占一个物理槽。
      - label: 痛点
        text: >-
          zswap 条目根本不会落盘，却按 swapfile 大小预留空间——Meta 的部署按
          RAM 的 25% 到 50% 配 swapfile，大部分是浪费。没有磁盘的移动设备
          只能另用 zram，两套后端的 writeback、cgroup 记账、THP 支持要各写一遍。
      - label: 做法
        text: >-
          vswap 引入虚拟 swap 空间：swap 条目指向虚拟槽，可以只由内存后端
          （zswap/零页）承载，需要时再回落到物理 swap。v6 增加 cgroup
          <code>memory.stat</code> 的 vswap 槽计数，把 swapfile 上限收到 8TB，
          并把集群描述符的 xarray 换成 vmalloc 稀疏数组的 RFC 作为第 12 个补丁。
      - label: 效益
        text: >-
          没有 swapfile 的设备也能直接用 zswap；磁盘 swap 与内存 swap 后端共用
          同一套记账和回收路径。
    relevance: "嵌入式设备常常完全没有 swap 分区，这套抽象直接影响 zram/zswap 的选型。"
    link: "https://lore.kernel.org/linux-mm/<20261021060323.553433-1-nphamcs@gmail.com>/"

  - type: highlight
    title: "zram 拆开每 CPU 的读流与写流，治优先级反转"
    meta: >-
      〔10-21 10:42〕· [PATCH v6 00/13] zram: redesign zcomp and rework
      backends（Sergey Senozhatsky）
    points:
      - label: 定位
        text: >-
          zram 的压缩（写）和解压（读）此前共用每 CPU 的压缩流。zram 支持抢占后，
          高优先级的读者可能抢占正持有流锁的写者，然后自己又阻塞在同一把锁上。
      - label: 做法
        text: >-
          v6 把压缩流拆成每 CPU 的读流与写流：两条路径本来就不共享缓冲区，
          没有理由互相争锁。无状态后端可直接用共享解压流；zstd、deflate 这类
          有状态后端则借用其它空闲 CPU 的独占解压上下文。
      - label: 效益
        text: >-
          读不再被写挡住，合成测试有可见提升；同时还有每个上下文、每个 CPU
          两位数到三位数 KB 的内存节省。
    relevance: "手机、车机的 zram 配置直接受益，尤其是可抢占内核上做内存压力测试时。"
    link: "https://lore.kernel.org/linux-mm/<20261021024236.1787884-1-senozhatsky@chromium.org>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "TCP 认证绕过：只编译 MD5 时，AO 包被当成合法数据"
    meta: "〔10-22 03:32〕· [PATCH] tcp: fix authentication bypass via unsupported TCP auth options（Jérémy Jean）"
    points:
      - label: 定位
        text: >-
          <code>tcp_inbound_hash()</code> 在 TCP-MD5 或 TCP-AO 任一启用时，
          都会解析两种选项。问题出在「只启用其中一种」的配置里。
      - label: 做法
        text: >-
          只编译 MD5、不编译 AO 时，带 AO 选项的包会走到
          <code>tcp_inbound_ao_hash()</code> 的空实现，而它返回
          <code>SKB_NOT_DROPPED_YET</code>——等于告诉上层「没问题」。于是要求
          MD5 认证的 socket 会接受未认证数据。反过来只编译 AO 时，MD5 包也是同样
          下场。修复只有两行：两个禁用态实现改为返回对应的 drop reason。
      - label: 效益
        text: >-
          关掉一条可被实际利用的认证绕过；带 <code>Fixes:</code> 标签并
          Cc stable，说明旧内核也需要回移植。
    relevance: "任何用 TCP-MD5 做 BGP 或设备间认证的部署，都值得对照自己的内核配置检查一遍。"
    link: "https://lore.kernel.org/netdev/<20261021193151.1819085-2-Jeremy.Jean@oss.cyber.gouv.fr>/"

  - type: highlight
    title: "skb 校验和不能再拿 0 当失败"
    meta: >-
      〔10-21 21:47〕· [PATCH net-next v2 00/15] net: skbuff: follow-ups to
      the BUG_ON() removal（Kuniyuki Iwashima）
    points:
      - label: 定位
        text: >-
          BUG_ON 清理落地后，<code>skb_checksum()</code> 与
          <code>skb_crc32c()</code> 遇到 skb 数据不够时返回 0。但 0 本身就是
          合法校验和，调用者无法区分「算出来是 0」和「根本没算完」。
      - label: 做法
        text: >-
          v2 把这两个函数换成会报失败的 <code>skb_checksum_full()</code> 与
          <code>skb_crc32c_full()</code>，核心用户按失败处理；
          <code>skb_copy_and_csum_bits()</code> 也改成报告错误；
          <code>skb_segment()</code> 在遍历 frag_list 时逐个成员检查，
          而不是先多扫一遍。
      - label: 效益
        text: >-
          未完整校验的包不会再因为「校验和恰好是 0」而通过验证。
    relevance: "写隧道、网卡驱动或任何手工拼 skb 的代码，都会碰到这套返回值约定。"
    link: "https://lore.kernel.org/netdev/<20261021-b4-skbuff-bug-on-followups-v2-0-2aa780a03524@toxicpanda.com>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "一个卡住的 mount，不该拖死整台机器的 sync"
    meta: >-
      〔10-22 00:47〕· [PATCH 0/5] fs: don't let a stuck mount take everybody
      else with it（Josef Bacik）
    points:
      - label: 定位
        text: >-
          superblock 在 <code>sget_fc()</code> 就挂上了全局链表，但要等
          <code>vfs_get_tree()</code> 置上 <code>SB_BORN</code> 才可用。
          这中间 <code>super_lock()</code> 会不可中断地等。
      - label: 痛点
        text: >-
          如果 mount 卡在死掉的块设备或失联的服务器上，所有遍历 superblock 的路径
          都会堵在它后面：<code>sync()</code>、<code>drop_caches</code>、
          <code>Q_SYNC</code> 卡死，<code>ustat()</code>、<code>quotactl()</code>、
          <code>BLKFLSBUF</code> 也一起被拖住，而且 SIGKILL 杀不掉。
      - label: 做法
        text: >-
          只做 flush 的路径（<code>sync()</code>、<code>drop_caches</code>、
          <code>Q_SYNC</code>）直接跳过还没 BORN 的 superblock——文件系统还没挂上，
          不可能有数据要写回。针对具体 superblock 的路径仍然等待，但改成可被信号
          打断。SELinux、冻结、紧急 remount 等路径不动。它接在另一组
          「stuck unmount」补丁之上。
      - label: 效益
        text: >-
          作者用 ext4 挂在一块被挂起的 dm-linear 上做测试：没有这组补丁时前三条
          路径全部卡死，有补丁后立即返回，另外三条也能被 SIGKILL 掉；
          200 轮并发挂载加 sync/drop_caches/ustat 测试干净通过。
    relevance: "车载和嵌入式里设备热插拔、存储掉线很常见，这条路径直接决定系统还能不能正常关机。"
    link: "https://lore.kernel.org/linux-fsdevel/<20261021-b4-super-lock-unborn-v1-0-0265eddb6dee@toxicpanda.com>/"

  - type: highlight
    title: "CAP_SETFCAP 与 user namespace：堵上 setns 和 ptrace 两条绕路"
    meta: >-
      〔10-22 04:37〕· [PATCH v3 0/5] capabilities: close the ways around the
      CAP_SETFCAP rule for uid 0
    points:
      - label: 定位
        text: >-
          提交 <code>db2e718a4798</code> 要求映射 uid 0 的用户命名空间必须由带
          CAP_SETFCAP 的任务创建，但它只检查创建者。
      - label: 痛点
        text: >-
          如果命名空间是别人用 CAP_SETFCAP 建好的，后来加入的任务仍有几条路可走：
          <code>setns()</code> 进去、<code>PTRACE_ATTACH</code> 挂上去、
          写 uid_map，或者在 idmapped mount 上动手脚，最终仍能为祖先的 root
          用户写 file capability。
      - label: 做法
        text: >-
          v3 给每个 user namespace 记录一个 <code>setfcap_level</code>，
          表示创建者的 CAP_SETFCAP 能覆盖到多高。能映射祖先 root 的命名空间，
          只允许 CAP_SETFCAP 同样够高的任务 setns 或 attach；uid_map 写入和
          <code>security.capability</code> 的检查改为按命名空间而不是按 cred 判定。
          相比 v2，普通的 0 到 100000 容器映射重新放行。
      - label: 效益
        text: >-
          41 个测试流覆盖 v1 场景加 setns/ptrace 用例；TLA+ 模型在去掉检查时能
          复现 setns 绕过，加上后找不到违例。
    relevance: "容器安全边界的老问题：userns 里能写 capability，就等于能逃逸到宿主的 root。"
    link: "https://lore.kernel.org/linux-fsdevel/<20261021-b4-setfcap-userns-v3-0-97c7ed4e43e1@toxicpanda.com>/"

  - type: divider
    label: "📌 机制雷达：3 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: UUID 用户 ID
        text: >-
          RFC v2 用 41 个补丁把 kuid_t/kgid_t 变成带标签的联合体，新增
          getuid_r 等一套 20 字节 id 的系统调用。回帖直接把它比作 Windows SID
          重来，并提醒 128 位哈希在 IBM DFS 上的历史教训。
          <a href="https://lore.kernel.org/netdev/<CAPJSo4UJPnhLFAYRXE-_M2_Nin6=Ff02AjayD10cB7946MvJDQ@mail.gmail.com>/">原文</a>
      - label: KAP
        text: >-
          文档级 RFC 提出 Kernel Assurance Plane：给任务绑定「目标」，
          一个目标被撤销时，仍在跑的 agent 立即失去对应授权；接口挂在
          <code>/sys/kernel/security/kap</code>，用 mkdir 建 igroup，像 cgroup。
          <a href="https://lore.kernel.org/linux-security-module/<20261021165748.19304-1-ketan@armoriq.io>/">原文</a>
      - label: BPF 用户页
        text: >-
          Jiri Olsa 的 9 补丁 RFC 想让 BPF 分配用户态可执行页；Alexei 回复说
          用 <code>vm_mmap()</code> 加 <code>access_process_vm()</code>，
          像 ptrace 那样写就行，不需要动 mm。
          <a href="https://lore.kernel.org/linux-mm/<20261021195759.119421-1-jolsa@kernel.org>/">RFC</a>
          ·
          <a href="https://lore.kernel.org/linux-mm/<DMAUMG9WL4X6.12UEJJMJSW54Z@gmail.com>/">回复</a>

  - type: more
    title: "7.4 合并窗口的拉取请求"
    items:
      - link: "https://lore.kernel.org/linux-pci/<20261021224355.GA2571577@bhelgaas>/"
        text: "[GIT PULL] PCI changes for v7.4"
        time: "10-22 06:43"
      - link: "https://lore.kernel.org/linux-block/<3b7e92f1-77a7-4bf7-a942-83de345bfd1a@kernel.dk>/"
        text: "[GIT PULL] Block updates for 7.4-rc"
        time: "10-21 22:43"
      - link: "https://lore.kernel.org/linux-security-module/<20261021162538.1852602-1-mic@digikod.net>/"
        text: "[GIT PULL] Landlock update for v7.4-rc1"
        time: "10-22 00:25"
      - link: "https://lore.kernel.org/linux-security-module/<atjKs7PTN8CgndJg@kernel.org>/"
        text: "[GIT PULL] KEYS: changes for v7.4-rc1"
        time: "10-21 22:22"
      - link: "https://lore.kernel.org/rust-for-linux/<179260155969.2966.15552703862037914616@linux.dev>/"
        text: "[GIT PULL] rust-i2c-next for 7.4"
        time: "10-22 00:52"
      - link: "https://lore.kernel.org/lkml/<so055932-q645-4261-noq6-12214q6n09n9@xreary.bet>/"
        text: "[GIT PULL] HID for 7.4 merge window"
        time: "10-22 04:25"
      - link: "https://lore.kernel.org/lkml/<aacd551a-f512-499a-960e-585bce02dd12@linuxfoundation.org>/"
        text: "[GIT PULL] kunit next update for Linux 7.4-rc1"
        time: "10-22 04:12"
      - link: "https://lore.kernel.org/lkml/<4017e436-9f32-4cdb-a75d-4cbfcddd69f4@linuxfoundation.org>/"
        text: "[GIT PULL] kselftest next update for Linux 7.4-rc1"
        time: "10-22 03:34"

  - type: more
    title: "更多跨领域动态"
    items:
      - link: "https://lore.kernel.org/linux-block/<20261021055235.648957-1-afaria@redhat.com>/"
        text: "[PATCH 0/2] virtio_blk: add FUA write support"
        time: "10-21 13:52"
      - link: "https://lore.kernel.org/netdev/<20261021-netcons-fixes-v4-0-3857120c6340@gmail.com>/"
        text: "[PATCH net v4 0/3] netconsole: fix target enable race and configfs read locking"
        time: "10-21 22:19"
      - link: "https://lore.kernel.org/netdev/<cover.v4.git.mst@redhat.com>/"
        text: "[PATCH net v4 0/7] more virtio-net csum hardening"
        time: "10-21 15:50"
      - link: "https://lore.kernel.org/linux-mm/<20261021205626.3286270-1-suseendranb@google.com>/"
        text: "[PATCH 0/2] mm/zswap: distinguish incompressible pages from compressor failures"
        time: "10-22 04:57"
      - link: "https://lore.kernel.org/linux-fsdevel/<20261021-work-mount-statmount_listns_fixes-v1-0-8917a4c1bd14@kernel.org>/"
        text: "[PATCH 0/6] fs: fixes for statmount() short buffers and listmount()/listns() cursors"
        time: "10-21 19:47"
      - link: "https://lore.kernel.org/rust-for-linux/<20261021-gb-uart-transport-v4-0-c308ce821d45@beagleboard.org>/"
        text: "[PATCH v4 0/6] Add Greybus Sotfsvc and UART Node drivers"
        time: "10-21 19:38"
      - link: "https://lore.kernel.org/lkml/<20261022-a210-init-v1-0-5e438f972d24@iscas.ac.cn>/"
        text: "[PATCH 00/18] riscv: add initial support for Zhihe A210 and Melon Pi"
        time: "10-22 03:53"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: 影子栈
        text: CPU 维护的第二套只读栈，只存返回地址；普通写指令改不了它，用来防返回地址被篡改。
      - label: FRED
        text: 2026 年 CPU 上替代 IDT 的事件入口机制；内核影子栈补丁把它列为硬前提。
      - label: CEA
        text: CPU entry area，给异常和中断用的固定映射区；影子栈复用它来放异常影子栈。
      - label: dma-buf
        text: 跨 GPU、相机、显示共享缓冲区的统一对象，dma-heap 是它的分配后端。
      - label: memcg
        text: 内存 cgroup，按 cgroup 统计和限制内存；本期讨论是否把 dma-buf 也记进它的账。
      - label: swap entry
        text: 页表项里指向被换出页的索引；传统上等于物理 swap 槽位，vswap 把它改成虚拟槽。
      - label: SB_BORN
        text: superblock 的生命周期标志；置位前文件系统已上链表但还不能用。
      - label: CAP_SETFCAP
        text: 允许给文件写 capability 的能力；与 user namespace 的 uid 0 映射组合时容易出现提权绕路。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
