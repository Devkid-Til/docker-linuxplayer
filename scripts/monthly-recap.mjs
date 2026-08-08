#!/usr/bin/env node
/* 盘点聚合器 —— 从当月 blocks 文章确定性聚合，供月/季/年报盘点成文
 *
 * 单一数据源 = src/content/posts/*.md（不维护台账，无漂移、可追溯）
 * 文章即真相：改文章，盘点结果自动对。任何"统计台账"都是第二份真相，会漂。
 *
 * 用法：
 *   node scripts/monthly-recap.mjs                  # 当月全部栏目
 *   node scripts/monthly-recap.mjs --month 2026-08  # 指定月份
 *   node scripts/monthly-recap.mjs --column daily   # 指定栏目（daily|weekly|...）
 *   node scripts/monthly-recap.mjs --json           # 输出 JSON（结构化，供程序/成文参考）
 *
 * 输出 = 盘点素材稿（markdown），Claude 据此按 output-template.md「盘点模板」成文。
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');

const argv = process.argv.slice(2);
const optOf = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const monthArg = optOf('--month');
const columnArg = optOf('--column');
const asJson = argv.includes('--json');

/* 默认当月：从日期计算 YYYY-MM */
const now = new Date();
const nowLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000); // 本地日历月
const month = monthArg || nowLocal.toISOString().slice(0, 7);

/* ── 读文章 ── */
function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  return yaml.load(m[1]);
}

const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort();
const posts = [];
for (const f of files) {
  const md = readFileSync(path.join(POSTS_DIR, f), 'utf8');
  const fm = parseFrontmatter(md);
  if (!fm || !fm.date) continue;
  const date = String(fm.date);
  if (!date.startsWith(month)) continue;                          // 按月过滤
  const col = fm.column || 'daily';
  if (columnArg && col !== columnArg) continue;                   // 按栏目过滤
  posts.push({ file: f, date, column: col, tags: fm.tags || [], blocks: fm.blocks || [] });
}
posts.sort((a, b) => a.date.localeCompare(b.date));

/* ── 聚合 blocks ── */
const stripEmoji = s => String(s).replace(/^[^一-龥A-Za-z0-9]+/, '').trim();

const agg = {
  month, column: columnArg || 'all',
  posts: posts.length,
  tags: {},            // 标签频次
  sections: {},        // 分节名 → 条目数（highlight+more）
  headlines: [],       // {date, title, verdict, link}
  mechanisms: [],      // {date, label, text}
  terms: [],           // {term, n} 速查术语词频
  moreCount: 0,        // 常规动态条目总数
};

let curSection = null;      // 当前 divider(section) 名
let tocKind = null;         // 当前 toc 语境：'mechanism' | 'terms' | 'guide'

for (const p of posts) {
  for (const t of p.tags) agg.tags[t] = (agg.tags[t] || 0) + 1;

  for (const b of p.blocks) {
    switch (b.type) {
      case 'divider':
        if (b.kind === 'section') { curSection = stripEmoji(b.label); tocKind = null; }
        else {
          const label = b.label || '';
          if (label.includes('机制雷达')) tocKind = 'mechanism';
          else if (label.includes('速查')) tocKind = 'terms';
          else tocKind = 'guide';
          curSection = null;
        }
        break;
      case 'headline':
        agg.headlines.push({ date: p.date, title: b.title, verdict: b.verdict || '', link: b.link || '' });
        break;
      case 'highlight':
        if (curSection) agg.sections[curSection] = (agg.sections[curSection] || 0) + 1;
        break;
      case 'more':
        const n = (b.items || []).length;
        agg.moreCount += n;
        if (curSection) agg.sections[curSection] = (agg.sections[curSection] || 0) + n;
        break;
      case 'toc':
        for (const item of (b.items || [])) {
          if (tocKind === 'mechanism') agg.mechanisms.push({ date: p.date, label: item.label, text: item.text });
          else if (tocKind === 'terms') agg.terms.push({ term: item.label, n: 0 });
        }
        break;
      default: /* hook/image/closing/paragraph/quote/code 不参与聚合 */
    }
  }
}

/* 速查术语词频（跨文合并） */
const termMap = {};
for (const t of agg.terms) termMap[t.term] = (termMap[t.term] || 0) + 1;
agg.terms = Object.entries(termMap).map(([term, n]) => ({ term, n })).sort((a, b) => b.n - a.n);

/* 交叉信号：≥2 篇文章共现的标签 → 「与你方向的交叉点」素材 */
agg.crossTags = Object.entries(agg.tags)
  .filter(([, n]) => n >= 2)
  .map(([tag, n]) => ({ tag, n }))
  .sort((a, b) => b.n - a.n);

/* ── 输出 ── */
if (asJson) {
  console.log(JSON.stringify(agg, null, 2));
  process.exit(0);
}

const L = s => console.log(s);
L(`# 盘点素材 · ${agg.month} · ${agg.column}`);
L('');
L(`## 一、规模`);
L(`- 文章 ${agg.posts} 篇 · 头条 ${agg.headlines.length} 条 · 亮点 ${Object.values(agg.sections).reduce((a, b) => a + b, 0) - agg.moreCount} 条 · 常规动态 ${agg.moreCount} 条 · 机制雷达 ${agg.mechanisms.length} 条 · 速查术语 ${agg.terms.length} 词`);
L('');
L(`## 二、标签频次（趋势观察素材）`);
L(`| 标签 | 次数 |`);
L(`|---|---|`);
for (const [tag, n] of Object.entries(agg.tags).sort((a, b) => b[1] - a[1])) L(`| ${tag} | ${n} |`);
L('');
L(`## 三、分节活跃度（数据指标素材）`);
L(`| 分节 | 条目 |`);
L(`|---|---|`);
for (const [sec, n] of Object.entries(agg.sections).sort((a, b) => b[1] - a[1])) L(`| ${sec} | ${n} |`);
L('');
L(`## 四、本期头条（盘点素材 · headline）`);
agg.headlines.forEach((h, i) => {
  L(`${i + 1}. [${h.date.slice(5)}] ${h.title}`);
  L(`   ${h.verdict || '—'}${h.link ? `\n   原文: ${h.link}` : ''}`);
});
L('');
L(`## 五、机制雷达（跨域大改动 · 趋势观察素材）`);
for (const m of agg.mechanisms) L(`- [${m.date.slice(5)}] ${m.label}：${String(m.text).replace(/<[^>]+>/g, '')}`);
L('');
L(`## 六、速查术语（本期出现过的词）`);
L(agg.terms.length ? agg.terms.map(t => `- ${t.term}（${t.n} 篇）`).join('\n') : '- 无');
L('');
L(`## 七、交叉信号（≥2 篇共现标签 → 与你方向交叉点素材）`);
L(agg.crossTags.length ? agg.crossTags.map(t => `- ${t.tag}（${t.n} 篇）`).join('\n') : '- 无');
