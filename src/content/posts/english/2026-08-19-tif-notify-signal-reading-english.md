---
title: "读一段真实 cover letter：Brauner 怎么解释 io_uring 截断 coredump"
date: "2026-08-19"
desc: "今日重点：阅读——读 TIF_NOTIFY_SIGNAL 系列 cover letter 的真实英文，学维护者怎么把一个深层 bug 讲得清楚又有人味。"
column: "english"
focus: "阅读"
tags: ["阅读", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：📖 阅读</strong>——今天读一段真实的 cover letter：fs 域维护者 Christian Brauner 解释 io_uring 的 TIF_NOTIFY_SIGNAL 为什么会悄悄截断 coredump。这段文字既有准确的技术表述，又有维护者的自嘲语气，是读 LKML 的绝佳样本。
  - type: divider
    label: "📖 阅读素材"
  - type: highlight
    title: "维护者怎么讲清「一个标志位截断了 coredump」"
    meta: "linux-mm · [PATCH 0/4] Stop TIF_NOTIFY_SIGNAL from interrupting work that can't be restarted"
    link: "https://lore.kernel.org/linux-mm/<20260818-work-tif_notify_signal-v1-0-1ee1fcc5b3ff@kernel.org>/"
    points:
      - label: "英文原段"
        text: "TIF_NOTIFY_SIGNAL is used to kick a task in uninterruptible sleep to return to userspace and run task work and then go back to sleep. This mechanism works well but breaks coredumps. dump_interrupted() only allows fatal signals to interrupt a coredump and the whole regular write path going to actual filesystems is impervious to TIF_NOTIFY_SIGNAL as well."
      - label: "中文理解"
        text: "「TIF_NOTIFY_SIGNAL 这个标志位，用来把处于不可中断睡眠的任务踢回用户态、跑完 pending 的 task work，再回去睡。这个机制本身没问题，但会把 coredump 搞坏。dump_interrupted() 只允许致命信号打断转储；而真正写数据的常规写路径——落到真实文件系统的那段——同样对 TIF_NOTIFY_SIGNAL 无感（本不应被打断，实际却会）。」"
      - label: "阅读要点"
        text: "三个读 LKML 高频表达——<code>kick a task</code>（把任务「踢」回，口语化动词）；<code>breaks coredumps</code>（动词 break 表「搞坏、破坏」，比 damages 更口语）；<code>impervious to</code>（对……无感/免疫，这里略带反讽：本该不受影响的路径其实会受影响）。句子结构：先说机制做什么（is used to…）、再转折（This mechanism works well but…）、最后给反例（dump_interrupted() only allows…）。"
  - type: divider
    label: "✨ 辅助彩蛋"
  - type: highlight
    title: "维护者的自嘲式语气"
    meta: "同一封 cover letter"
    link: "https://lore.kernel.org/linux-mm/<20260818-work-tif_notify_signal-v1-0-1ee1fcc5b3ff@kernel.org>/"
    points:
      - label: "真实原句"
        text: "Ok, so I was looking into things and as usual got side-tracked so here we are. Oleg, save me please. ... So the amount of patches for this issue over the years is impressive. So let me add one to the pile for the lolz."
      - label: "中文理解"
        text: "「好吧，我本来是查别的事，结果照例跑偏了，于是就有了这个系列。Oleg，救救我吧。……这些年为这问题攒的补丁数量相当可观，那我也往堆里再添一个，图一乐。」"
      - label: "可学点"
        text: "内核邮件的「人味」：<code>got side-tracked</code>（跑偏了）、<code>Oleg, save me please</code>（点名求助，带玩笑）、<code>add one to the pile</code>（往堆里再添一个）、<code>for the lolz</code>（图一乐）。读 LKML 不必被这些吓到——这是维护者之间熟络后的正常语气，反倒说明问题棘手到值得调侃。"
  - type: divider
    label: "✍️ 今日练习"
  - type: exercise
    text: "阅读理解：用英文回答两个问题——① 为什么 TIF_NOTIFY_SIGNAL 会截断 coredump？② 为什么不直接清掉这个标志位？"
    answer: "参考：① TIF_NOTIFY_SIGNAL makes deep callchains in the pipe and socket code call signal_pending() and see a fake pending signal, so the coredump write gets interrupted and truncated — the more io_uring work in flight, the more of the dump is lost. ② Clearing it won't help because the next completion sets the bit again; the setter is used from too many places, so the state has to be ambient/per-task rather than fixed in one subsystem."
    source: "TIF_NOTIFY_SIGNAL is used to kick a task in uninterruptible sleep to return to userspace and run task work and then go back to sleep. This mechanism works well but breaks coredumps. dump_interrupted() only allows fatal signals to interrupt a coredump and the whole regular write path going to actual filesystems is impervious to TIF_NOTIFY_SIGNAL as well."
    link: "https://lore.kernel.org/linux-mm/<20260818-work-tif_notify_signal-v1-0-1ee1fcc5b3ff@kernel.org>/"
  - type: closing
    tagline: "Kick a task back, break a coredump, add one to the pile for the lolz — reading LKML is reading how maintainers think and joke."
    source: "内核英语 · 每日一篇"
---
