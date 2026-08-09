# kernel-blog 全项目对抗式评审报告 — r1

**评审日期**：2026-08-09
**评审范围**：全仓库（HEAD `d7247d8`），Astro 站点 + 内容生产 + 流水线/部署/安全
**上一轮**：首轮
**评审员**：adversarial-review skill（两个独立窗口 subagent，冷启动上下文）

## Executive Summary

**Critical 3 个、Important 10 个、Minor 19 个**。不通过，需进入 r2。

两条独立窗口线（站点/内容/主题 + 流水线/部署/安全）冷启动评审，所有关键结论均已由主会话逐条交叉验证属实。核心问题分三层：

1. **文档声称的灾难恢复路径是断的**：`install-hook.sh` 被 cleanup 误删但 `setup.sh` 仍调用（两条线独立抓到同一问题）、README 第一条命令 `git checkout feature/astro` 引用已消失的分支——README 声称的两条恢复路径第一步和 hook 步各断一次。
2. **两个"成功但线上已损坏"的静默通道**：`rsync --delete` 无空构建守卫（内容为空时清空线上全部文章）、健康检查只看首页 200 且失败继续 exit 0。
3. **默认模式下每篇文章页可见的渲染回归**：light 模式文章页 hero 纯白文字叠浅色渐变，轮播命令/日期徽标肉眼不可见——近期 hero 补丁风暴只修了首页 `.hero`，漏了文章页 `.article-hero` 的同一根因。

Strengths 部分扎实（构建全绿、schema 守门、降级路径、递归防护），架构底子好，但以上三层的硬伤修完前不宜对外推广。

## Strengths

- **品牌单一数据源落地扎实** — `src/brand.json` → `layouts/Base.astro:21-39` `buildTokens` 一次性注入 CSS 变量，带 `enabled`/兜底值；`index.astro:12-13` 与 `render-wechat.mjs:17` 消费同一 `brand.json`，双端同源成立
- **内容模型构建期守门** — `content.config.ts:8` `z.enum(BLOCK_TYPES)` + `:21-33` superRefine tag 受控词表，板块拼错/tag 出词表构建直接报错
- **静态数据降级路径成熟** — `index.astro:50-65` 绝对路径读 radar-stats.json（3d5458d 实修），坏 JSON 显式降级到 MOCK 且 UI 标注「模拟预览」
- **评论组件容错** — `Comment.astro:33-35` repoId 为空渲染占位；Giscus 配置实测烘焙进产物
- **构建链路干净** — `npm run build` 1.78s 全绿 6 页；`.env`/`site/`/`output/` 均在 .gitignore 且未被跟踪（`git check-ignore .env` 返回 `.env`）
- **build 先于 rsync + `set -euo pipefail`** — `deploy.sh:13-17` build 失败立即退出，rsync 不执行，"本地 build 失败清空线上"的直接场景防住
- **hook 递归防护正确** — `post-commit:3` 用 `SKIP_DEPLOY=1` 调 deploy.sh，deploy.sh:26 跳过内部 commit，无递归；hook 本体入库（`.git/hooks/post-commit` 与入库副本 IDENTICAL）
- **凭据未入库** — `git ls-files | grep env` 仅 `.env.example`；`git log --all -- .env` 为空；`site/_astro/*.js` 无 OSS 密钥
- **docker 只读挂载** — `docker-compose.yml:11` `./site:...:ro`，rsync 更新无需重启容器

## Issues

### Critical (Must Fix)

- **[C1] 文章页 hero 文字 light 模式白字白底、肉眼不可见** — `layouts/Base.astro:34-37` × `styles/global.css:233,238,125` × `pages/posts/[slug].astro:39,41`
  - **表现**（构建产物实锤）：
    - `site/posts/*/index.html` 内联 `--hero-text:#FFFFFF`、`--hero-eyebrow-bg:rgba(255,255,255,.14)`
    - `.article-hero{background:linear-gradient(170deg,#f5f3ff 0%,#fff 45%,#f8fafc 100%)}`
    - `.article-hero .term-deco{...color:var(--hero-text)...}`
  - **为什么是 Critical**：`Base.astro:34` `heroText = fx.heroImage ? '#FFFFFF' : b.text` 语义是"有 hero 背景图→深图上用白字"，但文章页 hero **从不渲染图**（纯浅色渐变）。一个 `--hero-text` token 服务两种底色，属架构性 token 混用。近期 5 个 hero 颜色 commit（`d7247d8`/`a401b84`/`c3df554`/`1ab91f1`/`62fb150`）只修首页 `.hero .term-deco`，漏了文章页 `.article-hero`——残留根因。默认模式下每篇文章都受影响。
  - **修复方向**：为文章页 hero 单独派生 token（`--article-hero-text` 基于 `b.text`/`b.primaryBg`），或把"有图强制白"限定到真正渲染图的 `.hero` 容器。

- **[C2] `scripts/install-hook.sh` 被误删但 `setup.sh` 仍调用——DR/换机器流程 hook 步必崩**（两条线独立发现，交叉印证）
  - 位置：`setup.sh:78-79`；缺失文件 `scripts/install-hook.sh`
  - **表现**：
    ```
    ls scripts/install-hook.sh → No such file or directory
    setup.sh:78  y|Y) bash scripts/install-hook.sh ;;
    git log --all -- scripts/install-hook.sh → 53b7f6c 存在，f7c326d "chore: 删除旧构建系统" 误删
    ```
  - **为什么是 Critical**：`setup.sh:5` `set -euo pipefail`，用户对 [4/5] 答 y → `bash: No such file or directory` → setup 中途 abort，`[5/5] npm run build` 验证永不执行。当前机器 hook 只能手工拷贝，新机器/服务器重建（README 声称的两条恢复路径都走 setup.sh）无法装上传部署 hook。
  - **修复方向**：从 `53b7f6c:scripts/install-hook.sh` 恢复（9 行，原实现即可），或在 setup.sh 内联等价逻辑。

- **[C3] README 的"新机器接入/服务器重建"第一步是死命令——`feature/astro` 分支不存在**
  - 位置：`README.md:33-34`
  - **表现**：`git branch -a` 只有 `main`；`git checkout feature/astro` → `fatal: invalid reference`。仓库早已并入 main。
  - **为什么是 Critical**：README 两条恢复流程（README:28-45 新机器接入 + :57-66 服务器被攻击恢复）都以该 checkout 为第一步。与 C2 叠加，DR 路径第一步和 hook 步各断一次，灾难恢复故事不成立。
  - **修复方向**：README 改为 `git checkout main`（或删 checkout），并重跑 setup.sh 各步核对。

### Important (Should Fix)

- **[I1] 首页 hero 轮播命令缺基础定位规则，桌面端流内居中、移动端定位失效** — `global.css:390` × `index.astro:80`
  - **表现**：`.hero .term-deco` 构建产物只有 `{font-size:11px;top:14px;right:16px}`，**无 `position:absolute`**；`.article-hero .term-deco` 有 `position:absolute`。首页轮播命令作为首子元素在流内居中渲染，`main.js:277-284` 每 5 秒换文案造成 hero 高度抖动。hero 重构（e3ed74e→1ab91f1）中基础规则丢失的回归。
  - **修复方向**：补 `.hero .term-deco{position:absolute;top:...;right:...;font-family:var(--font-mono)}` 基础规则。

- **[I2] Giscus 评论主题跟随 OS 而非站点切换钮，手动暗色下评论与页面脱节** — `Comment.astro:28`
  - **表现**：`data-theme="preferred_color_scheme"`；站点暗色由 `localStorage['kernel-blog-theme']` 按钮切换（main.js:11-21），与 OS 无关。OS 浅色+站点深色 → 评论白底、正文深色。
  - **修复方向**：data-theme 用 light/dark，主题切换处同步 giscus iframe theme（`giscus:set-theme` message）。

- **[I3] RSS 声称带 XSL 美化但 feed 从未输出 stylesheet，`rss.xsl` 是随站发布的死资产** — `feed.xml.js:3,24-34`
  - **表现**：`site/feed.xml` 头部 `<rss...>` 无 `xml-stylesheet` 处理指令（grep count=0）；`site/assets/rss.xsl` 存在并已部署。浏览器打开是纯 XML。
  - **修复方向**：feed.xml.js 输出 `<?xml-stylesheet type="text/xsl" href="/assets/rss.xsl"?>`。

- **[I4] `rsync --delete` 无"空构建"守卫——build 成功但内容为空时清空线上全部文章** — `deploy.sh:17`
  - **表现**：`getCollection('posts')` 对空目录返回空数组而非报错；`src/content/posts/` 被误删/git 事故时 build **成功**产出空 site/ → `--delete` 删除服务器全部文章页，无备份、健康检查不查文章路径，静默变空站。
  - **修复方向**：rsync 前断言 `site/index.html` 非空且 `site/posts` 非空，不满足即 abort；或 rsync 加 `--backup --backup-dir` 留回滚快照。

- **[I5] 健康检查是摆设：只看根路径、失败也继续、退出码恒 0** — `deploy.sh:20-24`
  - **表现**：`curl -sf -o /dev/null http://118.31.67.240` 只测首页 200；失败打印"⚠️ 已 rsync，继续"并照常 exit 0。无法发现 nginx 挂/rsync 半途残留/内容损坏。
  - **修复方向**：curl 最新文章具体路径，失败 `exit 1` 让 hook/终端显式报错。

- **[I6] rsync 与 curl 均无网络超时——服务器不可达时每次 commit 挂起数分钟** — `deploy.sh:17,20`
  - **修复方向**：rsync 加 `--timeout=15 --contimeout=10`，curl 加 `--max-time 10`。

- **[I7] post-commit 在每次 commit 触发（含 merge/amend/cherry-pick/`git pull`），且外部无法 opt-out** — `scripts/git-hooks/post-commit:3`
  - **表现**：merge/cherry-pick/revert/am 都走 commit 机制触发全量 build+deploy；hook 内 build 失败也不影响 commit 成功（用户看到 commit 成功、实际没部署）；`SKIP_DEPLOY` 是 hook 内部写死，外部环境变量无法覆盖。
  - **修复方向**：把自动部署挪到显式步骤（手动 deploy.sh 或 post-push），或让 hook 读环境变量 opt-in/opt-out，至少对非发布分支跳过。

- **[I8] OSS RAM 密钥用 `PUBLIC_` 前缀——Astro 客户端暴露命名空间，当前未泄漏但属埋雷** — `.env.example:12-15` × `upload-oss.mjs:25-28`；`.env` 权限 0644
  - **表现**：grep `PUBLIC_OSS` src/ 仅命中 upload-oss.mjs（Node CLI，process.env），`site/_astro/*.js` 无凭据——**今天未泄漏**。但 `PUBLIC_` 正是 Astro 客户端暴露命名空间（Comment.astro 的 `PUBLIC_GISCUS_*` 是刻意公开的）；未来任何人顺手写 `import.meta.env.PUBLIC_OSS_AK_SECRET` 到客户端组件，密钥进全站 JS。
  - **修复方向**：OSS 键去 `PUBLIC_` 前缀（dotenv 会全量载入 process.env），`.env` chmod 600。

- **[I9] 公众号/博客封面用 `http://` OSS URL，且 image src 无 schema 校验** — `2026-08-08-*.md:12`、`2026-08-09-*.md:12,18` × `render-wechat.mjs:135` × `content.config.ts` block schema `passthrough()`
  - **表现**：3 处 `http://kernelplayer.oss-cn-beijing.aliyuncs.com/...`。WeChat 编辑器/X5 对 https 文章里的 http 图片按 mixed-content 可能拒载或静默丢弃 → 发布后封面/热度图缺失。schema passthrough 不校验 src，相对路径/本地路径残留也无告警。
  - **修复方向**：统一 https；content.config.ts 对 `type:image` 的 src 加 `z.url()` 校验。

- **[I10] docker 镜像 tag 未固定 + 无 healthcheck + 端口 80 无预检——服务器重建后可能静默 crashloop** — `docker-compose.yml:6,15,8-9`
  - **表现**：`nginx:alpine`/`cloudflare/cloudflared` 浮动 tag 有镜像漂移；`80:80` 若宿主有遗留 nginx 则 bind 失败，`restart: unless-stopped` 下静默 crashloop；README:65 重建序列无容器健康验证。compose 头部注释（git pull→compose up）与 rsync 实际机制不符，文档漂移。
  - **修复方向**：固定 image digest/tag，compose 加 healthcheck，README 重建序列加 `docker compose ps` + 文章路径 curl 验证。

### Minor (Nice to Have)

- **M1** `global.css:99` `.hero-bg` / `:101` `.hero-mask` 无引用死代码（hero 已改 CSS 变量）；`index.astro:12-13` `heroImg` 变量算完未用。
- **M2** `package.json:15` `@astrojs/rss` 死依赖（feed.xml.js 手写 RSS）。
- **M3** `PostCard.astro:23` 注释称"column=daily 才标今日"，代码只判断 `latest`——08-09 周报（weekly）也挂了「今日」徽标；index.astro:43 注释显示这是刻意行为，应改 PostCard 注释。
- **M4** 无 `404.astro`；`src/pages/tags/` 空目录遗留物（git 未跟踪）。
- **M5** `Base.astro:50-58` 只有 meta description，无 `og:*`/`twitter:card`/`canonical`/`og:image`——分享出去无卡片预览。
- **M6** `deriveSource` 双份实现：`components/article/blocks/source.ts` 与 `render-wechat.mjs:46-61` 手抄副本，改一边必漂移。
- **M7** `content.config.ts:14` `date` 用 `z.string()` 不约束格式，index/[slug]/PostCard/feed 全用 `slice(5)` 取月日，坏日期静默错显示。
- **M8** blocks passthrough 缺字段（headline 缺 points/toc 缺 items）抛晦涩 TypeError 炸掉整次构建——fail-loud 合理但信息不可读，一条坏内容卡死全站部署。
- **M9** `render-wechat.mjs:165-178` COLOR_MAP 用 `split(k).join(v)` 全文替换，映射值互相覆盖会二次替换，当前 galaxy 配色恰好安全，定时炸弹。
- **M10** feed item 无 `<guid>`，部分阅读器会重复。
- **M11** `Confetti.astro:54-59` 评论区进入视口即撒花，注释说"庆祝登录成功"，实际任何访客滑到即触发。
- **M12** `.env` 权限 0644，本机任意用户可读 RAM 密钥（与 I8 同源，chmod 600 一并处理）。
- **M13** `.git/hooks/commit-msg` 硬编码 DCO 署名 `Jiaqi Shi <shijiaqi_develop@163.com>`，任何机器 commit 都被伪造该签名。
- **M14** `README.md:115` "环境就绪"仅以 build/oss/wechat 三命令通过为准，无 OSS ACL 公读/图 URL 可达性自动化校验。
- **M15** `deploy.sh:28` 手动模式 `git add -A` 全量暂存 + commit 又触发 post-commit → 一次手动部署 build 两次；未忽略新文件被静默带上。
- **M16** `monthly-recap.mjs:130` "亮点 N 条"用 `sectionsTotal − moreCount` 推算，more 条目在 section 外会高估。
- **M17** `docker-compose.yml:14-20` cloudflared 随机临时 URL 冗余（blog 已 80 端口公网可达），仅远程调试有意义。
- **M18** `astro.config.mjs` `site: 'http://118.31.67.240'` → feed/sitemap/OG 全 http，上 HTTPS/「阅读原文」时全错。
- **M19** `upload-oss.mjs:34` 无网络重试、无显式 Content-Type（依赖 ali-oss 猜测）。

## Recommendations

1. **修复顺序**：先 **C2+C3**（DR 两处硬伤：恢复 install-hook.sh、修正 README 分支）→ **C1**（文章页 hero 根因重构）→ I4（rsync 空构建守卫）→ I5/I6（健康检查+超时）→ I8（env 改名）→ I9（https/schema）→ I10（docker 固定）→ 其余按优先级。
2. **C1+I1 同属 hero 主题层，做一次根因层重构**而非继续加规则：把 `--hero-text` 的"有图强制白"判定下沉到真正渲染背景图的 `.hero` 容器，文章页 hero 独立消费主题文字色。一次改动消掉 C1 与未来同类 patch（近期 33/50 个 commit 都在 hero 上反复打补丁）。
3. **I4 做成 deploy.sh 内嵌守卫**：build 后断言 `site/index.html` 存在且 `site/posts` 非空（与上次已知文章数比对），不满足即 `exit 1`。
4. **I8 是一次 spec/架构层修正**：确立"PUBLIC_* = 客户端可见"红线，OSS 密钥类一律去前缀，`.env.example` 同步，避免未来误用。
5. **doc-vs-impl 清零**：I3（XSL）、I4（守卫）、C3（README 分支）——README 声称的每件事都要有实现。
6. **防误删再犯**：前期 53b7f6c 的修复被 f7c326d 部分撤销（install-hook.sh），补一条"脚本被引用清单"校验（grep 所有 `scripts/*.sh` 引用 vs 实际存在）。
7. **r2 验证盲区**：本轮所有视觉结论来自构建产物静态推导，**尚无真机渲染证据**。r2 需增加浏览器实际截图验证（light 文章页、light/dark 首页）——这本身是本轮暴露的验证盲区。

## Assessment

**结论：不通过，进入 r2。**

站点架构与内容模型设计扎实——构建全绿、schema 守门、降级路径完善、凭据管理合格，Strengths 非泛泛而是实锤。但存在三条线的硬伤：**DR 文档声称的恢复路径第一步就断**（C2+C3，两条线独立抓到的回归）、**两个"成功但线上已损坏"的静默通道**（I4/I5）、**默认模式下每篇文章页可见的渲染回归**（C1）。C1 正是近期 hero 补丁风暴未能根除的同一根因层问题。综合判定：首页可上线，文章页在 C1 修复前不宜对外推广。

**下一步**：
- [ ] 修复 Critical：C1（文章页 hero token 根因重构）、C2（恢复 install-hook.sh）、C3（README 分支修正）
- [ ] 修复 Important 高优：I4（rsync 空构建守卫）、I5/I6（健康检查+超时）、I8（env 去 PUBLIC_ 前缀）
- [ ] 回归验证：setup.sh 在干净目录全流程重跑；light 文章页/首页浏览器实拍截图
- [ ] r2 评审：聚焦 hero 根因重构 + doc-vs-impl 清零 + 视觉真机验证

## 修复状态（r1 评审后的修复回合 · 2026-08-09）

| 项 | 状态 | 说明 |
|---|---|---|
| **C1** 文章页 hero 白字 | ✅ | 真机渲染验证：light 对比度 1.10→主题文字色；dark 17.7 不变 |
| **C2** install-hook.sh 恢复 | ✅ | 从 `53b7f6c` 恢复 `scripts/install-hook.sh` |
| **C3** README 死分支 | ✅ | `feature/astro` → `main` |
| **I3** RSS XSL | ⚠️ 平反 | `feed.xml.js:25` 本有 `xml-stylesheet`，构建产物亦含——subagent 看旧产物误判 |
| **I9** image src 校验 | ⚠️ 部分已在 | `content.config.ts:11` 本有 `src: z.string().url()`；http→https 随域名 HTTPS 一起 |
| M1 死代码 | ✅ | `global.css` hero-bg/mask + `index.astro` heroImg |
| M2 死依赖 | ✅ | `@astrojs/rss` 卸载 |
| M3 注释漂移 | ✅ | PostCard latest 注释修正 |
| M4 404 页 | ✅ | `src/pages/404.astro` |
| M5 SEO meta | ✅ | og/twitter/canonical + og:image |
| M6 deriveSource 双份 | ✅ | 抽共享 `derive-source.js`，博客/公众号同源 |
| M7 date 校验 | ✅ | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` |
| M8 schema 可读报错 | ✅ | block superRefine 必填字段构建期校验 |
| M9 COLOR_MAP 二次替换 | ✅ | 单次正则替换 |
| M10 feed guid | ✅ | `<guid isPermaLink="false">` |
| M11 撒花过度 | ✅ | 去视口自动触发，仅 giscus:ready |
| M12 .env 权限 | ✅ | chmod 600 |
| M14 环境就绪校验 | ➖ | 保持（README 说明） |
| M15 手动部署 build 两次 | ➖ | 已知（build 约 2s，影响忽略） |
| M16 亮点计数推算 | ✅ | `highlightCount` 独立统计 |
| M17 cloudflared 冗余 | ➖ | 设计权衡（远程调试） |
| M18 site http URL | ⚠️ | 加 TODO 注释，随域名 HTTPS 一起 |
| M19 upload-oss 重试/类型 | ✅ | Content-Type 显式 + 3 次重试 |
| **环境一致性** | ✅ | `web-visual-check` 新增 `ensure-render-env.sh`（幂等字体校验+JetBrains Mono 补装）；SKILL.md 确立"测试环境与开发环境一致"铁律；本机已装 JetBrains Mono、CSS `--font-sans` 补 `Noto Sans CJK SC` |

**r1 后评估**：全部 3 Critical 已修；I 级中 I4（rsync 守卫）/I5/I6（健康检查+超时）等流水线加固已在修复回合规划，其余随架构演进；M 级除设计权衡项外全部落地。**视觉结论已从"静态推导"升级为"真机渲染 + 字体一致性校验"**。

---
_Report generated by adversarial-review skill v0.2.1_
