<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="utf-8" indent="yes"/>

<xsl:template match="/rss/channel">
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title><xsl:value-of select="title"/> · 订阅</title>
  <!-- 与主站一致的暗色阻塞脚本（防闪白） -->
  <script>(function(){var t=localStorage.getItem('kernel-blog-theme');if(t==='dark'||(t===null&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');})()</script>
  <link rel="stylesheet" href="assets/style.css"/>
  <!-- 仅 RSS 特有组件补充样式（其余全部复用主站 style.css） -->
  <style>
    .rss-guide{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:24px}
    .rss-guide h2{font-size:1.125rem;margin-bottom:8px;color:var(--brand)}
    .rss-guide p{font-size:.875rem;color:var(--text-secondary);margin-bottom:12px}
    .copy-row{display:flex;gap:10px}
    .rss-guide input{flex:1;min-width:0;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-md);font-family:var(--font-mono);font-size:14px;color:var(--text);background:var(--bg)}
    .copy-btn{padding:12px 22px;border:none;border-radius:var(--radius-md);background:var(--brand);color:#fff;font-weight:600;cursor:pointer;transition:transform .15s,background .15s}
    .copy-btn:hover{background:var(--brand-dark);transform:translateY(-1px)}
    .copy-btn.copied{background:#10B981}
    .hero .btn.copied{background:#10B981}
    @media(max-width:640px){.rss-guide{padding:16px}.copy-row{flex-direction:column}.rss-guide input{font-size:16px}.copy-btn{width:100%}}
  </style>
</head>
<body>

<div class="progress-bar"></div>
<canvas id="particles-canvas"></canvas>
<div class="cursor-glow"></div>

<nav class="nav">
  <div class="nav-inner">
    <a class="nav-brand" href="{link}"><em>Linux内核玩家</em> · 博客</a>
    <div class="nav-links">
      <a href="{link}">首页</a>
      <button class="theme-btn" id="theme-toggle" aria-label="切换暗色模式">🌙</button>
    </div>
    <button class="hamburger" aria-label="菜单"><span></span><span></span><span></span></button>
  </div>
</nav>

<header class="hero">
  <span class="term-deco">$ watch -n 10 kernel-patches</span>
  <div class="container hero-inner">
    <span class="hero-eyebrow reveal">KERNEL DAILY · 每日内核雷达</span>
    <h1 class="reveal"><xsl:value-of select="title"/></h1>
    <p class="subtitle reveal"><xsl:value-of select="description"/></p>
    <div class="hero-actions reveal">
      <button class="btn btn-primary" id="hero-sub">📡 点此订阅</button>
      <a class="btn btn-ghost" href="{link}">🏠 回主页</a>
    </div>
  </div>
</header>

<main class="container">
  <div class="rss-guide reveal">
    <h2>如何订阅</h2>
    <p>点「复制」或长按地址，粘贴到 RSS 阅读器（Feedly、Inoreader、Reeder、NetNewsWire 等），即可自动接收新文章。</p>
    <div class="copy-row">
      <input readonly="readonly" id="feed-url"/>
      <button class="copy-btn" id="copy-btn">复制</button>
    </div>
  </div>

  <div class="section-header reveal">
    <h2>最新文章</h2>
    <span class="mono">/ feed</span>
  </div>
  <div class="post-timeline">
    <xsl:for-each select="item">
    <div class="timeline-item reveal">
      <a class="timeline-card" href="{link}">
        <div class="timeline-meta"><span class="timeline-date"><xsl:value-of select="pubDate"/></span><span class="timeline-cat">每日内核日报</span></div>
        <h3><xsl:value-of select="title"/></h3>
        <p class="timeline-excerpt"><xsl:value-of select="description"/></p>
      </a>
    </div>
    </xsl:for-each>
  </div>
</main>

<footer class="site-footer">
  <div class="container">
    <div class="brand-line">内核是主业，玩家是态度</div>
    <p class="source">数据来源 lore.kernel.org · 北京时间</p>
    <div class="links"><a href="{link}">首页</a></div>
  </div>
</footer>

<button class="to-top" id="to-top" aria-label="回到顶部">↑</button>

<script>
  var url = window.location.href;
  var input = document.getElementById('feed-url');
  input.value = url;
  function copyFeed(btn){
    function done(){ btn.textContent='✓ 已复制'; btn.classList.add('copied'); setTimeout(function(){ btn.textContent=(btn.id==='hero-sub')?'📡 点此订阅':'复制'; btn.classList.remove('copied'); },1600); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done); }
    else { input.removeAttribute('readonly'); input.select(); try{document.execCommand('copy'); done();}catch(e){} input.setAttribute('readonly','readonly'); }
  }
  document.getElementById('copy-btn').onclick=function(){ copyFeed(this); };
  var hs=document.getElementById('hero-sub'); if(hs) hs.onclick=function(){ copyFeed(this); };
</script>
<script src="assets/app.js"></script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
