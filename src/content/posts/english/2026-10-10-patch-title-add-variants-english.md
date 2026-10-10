---
title: "标题解析：「加个东西」有六种写法，选哪种看粒度"
date: "2026-10-10"
desc: "今日重点：标题解析——今天光「加东西」这一类标题就有六种写法：Add 对象 / Add X support for Y / add support for 一个宏 / 并列两项 / 纯名词 Support for / Add 一个回调。粒度决定写法。"
column: "english"
focus: "标题解析"
tags: ["标题解析", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🔍 标题解析</strong>——这是第三篇标题解析，今天换个角度：
      不讲动词表，讲<strong>「同一个意思的粒度差异」</strong>。
      今天光「加个东西」这一件事，邮件列表上就有六种写法——而它们不能互换，
      因为<strong>加的是「一个对象」还是「一种能力」还是「一个格式宏」，决定了标题长什么样</strong>。
  - type: divider
    label: "📖 今日标题（真实清单，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      [PATCH v5 0/6] rust: Add drm::JobQueue

      [PATCH 2/3] media: i2c: Add GC8034 image sensor driver

      [PATCH v2 00/20] drm/msm/dp: Add static HDR support for DP and eDP

      [PATCH] media: imx-mipi-csis: add support for MEDIA_BUS_FMT_YUYV8_1X16

      [PATCH 3/3] media: ipu-bridge: Add GalaxyCore GC5035 and GC8034

      [PATCH net-next v9 00/11] Support for onsemi's S2500 10Base-T1S MAC-PHY

      [PATCH 3/3] media: mt9v032: Add get_mbus_config subdev_pad_ops callback
  - type: paragraph
    text: >-
      出处：均取自 2026-10-10 的全内核雷达（lore.kernel.org 13 列表，近 24h）。
      各自的原文链接见下方逐条拆解与练习。
  - type: divider
    label: "🔍 六种写法：粒度决定形状"
    kind: section
  - type: toc
    items:
      - label: "① Add <对象> —— 加一个实体"
        text: "Add drm::JobQueue（一个 Rust 类型）、Add GC8034 image sensor driver（一个驱动）。<b>加的是「一个能独立命名、独立存在的东西」</b>时用这种：Add 后面直接跟那个东西的名字，不加 support、不加 for。这类标题最短，因为对象本身已经把话说完了。<a href=\"https://lore.kernel.org/linux-media/&lt;20261009191124.1022902-2-phasta@kernel.org&gt;/\">原文</a>"
      - label: "② Add X support for Y —— 加一种能力，且要指明给谁"
        text: "Add static HDR support for DP and eDP。注意这里 <b>support 出现在标题里，是因为「支持」本身是被加的东西</b>——HDR 不是一个独立对象，而是一种能力，且必须说清给哪两个接口（DP 和 eDP）。对照 ①：① 里不需要 support，因为驱动/类型就是那个东西本身。<a href=\"https://lore.kernel.org/dri-devel/&lt;20261009-msm-dp-hdr10-v2-0-1835d4966da3@radxa.com&gt;/\">原文</a>"
      - label: "③ add support for <一个宏> —— 细到一个格式常量"
        text: "add support for MEDIA_BUS_FMT_YUYV8_1X16。<b>粒度细到单个宏名</b>——给已有驱动多认一种 media bus 格式。这类改动很小，标题也就把那个宏原样写出来，不解释、不概括。看到标题里出现全大写的宏名，通常就是这种「给已有代码多认一个值」的补丁。<a href=\"https://lore.kernel.org/linux-media/&lt;20261009-csis_sam-v1-1-81f2b0fb76ef@oss.nxp.com&gt;/\">原文</a>"
      - label: "④ Add A and B —— 并列两项"
        text: "Add GalaxyCore GC5035 and GC8034。一次加两个同类对象时，用 and 并列，<b>不加逗号、不缩写</b>。注意这条标题没有任何 support/for 修饰——因为加的是两颗具体传感器，对象说话已经够了。<a href=\"https://lore.kernel.org/linux-media/&lt;20261009072733.39877-4-nicfio@gmail.com&gt;/\">原文</a>"
      - label: "⑤ Support for X —— 纯名词，没有动词"
        text: "Support for onsemi's S2500 10Base-T1S MAC-PHY。<b>整条标题没有动词</b>，只有名词短语。什么时候可以这么写？当交付的是一份<b>完整支持</b>（新驱动 + 绑定 + 接线，一整套），而不是对既有代码的增量改动时。它强调「这是一份支持」，与 Add X 的语境有别。提醒：这属少数派写法，新人仍建议用祈使句。<a href=\"https://lore.kernel.org/netdev/&lt;20261009-s2500-mac-phy-support-v9-0-dcefe1d0bf0d@onsemi.com&gt;/\">原文</a>"
      - label: "⑥ Add <回调名> —— 加一个接口实现"
        text: "Add get_mbus_config subdev_pad_ops callback。<b>加的是一个具名回调</b>，标题里连它属于哪个 ops 结构体都写出来了（subdev_pad_ops）。这类改动是「实现框架要求的某一条」，粒度比 ③ 粗、比 ① 细，写法上也不加 support。<a href=\"https://lore.kernel.org/linux-media/&lt;20261009102817.2421388-4-primoz.fiser@norik.com&gt;/\">原文</a>"
  - type: divider
    label: "✨ 辅助彩蛋：地道表达"
    kind: section
  - type: highlight
    title: "标题里的四个小词，各自承担一层信息"
    meta: "都出自今天这几个真实标题"
    points:
      - label: "a range of"
        text: "原文：fix <b>a range of</b> UAFs during rcu pathwalk。a range of 比 some 更有分量——<b>它暗示这些问题是成体系的、覆盖一个区间的</b>，不是零散碰到几个。写修复合集时，用 a range of 能让维护者知道这不是随机捡的。"
      - label: "caused by"
        text: "原文：UAFs during rcu pathwalk <b>caused by</b> non-rcu frees。归因句式。标题里出现 caused by，等于<b>当场回答了「谁引起的」</b>——维护者读到这里就不用再问「为什么路径上会有非 RCU 释放」。"
      - label: "redesign 与 rework"
        text: "原文：zram: <b>redesign</b> zcomp and <b>rework</b> backends。两个 re- 动词轻重不同：redesign 是重新设计（动结构），rework 是翻工重做（动实现）。<b>一条标题里同时用两个，说明作者在区分「哪部分改了设计、哪部分只是重写」</b>——这个区分对评审有用。"
      - label: "undo"
        text: "原文：make the mapping functions <b>undo</b> their partial mappings。undo 在这里不是「撤销操作」，而是「回滚已做的部分工作」——分配失败时把已经建好的半截映射拆掉。<b>内核里说回滚，undo 比 revert 更常指这种「自己清理自己」的动作</b>。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "给四个场景各写一条标题，注意粒度决定写法（都要带子系统前缀）：① 新增一个 Rust 的 DMA 缓冲类型；② 给已有的 SPI 驱动加对某个新传感器（型号 LX123）的支持；③ 让已有驱动多认一个 media bus 格式宏 MEDIA_BUS_FMT_RGB888_1X24；④ 给某个桥接驱动实现 atomic_check 回调。"
    answer: "参考（仿写示范，非真实标题）：① rust: Add dma::Buffer —— 加一个对象，Add 后直接跟名字，不用 support；② media: i2c: Add LX123 image sensor driver —— 新驱动用 Add <型号> driver；③ media: foo: add support for MEDIA_BUS_FMT_RGB888_1X24 —— 细到一个宏时用 add support for + 宏名原样；④ drm/bridge: bar: Add atomic_check bridge_funcs callback —— 加一个具名回调，把所属 ops 结构体写出来。四条的共同点：①②是「加对象」，③是「加一个值」，④是「加一个实现」——粒度不同，support/for 的有无也就不同。"
    source: "media: i2c: Add GC8034 image sensor driver / media: imx-mipi-csis: add support for MEDIA_BUS_FMT_YUYV8_1X16 / media: mt9v032: Add get_mbus_config subdev_pad_ops callback"
    link: "https://lore.kernel.org/linux-media/<20261009072733.39877-3-nicfio@gmail.com>/"
  - type: closing
    tagline: "每日一句：The noun you add decides the shape of the title — an object needs no support, a capability does."
    source: "仿写示范"
---
