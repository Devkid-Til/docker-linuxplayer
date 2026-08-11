/* 板块类型定义 —— 博客组件与内容 schema 共用，避免两处漂移。
   内联强调语义：<mark>=主色强调 / <strong>=主色加粗 / <small>=次要灰 / <a>=外链 / <code>=行内代码 */

export const BLOCK_TYPES = [
  'hook', 'divider', 'toc', 'headline', 'highlight',
  'more', 'paragraph', 'quote', 'code', 'image', 'closing', 'exercise',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface PointItem { label: string; text: string; }
export interface TocItem { label: string; text: string; }
export interface MoreItem { text: string; time?: string; link?: string; }

export interface HookBlock { type: 'hook'; text: string; }
export interface DividerBlock { type: 'divider'; label: string; kind?: 'primary' | 'section'; mono?: string; }
export interface TocBlock { type: 'toc'; items: TocItem[]; }
export interface HeadlineBlock {
  type: 'headline';
  title: string;
  meta: string;
  points: PointItem[];
  verdict?: string;
  link?: string;
}
export interface HighlightBlock {
  type: 'highlight';
  title: string;
  meta?: string;
  points: PointItem[];
  relevance?: string;
  link?: string;
}
export interface MoreBlock { type: 'more'; title?: string; items: MoreItem[]; }
export interface ParagraphBlock { type: 'paragraph'; text: string; }
export interface QuoteBlock { type: 'quote'; text: string; }
export interface CodeBlock { type: 'code'; text: string; lang?: string; }
export interface ImageBlock { type: 'image'; alt: string; src?: string; }
export interface ClosingBlock { type: 'closing'; tagline: string; source: string; }
export interface ExerciseBlock {
  type: 'exercise';
  text: string;          // 题目（练习引导）
  answer: string;        // 答案（点击卡片展开显示，学习闭环）
  source?: string;       // 原文内容（英文原句，贴出供对照——不是链接，是原文本身）
  link?: string;         // 原文引用（lore 链接，可溯源）
}

export type Block =
  | HookBlock | DividerBlock | TocBlock | HeadlineBlock | HighlightBlock
  | MoreBlock | ParagraphBlock | QuoteBlock | CodeBlock | ImageBlock | ClosingBlock | ExerciseBlock;
