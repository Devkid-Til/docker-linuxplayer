---
title: "回滚补丁里的地道英文：Revert...to / late minute regression"
date: "2026-08-12"
desc: "今日重点：地道表达——从今天 drm-sched 回滚系列学「回滚」「最后关头」的英文表达。"
column: "english"
focus: "地道表达"
tags: ["地道表达", "标题解析"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：💬 地道表达</strong>——今天从真实的 drm-sched 回滚补丁学两个地道表达：回滚（Revert...to）和最后关头（late minute）。都来自真实补丁/讨论。
  - type: divider
    label: "💬 地道表达"
  - type: highlight
    title: "Revert ... to ...（回滚到）"
    meta: "dri-devel · drm-sched · PATCH v3"
    link: "https://lore.kernel.org/dri-devel/<20260811163139.99746-1-tvrtko.ursulin@igalia.com>/"
    points:
      - label: "真实原句"
        text: "[PATCH v3 00/19] Revert switching default DRM scheduler policy to fair"
      - label: "中文"
        text: "回滚「把默认 DRM 调度策略切到 fair」——revert（回滚）+ switching default X to Y（把默认 X 切到 Y）"
      - label: "用法"
        text: "「Revert X to Y」= 把改动回滚到某个状态；「switch default ... to ...」= 切换默认值——内核补丁标题常见；注意 real 补丁用「switching ... to」而非「switch ... into」"
  - type: highlight
    title: "late minute + further debug will be needed"
    meta: "dri-devel · 讨论 · 2026-08-11"
    link: "https://lore.kernel.org/dri-devel/<bbe573b2-cee8-4647-bb75-662ced57b2d3@igalia.com>/"
    points:
      - label: "真实原句"
        text: "There was a late minute user regression report, so let's revert this. Further debug will be needed, possibly after the holiday."
      - label: "中文"
        text: "最后关头冒出一个用户回归报告，所以咱们先回滚。进一步调试还需要，可能等假期之后。"
      - label: "用法"
        text: "「late minute」（也写 last-minute）= 最后关头/临门一脚；「let's revert this」= 提议回滚（协商式祈使）；「Further ... will be needed」= 还需要进一步……；「after the holiday」= 假期后（维护者真实时间表达）"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "Export ... from ... to ...（从...导出到...）"
    meta: "dri-devel · nova · PATCH v4"
    link: "https://lore.kernel.org/dri-devel/<20260811050657.646799-1-apopple@nvidia.com>/"
    points:
      - label: "真实原句"
        text: "[PATCH v4 0/7] gpu: nova: Export parameters from nova-core to nova-drm"
      - label: "用法"
        text: "「Export X from A to B」= 把 X 从 A 导出到 B——模块间暴露接口的固定表达，比「send/share」正式"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "用今天学的表达各造一句：① 用「Revert ... to ...」说一句「回滚了某改动」；② 用「late minute ... report」说一句「最后关头发现问题」。写完再点开答案核对。"
    answer: "参考：① We revert the default scheduler policy back to FIFO after the late minute regression report. ② A late minute compatibility report forced us to revert the change; further debug will be needed."
    source: "There was a late minute user regression report, so let's revert this. Further debug will be needed, possibly after the holiday."
    link: "https://lore.kernel.org/dri-devel/<bbe573b2-cee8-4647-bb75-662ced57b2d3@igalia.com>/"
  - type: closing
    tagline: "Revert X to Y. A late minute report. Further debug will be needed — three patterns for reviewing kernel regressions."
    source: "内核英语 · 每日一篇"
---
