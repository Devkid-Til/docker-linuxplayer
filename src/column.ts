/* 栏目元数据 —— 主页过滤栏、PostCard 徽标、content.config.ts enum 的单一数据源 */
export type ColumnValue = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'english' | 'journal';

export interface ColumnMeta {
  value: ColumnValue;
  label: string;      // 短标签（过滤栏 + 卡片徽标）
  emoji: string;
  fullLabel: string;  // 全称（文章页 hero eyebrow 用）
  tags: string[];     // 本栏目受控词表（内容分类唯一允许的标签集合）
}

/* 每档栏目的受控词表：栏目内容结构不同 → 标签域不同。
   日报是全内核雷达，词表 = 内核社区板块（13 个）：11 个 lore 源列表 + 跨域板块 sched / driver-core。
   板块名用社区习惯的短名（media、DRM、mm、net…），即内容里 section 用的名字——社区怎么叫就怎么标；
   周报是 mm/sched/pci 雷达 → 词表 = 机制域；月/季/年报是盘点 → 词表 = 盘点视角。 */
export const COLUMNS: ColumnMeta[] = [
  {
    value: 'daily', label: '日报', emoji: '📅', fullLabel: '每日内核日报',
    tags: ['media', 'DRM', 'mm', 'PCI', 'net', 'fs', 'virtio', 'Rust', 'LSM', 'block', 'arch', 'sched', 'driver-core'],
  },
  {
    value: 'weekly', label: '周报', emoji: '📊', fullLabel: '每周雷达',
    tags: ['内存管理', '进程调度', 'PCI/总线', '架构动向', '版本/发布', '社区/生态'],
  },
  {
    value: 'monthly', label: '月报', emoji: '📈', fullLabel: '月报',
    tags: ['月度盘点', '趋势观察', '数据指标'],
  },
  {
    value: 'quarterly', label: '季报', emoji: '🎯', fullLabel: '季报',
    tags: ['季度盘点', '趋势观察', '里程碑'],
  },
  {
    value: 'yearly', label: '年报', emoji: '📚', fullLabel: '年报',
    tags: ['年度盘点', '生态回顾', '里程碑'],
  },
  /* 内核英语：独立栏目（不是日报周边）——用内核资料学英语。
     词表 = 学习维度（全方面：阅读+口语+写作），文章按「学什么」标记 */
  {
    value: 'english', label: '内核英语', emoji: '📖', fullLabel: '内核英语',
    tags: ['标题解析', '术语卡', '地道表达', '阅读', '写作', '口语'],
  },
  /* 站长手记：独立栏目——笔记/感谢/随想，低频不定期（贵在真实不日更） */
  {
    value: 'journal', label: '站长手记', emoji: '📔', fullLabel: '站长手记',
    tags: ['笔记', '感谢', '随想'],
  },
];

export const COLUMN_MAP: Record<string, ColumnMeta> = Object.fromEntries(
  COLUMNS.map(c => [c.value, c])
);

export const COLUMN_VALUES = COLUMNS.map(c => c.value) as [ColumnValue, ...ColumnValue[]];

/* 栏目 → 词表（Set）映射，供 content.config.ts 校验、主页 tag 栏计算 */
export const COLUMN_TAG_MAP: Record<string, Set<string>> = Object.fromEntries(
  COLUMNS.map(c => [c.value, new Set(c.tags)])
);

/* 伪栏目 —— 只在过滤栏 UI 里用，不是真实 post column 值 */
export const ALL_COLUMN = { value: 'all' as const, label: '全部', emoji: '' };
