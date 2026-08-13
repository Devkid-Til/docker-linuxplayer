#!/usr/bin/env node
/* 构建期 blocks 校验 —— prebuild 自动运行,失败即中断 build(内容上不了线)
 *
 * 规则:
 * 1. code 块 text 必须用 |- (literal) 保留换行;用 >- (folded) 会把多行折成一行,直接报错。
 *    —— 源码级扫描(看原始 YAML 的标量指示符),因为折叠发生在 YAML 解析时,解析后无法区分。
 * 2. image 块 src 必须是 OSS 公网地址;并对每个 src 发 HEAD 存在性校验:
 *    404 = 文件没上传 → 报错(防裂图);网络失败/超时 → 仅警告(不因临时抖动误杀部署)。
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const OSS_HOST = 'kernelplayer.oss-cn-beijing.aliyuncs.com';

const errors = [];
const warnings = [];
const images = []; // { file, src }
let postCount = 0;

/* ── 规则 1:code 块 folded 标量检查(源码级) ── */
function checkCodeBlocks(file, frontmatter) {
  const lines = frontmatter.split('\n');
  let blockKeyIndent = -1; // -1 = 不在任何 code 块内
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i];
    const typeMatch = t.match(/^(\s*)-\s*type:\s*(\w+)/);
    if (typeMatch) {
      blockKeyIndent = typeMatch[2] === 'code' ? typeMatch[1].length + 2 : -1;
      continue;
    }
    if (blockKeyIndent < 0) continue;
    const textMatch = t.match(/^(\s*)text:\s*(\S*)/);
    if (textMatch && textMatch[1].length === blockKeyIndent) {
      if (textMatch[2].startsWith('>')) {
        errors.push(
          `${path.relative(ROOT, file)}:${i + 1} — code 块 text 用了折叠标量「${textMatch[2]}」,多行会被折成一行。必须用「|-」(literal)保留换行。`
        );
      }
      blockKeyIndent = -1;
    }
  }
}

/* ── 规则 2:image 块格式检查(解析后)。src 可选——无 src 是「[图：alt]」文本占位,合法;有 src 才校验 OSS + 存在性 ── */
function checkImages(file, data) {
  for (const b of data.blocks ?? []) {
    if (b.type !== 'image') continue;
    if (!b.src) continue; // 占位 image 块(仅 alt),允许
    let u;
    try { u = new URL(b.src); }
    catch { errors.push(`${path.relative(ROOT, file)} — image src 不是合法 URL: ${b.src}`); continue; }
    if (u.host !== OSS_HOST) {
      errors.push(`${path.relative(ROOT, file)} — image src 必须指向 OSS（${OSS_HOST}）,实际 host=${u.host}`);
      continue;
    }
    images.push({ file, src: b.src });
  }
}

/* ── 存在性校验(HEAD):404 报错,网络失败仅警告 ── */
async function checkExistence({ file, src }) {
  const rel = path.relative(ROOT, file);
  try {
    const res = await fetch(src, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    if (res.status === 404) errors.push(`${rel} — image 404,文件未上传到 OSS: ${src}`);
    else if (res.status >= 400) warnings.push(`${rel} — image 返回 ${res.status}(仅警告): ${src}`);
  } catch (e) {
    warnings.push(`${rel} — image 网络检查失败(仅警告,请手动确认): ${src} — ${e.message}`);
  }
}

/* ── 收集所有 .md ── */
function collectMd(dir, base = '') {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...collectMd(path.join(dir, ent.name), rel));
    else if (ent.name.endsWith('.md')) out.push(path.join(dir, ent.name));
  }
  return out;
}

for (const f of collectMd(POSTS_DIR)) {
  const src = readFileSync(f, 'utf8');
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  postCount++;
  checkCodeBlocks(f, m[1]);
  let data;
  try { data = yaml.load(m[1]); }
  catch (e) { errors.push(`${path.relative(ROOT, f)} — frontmatter YAML 解析失败: ${e.message.split('\n')[0]}`); continue; }
  checkImages(f, data);
}

await Promise.all(images.map(checkExistence));

if (errors.length) {
  console.error('[validate-blocks] ✗ 校验失败（已阻止构建）:');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`  ⚠ ${w}`);
console.log(`[validate-blocks] ✓ ${postCount} 篇文章通过校验（code 块均 literal · ${images.length} 个 image 全部可达）`);
