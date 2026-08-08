export const meta = {
  name: 'weekly-radar',
  description: '并行搜索 linux-mm / linux-sched / linux-pci 近期重点补丁，供 kernel-patch-radar 每周雷达汇总',
  phases: [
    { title: 'Search', detail: '3 个子系统并行 WebSearch' },
  ],
}

const TOPICS = [
  { key: 'mm',    label: '内存管理 linux-mm',    q: 'linux-mm mailing list recent patches discussion' },
  { key: 'sched', label: '进程调度 linux-sched', q: 'linux-sched kernel scheduler recent patches discussion' },
  { key: 'pci',   label: 'PCIe linux-pci',       q: 'linux-pci subsystem recent patches discussion' },
]

phase('Search')
const results = await parallel(TOPICS.map(t => () =>
  agent(
    `用 WebSearch 搜索最近一周 Linux 内核「${t.label}」子系统邮件列表的重点补丁和讨论（关键词：${t.q}）。` +
    `返回结构化摘要：最近 3-5 个重点补丁/讨论，每个给出：标题、所属子层（mm 用回收层/映射层/分配层，sched 用调度类/负载均衡/触发，pci 用总线层/资源层/数据路径）、为什么值得注意（机制级改动——新框架/API 变更/重构——优先并标注"机制"）。` +
    `只报真实搜到的内容，搜不到就明确说该方向暂无重点。全程用中文输出。`,
    { label: t.label, phase: 'Search' }
  )
))

const out = {}
TOPICS.forEach((t, i) => { out[t.key] = results[i] || null })
return out
