---
title: "V4L2 相机链路的来龙去脉：为什么是「设备图」+「异步绑定」"
date: "2026-09-29"
desc: "站长手记：用本地内核镜像把 V4L2 相机链路的几个机制倒查回源头——media controller 为什么是图、v4l2-async 为什么必须异步、GMSL 驱动为什么长在 media 里。附每个节点的 commit 与合入版本。"
column: "journal"
tags: ["教程"]
blocks:
  - type: hook
    text: >-
      平时看的内核资料大多在讲「这个接口怎么用」。但调相机链路调久了会发现，真正卡人的是
      <strong>「为什么非得这么设计」</strong>——为什么链路要画成一张图？为什么绑定必须异步？
      为什么一颗 GMSL 去串行器的驱动长在 <code>drivers/media/i2c/</code> 而不是某个总线子系统？
      这篇把这三个问题倒查回源头，<strong>每个结论都附 commit 与合入版本</strong>（用本地 mainline 镜像查的）。
  - type: divider
    label: "🔍 机制一：为什么要画成「图」"
    kind: primary
  - type: paragraph
    text: >-
      先给结论：<strong>media controller 不是为 V4L2 造的，是为「多种媒体设备共用一套拓扑描述」造的。</strong>
      它的引入 commit 写得很直白——
  - type: quote
    text: >-
      The media_device structure abstracts functions common to all kind of media devices
      (v4l2, dvb, alsa, ...). It manages media entities and offers a userspace API to discover
      and configure the media device internal topology.
  - type: highlight
    title: "media controller 的出身"
    meta: "Linux v2.6.39 · 2009-12-09"
    points:
      - label: "commit"
        text: "<code>176fb0d108f7</code>「[media] media: Media device」，作者 <b>Laurent Pinchart</b>（后续长期担任 V4L2/media 维护者）。"
      - label: "引入原因"
        text: "V4L2、DVB、ALSA 各自的内部拓扑都需要描述，与其各造一套，不如抽一层公共的「实体 + 端口 + 连接」。这就是 entities / pads / links 的由来。"
      - label: "对你的意义"
        text: "相机链路上你写的 <code>media-ctl --print-dot</code>、subdev 的 sink/source pad、link 的 enable/disable——都是这一层抽象的具体化。它不是 V4L2 的附属品，是和 V4L2 平级的一层。"
  - type: divider
    label: "🔍 机制二：为什么绑定必须是异步的"
    kind: section
  - type: paragraph
    text: >-
      这是最容易被忽略、也最能解释「为什么我的 probe 顺序不对」的一个。v4l2-async 的引入 commit
      把因果写得很清楚：
  - type: quote
    text: >-
      Currently bridge device drivers register devices for all subdevices synchronously,
      typically, during their probing. [...] but this approach cannot be used with
      intrinsically asynchronous and unordered device registration systems like the
      Flattened Device Tree.
  - type: highlight
    title: "v4l2-async 的出身"
    meta: "Linux v3.11 · 2013-01-08"
    points:
      - label: "commit"
        text: "<code>e9e310491bdb</code>「[media] V4L2: support asynchronous subdevice registration」，作者 <b>Guennadi Liakhovetski</b>；Ack 来自 Hans Verkuil 与 Laurent Pinchart（两位都是 media 核心维护者）。"
      - label: "为什么必须改"
        text: "老做法是：bridge 驱动在自己的 probe 里<b>同步创建并等待</b>各个 subdevice。在「板级文件写死设备」的年代这没问题；但设备树（DT）下，各设备的 probe 顺序<b>本质上无法保证</b>——谁也说不准 sensor 先起来还是 CSI-2 接收器先起来。"
      - label: "换成了什么"
        text: "subdevice 驱动自己向框架注册；bridge 驱动改为注册<b>通知回调</b>，等相应事件到了再完成绑定。这就是今天 <code>v4l2_async_register_subdev()</code> 与 <code>v4l2_async_nf_*</code> 那一套的来历。"
      - label: "对你的意义"
        text: "你遇到的「sensor 和 bridge 谁先 probe」不是 bug，是<b>设计上就允许无序</b>。debug 探索顺序时，与其盯 probe 次序，不如去看 async notifier 的匹配规则（compatible / fwnode）对不对。"
  - type: divider
    label: "🔍 机制三：为什么 GMSL 驱动长在 media 里"
    kind: section
  - type: paragraph
    text: >-
      GMSL（Gigabit Multimedia Serial Link）是 Maxim 的串行链路，FPD-Link 是 TI 的对标方案。
      两者都是「**串行器 —— 同轴/STP 线 —— 去串行器**」的结构，车上摄像头基本都走这条路。
      一个自然的问题是：它们本质上是一条**物理链路**，为什么驱动不在某个总线子系统，而是在
      <code>drivers/media/i2c/</code>？
  - type: paragraph
    text: >-
      答案是：<strong>它们在 media 框架里是当作「subdevice」存在的</strong>——去串行器对上游
      暴露 CSI-2 输出 pad、对下游通过 I2C 隧道管理挂着的 sensor，本身就是链路中间的一站。
      所以它不需要新的子系统，用现有的 v4l2-subdev + media controller 就能表达清楚。
      这也是为什么你调 GMSL 链路时，<b>媒体图那一套概念（pad / link / format propagation）全都适用</b>。
  - type: divider
    label: "🕰️ GMSL / FPD-Link 在 mainline 的完整时间线"
    kind: primary
  - type: toc
    items:
      - label: "v5.9 · 2020-06"
        text: "<b>GMSL1 进场</b>：<code>max9271</code>（串行器）与 <code>max9286</code>（4 通道去串行器，同轴/STP 输入、CSI-2 输出、支持多摄同步）。作者 Kieran Bingham（Renesas / Ideas on Board）。同日还有配套的 RDACM20 相机驱动。"
      - label: "v6.6 · 2023-06"
        text: "<b>FPD-Link III 进场</b>：TI 家的 <code>ds90ub913</code> / <code>ds90ub953</code>（串行器）与 <code>ds90ub960</code>（去串行器）一次性到位。作者 Tomi Valkeinen。"
      - label: "v6.11 · 2024"
        text: "Maxim 新一代 <code>max96717</code>（串行器）与 <code>max96714</code>（去串行器）入树。"
      - label: "至今未入树"
        text: "<b><code>max96712</code>（GMSL2 去串行器）仍不在 mainline</b>——这就是当前在列表上评审的 GMSL2/3 系列（已到 v16）。"
  - type: divider
    label: "🎯 现在到哪了，以及你能做什么"
    kind: section
  - type: toc
    items:
      - label: "GMSL2/3 系列的处境"
        text: "该系列的技术内容基本收敛，卡点已经<b>从代码转移到工具链</b>：CI 里的 smatch 告警是误报，修复在 smatch 的 devel 分支但没进 master。这是大系列常见的「最后一公里」。"
      - label: "为什么这对你是机会"
        text: "GMSL2 上游化一旦完成，就是 mainline 里<b>第一个完整的 GMSL2/3 参考实现</b>。跟进它的评审过程，等于免费看一遍「一个 serdes 驱动要满足哪些约束才能进主线」——这比事后读合入的代码信息量大得多。"
      - label: "可以怎么动手"
        text: "不必一上来就写驱动。先用本地内核镜像把已有驱动（<code>ds90ub960</code> / <code>max9286</code>）的实现和当前系列逐条对照，看新增了哪些约束——这份差异清单本身就是可提交的文档类补丁。"
  - type: divider
    label: "📖 方法说明：这些结论是怎么来的"
    kind: section
  - type: paragraph
    text: >-
      上面每个 commit 与「合入版本」都不是查资料得出的，而是用<b>本地内核镜像</b>倒查的：
      <code>git log --reverse -- &lt;路径&gt;</code> 找到首次引入的 commit，再 <code>git tag --contains</code>
      定位它落在哪个版本。这样做的好处是结论可复核——你可以自己跑一遍验证。
  - type: closing
    tagline: "读机制别只读接口，往回倒查一步：它当初是为了解决什么才被造出来的。"
    source: "站长手记 · 教程"
---
