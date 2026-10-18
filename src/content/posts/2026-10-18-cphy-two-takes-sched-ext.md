---
title: "两套 C-PHY 同台：三相对编码该由谁定义时序"
date: "2026-10-18"
desc: "两份独立的 C-PHY 实现同日上列表；sched_ext 为 7.4 补上子调度器账本与单任务重入队。"
column: "daily"
tags: ["media", "sched", "net", "mm", "fs", "block", "DRM", "LSM", "PCI", "Rust"]
blocks:
  - type: hook
    text: >-
      今天值得花 3 分钟看两件事：<strong>高通在不到一天里把两套互相独立的 C-PHY 实现摆上
      linux-media</strong>，争论的焦点不是要不要支持，而是 sensor 的时序该由谁拥有；以及
      <strong>sched_ext 为 7.4 补上子调度器的能力账本</strong>——任务不能再先于授权到达。
      除此之外，BPF 一次收到 43 个安全修复，netfilter 则把 br_netfilter 标记为待移除。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-18/cover.png"
    alt: "封面 · 10月18日 · 两套 C-PHY 同台"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-18/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-18 10:20 北京，近 24h 各板块真实计数：net 272 · mm 89 · media 61 ·
      fs 60 · LSM 59 · PCI 56 · DRM 27 · rt 27 · Rust 11 · block 8 · arch 1 · virtio 0。
      量最大的是 net，但今天真正成体系的设计讨论落在两处：<strong>C-PHY 的通用抽象该放在
      phy core 还是 host 驱动</strong>，以及 <strong>sched_ext 子调度器在 attach、detach
      和 CPU 热插拔时的能力账本</strong>。virtio-dev 近 24h 静默。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "两套 C-PHY 同一天上列表：内核该把三相对编码放在哪一层"
    meta: "〔10-18 01:13 北京〕· [PATCH RFC 0/6] phy/media: Add generic MIPI C-PHY support to CSI-2 stack（Nihal Kumar Gupta，Qualcomm）"
    points:
      - label: 现状
        text: >-
          MIPI CSI-2 之下有两种物理层。<strong>D-PHY</strong> 有独立的差分时钟 lane，
          最多四条数据 lane；<strong>C-PHY</strong> 把时钟嵌进数据流，用最多三个
          <strong>trio</strong>（三线一组）传输，编码效率是 16 bit / 7 symbol。内核的
          generic PHY 框架已经有 D-PHY 的通用配置 API（<code>phy-core-mipi-dphy.c</code>），
          但 C-PHY 没有对应的公共表示，寄存器序列和时序计算长期停在厂商驱动里。
      - label: 痛点
        text: >-
          当同一颗 Qualcomm CSIPHY 要同时服务 D-PHY 与 C-PHY 的 sensor，链路频率、
          lane 掩码和 <strong>settle count</strong>（接收端在扫描 C-PHY sync 前等待的
          timer 周期数）都不能沿用 D-PHY 的假设。更麻烦的是，settle 取决于 sensor 上报的
          T_PREPARE 与 T_PREAMBLE，不是从 link frequency 能唯一反推出来的量。
      - label: 方案
        text: >-
          不到 24 小时里出现了两套来自高通的独立实现。第一套是 Anusha Arun Nandi 与
          Jigarkumar Zala 的 0/3（12:17 北京）：在 phy core 新增
          <code>PHY_MODE_MIPI_CPHY</code>、<code>struct phy_configure_opts_mipi_cphy</code>
          和三个 helper，按 MIPI C-PHY v1.0 的 Table 18 填时间参数；qcom-mipi-csi2
          再从设备树 <code>bus-type</code> 推导 PHY 模式，接上 SA8775P 与 SC7280 的
          3-phase C-PHY 寄存器序列，约 1029 行新增。
          第二套是 Nihal Kumar Gupta 的 RFC 0/6（10-18 01:13 北京）：phy core 只加最小结构，
          CamSS 通过 sensor 的 <code>get_mbus_config()</code> 取 T_PREPARE / T_PREAMBLE，
          按 <code>settle_cnt = (t_prepare + t_preamble / 3) × timer_clk / 1e9</code>
          计算；数据率寄存器表则用 <code>link_freq × 32 / 7</code> 得到的有效 bit rate 选择。
          全系列 315 行，改动更渐进。
      - label: 为什么
        text: >-
          两套方案的分歧是「时序归谁」。Anusha 把 C-PHY 当作与 D-PHY 对等的通用 PHY
          配置域，helper 放在 core，provider 只实现硬件操作；Nihal 则把 sensor 时序当作
          事实交给 CamSS 转达，并明确表示在没有 sensor 时序时<strong>不提供一个猜测的安全值</strong>——
          stream-on 直接返回 <code>-EINVAL</code>，因为 C-PHY 的 settle timing 只对特定
          symbol-rate 区间成立。评审者 Bryan O'Donoghue 的结论是取两者之长：保留 Nihal
          这种在 <code>3ph-dphy.c</code> 上渐进改、C-PHY 与 D-PHY 同文件的结构，但采用
          Anusha 更接近规范的 C-PHY ops 与 lane 映射。
      - label: 效益
        text: >-
          对做相机链路的人来说，C-PHY 的抽象层第一次有了可比较的公共形状：sensor 驱动、
          CSI host 和 PHY provider 三方的职责边界可以就此定下来。对下游厂商，这也意味着
          camss 里那套 C-PHY 逻辑有了上游化路径，而不是继续留在私有树里。
      - label: 下一步
        text: >-
          两位作者需要先合并设计再发新版本。中间还有一处流程问题：Anusha 的 camss 系列在
          <code>Depends-on</code> 里指向了 DTS 系列，Krzysztof 直接指出「驱动不应依赖
          DTS」，如果依赖成立这个 patchset 就是坏的。先修依赖关系，再谈 vN。
    verdict: "C-PHY 的争论不在「要不要支持」，而在「谁拥有 timing」。这正是相机栈里最容易反复的地方：抽象放高了，provider 拿不到 sensor 事实；放低了，每个 host 驱动都要重写一遍。"
    link: "https://lore.kernel.org/linux-media/<20261017-cphy_support-v1-0-8b0e1237ce95@oss.qualcomm.com>/"

  - type: headline
    title: "sched_ext 给子调度器补账本：任务不能先到、授权后到"
    meta: "〔10-18 09:59 北京〕· [PATCHSET v3 sched_ext/for-7.4] sched_ext: Report a sub-scheduler's ecaps on attach, detach and cpu hotplug（Tejun Heo）"
    points:
      - label: 现状
        text: >-
          sched_ext 允许用 BPF 写调度器，并支持<strong>子调度器</strong>组合：父调度器
          通过 <code>ops.sub_attach()</code> 把一批 CPU 的 <strong>ecaps</strong>
          （按 cid 记录的能力授权）交给子调度器，子调度器通过
          <code>ops.sub_ecaps_updated()</code> 得知自己拿到了哪些 CPU。
      - label: 痛点
        text: >-
          现有实现里，attach 时授予的 ecaps 要等子调度器的 enable bypass 解除后才上报，
          而任务恰好在同一时刻交给它。于是子调度器先收到 <code>ops.enqueue()</code>，
          却还没收到任何 cid 通知，只能先把任务暂存。反过来，detach 和 CPU offline
          造成的损失也不上报；CPU 回来时的 reseed 还可能在 root 的
          <code>ops.cpu_online()</code> 之前跑子调度器的 ops。
      - label: 方案
        text: >-
          v3 六个补丁把 ecaps 的变化与上报绑定：attach 时在 bypass 解除<strong>之前</strong>
          上报，detach 时在任务回到父调度器<strong>之前</strong>上报损失，CPU offline/online
          围绕 root 的 <code>ops.cpu_offline()</code> / <code>ops.cpu_online()</code>
          上报；suspend 和 hibernation 不单独上报，恢复时只报净变化。同一批为 7.4 的补丁里，Tejun 还发了
          三补丁的 <code>scx_bpf_dsq_reenq_task()</code>：只把 DSQ 迭代中标记的任务重新
          入队，其他任务保持原位，不再像 <code>scx_bpf_dsq_reenq()</code> 那样洗整个
          DSQ；随后又补一刀，把锁的持有时间从「重新入队数」改成「访问任务数」，避免一长串
          未标记任务让两把锁一直不放。
      - label: 为什么
        text: >-
          子调度器需要账本一致：它看到的 ecaps 必须和它实际能调度的 CPU 一致。上报点前移或
          后移，都是为了消掉「先拿任务、后知授权」的窗口。新 kfunc 则对应一个具体场景——
          一个 CPU 掉线时，调度器只需把困在该 DSQ 上的少数任务重新放置，没必要让整队任务
          重走 <code>ops.enqueue()</code>。
      - label: 效益
        text: >-
          对写 sched_ext 调度器的人，子调度器的生命周期语义变得可推理；对 7.4，这两套能力
          一起进。v3 还带了 TLC 模型检查（小 CPU 数）和 PREEMPT_RT 上的测试。
      - label: 下一步
        text: >-
          patchset 基于 <code>sched_ext/for-7.4</code>，方向是随下一个合并窗口进入主线。
          剩下的讨论集中在 ecaps 同步在 hard irq work 里的调度方式，以及子调度器释放的
          grace period。
    verdict: "sched_ext 正在从「能写调度器」走向「能组合调度器」。组合带来的第一件事不是新算法，而是账本：谁在什么时候知道哪些 CPU 归自己。"
    link: "https://lore.kernel.org/lkml/<20261018015952.1499528-1-tj@kernel.org>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "CamSS 先补 PHY 类型与链路频率：host 侧的 C-PHY 前提"
    meta: "〔10-17 11:52〕· [PATCH 0/2] media: qcom: camss: track PHY type and scale link frequency for C-PHY"
    points:
      - label: 定位
        text: >-
          camss 是 Qualcomm 的 camera host 驱动，负责把 sensor 经 CSIPHY 送来的数据
          接进 ISP。C-PHY 下的 link frequency 与 D-PHY 不同，如果 host 仍按旧公式算，
          时钟和带宽都会偏。
      - label: 做法
        text: >-
          两封补丁从设备树 <code>bus-type</code> 记录当前是 D-PHY 还是 C-PHY，并在
          计算 link frequency 时按 PHY 类型切换；另有一封把 C-PHY 配置搬进新的
          <code>csiphy_stream_on()</code>。
      - label: 效益
        text: >-
          这是上层抽象落地前必须有的 host 侧基础：先知道对端是什么 PHY，才谈得上
          把通用配置交给 phy core。
    relevance: 与你做的 camera 链路直接相关。C-PHY 的 trio 与 lane 映射一旦进入 host 驱动，调试时最先看的就是 link frequency 和 settle 这两处。
    link: "https://lore.kernel.org/linux-media/<20261017035221.3816464-1-anusha.nandi@oss.qualcomm.com>/"

  - type: highlight
    title: "Intel IPU6：系统 suspend 时别把 psys 当成已经挂起"
    meta: "〔10-18 06:14〕· [PATCH] media: ipu6: Keep psys out of direct-complete on system suspend"
    points:
      - label: 定位
        text: >-
          IPU6 是 Intel 笔记本上的相机处理单元。<code>direct-complete</code> 是 PM
          核心的一种优化：如果设备在系统 suspend 前已经 runtime-suspended，就跳过它的
          suspend 回调。
      - label: 做法
        text: >-
          psys（processing system）在相机仍可能使用的情况下被标成 direct-complete，
          补丁把它排除在 direct-complete 之外，让 suspend 回调继续执行。
      - label: 效益
        text: >-
          避免系统 suspend/resume 时相机子系统与电源状态脱节；对用 IPU6 的笔记本相机
          是稳定性修复。
    relevance: 相机驱动的 suspend 路径和 MIPI 链路状态强耦合，这类 PM 小修往往决定摄像头在合盖唤醒后还能不能出图。
    link: "https://lore.kernel.org/linux-media/<20261017-psys-ipu6-v1-1-56e333f6ed04@nilk.net>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20261017-iris-handle-unbind-v1-0-7809148eb90f@oss.qualcomm.com>/"
        text: "[PATCH 0/3] media: iris: Fix issues in the driver unbind path"
        time: "10-17 11:16"
      - link: "https://lore.kernel.org/linux-media/<20261017-fix-oob-tss-v1-1-fb86f4cabf65@oss.qualcomm.com>/"
        text: "[PATCH] media: iris: Fix out-of-bounds read in timestamp metadata fallback"
        time: "10-17 11:25"
      - link: "https://lore.kernel.org/linux-media/<20261017-ov9734-ipu6-v1-0-86eab22ae258@gmail.com>/"
        text: "[PATCH 0/3] media: ov9734, ipu-bridge: Enable the camera on the Intel NUC M15"
        time: "10-17 16:32"
      - link: "https://lore.kernel.org/linux-media/<10208-1792263018-129136@sneakemail.com>/"
        text: "[PATCH v2] media: cxusb: fix NULL pointer dereference in cxusb_disconnect()"
        time: "10-18 02:50"
      - link: "https://lore.kernel.org/linux-media/<20261017110859.1429-1-25031212351@stu.xidian.edu.cn>/"
        text: "[PATCH] media: rc: ati_remote: fix NULL input_dev on rc device open"
        time: "10-17 19:09"

  - type: divider
    label: "📰 sched / RT 实时调度"
    kind: section
  - type: highlight
    title: "PREEMPT_RT 上，io_uring 的实时等待者现在能在硬中断里被唤醒"
    meta: "〔10-18 01:17〕· [PATCH v2] io_uring/wait: wake real-time waiters from hard interrupt context"
    points:
      - label: 定位
        text: >-
          io_uring 的 CQ 等待带超时时，用的是自己的 hrtimer。PREEMPT_RT 下，没有标记
          hard 的 hrtimer 在 per-CPU ktimers 线程里到期，而这个线程是 SCHED_FIFO 1。
      - label: 做法
        text: >-
          于是 RT 任务在 <code>io_uring_enter()</code> 里等 deadline 时，只要同 CPU 上
          还有别的 RT 任务可跑，唤醒就必须等它们全部阻塞。补丁把 io_uring 的两个 timer
          回调按 hrtimer sleeper 的规则标记为 hard，允许从硬中断上下文直接唤醒；两个回调
          本身只置标志、读 ring 状态，在硬中断里是安全的。
      - label: 效益
        text: >-
          Jetson Orin Nano（6.18.39-rt）实测：SCHED_FIFO 40 的任务等 40000 个间隔
          500us 的 deadline，之前有 6647 次晚于 100us、2758 次完全没被唤醒；之后
          最晚 18us，没有超过 100us 的。epoll 的 <code>epoll_pwait2()</code> 本来
          就是 hard，同一测试最晚 17us。
    relevance: 相机/视频链路的采集线程经常跑在 RT 优先级上。采集循环里混用 io_uring 时，这类唤醒延迟会直接变成丢帧。
    link: "https://lore.kernel.org/linux-rt-devel/<20261017171726.601443-1-austin.linux@gmail.com>/"

  - type: highlight
    title: "IMMED 任务被放到正在变 idle 的 CPU：7.3 的 sched_ext 修复"
    meta: "〔10-18 06:19〕· [PATCH v2 sched_ext/for-7.3-fixes] sched_ext: Reenqueue IMMED tasks when their CPU picks idle"
    points:
      - label: 定位
        text: >-
          sched_ext 里带 IMMED 标志的任务要求立刻放置到某个 CPU。问题出在 core-sched
          pick 与 CPU 进入 idle 的交界处。
      - label: 做法
        text: >-
          当被选中的 CPU 随即 pick idle 时，把该 IMMED 任务重新入队，而不是让它留在
          一个已经空转的 CPU 上。
      - label: 效益
        text: >-
          减少「任务已经派给 CPU、CPU 却没在跑它」的窗口，属于 7.3 的 fixes 分支。
    relevance: 这是调度器组合时的典型时序 bug：放置决策与 CPU 状态之间隔了一个锁窗口。
    link: "https://lore.kernel.org/lkml/<20261017221924.3908922-1-arighi@nvidia.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "BPF 一次收 43 个修复：内存安全、生命周期与锁"
    meta: "〔10-18 00:37〕· [PATCH bpf-next v2 00/43] bpf: Memory safety, lifetime and locking fixes（Alexei Starovoitov）"
    points:
      - label: 定位
        text: >-
          这批补丁覆盖 BPF core、verifier 以及网络侧的 BPF 路径，来自 Josef 等人的
          一组修复。问题类型分成几类：sleepable 程序在不允许睡眠或不持 RCU 的地方执行；
          iterator 与 writable tracepoint 交给程序的缓冲区；sk_storage map iterator；
          local storage、program、map 的生命周期；XDP 与设备解绑；seg6local End.BPF、
          <code>bpf_skb_adjust_room()</code>、skb dynptr 写入导致 skb head 重分配。
      - label: 做法
        text: >-
          每个 bug 都在 VM 里用 bpf-next 上补丁前后的内核复现过，splat 放在 commit log；
          v1 评审发现的问题也一并修了。其中一部分修复会<strong>拒绝以前接受的程序</strong>：
          例如 sleepable 程序不能再挂到 task_vma iterator，带 tail call 的程序不能挂到
          map element iterator 或 writable tracepoint，若干 packet pointer 与 slice 在
          更多位置失效。
      - label: 效益
        text: >-
          43 个修复一次进 bpf-next，且复现证据齐全。对写 BPF 的人来说，这是一次需要
          提前自查的语义收紧——有些「运行时没事」的程序形态会开始在 verifier 处失败。
    relevance: 做相机/NPU 驱动时，BPF 常被用来做 tracing 和策略注入。这类 verifier 收紧意味着现成的 BPF 脚本升级内核后可能需要改。
    link: "https://lore.kernel.org/netdev/<20261017163745.3341787-1-alexei.starovoitov@gmail.com>/"

  - type: highlight
    title: "br_netfilter 被禁用进 user namespace，并排上 2027 移除日程"
    meta: "〔10-18 08:56〕· [PATCH net-next 01/15] netfilter: disable br_netfilter in user namespaces（Florian Westphal）"
    points:
      - label: 定位
        text: >-
          <code>br_netfilter</code> 是一层古老兼容代码：它在 bridge 内部模拟 IP 栈，
          通过 <code>call-iptables</code> 让桥接帧走 iptables/ip6tables。它和 ebtables、
          nftables 的 bridge family 都不是一回事。
      - label: 做法
        text: >-
          补丁在 user namespace 里不再注册 br_netfilter 的基础 hooks，并在文档里标记
          2027 年移除。原因是桥端口逃出 RCU 保护后，底层设备（macvlan 等）被重新配置，
          再注回网络栈时仍有代码假定 <code>net_device</code> 带着 bridge rx 数据，导致崩溃。
          现有的 sysctl 和每 bridge 的 <code>BROPT_NF_CALL_IPTABLES</code> 开关仍保留，
          但 hooks 不注册，所以不再生效。
      - label: 效益
        text: >-
          userns 里少一类可被组合出来的攻击面；对依赖 br_netfilter 做容器内 iptables
          过滤的环境，需要开始迁移到 nftables bridge family。
    relevance: 容器网络、网桥和 iptables 的组合是很多嵌入式网关的默认配置。这是一条需要提前排期的弃用通知，不是普通 bugfix。
    link: "https://lore.kernel.org/netdev/<20261018005638.1776148-2-pablo@netfilter.org>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "禁掉 memcg 之后，MGLRU 的 debugfs 路径会空指针"
    meta: "〔10-17 13:09〕· [PATCH v2 1/2] mm: multi-gen LRU: fix NULL lruvec->pgdat deref with memcg disabled on cmdline"
    points:
      - label: 定位
        text: >-
          MGLRU（multi-gen LRU）按代际管理页面回收。它的 <code>get_lruvec()</code>
          在 memcg 启用时通过 <code>mem_cgroup_lruvec()</code> 取 lruvec；
          当内核命令行带 <code>cgroup_disable=memory</code> 时，却直接返回
          <code>&amp;pgdat-&gt;__lruvec</code>，绕过了 <code>lruvec-&gt;pgdat</code>
          的初始化。
      - label: 做法
        text: >-
          v2 删掉这段重复实现，统一调用 <code>mem_cgroup_lruvec()</code>，
          让 debugfs 的 <code>lru_gen_seq_show()</code> 等路径不再解引用空指针。
          Fixes 标签指向 MGLRU 的 groundwork，Cc stable 6.2+。
      - label: 效益
        text: >-
          在关闭 memcg 的机器上，读 MGLRU 的 debugfs 接口不再可能触发 NULL deref。
          这类问题的触发条件窄，但一旦命中就是内核崩。
    relevance: 嵌入式设备常关闭 memcg 以省内存。只要有人读 MGLRU 调试图，这个 bug 就可达。
    link: "https://lore.kernel.org/linux-mm/<20261017050928.128582-1-sidchintamaneni@gmail.com>/"

  - type: highlight
    title: "zswap 的 load 路径：把压缩与解压请求拆开，降低争用"
    meta: "〔10-18 00:09〕· [PATCH v4 0/3] mm: zswap: reduce request contention on loads"
    points:
      - label: 定位
        text: >-
          zswap 在 swap-out 时压缩页面、swap-in 时解压，压缩与解压请求原先共享同一套
          请求对象。load 路径上的并发会让请求资源互相争用。
      - label: 做法
        text: >-
          v4 三补丁：压缩与解压使用各自独立的请求；同步解压改用栈上的请求；并在
          crypto/acomp 层加上 <code>MAX_SYNC_COMP_REQSIZE</code> 的约束。
      - label: 效益
        text: >-
          减少 zswap 换入时的请求竞争和分配开销，对内存压力下的交互延迟有直接帮助。
    relevance: 嵌入式设备 swap 到 zram/zswap 很常见；换入路径的争用会放大成卡顿。
    link: "https://lore.kernel.org/linux-mm/<20261017160918.2738626-1-usama.arif@linux.dev>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "configfs 的引用计数漏洞：syzbot 逮到的 slab-use-after-free 写"
    meta: "〔10-17 20:37〕· [PATCH] configfs: fix slab-UAF Write in config_item_put"
    points:
      - label: 定位
        text: >-
          configfs 用 <code>config_item</code> 的引用计数管理对象生命周期。
          <code>configfs_symlink()</code> 在释放 inode 锁、调用
          <code>get_target()</code> 期间继续持有 <code>parent_item</code> 的引用。
      - label: 做法
        text: >-
          syzbot 报的是 <code>config_item_put()</code> 里的 kref_put 触发
          slab-use-after-free 写。补丁在解锁前先把 parent 引用放回，重新加锁后再取一次并
          检查，避免在窗口里使用已经释放的对象。
      - label: 效益
        text: >-
          堵住一条 syzbot 可达的 UAF。configfs 是很多子系统向用户态暴露配置的入口，
          这类生命周期 bug 的影响面通常比单驱动更大。
    relevance: 内核里用 configfs 暴露可配置对象的子系统不少；这类修复适合回看自己的 configfs 使用路径是否也有同样的「持引用跨解锁」模式。
    link: "https://lore.kernel.org/linux-fsdevel/<20261017123748.4430-1-drifabdelmalekmohamedsaid@gmail.com>/"

  - type: highlight
    title: "overlayfs 挂载：override_creds 之后别拿受限 cred 去 clone mount"
    meta: "〔10-18 00:51〕· [PATCH] ovl: fix mount setup failing when override_creds drops CAP_SYS_ADMIN"
    points:
      - label: 定位
        text: >-
          进程可以丢掉 CAP_SYS_ADMIN 后通过 fsconfig 设置 <code>override_creds</code>，
          overlayfs 会把这套受限凭据存进 <code>ofs-&gt;creator_cred</code>，并在整个
          mount setup 期间切过去。
      - label: 做法
        text: >-
          mount setup 里的 <code>clone_private_mount()</code> 会检查当前 cred 是否有
          CAP_SYS_ADMIN。补丁只在这一步临时使用 mounter 的真实凭据，其余背景操作仍走
          stashed cred。
      - label: 效益
        text: >-
          特权进程用 override_creds 挂 overlayfs 时不再得到 -EPERM；权限模型没有被放宽，
          只是把「克隆挂载」这一步的检查对象改对了。
    relevance: 容器运行时和 systemd 的挂载路径都会碰这一段；overlayfs 的凭据切换是常见踩坑点。
    link: "https://lore.kernel.org/linux-fsdevel/<20261017165125.2450059-1-amir73il@gmail.com>/"

  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "mq-deadline 直接派发：快盘上把调度器开销让开"
    meta: "〔10-17 18:54〕· [PATCH] blk-mq: add direct dispatch support for mq-deadline（Kaitao Cheng）"
    points:
      - label: 定位
        text: >-
          mq-deadline 在块层做请求插入、排序和合并。对有空闲容量的 NVMe SSD，
          这些 CPU 开销可能超过它带来的收益。
      - label: 做法
        text: >-
          新增 <code>skip_request</code> elevator 回调，让未插队的提交和 plug flush
          绕过调度路径直接发给驱动；mq-deadline 实现它并保留重插/重试时的请求记账。
          新增 <code>dispatch_direct</code> 开关，默认开启；直接派发的请求可能越过排队中
          的请求，包括更高优先级或已经过期的请求。
      - label: 效益
        text: >-
          fio 顺序写（4K，iodepth 16）：单 job 从 1047 提升到 1174 MiB/s，多 job
          （10 个）从 946 提升到 2349 MiB/s，分别是 mq-deadline 的 +12.1% 和 +148.3%，
          达到 <code>none</code> 调度器的 97.1% / 95.6%。32K 负载基本不变。
    relevance: 块层调度器的取舍正在从「排序优先」转向「快盘优先直通」。对相机 RAW 连续落盘这类顺序负载，这个开关值得关注。
    link: "https://lore.kernel.org/linux-block/<20261017105400.95967-1-kaitao.cheng@linux.dev>/"

  - type: divider
    label: "📰 DRM / GPU"
    kind: section
  - type: highlight
    title: "GPUVM 两趟锁进入 drm-misc-next：exec 先锁 VM 内部，再锁驻留 BO"
    meta: "〔10-18 05:24〕· [PATCH v3 0/8] drm/gpuvm: two pass locking for exec（已并入 drm-misc-next）"
    points:
      - label: 定位
        text: >-
          GPUVM 管理 GPU 虚拟地址空间与 BO 的 dma-resv 锁。一次 exec 提交要锁多个 BO，
          而 VM_BIND 路径也在锁同一批对象，两条路径的锁序不一致就会死锁。
      - label: 做法
        text: >-
          v3 八补丁允许分两趟锁外部对象：xe、panthor、msm 都改成先锁 VM 内部对象、
          最后锁 resident BO；msm 同时拒绝 VM_BIND 上下文上的 submit_bo 表，并启用
          <code>DRM_GPUVM_RESV_PROTECTED</code>。Danilo Krummrich 已把它合入
          <code>drm-misc-next</code>，排队进 7.4。
      - label: 效益
        text: >-
          exec 与 VM_BIND 终于共享同一套锁序，跨驱动死锁风险下降；panthor 直接拿到
          这项修正，对做 DRM 驱动和 GPU 内存管理的人是现成的参考实现。
    relevance: panthor 是你关注的驱动方向之一。这个系列把「锁序」从各驱动私有的约定变成 GPUVM 层的公共规则。
    link: "https://lore.kernel.org/dri-devel/<20261017212357.99295-1-dakr@kernel.org>/"

  - type: divider
    label: "📰 LSM 安全"
    kind: section
  - type: highlight
    title: "PowerVM 的 trusted key 可以用自己创建的 wrapping key 了"
    meta: "〔10-18 02:39〕· [PATCH v4 0/9] Extend PKWM to support user-created wrapping keys（Srish Srinivasan，IBM）"
    points:
      - label: 定位
        text: >-
          PowerVM 的 PKWM trusted source 目前每个 LPAR 只有一把默认 wrapping key，
          所有 PKWM 后端的 trusted key 都用它封存和解封。
      - label: 做法
        text: >-
          v4 九补丁把 PKWM 的用户创建 wrapping key 生命周期接进内核：新增 hcall、
          允许按 label 选择 wrapping key、通过 sysfs 管理密钥；前面还有六个预备修复，
          包括 PLPKS 长度类型、错误传播、输出缓冲初始化和敏感 PKWM buffer 的清理。
      - label: 效益
        text: >-
          多租户或按用途隔离密钥的场景不再被迫共用一把默认 key；顺带修掉的敏感内存
          清理问题也值得安全侧关注。
    relevance: keys/trusted 的封存模型是内核安全里少见的「硬件密钥管理」入口，和 TPM、TPM2 trusted keys 是同一类问题。
    link: "https://lore.kernel.org/linux-security-module/<20261017183853.596052-1-ssrish@linux.ibm.com>/"

  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-mm/<20261018015044.798412-1-nickolai@csail.mit.edu>/"
        text: "[PATCH v2] mm/mremap: do not charge a shrinking move twice"
        time: "10-18 09:50"
      - link: "https://lore.kernel.org/linux-mm/<20261017211613.16456-2-aethernet65535@gmail.com>/"
        text: "[RFC PATCH v4 0/9] mm/damon: hardware-sampled access reports"
        time: "10-18 05:16"
      - link: "https://lore.kernel.org/linux-pci/<46a5f906-54da-4869-b57d-5bdede502eee@mailbox.org>/"
        text: "PCI: rcar-gen4 v4 重做 Root Port AER、iMSI-RX、reset 与 link-down 恢复（18 补丁）"
        time: "10-18 01:33"
      - link: "https://lore.kernel.org/linux-pci/<LV2PR11MB6070ABD61B46E9590C9B28ACB29A2@LV2PR11MB6070.namprd11.prod.outlook.com>/"
        text: "[PATCH v2 1/2] PCI/P2PDMA: Allow P2PDMA in VMware guests on Intel hosts"
        time: "10-17 23:21"
      - link: "https://lore.kernel.org/rust-for-linux/<20261017111134.22546-1-chenhan0017.work@gmail.com>/"
        text: "[PATCH v3 0/3] rust: time: fix Delta arithmetic and add math helpers"
        time: "10-17 19:11"
      - link: "https://lore.kernel.org/rust-for-linux/<20261017-rust-bindgen-workaround-v1-1-fbd99504b4b9@weissschuh.net>/"
        text: "[PATCH] compiler_types: drop the Rust bindgen workaround for BTF_TYPE_TAG()"
        time: "10-18 05:55"
      - link: "https://lore.kernel.org/linux-fsdevel/<a6be7644-f04c-4af9-a49b-97d8997f90aa@samsung.com>/"
        text: "[PATCH v6 0/8] xfs write streams"
        time: "10-18 03:22"
      - link: "https://lore.kernel.org/linux-security-module/<sashiko-outbox-175561@kernel.org>/"
        text: "[PATCH] selinux: don't label bridged packets in selinux_ip_forward()"
        time: "10-17 22:37"

  - type: divider
    label: "📌 机制雷达"
    kind: primary
  - type: toc
    items:
      - label: RCU 7.4
        text: >-
          <code>call_rcu()</code> / <code>call_srcu()</code> 现在可以从 NMI 和持有调度器锁的上下文调用（走 irq-work handler）；新增 atomic SRCU，读者关抢占、grace period 可在原子上下文发起；<code>rcu_barrier()</code> 也开始等待 <code>kfree_rcu()</code> 的回调与处理。
          <a href="https://lore.kernel.org/lkml/<720d335d-17f1-48e7-b5e6-49352712cdca@paulmck-laptop>/">原文</a>
      - label: 合并窗口
        text: >-
          RCU 与 driver core 同日发出 7.4 的 pull request，7.4 合并窗口已经打开。接下来几天会看到各子系统集中提交，日报会以「进了哪些」而不是「发了哪些」为主线。
          <a href="https://lore.kernel.org/rust-for-linux/<DM72ZY5B2CHK.3CEOSQUBXTAHQ@kernel.org>/">driver core pull</a>

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: C-PHY
        text: MIPI 的三相编码物理层，时钟嵌入数据流，最多三个 trio，16 bit / 7 symbol；D-PHY 则有独立时钟 lane。
      - label: settle count
        text: C-PHY 接收端在扫描 sync 前等待的 timer 周期数，由 sensor 的 T_PREPARE / T_PREAMBLE 决定，不能只从 link frequency 反推。
      - label: ecaps
        text: sched_ext 子调度器从父调度器获得的 CPU 能力授权，按 cid 记录。
      - label: DSQ
        text: sched_ext 的 dispatch queue；<code>scx_bpf_dsq_reenq_task()</code> 只重入队被标记的任务，其他任务保持原位。
      - label: MGLRU
        text: multi-gen LRU，按代际划分冷热页面的回收算法，取代传统的 active/inactive 双链表。
      - label: br_netfilter
        text: 让桥接帧走 iptables/ip6tables 的兼容层，与 ebtables、nftables 的 bridge family 无关。
      - label: GPUVM
        text: DRM 的 GPU 虚拟地址空间管理器，负责 BO 的 dma-resv 锁与 VM_BIND/exec 的锁序。
      - label: PKWM
        text: PowerVM 的 wrapping key 管理机制，用于 trusted key 的封存和解封。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
