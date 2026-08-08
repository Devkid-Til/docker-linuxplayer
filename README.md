# Linux内核玩家 · 博客

Linux 内核日报 + 公众号内容沉淀站。**本地为主本，服务器为副本**——本地仓库是权威源，服务器只跑副本，被攻击可秒级重建。

## 架构

```
本地（主本）                          服务器（副本 118.31.67.240）
kernel-blog/ 仓库                      git clone → kernel-blog/
 ├─ src/content/posts/*.md             ├─ npm run build（或 deploy.sh rsync）
 │    内容 = frontmatter blocks 结构化   ├─ site/ 构建产物
 ├─ src/components/article/（板块组件）  └─ docker nginx 容器伺服 site/
 ├─ scripts/render-wechat.mjs（公众号）     （docker compose up -d）
 ├─ scripts/upload-oss.mjs（封面 OSS）
 ├─ skills/（Claude skills：排版/封面/日报）
 └─ site/（Astro 构建产物）
```

**本地为主本**：内容生产、构建、OSS 上传、公众号渲染全在本地（**本地不跑 docker**）；**服务器副本**：docker 跑 nginx 容器伺服构建产物，rsync/git 更新 `site/` 即生效（静态文件只读挂载，无需重启容器）。

## 本地开发

```bash
npm run dev      # 本地预览 http://localhost:4321
npm run build    # 构建出 site/
```

## 新机器接入（换环境无缝衔接）

从零恢复整套环境，**一条命令**：

```bash
git clone git@github.com:Devkid-Til/docker-linuxplayer.git kernel-blog
cd kernel-blog && git checkout feature/astro
bash setup.sh      # 交互式配置 .env → 装依赖 → 装 skills → 配 hook → 验证
```

`setup.sh` 自动完成：
1. 交互式询问 Giscus + OSS 凭据（有默认值，回车即用），写入 `.env`
2. `npm install` 装依赖
3. 拷贝 `skills/*` 到 `~/.claude/skills/`（AI 排版/封面/日报能力）
4. 可选安装部署 hook（commit 自动发布）
5. `npm run build` 验证

**换环境必带两样**：① GitHub 仓库（代码 + skills 全量）② `.env` 真实凭据值（setup.sh 交互式录入）。

## 发布到服务器

```bash
# 方式一（推荐）：commit 自动部署
git add -A && git commit -m "..." && git push   # post-commit hook 自动 build+rsync

# 方式二：手动部署
bash scripts/deploy.sh "commit message"
```

## 服务器被攻击的恢复

```bash
# 服务器上，从零重建副本（服务器需要 docker + node）
cd ~ && rm -rf kernel-blog
git clone <repo-url> kernel-blog && cd kernel-blog
bash setup.sh          # 配 .env + 装依赖 + 装 skills
npm run build          # 产出 site/
docker compose up -d   # 启动 nginx 容器伺服 site/（若被攻击已停则重建容器）
```
本地主本在，服务器随时可重建；攻击只影响副本，不影响数据。服务器角色：docker 跑 nginx 容器（`docker-compose.yml`：挂载 `./site` 只读伺服）。

## 待接入

- 域名 + HTTPS（Let's Encrypt）后：公众号「阅读原文」指向文章 URL
- cron 自动化：定时跑 radar 生成日报后自动 commit/push
- 搜索 / 更多交互

## 内容模型（Astro 版）

文章 = markdown frontmatter 里的 `blocks` 数组（结构化板块，博客/公众号双端同源）。

```
src/content/posts/YYYY-MM-DD-slug.md   ← 内容源：frontmatter 存 title/date/desc/tags/blocks
src/components/article/ArticleBody.astro    ← 遍历 blocks → 分发到板块组件
src/components/article/blocks/        ← 11 种板块组件（博客端，CSS 类 + token）
src/styles/global.css                 ← .block-* 样式（暗色自动适配）
scripts/render-wechat.mjs             ← 同一 blocks → 公众号内联 HTML
site/                                 ← Astro 构建产物（Nginx 伺服）
```

**板块类型**：`hook` 导语 / `divider` 标题（primary/section）/ `toc` 导读列表 / `headline` 头条卡 / `highlight` 亮点卡 / `more` 常规动态 / `paragraph` / `quote` / `code` / `image` / `closing` 结尾。每天板块组合、数量自由。

**内联强调**：文本里用语义标签 `<mark>`（主色）/ `<strong>`（主色加粗）/ `<small>`（灰）/ `<a href>`（外链）/ `<code>`（行内代码）——博客由 CSS 着色，公众号脚本转内联 span。

### 日常流程

```bash
# 1. 写/生成文章 → 存为 src/content/posts/YYYY-MM-DD-slug.md（frontmatter 含 blocks）
# 2. 博客构建（静态站点，Nginx 伺服）
npm run build

# 3. 公众号封面（紫色默认，供公众号首图/审阅）
bash <skill>/generate-cover.sh --date "08-08" --topic "头条钩子" --out cover.png
npm run oss cover.png kernel-blog/YYYY-MM-DD/cover.png   # 传 OSS（可选）

# 4. 公众号粘贴用 HTML + 发飞书审阅（标题+封面自动发送）
node scripts/render-wechat.mjs 2026-08-08 --out
npm run notify 2026-08-08 cover.png                      # 公众号标题+封面 → 飞书

# 5. 发布（git commit 触发 post-commit hook 自动部署到服务器）
git add -A && git commit -m "..." && git push
```

> ⚠️ 内容 YAML 规范：所有字符串值必须加双引号（值常含 `:`、`[`、`#` 等 YAML 敏感字符）。生成器遵守此规则，否则 js-yaml 解析报错。

**验证**：`npm run build` 通过 + `npm run oss` 能上传 + `npm run wechat` 能出公众号 HTML，即环境就绪。
