---
title: "口语：被人当场问「这会影响现有驱动吗」，怎么答"
date: "2026-10-09"
desc: "今日重点：口语——从 drm_panel atomic 的 RFC 里学五句口语表达：opt-in、keeps working exactly as before、warn and refuse、follows the path、had issues with，都是会上被追问时的最短答法。"
column: "english"
focus: "口语"
tags: ["口语", "术语卡"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🗣️ 口语</strong>——今天练一个你在评审会上一定会被问到的场景：
      <strong>「你这改动会影响现有驱动吗？」</strong>「以前有人做过吗？」「为什么不全改？」。
      这类问题要当场答，答不好显得没想过；这篇从 drm_panel atomic 的 RFC 里挑五句话，
      都是在这些追问下的最短答法。
  - type: divider
    label: "📖 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      The atomic state is opt-in. A panel that doesn't implement the state callbacks keeps
      working exactly as before, with the plain bridge state, so there is no need to touch
      the existing drivers.
  - type: quote
    text: >-
      The previous attempt by Val Packett ([1]), but it had issues with the API design,
      passing NULL for the state. This approach follows closer the path that was chosen
      for drm_bridge conversion.
  - type: paragraph
    text: >-
      出处：Dmitry Baryshkov，<code>[PATCH RFC 0/9] drm/panel: add atomic state</code>，
      dri-devel，10-08 21:14 北京。
      <a href="https://lore.kernel.org/dri-devel/&lt;20261008-panel-atomic-state-v1-0-b157fddb8de1@oss.qualcomm.com&gt;/">原文</a>
  - type: divider
    label: "🗣️ 五句会上能直接用的答法"
    kind: section
  - type: toc
    items:
      - label: "The atomic state is opt-in."
        text: "被问「会影响现有驱动吗」，这是最短答案的开头。<b>opt-in ＝ 默认关闭、要主动选才启用</b>，软件口语里的标准词。念的时候 opt-in 重读、后面停半拍，再补细节。千万别用 optional（意思飘）或 not default（啰嗦）。"
      - label: "keeps working exactly as before"
        text: "接着交代行为不变。注意 exactly 这个词——<b>它把「基本不变」升级成「一模一样」</b>，是对兼容性的明确承诺。念的时候放慢，这是对方最想听到的部分。"
      - label: "so there is no need to touch the existing drivers"
        text: "第三句给影响面：不用改动现有驱动。三句连起来就是完整的标准答法——<b>先说可选、再说行为不变、最后说影响面</b>。顺序别颠倒：先承诺再解释，比先解释再承诺更让人安心。"
      - label: "warn and refuse to handle"
        text: "描述防御行为的双动词结构。原文说这些入口点对那些面板「警告并拒绝处理」。<b>两个动词并列，比笼统说 they don't work 精确得多</b>：warn 是对开发者的提示，refuse 是行为本身。会上讲某个边界情况怎么处理时，这个结构很好用。"
      - label: "follows the path that was chosen for X"
        text: "被人质疑「你这是新发明吧」，用它回答：<b>这套做法沿着 drm_bridge 转换时选定的那条路</b>。follows the path that was chosen for 是固定搭配，念的时候 path 重读。先例是最好的辩护——维护者最怕的就是自成一派。"
      - label: "had issues with the API design"
        text: "被问「以前有人做过吗」，这句是标准答法的后半：<b>先给出处</b>（The previous attempt by Val Packett），<b>再说问题</b>（had issues with the API design）。注意 issues with 比 wrong、bad 礼貌得多——<b>评价前人的工作，说「有问题」不说「错了」</b>，会上尤其要注意这个分寸。"
  - type: divider
    label: "✨ 辅助彩蛋：术语卡"
    kind: section
  - type: highlight
    title: "atomic state / atomic check"
    meta: "定义取自同一封 RFC"
    points:
      - label: "原文怎么说的"
        text: "The panels also have no way to reject the configuration they cannot handle, <b>as it doesn't take part in the atomic check</b>。——面板无法拒绝自己处理不了的配置，<b>因为它没有参与 atomic check</b>。这句把「面板为什么要进 atomic」讲清楚了。"
      - label: "中文理解"
        text: "DRM 的 atomic 模式要求一次提交里所有组件（CRTC、编码器、桥接、面板）在<b>提交之前</b>先集体校验一遍，任何一个说不行的就整体回滚。此前 drm_panel 不参与这个校验，等于「旁听」——配置合不合理它没机会表态，只能被动接受。"
      - label: "记忆钩子"
        text: "atomic check ＝ 提交前的集体表决。<b>参与表决的组件才有否决权</b>——这就是本期给 drm_panel 加 atomic state 的全部理由：让面板从旁听席上站起来。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "场景：你在会上提了一个新接口，同事连问三句——①「会影响现有驱动吗？」②「以前有人做过吗？」③「为什么不全改？」。请用英文各答一句，用上今天学的说法（opt-in / keeps working exactly as before / no need to touch / previous attempt / had issues with / follows the path）。"
    answer: "参考作答（仿写示范，非原文）：① The new callbacks are opt-in: a driver that doesn't implement them keeps working exactly as before, so there is no need to touch the existing drivers. ② There was a previous attempt, but it had issues with the locking model, so this approach follows the path that was chosen for the bridge conversion. ③ Converting everything at once would mean carrying the old and new paths in every driver; keeping it opt-in lets hosts migrate one at a time."
    source: "The atomic state is opt-in. A panel that doesn't implement the state callbacks keeps working exactly as before, with the plain bridge state, so there is no need to touch the existing drivers. ... The previous attempt by Val Packett ([1]), but it had issues with the API design, passing NULL for the state. This approach follows closer the path that was chosen for drm_bridge conversion."
    link: "https://lore.kernel.org/dri-devel/<20261008-panel-atomic-state-v1-0-b157fddb8de1@oss.qualcomm.com>/"
  - type: closing
    tagline: "每日一句：Promise compatibility first, explain the mechanics second — the room listens in that order."
    source: "仿写示范"
---
