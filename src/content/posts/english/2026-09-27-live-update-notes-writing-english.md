---
title: "写作：会议纪要怎么写，才能让没参会的人接得住"
date: "2026-09-27"
desc: "今日重点：写作——拆 Pasha Tatashin 的 Hypervisor Live Update 会议纪要，学「开头交代写给谁」「每条带人和时间」两条硬规矩，附仿写模板。"
column: "english"
focus: "写作"
tags: ["写作", "标题解析"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——内核社区大量协作靠邮件往来，而<strong>会议纪要</strong>是其中最容易被写坏的一种：
      写完只有参会的人看得懂，没去的人还是一头雾水。今天拆 Pasha Tatashin 的 Hypervisor Live Update 纪要——
      这份写得好在哪，有什么可以直接抄的结构。
  - type: divider
    label: "📖 原文节选（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      Hi everybody,

      Here are the notes from our Hypervisor Live Update call held on September 21.
      These notes are intended to bring those who could not attend up to speed
      and to keep the momentum going between meetings.
  - type: paragraph
    text: >-
      出处：Pasha Tatashin，<code>[Hypervisor Live Update] Notes from September 21, 2026</code>，
      linux-mm，09-25 22:30 北京。
      <a href="https://lore.kernel.org/linux-mm/&lt;20260925143000.2729890-1-pasha.tatashin@soleen.com&gt;/">原文</a>
  - type: divider
    label: "✍️ 拆解：让纪要可交接的四条规矩"
    kind: section
  - type: toc
    items:
      - label: "开头先交代「写给谁、解决什么」"
        text: "These notes are intended to bring those who could not attend up to speed and to keep the momentum going between meetings. intended to 说明用途；bring ... up to speed（让……跟上进度）是固定说法。两个目的讲得很清楚：给缺席的人补课、在两次会议之间保持推进。写纪要别直接进内容——先一句话说清这份东西解决什么问题。"
      - label: "用分隔符切块，不靠标题层级"
        text: "每个议题前是一条 ----->o----- 分隔线。纯文本邮件没有 markdown 标题，这是原生的分节手段：让读者能快速跳到关心的那段。长纪要尤其需要——不切块的话，收件人只能从头读到尾。"
      - label: "每条都按「标签 → 谁 → 做了什么 → 结论」"
        text: "PCI v9 Status: Bjorn Helgaas finished reviewing v8, and David Matlack posted v9 addressing all feedback. All major design questions raised on v8 have been resolved. 冒号前是状态标签（扫读定位），中间点名到人加动词，最后一句给结论。三段式，一眼看完。"
      - label: "归属必须钉死：谁说、谁负责"
        text: "全文用 David Matlack clarified that / Samiullah Khawaja noted that 这类句式。动词本身就携带信息——clarified（澄清）比 said 有分量，noted（指出）暗示这是个待处理的信息点。多人讨论的纪要最忌「据说」「有人提到」——出现这种措辞，读者就不知道该找谁。"
      - label: "下一步必须带人和时间"
        text: "Pasha will wait a few days for Bjorn's final review tags before applying v9 to liveupdate/next, aiming to land the series within the next 1-2 weeks (ideally next week prior to 7.3-rc6) for Linux 7.4. 主语是人（Pasha will），不是被动的 will be done；时间给了三层——等多久（a few days）、目标窗口（next 1-2 weeks）、硬约束（prior to 7.3-rc6）、最终目标（Linux 7.4）。没有人和时间的「下一步」，等于没有下一步。"
  - type: divider
    label: "✍️ 仿写模板"
    kind: section
  - type: highlight
    title: "可套用的纪要骨架"
    meta: "适用于任何多人协作会议"
    points:
      - label: "开头"
        text: "Here are the notes from our &lt;会议名&gt; call held on &lt;日期&gt;. These notes are intended to bring those who could not attend up to speed and to keep the momentum going between meetings."
      - label: "每条议题"
        text: "&lt;议题名&gt; — &lt;状态标签&gt;: &lt;谁&gt; &lt;做了什么&gt;. &lt;结论一句话&gt;."
      - label: "每条待办"
        text: "&lt;谁&gt; will &lt;做什么&gt; before &lt;节点&gt;, aiming to &lt;目标&gt; within &lt;时间窗&gt; (ideally &lt;硬期限&gt;) for &lt;最终目标&gt;."
      - label: "仿写示范"
        text: "Landing: David will rework the CSI-2 RX format table before the next call, aiming to post v4 within two weeks (ideally before the rc6 cutoff) for the 7.4 merge window."
  - type: divider
    label: "✨ 辅助彩蛋：标题解析"
    kind: section
  - type: highlight
    title: "[Hypervisor Live Update] Notes from September 21, 2026"
    meta: "方括号前缀 ≠ 子系统前缀"
    points:
      - label: "两套前缀，两种性质"
        text: "内核邮件标题里有两套前缀约定：<code>[PATCH v9 00/13]</code> 这种方括号加 PATCH 是待合入的补丁系列；<code>[Hypervisor Live Update]</code> 这种方括号加工作组名，是<strong>非补丁邮件</strong>——会议纪要、状态更新、RFC 召集。"
      - label: "为什么有用"
        text: "维护者扫一眼标题就知道该不该点开：方括号里是工作组名而不是 PATCH，说明这不是需要评审的代码，而是组织性信息。写这类邮件时沿用同一个方括号标签，还能让同一条线的历史邮件聚在一起，方便按标题检索。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "假设你刚开完一次相机链路的上游对齐会，产出了三件事：① 格式命名方案已收敛；② 有人指出 SerDes 侧的对齐校验还没覆盖；③ 下一位负责人要改完再发下一版。请按上面的骨架，用英文写三条纪要。"
    answer: "参考作答（仿写示范，非原文）：① Format Naming: The group agreed on a single naming scheme for the eight RGBIr formats; no further design questions remain. ② SerDes Coverage: Laurent noted that the alignment check on the deserializer side is not covered yet, and asked for it to be added before the next revision. ③ Next Revision: Rishikesh will rework the format table and the SerDes check before the next call, aiming to post v2 within two weeks (ideally before the rc6 cutoff) for the 7.4 merge window."
    source: "These notes are intended to bring those who could not attend up to speed and to keep the momentum going between meetings. ... * Landing Timeline: Pasha will wait a few days for Bjorn's final review tags before applying v9 to liveupdate/next, aiming to land the series within the next 1-2 weeks (ideally next week prior to 7.3-rc6) for Linux 7.4."
    link: "https://lore.kernel.org/linux-mm/<20260925143000.2729890-1-pasha.tatashin@soleen.com>/"
  - type: closing
    tagline: "每日一句：Notes nobody can act on are just a transcript. Name the person, name the date."
    source: "仿写示范"
---
