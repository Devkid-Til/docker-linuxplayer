#!/usr/bin/env node
/* 构建期 blocks 校验 —— prebuild 自动运行,失败即中断 build(内容上不了线)
 * 当前规则:code 块的 text 必须用 |- (literal) 保留换行;用 >- (folded) 会把多行折成一行,直接报错。
 * 规则是源码级扫描(看原始 YAML 的标量指示符),因为折叠发生在 YAML 解析时,解析后无法区分。
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');

const errors = [];
let postCount = 0;

function checkFile(file) {
  const src = readFileSync(file, 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return;
  postCount++;
  const lines = m[1].split('\n');
  let blockKeyIndent = -1; // -1 = 不在任何 code 块内
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    const typeMatch = t.match(/^(\s*)-\s*type:\s*(\w+)/);
    if (typeMatch) {
      // 块的键(如 text:)比 `-` 多缩进 2;content 行更深,不会误触发
      blockKeyIndent = typeMatch[2] === 'code' ? typeMatch[1].length + 2 : -1;
      continue;
    }
    if (blockKeyIndent < 0) continue;
    const textMatch = t.match(/^(\s*)text:\s*(\S*)/);
    if (textMatch && textMatch[1].length === blockKeyIndent) {
      const ind = textMatch[2];
      if (ind.startsWith('>')) {
        errors.push(
          `${path.relative(ROOT, file)}:${i + 1} — code 块 text 用了折叠标量「${ind}」,多行会被折成一行。必须用「|-」(literal)保留换行。`
        );
      }
      blockKeyIndent = -1; // text 行已消费,离开 code 块
    }
  }
}

function collectMd(dir, base = '') {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...collectMd(path.join(dir, ent.name), rel));
    else if (ent.name.endsWith('.md')) out.push(path.join(dir, ent.name));
  }
  return out;
}

for (const f of collectMd(POSTS_DIR)) checkFile(f);

if (errors.length) {
  console.error('[validate-blocks] ✗ 代码块 YAML 校验失败（folded 标量会吃掉换行）:');
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`[validate-blocks] ✓ ${postCount} 篇文章的 code 块全部通过（text 均为 literal 标量）`);
