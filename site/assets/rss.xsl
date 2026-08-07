<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="utf-8" indent="yes"/>

<xsl:template match="/rss/channel">
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title><xsl:value-of select="title"/> · RSS 订阅</title>
  <style>
    body { max-width:720px; margin:0 auto; padding:40px 20px; font-family:-apple-system,"PingFang SC","Noto Sans SC",sans-serif; background:#F8F9FC; color:#0F172A; line-height:1.7; }
    .brand { background:linear-gradient(135deg,#7C3AED,#5B21B6); color:#fff; border-radius:12px; padding:32px 28px; margin-bottom:28px; }
    .brand h1 { margin:0 0 8px; font-size:26px; }
    .brand p { margin:0; opacity:.82; font-size:14px; }
    .guide { background:#fff; border:1px solid #E5E7EB; border-radius:10px; padding:20px 22px; margin-bottom:20px; }
    .guide h2 { font-size:16px; margin:0 0 10px; color:#7C3AED; }
    .guide p { margin:0 0 10px; font-size:14px; color:#64748B; }
    .guide input { width:100%; padding:10px 14px; border:1px solid #E5E7EB; border-radius:8px; font-size:14px; font-family:monospace; color:#333; background:#F8FAFC; }
    .item { background:#fff; border:1px solid #E5E7EB; border-radius:10px; padding:18px 20px; margin-bottom:12px; }
    .item h3 { margin:0 0 6px; font-size:16px; }
    .item h3 a { color:#0F172A; text-decoration:none; }
    .item h3 a:hover { color:#7C3AED; }
    .item .date { font-size:12px; color:#94A3B8; font-family:monospace; }
    .item .desc { margin-top:6px; font-size:14px; color:#64748B; }
  </style>
</head>
<body>
  <div class="brand">
    <h1>📡 <xsl:value-of select="title"/></h1>
    <p><xsl:value-of select="description"/></p>
  </div>

  <div class="guide">
    <h2>如何订阅</h2>
    <p>复制以下地址，粘贴到任意 RSS 阅读器（Feedly、Inoreader、Reeder、NetNewsWire 等），即可自动接收新文章。</p>
    <input readonly="readonly" onclick="this.select()" id="feed-url"/>
  </div>

  <xsl:for-each select="item">
  <div class="item">
    <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
    <span class="date"><xsl:value-of select="pubDate"/></span>
    <div class="desc"><xsl:value-of select="description"/></div>
  </div>
  </xsl:for-each>

  <script>
    document.getElementById('feed-url').value = window.location.href;
  </script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
