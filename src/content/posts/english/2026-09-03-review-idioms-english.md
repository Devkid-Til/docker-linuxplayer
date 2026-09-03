---
title: "地道表达：内核评审邮件里怎么「客气地提意见」"
date: "2026-09-03"
desc: "今日重点：地道表达——从真实的内核评审对话（KVM TDX 补丁讨论）学怎么礼貌地夸、委婉地否、有取舍地收。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "阅读"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——正式补丁 prose 教你怎么写，而<strong>评审往来</strong>才是内核社区的日常口语。今天拆一段真实评审（lkml · KVM TDX CPUID 补丁讨论），学怎么「客客气气地表达不同意」。
  - type: divider
    label: "💬 地道表达：一段真实评审对话"
  - type: highlight
    title: "客套与肯定：Thanks, it reads better."
    meta: "lkml · Re: [PATCH v3 1/4] KVM: TDX: Track configurable CPUID bits"
    link: "https://lore.kernel.org/lkml/a30741f8-b99b-4f36-80a5-4688c2578d99@linux.intel.com/"
    points:
      - label: "真实原句"
        text: "Thanks, it reads better."
      - label: "中文理解"
        text: "「谢谢，这样读起来顺多了。」—— 作者改了代码后，评审人的简短认可。it reads better 是内核社区夸「这段代码/这段描述改得更顺」的惯用说法，比 good 更具体（强调「读感」而非「正确」）。"
      - label: "用法"
        text: "回复别人的修改时用 <code>reads better</code>：<code>The new comment reads better.</code> / <code>This version reads much better than the previous one.</code> 简短、具体、有温度——比一句干巴巴的 OK 更像真人评审。"
  - type: highlight
    title: "委婉否定：I think ... is not necessary, we can rely on ..."
    meta: "同一封评审 · 对补丁里两步方案的取舍"
    link: "https://lore.kernel.org/lkml/a30741f8-b99b-4f36-80a5-4688c2578d99@linux.intel.com/"
    points:
      - label: "真实原句"
        text: "I think 1) is not necessary, we can rely on 2)."
      - label: "中文理解"
        text: "「我觉得第 1) 条没必要，我们依赖 2) 就够了。」—— 内核评审里提「删掉某步」的标准温和说法：用 <code>I think</code> 开头（主观、非命令），用 <code>we can rely on</code> 给出替代（「我们」把作者拉进同一立场）。"
      - label: "用法"
        text: "想建议删功能/去代码时：<code>I think this check is not necessary, we can rely on the existing error path.</code> 比 <code>Remove this</code> 柔和得多——把决定权留给作者，自己只给理由。"
  - type: highlight
    title: "评审人交代自己的取舍习惯：In general, I prefer not to ..."
    meta: "同一封评审 · 说明为何倾向不加多余特性"
    link: "https://lore.kernel.org/lkml/a30741f8-b99b-4f36-80a5-4688c2578d99@linux.intel.com/"
    points:
      - label: "真实原句"
        text: "In general, if a feature is not supported by the common KVM CPU caps, I prefer not to add it to the list to save a few lines of code, which probably is dead code."
      - label: "中文理解"
        text: "「总的来说，如果某特性不被通用的 KVM CPU caps 支持，我倾向不把它加进列表——省那几行八成是死代码的代码。」—— <code>In general</code> 起手表明这是「一贯原则」而非针对本条；<code>I prefer not to</code> 是「我倾向不」而非「你不许」；末尾 <code>which probably is dead code</code> 轻描淡写补一刀，点破那几行没用。"
      - label: "用法"
        text: "给维护者写理由时：<code>In general, I prefer not to add code paths that are never exercised — they tend to rot.</code> 用 prefer 而不是 must/should，姿态是「这是我的取舍」，不是「你必须照做」。"
  - type: highlight
    title: "作者接话：I can call this out in the changelog"
    meta: "作者回复（同一线程）"
    link: "https://lore.kernel.org/lkml/a30741f8-b99b-4f36-80a5-4688c2578d99@linux.intel.com/"
    points:
      - label: "真实原句"
        text: "I can call this out in the changelog, and maybe also the doc for KVM_TDX_CAPABILITIES."
      - label: "中文理解"
        text: "「我会在 changelog 里点明这一点，可能也在 KVM_TDX_CAPABILITIES 的文档里提一下。」—— 作者回应评审意见的标准姿态：<code>call this out</code>（明确指出/点名），用 <code>I can</code> 而不是 I will，语气更谦和（「我可以」而非「我保证」）。"
      - label: "用法"
        text: "答应把某个说明写进文档/注释：<code>I can call this out in the commit message and the header comment.</code> <code>I can</code> + 具体动作，是「愿意配合」又不显得卑微的平衡点。"
  - type: divider
    label: "✨ 辅助彩蛋（阅读）"
  - type: highlight
    title: "把四句串起来看：一场评审的「温度曲线」"
    meta: "同一线程 · 读评审的语感"
    link: "https://lore.kernel.org/lkml/a30741f8-b99b-4f36-80a5-4688c2578d99@linux.intel.com/"
    points:
      - label: "串读"
        text: "先夸（<code>reads better</code>）→ 再提取舍（<code>I think ... not necessary</code>）→ 交代原则（<code>In general, I prefer not to...</code>）→ 作者接招（<code>I can call this out...</code>）。注意：没有一句是祈使句命令，全是「观点 + 理由 + 给作者留余地」—— 这就是内核评审的语感：<strong>把要求说成建议，把否定包在肯定里</strong>。"
      - label: "可学点"
        text: "下次在群里/评审里想表达不同意，试试这套：先用 <code>reads better / looks reasonable</code> 接住对方，再用 <code>I think ... not necessary</code> 或 <code>I'd prefer ...</code> 给出你的取舍，最后一定补理由——内核社区不流行生硬的 No。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "用今天学的表达，给一个假设的补丁回复写 3 句英文：① 肯定一处改进（reads better）；② 委婉说某一步没必要（I think ... not necessary, we can rely on ...）；③ 交代你的一贯原则（In general, I prefer not to ...）。"
    answer: "参考（仿写示范，非原句）：The simplified error path reads much better now. I think the extra validation step is not necessary here — we can rely on the existing bounds check. In general, I prefer not to add checks that the callers can't actually hit; they tend to become dead code."
    source: "In general, if a feature is not supported by the common KVM CPU caps, I prefer not to add it to the list to save a few lines of code, which probably is dead code."
    link: "https://lore.kernel.org/lkml/a30741f8-b99b-4f36-80a5-4688c2578d99@linux.intel.com/"
  - type: closing
    tagline: "Kernel review is politeness with a kernel beneath it — disagree as a suggestion, not a command."
    source: "内核英语 · 每日一篇"
---
