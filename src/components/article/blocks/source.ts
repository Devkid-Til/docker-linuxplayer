/* 动态数据来源：扫描 blocks 的栏目分隔 + 机制雷达条目，提取当天覆盖的内核模块 */
export function deriveSource(blocks: unknown[]): string {
  const mods = new Set<string>();
  for (const b of blocks as { type?: string; kind?: string; label?: string; items?: { label?: string }[] }[]) {
    // 📰 栏目分隔 → 模块名（如 "📰 linux-media（视频/相机）" → linux-media）
    if (b.type === 'divider' && b.kind === 'section') {
      const m = String(b.label || '').replace(/^[^\w]+/, '').split(/[（(]/)[0].trim();
      if (m) mods.add(m);
    }
    // 机制雷达 toc 条目的子系统前缀（mm/sched/pci/rust/drm）
    if (b.type === 'toc' && Array.isArray(b.items)) {
      for (const it of b.items) {
        const m = String(it.label || '').match(/^(mm|sched|pci|rust|drm)\b/i);
        if (m) mods.add(m[1].toLowerCase());
      }
    }
  }
  return `数据来源：${[...mods].join(' / ')}（lore.kernel.org）· 北京时间`;
}
