---
title: "从零配置 Claude Code 全家桶：ccswitch + cc-connect + lark-cli"
date: "2026-09-25"
desc: "站长手记：记录从零搭起 Claude Code + ccswitch + cc-connect + lark-cli 的完整过程，MacOS/Ubuntu 双平台，含跳过强制登录的坑。"
column: "journal"
tags: ["教程"]
blocks:
  - type: hook
    text: >-
      我把 Claude Code 深度集成进日常内核开发之后，陆续有人问「这套怎么装」。这篇手记把从零到能用的全过程
      记下来——<b>nvm → npm → ccswitch → Claude Code → cc-connect → lark-cli → Docker</b>，MacOS 和 Ubuntu
      两套命令都在这，还有个不踩就卡死的坑。
  - type: divider
    label: "🛠️ 总览：装什么、按什么顺序"
    kind: primary
  - type: paragraph
    text: >-
      一共七样，顺序很重要：先装 <code>nvm</code>（管 Node 版本）和 <code>npm</code>（包管理器），
      再装 <code>ccswitch</code>（切大模型，能跳过 Claude 的强制登录），然后才是 <code>Claude Code</code> 本体、
      <code>cc-connect</code>（接飞书机器人）、<code>lark-cli</code>（飞书文档/IM 操作）。最后 Docker 可选。
  - type: highlight
    title: "⚠️ 一个必须先知道的坑"
    meta: "不先装 ccswitch，会被强制 login 卡住"
    points:
      - label: "坑"
        text: "装最新 @latest 版 Claude 后，若不先配置 ccswitch，会卡在强制登录（login）。ccswitch 切一次大模型就能跳过。"
      - label: "切模型时"
        text: "每次 <code>ccswitch use 配置名</code> 切换大模型后，要先删掉 <code>~/.claude.json</code>，重新进 Claude，遇到「是否继续使用已有 API Key」时选 <b>yes</b>。"
  - type: divider
    label: "1. MacOS 安装（Ubuntu 大同小异）"
    kind: section
  - type: code
    lang: bash
    text: |-
      # 1.1 安装 nvm
      brew install nvm

      # 1.2 配置环境变量（~/.zshrc）
      export NVM_DIR="$HOME/.nvm"
      [ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh"  # This loads nvm
      [ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/usr/local/opt/nvm/etc/bash_completion.d/nvm"

      # 1.3 应用配置
      source ~/.zshrc

      # 2 安装 npm
      nvm install --lts

      # 3 安装 cc-switch（GUI 桌面版，配置见下图）
      # https://cc-switch.cc/tutorials

      # 4 安装 Claude
      npm config set registry https://registry.npmmirror.com  # 换国内源
      npm config set allow-scripts=@anthropic-ai/claude-code --location=user
      npm install -g @anthropic-ai/claude-code@latest

      # 5 安装及配置 cc-connect
      npm install -g cc-connect

      # 6 安装 lark-cli
      npx @larksuite/cli@latest install
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-25/ccswitch-config.png"
    alt: "cc-switch GUI 配置界面"
  - type: divider
    label: "2. nvm / npm 安装（Ubuntu 实录）"
    kind: section
  - type: code
    lang: bash
    text: |-
      # nvm 安装（Node 版本管理工具）
      curl -k -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
      # => Downloading nvm from git to '/home/jiaqi/.nvm'
      # => Cloning into '/home/jiaqi/.nvm'...
      source ~/.bashrc
  - type: code
    lang: bash
    text: |-
      # npm 安装
      nvm install --lts
      # Installing latest LTS version.
      # Now using node v24.19.0 (npm v11.17.0)
  - type: divider
    label: "3. ccswitch 安装及配置"
    kind: section
  - type: code
    lang: bash
    text: |-
      curl -sSL https://raw.githubusercontent.com/huangdijia/ccswitch/main/install.sh | bash
      # [SUCCESS] Binary installed to /home/jiaqi/.local/bin/ccswitch

      echo 'export PATH="/home/jiaqi/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
      ccswitch --version
  - type: code
    lang: bash
    text: |-
      ccswitch init   # ~/.ccswitch 下创建必要的文件夹结构
      ccswitch add <配置文件名称>   # 例如：ccswitch add deepseek-claude
      ccswitch use <你的配置名>     # 切换到该配置
  - type: code
    lang: bash
    text: |-
      # 配置一个接 DeepSeek 的 profile 实录
      ccswitch init
      # ✓ default configuration file created successfully: ~/.ccswitch/ccs.json

      ccswitch add deepseek-claude
      # Enter ANTHROPIC_API_KEY (or press Enter to skip): sk-***
      # Enter ANTHROPIC_BASE_URL [https://api.anthropic.com]: https://api.deepseek.com/anthropic
      # Enter ANTHROPIC_MODEL [opus]:
      # ✓ Profile 'deepseek-claude' added successfully!

      ccswitch use deepseek-claude
      # ✓ Successfully switched to profile: deepseek-claude
  - type: divider
    label: "4. 安装 Claude Code"
    kind: section
  - type: paragraph
    text: >-
      官方文档见 <a href="https://code.claude.com/docs/zh-CN/setup">code.claude.com/docs/zh-CN/setup</a>。三种装法，前两种国内都有坑，推荐第三种 npm。
  - type: code
    lang: bash
    text: |-
      # 1. 官方（国内受限）
      curl -fsSL https://claude.ai/install.sh | bash

      # 2. 国内社区脚本（装了 ccswitch 就建议别用，会环境变量冲突）
      curl -fsSL https://www.qiaoqiaoyun.com/claude/install-claude-code.sh | bash

      # 3. npm 方式（推荐）
      npm config set registry https://registry.npmmirror.com  # 换国内源
      npm config set allow-scripts=@anthropic-ai/claude-code --location=user
      npm install -g @anthropic-ai/claude-code@latest
  - type: paragraph
    text: >-
      配大模型之前，先删掉默认的 <code>.claude.json</code> 清掉残留——这一步相当于重置 Claude 配置，不删的话
      ccswitch 切不过去。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-25/claude-json-reset.png"
    alt: "删除 .claude.json 清除配置残留"
  - type: paragraph
    text: >-
      重新进 Claude 后，遇到询问就选 <b>YES</b>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-25/claude-yes.png"
    alt: "运行 Claude 后选择 YES"
  - type: paragraph
    text: >-
      YES 之后就是国产大模型在跑了，登录这关跳过。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-09-25/claude-done.png"
    alt: "YES 后即为国产大模型，跳过登录"
  - type: divider
    label: "5. 安装 cc-connect（接飞书）"
    kind: section
  - type: code
    lang: bash
    text: |-
      npm install -g cc-connect
      # 若提示 allow-scripts 未覆盖，补一句：
      npm install -g --allow-scripts=cc-connect cc-connect
  - type: code
    lang: bash
    text: |-
      # 生成默认配置
      cc-connect config example > config.toml
  - type: code
    lang: text
    text: |-
      # config.toml 关键字段
      language = "zh"

      [log]
      level = "info"

      [display]
      mode = "quiet"  # 飞书聊天卡片不显示思考过程

      [[projects]]
      name = "项目名称"
      admin_from = "启动 cc-connect 服务后，发 /whoami 获取 User ID"

      [projects.agent]
      type = "claudecode"

      [projects.agent.options]
      work_dir = "cc-connect 的工作路径"
      mode = "default"

      [[projects.platforms]]
      type = "feishu"

      [projects.platforms.options]
      app_id = "你的 APP ID"
      app_secret = "你的 APP Secret"
      allow_from = "启动 cc-connect 服务后，发 /whoami 获取 User ID"
  - type: code
    lang: bash
    text: |-
      # 装 daemon 服务并启动
      cc-connect daemon install
      cc-connect daemon restart  # 更新配置后跑一下
  - type: divider
    label: "6. 安装 lark-cli（飞书 skill）"
    kind: section
  - type: code
    lang: bash
    text: |-
      # 手动安装
      npx @larksuite/cli@latest install

      # 装完配凭证并授权
      lark-cli config init --new --brand feishu --lang zh
      lark-cli auth login --recommend
      lark-cli auth status --verify
  - type: divider
    label: "7. Docker（可选）"
    kind: section
  - type: code
    lang: bash
    text: |-
      curl -fsSL https://get.docker.com | sudo bash -s docker --mirror Aliyun

      # 加入 docker 组，之后不用每次 sudo
      sudo usermod -aG docker $USER
      newgrp docker
      docker run --rm hello-world
  - type: closing
    tagline: "这套下来，Claude Code 就能换着国产大模型跑、又能挂进飞书当机器人。装的时候卡在哪一步，回来翻这篇。"
    source: "站长手记 · 教程"
---
