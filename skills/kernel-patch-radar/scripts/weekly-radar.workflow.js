// 每周雷达 workflow：只负责「搜索 + 结构化标注」阶段。后续流程见 SKILL.md 周报部分——
// 板块活跃度 stats → LWN → 三镜像反查 mid → 成文 → 网站直接发布 + 公众号标题+HTML 请示。
export const meta = {
  name: 'weekly-radar',
  description: '并行搜索全内核 13 板块近期重点补丁（media/DRM/mm/PCI/net/fs/virtio/Rust/LSM/block/arch/rt/lkml），供 kernel-patch-radar 每周雷达汇总',
  phases: [
    { title: 'Search', detail: '13 板块并行 WebSearch' },
  ],
}

// 全内核 13 板块雷达（与 radar.sh 13 列表 + 首页板块活跃度一致）+ 跨域 sched。
// 低频板块（virtio/rt/LSM/arch）搜不到重点时如实报「暂无重点」，靠板块活跃度数据兜底。
const TOPICS = [
  { key: 'media', label: '媒体/视频 linux-media',     q: 'linux-media v4l2 camera sensor subdev patches recent' },
  { key: 'drm',   label: '显示/DRM dri-devel',        q: 'dri-devel DRM bridge panel display patches recent' },
  { key: 'mm',    label: '内存管理 linux-mm',          q: 'linux-mm patches discussion recent week' },
  { key: 'pci',   label: 'PCIe linux-pci',            q: 'linux-pci subsystem patches discussion recent' },
  { key: 'net',   label: '网络 netdev',               q: 'netdev network driver patches discussion recent' },
  { key: 'fs',    label: '文件系统 linux-fsdevel',     q: 'linux-fsdevel filesystem patches recent' },
  { key: 'virtio',label: '虚拟化 virtio-dev',          q: 'virtio-dev patches recent' },
  { key: 'rust',  label: 'Rust rust-for-linux',       q: 'rust-for-linux patches discussion recent' },
  { key: 'lsm',   label: '安全 LSM linux-security-module', q: 'linux-security-module LSM patches recent' },
  { key: 'block', label: '块设备 linux-block',         q: 'linux-block block layer patches recent' },
  { key: 'arch',  label: '架构 linux-arch',           q: 'linux-arch patches discussion recent' },
  { key: 'rt',    label: '实时调度 linux-rt-devel',    q: 'linux-rt-devel RT scheduling patches recent' },
  { key: 'lkml',  label: '全内核广播 lkml',            q: 'linux-kernel mailing list notable patches discussion recent week' },
]

phase('Search')
const results = await parallel(TOPICS.map(t => () =>
  agent(
    `用 WebSearch 搜索最近一周 Linux 内核「${t.label}」子系统邮件列表的重点补丁和讨论（关键词：${t.q}）。` +
    `返回结构化摘要：最近 3-5 个重点补丁/讨论，每个给出：` +
    `① 标题、② 所属子层（按内核架构层次定位：mm 用回收层/映射层/分配层，sched 用调度类/负载均衡/触发，pci 用总线层/资源层/数据路径）、` +
    `③ 性质标注（机制=新框架/API 变更/重构，否则标注行为/修复/讨论）、④ 为什么值得注意（机制级优先展开）、` +
    `⑤ 来源链接 + **若为邮件列表帖子尽量提取 Message-Id（mid，形如 20260807.123456.xxx@domain，供本地三镜像反查合入/排队/回移植状态）**。` +
    `只报真实搜到的内容，搜不到就明确说该方向暂无重点。全程用中文输出。`,
    { label: t.label, phase: 'Search' }
  )
))

const out = {}
TOPICS.forEach((t, i) => { out[t.key] = results[i] || null })
return out
