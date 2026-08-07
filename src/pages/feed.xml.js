import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const slugOf = p => String(p.id).split('/').pop().replace(/\.md$/, '');
  const posts = (await getCollection('posts')).sort((a, b) => b.data.date.localeCompare(a.data.date));
  return rss({
    title: 'Linux 内核玩家 · 博客',
    description: '每天 10 分钟，追踪 Linux 内核前沿动态',
    site: context.site,
    items: posts.map(p => ({
      title: p.data.title,
      pubDate: new Date(p.data.date),
      description: p.data.desc,
      link: `/posts/${slugOf(p)}/`,
    })),
  });
}
