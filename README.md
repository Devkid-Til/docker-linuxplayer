# Linux内核玩家 · 博客

公众号内容沉淀站。**本地为主本，服务器为副本**——本地仓库是权威源，服务器只跑副本，被攻击可秒级重建。

## 架构

```
本地（主本）                     服务器（副本）
kernel-blog/ 仓库                  git clone → kernel-blog/
 ├─ docker-compose.yml              docker compose up -d
 ├─ site/ 静态文件                   nginx 伺服 site/
 │   ├─ index.html（归档首页）       （静态文件，git pull 后即生效）
 │   └─ posts/*.html（文章页）
 └─ 内容 = wechat-article 生成的 HTML
```

## 本地启动原型

```bash
cd kernel-blog
docker compose up -d        # 访问 http://localhost:8080
docker compose down         # 停止
```

> 首次需要 docker 权限：`sudo usermod -aG docker $USER` 后重新登录。

## 新增文章（日常流程）

1. 流水线/手动用 `wechat-article` 生成公众号 HTML
2. 把正文存为 `site/posts/YYYY-MM-DD-slug.html`（博客骨架 + 公众号正文，参考现有示例）
3. 更新 `site/index.html` 归档列表
4. `git add/commit/push`

## 发布到服务器（副本更新）

```bash
# 服务器上
cd ~/kernel-blog && git pull && docker compose up -d   # 静态文件自动生效，无需重建
```

## 服务器被攻击的恢复

```bash
# 服务器上，从零重建副本
cd ~ && rm -rf kernel-blog
git clone <repo-url> kernel-blog
cd kernel-blog && docker compose up -d
```
本地主本在，服务器随时可重建；攻击只影响副本，不影响数据。

## 待接入

- 域名 + HTTPS（Let's Encrypt）后：服务器端口改 `80:80`，公众号「阅读原文」指向文章 URL
- 流水线自动化：cron 生成文章后自动 commit/push（可选）
- RSS / 评论 / 搜索（后续按需加）

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

# 3. 公众号粘贴用 HTML（复制即粘贴进微信）
node scripts/render-wechat.mjs 2026-08-08          # 输出到 stdout
node scripts/render-wechat.mjs 2026-08-08 --out    # 写入 output/公众号-2026-08-08.html

# 4. 发布（git commit 触发 post-commit hook 自动部署到服务器）
git add -A && git commit -m "..." && git push
```

> ⚠️ 内容 YAML 规范：所有字符串值必须加双引号（值常含 `:`、`[`、`#` 等 YAML 敏感字符）。生成器遵守此规则，否则 js-yaml 解析报错。
