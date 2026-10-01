---
title: "可控返回栈进 KVM：arm64 GCS 到第 21 版；x86 APX 让客户机用上扩展寄存器"
date: "2026-10-01"
desc: "arm64 GCS 客户机支持到 v21：硬件保护的返回地址栈终于进 KVM；KVM x86 的 APX v8 让客户机拿到 EGPR，作者还预告了 Sashiko 的误报。"
column: "daily"
tags: ["mm", "DRM", "PCI", "net", "fs", "Rust", "block", "arch", "LSM"]
blocks:
  - type: hook
    text: >-
      今天是「两个架构的虚拟化同时往前推」：<strong>arm64 的 GCS（Guarded Control Stack）到第 21 版</strong>——
      把硬件保护的返回地址栈交给客户机；另一边 <strong>KVM x86 的 APX 到 v8</strong>，
      让客户机也用上扩展通用寄存器。顺带一提，APX 那封信里作者专门预告了 AI 评审工具 Sashiko 的误报。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-01/cover.png"
    alt: "封面 · 10月1日 · 可控返回栈进 KVM"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "KVM arm64 GCS 到 v21（15 帖）：硬件保护的返回地址栈，客人也能用"
      - label: "头条"
        text: "KVM x86 APX 到 v8（20 帖）：客户机拿到 EGPR，作者预告 Sashiko 误报"
      - label: "fs"
        text: "mount 一批修复，标题自称「the Oprah edition」；netfs 用 bio_vec 链替掉 folio_queue 到 v14"
      - label: "Rust"
        text: "Rust PCI SR-IOV 到 v3；转换派生宏 v7 补齐 From 的穷尽性；ID 区间保留 v9"
      - label: "DRM"
        text: "msm DP 静态 HDR 13 帖；nova-core 命令队列 v3；Renesas RZ/G3L 显示子系统 v4"
      - label: "media"
        text: "Dell Latitude 5285 二合一相机 v11（旧机器靠软硬件一起点亮）"
      - label: "mm"
        text: "device DAX 转 section-based vmemmap 到 v6"
      - label: "机制"
        text: "JHB100 SoC 时钟复位 23 帖；i.MX952 ISI 到 v4（RAW14 与对齐）"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-01/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-01 06:23 北京，近 24h 各板块真实计数：net 752 · DRM 354 · media 215 · PCI 187 ·
      mm 160 · Rust 154 · fs 146 · block 42 · arch 31 · LSM 26 · rt 19 · virtio 1。
      net 依然是量最大的一头，但今天最重的两条都在 lkml（两个架构的 KVM 虚拟化），
      Rust 的 154 也明显高于平常——多为 PCI SR-IOV、派生宏、ID 区间这几条系列在往返。
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "可控返回栈进 KVM：arm64 GCS 的客户机支持到第 21 版"
    meta: "〔10-01 05:48 北京〕· [PATCH v21 00/15] KVM: arm64: Provide guest support for GCS"
    points:
      - label: 现状
        text: >-
          GCS（Guarded Control Stack）是 arm64 的硬件特性：维护一个<strong>受保护的返回地址栈</strong>，
          用于对抗 ROP（返回导向编程）攻击，也方便采集调用栈。它由内存属性保护，
          只能通过特定的 GCS 指令写入；BL 执行时把 LR 压进 GCS，RET 时弹出并与 LR 比对，
          不一致就报错——而且 GCS 操作只能作用在 GCS 页上。
      - label: 痛点
        text: >-
          硬件强制的返回地址校验，比纯软件的影子栈（如 clang 的实现）更难攻击、开销也更低——
          因为函数出入口不需要额外指令。但虚拟机里的客户机此前拿不到它。
      - label: 为什么
        text: >-
          这条线的价值在「<b>虚拟机里的进程也能被硬件保护</b>」：把 GCS 的上下文
          （GCS 指针、GCS 相关系统寄存器、以及配套的异常处理）纳入 KVM 的 vCPU 状态保存与恢复。
          客人用上它之后，跑在 VM 里的应用同样获得 ROP 防护。
      - label: 下一步
        text: >-
          <b>v21 这个版本号本身就是信息</b>——能走到第 21 版说明评审在持续收敛而不是卡死，
          但也说明这条线的边角之争（系统寄存器建模、迁移兼容、异常语义）格外费时间。
    verdict: >-
      硬件安全特性进虚拟化通常比进裸机慢得多：多一层「客户机的这个状态怎么保存、怎么迁移」要谈。
      21 版是个信号——方向没人反对，细节磨得久。
    link: "https://lore.kernel.org/lkml/<20260930-arm64-gcs-v21-0-3556644cd927@kernel.org>/"
  - type: headline
    title: "x86 客户机也能用扩展寄存器：KVM APX 到 v8，作者还预告了 AI 评审的误报"
    meta: "〔10-01 05:37 北京〕· [PATCH v8 00/20] KVM: x86: Enable APX for guests（Chang S. Bae / Intel）"
    points:
      - label: 现状
        text: >-
          APX（Advanced Performance Extensions）给 x86 增加了 EGPR（扩展通用寄存器）等能力。
          KVM 要把这些能力透给客户机，就得在 vCPU 状态保存/恢复、VMX 的指令信息解码、
          以及模拟器路径上都接上——20 帖正好覆盖这些面。
      - label: 方案
        text: >-
          v8 是重基到 KVM next 树的一版，并带上了 Zhao 的 test tag。帖子序列从
          「扩展 VCPU 寄存器以容纳 EGPRs」开始，走到 VMX 侧保存、XSAVE ABI 的 APX 状态、
          指令信息解码重构，最后是模拟器对 EGPR 的支持。
      - label: 值得单独看的
        text: >-
          作者在开头写了一句很实在的话：<b>I expect Sashiko to reply to a bunch of patches.
          I previously found some false positives, so I will comment on them again in this posting.</b>
          ——他预先声明哪些 AI 评审的告警是误报。这在投稿信里还是新鲜事：
          <b>AI 评审工具已经成为作者需要主动应对的「另一方」</b>。
      - label: 下一步
        text: >-
          v8 阶段，形态已经稳定。看 KVM 维护者对 EGPR 在迁移场景下的处理意见。
    verdict: >-
      功能本身是常规的「新硬件特性透传」，但作者那句预告更有时代感——
      邮件列表上现在同时有人和 AI 在评审。
    link: "https://lore.kernel.org/lkml/<20260930210750.1487547-1-chang.seok.bae@intel.com>/"
  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "mount 一批修复，作者把标题写成「the Oprah edition」"
    meta: "〔09-30 21:32 北京〕· [PATCH 00/17] mount: more bugfixes, the Oprah edition"
    points:
      - label: 定位
        text: >-
          VFS 挂载层的修复合集。标题致敬美国脱口秀主持人 Oprah 的经典桥段——
          「你有车！你也有车！」——意思是<b>这一轮修复多到见者有份</b>。
      - label: 效益
        text: >-
          17 帖覆盖挂载路径上的若干边角。内核标题通常克制，这种自嘲式标题属于少数，
          读起来能感到作者修到一定数量后的无奈。
    relevance: 挂载层的边角修复值得扫一眼，但重点不在这一批——它更多是清理。
    link: "https://lore.kernel.org/linux-fsdevel/<20260930-work-mount-fixes-3-v1-0-be34c83956ae@kernel.org>/"
  - type: highlight
    title: "netfs 用 bio_vec 数组链替掉 folio_queue，到 v14"
    meta: "〔09-30 20:53 北京〕· [PATCH v14 00/10] netfs, iov_iter: Use a chain of bio_vec arrays instead of folio_queue（David Howells）"
    points:
      - label: 定位
        text: >-
          netfs 是网络文件系统的公共层，iov_iter 是内核搬运数据的通用迭代器。
          这项改动把「用 folio_queue 描述待搬数据」换成「用 bio_vec 数组组成的链」。
      - label: 为什么
        text: >-
          bio_vec 是块层描述「一段内存 + 长度」的标准结构，bio 由它组成。
          换过去之后，netfs 的数据描述和块层说同一种语言——<b>少一层转换</b>。
      - label: 下一步
        text: >-
          v14 且作者是 David Howells，属于「长时间打磨、反复重发」的典型。
          这类底层数据结构替换不进则以，进了影响面很广。
    relevance: 数据搬运路径的表示统一，属于长期收益型重构。
    link: "https://lore.kernel.org/linux-fsdevel/<20260930125247.3232130-1-dhowells@redhat.com>/"
  - type: divider
    label: "📰 Rust"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<cover.1790705494.git.zhiw@nvidia.com>/"
        text: "Rust PCI SR-IOV 到 v3：从 Rust 侧控制虚拟功能，抽象层继续补齐"
        time: 09-30 18:19
      - link: "https://lore.kernel.org/rust-for-linux/<20260930002436.21395-1-chaoji_xinren@163.com>/"
        text: "Rust 转换派生宏到 v7：补齐 From 的穷尽性支持"
        time: 09-30 08:26
      - link: "https://lore.kernel.org/dri-devel/<20260930-chid-v9-0-0d6cca376cff@nvidia.com>/"
        text: "Rust 的 ID 区间保留到 v9（9 帖）：给需要连续编号的子系统用"
        time: 09-30 10:44
  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20260930-msm-dp-hdr10-v1-0-dbbf8b2b42bc@radxa.com>/"
        text: "msm DP 静态 HDR（13 帖）：给 DP 与 eDP 两条路都接上 HDR10"
        time: 09-30 20:44
      - link: "https://lore.kernel.org/dri-devel/<20260930-cmdq-rpc-v3-0-91613f06520b@nvidia.com>/"
        text: "nova-core 命令队列 v3：为 r000 双消息类型做准备"
        time: 09-30 22:58
  - type: divider
    label: "📰 media / mm / net"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<20260930214321.600863-1-tchatard@gmail.com>/"
        text: "Dell Latitude 5285 二合一相机到 v11（9 帖）：老机器靠 IPU3 与传感器配合点亮"
        time: 10-01 05:43
      - link: "https://lore.kernel.org/linux-mm/<20260930140627.57431-1-songmuchun@bytedance.com>/"
        text: "device DAX 转向 section-based vmemmap 优化，到 v6（12 帖）"
        time: 10-01 03:01
      - link: "https://lore.kernel.org/netdev/<20260930124317.5648-1-changhuang.liang@starfivetech.com>/"
        text: "JHB100 SoC 的时钟与复位 23 帖（v5）：StarFive 新平台的基建"
        time: 10-01 06:43
  - type: divider
    label: "📌 机制雷达：2 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "两个架构同时推进虚拟化安全特性"
        text: >-
          arm64 GCS 与 x86 APX 是两条独立线，但都属「把新的 CPU 能力透给客户机」。
          共同难点从来不是特性本身，而是<b>客户机状态的保存、恢复与迁移兼容</b>——
          这也是它们都要走到两位数版本的原因。
          <a href="https://lore.kernel.org/lkml/<20260930-arm64-gcs-v21-0-3556644cd927@kernel.org>/">GCS 原文</a>
      - label: "AI 评审进入作者的工作流"
        text: >-
          APX 那封信里作者主动预告 Sashiko 的误报。这意味着投稿信现在要同时对着
          <b>人类维护者和 AI 评审工具</b>写——作者得预判机器会挑出什么、并提前说明哪些不算问题。
          这个变化值得持续观察。
          <a href="https://lore.kernel.org/lkml/<20260930210750.1487547-1-chang.seok.bae@intel.com>/">原文</a>
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "GCS（Guarded Control Stack）"
        text: >-
          arm64 的硬件保护返回地址栈。受内存属性保护、只能由特定 GCS 指令写入；
          BL 压栈、RET 弹出比对，不一致即报错。用于对抗 ROP 攻击。
      - label: "APX / EGPR"
        text: >-
          APX（Advanced Performance Extensions）是 x86 的指令集扩展，
          EGPR（Extended General Purpose Registers）是它带来的扩展通用寄存器。KVM 要把它们透给客户机。
      - label: "Sashiko"
        text: >-
          内核社区的 AI 代码评审工具，会针对补丁自动回帖。作者们开始需要在投稿信里
          预先说明它的哪些告警是误报。
      - label: "bio_vec"
        text: >-
          块层描述「一段内存 + 长度」的结构，若干 bio_vec 组成一个 bio。
          netfs 这轮改动用它替换 folio_queue，让数据描述与块层对齐。
      - label: "v21 / v14 / v11"
        text: >-
          内核补丁的版本号是「重发次数」。两位数通常意味着：方向被接受，
          但边角问题（兼容性、迁移、边界语义）反复打磨了很多轮。
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
