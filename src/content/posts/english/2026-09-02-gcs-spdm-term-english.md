---
title: "术语卡：GCS 与 SPDM —— 内核安全地基的两个新词"
date: "2026-09-02"
desc: "今日重点：术语卡——用 09-02 日报的两个头条术语（arm64 GCS 影子栈、Rust SPDM 设备认证）学真实英文定义与记忆钩子。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🏷️ 术语卡</strong>——今天认识两个安全术语：arm64 的 <code>GCS</code>（影子栈）和 <code>SPDM</code>（设备认证协议）。都来自今天日报的头条，定义取自补丁邮件原文（带 lore 链接可溯源）。
  - type: divider
    label: "🏷️ 术语卡：两个安全地基术语"
  - type: highlight
    title: "① GCS = Guarded Control Stack（受防护的控制栈 / 影子栈）"
    meta: "lkml · [PATCH v20 00/14] KVM: arm64: Provide guest support for GCS"
    link: "https://lore.kernel.org/lkml/20260901-arm64-gcs-v20-0-f31750bdfadb@kernel.org/"
    points:
      - label: "英文定义（原句）"
        text: "The current GCS pointer value stored in LR is also pushed onto the GCS, and when a RET is executed the top of the GCS is popped and compared to LR with a fault being raised if the values do not match. GCS operations may only be performed on GCS pages, a data abort is generated if they are not."
      - label: "中文理解"
        text: "「存在 LR 里的当前 GCS 指针值，也会压进 GCS；执行 RET 时，GCS 栈顶被弹出并与 LR 对比，不一致就触发 fault。GCS 操作只能在 GCS 页上进行，否则产生 data abort。」—— GCS 就是 arm64 的影子栈：函数返回地址多存一份在受保护的第二栈，返回时对账，防 ROP 攻击改返回地址。"
      - label: "记忆钩子"
        text: "GCS = <code>Guarded Control Stack</code>。三个动词串起机制：<code>pushed</code>（压入 LR 的副本）→ <code>popped and compared</code>（弹出对比）→ <code>fault raised</code>（不符即报错）。想成「返回地址存了个受保护的副本，回家时对一下账」。"
  - type: highlight
    title: "② SPDM = Security Protocols and Data Models（安全协议与数据模型）"
    meta: "linux-pci · [PATCH v3 00/21] lib: Rust implementation of SPDM"
    link: "https://lore.kernel.org/linux-pci/20260901010347.2614656-1-alistair.francis@wdc.com/"
    points:
      - label: "英文定义（原句）"
        text: "Security Protocols and Data Models (SPDM) is used for authentication, attestation and key exchange. SPDM is generally used over a range of [transports]. The SPDM specification is also complex, with the 1.2.1 spec being almost 200 [pages]."
      - label: "中文理解"
        text: "「SPDM 用于认证、可信证明和密钥交换，通常跑在一系列传输层之上。规范本身很复杂，1.2.1 版就有近 200 页。」—— 设备向主机证明「我是真设备、我没被篡改」的协议（如 PCIe 设备的 CMA 认证）。今天的新闻点是它被 <strong>Rust 重写</strong>（复杂规范 × 不可信输入 = 内存安全该上阵）。"
      - label: "记忆钩子"
        text: "SPDM 三件事，记三个词：<code>authentication</code>（你是谁）、<code>attestation</code>（你值得信）、<code>key exchange</code>（建立密钥）。缩写展开：Security Protocol + Data Model，一个管「怎么安全地谈」，一个管「谈的数据长什么样」。"
  - type: divider
    label: "✨ 辅助彩蛋（地道表达）"
  - type: highlight
    title: "原句里可直接用的两个表达"
    meta: "地道表达 · 从两个 cover letter 学"
    link: "https://lore.kernel.org/lkml/20260901-arm64-gcs-v20-0-f31750bdfadb@kernel.org/"
    points:
      - label: "a fault being raised if ..."
        text: "「若……则触发 fault」—— 内核英文里描述异常条件的标准结构：<code>with a fault being raised if the values do not match</code>。用「条件放在 if 后、后果用被动 being raised」把两个事件压缩成一句，读起来像设计文档，很地道。"
      - label: "is used for A, B and C"
        text: "SPDM 定义那句 <code>is used for authentication, attestation and key exchange</code> —— 「用于 A、B 和 C」的并列式，是解释一个东西用途的万能句式。给自己造一句：<code>BPF is used for tracing, networking and security.</code>"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "用 GCS 原句里学到的结构，用 2~3 句英文向别人解释「GCS 是怎么防返回地址被篡改的」。提示线索：LR 的副本压进第二个栈 → RET 时弹出对比 → 不符就 fault → 只能在 GCS 页上操作。"
    answer: "参考（仿写示范，非原句）：When GCS is active, a copy of the return address in LR is pushed onto a secondary, protected stack. On a RET, the top of that stack is popped and compared with LR — a fault is raised if they do not match. Since GCS operations are only allowed on dedicated GCS pages, an attacker who corrupts the return address can't pass the check."
    source: "The current GCS pointer value stored in LR is also pushed onto the GCS, and when a RET is executed the top of the GCS is popped and compared to LR with a fault being raised if the values do not match. GCS operations may only be performed on GCS pages, a data abort is generated if they are not."
    link: "https://lore.kernel.org/lkml/20260901-arm64-gcs-v20-0-f31750bdfadb@kernel.org/"
  - type: closing
    tagline: "A term is a door — open it with the original sentence, and the whole mechanism walks in."
    source: "内核英语 · 每日一篇"
---
