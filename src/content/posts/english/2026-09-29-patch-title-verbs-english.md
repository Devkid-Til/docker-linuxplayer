---
title: "标题解析：祈使句之外——内核标题的动词库比你想的大"
date: "2026-09-29"
desc: "今日重点：标题解析——从今日 9 个真实补丁标题里，学 Allow doing、separate A from B、Route X by Y、fix X when Y、fixes for 等六种句式，以及一个不用祈使句的例外。"
column: "english"
focus: "标题解析"
tags: ["标题解析", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🔍 标题解析</strong>——上一篇标题解析讲的是基本功（子系统前缀 + 祈使动词 + Add/fix/make）。
      今天往前走一步：<strong>当天这 9 个真实标题里，动词和句式几乎没有重样的</strong>。
      看懂它们之间的差别，你写标题时就不会只剩 Add 和 fix 两个词。
  - type: divider
    label: "📖 今日标题（真实清单，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      [PATCH 00/16 net-next v2] Allow compiling an IPv6-only kernel network stack

      [PATCH v4 00/13] mm/collapse: separate a collapse from its callers

      [PATCH v8 00/23] PCI/P2PDMA: Route peer-to-peer DMA by TLP class

      [PATCH v5 0/4] mm/truncate: fix data loss when truncating straddling large folios

      [PATCH v5 0/6] media: qcom: camss: fixes for several cameras behind a CSI-2 bridge

      [PATCH net-next 00/15] Gated tracepoints for skb lifecycle (free+clone)

      [PATCH v4 00/22] lib: Rust implementation of SPDM
  - type: paragraph
    text: >-
      出处：均取自 2026-09-29 的全内核雷达（lore.kernel.org 13 列表，近 24h）。
      这些标题各自的原文链接见下方逐条拆解与练习。
  - type: divider
    label: "🔍 六个句式 + 一个例外"
    kind: section
  - type: toc
    items:
      - label: "Allow compiling X —— 解除限制，不是加功能"
        text: "Allow + 动名词。要点是它描述的是「本来做不到、现在做到了」，而不是「新增一样东西」。如果写成 Add IPv6-only kernel support，读者会以为在加新特性；Allow compiling 才说清是解开了一道编译期的限制。<a href=\"https://lore.kernel.org/netdev/&lt;20260928193046.6698-1-fmancera@suse.de&gt;/\">原文</a>"
      - label: "separate A from B —— 解耦"
        text: "把 A 从 B 里拆出来。同族还有 decouple A from B、split A out of B。写这类重构时注意语序：<b>A 是被拆出去的那个，B 是原本缠着它的那堆东西</b>——这条标题里被拆的是 collapse 本身，缠着它的是各路 caller。<a href=\"https://lore.kernel.org/linux-mm/&lt;20260928100630.21870-1-kirill@shutemov.name&gt;/\">原文</a>"
      - label: "Route X by Y —— by 引出判据"
        text: "by 后面是「按什么来分」。这条是按 TLP 类别给 P2P DMA 找路。同一个 by 还出现在 Index X by Y、key X by Y 里，都是「依据某维度做区分」的意思。看到 by 就问一句：这个维度是什么？<a href=\"https://lore.kernel.org/linux-media/&lt;20260928-fix-p2p-acs-v4-0-v8-0-404453b9c435@nvidia.com&gt;/\">原文</a>"
      - label: "fix X when Y —— 比「修个 bug」信息量高得多"
        text: "fix + 后果（data loss）+ when + 触发条件（truncating straddling large folios）。一条标题同时回答了「坏在哪」和「什么时候坏」。如果只写 fix a truncate bug，维护者得点进去才知道影响面。<a href=\"https://lore.kernel.org/linux-mm/&lt;20260928120833.3440834-1-yi.zhang@huaweicloud.com&gt;/\">原文</a>"
      - label: "fixes for X —— 注意是名词不是动词"
        text: "这里 fixes 是名词复数（一批修复），不是祈使动词 fix。&lt;前缀&gt;: fixes for &lt;场景&gt; 交代的是「这堆修复针对什么情况」——几个相机、挂在 CSI-2 bridge 后面。这层场景信息不该省，维护者靠它判断要不要细看。<a href=\"https://lore.kernel.org/linux-media/&lt;20260928121508.1404808-1-hitesh@ebytelogic.com&gt;/\">原文</a>"
      - label: "名词短语 + 括号补限定"
        text: "Gated tracepoints for skb lifecycle (free+clone) 整条没有动词——Gated 是过去分词作定语。括号是内核标题里常见的限定手段：(free+clone) 点明生命周期里的哪两步，不占正文长度。<a href=\"https://lore.kernel.org/netdev/&lt;20260928-bpf-meta-gated-tracepoints-v1-0-844dbf3e1edf@cloudflare.com&gt;/\">原文</a>"
      - label: "例外：Rust implementation of SPDM"
        text: "<b>这条标题不是祈使句</b>，是纯名词短语。什么时候可以这么写？当交付的是<b>一份独立实现</b>、而不是对既有代码做改动时。它强调「这是一份实现」，与 Add X 的语境不同。提醒：这是少数派写法，新人写补丁建议仍走 Add/fix 祈使句。<a href=\"https://lore.kernel.org/linux-pci/&lt;20260928011123.450800-1-alistair.francis@wdc.com&gt;/\">原文</a>"
  - type: divider
    label: "✨ 辅助彩蛋：地道表达"
    kind: section
  - type: highlight
    title: "标题里的介词与分词，一个词一层信息"
    meta: "都出自今天这几个真实标题"
    points:
      - label: "behind a CSI-2 bridge"
        text: "behind 表示拓扑位置——「挂在……后面」。比 after 精确：after 是时间先后，behind 是链路层级。描述级联设备的相对位置时用它。"
      - label: "straddling large folios"
        text: "straddle＝跨越（两条腿跨在两边）。这里指截断点「跨在」大 folio 中间——一个词把那个微妙的边界场景说清楚了。"
      - label: "Gated"
        text: "过去分词作定语，门控的——「由某个开关控制的」。gated tracepoints 就是「带开关的 tracepoint」，比 tracepoints with a switch 简洁得多。"
      - label: "IPv6-only"
        text: "连字符把短语压成一个形容词：only 修饰的是 IPv6，不是 kernel。写 compound adjective 时连字符别漏，否则 IPv6 only kernel 会被读成「IPv6，只有一个内核」。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "给三个场景各写一条内核标题（用今天学的句式，注意子系统前缀 + 祈使动词）：① 让某个驱动可以在不启用某配置的情况下编译；② 把一段被多个调用者共用的逻辑拆出来；③ 修一个「某操作会丢数据」的 bug，并说明何时触发。"
    answer: "参考（仿写示范，非真实标题）：① net: Allow building the driver without CONFIG_X —— Allow + 动名词，说清是解除限制；② mm/foo: separate the merge logic from its callers —— separate A from B；③ fs/bar: fix data loss when extending past the last block —— fix + 后果 + when + 触发条件。三条都做到：动词选对（Allow/separate/fix 各司其职，不混用）、后果写出来（丢数据）、触发条件写出来（何时）。"
    source: "Allow compiling an IPv6-only kernel network stack / mm/collapse: separate a collapse from its callers / mm/truncate: fix data loss when truncating straddling large folios"
    link: "https://lore.kernel.org/netdev/<20260928193046.6698-1-fmancera@suse.de>/"
  - type: closing
    tagline: "每日一句：The verb you pick is the claim you make — Allow, fix, separate and Route are four different promises."
    source: "仿写示范"
---
