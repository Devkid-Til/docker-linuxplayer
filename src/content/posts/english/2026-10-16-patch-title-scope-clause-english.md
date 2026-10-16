---
title: "标题解析：修复标题的限定语——写宽了是过度承诺，写窄了没人重视"
date: "2026-10-16"
desc: "今日重点：标题解析——从今天的真实标题里学「限定语」：when / on / with·without / if·only 四种形式，以及什么时候该把「原因」（due to）写进标题。"
column: "english"
focus: "标题解析"
tags: ["标题解析", "阅读"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🔍 标题解析</strong>——这个栏目写过祈使句语法、动词库、
      「加个东西」的六种写法、系列前缀。今天讲<strong>一直没碰过的一块：限定语</strong>。
      你有没有注意过，内核修复标题几乎都拖着一个尾巴——<code>when …</code>、<code>on …</code>、<code>with …</code>。
      这个尾巴不是装饰：<strong>它决定了这个补丁承诺修多大一片</strong>。
      写宽了是过度承诺，维护者会要你收窄；写窄了，没人看出这事跟自己有关。
  - type: divider
    label: "📖 今日标题（真实清单，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      [PATCH 2/2] drm/panfrost: Fix race when restoring reset state in perfcnt

      [PATCH net v4 0/4] net: devmem: fix RX and TX binding teardown on device unregistration

      [PATCH 0/2] drm/amd/display: Keep eDP native timing after resume with video=

      [PATCH 07/10] mm/hugetlb: tolerate uffd bits set without uffd for PROT_NONE PTEs

      [PATCH v6 16/39] mm/vma: only allow mmap to clear VMA_MAYWRITE_BIT if not mm-managed

      [PATCH] drm/bridge: ite-it66121: fix silent probe regression due to reset timing
  - type: paragraph
    text: >-
      出处：均取自 2026-10-16 的全内核雷达（lore.kernel.org 13 列表，近 24h）。
      <strong>每条都给了原帖链接</strong>（不是线程里的回复）——见下方逐条拆解。
  - type: divider
    label: "🔍 四种限定语，外加一个对照组"
    kind: section
  - type: toc
    items:
      - label: "① when —— 限定「在什么操作下发生」"
        text: "Fix race <b>when restoring reset state in perfcnt</b>。冒号后先说要修什么（Fix race），when 从句再圈出这个竞态只在「恢复 perfcnt 里的 reset 状态」时出现。<b>没有这个尾巴，标题就变成「panfrost 里有个竞态」——那是完全另一个量级的主张</b>。同一天还有一条用 during 的（<code>mm/huge_memory: avoid transient none PMDs during lazyfree reclaim</code> <a href=\"https://lore.kernel.org/linux-mm/&lt;20261015-anon_vma_uaf_fix-v1-6-7b977303b42b@nvidia.com&gt;/\">原文</a>），道理一样：during 圈的是时间窗，when 圈的是触发操作。<a href=\"https://lore.kernel.org/dri-devel/&lt;20261015-panfrost-reset-races-fixes-v1-2-bb74c1786a0b@collabora.com&gt;/\">原文</a>"
      - label: "② on —— 限定「在哪类对象或事件上」"
        text: "fix RX and TX binding teardown <b>on device unregistration</b>。on 把范围钉死在一个事件上：设备注销。这个介词很灵活——跟在事件后面是「时机」，跟在硬件后面就是「平台」。判断方法很简单：<b>看 on 后面接的是动作还是名词</b>。接动作（unregistration）＝ 只在这个事件里出问题；接硬件名 ＝ 只在这类设备上出问题。<a href=\"https://lore.kernel.org/linux-media/&lt;20261015163915.1166043-1-almasrymina@google.com&gt;/\">原文</a>"
      - label: "③ with / without —— 限定「在什么参数或配置下」"
        text: "Keep eDP native timing after resume <b>with video=</b>。这条拖了两个尾巴：<b>after resume</b> 是时机，<b>with video=</b> 是条件——video= 是内核启动参数，写出来等于告诉读者：这个问题只在用户传了这个参数时才出现。另一条更典型：tolerate uffd bits set <b>without uffd</b> for PROT_NONE PTEs——without 圈的是「缺了某个配置」这种情形，后面还跟一个 for 再限定对象。<b>with / without 是四个形式里信息量最大的一个</b>：它直接告诉你复现需要什么前提。<a href=\"https://lore.kernel.org/dri-devel/&lt;20261014223041.171317-1-hugo@hsal.es&gt;/\">原文一</a> · <a href=\"https://lore.kernel.org/linux-mm/&lt;20261015-urgent_fixes-v1-7-42796911043b@kernel.org&gt;/\">原文二</a>"
      - label: "④ if / only —— 限定「什么前提下才允许」"
        text: "mm/vma: <b>only</b> allow mmap to clear VMA_MAYWRITE_BIT <b>if</b> not mm-managed。注意这条标题的主干根本不是「修了什么」，而是<b>「允许什么、在什么前提下」</b>：only allow … if …。only 管住动作，if 管住前提，双保险把行为收得极窄。这类写法常见于「把某个操作限制在安全子集内」的加固补丁——<b>它承诺的不是修复，而是一条新的约束</b>。<a href=\"https://lore.kernel.org/dri-devel/&lt;20261013-b4-mmap-prepare-vma-flag-sanify-v6-16-1aa3c9b139f9@kernel.org&gt;/\">原文</a>"
      - label: "⑤ 对照组 due to —— 尾巴里装的是「原因」，不是「范围」"
        text: "fix silent probe regression <b>due to reset timing</b>。这一条的尾巴和前四条不是一类：when / on / with / if 回答的是「<b>在什么情况下</b>」，due to 回答的是「<b>因为什么</b>」。什么时候可以把原因写进标题？<b>原因短到几个词的时候</b>（reset timing）。原因一长就该留给 commit message——<b>标题负责承诺范围，不负责解释成因</b>。看到 due to，你知道的是成因；看到 when，你知道的是适用边界，两者别混着读。<a href=\"https://lore.kernel.org/dri-devel/&lt;20261015-drm-ite-it66121-fix-reset-v1-1-473038e06abc@bootlin.com&gt;/\">原文</a>"
  - type: divider
    label: "✨ 辅助彩蛋：一个不是英语、但每天都会绊人的点"
  - type: highlight
    title: "[PATCH] 和 Re: [PATCH] 是两个不同的东西"
    meta: "读邮件列表的基本功，今天差点绊到我"
    points:
      - label: "现象"
        text: "今天这封 <code>[PATCH] drm/bridge: ite-it66121: fix silent probe regression due to reset timing</code>，在雷达里同时存在两条：一条是 <code>[PATCH] …</code>，另一条是 <code>Re: [PATCH] …</code>（别人在讨论它）。<b>只有前者是补丁本身，后者是讨论</b>。"
      - label: "为什么要小心"
        text: "按标题搜的时候如果不看前缀，很容易把回复当成补丁——那就等于<b>把「别人回帖的时间」当成了「补丁提交的时间」</b>，还会把讨论里的措辞当成作者的原文。找补丁本体：标题以 <code>[PATCH</code> 或 <code>[RFC</code> 开头；看到 <code>Re:</code>，那是线程里的某一封回复。"
      - label: "怎么用"
        text: "引用补丁标题时，认准 <code>[PATCH</code> / <code>[RFC</code> 开头的原帖，并指向<strong>它自己</strong>的那条链接——不要指向线程里最热闹的那封回复。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "你修了一个竞态：它只在设备于 probe 期间被移除时才出现。写一个完整英文标题（含子系统前缀与限定语），并回答两点：① 你用的是哪种限定语形式；② 如果把这个限定语去掉，标题会变成什么主张、为什么那是错的？"
    answer: "参考作答（仿写示范，非原文）：标题示例：drm/panfrost: Fix race when removing the device during probe。 ① 用的是 when + 操作场景（也可用 during + 时间窗），限定这个竞态在什么操作下发生。 ② 去掉后变成 drm/panfrost: Fix race（或 Fix a race），主张就从「在某个特定操作下存在竞态」扩大成「panfrost 里存在竞态」——这是两个量级不同的承诺，维护者会立刻追问适用条件。限定语的作用是收窄主张：标题承诺的必须正好是你修掉的那部分，多一分就是过度承诺，少一分则没人能判断这事跟自己有没有关系。"
    source: "[PATCH 2/2] drm/panfrost: Fix race when restoring reset state in perfcnt"
    link: "https://lore.kernel.org/dri-devel/<20261015-panfrost-reset-races-fixes-v1-2-bb74c1786a0b@collabora.com>/"
  - type: closing
    tagline: "每日一句：A patch title makes a promise. The trailing clause is what keeps the promise honest."
    source: "仿写示范"
---
