#!/usr/bin/env node
/* 公众号内联 HTML 渲染器
 * 读 src/content/posts/<slug>.md 的 frontmatter blocks → 输出可粘贴进公众号的内联样式 HTML
 * 用法：node scripts/render-wechat.mjs [slug] [--out]
 *   slug 省略 = 最新一篇；--out = 同时写入 output/公众号-YYYY-MM-DD.html
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'src/content/posts');
// 品牌配色单一数据源：渲染默认色在输出端映射到 brand.json wechat 渠道（改色只改 brand.json）
const brand = JSON.parse(readFileSync(path.join(ROOT, 'src/brand.json'), 'utf8'));
const w = brand.themes[brand.current].channels.wechat;
const slugArg = process.argv[2];
const writeOut = process.argv.includes('--out');

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error('没有 frontmatter');
  return yaml.load(m[1]);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* 语义内联标签 → 内联样式（wechat-article v6） */
function inline(t) {
  if (!t) return '';
  return String(t)
    .replace(/<mark>(.*?)<\/mark>/gs, '<span style="color:#7C3AED">$1</span>')
    .replace(/<strong>(.*?)<\/strong>/gs, '<span style="color:#7C3AED;font-weight:bold">$1</span>')
    .replace(/<small>(.*?)<\/small>/gs, '<span style="color:#8C8C8C">$1</span>')
    .replace(/<code>(.*?)<\/code>/gs, '<code style="background:#EDE9FE;color:#5B21B6;border-radius:3px;padding:1px 5px;font-size:13px;font-family:monospace">$1</code>')
    .replace(/<a href="([^"]*)"(?:[^>]*)>(.*?)<\/a>/gs, '<a href="$1" style="color:#7C3AED;text-decoration:underline">$2</a>');
}

/* 带标签要点行（头条/亮点卡共用）；last=true 时底部 margin 归零 */
function pointP(label, text, last) {
  return `<p style="font-size:15px;line-height:1.8;color:#333333;margin-bottom:${last ? '0' : '8px'}"><span style="color:#7C3AED">•</span> <span style="color:#7C3AED;font-weight:bold">${esc(label)}</span>：${inline(text)}</p>`;
}

/* 动态数据来源：扫描 blocks 的栏目分隔 + 机制雷达条目，提取当天覆盖的模块 */
function deriveSource(blocks) {
  const mods = new Set();
  for (const b of blocks) {
    if (b.type === 'divider' && b.kind === 'section') {
      const m = String(b.label || '').replace(/^[^\w]+/, '').split(/[（(]/)[0].trim().split(/\s+/)[0];
      if (m) mods.add(m);
    }
    if (b.type === 'toc' && Array.isArray(b.items)) {
      for (const it of b.items) {
        const m = String(it.label || '').match(/^(mm|sched|pci|rust|drm)\b/i);
        if (m) mods.add(m[1].toLowerCase());
      }
    }
  }
  return `数据来源：${[...mods].join(' / ')}（lore.kernel.org）· 北京时间`;
}

function renderBlock(b, fallbackSource = '') {
  switch (b.type) {
    case 'hook':
      return `<p style="background:#EDE9FE;border-left:3px solid #7C3AED;border-radius:4px;padding:14px 18px;font-size:14px;line-height:1.8;color:#333333;text-align:left;margin:0 0 24px">${inline(b.text)}</p>`;

    case 'divider':
      return b.kind !== 'section'
        ? `<p style="text-align:center;border-top:1px solid #7C3AED;border-bottom:1px solid #7C3AED;padding:10px 0;margin:32px 0 18px;font-size:18px;font-weight:bold;color:#7C3AED;letter-spacing:1px">${esc(b.label)}</p>`
        : `<p style="text-align:center;border-top:1px solid #E5E6EB;border-bottom:1px solid #E5E6EB;padding:8px 0;margin:32px 0 18px;font-size:16px;font-weight:bold;color:#333333">${esc(b.label)}</p>`;

    case 'toc': {
      const inner = b.items.map((it, i) =>
        `<p style="font-size:15px;line-height:1.8;color:#333333;margin-bottom:${i === b.items.length - 1 ? '0' : '8px'}"><span style="color:#7C3AED">•</span> <span style="color:#7C3AED;font-weight:bold">${esc(it.label)}</span>：${inline(it.text)}</p>`
      ).join('\n  ');
      return `<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-radius:8px;padding:14px 16px;margin:0 0 18px">\n  ${inner}\n</section>`;
    }

    case 'headline': {
      const hasTail = !!(b.verdict || b.link);
      const points = b.points.map((p, i) => pointP(p.label, p.text, i === b.points.length - 1 && !hasTail)).join('\n  ');
      const verdict = b.verdict
        ? `<p style="font-size:15px;line-height:1.8;color:#333333;margin:0 0 8px"><span style="color:#7C3AED;font-weight:bold">一句话点评</span>：${inline(b.verdict)}</p>`
        : '';
      const link = b.link
        ? `<p style="font-size:13px;color:#8C8C8C;margin:0">🔗 <a href="${esc(b.link)}" style="color:#7C3AED;text-decoration:underline">原文</a></p>`
        : '';
      return `<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-top:2px solid #7C3AED;border-radius:8px;padding:16px 18px;margin:0 0 20px">\n  <p style="text-align:center;font-size:16px;font-weight:bold;color:#333333;margin:0 0 4px">${esc(b.title)}</p>\n  <p style="text-align:center;font-size:13px;color:#8C8C8C;margin:0 0 10px">${esc(b.meta)}</p>\n  ${points}\n  ${verdict}\n  ${link}\n</section>`;
    }

    case 'highlight': {
      const hasTail = !!(b.relevance || b.link);
      const points = b.points.map((p, i) => pointP(p.label, p.text, i === b.points.length - 1 && !hasTail)).join('\n  ');
      const meta = b.meta ? `<p style="font-size:13px;color:#8C8C8C;margin:0 0 8px">${esc(b.meta)}</p>` : '';
      const relevance = b.relevance
        ? `<p style="font-size:13px;color:#8C8C8C;margin:2px 0 4px">和你相关：${inline(b.relevance)}</p>`
        : '';
      const link = b.link
        ? `<p style="font-size:13px;color:#8C8C8C;margin:0">🔗 <a href="${esc(b.link)}" style="color:#7C3AED;text-decoration:underline">原文</a></p>`
        : '';
      const lines = [
        `<p style="font-size:15px;font-weight:bold;color:#333333;margin:0 0 2px"><span style="color:#7C3AED">★</span> ${esc(b.title)}</p>`,
        ...(b.meta ? [meta] : []),
        points,
        ...(b.relevance ? [relevance] : []),
        ...(b.link ? [link] : []),
      ];
      return `<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-radius:8px;padding:14px 16px;margin:0 0 18px">\n  ${lines.join('\n  ')}\n</section>`;
    }

    case 'more': {
      const title = b.title ?? '更多动态';
      const items = b.items.map((it, i) => {
        const text = it.link
          ? `<a href="${esc(it.link)}" style="color:#7C3AED;text-decoration:underline">${inline(it.text)}</a>`
          : inline(it.text);
        const time = it.time ? `<span style="color:#8C8C8C">〔${esc(it.time)}〕</span>` : '';
        return `<p style="font-size:13px;color:#8C8C8C;line-height:1.7;margin-bottom:${i === b.items.length - 1 ? '0' : '4px'}"><span style="color:#8C8C8C">○</span> ${text}${time}</p>`;
      }).join('\n  ');
      return `<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-radius:8px;padding:14px 16px;margin:0 0 18px">\n  <p style="font-size:14px;font-weight:bold;color:#333333;margin:0 0 8px">${esc(title)}</p>\n  ${items}\n</section>`;
    }

    case 'paragraph':
      return `<p style="font-size:15px;line-height:1.8em;letter-spacing:0.02em;color:#333333;margin:0 0 12px">${inline(b.text)}</p>`;

    case 'quote':
      return `<blockquote style="background:#EDE9FE;border:1px solid #C4B5FD;border-left:3px solid #7C3AED;border-radius:4px;padding:12px 16px;font-size:14px;line-height:1.7;color:#333333;margin:16px 0">${inline(b.text)}</blockquote>`;

    case 'code':
      return `<pre style="background:#1F2430;border-radius:6px;padding:14px 16px;font-size:13px;line-height:1.7;color:#E6E6E6;overflow-x:auto;margin:16px 0"><code>${esc(b.text)}</code></pre>`;

    case 'image':
      return b.src
        ? `<p style="text-align:center;margin:12px 0"><img src="${esc(b.src)}" alt="${esc(b.alt)}" style="max-width:100%;border-radius:8px" /></p>`
        : `<p style="text-align:center;color:#8C8C8C;font-size:13px;margin:12px 0">[图：${esc(b.alt)}]</p>`;

    case 'closing': {
      const src = b.source || fallbackSource;
      return `<section style="background:#FFFFFF;border:1px solid #E5E6EB;border-top:2px solid #7C3AED;border-radius:8px;padding:16px 18px;margin:20px 0 0">\n  <p style="text-align:center;font-size:15px;line-height:1.8;color:#7C3AED;font-weight:600;margin:0 0 6px">${inline(b.tagline)}</p>\n  <p style="text-align:center;font-size:13px;color:#8C8C8C;line-height:1.7;margin:0">${inline(src)}</p>\n</section>`;
    }

    default:
      return `<p style="color:#DC2626;font-size:13px">⚠ 未知板块类型：${esc(b.type)}</p>`;
  }
}

/* ── 主流程 ── */
const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort();
if (!files.length) { console.error('没有文章'); process.exit(1); }
const target = slugArg
  ? files.find(f => f.startsWith(slugArg + '.') || f.startsWith(slugArg + '-') || f === slugArg + '.md')
  : files[files.length - 1];
if (!target) { console.error(`找不到 ${slugArg}`); process.exit(1); }

const data = parseFrontmatter(readFileSync(path.join(POSTS_DIR, target), 'utf8'));
const fallbackSource = deriveSource(data.blocks ?? []);
const body = (data.blocks ?? []).map(b => renderBlock(b, fallbackSource)).join('\n\n');

const html = `<!-- 公众号粘贴用 · ${data.title} -->
${body}
`;

// 默认渲染色 → 品牌配置色（brand.json wechat 渠道；改品牌色只改 brand.json，勿改下方映射 key）
const COLOR_MAP = {
  '#7C3AED': w.primary,
  '#5B21B6': w.primaryDark,
  '#EDE9FE': w.primaryBg,
  '#C4B5FD': w.primaryBorder,
  '#8C8C8C': w.textTertiary,
  '#333333': w.text,
  '#1F2430': w.codeBg,
  '#E6E6E6': w.codeText,
  '#E5E6EB': w.border,
  '#FFFFFF': w.bg,
};
let outHtml = html;
for (const [k, v] of Object.entries(COLOR_MAP)) outHtml = outHtml.split(k).join(v);

if (writeOut) {
  mkdirSync(path.join(ROOT, 'output'), { recursive: true });
  const out = path.join(ROOT, 'output', `公众号-${data.date}.html`);
  writeFileSync(out, outHtml);
  console.log(`✓ 已写入 ${out}`);
} else {
  process.stdout.write(outHtml);
}
