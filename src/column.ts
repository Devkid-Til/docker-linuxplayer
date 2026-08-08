/* 栏目元数据 —— 主页过滤栏、PostCard 徽标、content.config.ts enum 的单一数据源 */
export type ColumnValue = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface ColumnMeta {
  value: ColumnValue;
  label: string;      // 短标签（过滤栏 + 卡片徽标）
  emoji: string;
  fullLabel: string;  // 全称（文章页 hero eyebrow 用）
}

export const COLUMNS: ColumnMeta[] = [
  { value: 'daily',     label: '每日', emoji: '📅', fullLabel: '每日内核日报' },
  { value: 'weekly',    label: '每周', emoji: '📊', fullLabel: '每周雷达' },
  { value: 'monthly',   label: '每月', emoji: '📈', fullLabel: '月报' },
  { value: 'quarterly', label: '每季', emoji: '🎯', fullLabel: '季报' },
  { value: 'yearly',    label: '每年', emoji: '📚', fullLabel: '年报' },
];

export const COLUMN_MAP: Record<string, ColumnMeta> = Object.fromEntries(
  COLUMNS.map(c => [c.value, c])
);

export const COLUMN_VALUES = COLUMNS.map(c => c.value) as [ColumnValue, ...ColumnValue[]];

/* 伪栏目 —— 只在过滤栏 UI 里用，不是真实 post column 值 */
export const ALL_COLUMN = { value: 'all' as const, label: '全部', emoji: '' };
