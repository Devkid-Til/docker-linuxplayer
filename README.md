# Linux内核玩家 · 博客

Linux 内核日报 + 公众号内容沉淀站。**本地为主本，服务器为副本**——本地仓库是权威源，服务器只跑副本，被攻击可秒级重建。

生产地址：**https://www.kernelplayer.cn**（备用入口 https://kernelplayer.cn，HTTP 全部 301 跳 HTTPS）

## 架构

```
本地（主本 /ws/dev/kernel-blog）        服务器（副本 118.31.67.240）
 ├─ 内容 + 源码 + 脚本（git 仓库）        /home/admin/kernel-blog/
 ├─ npm run build → site/                 ├─ site/            静态产物（rsync 同步）
 ├─ rsync site/ ──────────────────────►   ├─ docker-compose.yml nginx 容器定义
 ├─ 本地签发 SSL + rsync 证书 ─────────►  ├─ docker/nginx-default.conf
 └─ 本地跑所有自动化（无 docker）          └─ docker/ssl/      证书（本地推送）
                                          └─ 容器 kernel-blog（nginx:1.27-alpine，80+443）
                                             ※ 服务器无脚本、无 cron，纯镜像
```

**核心原则**：内容生产、构建、证书签发、所有自动化**全在本地**；服务器只被动接收产物（site/ + 证书）并伺服。

## 资源清单（都有哪些、都在哪）

### A. 本地主本 `<repo>/`（git 仓库，随 GitHub 走）

| 资源 | 路径 | 入库 |
|---|---|---|
| 站点源码 | `src/`、`public/`、`astro.config.mjs`、`package.json` | ✅ |
| **文章内容**（唯一数据源） | `src/content/posts/*.md` | ✅ |
| 发布/构建脚本 | `scripts/*.sh`、`scripts/*.mjs`、`scripts/*.py` | ✅ |
| **Docker 配置** | `docker-compose.yml`、`docker/nginx-default.conf` | ✅ |
| git hook（自动部署） | `scripts/git-hooks/post-commit`、`scripts/install-hook.sh` | ✅ |
| AI skills（排版/日报/封面） | `skills/kernel-patch-radar/` | ✅ |
| bootstrap | `setup.sh` | ✅ |
| **凭据** | `.env`（Giscus + OSS） | ❌ 不入库 |
| **SSL 私钥** | `docker/ssl/` | ❌ 不入库 |
| 构建产物 | `site/` | ❌ 不入库 |

### B. 本地机器（仓库之外）

| 资源 | 路径 | 说明 |
|---|---|---|
| acme.sh 工具 + RAM 凭据 + 证书 | `~/.acme.sh/` | 续期引擎；`account.conf` 存阿里云 RAM key（600） |
| 已装 skills | `~/.claude/skills/` | 由 `setup.sh` 从仓库拷入 |
| SSH 密钥 | `~/.ssh/id_ed25519_github`（GitHub）、`~/.ssh/id_ed25519`（服务器） | |
| crontab | acme.sh 续期、内核镜像同步 | 见「定时任务」 |
| cc-connect | 日报/周报/英语/告警等 cron | 见「定时任务」 |

### C. 服务器副本 `118.31.67.240:/home/admin/kernel-blog/`

| 资源 | 说明 |
|---|---|
| `site/` | 静态产物，`deploy.sh` rsync 同步（**目录挂载**，增量更新即时生效） |
| `docker-compose.yml` | `blog` 服务：nginx:1.27-alpine，映射 80+443，挂载 site（ro）+ conf（ro）+ ssl（ro） |
| `docker/nginx-default.conf` | 80 跳转块 + 443 服务块（防爬/限速/gzip/缓存） |
| `docker/ssl/` | 证书（`kernelplayer.cn.{pem,key}`），本地 `push-cert.sh` 推送 |

> ⚠️ **服务器没有**：acme.sh、cron、任何脚本。改配置靠本地推。

### D. 第三方服务

| 服务 | 用途 | 凭据位置 |
|---|---|---|
| **GitHub** `Devkid-Til/docker-linuxplayer` | 代码/内容仓库 | `~/.ssh/id_ed25519_github` |
| **阿里云 ECS** `118.31.67.240` | 生产服务器（`admin` 免密 sudo） | `~/.ssh/id_ed25519` |
| **阿里云 DNS** | `kernelplayer.cn` 解析（@ / www A 记录 + `_dnsauth` TXT） | `~/.acme.sh/account.conf`（RAM key） |
| **阿里云 OSS** | 封面/插图托管（bucket `kernelplayer`） | `.env` |
| **Let's Encrypt** | SSL 证书（自动续期） | acme.sh 自动 |
| **Giscus** | 文章评论（GitHub Discussions） | `.env` |
| **飞书** | 内容审阅 + 运维告警群「站点运维告警」 | cc-connect |

## SSL / 域名（全自动，本地驱动）

```
本地 acme.sh（cron 每天 4 次检查）
   └─ 证书剩余 <30 天 → DNS 验证自动续期（阿里云 DNS API）
        └─ 自动调用 scripts/push-cert.sh
             ├─ rsync 证书 → 服务器 docker/ssl/
             └─ ssh 触发容器 nginx reload
```

| 脚本 | 作用 |
|---|---|
| `scripts/ssl-autorenew.sh` | 首次签发：本地装 acme.sh + 签发 + 装到 `docker/ssl/` + 注册续期回调 |
| `scripts/push-cert.sh` | 推证书到服务器 + reload 容器 + 验证 HTTP 200 |
| `scripts/check-ssl.sh` | 到期检查（<14 天告警到飞书群），兜底自动续期失败 |
| `scripts/aliyun-dns.py` | 阿里云 DNS 记录查询/添加（`list` / `add`） |
| `scripts/setup-domain.sh` | 域名绑定 + HTTPS 一次性上线（已执行完毕，留档） |

**手动续期**（一般不必要）：`Ali_Key=… Ali_Secret=… bash scripts/ssl-autorenew.sh`

## ⚠️ 两个必知的坑

1. **单文件 bind-mount 不吃 rsync**：`docker/nginx-default.conf` 是单文件挂载，rsync 会换 inode，**容器读到的还是旧内容**。改完必须**重建容器**：
   ```bash
   ssh admin@118.31.67.240 'cd ~/kernel-blog && docker compose up -d --force-recreate blog'
   ```
   （`site/` 是目录挂载，不受影响。）
2. **服务器文件属主**：`docker/` 下文件须为 `admin`（部署用户），若被 sudo 建过会有 root 属主导致 rsync 失败：`sudo chown -R admin:admin ~/kernel-blog/docker`

## 定时任务

**本地 crontab**：
```
37 5 * * *         内核镜像同步（kernel-mirrors/sync-mirrors.sh）
26 1,7,13,19 * * * acme.sh SSL 续期检查
```

**cc-connect cron**（内容 + 运维）：
| 任务 | 时间 |
|---|---|
| 每日内核日报（网站自动发布 + 公众号审阅） | 每天 6:47 |
| 每日板块活跃度刷新 | 每天 6:23 |
| 每日内核英语产出 | 每天 8:45 |
| 每周内核全局雷达 | 周日 8:30 |
| 每日内核补丁简报 | 工作日 7:30（暂停） |
| **SSL 证书到期检查** | 每天 9:17 |

## 新机器接入（换环境无缝衔接）

**本地**（一条命令）：
```bash
git clone git@github.com:Devkid-Til/docker-linuxplayer.git kernel-blog
cd kernel-blog && bash setup.sh    # 交互式配 .env + 装依赖 + 装 skills + 配 hook + 构建验证
```
然后恢复**仓库外的三样**：① `.env` 真实凭据 ② `~/.ssh/` 密钥 ③ SSL 自动化（若要接管证书）：
```bash
Ali_Key=<RAM id> Ali_Secret=<RAM secret> bash scripts/ssl-autorenew.sh
```
（RAM key 需 `AliyunDNSFullAccess`；建议自定义最小权限策略，只给 alidns 的 Describe/Add/Delete。）

**服务器**（从零重建副本，需 docker）：
```bash
cd ~ && rm -rf kernel-blog && git clone <repo-url> kernel-blog && cd kernel-blog
bash setup.sh && npm run build
docker compose up -d          # 起 nginx 容器
# 证书：本地 push-cert.sh 推一次即可
```

## 发布流程

```bash
# 方式一（推荐）：commit 自动部署（post-commit hook → build → rsync → 健康检查 → push）
git add -A && git commit -m "..." && git push

# 方式二：手动
bash scripts/deploy.sh "commit message"

# 只更新 nginx 配置（改动 conf 后必须重建容器，见上「坑 1」）
rsync -av docker/nginx-default.conf admin@118.31.67.240:/home/admin/kernel-blog/docker/
ssh admin@118.31.67.240 'cd ~/kernel-blog && docker compose up -d --force-recreate blog'
```

## 内容模型（Astro 版）

文章 = markdown frontmatter 里的 `blocks` 数组（结构化板块，博客/公众号双端同源）。

```
src/content/posts/YYYY-MM-DD-slug.md     ← 内容源：frontmatter 存 title/date/desc/tags/blocks
src/components/article/ArticleBody.astro ← 遍历 blocks → 分发到板块组件
src/components/article/blocks/           ← 11 种板块组件
scripts/render-wechat.mjs                ← 同一 blocks → 公众号内联 HTML
site/                                    ← Astro 构建产物（Nginx 伺服）
```

**板块类型**：`hook` 导语 / `divider` 标题 / `toc` 导读 / `headline` 头条卡 / `highlight` 亮点卡 / `more` 常规动态 / `paragraph` / `quote` / `code` / `image` / `closing` 结尾。

**内联强调**：`<mark>`（主色）/ `<strong>`（主色加粗）/ `<small>`（灰）/ `<a href>`（外链）/ `<code>`（行内代码）。

### 日常流程

```bash
# 1. 写/生成文章 → src/content/posts/YYYY-MM-DD-slug.md
# 2. 构建（静态站）
npm run build
# 3. 公众号封面
bash <skill>/generate-cover.sh --date "MM-DD" --topic "<头条钩子>" --out cover.png
npm run oss cover.png kernel-blog/YYYY-MM-DD/cover.png
# 4. 公众号 HTML
node scripts/render-wechat.mjs YYYY-MM-DD --out
# 5. 审阅：标题 + 封面发董事长
cc-connect send --image cover.png --message "📢 公众号审阅 · Linux内核玩家 · …"
# 6. 确认后发布（commit 自动部署）
git add -A && git commit -m "..." && git push
```

> ⚠️ 内容 YAML 规范：所有字符串值必须加双引号（值常含 `:`、`[`、`#` 等 YAML 敏感字符）。`npm run build` 前的 `validate-blocks.mjs` 会校验。

**验证**：`npm run build` 通过 + `npm run oss` 能上传 + `npm run wechat` 能出 HTML，即环境就绪。

## 待办

- 公安联网备案评审中（ICP 备案已过）
- 搜索 / 更多交互
