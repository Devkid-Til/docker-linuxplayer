---
title: "读一段真实邮件：维护者怎么解释「回滚」"
date: "2026-08-13"
desc: "今日重点：阅读——读 DRM 调度器回滚说明的真实英文段落，学维护者的解释语气。"
column: "english"
focus: "阅读"
tags: ["阅读", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：📖 阅读</strong>——今天读一段真实的 DRM 调度器回滚说明（维护者 Tvrtko Ursulin 的原话），理解他是怎么向社区解释"为什么要回滚"的。
  - type: divider
    label: "📖 阅读素材"
  - type: highlight
    title: "维护者解释「回滚 fair 调度策略」"
    meta: "dri-devel · drm-sched · PATCH v3 00/19"
    link: "https://lore.kernel.org/dri-devel/<20260811163139.99746-1-tvrtko.ursulin@igalia.com>/"
    points:
      - label: "英文原段"
        text: "There was a late minute user regression report, so let's revert this so it can be debugged in peace. I have not been able to locally reproduce it yet, but at least a partial fix looks to be this. Further debug will be needed, possibly after the holiday/vacation season is over."
      - label: "中文理解"
        text: "「最后关头冒出一个用户回归报告，所以咱们先回滚，好让问题能安安静静地调试。我本地还没能复现它，但至少部分修复看起来是这个。进一步调试还需要，可能要等假期/休假季过去。」"
      - label: "阅读要点"
        text: "late minute user regression = 临门一脚的用户回归；debugged in peace = 安安静静调试（in peace 语气）；locally reproduce = 本地复现（内核 bug 报告高频）；holiday/vacation season = 维护者的时间表达"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "两个值得记的表达"
    meta: "dri-devel · 讨论"
    link: "https://lore.kernel.org/dri-devel/<bbe573b2-cee8-4647-bb75-662ced57b2d3@igalia.com>/"
    points:
      - label: "debugged in peace"
        text: "「安安静静地调试」——in peace 表「不受打扰」；revert so it can be debugged in peace = 回滚是为了能专心调试"
      - label: "I have not been able to ... yet"
        text: "「我还没能……」——yet 结尾表"到目前还没"，维护者说明复现困难的礼貌说法"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "阅读理解：用英文回答两个问题——① 为什么维护者要回滚 fair 调度策略？② 他是否已复现问题、打算怎么继续？"
    answer: "参考：① Because a late minute user regression report came in, so he reverted the policy switch to debug it in peace. ② He has not been able to reproduce it locally yet, and further debug will be needed, possibly after the holiday season."
    source: "There was a late minute user regression report, so let's revert this so it can be debugged in peace. I have not been able to locally reproduce it yet, but at least a partial fix looks to be this. Further debug will be needed, possibly after the holiday/vacation season is over."
    link: "https://lore.kernel.org/dri-devel/<20260811163139.99746-1-tvrtko.ursulin@igalia.com>/"
  - type: closing
    tagline: "A late minute regression → revert → debug in peace. Reading LKML is reading how maintainers think."
    source: "内核英语 · 每日一篇"
---
