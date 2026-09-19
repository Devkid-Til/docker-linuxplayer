---
title: "Linux 开源邮件拆解：看懂每一封正式邮件的构造"
date: "2026-09-19"
desc: "从 Subject 到 Signed-off-by，拆解 Linux 邮件列表里一封正式邮件的各个组成部分，帮助新手入门开源社区。"
column: "journal"
tags:
  - "笔记"
blocks:
  - type: "hook"
    text: "Linux 内核社区靠邮件列表议事。但新手第一次打开 lore.kernel.org，往往被满屏的 Re:、[PATCH v3 2/7]、Signed-off-by 吓到。其实一封正式邮件的结构非常固定，看懂之后，阅读门槛会陡降。"

  - type: "divider"
    label: "📧 邮件头部：谁在跟谁说话"
    kind: "primary"

  - type: "paragraph"
    text: "邮件头部（Header）是邮件的「身份证」，包含路由、身份、主题等元信息。Linux 社区常用的字段有这些："

  - type: "toc"
    items:
      - label: "From"
        text: "发件人，通常是作者的真实姓名和邮箱。"
      - label: "To"
        text: "主要收件人。补丁邮件一般发给对应子系统的邮件列表。"
      - label: "Cc"
        text: "抄送对象。常包含维护者（Maintainer）、相关开发者、以及邮件列表本身。"
      - label: "Subject"
        text: "主题行。补丁邮件会带 [PATCH] 标签和版本/序号信息。"
      - label: "Date"
        text: "发送时间。跨时区协作时用来判断讨论先后。"
      - label: "Message-Id"
        text: "邮件唯一标识符。后续所有回复都靠它串成线程。"
      - label: "In-Reply-To / References"
        text: "回复指向。In-Reply-To 指父邮件的 Message-Id，References 记录整条线程链。"

  - type: "paragraph"
    text: "下面是一封完整补丁邮件的头部示例："

  - type: "code"
    text: "From: Alice Chen <alice@example.com>\nTo: linux-media@vger.kernel.org\nCc: Hans Verkuil <hverkuil@xs4all.nl>,\n    Mauro Carvalho Chehab <mchehab@kernel.org>,\n    linux-kernel@vger.kernel.org\nSubject: [PATCH v2 3/5] media: dvb: fix race condition in streaming start\nDate: Sat, 19 Sep 2026 10:00:00 +0800\nMessage-Id: <20260919020000.1234-1-alice@example.com>\nIn-Reply-To: <20260918010000.5678-1-alice@example.com>\nReferences: <20260918010000.5678-1-alice@example.com>"

  - type: "paragraph"
    text: "对照上面这封邮件，每个字段的含义就清晰了。"

  - type: "divider"
    label: "🔖 Subject：密码一样的主题行"
    kind: "section"

  - type: "paragraph"
    text: "Subject 是新手最容易懵的地方。因为它不只是标题，还承载了大量结构化信息。"

  - type: "code"
    text: "Subject: [PATCH v2 3/5] media: dvb: fix race condition in streaming start"

  - type: "paragraph"
    text: "拆解一下："

  - type: "toc"
    items:
      - label: "[PATCH]"
        text: "这是一个补丁邮件。"
      - label: "v2"
        text: "第 2 版。每根据评审修改一次，版本号递增，如 v3、v4。"
      - label: "3/5"
        text: "这是 5 封补丁邮件中的第 3 封。0/5 通常是 cover letter（封面信）。"
      - label: "media: dvb: fix race condition..."
        text: "补丁标题。前缀 media: dvb: 是子系统路径，帮助维护者快速定位。"

  - type: "paragraph"
    text: "其他常见标签也有固定含义："

  - type: "toc"
    items:
      - label: "[RFC]"
        text: "Request for Comments，征求意见，代码不一定 ready。例如：[RFC] drm: introduce new plane blending API。"
      - label: "[RESEND]"
        text: "重发。补丁没收到反馈，作者重新投递。例如：[RESEND v2] mm: fix page reclaim stall。"
      - label: "[GIT PULL]"
        text: "拉取请求。子系统维护者请求 Linus 拉取一个分支。例如：[GIT PULL] media fixes for v6.15-rc1。"
      - label: "[PATCH 0/N]"
        text: "封面信（cover letter），解释整个补丁系列要解决什么问题。"

  - type: "paragraph"
    text: "如果是回复，Subject 前面会加 <mark>Re:</mark>；如果是转发，会加 <mark>Fw:</mark>。"

  - type: "code"
    text: "Subject: Re: [PATCH v2 3/5] media: dvb: fix race condition in streaming start"

  - type: "divider"
    label: "✍️ 正文与 Signed-off-by"
    kind: "section"

  - type: "paragraph"
    text: "正文是邮件的沟通主体。补丁邮件的正文通常分三段："

  - type: "toc"
    items:
      - label: "问题背景"
        text: "说明当前代码有什么问题、什么场景会触发。"
      - label: "解决方案"
        text: "说明怎么改的、为什么选择这种方式。"
      - label: "测试或影响"
        text: "说明是否测试过、会影响哪些平台或驱动。"

  - type: "paragraph"
    text: "一个典型的正文示例："

  - type: "code"
    text: "When the frontend is started concurrently with a tuning request,\nthe state lock is not held long enough, leading to a use-after-free\nin dvb_frontend_stop().\n\nHold fe->lock across the entire start sequence and move the state\ncheck before any resource is allocated.\n\nTested on a USB DVB-T2 stick with dvb-usb-rtl28xxu.\n\nSigned-off-by: Alice Chen <alice@example.com>"

  - type: "paragraph"
    text: "正文末尾通常有一行或多行 <strong>Signed-off-by</strong>："

  - type: "code"
    text: "Signed-off-by: Alice Chen <alice@example.com>"

  - type: "paragraph"
    text: "这行不是签名装饰，而是 <strong>开发者原创声明（DCO）</strong>。它表示：这段代码是我写的，或者我有权以开源许可证提交它。没有 Signed-off-by 的补丁，维护者通常不会合入。"

  - type: "divider"
    label: "🧩 补丁邮件的特殊结构"
    kind: "section"

  - type: "paragraph"
    text: "补丁邮件的正文之后，会跟着一段 <code>---</code> 分隔线和 diff 内容。"

  - type: "code"
    text: "---\n drivers/media/dvb-core/dvb_frontend.c | 4 +++-\n 1 file changed, 3 insertions(+), 1 deletion(-)\n\ndiff --git a/drivers/media/dvb-core/dvb_frontend.c b/drivers/media/dvb-core/dvb_frontend.c\nindex 1a2b3c4..5d6e7f8 100644\n--- a/drivers/media/dvb-core/dvb_frontend.c\n+++ b/drivers/media/dvb-core/dvb_frontend.c\n@@ -1456,7 +1456,8 @@ static int dvb_frontend_start(struct dvb_frontend *fe)\n \tmutex_lock(&fe->lock);\n \tif (fe->state != DVB_FE_IDLE) {\n \t\tmutex_unlock(&fe->lock);\n-\t\treturn -EBUSY;\n+\t\tret = -EBUSY;\n+\t\tgoto err;\n \t}\n \tfe->state = DVB_FE_STARTING;\n \tmutex_unlock(&fe->lock);"

  - type: "paragraph"
    text: "<code>---</code> 上面是变更统计（diffstat），下面是具体的代码差异。红色行带 <code>-</code> 是删除，绿色行带 <code>+</code> 是新增。看 diff 时，重点看上下文是否完整、逻辑是否自洽。"

  - type: "divider"
    label: "🧵 回复与线程"
    kind: "section"

  - type: "paragraph"
    text: "社区讨论不是单封邮件，而是线程（Thread）。邮件客户端或 lore.kernel.org 会把同一主题的邮件折叠成树状结构。"

  - type: "paragraph"
    text: "回复邮件的头部会指向父邮件："

  - type: "code"
    text: "From: Hans Verkuil <hverkuil@xs4all.nl>\nTo: Alice Chen <alice@example.com>\nCc: linux-media@vger.kernel.org\nSubject: Re: [PATCH v2 3/5] media: dvb: fix race condition in streaming start\nMessage-Id: <20260919110000.4321-hans@xs4all.nl>\nIn-Reply-To: <20260919020000.1234-1-alice@example.com>\nReferences: <20260918010000.5678-1-alice@example.com>\n          <20260919020000.1234-1-alice@example.com>"

  - type: "paragraph"
    text: "<code>In-Reply-To</code> 指向父邮件的 Message-Id，<code>References</code> 则列出整条线程链。邮件客户端就是靠这两个字段把讨论串起来的。"

  - type: "paragraph"
    text: "回复时，系统会自动在正文顶部引用原邮件内容，用 <code>></code> 缩进。这是为了方便大家不用翻历史就能看到上下文。"

  - type: "code"
    text: "> On Sat, Sep 19, 2026 at 10:00:00 +0800, Alice Chen wrote:\n> > This patch fixes the race by holding the mutex earlier.\n> \n> Looks good, but can we also add a comment explaining why?"

  - type: "paragraph"
    text: "维护者回复里常见的黑话："

  - type: "toc"
    items:
      - label: "LGTM"
        text: "Looks Good To Me，表示认可。"
      - label: "Acked-by"
        text: "某维护者审阅并同意，通常会加在补丁末尾。例如：Acked-by: Hans Verkuil <hverkuil@xs4all.nl>"
      - label: "Reviewed-by"
        text: "比 Acked-by 更正式的代码审查通过标记。例如：Reviewed-by: Mauro Carvalho Chehab <mchehab@kernel.org>"
      - label: "Queued"
        text: "补丁已加入维护者的本地队列，很快会进入主线。"

  - type: "divider"
    label: "📌 新手建议"
    kind: "section"

  - type: "toc"
    items:
      - label: "先看，再写"
        text: "订阅一个子系统列表，默默观察几周，熟悉语气和格式后再参与。"
      - label: "从小补丁开始"
        text: "第一封邮件不必是大改动，文档拼写错误、格式清理都是好的开始。"
      - label: "保持礼貌具体"
        text: "技术讨论对事不对人，指出问题时尽量给出具体行号或建议。"

  - type: "closing"
    tagline: "看懂邮件结构，是进入 Linux 开源世界的第一步。"
    source: "Linux 内核玩家 · kernelplayer.cn"
---
