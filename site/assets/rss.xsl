<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="utf-8" indent="yes"/>

<xsl:template match="/rss/channel">
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title><xsl:value-of select="title"/> · 订阅</title>
  <style><![CDATA[
    :root{--brand:#7C3AED;--brand-dark:#5B21B6;--brand-bg:#F5F3FF;--brand-border:#DDD6FE;--bg:#FFFFFF;--card:#FFFFFF;--border:#E5E7EB;--border-light:#F3F4F6;--text:#0F172A;--text2:#64748B;--text3:#94A3B8;--font:-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif;--mono:"JetBrains Mono","SF Mono","Fira Code",Consolas,monospace;--radius:10px;--nav-h:56px}
    html.dark{--bg:#09090D;--card:#16161F;--border:#2A2A38;--border-light:#1E1E2C;--text:#E5E7EB;--text2:#9CA3AF;--text3:#6B7280;--brand-bg:#1F1833;--brand-border:#3B2E58}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.75;transition:background .3s,color .3s;-webkit-font-smoothing:antialiased}
    .container{max-width:920px;margin:0 auto;padding:0 24px}
    a{color:var(--brand);text-decoration:none}
    ::selection{background:var(--brand);color:#fff}

    /* 导航（与主站一致） */
    .nav{position:sticky;top:0;z-index:900;height:var(--nav-h);background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(14px);-webkit-backdrop-filter:saturate(180%) blur(14px);border-bottom:1px solid var(--border-light)}
    .nav-inner{height:var(--nav-h);display:flex;align-items:center;justify-content:space-between;max-width:920px;margin:0 auto;padding:0 24px}
    .brand{font-weight:800;color:var(--text)}
    .brand em{font-style:normal;color:var(--brand)}
    .nav-links{display:flex;align-items:center;gap:12px}
    .nav-links a{font-size:14px;color:var(--text2);padding:6px 12px;border-radius:6px;transition:.15s}
    .nav-links a:hover{color:var(--brand);background:var(--brand-bg)}
    .nav-links a.active{color:var(--brand);background:var(--brand-bg)}
    .theme-btn{background:none;border:1px solid var(--border);width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:.15s;color:var(--text2)}
    .theme-btn:hover{border-color:var(--brand);background:var(--brand-bg)}

    /* 品牌 Hero（紫色渐变，与主站 hero 一致） */
    .hero{padding:48px 0 40px;text-align:center;background:linear-gradient(170deg,#F5F3FF 0%,#FFFFFF 30%,#F8FAFC 70%,#F0F4FF 100%);border-bottom:1px solid var(--border-light);margin-bottom:28px}
    html.dark .hero{background:linear-gradient(170deg,#1A1430 0%,#09090D 40%,#0D0D18 70%,#121023 100%)}
    .hero-eyebrow{display:inline-block;font-family:var(--mono);font-size:12px;letter-spacing:.1em;color:var(--brand);background:var(--brand-bg);padding:5px 16px;border-radius:20px;margin-bottom:16px}
    .hero h1{font-size:26px;margin-bottom:8px;letter-spacing:-.01em}
    .hero p{color:var(--text2);font-size:15px;max-width:480px;margin:0 auto}

    /* 订阅引导 */
    .guide{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px;margin-bottom:22px}
    .guide h2{font-size:16px;margin:0 0 10px;color:var(--brand)}
    .guide p{margin:0 0 12px;font-size:14px;color:var(--text2)}
    .guide .copy-row{display:flex;gap:10px}
    .guide input{flex:1;width:100%;padding:13px 16px;border:1px solid var(--border);border-radius:8px;font-size:16px;font-family:var(--mono);color:var(--text);background:var(--bg);min-width:0}
    .copy-btn{flex-shrink:0;padding:13px 20px;border:none;border-radius:8px;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}
    .copy-btn:hover{background:var(--brand-dark)}
    .copy-btn.copied{background:#10B981}

    /* 文章卡片（与主站时间线一致） */
    .item{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px 22px;margin-bottom:12px;transition:border-color .2s,box-shadow .2s,transform .2s}
    .item:hover{border-color:var(--brand-border);box-shadow:0 4px 16px rgba(0,0,0,.06);transform:translateY(-2px)}
    .item-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .item-date{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--brand);background:var(--brand-bg);padding:3px 10px;border-radius:10px}
    .item h3{font-size:16px;margin-bottom:6px}
    .item h3 a{color:var(--text)}
    .item h3 a:hover{color:var(--brand)}
    .item .desc{font-size:14px;color:var(--text2)}

    /* 页脚 */
    .footer{border-top:1px solid var(--border);margin-top:36px;padding:28px 0;text-align:center}
    .footer .line{font-family:var(--mono);font-size:14px;font-weight:700;color:var(--brand);margin-bottom:6px}
    .footer .src{font-size:13px;color:var(--text3)}

    /* 响应式 */
    @media(max-width:640px){:root{--nav-h:48px}.container{padding:0 16px}.nav-inner{padding:0 16px}.hero{padding:32px 0 28px}.hero h1{font-size:21px}.hero p{font-size:13px}.guide{padding:16px}.guide input{font-size:16px}.item{padding:16px}.item h3{font-size:15px}}
  ]]></style>
</head>
<body>

  <nav class="nav">
    <div class="nav-inner">
      <span class="brand">Linux<em>内核玩家</em> · 订阅</span>
      <div class="nav-links">
        <a href="{link}" class="active">首页</a>
        <button class="theme-btn" id="theme-btn" aria-label="切换暗色模式">🌙</button>
      </div>
    </div>
  </nav>

  <div class="hero">
    <div class="container">
      <span class="hero-eyebrow">KERNEL DAILY · 每日内核雷达</span>
      <h1>📡 <xsl:value-of select="title"/></h1>
      <p><xsl:value-of select="description"/></p>
    </div>
  </div>

  <main class="container">
    <div class="guide">
      <h2>如何订阅</h2>
      <p>点「复制」或长按地址，粘贴到 RSS 阅读器（Feedly、Inoreader、Reeder、NetNewsWire 等），即可自动接收新文章。</p>
      <div class="copy-row">
        <input readonly="readonly" id="feed-url"/>
        <button class="copy-btn" id="copy-btn">复制</button>
      </div>
    </div>

    <xsl:for-each select="item">
    <div class="item">
      <div class="item-meta"><span class="item-date"><xsl:value-of select="pubDate"/></span></div>
      <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
      <div class="desc"><xsl:value-of select="description"/></div>
    </div>
    </xsl:for-each>
  </main>

  <footer class="footer">
    <div class="container">
      <div class="line">内核是主业，玩家是态度</div>
      <div class="src">数据来源 lore.kernel.org · 北京时间</div>
    </div>
  </footer>

  <script><![CDATA[
    var h=document.documentElement;
    var s=localStorage.getItem('kernel-blog-theme');
    if(s==='dark'||(s===null&&matchMedia('(prefers-color-scheme:dark)').matches))h.classList.add('dark');
    var b=document.getElementById('theme-btn');
    function icon(){b.textContent=h.classList.contains('dark')?'☀️':'🌙';}
    icon();
    b.onclick=function(){
      var d=!h.classList.contains('dark');
      if(d)h.classList.add('dark');else h.classList.remove('dark');
      localStorage.setItem('kernel-blog-theme',d?'dark':'light');icon();
    };
    var url=window.location.href;
    var input=document.getElementById('feed-url');
    input.value=url;
    var btn=document.getElementById('copy-btn');
    btn.onclick=function(){
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(function(){btn.textContent='✓ 已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},1600);});
      }else{
        input.removeAttribute('readonly');input.select();
        try{document.execCommand('copy');btn.textContent='✓ 已复制';btn.classList.add('copied');setTimeout(function(){btn.textContent='复制';btn.classList.remove('copied');},1600);}catch(e){}
        input.setAttribute('readonly','readonly');
      }
    };
  ]]></script>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
