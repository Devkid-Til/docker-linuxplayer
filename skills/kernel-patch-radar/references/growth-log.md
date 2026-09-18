# Growth Log — kernel-patch-radar 撞到的坑

**规则**：append-only，最新在下。够 3 条考虑升级到 `SKILL.md` 的 Gotchas。

格式：
```
## YYYY-MM-DD — <一句话症状>
**上下文**：
**表现**：
**根因**：
**修复**：
**元教训**（可选）：
```

---

## 2026-08-05 — 脚本 `| head -N` 在 `set -euo pipefail` 下触发 SIGPIPE，整个脚本静默失败
**上下文**：写 fetch-dri-devel.sh，末尾用 `| head -$N` 截断输出，脚本顶部有 `set -euo pipefail`。
**表现**：脚本退出码 141、零输出；手动跑同一条管道（不带 pipefail）却正常。排查时发现连 `latest` 检测那步的 `| head -1` 都会让 `set -e` 掐死脚本。
**根因**：`head` 消费完 N 行就提前退出 → 上游 producer 写管道拿到 SIGPIPE → `pipefail` 让管道退出码变 141 → `set -e` 判定失败直接退出。`| head` 在 `set -euo pipefail` 下是反模式。
**修复**：（1）截断改用 `sed -n "1,${N}p"`（读完整个流，不早退，无 SIGPIPE）；（2）取「第一行」改用变量捕获整份输出 + `${var%%$'\n'*}` 切片，不经过管道截断。
**元教训**：**凡 `set -euo pipefail` 脚本，`head`/`grep -m1` 作为管道消费端都可能把管道退出码带成 141——"明明有输出却报失败"优先查这里。**

---

## 2026-08-05 — 用户反馈首份简报「太笼统、看不懂」：缺来龙去脉 + 结构不清
**上下文**：kernel-patch-radar 首个样张（v0.1）发出后，用户（内核新人）反馈。
**表现**：简报罗列补丁标题 + 层/为什么两行，但没讲清每条补丁的来龙去脉（背景/前情/术语），新人看不懂；格式是 bullet 列表，不像每日报刊那样层级清晰。
**根因**：v0.1 模板只定义了「列什么」，没定义「讲到什么深度」和「怎么组织层级」；假设读者已懂子系统上下文，实际读者是内核新人。
**修复**：输出模板重做——报纸式（📌导读 → 🏆头条 → 📰栏目 → ⚙️机制雷达 → 📖概念速查）；亮点补丁固定「背景/干了什么/为什么重要」三段式（后演化为六步弧线）；术语首次出现给一句话解释；完整模板 + 填充示例移入 `references/output-template.md`。
**元教训**：**面向新人读者的简报，「背景」不是可选项而是必需品——任何补丁都要回答「这是哪一层、之前发生过什么、为什么现在动它」。**

---

## 2026-08-05 — 对抗式 review（r1）抓到：SIGPIPE 坑只修了一半 + 三处「文档声称 > 实际落地」
**上下文**：用 adversarial-review skill 派独立 subagent 冷启动评审 v0.8.0。
**表现**：（1）`grep -im1` 提取 Message-Id 与 `| head` 同属早退消费端，>64KB 大邮件下 git show 可能 SIGPIPE→141 全灭——**同类坑第三次踩**；（2）`daily` 单源失败整体中断，健康源数据被丢弃；（3）description/Gotcha 引用不存在的 `scripts/fetch-*.sh` 与未启用的 freedesktop 通道；（4）weekly workflow 未注册、飞书归档有目录无动作。
**根因**：脚本修复只针对当时抓到的具体用法（`| head`），没提炼成「早退消费端一律禁用」的通用规则；文档随实现演进滞后；「待接入」能力写进了参考区被当成已实现。
**修复**：radar.sh 全量改用 sed-读完流 + 变量切片 + `%x1f` 字段分隔；`_do_daily` 逐源 `if !` 隔离；SKILL.md description/Gotcha 统一为 `radar.sh`、删除 freedesktop 声称、workflow 注明 `scriptPath`、飞书归档标注「待接入」；SIGPIPE 规则升级为 SKILL.md Gotcha。
**元教训**：**「坑修了具体那一处」≠「反模式被消灭」——修完要提炼成一条可复用的通用规则（本条已升级 SKILL.md Gotcha）。文档声称必须≤实际落地，半成品一律标「待接入」。**

## 2026-08-08 — `python3 - <<'PY'` heredoc 静默覆盖管道 stdin，脚本把 474KB JSON 读成了空
**上下文**：写 `mainline-lookup.sh`（mainline 合入状态反查），想用 `printf '%s' "$json" | python3 - <<'PY' ... PY` 管道喂 JSON 给 python 脚本。
**表现**：curl 正常返回 200（474KB JSON，head 可见有效内容），但 python `json.load(sys.stdin)` 报 `JSONDecodeError: Expecting value: line 1 column 1`——stdin 是空的。两个解析步骤（校验 + 提取）全失败，索引 0 条。
**根因**：**heredoc 重定向 (`<<'PY'`) 会替换命令的 stdin，把管道的输入顶掉**——`producer | cmd <<EOF` 里 cmd 读的是 heredoc 内容（空），不是管道数据。命令同时有管道输入和 heredoc 时，heredoc 赢、管道静默丢失，没有任何报错。
**修复**：改回 `python3 -c '...'`（管道读 stdin），并把 f-string 里的 `\"` 转义（f-string 表达式不允许反斜杠，SyntaxError）换成字符串拼接——`-c` 单引号包 python 代码 + 拼接式 print，既无 heredoc 覆盖、也无 f-string 转义坑。
**元教训**：**`cmd <<EOF` 与 `| cmd` 互斥——有管道输入就绝不写 heredoc；python 内嵌用 `-c` + 拼接，别用 f-string 里的 `\"`。**（同类「管道输入被忽略」先查这个。）

---

## 2026-08-08 — 产出物从"扁平简报"升级为"blocks 文章"，与博客渲染体系并轨
**上下文**：正文模板系统上线（博客 Astro 组件 + 公众号 render-wechat.mjs 双端同源），wechat-article v0.7.0 已改产 blocks。
**表现**：本 skill 的 output-template 仍是 emoji+加粗的扁平 markdown 简报，AI 不知 headline/highlight/toc/closing 类型；SKILL.md 仍让 AI 读已废弃的 html-fragments.md/template.html；每日流程没有产出博客文章文件的环节 → 日报成文即"low 感"源头。
**根因**：skill 的内容结构（六步弧线/压缩弧线/速查）本就与 blocks 一一对应，但没做显式映射；排版职责从"wechat-article 手写 HTML"迁移到"脚本渲染"，引用未同步。
**修复**：output-template.md 重写为「内容结构 → block type」映射指南（含 blocks 骨架示例）；SKILL.md 工作流第 4-6 步改为：产出 blocks 文章文件 → render-wechat 出公众号 HTML → 其余平台；wechat-template.md 职责边界与样稿引用同步；description 更新。
**元教训**：**内容结构设计得再对，只要产出物还是松散格式，渲染层再精修也白搭——成文格式必须在产出 skill 里显式固化。**

---

## 2026-08-09 — lore git fetch 全 0：depth=1200 大传输超时，不是"网络连不上"
**上下文**：`radar.sh stats`（13 列表 T24 计数）连续 3 次全 0、首页活跃度拿不到真数据。用户质疑"真是网络问题还是时间太短"。
**表现**：ls-remote 探测能通、TLS/HTTP 正常，但 `git fetch --depth=1200` 全部 `timeout 120` 超时；`--depth=30` 单源实测 4-20s 成功、`--depth=400` 66s 成功、`--depth=1200` >120s 失败。
**根因**：**深度 1200 的传输量在慢带宽下超出 120s 超时预算**——连通性（TCP/TLS/git 协议）与传输吞吐是两回事；13 源并行还抢带宽放大每个源的耗时。被外层 timeout 掐死 → 每源计 0 → 全 0 JSON。
**修复**：probe-net.sh 分层探针（L1 TCP → L2 TLS → L3 ls-remote → L4 小深度 fetch 计时）先定性；stats 按用户指示**去掉 fetch 超时、跑完为止**（靠全局 `http.lowSpeedLimit/lowSpeedTime` 低速快速失败兜底，不会无限挂）；并行保留（总时间≈最慢单源）。
**元教训**：**"探测通"≠"传输能完成"——大深度 fetch 的超时是数据全 0 的头号嫌疑，先量化单源各深度耗时再定方案，别反复重试同样的深度。**

---

## 2026-08-09 — Astro build 后 import.meta.url 指向编译产物，相对路径读数据文件静默回退
**上下文**：首页 `index.astro` frontmatter 用 `new URL('../data/radar-stats.json', import.meta.url)` + fs.existsSync 读板块活跃度数据。
**表现**：radar-stats.json 明明存在且 node 直接测路径解析正确，但 `npm run build` 后产物里仍是模拟数据（「模拟预览」标注不消失）——frontmatter 里 radarStats 读成了 null。
**根因**：**Astro build（Vite 打包）后 `import.meta.url` 指向编译产物而非源码 `src/pages/index.astro`**，`../data/` 相对路径错位 → existsSync false → 走 MOCK fallback。模拟阶段没暴露（当时本来无数据文件）。
**修复**：改用 `path.join(process.cwd(), 'src/data/radar-stats.json')`（build 时 cwd = 项目根）拼绝对路径。
**元教训**：**Astro/打包器里别用 import.meta.url 拼项目内相对路径读运行时文件——用 process.cwd() 绝对路径。症状是"文件明明在却读到 fallback"优先查这个。**

---

## 2026-08-09 — 三镜像补丁反查：stable 祖先≠回移植；name-rev 比 tag --contains 快两个量级
**上下文**：本地三镜像（mainline/next/stable）就位后写 `mirror-lookup.sh` 反查补丁三状态（mainline 命运 / next 队列 / stable 回移植）。
**表现**：（1）`git tag --contains` 对历史 commit 要 28s、`branch -r --contains` 也要 30s，且把 mainline 原始提交误判为"已回移植"；（2）并行 stats 任务外层超时被杀后，git fetch 子进程成孤儿无限重试占 197% CPU。
**根因**：**stable 分支天然包含 mainline 全部祖先历史——"commit 存在于 stable 仓库"≈恒真，祖先关系≠回移植**；tag --contains 全量遍历 tag 图慢；被杀的 bash 不清理子进程。
**修复**：回移植判定改为「回移植提交 message 的 `[ Upstream commit <sha> ]` 标记 / mid 索引命中 + `git name-rev` 落到 `tags/vX.Y.Z`」；版本定位用 name-rev（0.05-0.24s）；清残留用 `kill -9` 具体 PID。
**元教训**：**"包含"（祖先）不能当"回移植"——内核 git 里 stable 分支包含 mainline 全史，必须看版本标签或 Upstream commit 标记。性能对比永远是先量化的：name-rev ≫ tag --contains。**

---

## 2026-08-16 — radar.sh daily 尾部报 `SEEN: bad array subscript`，lkml/linux-rt-devel 节缺失
**上下文**：`bash scripts/radar.sh daily` 正常输出前 11 节（linux-media…linux-arch），但处理到 lkml 前中断：`scripts/radar.sh: line 137: SEEN: bad array subscript`，exit=1；lkml（T24:400，全内核广播源）与 linux-rt-devel 两节没产出，sched/driver-core 信号差点漏掉。
**根因**：daily 函数第 137 行 `SEEN[$mid]=1` 用关联数组去重——`while read <<< "$out"` 的 here-string 总在末尾追加一个空行，空行产生的空 mid 使 `SEEN[""]` 在 `set -u` 下抛 bad array subscript 并整体中断（中断点在 lkml 之前，sched/driver-core 信号差点漏掉）。
**修复**：**2026-08-17 已从根上修脚本**——while 循环开头加 `[ -z "$line" ] && continue` 跳过空行（radar.sh 内联注释已标注）。此前 08-16 的临时绕法（fetch 单独补抓缺失列表）仍可作兜底。
**元教训**：**`while read <<<` 的 here-string 必带尾随空行 → 空 mid → 关联数组下标 set -u 即爆。任何「解析行字段后查关联数组」的 bash 循环，第一行先跳空行。daily 中断时先看 stderr 尾部是否 bad array subscript，若是可 fetch 单独补抓，别重跑 daily 白等。**

---

## 2026-09-14 — 成文时凭印象拼 lore 链接 → 31 条里混进 13 条编造的 message-id
**上下文**：日报成文写 `link:` 与 `<a href>` 时，一部分条目我只扫了雷达的「时间|标题」就让正文先行，链接按补丁名/日期「照着格式编」了一个（如 `<20260913223023.3b0b2b4b@fedora>`），另一部分正确取自雷达第 3 字段。
**表现**：文件写完、YAML 可解析、build 通过——**排版类校验全线绿灯，但 13 条链接指向不存在的邮件**。其中 amdxdna 那条编造的 mid 在后续手工替换时因「href 里用的是 `&lt;` 实体、`link:` 里用的是字面 `<`」而漏改，第二轮校验才揪出来。
**根因**：**lore 链接的 message-id 无法从标题反推**（时间戳、随机后缀、作者邮箱域名都是噪音）。扫数据阶段我用了 `awk -F'|' '{print NR": "$1" "$2}'` 的裁剪视图，第 3 字段（链接）根本没进上下文——写文时手上没有真值，就顺手编了一个。**裁剪视图提高了扫读效率，却把成文必需的字段裁掉了**。
**修复/护栏**：成文后强制跑一次反编造校验——把文中所有 `https://lore.kernel.org/...` 抽出来，逐条在当日雷达原始输出里做子串匹配，不命中即报错：
```bash
python3 - <<'PY'
import io,re
post=io.open('<文章>.md',encoding='utf-8').read()
radar=io.open('/tmp/radar-daily-<日期>.txt',encoding='utf-8').read()
bad=[u for u in set(re.findall(r'https://lore\.kernel\.org/[^\s")\\]*',post)) if u.rstrip('/') not in radar]
print("❌ 疑似编造:",bad if bad else "无 ✅")
PY
```
**元教训**：**扫数据可以裁剪字段，成文前必须把链接字段捞回上下文；「YAML 通得过 + build 通过」完全不能证明链接是真的——排版校验从来不检查事实。凡是「ID/哈希/URL 这类无法从标题反推的字段」，只允许从数据里复制，禁止照着格式生成。**

---

## 2026-09-15 — 同一坑二次踩：14 条编造链接写进初稿（同属「更多动态」区），靠 09-14 的校验脚本拦住
**上下文**：本次成文时，头条与 ★ 亮点的 `link:` 都老老实实取自雷达第 3 字段；但最后写两组 `more`（13 条常规动态）时又凭印象编了 14 条 message-id（如 `<20260914195858.160299-1-benjamin@...>`、`<20260914021006.2245698-1-mattc@...>`），其中几条的 `@` 后域名直接写了 `...`。
**表现**：初稿写完即跑 09-14 沉淀的反编造校验，**14 条全部 MISS**，成文后当场替换为真实 cover-letter 链接（26 条链接最终 0 未命中），未出仓库。
**根因**：**「更多动态」是全文最后写的一块，而此时上下文里只剩裁剪后的扫读视图——精确复现了 09-14 的成因**。另外雷达本次对个别条目（`RE: [PATCH v17 20/22] media: i2c: maxim-serdes…`）输出的第 3 字段是 `<none-7b9f0272…>`（无有效 message-id），这类条目**根本无法引用链接**，只能剔除或改选有 cover letter 的条目。
**修复/护栏**：（1）**扫读阶段就把第 3 字段带上上下文**——用 `awk -F'|' '{print $1" | "$2" | "$3}'` 而非只打 `$1 $2`，写 `more` 时直接复制真值，从「先编后验」变成「全程不编」；（2）**链接选中一律取系列的 cover（`00/N` 或 `0/N`）**，不要取系列中间帖（`-2-`、`-4-`）——读者点进去要能看到设计意图；（3）雷达第 3 字段为 `<none-…>` 的条目视为「无链接」，不得成文；（4）反编造校验**必须覆盖 `more` 区**（本次正是它拦住的），成文后、commit 前各跑一次。
**元教训**：**同一个坑的成因往往不是「记性差」，而是「那一块内容的输入视图缺字段」。修校验脚本只能拦住错误外泄，真正省事的是把字段在扫读时就带全——校验是安全网，不是工作流。**
