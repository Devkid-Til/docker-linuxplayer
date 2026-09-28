#!/usr/bin/env node
// check-links.mjs — 反编造护栏：文章里的 lore 链接必须逐字出现在当天 radar 输出里
//
// 用法:
//   node check-links.mjs <文章.md> <radar 输出文件> [更多允许来源...]
//   退出码 0 = 全部命中；1 = 有未命中（并逐条打印）
//
// 为什么需要它（不是提示词能解决的）:
//   09-14 / 09-15 / 09-24 / 09-26 四次都踩同一个坑——成文写 `more` 区时手头没有逐条
//   message-id，于是照着命名惯例「拼」出形如 <20260925195846.2e29624d@kernel.org> 的假链接。
//   这类字段（ID / 哈希 / URL）无法从标题反推，只能复制。YAML 通得过、build 通过、
//   排版渲染正常——都完全不能证明链接是真的。
//
// 为什么按「逐字比对 radar 输出」而不是「按格式校验」:
//   格式校验只能拦住形状不对的假链接；拼得足够像的假链接照样过。radar 输出是当天唯一
//   可信来源（lore git 抓下来的第 3/5 字段），逐字比对才是真校验。

import { readFileSync } from 'node:fs';

const [postPath, ...sourcePaths] = process.argv.slice(2);
if (!postPath || sourcePaths.length === 0) {
  console.error('用法: node check-links.mjs <文章.md> <radar 输出文件> [更多允许来源...]');
  process.exit(2);
}

const post = readFileSync(postPath, 'utf8');
const sources = sourcePaths.map(p => readFileSync(p, 'utf8'));

// 抓文章里的 lore URL，去掉结尾的引号/尖括号
const urls = new Set(
  [...post.matchAll(/https:\/\/lore\.kernel\.org\/[^\s"']+/g)]
    .map(m => m[0].replace(/[">]+$/, ''))
);

const missing = [...urls].filter(u => !sources.some(s => s.includes(u)));

if (missing.length === 0) {
  console.log(`[check-links] ✓ ${urls.size} 条 lore 链接全部命中 radar 输出`);
  process.exit(0);
}

console.error(`[check-links] ✗ ${missing.length}/${urls.size} 条 lore 链接未在 radar 输出中找到——疑似编造，必须替换为真实 message-id：`);
missing.forEach(u => console.error('  ' + u));
process.exit(1);
