---
title: "向 Linux 内核提交第一个补丁：从 staging 驱动开始"
date: "2026-09-19"
desc: "一份保姆级流程指南：用 drivers/staging/fbtft 里的真实 checkpatch 错误做例子，带你走完找问题、改代码、生成 patch、发邮件到邮件列表的完整流程。"
column: "journal"
tags:
  - "笔记"
blocks:
  - type: "hook"
    text: "很多内核开发者都说：『你的第一个补丁不需要惊天动地，走通流程才是最重要的。』Linux 内核的 staging 驱动目录就是专门给新手练手的地方。本文用一个真实的 checkpatch 报错做例子，一步一步带你发出第一封补丁邮件。"

  - type: "divider"
    label: "🧰 前置准备"
    kind: "primary"

  - type: "paragraph"
    text: "开始前，你需要这些东西："

  - type: "toc"
    items:
      - label: "Linux 源码树"
        text: "从 kernel.org 或镜像站 clone 一份最新源码，staging 驱动在 drivers/staging/ 下。"
      - label: "能用的邮箱"
        text: "内核社区用邮件列表沟通，建议用稳定的邮箱，后续 Signed-off-by 也用它。"
      - label: "git + git send-email"
        text: "大多数发行版需要额外安装 git-email 包才能用 send-email 子命令。"

  - type: "code"
    lang: "bash"
    text: |
      # 1. 克隆源码（用镜像或 kernel.org）
      git clone https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git ~/linux
      cd ~/linux

      # 2. 安装 git send-email（Debian/Ubuntu 示例）
      sudo apt install git-email

      # 3. 配置 git 身份（和你要用的邮件地址一致）
      git config --global user.name "Your Name"
      git config --global user.email "your@email.com"

  - type: "paragraph"
    text: "如果你暂时不想发邮件，也可以只做到『生成 patch 并通过 checkpatch』这一步，等有信心了再发。"

  - type: "divider"
    label: "🎯 找任务：staging 驱动"
    kind: "section"

  - type: "paragraph"
    text: "Linux 内核里专门给新手练手的地方是 drivers/staging/。这里的代码质量相对宽松，维护者 Greg Kroah-Hartman 明确欢迎清理类补丁：修 checkpatch 报错、换行过长、拼写错误、printk 转 pr_xxx 等。"

  - type: "paragraph"
    text: "每个 staging 驱动目录下通常有 TODO 文件，会告诉你当前需要什么类型的清理。例如 rtl8723bs/TODO 里就写了 checkpatch.pl fixes。"

  - type: "code"
    lang: "bash"
    text: |
      # 查看 staging 驱动列表
      ls drivers/staging/

      # 看某个驱动的 TODO
      cat drivers/staging/rtl8723bs/TODO

  - type: "paragraph"
    text: "本文选 fbtft 驱动里的一个简单 checkpatch ERROR 做例子。先跑 checkpatch："

  - type: "code"
    lang: "bash"
    text: |
      ./scripts/checkpatch.pl --file drivers/staging/fbtft/fbtft-bus.c

  - type: "paragraph"
    text: "输出里会有两个 ERROR："

  - type: "code"
    lang: "text"
    text: |
      ERROR: space prohibited before that close parenthesis ')'
      #65: FILE: drivers/staging/fbtft/fbtft-bus.c:65:
      +define_fbtft_write_reg(fbtft_write_reg8_bus8, u8, u8, )

      ERROR: space prohibited before that close parenthesis ')'
      #67: FILE: drivers/staging/fbtft/fbtft-bus.c:67:
      +define_fbtft_write_reg(fbtft_write_reg16_bus16, u16, u16, )

  - type: "paragraph"
    text: "问题很清楚：宏调用最后一个参数是空的，但逗号后面多了一个空格，导致右括号前有空格。"

  - type: "divider"
    label: "✏️ 动手改代码"
    kind: "section"

  - type: "paragraph"
    text: "打开 drivers/staging/fbtft/fbtft-bus.c，找到第 65 和 67 行。把逗号后的空格删掉："

  - type: "code"
    lang: "diff"
    text: |
      -define_fbtft_write_reg(fbtft_write_reg8_bus8, u8, u8, )
      -define_fbtft_write_reg(fbtft_write_reg16_bus16, u16, u16, )
      +define_fbtft_write_reg(fbtft_write_reg8_bus8, u8, u8,)
      +define_fbtft_write_reg(fbtft_write_reg16_bus16, u16, u16,)

  - type: "paragraph"
    text: "这个修改只涉及格式，不影响驱动行为，非常适合当第一个补丁。保存后，先检查改动："

  - type: "code"
    lang: "bash"
    text: |
      git diff

  - type: "paragraph"
    text: "确认 diff 只改了这两处空格，没有混入其他东西。"

  - type: "divider"
    label: "🧪 用 checkpatch 验证"
    kind: "section"

  - type: "paragraph"
    text: "改完后，再次对同一个文件跑 checkpatch，确认 ERROR 消失："

  - type: "code"
    lang: "bash"
    text: |
      ./scripts/checkpatch.pl --file drivers/staging/fbtft/fbtft-bus.c

  - type: "paragraph"
    text: "如果输出变成 total: 0 errors, 0 warnings，说明这一步过了。"

  - type: "paragraph"
    text: "接下来生成 patch 并单独检查 patch 文件本身（这一步和 --file 检查不完全等价，邮件列表里维护者会看你的 patch）："

  - type: "code"
    lang: "bash"
    text: |
      # 把改动做成一个 commit
      git add drivers/staging/fbtft/fbtft-bus.c
      git commit -m "staging: fbtft: fix checkpatch error in fbtft-bus.c"

      # 生成 patch 文件
      git format-patch -1 --stdout > /tmp/my-first-patch.patch

      # 检查 patch 本身
      ./scripts/checkpatch.pl /tmp/my-first-patch.patch

  - type: "paragraph"
    text: "commit message 要尽量说明『改了什么』和『为什么』。staging 驱动的惯例是在标题前加 staging:，并指出具体驱动名。"

  - type: "divider"
    label: "📧 配置 git send-email"
    kind: "section"

  - type: "paragraph"
    text: "发补丁邮件前，先配置 send-email。如果你用 Gmail，可以用 smtp.gmail.com；其他邮箱换成对应 SMTP 服务器。"

  - type: "code"
    lang: "bash"
    text: |
      git config --global sendemail.smtpServer smtp.gmail.com
      git config --global sendemail.smtpServerPort 587
      git config --global sendemail.smtpEncryption tls
      git config --global sendemail.smtpUser your@gmail.com

  - type: "paragraph"
    text: "建议先用 dry-run 发一封测试邮件给自己，确认 SMTP 能通："

  - type: "code"
    lang: "bash"
    text: |
      git send-email --to="your@email.com" --dry-run /tmp/my-first-patch.patch

  - type: "paragraph"
    text: "去掉 --dry-run 就是真实发送。第一次跑可能会弹窗让你输应用专用密码。"

  - type: "divider"
    label: "🚀 发给邮件列表"
    kind: "section"

  - type: "paragraph"
    text: "fbtft 驱动属于 staging 子系统，维护者是 Greg Kroah-Hartman。你需要把补丁发到对应的邮件列表和抄送维护者。用 scripts/get_maintainer.pl 可以自动查出该发给谁："

  - type: "code"
    lang: "bash"
    text: |
      ./scripts/get_maintainer.pl /tmp/my-first-patch.patch

  - type: "paragraph"
    text: "输出大概长这样："

  - type: "code"
    lang: "text"
    text: |
      Greg Kroah-Hartman <gregkh@linuxfoundation.org> (maintainer:STAGING SUBSYSTEM)
      linux-staging@vger.kernel.org (open list:STAGING SUBSYSTEM)
      linux-kernel@vger.kernel.org (open list)

  - type: "paragraph"
    text: "然后就可以发邮件了。--cc-cmd 会让 git send-email 自动调用 get_maintainer.pl 帮你填收件人和抄送："

  - type: "code"
    lang: "bash"
    text: |
      git send-email \
        --cc-cmd="./scripts/get_maintainer.pl" \
        /tmp/my-first-patch.patch

  - type: "paragraph"
    text: "git send-email 会提示你确认收件人，输入 y 后发出。你的第一封补丁邮件就上路了。"

  - type: "divider"
    label: "📬 后续跟进"
    kind: "section"

  - type: "toc"
    items:
      - label: "等几天"
        text: "维护者可能几天到几周才回复，取决于子系统和补丁复杂度。"
      - label: "处理评审"
        text: "如果有人回复 Reviewed-by、Acked-by 或提出修改意见，按意见改后发 v2。"
      - label: "发 v2"
        text: "修改后在 commit 标题加 [PATCH v2]，并在 cover letter 里说明改了什么。"

  - type: "paragraph"
    text: "第一封补丁的目标不是一鸣惊人，而是走通『改代码 → 生成 patch → 发邮件』的完整闭环。一旦这个流程跑过一次，后面再发 v2、v3 就会顺手很多。"

  - type: "closing"
    tagline: "你的第一个补丁，可以从 staging 里的一行空格开始。"
    source: "Linux 内核玩家 · kernelplayer.cn"
---
