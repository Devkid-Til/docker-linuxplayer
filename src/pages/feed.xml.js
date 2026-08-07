import { getCollection } from 'astro:content';

// 手写 RSS（带 XSL 美化订阅页指令，@astrojs/rss 不支持插 stylesheet）
export async function GET(context) {
  const slugOf = p => String(p.id).split('/').pop().replace(/\.md$/, '');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const rfc822 = date => {
    const [y, m, d] = date.split('-').map(Number);
    return `${WD[new Date(y, m - 1, d).getDay()]}, ${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y} 00:00:00 GMT`;
  };
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const posts = (await getCollection('posts')).sort((a, b) => b.data.date.localeCompare(a.data.date));
  const base = String(context.site).replace(/\/+$/, '');

  const items = posts.map(p => `  <item>
    <title>${esc(p.data.title)}</title>
    <link>${base}/posts/${slugOf(p)}/</link>
    <pubDate>${rfc822(p.data.date)}</pubDate>
    <description>${esc(p.data.desc)}</description>
  </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Linux 内核玩家 · 博客</title>
  <link>${base}/</link>
  <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>每天 10 分钟，追踪 Linux 内核前沿动态</description>
  <language>zh-CN</language>
${items}
</channel>
</rss>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
