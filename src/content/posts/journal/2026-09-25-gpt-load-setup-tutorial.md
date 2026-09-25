---
title: "自建一个 AI 网关：gpt-load 从零部署到接 Kimi/DeepSeek/Ollama"
date: "2026-09-25"
desc: "站长手记：记录 gpt-load 这个自托管 AI 网关的完整部署过程——从 docker 起服务、建分组、挂模型、发 AccessKey，到踩过的四个坑。"
column: "journal"
tags: ["教程"]
blocks:
  - type: hook
    text: >-
      我在本机跑了一套 <b>gpt-load</b>——一个 Go 单二进制 + SQLite 的自托管 AI 网关，把 Kimi、DeepSeek、本地 Ollama
      统一收到一个入口，再给 Claude Code、Dify、各 agent 发各自的 AccessKey。这篇手记把从零到能用的全过程记下来，
      包括四个不踩就卡死的坑。
  - type: paragraph
    text: >-
      开源项目地址：<a href="https://github.com/tbphp/gpt-load">github.com/tbphp/gpt-load</a>
      （6.9k stars，自托管 AI 网关：多渠道多凭据统一接入，含密钥与订阅账号、调度容错、日志与用量）。
      配套部署脚本在 <a href="https://github.com/Devkid-Til/gpt-load-deploy-skill">github.com/Devkid-Til/gpt-load-deploy-skill</a>，
      照着脚本就能跑。也可以参考前面那篇<a href="https://kernelplayer.cn/posts/2026-09-25-claude-code-setup-tutorial/">《从零配置 Claude Code 全家桶》</a>，
      让 Claude Code 加载这个仓库里的 skill（gpt-load-setup），回答几个问题就自动完成安装和分组配置。
  - type: divider
    label: "🛠️ 总览：七步"
    kind: primary
  - type: paragraph
    text: >-
      完整链路是七步：<b>① 起 docker 服务 → ② 登录管理 UI → ③ 建分组（group）→ ④ 挂模型（models）→
      ⑤ 发 AccessKey → ⑥ 客户端接入 → ⑦ 验证</b>。gpt-load 的核心概念就三个：
      <b>分组</b>（channel，对应一个上游）、<b>模型</b>（挂在分组下，可设别名）、<b>AccessKey</b>（发给客户端的令牌）。
      每一步都有对应脚本，见下方各节。
  - type: divider
    label: "1. 起 docker 服务"
    kind: section
  - type: paragraph
    text: >-
      脚本：<code>bash setup.sh [DATA_DIR] [PORT]</code>（<a href="https://github.com/Devkid-Til/gpt-load-deploy-skill/blob/main/scripts/setup.sh">源码</a>）——
      含 data 目录属主修正、compose 生成、健康检查。
  - type: code
    lang: bash
    text: |-
      # 目录结构
      mkdir -p /ws/dev/services/gpt-load && cd /ws/dev/services/gpt-load
      # 三个文件：docker-compose.yml、data/（SQLite）、credentials.txt
  - type: code
    lang: yaml
    text: |-
      # docker-compose.yml
      services:
        gpt-load:
          image: ghcr.io/tbphp/gpt-load:2
          container_name: gpt-load
          ports:
            - "3001:3001"
          environment:
            HOST: 0.0.0.0
            PORT: 3001
            DATA_DIR: /app/data
          restart: always
          volumes:
            - ./data:/app/data
  - type: code
    lang: bash
    text: |-
      docker compose up -d
      docker logs gpt-load --tail 5   # 确认起来了
  - type: paragraph
    text: >-
      <strong>管理密钥是首次启动自动生成的</strong>——gpt-load 会把它写到 <code>${DATA_DIR}/auth.key</code>
      （容器内 <code>/app/data/auth.key</code>），同时生成一把 <code>encryption.key</code> 用于加密存储上游凭据。
      取出来就能登录 <code>http://localhost:3001</code>：
  - type: code
    lang: bash
    text: |-
      docker exec gpt-load cat /app/data/auth.key
  - type: paragraph
    text: >-
      这把密钥是唯一副本，丢了要重置，务必存到一个 600 权限的文件里、别进任何版本库。
      想自己指定密钥的话，在启动前设 <code>AUTH_KEY</code> 环境变量覆盖即可（那样就不生成 <code>auth.key</code>）。
  - type: divider
    label: "2. 建分组（group）"
    kind: section
  - type: paragraph
    text: >-
      脚本：<code>bash create-group.sh &lt;NAME&gt; &lt;CHANNEL_ID&gt; &lt;BASE_URL&gt;</code>（<a href="https://github.com/Devkid-Til/gpt-load-deploy-skill/blob/main/scripts/create-group.sh">源码</a>）——
      含 Idempotency-Key 头（坑二）和 price_multiplier 必填（坑三）。分组就是「一个上游渠道」，管理 API 认证头是
      <code>Authorization: Bearer &lt;AUTH_KEY&gt;</code>（不是 X-Auth-Key）。
      下面是我建的三个分组的真实参数：
  - type: code
    lang: json
    text: |-
      {
        "name": "kimi-code",
        "channel_id": "anthropic",
        "connection_type": "api_key",
        "params": {"base_url": "https://api.kimi.com/coding"},
        "price_multiplier": "1",
        "confirm_same_target": true
      }
  - type: paragraph
    text: >-
      deepseek 分组的 <code>base_url</code> 填 <code>https://api.deepseek.com</code>（不带 <code>/anthropic</code>）——
      SDK 按协议自己拼 <code>/anthropic/v1/messages</code>，带尾巴会拼两遍报 404。本地 Ollama 是
      <code>openai_compatible</code> 渠道，<code>base_url</code> 指向宿主机的 11500。
  - type: divider
    label: "3. 挂模型 + 设别名"
    kind: section
  - type: paragraph
    text: >-
      脚本：<code>bash add-models.sh &lt;GROUP_ID&gt; '&lt;JSON&gt;'</code>（<a href="https://github.com/Devkid-Til/gpt-load-deploy-skill/blob/main/scripts/add-models.sh">源码</a>）——
      先读现有清单、确认后再全量替换（坑五）。模型支持别名：<code>id</code> 是上游真名，<code>alias</code> 是客户端看到的名字，
      <code>alias_enabled: true</code> 才生效。比如 Kimi 分组里 <code>k3</code> 的别名是 <code>k3[1m]</code>，
      客户端用 <code>k3[1m]</code> 调，实际走的是上游的 <code>k3</code>。
  - type: code
    lang: json
    text: |-
      PUT /api/groups/1/models
      {
        "models": [
          {"id": "k3", "alias": "k3[1m]", "alias_enabled": true},
          {"id": "k3-256k", "alias": "", "alias_enabled": false}
        ]
      }
  - type: highlight
    title: "⚠️ 改模型清单是全量替换"
    meta: "不是追加——漏写的模型会被删掉"
    points:
      - label: "行为"
        text: "PUT /api/groups/&lt;id&gt;/models 是全量替换。要保留的模型必须一起写上，漏一个就被删。"
  - type: divider
    label: "4. 发 AccessKey"
    kind: section
  - type: paragraph
    text: >-
      每个客户端发一把独立的 AccessKey，按使用方逐个分发（jiaqi / dify / 各 agent），形如 <code>sk-gl-&lt;名&gt;-&lt;hex&gt;</code>。
      好处是某把 key 出问题可以单独吊销，不波及其他客户端。AccessKey 可以过滤协议、模型、IP——比如 Dify 只放行
      embedding 模型，agent 只放行它该用的那个分组。
  - type: divider
    label: "5. 客户端接入"
    kind: section
  - type: paragraph
    text: >-
      客户端把 <code>ANTHROPIC_BASE_URL</code> 指向 <code>http://localhost:3001</code>，<code>ANTHROPIC_API_KEY</code>
      填发的那把 AccessKey。Dify 容器内用宿主机 IP（<code>host.docker.internal</code> 在容器里不解析）。
  - type: code
    lang: bash
    text: |-
      # Claude Code / 各 agent
      export ANTHROPIC_BASE_URL=http://localhost:3001
      export ANTHROPIC_API_KEY=sk-gl-<你的>-<hex>

      # Dify（容器内）
      # base 指向 http://<宿主机IP>:3001/v1
  - type: divider
    label: "6. 验证"
    kind: section
  - type: code
    lang: bash
    text: |-
      # 管理 API 验证分组状态
      curl -s -H "Authorization: Bearer <AUTH_KEY>" http://localhost:3001/api/groups
      # 返回里每个分组的 service_status 应为 available
  - type: paragraph
    text: >-
      客户端侧跑一次真实调用，确认 alias 生效。比如用 <code>k3[1m]</code> 调 Kimi 分组，返回正常就说明
      别名重写生效了。
  - type: divider
    label: "7. 四个坑（都验证过）"
    kind: section
  - type: highlight
    title: "坑一：data 目录属主必须是 10001"
    meta: "securefile 校验 stat.Uid == euid"
    points:
      - label: "现象"
        text: "bind mount 宿主目录（uid 1000）直接 EPERM 崩溃循环。"
      - label: "修法"
        text: "docker run --rm --user 0 -v ...:/data --entrypoint sh &lt;image&gt; -c \"chown -R 10001:10001 /data\"（必须 --user 0 覆盖镜像的 USER 指令）。"
  - type: highlight
    title: "坑二：建分组必须带 Idempotency-Key 头"
    meta: "否则 428"
    points:
      - label: "现象"
        text: "POST /api/groups 不带 Idempotency-Key 直接报 428。"
  - type: highlight
    title: "坑三：建分组必填 price_multiplier 和 confirm_same_target"
    meta: "后端报错只说「请求错误」"
    points:
      - label: "现象"
        text: "price_multiplier 是字符串类型，confirm_same_target 必填。缺了就报「请求错误」，不说缺哪个。"
  - type: highlight
    title: "坑四：deepseek 的 base_url 不带 /anthropic"
    meta: "SDK 自己拼，带尾巴会 404"
    points:
      - label: "现象"
        text: "base_url 填 https://api.deepseek.com（不带 /anthropic）。SDK 按协议自己拼 /anthropic/v1/messages，带尾巴会拼两遍 → 404。"
  - type: closing
    tagline: "一个 Go 单二进制 + SQLite，把三个上游收进一个入口，再给每个客户端发独立 key。装的时候卡在哪一步，回来翻这篇。"
    source: "站长手记 · 教程"
---
