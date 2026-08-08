import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOCK_TYPES } from './components/article/blocks/types';
import { COLUMN_VALUES, COLUMN_TAG_MAP } from './column';

/* 板块 schema：type 用枚举校验（拼写错误构建即报），
   其余字段 passthrough 交给各组件做运行时读取——板块类型扩展不用改 schema */
const block = z.object({ type: z.enum(BLOCK_TYPES) }).passthrough();

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),          // YYYY-MM-DD
    desc: z.string(),
    column: z.enum(COLUMN_VALUES).default('daily'),
    /* tags 用受控词表：必须是该 post 所在栏目的词表成员，构建即报错。
       词表定义见 src/column.ts（COLUMNS[i].tags）——日报=子系统域 / 周报=机制域 / 盘点=视角域 */
    tags: z.array(z.string()),
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
  }),
});

export const collections = { posts };
