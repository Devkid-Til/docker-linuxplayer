#!/usr/bin/env node
/* DoD 校验 —— 日报流水线的完成定义检查
 *
 * 与 validate-blocks.mjs 分工（后者跑在 prebuild，管所有文章）：
 *   validate-blocks 已覆盖：① code 块必须 literal  ② image src 必须 OSS 且 HEAD 可达
 *   本脚本补两项「随当日产出才成立」的检查：
 *     ④ radar-stats.json 的 date 与文章日期一致 —— 板块活跃度已随文刷新
 *     ⑤ 正文含至少一条 lore.kernel.org 原文链接 —— 每条入选可追溯
 *
 * 为什么不放进 prebuild：④ 只对「当天那篇」成立，历史文章的 radar-stats 日期必然不等于
 * 文章日期，放 prebuild 会把所有旧文章判失败。
 *
 * 用法：
 *   node scripts/check-dod.mjs                 # 检查日期最新的那篇
 *   node scripts/check-dod.mjs --date 2026-09-21
 *   node scripts/check-dod.mjs <post.md 路径>
 *
 * 退出码：0 = 全部通过；1 = 有失败项
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const STATS = path.join(ROOT, 'src/data/radar-stats.json');
const LORE_RE = /https?:\/\/lore\.kernel\.org\//;

const argv = process.argv.slice(2);
const dateFlag = argv.includes('--date') ? argv[argv.indexOf('--date') + 1] : null;
const fileArg = argv.find((a) => a.endsWith('.md'));

/* ── 找目标文章 ── */
function pickPost() {
  if (fileArg) return path.resolve(fileArg);
  const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  const dated = files
    .map((f) => ({ f, m: f.match(/^(\d{4}-\d{2}-\d{2})/) }))
    .filter((x) => x.m)
    .map((x) => ({ f: x.f, date: x.m[1] }));
  if (dateFlag) {
    const hit = dated.find((x) => x.date === dateFlag);
    if (!hit) throw new Error(`找不到 ${dateFlag} 的文章`);
    return path.join(POSTS_DIR, hit.f);
  }
  dated.sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!dated.length) throw new Error('posts 目录下没有带日期的文章');
  return path.join(POSTS_DIR, dated[0].f);
}

/* ── 拆 frontmatter / body ── */
function split(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('frontmatter 格式不对（缺少 --- 包裹）');
  return { fm: yaml.load(m[1]), body: m[2] };
}

const errors = [];
const ok = [];

try {
  const postPath = pickPost();
  const rel = path.relative(ROOT, postPath);
  const raw = readFileSync(postPath, 'utf8');
  const { fm } = split(raw);
  const postDate = String(fm.date ?? '').slice(0, 10);

  console.log(`[check-dod] 目标: ${rel}（date=${postDate}）`);

  /* ④ radar-stats 是否已随当日刷新 */
  const stats = JSON.parse(readFileSync(STATS, 'utf8'));
  const statsDate = String(stats.date ?? '').slice(0, 10);
  if (!statsDate) {
    errors.push(`radar-stats.json 缺少 date 字段`);
  } else if (statsDate !== postDate) {
    errors.push(
      `板块活跃度未随文刷新：radar-stats.json 的 date=${statsDate}，文章 date=${postDate}`
    );
  } else {
    ok.push(`④ radar-stats 已刷新（${statsDate}）`);
  }

  /* ⑤ 至少一条 lore 原文链接
     扫全文而非 body——日报的正文是空的，内容全在 frontmatter 的 blocks: 里 */
  const loreCount = (raw.match(new RegExp(LORE_RE, 'g')) ?? []).length;
  if (loreCount === 0) {
    errors.push(`正文没有 lore.kernel.org 链接 —— 入选条目缺少原文出处`);
  } else {
    ok.push(`⑤ lore 原文链接 ${loreCount} 条`);
  }
} catch (e) {
  errors.push(`执行失败: ${e.message}`);
}

for (const o of ok) console.log(`  ✓ ${o}`);
if (errors.length) {
  console.error(`[check-dod] ✗ DoD 未通过：`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('[check-dod] ✓ DoD 全部通过');
