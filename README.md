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

## 构建系统（Pipeline + Template）

```
data/posts.json          ← 文章元数据（每日 cron 追加一行）
scripts/build.js         ← 读 json → 渲染模板 → 产出 site/
scripts/templates/       ← 页面模板
site/                    ← 构建产物（Nginx 伺服）
```

### 日常流程（统一走脚本）

```bash
# 加新文章（自动：复制HTML + 更新posts.json + 构建 + 部署 + git push）
bash scripts/add-post.sh --date "2026-08-08" --title "标题" --slug "slug"   --desc "摘要" --tags "标签A,标签B" --html /path/to/article.html

# 只改样式/模板后重新发布
bash scripts/deploy.sh "commit message"
# （deploy 自动：build → rsync 到服务器 → git commit+push；commit 会触发 post-commit hook 自动再部署一次，幂等）
```
> 构建产物：首页 / 标签页 / RSS 全部自动更新；git commit 后自动部署到服务器。
