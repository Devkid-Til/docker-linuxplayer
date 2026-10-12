---
title: "地道表达：一个 RFC 被两位维护者劝退，全程没出现一个 no"
date: "2026-10-12"
desc: "今日重点：地道表达——从 buddy 分配器那场讨论里学六句「温和驳回」句式（Thank you for posting / it is better to focus on one thing at a time / I am not sure how X is better than Y …），句子全部逐字取自原文。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "写作"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——上一篇地道表达学的是硬件语境里的惯用语。
      今天学<strong>人际语境</strong>：有人给 buddy 分配器提了一个大胆的 RFC，
      两位维护者把它温和劝退，<strong>三封邮件里一个 no 都没出现</strong>。
      六句话，逐字取自原文——这是内核邮件列表最实用的一课：<strong>怎么否定一个想法，而不否定提出它的人</strong>。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      Thank you for posting the idea. Like Rik suggested, it is better to focus
      on one thing at a time. I think improving anti-fragmentation at pageblock
      level is high priority at the moment. ... I am not sure how your bucket
      idea is better than the existing pageblock design, because the biggest
      issue in anti-fragmentation is unmovable pages spreading across the entire
      physical memory space to prevent high order page allocation ... Maybe you
      can compare your idea with Rik's series and tell us the pros and cons of
      both. :)
  - type: paragraph
    text: >-
      出处：三封邮件，同一线程 <code>[RFC NO CODE] [DISCUSSION] Anti-fragmenting ordered buddy allocator</code>。
      原帖 Dev Jain（ARM），10-12 05:54 北京；Rik van Riel 回复，06:00 北京；Zi Yan（NVIDIA）回复，07:05 北京。
      上面引的是 <strong>Zi Yan 那一封</strong>——练习题的 source 链接直接指向它，点开就能看到这些原句。
  - type: divider
    label: "💬 表达一：先认劳动，再谈想法"
    kind: section
  - type: highlight
    title: "Thank you for posting the idea."
    meta: "开场第一句，不是客套"
    points:
      - label: "原句"
        text: "Thank you for posting the idea."
      - label: "中文与语境"
        text: "提出一个 RFC 意味着写了文档、跑了数据、把问题想清楚了。这句话承认的是这部分的劳动。它把「人」和「想法」先分开——想法等下要否掉，但劳动先记下。内核列表里几乎所有的「软性驳回」都从这一句开始。"
      - label: "怎么用"
        text: "要否掉别人的方案时，第一句先认劳动，可用变体：<b>Thank you for posting the idea / for the detailed writeup / for taking the time to run these numbers.</b>"
  - type: divider
    label: "💬 表达二：把「你的先放放」说成常识"
    kind: section
  - type: highlight
    title: "it is better to focus on one thing at a time"
    meta: "无人称句式，不指向「你不该」"
    points:
      - label: "原句"
        text: "Like Rik suggested, it is better to focus on one thing at a time. I think improving anti-fragmentation at pageblock level is high priority at the moment."
      - label: "中文与语境"
        text: "妙在两处。一是 <b>it is better to…</b> 这个无人称句式：它陈述「更好的做法长这样」，而不说「你不该这么做」——主语一没，指责感就没了。二是 high priority <b>at the moment</b>：把优先级说成「当下」的客观状态，而不是对该方案价值的判决。附带一提，Like Rik suggested 先把自己藏到别人身后，进一步降低对抗感。"
      - label: "怎么用"
        text: "不要说 you should stop；说 <b>it is better to … at the moment</b>。句式的软，和判断的硬，是两件事。"
  - type: divider
    label: "💬 表达三：反对的黄金公式"
    kind: section
  - type: highlight
    title: "I am not sure how X is better than Y, because …"
    meta: "句式要软，论据要硬"
    points:
      - label: "原句"
        text: "I am not sure how your bucket idea is better than the existing pageblock design, because the biggest issue in anti-fragmentation is unmovable pages spreading across the entire physical memory space to prevent high order page allocation and I do not see how your idea could contaminate unmovable pages."
      - label: "中文与语境"
        text: "注意它没说 your idea is wrong。<b>I am not sure how…</b> 把不确定留在自己身上，但 because 后面立刻给出实打实的技术理由——不可移动页会散布到整个物理内存空间、挡住高阶分配。这就是内核 review 的标准做法：<b>礼貌交给句式，说服力交给论据</b>，两件事分开做。"
      - label: "怎么用"
        text: "I am not sure how X is better than Y, because … 直接可套。后半句必须是技术事实，不能也是情绪。"
  - type: divider
    label: "💬 表达四：请人先看自己的东西"
    kind: section
  - type: highlight
    title: "Could I convince you to take a look at these patches?"
    meta: "比 Please review 少一分理所当然"
    points:
      - label: "原句"
        text: "Could I convince you to take a look at these patches?"
      - label: "中文与语境"
        text: "这是 Rik 回复里的第一句。他没有说 please review my patches，而是用 <b>Could I convince you to…</b>——把自己放在「需要说服对方」的位置上，给对方留足说 no 的余地。紧接着另起一行把链接贴出来，不让人去找。"
      - label: "怎么用"
        text: "想让人先看你的东西：<b>Could I convince you to take a look at …?</b> 它同时完成了「请求」和「不施压」两件事。"
  - type: divider
    label: "💬 表达五：用 we 谈优先级"
    kind: section
  - type: highlight
    title: "That is probably what we want to get in first."
    meta: "三个软化词：we / probably / first"
    points:
      - label: "原句"
        text: "At the moment, anti-fragmentation is only preventing mixing movable and unmovable pages in a pageblock. Rik's series[3] is doing additional work to keep unmovable page allocation within a unmovable pageblock, further reducing fragmentation. That is probably what we want to get in first."
      - label: "中文与语境"
        text: "前一句先用事实铺路（Rik 的系列已经在做这件事），后一句才给结论。结论里塞了三个软化词：<b>we</b>（不是 you）、<b>probably</b>（不是 certainly）、<b>first</b>（不是 instead）。于是「你的先等等」听起来是团队共识，而不是个人裁决。"
      - label: "怎么用"
        text: "要压别人的优先级时，先说清「已经有人在做什么」，再用 we / probably / first 收口。"
  - type: divider
    label: "💬 表达六：把驳回变成一份作业"
    kind: section
  - type: highlight
    title: "Maybe you can compare … and tell us the pros and cons of both. :)"
    meta: "拒绝时一定给下一步"
    points:
      - label: "原句"
        text: "Maybe you can compare your idea with Rik's series and tell us the pros and cons of both. :)"
      - label: "中文与语境"
        text: "结尾这一句最值得学。它把「驳回」变成了<b>一份交给对方的作业</b>：你去把两者对比一下，然后回来告诉我们优劣。于是讨论没有被关死，提出者拿到了下一步动作，而不是被晾在原地。分号笑脸在内核列表里很常见，专门用来软化语气。"
      - label: "怎么用"
        text: "拒绝的收尾永远要给一个<b>可执行的动作</b>，不要只说 not now。Maybe you can … and tell us … 是好用的模板。"
  - type: divider
    label: "✨ 辅助彩蛋：提大改动时，怎么露出人味"
  - type: highlight
    title: "because I like to torture myself / kept digging the rabbit hole"
    meta: "自嘲是 RFC 里降低对抗感的手法"
    points:
      - label: "原句"
        text: "I just took up the challenge of anti-fragmentation (because I like to torture myself) and kept digging the rabbit hole."
      - label: "中文与语境"
        text: "提一个「要动分配器核心算法」的大改动，最怕显得「我要来改造你们的东西」。Dev Jain 用自嘲把姿态放低：<b>I like to torture myself</b>（我这是自找苦吃）、<b>kept digging the rabbit hole</b>（越挖越深停不下来）。自嘲式开场是 RFC 里降低对抗感的常用手法——先承认这事麻烦、自己也知道难，比一上来讲道理更容易被听进去。"
      - label: "顺带一个文化彩蛋"
        text: "Rik van Riel 的邮件签名是 <b>All Rights Reversed.</b>——把 Reserved 反着写。内核邮件列表上这类玩笑签名很常见，看到不必困惑，它就是一个签名。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "你是子系统维护者，有人提了一个方向不同的大改动（RFC）。用今天学的句式写四句英文：① 先认下对方的工作；② 说明「一次专注一件事」更好，并点出当前的高优先级；③ 礼貌指出你没看出它比现有设计好在哪，并给出技术理由；④ 给对方一个可执行的下一步。"
    answer: "参考作答（仿写示范，非原文）：① Thank you for posting the idea. ② Like others have suggested, it is better to focus on one thing at a time -- improving X at the Y level is high priority at the moment. ③ I am not sure how your approach is better than the existing Z design, because <technical reason: e.g. it does not prevent unmovable pages from spreading across the physical memory space>. ④ Maybe you can compare the two approaches and tell us the pros and cons of both. :)"
    source: "Thank you for posting the idea. / Like Rik suggested, it is better to focus on one thing at a time. I think improving anti-fragmentation at pageblock level is high priority at the moment. / I am not sure how your bucket idea is better than the existing pageblock design, because the biggest issue in anti-fragmentation is unmovable pages spreading across the entire physical memory space to prevent high order page allocation and I do not see how your idea could contaminate unmovable pages. / Maybe you can compare your idea with Rik's series and tell us the pros and cons of both. :)"
    link: "https://lore.kernel.org/linux-mm/<DM2DV199T6N4.19MU82DJBDOF9@nvidia.com>/"
  - type: closing
    tagline: "每日一句：Saying no is easy. Saying it so the other person comes back with a better patch is the skill."
    source: "仿写示范"
---
