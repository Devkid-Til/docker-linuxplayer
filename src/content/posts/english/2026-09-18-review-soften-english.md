---
title: "地道表达：内核评审里怎么「说不」——四句真人原话"
date: "2026-09-18"
desc: "今日重点：地道表达——从今天四条真实评审线程，学维护者怎么把「不行」说得让人愿意改。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "阅读"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——补丁写得再漂亮，也得先过评审这一关。今天四条线程里，四位维护者
      其实都在做同一件事：<strong>把「不行」说得让人愿意改</strong>。这四句真实原话，就是内核社区的「说不」话术。
  - type: divider
    label: "💬 地道表达：四句「说不」"
  - type: highlight
    title: "接受也是表达：一行结束 40 帖"
    meta: "lkml · Re: [PATCH v3 00/40] mm: make VMA flag semantics explicit, eliminate VM_SPECIAL（Andrew Morton）· 09-18 05:23 北京"
    link: "https://lore.kernel.org/lkml/20260917142329.369cd6539261d590600ce7ec@linux-foundation.org/"
    points:
      - label: "真实原句"
        text: "Thanks, I've updated mm.git's mm-unstable branch to this version."
      - label: "中文理解"
        text: >-
          「谢谢，我已经把 mm.git 的 mm-unstable 分支更新到这个版本了。」——一个 40 帖的大系列，维护者的全部回应
          就这么一行。内核社区的「接受」是这个分量：不夸、不复述、不寒暄，一句话交代<strong>他做了什么</strong>
          （updated ... to this version），而不是「你这个补丁写得真好」。
      - label: "用法"
        text: >-
          维护者收下补丁的标准句式：<code>Thanks, I've updated &lt;tree&gt;'s &lt;branch&gt; to this version.</code>
          关键在动词——<code>updated ... to this version</code> 是精确的、可核对的动作，比 <code>Looks good, merged.</code>
          更有信息量。作者看到这句就知道该去哪个分支找自己的补丁了。
  - type: highlight
    title: "最软的否定：This sounds a bit overkill"
    meta: "netdev · Re: [PATCH net-next v3 0/3] net: hash uncached route lists by device（Kuniyuki Iwashima）· 09-18 06:10 北京"
    link: "https://lore.kernel.org/lkml/20260917221203.1811779-1-kuniyu@google.com/"
    points:
      - label: "真实原句"
        text: "This sounds a bit overkill.  Also, this series still leaves O(N * C) loops."
      - label: "中文理解"
        text: >-
          「这听着有点杀鸡用牛刀。而且这个系列还是留着 O(N * C) 的循环。」——一句话里叠了三个软化装置：
          <code>sounds</code>（我只根据读到的判断，不敢断言）、<code>a bit</code>（程度压到最小）、
          <code>overkill</code>（用俚语式批评替代生硬的 wrong）。说完立刻补一条<strong>技术事实</strong>，
          把「我的感觉」和「你的问题」分开——批评归批评，依据归依据。
      - label: "用法"
        text: >-
          <code>This sounds a bit &lt;形容词&gt;</code> 是否定的最低起手式，常用词还有
          <code>heavy</code> / <code>broad</code> / <code>much</code>。注意它只说「听着如何」，
          不否定人——留出作者自证的空间。后面那句 <code>still leaves ...</code> 才是真正的技术论点，
          两句配合，就构成了「客气 + 有据」的标准评审。
  - type: highlight
    title: "不赞同做这个功能：I'm not sure I'd bother with ..."
    meta: "lkml · Re: [PATCH bpf-next v7 5/5] selftests/bpf: Test mm_struct user memory（Andrii Nakryiko）· 09-18 06:14 北京"
    link: "https://lore.kernel.org/lkml/CAEf4BzZui5ywrdEz1Sz+XuSEOyFVBnGR_F0SU0vNuhBpaGpqGQ@mail.gmail.com/"
    points:
      - label: "真实原句"
        text: "I'm not sure I'd bother with this !CONFIG_MMU support, tbh"
      - label: "中文理解"
        text: >-
          「我不确定我会为这个 !CONFIG_MMU 支持费这个劲，说实话。」——<code>I'm not sure</code> 先给自己留退路，
          <code>I'd bother with</code> 是「值不值得花力气」的地道说法（不是「我不喜欢」，而是「性价比不划算」），
          句尾 <code>tbh</code>（= to be honest）是邮件里常见的口语收尾，把整句从「评审意见」拉回「同事聊天」的语域。
      - label: "用法"
        text: >-
          想说「这个功能不值得做」：<code>I'm not sure I'd bother with ...</code>；想让对方删代码：
          同一封里他写的是 <code>no need to explicitly define them, please drop</code>——<code>no need to</code>
          给理由（本来就有，不必重复定义），<code>please drop</code> 提要求。比一句 <code>Remove this.</code>
          礼貌得多，但同样是明确的要求。
  - type: highlight
    title: "长评审先挂摘要：tl;dr + 星号留白"
    meta: "lkml · Re: [PATCH v3 09/20] kbuild: implement and use depcheck to check dependency timestamps（Kees Cook）· 09-18 04:59 北京"
    link: "https://lore.kernel.org/lkml/202609171229.31BB336E1@keescook/"
    points:
      - label: "真实原句"
        text: >-
          tl;dr: I spent way too long looking at this. I think my conclusion is "Hm, this makes some cases of missed
          Makefile deps on generated files harder to find, but there don't *appear* to be any obviously wrong
          instances of this in the tree."
      - label: "中文理解"
        text: >-
          「太长不看版：我在这上面花了太多时间。我的结论是『嗯，这会让生成文件的 Makefile 依赖漏配更难被发现，
          但树里<strong>似乎</strong>没有明显配错的实例。』」——三处值得学：<code>tl;dr</code> 是作者给自己
          长评审装的「摘要按钮」；<code>I spent way too long looking at this</code> 是自嘲式铺垫（我认真看了，
          所以下面的结论值得信）；<code>don't *appear* to be</code> 用星号把 <code>appear</code> 顶出来，
          等于说「我没找到反例，但不敢打包票」。
      - label: "用法"
        text: >-
          写长评审时先给一行 <code>tl;dr:</code>，让维护者/作者能先抓住结论。要表达「我查过了，但结论留余地」用
          <code>there don't appear to be any ...</code>；想更明确一点就把程度副词换成
          <code>I couldn't find any ...</code>——后者只声明<strong>我找过</strong>，不声明「不存在」，这是内核评审
          里非常重要的分寸。
  - type: divider
    label: "✨ 辅助彩蛋（阅读）"
  - type: highlight
    title: "把四句排成一条「软化梯度」"
    meta: "今天四条线程 · 读评审的语感"
    link: "https://lore.kernel.org/lkml/20260917221203.1811779-1-kuniyu@google.com/"
    points:
      - label: "串读"
        text: >-
          真接受（<code>Thanks, I've updated ... to this version.</code>）→ 怀疑但留余地
          （<code>This sounds a bit overkill.</code>）→ 不赞同做（<code>I'm not sure I'd bother with ...</code>）
          → 查过但留白（<code>there don't *appear* to be any ...</code>）。注意：<strong>没有一句是祈使句</strong>，
          四句全在描述「我看到了什么」+「我倾向什么」，而不是「你去做什么」。
      - label: "可学点"
        text: >-
          真需要作者动手时，他们才换语气——同一位维护者（Kuniyuki Iwashima）在同一封里写的是
          <code>Could you try this change ? (only compile-tested)</code>：问句 + 括号里主动交代「我只编译测过」，
          既提了要求，也替作者划清了风险边界。<strong>陈述用来说服，问句用来请托</strong>——这条分界线，
          就是内核评审的语感。
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: >-
      用今天的四个句式，给一个假设的补丁回复写 4 句英文：① 表示接受并说明你做了什么（Thanks, I've updated ...）；
      ② 觉得某处用力过猛（This sounds a bit ...）；③ 认为某个功能不值得做（I'm not sure I'd bother with ...）；
      ④ 请作者试一个改动，并交代你的验证程度（Could you try ... (only compile-tested)）。
    answer: >-
      参考（仿写示范，非原句）：Thanks, I've updated the mm tree's mm-unstable branch to this version.
      This sounds a bit heavy for a fix that only affects one driver. I'm not sure I'd bother with the extra
      fallback path, tbh — the existing error handling already covers it. Could you try folding this into the
      first patch ? (only compile-tested)
    source: >-
      This sounds a bit overkill.  Also, this series still leaves O(N * C) loops.
      Given unregistering a single device is less common than destroying netns, I think the right approach should
      be to make the route flush once in cleanup_net() + outside RTNL.
      Could you try this change ? (only compile-tested)
    link: "https://lore.kernel.org/lkml/20260917221203.1811779-1-kuniyu@google.com/"
  - type: closing
    tagline: "\"I'm not sure I'd ...\" gets further than \"You must ...\"."
    source: "内核英语 · 每日一篇"
---
