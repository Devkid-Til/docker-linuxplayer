---
title: "TDX 动态 PAMT + Rust 驱动抽象扩张"
date: "2026-08-09"
desc: "本周内核全局：TDX 动态 PAMT 内存节省可达百倍、Rust 驱动抽象一周三连、block 加密死锁修复已进 next 队列"
column: "weekly"
tags: ["内存管理", "进程调度", "PCI/总线", "架构动向"]
blocks:
  - type: hook
    text: >-
      本周内核全局看点：内存管理是机制重心——<strong>TDX 动态 PAMT</strong>（节省内存可达 100 倍）与 <strong>per-VMA 锁全面放开</strong>；<strong>Rust 驱动抽象进入快速扩张期</strong>（寄存器类型化 + DMA 类型安全 + virtio 模块一周三连）；block 侧 blk-crypto 死锁修复是<strong>本周唯一已进 linux-next 队列</strong>的报道补丁。
  - type: image
    src: "https://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-09/cover.png"
    alt: 封面 · 8月9日 · 每周全局雷达
  - type: divider
    label: 📊 板块活跃度
    kind: section
  - type: image
    src: "https://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-09/board-heat.png"
    alt: 板块活跃度条形图 · 近 24h
  - type: paragraph
    text: >-
      近 24h 各板块热度（13 板块真实统计）：lkml 868 · net 212 · DRM 94 · mm 57 · PCI 23 · media 21 · Rust 23 · rt 16 · fs 15 · block 6 · arch 2 · LSM 0 · virtio 0。lkml 全内核广播源一骑绝尘；网络/显示/内存是持续高热板块；virtio/LSM 邮件本周沉寂，但机制级动作（见对应章节）不缺席。
  - type: divider
    label: 📰 media 视频采集
    kind: section
  - type: toc
    items:
      - label: GMSL2/3 串行器/解串器框架 v15（22 补丁）· 机制
        text: 新增 MEDIA_PAD_FL_INTERNAL，把「流在实体内部从哪里产生」显式建模进 MC 图作 routing 端点，影响所有用 V4L2 routing 的 pipeline · <a href="https://lists.openwall.net/linux-kernel/2026/08/07/1161">原文</a>
      - label: 视频编码器 ROI uAPI v3 · 机制
        text: 新增每宏块粒度 delta_qp 控制（s8 数组），高通 iris 落地、v4l2-compliance 48/48 通过——每宏块编码控制这一空白 uAPI 面 · <a href="https://lwn.net/Articles/1087337/">LWN</a>
  - type: divider
    label: 📰 DRM 显示
    kind: section
  - type: toc
    items:
      - label: dw-dp 新增 HDR 支持 · 机制
        text: 把 i915 私有的 HDR InfoFrame SDP 打包器上提进 drm_dp_helper 公共层；sink 不支持 VSC SDP rev5 时 atomic_check 直接拒绝 BT.2020（而非静默省略）· <a href="https://patchew.org/linux/20260808095749.9428-1-royalnet026@gmail.com/">原文</a>
  - type: divider
    label: 📰 mm 内存管理
    kind: section
  - type: toc
    items:
      - label: Unconditional per-VMA locks v3 · 机制
        text: 新增 vma_start_read_unlocked() 让快速路径绕开 mmap_read_lock 三段式；per-VMA 锁从「仅 SMP+MMU」放开为全配置可用（动机：x86 shadow stack 避免递归锁）· <a href="https://lwn.net/Articles/1085568/">LWN</a>
      - label: memcg 分级内存限制 RFC v3
        text: memcg 内存分级（tier-aware）新方向，合并窗口 lockdown 期的机制级讨论
  - type: divider
    label: 📰 PCI PCIe
    kind: section
  - type: toc
    items:
      - label: hotplug 新增 sysfs uevent 属性 v6 · 机制
        text: 写入 /sys/bus/pci/slots/&lt;id&gt;/uevent 即合成/重放热插拔事件；是 kobject_synth_uevent() 内核唯一非 driver-core 用例 · <a href="https://lists.openwall.net/linux-kernel/2026/08/07/1737">原文</a>
      - label: endpoint DMA 资源暴露 v6 · 机制
        text: 新建 pci-ep-dma.h，EPC 级 DMA channel 委托/回收，metadata 放普通 BAR 而非 config space · <a href="https://lwn.net/Articles/1087086/">LWN</a>
  - type: divider
    label: 📰 net 网络
    kind: section
  - type: toc
    items:
      - label: hardware pacing offload v4 · 机制
        text: 首个硬件发送定时 offload 通用化尝试：新增 rtnetlink 属性 pacing_offload_horizon，Intel idpf TX + sch_fq 配合省掉无谓 ktime 调用 · <a href="https://lists.openwall.net/linux-kernel/2026/08/06/1384">原文</a>
  - type: divider
    label: 📰 fs 文件系统
    kind: section
  - type: toc
    items:
      - label: inflight stable-write 计数 RFC v3 · 机制
        text: 为并发多使用者开/关 stable write 引入计数，修复写稳定性竞争窗口；作者明言为 RWF_WRITETHROUGH 直写支持打底 · <a href="https://lwn.net/Articles/1086619/">LWN</a>
  - type: divider
    label: 📰 virtio 虚拟化
    kind: section
  - type: toc
    items:
      - label: Rust 化 virtio 模块 RFC v3 · 机制
        text: Device&lt;Ctx&gt; 封装 virtio_device 提供 find_vqs/del_vqs 等——Rust 抽象从基础设施向 virtio 驱动展开的关键一步 · <a href="https://lists.openwall.net/linux-kernel/2026/08/06/513">原文</a>
  - type: divider
    label: 📰 Rust 内核 Rust
    kind: section
  - type: toc
    items:
      - label: io register projections v2（0/16）· 机制
        text: 寄存器 API 强制类型化基址 + io_project! 投影，删除相对寄存器，连带 nova-core、drm/tyr 转新 API——跨驱动树机制级重构
      - label: dma single-buffer streaming API · 机制
        text: Streaming 类型把 map→sync→unmap 借用协议编码进类型系统，unmap 前不交出借用即编译期拦截——用类型消灭 DMA 生命周期错误
  - type: divider
    label: 📰 LSM 安全
    kind: section
  - type: toc
    items:
      - label: task_setscheduler LSM hook 扩展 v4
        text: CPU 亲和性掩码入参，sched_setaffinity / cpuset 触发点同步
      - label: smack cred UAF 修复（Jann Horn）
        text: 非 current 任务误读主观凭据，改恒用客观凭据，Cc stable 安全红线
  - type: divider
    label: 📰 block 块设备
    kind: section
  - type: toc
    items:
      - label: blk-crypto-fallback 死锁修复 · 机制 + 已进 next
        text: 大 WRITE bio 经 dm-inlinecrypt 卡死；第 2 片给 mempool_alloc_bulk() 引入可失败分配语义（__GFP_DIRECT_RECLAIM 区分两种模式）——本周唯一已进 linux-next 队列的报道补丁
      - label: zoned offline/read-only 处理重构 v2（0/13）
        text: 为存储元素 depopulation（退役/剥离）铺路，offline 区一律按死区处理
  - type: divider
    label: 📰 arch 架构
    kind: section
  - type: toc
    items:
      - label: PTE table storage vs values（hw_pte_t）· 机制
        text: 把 pte_t 的双重语义拆开，默认 alias、架构 opt-in，零风险类型体系铺路（66 文件 + Coccinelle 机械转换）
  - type: divider
    label: 📰 rt 实时调度
    kind: section
  - type: toc
    items:
      - label: kcov suppress timer/scheduler leaks · 机制
        text: 引入可嵌套 KCOV_PAUSED 位包住 __schedule / try_to_wake_up 等四站点，防 fuzzer 覆盖率失真
  - type: divider
    label: 📰 lkml 全内核广播
    kind: section
  - type: toc
    items:
      - label: Dynamic PAMT v9（0/11）· 机制
        text: TDX 页跟踪元数据从启动静态分配改为按需动态，节省可达 100 倍；v9 rebase v7.2-rc6、功能改 opt-in
      - label: kfree_nolock() 放宽 RFC · 机制
        text: 取消只能释放 kmalloc_nolock 对象的限制，带动 kfree_rcu 向无锁路径收敛
  - type: divider
    label: 📰 LWN 本周综述
    kind: section
  - type: paragraph
    text: >-
      本周 LWN 主题偏 BPF 与 FUSE：BPF 三连（Bringing BPF to binfmt_misc / examining other network namespaces / future of libraries）、FUSE status and plans + io_uring buffer sizes；另有 process-builder API 雏形、O_CREAT|O_DIRECTORY 再议、gccrs 编译内核进展、hazard pointers 与内联函数调试信息（部分订阅墙文章标题可抓、正文需订阅）。
  - type: divider
    label: 🧭 合入状态
    kind: section
  - type: toc
    items:
      - label: 三镜像反查（15 个重点补丁）
        text: ✅ block blk-crypto-fallback 修复已进 linux-next（next-20260804）；其余 14 个本周补丁均未合入 mainline——符合合入滞后规律（review→维护者树→next→merge window）
  - type: divider
    label: 📰 架构动向
    kind: section
  - type: toc
    items:
      - label: mm 是本周机制重心
        text: VMA 锁全配置放开 + TDX 动态 PAMT，合并窗口 lockdown 期仍有两处大动作
      - label: Rust 驱动抽象高速扩张
        text: 寄存器类型化 / DMA 类型安全 / virtio 模块一周三连，nova-core 成首个吃螃蟹的驱动
      - label: 动态内存管理成趋势
        text: PAMT 按需、memcg tier-aware、zoned depopulation——「静态预留→按需分配」在多个子系统同时出现
  - type: closing
    tagline: 如果对你有用，点个赞，或留言聊聊你最关心的板块。
    source: ""
---
