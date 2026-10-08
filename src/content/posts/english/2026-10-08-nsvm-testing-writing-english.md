---
title: "写作：投稿信里的「我是怎么测的」该怎么写"
date: "2026-10-08"
desc: "今日重点：写作——拆 KVM nSVM 投稿信的测试小节：先交代没测什么、用「注入 bug 看能不能抓到」证明测试有效、以及坦白 AI 生成的脚本。"
column: "english"
focus: "写作"
tags: ["写作", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——今天这篇投稿信里有个很少被当作「写作技巧」来讲的部分：
      <strong>「我是怎么测的」这一节</strong>。多数人写这块要么漏掉、要么笼统说一句 tested on my machine。
      这篇写得很规范，而且有一处坦白相当生动。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      The Hyper-V bits only got build tested. The SEV bits were only tested using the SEV
      selftests.

      Otherwise, this series was tested in two ways:

      1. A new selftest:
        - Fails reliably when injecting manual TLB bugs (e.g. commenting out a flush).
        - Caught an actual bug when I was rebasing the series on top of Paolo's MMU
          structures rework.
        - Was used to repro a separate nVMX TLB bug [1].

      2. An AI generated script (now 1300 lines of bash that I still don't dare to read):
  - type: paragraph
    text: >-
      出处：Yosry Ahmed，<code>[PATCH v2 00/29] KVM: nSVM: Optimize nSVM TLB flushes</code>，
      lkml，10-08 08:14 北京。
      <a href="https://lore.kernel.org/lkml/&lt;20261008001425.2458927-1-yosry@kernel.org&gt;/">原文</a>
  - type: divider
    label: "✍️ 拆解：这一节怎么写才有说服力"
    kind: section
  - type: toc
    items:
      - label: "① 先交代「没测到什么」"
        text: "The Hyper-V bits only got build tested. The SEV bits were only tested using the SEV selftests. <b>一上来就说自己哪些没充分测</b>——注意那个 only：只做了编译测试、只用了 selftest。这两个 only 承担了全部的诚实。维护者最想知道的就是「哪里还没被人肉验证过」，主动说出来比等对方问强得多。"
      - label: "② Otherwise 划出范围"
        text: "Otherwise, this series was tested in two ways: otherwise＝「除了上面那两处」，把「没测的」和「测了的」明确切开。这个小词让读者知道：接下来讲的是余下部分的测试方式，不是全部。"
      - label: "③ 用「注入 bug」证明测试有效"
        text: "Fails reliably when injecting manual TLB bugs (e.g. commenting out a flush). 这句比「我跑了很多测试」有力得多——<b>它证明的是测试本身有效</b>：故意把一处 flush 注释掉，测试能稳定失败。一句 e.g. commenting out a flush 就把方法讲清楚了。"
      - label: "④ 拿真实战绩背书"
        text: "Caught an actual bug when I was rebasing the series on top of Paolo's MMU structures rework. <b>这套测试真的抓到过 bug</b>，而且是在重基的时候。还有一句 Was used to repro a separate nVMX TLB bug——不只抓自己的，还帮别人复现了。真实战绩比任何形容词都有说服力。"
      - label: "⑤ 主动坦白 AI 生成的脚本"
        text: "An AI generated script (now 1300 lines of bash that I still don't dare to read)。这句值得单独学：<b>既承认了脚本是 AI 生成的、又自嘲 1300 行自己都不敢读</b>。信息上它交代了工具来源，语气上它化解了「这脚本可靠吗」的质疑。括号里的自嘲是整封信最有人味的一处。"
      - label: "⑥ 讲清压力测试的设计意图"
        text: "原文紧接着把 20 台 L1 虚拟机分成两组，并解释了为什么：一组 vCPU 与宿主 CPU 1:1 绑定，<b>避免</b> vCPU 迁移和 L2 ASID 切换引发的 TLB 刷新；另一组故意超配，<b>制造</b>这些刷新。原文用 which would otherwise hide missed flushes 点明了前一组的意义——<b>不让干扰掩盖漏刷</b>。测试设计讲「为什么这么分组」，比列参数有用。"
  - type: divider
    label: "✨ 辅助彩蛋：术语卡"
    kind: section
  - type: highlight
    title: "ASID 与 VPID：同一件事的两个名字"
    meta: "定义取自本期投稿信"
    points:
      - label: "ASID（AMD 侧）"
        text: "原文：using and maintaining a separate ASID for L2 for each vCPU。ASID ＝ Address Space ID，CPU 用来区分不同地址空间的标记，TLB 条目挂在它上面。"
      - label: "VPID（Intel 侧）"
        text: "原文两次以 (similar to VMX's handling of VPIDs) 的形式出现——<b>作者用 Intel 的既有做法来解释自己的改动</b>。VPID ＝ Virtual Processor ID，在 VMX 上承担同样职能。"
      - label: "记忆钩子"
        text: "两家对同一概念取了不同的名字：<b>AMD 叫 ASID、Intel 叫 VPID</b>。看到「向 VMX 看齐」这类表述，通常就是在说「把 AMD 侧补到 Intel 已有的模型上」——本期 nSVM 正是如此。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用英文写一段你补丁的测试小节，包含三点：① 先交代哪部分没充分测（用上 only got … tested）；② 说明你怎么证明测试本身有效（例如故意注入一个 bug 看它能否抓到）；③ 坦白某个测试工具的来源（例如脚本是 AI 生成的）。"
    answer: "参考（仿写示范，非原文）：The error-path changes only got compile tested; the streaming path was exercised against real hardware. Otherwise, this series was tested by injecting a known fault -- forcing the regulator enable to fail -- and confirming the driver unwinds cleanly instead of leaking the clock. The stress script is AI generated (about 400 lines of bash that I have not fully read); it ramps concurrent opens until the reference count wraps."
    source: "The Hyper-V bits only got build tested. The SEV bits were only tested using the SEV selftests. Otherwise, this series was tested in two ways: 1. A new selftest: - Fails reliably when injecting manual TLB bugs (e.g. commenting out a flush). - Caught an actual bug when I was rebasing the series on top of Paolo's MMU structures rework."
    link: "https://lore.kernel.org/lkml/<20261008001425.2458927-1-yosry@kernel.org>/"
  - type: closing
    tagline: "每日一句：Say what you did not test, and how you know the test can fail."
    source: "仿写示范"
---
