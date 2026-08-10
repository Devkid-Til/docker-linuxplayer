import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOCK_TYPES } from './components/article/blocks/types';
import { COLUMN_VALUES, COLUMN_TAG_MAP } from './column';

/* 板块 schema：type 用枚举校验（拼写错误构建即报），
   其余字段 passthrough 交给各组件做运行时读取——板块类型扩展不用改 schema。
   src（image 板块的图片地址）必须是绝对 http(s) URL：杜绝本地/相对路径残留进公众号产物 */
const block = z.object({
  type: z.enum(BLOCK_TYPES),
  src: z.string().url().optional(),
}).passthrough().superRefine((b, ctx) => {
  // 必填字段构建期校验，报「哪篇文章哪个板块」可读错误（避免运行时 TypeError 晦涩炸掉整次构建）
  const issue = (path: string, msg: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: msg });
  if ((b.type === 'headline' || b.type === 'highlight') && !Array.isArray(b.points)) issue('points', `「${b.type}」板块缺 points 数组`);
  if ((b.type === 'toc' || b.type === 'more') && !Array.isArray(b.items)) issue('items', `「${b.type}」板块缺 items 数组`);
  if (['hook', 'paragraph', 'quote', 'code'].includes(b.type) && typeof b.text !== 'string') issue('text', `「${b.type}」板块缺 text`);
  if (b.type === 'closing' && typeof b.tagline !== 'string') issue('tagline', '「closing」板块缺 tagline');
  if (b.type === 'image' && typeof b.alt !== 'string') issue('alt', '「image」板块缺 alt');
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date 必须为 YYYY-MM-DD 格式'),
    desc: z.string(),
    column: z.enum(COLUMN_VALUES).default('daily'),
    /* tags 用受控词表：必须是该 post 所在栏目的词表成员，构建即报错。
       词表定义见 src/column.ts（COLUMNS[i].tags）——日报=子系统域 / 周报=机制域 / 盘点=视角域 */
    tags: z.array(z.string()),
    /* english 栏目主维度（focus）：今日学习侧重，取学习维度词表（标题解析/术语卡/…）
       只对 english 必填并校验在词表内——文章有明确侧重，避免大杂烩 */
    focus: z.string().optional(),
    blocks: z.array(block).default([]),
  }).superRefine((data, ctx) => {
    const vocab = COLUMN_TAG_MAP[data.column];
    if (!vocab) return;
    for (const t of data.tags) {
      if (!vocab.has(t)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tags'],
          message: `标签「${t}」不在 ${data.column} 栏目受控词表内。可用：${[...vocab].join('、')}`,
        });
      }
    }
    // english 栏目强制 focus（主维度），且在词表内——侧重明确
    if (data.column === 'english') {
      if (typeof data.focus !== 'string' || data.focus.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['focus'], message: 'english 文章必须有 focus（今日主维度）' });
      } else if (!vocab.has(data.focus)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['focus'], message: `focus「${data.focus}」不在学习维度词表内。可用：${[...vocab].join('、')}` });
      } else if (!data.tags.includes(data.focus)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tags'], message: `focus「${data.focus}」必须包含在 tags 中（主维度必含于 tags，模板纸面规则强制化）` });
      }
    }
  }),
});

export const collections = { posts };
