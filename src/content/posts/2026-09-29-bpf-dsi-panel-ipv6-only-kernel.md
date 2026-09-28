---
title: "面板驱动交给 BPF：DRM 维护者的提案，被当场追问「panic 时屏幕怎么办」；内核第一次能只编 IPv6"
date: "2026-09-29"
desc: "Maxime Ripard 提议把 MIPI-DSI 面板的初始化序列搬进 BPF，照 HID-BPF 的路子走；Neil Armstrong 与 Rob Herring 立刻质疑 DT 绑定语义和早期启动显示。另一条：CONFIG_IPV4 终于可以关掉了。"
column: "daily"
tags: ["DRM", "media", "mm", "net", "PCI", "fs", "block", "Rust", "LSM"]
blocks:
  - type: hook
    text: >-
      今天最值得读的一条是<strong>一次还没落地的架构尝试</strong>：DRM 维护者 Maxime Ripard 把
      MIPI-DSI 面板的初始化序列做成 <strong>BPF 程序</strong>，让新屏支持不必再等内核补丁——发出来几小时，
      Neil Armstrong 和 Rob Herring 就分别从「早期启动显示」和「设备树绑定语义」两头发起了质疑。
      另一条，<strong>内核第一次可以被编译成只带 IPv6</strong>：16 帖把 IPv4 从通用 socket 与传输层里解耦出来。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-29/cover.png"
    alt: "封面 · 9月29日 · BPF 写进 MIPI-DSI 面板驱动"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "把面板初始化序列写进 BPF：DRM 维护者的提案，社区当场分成两派"
      - label: "头条"
        text: "CONFIG_IPV4 可以关掉了：16 帖把 IPv4 从通用网络栈里解耦"
      - label: "DRM"
        text: "Rockchip Analogix DP 原生死锁检测上到 v3（14 帖，RK3576 实测）；nova-core 加 NVKV 解码器"
      - label: "media"
        text: "GMSL 相机链路进 camss：MAX9296A 解串器场景的 RDI/VFE 修复到 v5；7 个 sensor 驱动批量修 runtime PM 泄漏"
      - label: "mm"
        text: "跨阶大 folio 截断会丢数据，修到 v5；collapse 引擎与调用方正式分家"
      - label: "net"
        text: "skb 生命周期的「门控 tracepoint」：不走 skb 扩展，改用 sk_buff 里的一位"
      - label: "PCI"
        text: "P2PDMA 到 v8（23 帖）补上 ATS 粒度；SPDM 的 Rust 实现到 v4（22 帖）"
      - label: "机制"
        text: "ublk 取消路径的 3 条竞态；iomap 错误处理回归"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-29/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 09-29 06:23 北京，近 24h 各板块真实计数：net 717 · DRM 404 · mm 304 · media 257 ·
      PCI 173 · fs 149 · Rust 88 · block 83 · LSM 54 · arch 37 · rt 33 · virtio 0。
      今天量最大的仍是 net，但最重的一条在 DRM —— 而且是一条<strong>还没被接受的设计提案</strong>，
      不是已合入的改动。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "把面板的初始化序列搬进 BPF：一个能绕开内核发布周期的面板驱动"
    meta: "〔09-29 00:22 北京〕· [PATCH 0/6] drm/bridge: Add a BPF-based MIPI-DSI panel driver（Maxime Ripard，6 帖 / 2554 行）"
    points:
      - label: 现状
        text: >-
          MIPI-DSI 是手机、平板、树莓派小屏那类<strong>串行显示接口</strong>。它的面板驱动高度模板化：
          拿 regulator 和 GPIO、按特定时序做一次复位脉冲、再发一串厂商给的 DSI 命令。
          真正的差异只剩初始化序列和上下电时序——但现实是<strong>几乎每块屏都要一个独立内核驱动</strong>。
      - label: 痛点
        text: >-
          这造成 OEM 与发行版的节奏错位：OEM 在生产中因供货问题换一块屏，需要几周内让它可用；
          而发行版收录一个新面板驱动可能要数年。厂商给的初始化序列本身又常常缺乏文档。
      - label: 方案
        text: >-
          作者照搬 <strong>HID-BPF</strong> 的模式：一个通用 panel 驱动，面板特有的行为由
          <strong>用户态在运行时加载的 BPF 程序</strong>提供。设备树用两个 compatible——
          面板专有字符串在前、<code>panel-mipi-dsi-bpf</code> 作兜底，通用驱动匹配兜底项，
          前一项用来决定加载哪个 BPF 程序。六个归一化的 regulator（vcc / iovcc / avdd / avee /
          elvdd / elvss）覆盖约 95% 的现有 MIPI-DSI 面板。
      - label: 为什么
        text: >-
          作者自己点出两处「不合常规」。其一：驱动一直 probe，但<strong>只有 BPF 程序注册后才报告为
          connected</strong>——备选方案是「用户态加载前不让驱动加载」，那会让其它输出在 initramfs 之前
          全部不可用，所以选了前者。其二：它写成了 <strong>bridge 驱动而不是 panel 驱动</strong>，
          因为 panel 驱动拿不到实现上述逻辑所需的 detect 回调。
      - label: 效益
        text: >-
          作者称驱动已完全可用，在树莓派 5 寸与 7 寸 Touch Display 2 上跑通；
          若被接受，后续计划是做一个由 udev 启动的用户态组件，识别设备上的面板并加载对应 BPF 程序。
      - label: 下一步
        text: >-
          这是 v1，且争议集中在两处硬约束上（见下方「社区反应」）。它能否推进，
          取决于早期启动的显示空白和 DT 绑定语义这两个问题能否给出可接受的答案。
    link: "https://lore.kernel.org/dri-devel/<20260928-drm-mipi-dsi-panel-ebpf-v1-0-5244926aace4@kernel.org>/"
  - type: paragraph
    text: >-
      <strong>社区反应：发出来几小时内就分成了两派。</strong>
      Neil Armstrong（Linaro）从早期启动切入：BPF 程序只能由用户态加载，
      这就<strong>依赖了用户态行为</strong>——如果 initramfs 因故没起来，
      就<strong>没有任何途径把错误显示出来</strong>；他同时提醒这「对于严肃应用来说太晚了，
      除非我们先解决 bootloader 到 Linux 显示引擎的交接」。他还在绑定那帖里直接反对：
      「我看不出这怎么能算有效的硬件描述，BPF 是软件实现，跟绑定无关」，
      并担心把时序搬进 blob 会<strong>变成带闭源许可限制的专有二进制，为了一块屏更快点亮而付出降级代价</strong>
      （<a href="https://lore.kernel.org/dri-devel/<6b80cb97-6706-412a-b013-9423f6f75153@linaro.org>/">原文</a>）。
      Laurent Pinchart 关心的也是同一件事：用户态可用之前，<strong>oops 的现场怎么打到屏幕上</strong>
      （<a href="https://lore.kernel.org/dri-devel/<20260928181241.GB210522@killaraus.ideasonboard.com>/">原文</a>）。
      HID-BPF 的作者 Benjamin Tissoires 则替这条路辩护：BPF 默认可以要求程序是
      <strong>GPL 兼容</strong>的，闭源许可那条不成立；而且 BPF 目标文件比二进制 blob
      <strong>容易反汇编得多</strong>，一个 pass 就近乎拿到源码
      （<a href="https://lore.kernel.org/dri-devel/<arqhwHiVf00j94J7@beelink>/">原文</a>）。
      Rob Herring 针对绑定提出更基础的问题：既然一定要有面板专有的第一个 compatible，
      那第二个兜底项意义何在？而且总该先挑一块已经在树里的面板转换过去做样例
      （<a href="https://lore.kernel.org/dri-devel/<20260928204059.GA515872-robh@kernel.org>/">原文</a>）。
      他的机器人在同一线程里报出了 dt_binding_check 失败：示例节点与既有面板 schema 冲突、
      compatible 过长、缺少必需属性。
      <small>这条线索的价值不在于结论，而在于它把一个问题摆上台面：
      内核的「新硬件支持」是否必须绑定在「改内核」这一条路径上。</small>
  - type: headline
    title: "CONFIG_IPV4 可以关掉了：把 IPv4 从通用网络栈里解耦出来"
    meta: "〔09-29 03:31 北京〕· [PATCH 00/16 net-next v2] Allow compiling an IPv6-only kernel network stack（Fernando Fernandez Mancera，16 帖）"
    points:
      - label: 现状
        text: >-
          历史上 IPv4 与通用的 socket 层、传输层缠在一起——很多通用代码默认「下面一定有 IPv4」，
          于是 <code>CONFIG_IPV4</code> 事实上关不掉。
      - label: 痛点
        text: >-
          对严格 IPv6-only 的部署、受限环境和专用设备来说，这部分代码既用不上又要维护，
          还构成额外的攻击面。作者给出的量化依据：<strong>2025 年以来发布的 CVE 中，
          0.3%（32 个）严格与 IPv4 代码相关</strong>——比例不高，但用不上的用户应当有权关掉它。
      - label: 方案
        text: >-
          把 Core 网络基础设施与 IPv4 解耦：对有硬依赖的子系统加<strong>条件编译保护</strong>，
          关掉时相关报文处理例程与路由钩子退化为返回标准错误码的桩函数；
          传输层的 <code>INDIRECT_CALL_INET</code> 宏做了改造，
          在不拖慢双栈快路径的前提下安全跳过 IPv4 函数指针；UDP、RAW、ICMP、Ping 各自做了代码拆分。
      - label: 效益
        text: >-
          内核第一次可以真正编译成 IPv6-only。作者还对每一个新增了
          <code>depends on IPV4</code> 的 Kconfig 符号做了审计，
          区分「真实的链接期硬依赖」与「只是保守起见被门控」的选项——后者可以放开。
      - label: 下一步
        text: >-
          到 v2，说明首轮评审意见已在消化。这类「把一个大子系统从通用层里剥出来」的重构，
          通常要过几个合并窗口，且每一处桩函数的返回值语义都会被逐个推敲。
    link: "https://lore.kernel.org/netdev/<20260928193046.6698-1-fmancera@suse.de>/"
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "Rockchip Analogix DP 的原生 HPD 检测：14 帖到 v3，RK3576 实测"
    meta: "〔09-28 16:15 北京〕· [PATCH v3 00/14] Add HPD support for Rockchip Analogix DP（Damon Ding）"
    points:
      - label: 定位
        text: >-
          HPD（Hotplug Detect，热插拔检测）是 DP 接口知道自己被插拔的机制。
          在 Rockchip 平台上，Analogix DP 控制器的原生 HPD 引脚要产生中断，
          <strong>控制器必须保持供电、时钟和已初始化状态</strong>。
      - label: 做法
        text: >-
          旧驱动在 bridge enable/disable 时才开关 IRQ，于是显示流水线不活跃时<strong>根本没有 HPD 检测</strong>；
          mute/unmute/clear 例程也无条件操作所有 HPD 中断位，粒度太粗。这一版把 IRQ 与
          pm_runtime 管理重排到 bind/unbind，加上 <code>IRQF_ONESHOT</code> 消除
          hardirq 与线程化处理程序之间对中断屏蔽寄存器的读改写竞态，
          并用位掩码方案把中断类型检测细化到可按事件控制，
          给 Rockchip 平台配上 <code>HOTPLUG_CHG</code> 中断与 2ms HPD 去毛刺。
      - label: 效益或下一步
        text: >-
          作者在 <strong>RK3576</strong> 上把原生 HPD 引脚与 GPIO HPD 两种配置都测过了。
          系列还顺带把下一级 bridge 解析到 <code>bridge-&gt;next_bridge</code>、
          并让下游 bridge 的 HPD 事件（如带 <code>hpd-gpios</code> 的 dp-connector）
          走 <code>.hpd_notify</code> 回调。
    relevance: >-
      Rockchip 平台上 DP 输出的热插拔可靠性问题，对做同类板级显示链路的场景有直接参照价值。
    link: "https://lore.kernel.org/dri-devel/<20260928081418.3605775-1-damon.ding@rock-chips.com>/"
  - type: highlight
    title: "nova-core 添 NVKV 解码器：Rust 写的 NVIDIA 驱动继续补功能块"
    meta: "〔09-28 16:45 北京〕· [PATCH v3 0/8] gpu: nova-core: add NVKV codec"
    points:
      - label: 定位
        text: >-
          nova-core 是 NVIDIA GPU 的 Rust 开源驱动。NVKV 是其中负责
          <strong>视频编解码</strong>的那部分功能块。
      - label: 做法
        text: >-
          8 帖新增 NVKV codec 支持，到 v3 说明前两轮评审意见已消化。
      - label: 效益或下一步
        text: >-
          Rust GPU 驱动这条线在持续推进——同一天还有命令队列、固件接口等多个方向。
          每加一个功能块都在实测 Rust 抽象的边界够不够用。
    relevance: >-
      新增功能块如何切分抽象层，是 Rust 驱动在本阶段最有参考价值的部分。
    link: "https://lore.kernel.org/dri-devel/<20260928-b4-nvkv-v3-0-f04504c262c2@nvidia.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<cover.1790552614.git.daniel@makrotopia.org>/"
        text: "it6505 桥接芯片 DP 音频支持 + shared-DAI 修复到 v8（14 帖）"
        time: 09-28 07:49
      - link: "https://lore.kernel.org/dri-devel/<20260928085724.41660-1-tzimmermann@suse.de>/"
        text: "fbcon / vgacon / vt 抽出共用文本光标 helper，到 v3（5 帖）"
        time: 09-28 16:57
      - link: "https://lore.kernel.org/dri-devel/<20260928-separate_gpu_kms-v4-1-3f33175de133@oss.qualcomm.com>/"
        text: "drm/msm：separate_gpu_kms 默认改为 auto 选择，到 v4"
        time: 09-28 14:59
      - link: "https://lore.kernel.org/dri-devel/<20260926163123.39217-1-dillona@gmail.com>/"
        text: "drm/qxl：shared-primary 生命周期与 source packing 修复，到 v3（5 帖）"
        time: 09-28 16:43
      - link: "https://lore.kernel.org/dri-devel/<20260928005301.367977-1-matheus.aalmeida@inf.ufrgs.br>/"
        text: "drm/vkms：支持更多像素格式，并修 RGB565 回归（5 帖）"
        time: 09-28 16:43
  - type: divider
    label: "📰 media 摄像头"
    kind: section
  - type: highlight
    title: "GMSL 相机链路进 camss：解串器场景下的 RDI/VFE 修复到 v5"
    meta: "〔09-28 20:15 北京〕· [PATCH v5 0/6] media: qcom: camss: fixes for several cameras behind a CSI-2 bridge（Hitesh Patel）"
    points:
      - label: 定位
        text: >-
          这套改动要解决的问题是：在 RB3 Gen2（QCS6490 / SC7280）视觉夹层板上跑
          <strong>两颗 GMSL 相机</strong>——传感器与 SoC 之间隔着一颗
          <strong>MAX9296A 解串器</strong>（deserializer），串行器侧是 MAX96717。
          注意本次提交<strong>只含 SoC 侧</strong>：解串器/串行器驱动与 AR0234、IMX900 传感器驱动仍在树外。
      - label: 做法
        text: >-
          前 3 帖修的是「两条 RDI 线在同一个 VFE 上同时出流」的问题——只要 CSID 解复用多个
          虚拟通道就会命中，<strong>不限于桥接场景</strong>：VFE 17x 的中断处理会丢掉
          write master 的 buffer done 事件、把第二条线交给错误的 write master、
          停掉一条线时把底下的 VFE 一起复位。第 5 帖解决「假设传感器就是 CSI-2 发送方」这个错误前提：
          接收端该被编程到多快，取决于<strong>谁在驱动这条总线</strong>，
          而 <code>v4l2_get_link_freq()</code> 本来就知道怎么问。
      - label: 效益或下一步
        text: >-
          第 6 帖允许一个拥有多路 CSI-2 输出的发送器把每路输出各自链到自己的 CSIPHY。
          对做 GMSL2 链路的人来说，这几条修复正好落在「解串器把多路虚拟通道解出来之后，
          SoC 侧接不住」的那一段。
    relevance: >-
      MAX9296A + MAX96717 是 GMSL2 链路的常见组合；这套 SoC 侧修复对自研 SerDes 链路的
      多路虚拟通道配置有直接参照意义。
    link: "https://lore.kernel.org/linux-media/<20260928121508.1404808-1-hitesh@ebytelogic.com>/"
  - type: highlight
    title: "7 个 sensor 驱动批量修同一个 runtime PM 泄漏，且带 Assisted-by: LLM"
    meta: "〔09-28 22:12 北京〕· [PATCH] media: i2c: ov5647 / ov5670 / ov2740 / ov13b10 / og01a1b / hi556 / ak7375"
    points:
      - label: 定位
        text: >-
          问题出在驱动 <code>remove()</code> 与 runtime PM 的交接处。
          以 ov5647 为例：它的 <code>remove()</code> 只调了 <code>pm_runtime_disable()</code>，
          而后者<strong>只是阻止未来的自动 suspend/resume，并不会强制执行最后一次 suspend</strong>。
      - label: 做法
        text: >-
          如果设备在被解绑时确实处于 runtime-active（正在出流，或有打开的子设备 fd 持着 PM 引用），
          那么时钟、GPIO 与 regulator 就停在活跃状态，<strong>且再没有任何代码路径会去释放它们</strong>。
          修法是在 <code>pm_runtime_disable()</code> 之后，用
          <code>pm_runtime_status_suspended()</code> 判断——没挂起才调 <code>*_power_off()</code>，
          这样常见的「本来就已挂起」路径不会被重复下电，与同门 imx412.c 的写法一致。
      - label: 效益或下一步
        text: >-
          同一位作者当天把同一类修复铺到了 <strong>7 个 sensor 驱动</strong>上
          （ov5647、ov5670、ov2740、ov13b10、og01a1b、hi556、ak7375），属于典型的
          「一个模式扫一批驱动」。另一处值得注意的细节是补丁带
          <code>Assisted-by: LLM</code> 标签——AI 辅助产出的补丁正在以这种可追溯的方式进入列表。
    relevance: >-
      remove() 与 runtime PM 的交接是 sensor 驱动的高发缺陷区；这个「disable 不等于 suspend」
      的坑对任何带 runtime PM 的驱动都成立。
    link: "https://lore.kernel.org/linux-media/<20260928141232.2443546-1-congnt264@gmail.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20260928-sk5jn5-v5-0-19aa0a0a68eb@oss.qualcomm.com>/"
        text: "三星 S5KJN5 图像传感器驱动到 v5（2 帖）"
        time: 09-28 15:55
      - link: "https://lore.kernel.org/linux-media/<cover.1790602223.git.asml.silence@gmail.com>/"
        text: "dma-buf 注册进 io_uring 到 v7（13 帖）——上一版是 09-22 的头条，本期继续迭代"
        time: 09-28 21:32
      - link: "https://lore.kernel.org/linux-media/<20260928215021.819064-1-jordan.mymail@gmail.com>/"
        text: "uvcvideo：OBSBOT Tiny 2 / Tail 2 的云台实时回读，到 v4（4 帖）"
        time: 09-29 05:50
      - link: "https://lore.kernel.org/linux-media/<20260928121230.35359-1-kartikey406@gmail.com>/"
        text: "media: imon：修 display_close 经 dev_dbg 触发的 use-after-free（v2）"
        time: 09-28 20:12
      - link: "https://lore.kernel.org/linux-media/<tencent_EAFEF76E0657C04EE304E09B471BF8AA0908@qq.com>/"
        text: "media: gspca：修 build_isoc_ep_tb() 的栈溢出"
        time: 09-28 19:07
  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "跨阶大 folio 被截断时会丢数据：修到 v5"
    meta: "〔09-28 20:17 北京〕· [PATCH v5 0/4] mm/truncate: fix data loss when truncating straddling large folios（Zhang Yi）"
    points:
      - label: 定位
        text: >-
          出问题的路径是 <code>truncate_inode_pages_range()</code>：文件被打洞或截断时，
          <code>truncate_inode_partial_folio()</code> 会把一个<strong>大 folio 切开</strong>，
          好让调用方丢掉落在范围内的子 folio、保留范围外的尾部。
      - label: 做法
        text: >-
          系列修的是这条路径上<strong>三个各自都能丢掉有效尾部</strong>的缺陷。
          其中第一个的成因很具体：当 mapping 的 <code>min_order</code> 非零时，
          <code>folio_split()</code> 会停在 <code>min_order</code> 而不是 order 0，
          于是<strong>按页粒度算出来的边界可能落在一个按 min_order 对齐的子 folio 内部</strong>，
          截断循环会把整块丢掉——连有效的尾部一起。
          修法是让截断边界按 mapping 的最小 folio 阶数<strong>向内对齐</strong>。
      - label: 效益或下一步
        text: >-
          这组问题是在<strong>即将到来的 ext4 + iomap buffered I/O 转换</strong>中被抓到的——
          也就是说它是新特性落地前的先决修复。到 v5 说明前四轮意见已消化。
    relevance: >-
      大 folio 与按页粒度的旧代码混用时，「对齐单位不一致」是系统性的风险点，
      不限于 truncate 这一条路径。
    link: "https://lore.kernel.org/linux-mm/<20260928120833.3440834-1-yi.zhang@huaweicloud.com>/"
  - type: highlight
    title: "collapse 引擎与调用方正式分家：13 帖重构到 v4"
    meta: "〔09-28 18:06 北京〕· [PATCH v4 00/13] mm/collapse: separate a collapse from its callers（Kiryl Shutsemau / Meta）"
    points:
      - label: 定位
        text: >-
          <code>khugepaged.c</code> 同时装着 <strong>collapse 引擎</strong>和
          <strong>请求 collapse 的调用方</strong>，两者互相伸手——这是 THP
          （透明大页）相关代码长期难改的根因之一。
      - label: 做法
        text: >-
          作者列了三个具体症状：collapse 路径上有<strong>十六处测试</strong>去读
          <code>cc-&gt;is_khugepaged</code> 来判断自己能做什么，
          而每一个决定其实在调用方发起请求前就已经定了；
          <code>collapse_single_pmd()</code> 一次调用里干了两半的活，
          中途还放下 <code>mmap_lock</code>，而<strong>是哪条路径放的锁调用方看不见</strong>，
          只能靠返回的 bool 自己记账；<code>MADV_COLLAPSE</code> 的实现
          （遍历用户区间、逐 PMD 循环、errno 翻译）也长在守护进程的文件里。
          改法是：<strong>画出这条线</strong>——用一份 policy 表达调用方允许什么，
          以锁为界把调用拆成两半，并把系统调用搬到 <code>madvise.c</code>。
      - label: 效益或下一步
        text: >-
          作者说明这是他此前承诺「前置完成的清理」中的第一组。
          对想改 THP/collapse 行为的人来说，这类重构降低的是<strong>改动的影响面半径</strong>。
    relevance: >-
      「谁负责记账、谁负责策略」的边界不清，是内核里反复出现的重构主题；
      这个案例的切分方式（以锁为界）有普适参考价值。
    link: "https://lore.kernel.org/linux-mm/<20260928100630.21870-1-kirill@shutemov.name>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-mm/<20260928-crash-memaction-upstream-20260921-v3-0-e511e9ee2329@jaseg.de>/"
        text: "CRASH_MEMACTION 到 v3（12 帖）：向 kdump 内核描述内存页（前身是 CRASH_WIPE_SECRETS）"
        time: 09-29 01:18
      - link: "https://lore.kernel.org/linux-mm/<20260928081900.4187482-1-alex@ghiti.fr>/"
        text: "mm/zswap RFC：让 shrinker 回写能与 iocost 协同（4 帖）"
        time: 09-28 16:19
      - link: "https://lore.kernel.org/linux-mm/<20260928-vmalloc_dump_obj-v4-0-6f288a431edc@linux.dev>/"
        text: "mm/vmalloc：修 vmalloc_dump_obj 的虚拟地址查找，到 v4（2 帖）"
        time: 09-28 16:16
      - link: "https://lore.kernel.org/linux-mm/<20260928024723.87708-1-lizhe.67@bytedance.com>/"
        text: "mm/hugetlb：修未共享 PMD 上过宽的 MMU notifier，到 v4"
        time: 09-28 10:48
  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "skb 生命周期的门控 tracepoint：不走 skb 扩展，改用 sk_buff 里的一位"
    meta: "〔09-28 19:40 北京〕· [PATCH net-next 00/15] Gated tracepoints for skb lifecycle (free+clone)（Jakub Sitnicki / Cloudflare）"
    points:
      - label: 定位
        text: >-
          这是 Alexei 提的想法：给 skb（网络数据包缓冲）的生命周期事件做
          <strong>「门控」tracepoint</strong>，作为「用 skb 扩展给 BPF 挂元数据」这条路的替代方案。
          本期先做<strong>消费/丢弃</strong>与<strong>克隆/拷贝</strong>两组事件。
      - label: 做法
        text: >-
          作者说实现相当直接，但记录了走过的弯路：一开始尝试复用 skb 扩展——用
          <code>skb-&gt;active_extensions</code> 里剩下的空闲位配合
          <code>skb_ext_reset / put / copy</code> 路径，结果发现方向错了：
          「一个不需要在 <code>skb-&gt;extensions</code> slab 里分配空间的特殊扩展」
          会让逻辑变得更乱。于是退回最简单的方案——<strong>直接在 <code>sk_buff</code> 里占一位</strong>，
          从核心网络代码直接加回调。
      - label: 效益或下一步
        text: >-
          作者同时更正了自己上周五贴出的性能数据：那批数字被
          <strong>KVM halt polling 开着</strong>这件事严重污染了，出现过
          「一个普通 TC 包计数器测出荒谬数值」的情况，因此本轮重新给出结论。
          这种公开撤回数据的做法本身值得注意。
    relevance: >-
      「给既有结构体加一位 vs. 复用扩展机制」是内核里反复出现的取舍；
      作者把走错的那条路和原因一起写进了 cover letter。
    link: "https://lore.kernel.org/netdev/<20260928-bpf-meta-gated-tracepoints-v1-0-844dbf3e1edf@cloudflare.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/netdev/<arqDuiD4Q4GWOFBc@volt-roccet-vm>/"
        text: "TCP ROCCET 拥塞控制模块到 v9，仍在列表上迭代"
        time: 09-28 23:12
      - link: "https://lore.kernel.org/netdev/<20260928-netcons-fixes-v1-0-bb5ffe5e698a@gmail.com>/"
        text: "netconsole：修 target 使能竞态与 configfs 读取锁（4 帖）"
        time: 09-29 02:01
      - link: "https://lore.kernel.org/netdev/<20260928-hsr_ptp-v7-0-d55d304d9a7e@linutronix.de>/"
        text: "hsr：给收发 skb 附加额外信息到 v7（8 帖）"
        time: 09-28 20:39
      - link: "https://lore.kernel.org/netdev/<20260928070423.202-1-javen_xu@realsil.com.cn>/"
        text: "r8169：为 RTL8127 增加 RSS 支持，到 v15（7 帖）"
        time: 09-28 15:05
      - link: "https://lore.kernel.org/netdev/<20260928224454.483072-1-anthony.l.nguyen@intel.com>/"
        text: "i40e/ice/iavf：修 netdev lock 改动后的 VF bonding（pull request，3 帖）"
        time: 09-29 06:44
      - link: "https://lore.kernel.org/netdev/<20260928020420.3097018-1-willemdebruijn.kernel@gmail.com>/"
        text: "sock_sendmsg_nosec 里的 BUG_ON EIOCBQUEUED 降级为普通处理"
        time: 09-28 10:04
  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "P2PDMA 到 v8（23 帖）：补上 ATS 的按设备 / 按映射粒度"
    meta: "〔09-28 19:19 北京〕· [PATCH v8 00/23] PCI/P2PDMA: Route peer-to-peer DMA by TLP class（Leon Romanovsky / NVIDIA）"
    points:
      - label: 定位
        text: >-
          这是 09-21 那条头条系列的<strong>后续版本</strong>：P2PDMA 让 PCIe 设备之间不经 CPU 内存
          直接搬数据，而「一条路径能不能走 P2P」要按 <strong>TLP 类别</strong>逐项判断，
          而不是一刀切。本期从 v7 的 19 帖长到 23 帖。
      - label: 做法
        text: >-
          作者的表述是：在路径分叉处按方向求值，<strong>一次遍历决定所有类别</strong>，
          把 provider 暴露给 dma-buf 的导入方，并让 mlx5 去问而不是假设。
          v8 相对 v7 新增了处理 <strong>ATS 按设备 vs. 按映射</strong>选项的补丁
          （ATS = Address Translation Service，PCIe 的地址翻译服务），
          并去掉了一个「文档化 pdev-&gt;p2pdma 生命周期规则」的补丁
          （作者认为在 p2pmem 修复之后它没有价值）。
      - label: 效益或下一步
        text: >-
          v8 又收到一个 Reviewed-by。这条线已经走了八版，
          属于「判断逻辑逐步逼近 PCIe 规范细节」的典型长跑。
    relevance: >-
      与 09-21 那期对照看，可以观察一条复杂补丁系列在评审中如何被逐版收敛。
    link: "https://lore.kernel.org/linux-media/<20260928-fix-p2p-acs-v4-0-v8-0-404453b9c435@nvidia.com>/"
  - type: highlight
    title: "SPDM 的 Rust 实现到 v4：22 帖"
    meta: "〔09-28 09:11 北京〕· [PATCH v4 00/22] lib: Rust implementation of SPDM（Alistair Francis）"
    points:
      - label: 定位
        text: >-
          SPDM（Security Protocol and Data Model）是 DMTF 定的
          <strong>设备认证与安全通信协议</strong>，在 PCIe 上用来做设备身份验证、
          测量与密钥交换。
      - label: 做法
        text: >-
          22 帖用 <strong>Rust 重写 SPDM 库</strong>，本期到 v4；
          系列里能看到 <code>lib: rspdm: Support SPDM get_certificate</code>
          这类按协议命令逐步补齐的补丁。
      - label: 效益或下一步
        text: >-
          Rust 进 <code>lib/</code> 而非只待在驱动层，是这条线值得关注的地方——
          协议栈这类需要严格内存安全与状态机正确性的代码，正是 Rust 的靶心。
    relevance: >-
      Rust 在核心里落地的位置正从「驱动」扩展到「通用库」，这是能力边界的实质变化。
    link: "https://lore.kernel.org/linux-pci/<20260928011123.450800-1-alistair.francis@wdc.com>/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<20260928165230.3397664-1-den@valinux.co.jp>/"
        text: "PCI: rcar-gen4：从链路断开中恢复并路由 Root Port 中断，到 v2（15 帖）"
        time: 09-29 00:53
      - link: "https://lore.kernel.org/linux-pci/<20260928-b4-fix-aer-memleaks-v5-0-ba6b94c9c9a6@google.com>/"
        text: "PCI/AER：修 ghes_estatus_pool 在错误处理路径上的内存泄漏，到 v5（3 帖）"
        time: 09-29 01:40
      - link: "https://lore.kernel.org/linux-pci/<CAPPWt=30acAVth+nR5kQ5JLuJ=LRTfmSBD2AjntNJgSvcVgkhQ@mail.gmail.com>/"
        text: "VMD bug：NVMe 控制器复位失败并报「can't derive routing for PCI INT A」"
        time: 09-29 02:58
  - type: divider
    label: "📰 fs / block / Rust / LSM"
    kind: section
  - type: highlight
    title: "ublk 把请求派发给已被取消的 io 命令：9 帖修 3 条竞态"
    meta: "〔09-29 00:01 北京〕· [PATCH 0/9] ublk: fix dispatch to canceled io commands（Josef Bacik）"
    points:
      - label: 定位
        text: >-
          ublk 是用 io_uring 在用户态实现块设备的框架。当内核把一个块请求派发给
          <strong>一个已经完成、且已被取消的 io 命令</strong>时，
          <code>ublk_queue_rq()</code> 会在 <code>io-&gt;cmd</code> 为 NULL 上崩溃。
      - label: 做法
        text: >-
          作者明确指出这是在两个既有修复<strong>旁边</strong>剩下的三条路径：
          <code>f7700a4415af</code> 修过 use-after-free、<code>1133b93fc7f6</code> 修过
          「首次 start 之前的 io_uring 退出路径」，而这一版覆盖的是
          STOP_DEV 后 START_DEV、FETCH 轮次部分完成后任务退出、
          以及恢复过程中队列任务先退出的三种情形。
      - label: 效益或下一步
        text: >-
          修法是让队列在 ready 转换时保持 canceling 状态，
          并在队列清掉自己的标志后立即清 <code>ub-&gt;canceling</code>，
          使后续取消能再次标记并静默这些队列。
    relevance: >-
      「在既有修复旁边还有几条同源路径」是竞态类缺陷的常见形态，
      作者把三条路径逐条编号列出的写法值得借鉴。
    link: "https://lore.kernel.org/linux-block/<20260928-b4-ublk-cancel-stop-v1-0-4a4360232a46@toxicpanda.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-fsdevel/<cover.1790342457.git.parri.andrea@gmail.com>/"
        text: "iomap：修错误处理回归，到 v3（4 帖）"
        time: 09-28 16:48
      - link: "https://lore.kernel.org/linux-fsdevel/<20260928091111.3986811-1-hch@lst.de>/"
        text: "Christoph Hellwig：用 bio_complete_in_task 做 iomap 错误上报"
        time: 09-28 17:11
      - link: "https://lore.kernel.org/linux-block/<20260928061417.1574676-1-yupeng0921@gmail.com>/"
        text: "nvmet：把命名空间 I/O 计费到 cgroup，到 v6（3 帖）"
        time: 09-28 14:14
      - link: "https://lore.kernel.org/linux-block/<20260928093512.3153646-1-cui.tao@linux.dev>/"
        text: "loop：把 queue limits 清理推迟到 workqueue，到 v6"
        time: 09-28 17:35
      - link: "https://lore.kernel.org/rust-for-linux/<20260928-dev-pin-init-sync-v1-0-e591c8e9cf0e@garyguo.net>/"
        text: "rust: pin-init 面向 7.4 的上游同步（3 帖）"
        time: 09-29 01:32
      - link: "https://lore.kernel.org/rust-for-linux/<20260928183925.1315274-1-chenhan0017.work@gmail.com>/"
        text: "rust: time：让 Delta 的除法与取余行为一致"
        time: 09-29 02:39
      - link: "https://lore.kernel.org/linux-security-module/<20260928190620.1154576-1-adrianox@gmail.com>/"
        text: "apparmor：在失败审计之前解析 pivotroot 路径"
        time: 09-29 03:06
      - link: "https://lore.kernel.org/linux-rt-devel/<20260928203445.72318-1-singhpra@juniper.net>/"
        text: "efivarfs：新增 nostatfs 挂载选项以跳过 QueryVariableInfo()，到 v4"
        time: 09-29 04:36
  - type: divider
    label: "📌 机制雷达：3 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "面板驱动的可编程化"
        text: >-
          头条那条的本质是把「驱动 = 内核代码」这个等式拆开：
          面板行为变成<strong>可独立于内核生命周期分发</strong>的 BPF 程序。
          这与 HID-BPF 同源，若成立，后续可能被复制到其他「驱动高度模板化」的子系统。
          <a href="https://lore.kernel.org/dri-devel/<20260928-drm-mipi-dsi-panel-ebpf-v1-0-5244926aace4@kernel.org>/">原文</a>
      - label: "把子系统从通用层里剥出来"
        text: >-
          IPv6-only 那条（16 帖）与 mm/collapse 那条（13 帖）是同一类工作：
          前者把 IPv4 从通用 socket / 传输层解耦，后者把 collapse 引擎从 khugepaged 里分家。
          两者都在为<strong>后续改动降低影响面半径</strong>。
          <a href="https://lore.kernel.org/netdev/<20260928193046.6698-1-fmancera@suse.de>/">原文</a>
      - label: "remove() 与 runtime PM 的交接"
        text: >-
          media 那批 7 个 sensor 驱动修的是同一个模式：
          <code>pm_runtime_disable()</code> 不等于「强制挂起一次」。
          这个坑对所有带 runtime PM 的驱动成立，而它今天在 7 个文件里同时出现，
          说明这类缺陷在树里还有存量。
          <a href="https://lore.kernel.org/linux-media/<20260928141232.2443546-1-congnt264@gmail.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "MIPI-DSI"
        text: >-
          移动产业处理器接口定义的<strong>串行显示接口</strong>，
          手机、平板与树莓派那类小屏普遍用它连接 SoC 与面板。
          它只传图像与控制命令，不含面板的上电时序与初始化序列——后者要靠驱动补。
      - label: "HID-BPF"
        text: >-
          让 HID（人机接口设备，键盘鼠标等）的行为由<strong>用户态加载的 BPF 程序</strong>修正的机制，
          目的是不必为每个设备的怪癖改内核。本期头条的面板驱动明确照搬了这个模式。
      - label: "HPD（Hotplug Detect）"
        text: >-
          DP/HDMI 接口用来感知「线被插上/拔下」的信号。
          它通常是一根独立引脚，SoC 侧可以轮询也可以接成中断——后者要求控制器保持供电与时钟。
      - label: "解串器 / 串行器（deserializer / serializer）"
        text: >-
          GMSL、FPD-Link 这类车载/工业相机链路是成对使用的：
          串行器在摄像头端把并行信号并成一路高速串行，解串器在 SoC 端把它还原成
          MIPI CSI-2 输出。本期 camss 那条里的 MAX96717 / MAX9296A 就是这样一对。
      - label: "folio"
        text: >-
          内核用 <code>struct page</code> 描述单个物理页，用 <strong>folio</strong>
          描述「一组连续、被当作一个单位管理的页」。大 folio 能减少管理开销，
          但与按页粒度写的旧代码混用时，容易在<strong>对齐单位</strong>上出分歧。
      - label: "ATS（Address Translation Service）"
        text: >-
          PCIe 的地址翻译服务：设备可以缓存地址翻译结果，
          避免每次 DMA 都走一遍 IOMMU。本期 P2PDMA 的 v8 新增了按设备与按映射两种粒度的处理。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
