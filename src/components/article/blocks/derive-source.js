/* 动态数据来源：扫描 blocks 的栏目分隔 + 机制雷达条目，提取当天覆盖的内核模块。
   唯一实现源——博客端（source.ts 薄封装带类型）与公众号端（scripts/render-wechat.mjs）
   都 import 本文件，杜绝双份手抄漂移（M6）。 */
export function deriveSource(blocks) {
  const mods = new Set();
  for (const b of blocks) {
    // 📰 栏目分隔 → 模块名（如 "📰 linux-media（视频/相机）" → linux-media；"📰 mm / 内存" → mm）
    if (b.type === 'divider' && b.kind === 'section') {
      const m = String(b.label || '').replace(/^[^\w]+/, '').split(/[（(]/)[0].trim().split(/\s+/)[0];
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
