<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="utf-8" indent="yes"/>

<xsl:template match="/rss/channel">
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title><xsl:value-of select="title"/> · RSS 订阅</title>
  <style><![CDATA[
    :root{--brand:#7C3AED;--brand-dark:#5B21B6;--bg:#F8F9FC;--card:#fff;--border:#E5E7EB;--text:#0F172A;--text2:#64748B;--text3:#94A3B8}
    html.dark{--bg:#0F0F14;--card:#1A1A23;--border:#2D2D3A;--text:#E5E7EB;--text2:#9CA3AF;--text3:#6B7280}
    body{max-width:720px;margin:0 auto;padding:40px 20px;font-family:-apple-system,"PingFang SC","Noto Sans SC",sans-serif;background:var(--bg);color:var(--text);line-height:1.7;transition:background .3s,color .3s}
    .brand{background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:#fff;border-radius:12px;padding:32px 28px;margin-bottom:28px;position:relative}
    .brand h1{margin:0 0 8px;font-size:26px}
    .brand p{margin:0;opacity:.82;font-size:14px}
    .theme-btn{position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center}
    .guide{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:20px 22px;margin-bottom:20px}
    .guide h2{font-size:16px;margin:0 0 10px;color:var(--brand)}
    .guide p{margin:0 0 10px;font-size:14px;color:var(--text2)}
    .guide input{width:100%;padding:14px 18px;border:1px solid var(--border);border-radius:8px;font-size:18px;font-family:monospace;color:var(--text);background:var(--bg)}
    .item{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:12px}
    .item h3{margin:0 0 6px;font-size:16px}
    .item h3 a{color:var(--text);text-decoration:none}
    .item h3 a:hover{color:var(--brand)}
    .item .date{font-size:12px;color:var(--text3);font-family:monospace}
    .item .desc{margin-top:6px;font-size:14px;color:var(--text2)}
    .back{display:inline-flex;align-items:center;gap:4px;color:var(--text3);font-size:14px;text-decoration:none;margin-bottom:20px}
    .back:hover{color:var(--brand)}
    @media(max-width:640px){
      body{padding:20px 14px}
      .brand{padding:24px 20px;margin-bottom:20px}
      .brand h1{font-size:20px}
      .brand p{font-size:13px}
      .guide{padding:16px 16px}
      .guide h2{font-size:15px}
      .guide input{font-size:16px;padding:12px 14px}
      .item{padding:14px 16px}
      .item h3{font-size:15px}
    }
  ]]></style>
</head>
<body>
  <div class="brand">
    <h1>📡 <xsl:value-of select="title"/></h1>
    <p><xsl:value-of select="description"/></p>
    <button class="theme-btn" onclick="toggleTheme()" aria-label="切换暗色模式">🌙</button>
  </div>

  <a class="back" href="javascript:history.back()">← 返回</a>

  <div class="guide">
    <h2>如何订阅</h2>
    <p>复制以下地址，粘贴到 RSS 阅读器（Feedly、Inoreader、Reeder、NetNewsWire 等），即可自动接收新文章。</p>
    <input readonly="readonly" onclick="this.select()" id="feed-url"/>
  </div>

  <xsl:for-each select="item">
  <div class="item">
    <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
    <span class="date"><xsl:value-of select="pubDate"/></span>
    <div class="desc"><xsl:value-of select="description"/></div>
  </div>
  </xsl:for-each>

  <script><![CDATA[
    var h=document.documentElement;
    var s=localStorage.getItem('kernel-blog-theme');
    if(s==='dark')h.classList.add('dark');
    function toggleTheme(){
      var d=!h.classList.contains('dark');
      if(d)h.classList.add('dark');else h.classList.remove('dark');
      localStorage.setItem('kernel-blog-theme',d?'dark':'light');
      document.querySelector('.theme-btn').textContent=d?'☀️':'🌙';
    }
    document.getElementById('feed-url').value=window.location.href;
  ]]></script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
