import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOCK_TYPES } from './components/article/blocks/types';

/* 板块 schema：type 用枚举校验（拼写错误构建即报），
   其余字段 passthrough 交给各组件做运行时读取——板块类型扩展不用改 schema */
const block = z.object({ type: z.enum(BLOCK_TYPES) }).passthrough();

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),          // YYYY-MM-DD
    desc: z.string(),
    tags: z.array(z.string()),
    blocks: z.array(block).default([]),
  }),
});

export const collections = { posts };
