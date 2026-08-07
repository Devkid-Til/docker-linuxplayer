#!/usr/bin/env node
/* 博客构建器：读 data/posts.json → 渲染首页 / 标签页 / RSS */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/posts.json'), 'utf8'));
const SITE = path.join(ROOT, 'site');
const BASE_URL = process.env.BLOG_URL || 'http://118.31.67.240';
const TPL = name => fs.readFileSync(path.join(ROOT, 'scripts', 'templates', name), 'utf8');

fs.mkdirSync(SITE, { recursive: true });
fs.mkdirSync(path.join(SITE, 'posts'), { recursive: true });
fs.mkdirSync(path.join(SITE, 'tags'), { recursive: true });

/* ── 标签统计 ── */
const tagCounts = {};
DATA.forEach(p => p.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
const allTags = Object.keys(tagCounts).sort();

/* ── 辅助：渲染一个文章卡片 ── */
function renderCard(p) {
  return `    <div class="timeline-item reveal" data-tags="${p.tags.join(',')}">
      <a class="timeline-card" href="posts/${p.slug}.html">
        <div class="timeline-meta"><span class="timeline-date">${p.date}</span><span class="timeline-cat">每日内核日报</span></div>
        <h3>${esc(p.title)}</h3>
        <p class="timeline-excerpt">${esc(p.desc)}</p>
        <div class="timeline-tags">${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </a>
    </div>`;
}
function renderTagBar(active) {
  const all = `<button class="filter-tag${active === 'all' ? ' active' : ''}" data-tag="all">全部 <span class="count">${DATA.length}</span></button>`;
  const tags = allTags.map(t => {
    const cls = active === t ? ' active' : '';
    return `<button class="filter-tag${cls}" data-tag="${esc(t)}">${esc(t)}<span class="count"> ${tagCounts[t]}</span></button>`;
  }).join('\n      ');
  return all + '\n      ' + tags;
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ── 首页 ── */
let html = TPL('page.html')
  .replace(/{{PATH}}/g, '.')
  .replace('{{TITLE}}', 'Linux内核玩家 · 博客')
  .replace('{{DESC}}', '每天 10 分钟，追踪 Linux 内核前沿动态')
  .replace('{{NAV_ACTIVE}}', ' class="active"')
  .replace('{{BODY}}', `
<header class="hero">
  <span class="term-deco">$ watch -n 5 kernel-patches</span>
  <div class="container hero-inner">
    <span class="hero-eyebrow reveal">KERNEL DAILY · 每日内核雷达</span>
    <h1 class="reveal">每天 <span>10 分钟</span>，追踪 Linux 内核前沿</h1>
    <p class="subtitle reveal">一份为内核开发者准备的每日简报</p>
    <div class="hero-actions reveal">
      <a class="btn btn-primary" href="feed.xml">📡 订阅 RSS</a>
      <a class="btn btn-ghost" href="/">📚 文章归档</a>
    </div>
  </div>
</header>

<section class="features">
  <div class="container">
    <div class="section-header reveal"><h2>这份日报覆盖什么</h2><span class="mono">/ coverage</span></div>
    <div class="features-grid">
      <div class="feature-card reveal"><span class="feature-icon">🧠</span><h3>内核架构</h3><p>内存管理、进程调度、文件系统、网络栈。不看驱动小修，只看影响架构层的机制级改动。</p></div>
      <div class="feature-card reveal"><span class="feature-icon">🔄</span><h3>跨域机制</h3><p>dma-buf、VMA、P2PDMA、Rust 内核化。子系统之间的桥接层——改动一处，影响全栈。</p></div>
      <div class="feature-card reveal"><span class="feature-icon">💡</span><h3>前沿动态</h3><p>新驱动框架、新硬件支持、virtio 虚拟化、安全机制。每天追踪 linux-media / dri-devel / linux-mm，一条链讲透。</p></div>
    </div>
  </div>
</section>

<main class="container">
  <div class="section-header reveal"><h2>每日日报</h2><span class="mono">/ daily</span></div>
  <div class="tag-filter reveal" id="tag-filter">${renderTagBar('all')}</div>
  <div class="post-timeline">
${DATA.map(renderCard).join('\n')}
  </div>
  <div class="about-card reveal">
    <div class="about-avatar">&gt;_</div>
    <div><h3>关于 Linux内核玩家</h3><p>每天 10 分钟，一起当内核玩家<span class="cursor">▌</span></p></div>
  </div>
</main>`);
fs.writeFileSync(path.join(SITE, 'index.html'), html);
console.log('✓ index.html');

/* ── 标签页 ── */
allTags.forEach(tag => {
  const filtered = DATA.filter(p => p.tags.includes(tag));
  let h = TPL('page.html')
    .replace(/{{PATH}}/g, '..')
    .replace('{{TITLE}}', tag + ' · Linux内核玩家')
    .replace('{{DESC}}', tag + ' 相关文章')
    .replace('{{NAV_ACTIVE}}', '')
    .replace('{{BODY}}', `
<main class="container" style="padding-top:40px">
  <a class="back-link" href="../index.html" style="font-size:.875rem;color:var(--text-tertiary);display:inline-flex;align-items:center;gap:4px;margin-bottom:24px">← 首页</a>
  <div class="section-header"><h2>标签：${esc(tag)}</h2><span class="mono">/ tags</span></div>
  <div class="tag-filter" id="tag-filter">${renderTagBar(tag)}</div>
  <div class="post-timeline">
${filtered.map(renderCard).join('\n')}
  </div>
</main>`);
  fs.writeFileSync(path.join(SITE, 'tags', tag.replace(/\s+/g, '-').replace(/\//g, '-') + '.html'), h);
});
console.log('✓ ' + allTags.length + ' tag pages');

/* ── RSS ── */
let items = DATA.map(p => `  <item>
    <title>${esc(p.title)}</title>
    <link>${BASE_URL}/posts/${p.slug}.html</link>
    <pubDate>${p.date}</pubDate>
    <description>${esc(p.desc)}</description>
  </item>`).join('\n');

let rss = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="assets/rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Linux内核玩家 · 博客</title>
  <link>${BASE_URL}/</link>
  <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>每天 10 分钟，追踪 Linux 内核前沿动态</description>
  <language>zh-CN</language>
${items}
</channel>
</rss>`;
fs.writeFileSync(path.join(SITE, 'feed.xml'), rss);
console.log('✓ feed.xml');
console.log('Build complete.');
