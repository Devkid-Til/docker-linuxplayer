---
title: "ext4 缓冲 I/O 换装 iomap，BPF 元数据住进 skb 扩展"
date: "2026-08-15"
desc: "ext4 缓冲 I/O 32 篇换装 iomap（1MB 写 +35%）；Cloudflare 给 BPF 元数据在 skb 扩展安家；DRM YUV 色彩管线补上最大缺口。"
column: "daily"
tags: ["fs", "DRM", "net", "mm", "block", "media", "virtio", "sched"]
blocks:
  - type: hook
    text: >-
      今天 Linux 内核圈，值得花 3 分钟看三件事：<strong>ext4 缓冲 I/O 全面换装 iomap</strong>、<strong>BPF 元数据住进 skb 扩展</strong>，和 <strong>DRM 的 YUV 色彩转换节点就绪</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-15/cover.png"
    alt: "封面 · 8月15日 · ext4 缓冲 I/O 换装 iomap"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "ext4 缓冲 I/O 32 篇换装 iomap，1MB 块写提升 35%"
      - label: "头条"
        text: "Cloudflare 把 BPF 元数据搬进 skb 扩展，过隧道不掉件"
      - label: "DRM"
        text: "YUV→RGB 转换 colorop 上线，色彩管线补上最大缺口"
      - label: "机制"
        text: "fs-verity 落 XFS、面板桥遍及全面板、Tegra VPR 开 dma-buf 门"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "ext4 缓冲 I/O 全面换装 iomap：32 篇拿下最后一块 buffer_head 阵地"
    meta: "〔08-14 17:39 北京〕· [PATCH -next v5 00/32] ext4: use iomap for regular file's buffered I/O path"
    link: "https://lore.kernel.org/linux-fsdevel/<20260814093331.1703882-1-yi.zhang@huaweicloud.com>/"
    points:
      - label: "现状"
        text: "文件系统读写有两条技术路线：老式 buffer_head（块缓冲）与新式 iomap（映射框架）。xfs / btrfs 已全面 iomap，ext4 的直写（direct I/O）也已迁完，但走 page cache 的常规 buffered I/O 还留在 buffer_head + 传统写回路径上——这是 ext4 剩下的最后一块旧阵地。"
      - label: "痛点"
        text: "buffer_head 路径大量 open-coded 的「建映射→改块」逻辑，代码重复、行为与新栈不一致，也拖住了整个文件系统往现代 I/O 栈迁移的步伐。"
      - label: "方案"
        text: "32 篇 v5：把 ext4 buffered 读 / 写 / 写回 / mmap / 部分清零全部迁到 iomap；扩展 ext4_map_blocks() 支持灵活的日志 handle 管理。data=ordered 模式与 iomap 的锁序冲突，改为按 inode 走 iomap 路径 + append 写一律分配 unwritten extent + 新增 DISKSIZE_GROW_PENDING 位延迟 i_disksize 更新，末尾留一个挂载选项开关。已 rebase 到 next-20260810，Ojaswin / Jan 已 Reviewed-by。"
      - label: "为什么"
        text: "data=ordered 的「folio 锁→事务锁」顺序与 iomap 路径相反，硬迁会死锁；所以按 inode 切换，并用 unwritten extent 保证崩溃安全。在线 defrag 暂不支持，留给未来。"
      - label: "效益"
        text: "FIO 实测 1MB 块写 +35%、64k +9%；写回按写回长度而非逐 folio 分配，减少过度分配；ext4 与现代 I/O 栈彻底对齐。"
      - label: "下一步"
        text: "挂载开关默认 off 先跑，xfstests -g auto / fast_commit / 64k 无新增失败（除已知 generic/127）；后续逐步默认开启并移除 dioread_nolock 旧开关。"
    verdict: "十年老栈换新轨——全宇宙用得最多的文件系统，把 buffered I/O 的最后一块 buffer_head 阵地交出去了"
  - type: headline
    title: "Cloudflare 给 BPF 元数据在 skb 扩展里安了个家：14 篇过隧道不掉件"
    meta: "〔08-14 16:14 北京〕· [PATCH net-next 00/14] skb extension for BPF metadata"
    link: "https://lore.kernel.org/netdev/<20260814-bpf-meta-inside-skb-ext-v1-0-767edd862656@cloudflare.com>/"
    points:
      - label: "现状"
        text: "网络包 skb 上有个「扩展槽」机制（skb_ext），按需动态分配，跨隧道 / 命名空间拷贝也能存活，TCP 等早已在用。"
      - label: "痛点"
        text: "BPF 程序想给包挂元数据（出口标记、转发提示等），一直缺一个标准化、能跨隧道 / 命名空间存活的载体——常用 skb->cb 只有 48 字节且各层抢用。"
      - label: "方案"
        text: "14 篇：新增 SKB_EXT_BPF 扩展类型 + bpf_dynptr_from_skb_ext 让 BPF 程序读写元数据；新增 skb_ext_scrub() 让 BPF 扩展在包 scrubbing（过隧道清状态）后存活；并开放 bpf_sock_ops 到 skb 的访问，覆盖 cgroup_skb / sk_filter / sock_ops / LSM / kfree_skb / netfilter / LWT / seg6local 等大量 hook。"
      - label: "为什么"
        text: "选 skb_ext 而非 skb->cb，是因为它按需分配、克隆与路由切换时语义一致；scrub 时保留 BPF 扩展而非全清，是让元数据真正「跟包走」的关键取舍。"
      - label: "效益"
        text: "Cloudflare 实测：若采纳，出口元数据可挂在约 0.7% 的在飞 skb（全用例约 5%），开销可接受；BPF 生态获得统一的可观测 / 转发元数据通道。"
      - label: "下一步"
        text: "随附大量 selftests（veth / GRE / 克隆 / 各 hook），等 net 维护者 review 合入。"
    verdict: "BPF 元数据终于有了官方行李架——skb_ext 扩容，过隧道不再掉件"
  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-15/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h"
  - type: paragraph
    text: >-
      近 24h 各板块热度（13 列表统一 T24 计数）：lkml 1200 · net 407 · DRM 349 · mm 158 · fs 149 · PCI 142 领跑；rt / LSM / virtio 低频，留待月 / 季报盘点。
  - type: divider
    label: "📰 fs"
    kind: section
  - type: highlight
    title: "fs-verity 落定 XFS：Merkle 树放进 post-EOF 空间（v15，25 篇）"
    meta: "〔08-14 17:25 北京〕· fs · PATCH v15 00/25"
    link: "https://lore.kernel.org/linux-fsdevel/<20260814092448.1818082-1-aalbersh@kernel.org>/"
    points:
      - label: "定位"
        text: "XFS + fs-verity（文件完整性校验）缺口：XFS 是主流大文件系统里最后一个还没原生 fs-verity 的。"
      - label: "做法"
        text: "25 篇 v15：Merkle 树块放进 post-EOF 空间（文件末尾之后的空洞），免改 on-disk 布局、兼容老文件系统；本版收尾启用 ro-compat fs-verity 标志，Darrick / Christoph 已 review。"
      - label: "效益"
        text: "XFS 用户获得内核原生逐文件完整性校验，安全启动 / 容器镜像 / 合规场景受益。"
    relevance: "跑 XFS 且有完整性 / 安全需求的同学可以关注。"
  - type: highlight
    title: "quota 项目配额想「严格强制」：RFC 探硬上限"
    meta: "〔08-14 19:46 北京〕· fs · RFC PATCH 0/2"
    link: "https://lore.kernel.org/linux-fsdevel/<20260814114649.51253-1-kitaeyoo777@gmail.com>/"
    points:
      - label: "定位"
        text: "fs/quota 层：项目配额（project quota）的硬限制目前只软性提示，不强制执行。"
      - label: "做法"
        text: "RFC 2 篇：加 opt-in 开关，超限时严格拒绝写入。"
      - label: "效益"
        text: "多租户 / 容量治理场景有了真正的硬边界。"
    relevance: "用项目配额做资源治理的同学可参与讨论。"
  - type: divider
    label: "📰 DRM"
    kind: section
  - type: highlight
    title: "DRM 色彩管线补上最大缺口：YUV→RGB 转换 colorop"
    meta: "〔08-15 05:18 北京〕· DRM · PATCH v6 00/10"
    link: "https://lore.kernel.org/dri-devel/<20260814211816.1219597-1-harry.wentland@amd.com>/"
    points:
      - label: "定位"
        text: "DRM 平面色彩管线（color pipeline）框架层：当年合并 drm_plane color pipeline API 时，最大缺口就是缺 YUV→RGB 转换节点。"
      - label: "做法"
        text: "10 篇 v6：在 Chaitanya 的 Fixed Matrix colorop 基础上，补齐 YCbCr→RGB 的 limited range 变体；旧的 COLOR_RANGE / COLOR_ENCODING 属性已弃用，此前 YCbCr 编码的帧缓冲无法配 COLOR_PIPELINE，这次打通。"
      - label: "效益"
        text: "amdgpu + VKMS 双落地，IGT + Weston + KWin 均有实现，色彩管线终于能处理视频 / 照片类 YCbCr 内容。"
    relevance: "关心 HDR / 色彩管理 / Wayland 合成的同学可跟进。"
  - type: highlight
    title: "给每个面板自动配一块 panel_bridge（11 篇）"
    meta: "〔08-14 22:06 北京〕· DRM · PATCH 00/11"
    link: "https://lore.kernel.org/dri-devel/<20260814-drm-bridge-every-panel-v1-0-19cd5277cc8d@bootlin.com>/"
    points:
      - label: "定位"
        text: "DRM/bridge 层：面板与显示链路之间的桥接（panel_bridge）此前要驱动自己创建，行为不一。"
      - label: "做法"
        text: "11 篇：让每个 panel 驱动都统一通过 helper 拿到 panel_bridge，接入标准 bridge 框架。"
      - label: "效益"
        text: "面板接入逻辑统一，为后续 connector / bridge 重构铺路。"
    relevance: "做显示 / 面板驱动开发的同学可关注这波统一。"
  - type: highlight
    title: "vblank 支持「要么全有，要么全无」"
    meta: "〔08-15 04:36 北京〕· DRM · PATCH 0/5"
    link: "https://lore.kernel.org/dri-devel/<20260814203542.1405135-1-lyude@redhat.com>/"
    points:
      - label: "定位"
        text: "DRM/KMS 核心：drm_vblank 的可选支持让各驱动「部分实现」，行为碎片化。"
      - label: "做法"
        text: "5 篇：强制所有 CRTC 要么都实现 vblank 要么都关，VKMS 等驱动随之修正初始化顺序。"
      - label: "效益"
        text: "核心逻辑简化，vblank 相关 bug 面收窄。"
    relevance: "关注 KMS 核心行为的同学可留意。"
  - type: divider
    label: "📰 net"
    kind: section
  - type: highlight
    title: "inetpeer 哈希随机化：用 SipHash 挡碰撞攻击"
    meta: "〔08-14 14:06 北京〕· net · PATCH v2"
    link: "https://lore.kernel.org/netdev/<20260814060616.2164504-1-edumazet@google.com>/"
    points:
      - label: "定位"
        text: "net/ipv4 inetpeer 缓存层：节点比较键此前可预测，攻击者可构造哈希碰撞 / 时序侧信道。"
      - label: "做法"
        text: "Eric Dumazet 用 SipHash 随机化 RB-tree 节点比较，网络命名空间启动时取随机种子。"
      - label: "效益"
        text: "防碰撞攻击与信息泄露，延续内核哈希表随机化浪潮。"
    relevance: "关注网络安全 / DoS 防御的同学可跟进。"
  - type: highlight
    title: "显式 TSO 段数：硬件不再猜"
    meta: "〔08-15 01:30 北京〕· net · PATCH v7 0/2"
    link: "https://lore.kernel.org/netdev/<20260814173034.749151-1-chia-yu.chang@nokia-bell-labs.com>/"
    points:
      - label: "定位"
        text: "网络分片路径：TSO（TCP 分段卸载）段数以往由驱动按 MSS 推算，与 GSO 不一致会出错。"
      - label: "做法"
        text: "v7 2 篇：把 GSO 的段数显式传给驱动，驱动按段数而非猜测设置。"
      - label: "效益"
        text: "段数不一致导致的性能 / 正确性坑消除。"
    relevance: "跑高速网卡 / NIC 驱动的同学可关注。"
  - type: divider
    label: "📰 mm"
    kind: section
  - type: highlight
    title: "per-VMA 锁下再试一次页错误（RFC v5）"
    meta: "〔08-14 16:55 北京〕· mm · RFC PATCH v5"
    link: "https://lore.kernel.org/linux-mm/<20260814085300.399107-1-zhanghongru@xiaomi.com>/"
    points:
      - label: "定位"
        text: "mm 页错误热路径：per-VMA 锁路径（昨天刚放开全配置）下首次尝试失败就回退慢路径。"
      - label: "做法"
        text: "RFC v5 提出「per-VMA 锁下重试一次页错误」，减少过早退到 mmap_lock 慢路径的抖动。"
      - label: "效益"
        text: "继续压榨 per-VMA 锁的收益，页错误延迟更稳。"
    relevance: "关注页错误 / 内存热路径性能的同学可跟进。"
  - type: highlight
    title: "secretmem 锁页记账修正：不漏计、不乱计"
    meta: "〔08-15 02:49 北京〕· mm · PATCH"
    link: "https://lore.kernel.org/linux-mm/<20260814-secretmem-accounting-v1-1-d2f8c677980b@kernel.org>/"
    points:
      - label: "定位"
        text: "mm/secretmem（秘密内存，防内核调试器窥探）的 mlock 记账不完整。"
      - label: "做法"
        text: "修正锁定页的 accounting，mremap / fork 场景不漏计。"
      - label: "效益"
        text: "秘密内存的 RLIMIT 约束真正生效。"
    relevance: "用 memfd_secret / 密钥类应用的同学可关注。"
  - type: divider
    label: "📰 block"
    kind: section
  - type: highlight
    title: "离线与只读 zone 不再让 zoned 设备出岔子（v5，13 篇）"
    meta: "〔08-14 21:48 北京〕· block · PATCH v5 00/13"
    link: "https://lore.kernel.org/linux-block/<20260814134750.2100304-1-dlemoal@kernel.org>/"
    points:
      - label: "定位"
        text: "块层 zoned（分区存储）支持：离线 / 只读 zone 处理粗糙，易误报错误或写坏状态。"
      - label: "做法"
        text: "13 篇 v5（Damien Le Moal）：统一离线 / 只读 zone 的识别与状态机处理。"
      - label: "效益"
        text: "消费级 / 企业级 zoned 设备的稳定性提升。"
    relevance: "用 SMR / zoned 盘或做存储的同学可关注。"
  - type: divider
    label: "📰 media"
    kind: section
  - type: highlight
    title: "Tegra 视频保护内存开个 dma-buf 门（VPR，10 篇）"
    meta: "〔08-14 23:29 北京〕· media · PATCH v5 00/10"
    link: "https://lore.kernel.org/linux-media/<20260814-tegra-vpr-v5-0-71832b5d0246@nvidia.com>/"
    points:
      - label: "定位"
        text: "media + dma-buf + mm 跨界：Tegra 的 VPR（Video Protect Region，视频解码保护区）此前没有内核内存分配通道。"
      - label: "做法"
        text: "10 篇 v5：新增 cma_alloc_at() API（按物理地址分配 CMA）+ bitmap_allocate() 助手 + VPR dma-buf heap；host1x / NVDEC 通过 memory-regions 接上 VPR，Tegra234 / 264 设备树落地。"
      - label: "效益"
        text: "受 DRM 保护的视频内容（如流媒体解码）可在 Tegra 上安全分配内存，为安全视频播放铺路。"
    relevance: "在 Tegra / 嵌入式做安全媒体播放的同学可关注。"
  - type: divider
    label: "📰 sched"
    kind: section
  - type: highlight
    title: "sched/rt 回归：NO_RT_PUSH_IPI 让 pro-audio 遇到 PI 饥饿"
    meta: "〔08-15 05:12 北京〕· sched · REGRESSION"
    link: "https://lore.kernel.org/lkml/<CAEB5A_91hob8ddOhW=PrO1=O7GrFmSxY3r1-_Ard6x8KHHuJGA@mail.gmail.com>/"
    points:
      - label: "定位"
        text: "sched/rt（跨域走 lkml）：NO_RT_PUSH_IPI 配置被报在专业音频负载下引发数秒级 PI（优先级继承）提升饥饿。"
      - label: "做法"
        text: "用户报 regression（指向 dd29c017aed6），Steven Rostedt 介入讨论定位。"
      - label: "效益"
        text: "RT 调度行为回归点的公开追踪，修复方向讨论中。"
    relevance: "跑 RT / 音频实时负载的同学值得盯这个。"
  - type: divider
    label: "📰 virtio"
    kind: section
  - type: highlight
    title: "virtio-blk 加内联加密：磁盘加密走设备侧"
    meta: "〔08-14 22:23 北京〕· virtio · PATCH v1"
    link: "https://lore.kernel.org/virtio-dev/<20260814142306.3934029-1-linlin.zhang@oss.qualcomm.com>/"
    points:
      - label: "定位"
        text: "virtio 块设备层：虚拟机磁盘加密目前要么在 guest CPU 侧做（拖慢），要么靠纯软件 dm-crypt。"
      - label: "做法"
        text: "v1 引入 virtio-blk 内联加密支持，把加解密下放到设备 / 控制器，密钥经加密路径管理。"
      - label: "效益"
        text: "云厂商 guest 全盘加密性能提升，密钥不暴露给 guest CPU。"
    relevance: "做虚拟化 / 云存储安全的同学可关注。"
  - type: divider
    label: "📌 机制雷达：跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "ext4 buffered I/O → iomap"
        text: "32 篇把 ext4 缓冲读写写回迁到 iomap，1MB 写 +35% · <a href=\"https://lore.kernel.org/linux-fsdevel/<20260814093331.1703882-1-yi.zhang@huaweicloud.com>/\">原文</a>"
      - label: "BPF 元数据 skb_ext"
        text: "SKB_EXT_BPF 扩展让 BPF 元数据跨隧道存活，scrub 不掉件 · <a href=\"https://lore.kernel.org/netdev/<20260814-bpf-meta-inside-skb-ext-v1-0-767edd862656@cloudflare.com>/\">原文</a>"
      - label: "YUV colorop"
        text: "DRM 色彩管线补上 YUV→RGB 节点，amdgpu / VKMS 双落地 · <a href=\"https://lore.kernel.org/dri-devel/<20260814211816.1219597-1-harry.wentland@amd.com>/\">原文</a>"
      - label: "panel_bridge 全覆盖"
        text: "所有 panel 驱动统一拿到 panel_bridge，接入标准 bridge 框架 · <a href=\"https://lore.kernel.org/dri-devel/<20260814-drm-bridge-every-panel-v1-0-19cd5277cc8d@bootlin.com>/\">原文</a>"
      - label: "Tegra VPR heap"
        text: "新增 cma_alloc_at() + VPR dma-buf heap，受保护视频内存有门了 · <a href=\"https://lore.kernel.org/linux-media/<20260814-tegra-vpr-v5-0-71832b5d0246@nvidia.com>/\">原文</a>"
      - label: "fs-verity on XFS"
        text: "XFS 收编 fs-verity，Merkle 树放 post-EOF 空间 · <a href=\"https://lore.kernel.org/linux-fsdevel/<20260814092448.1818082-1-aalbersh@kernel.org>/\">原文</a>"
  - type: divider
    label: "○ 更多动态"
    kind: section
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20260814133231.3193-1-thomas.hellstrom@linux.intel.com>/"
        text: "drm/ttm: LRU bulk moves 改为嵌套子列表，大迁移路径更顺"
        time: "08-14 21:33"
      - link: "https://lore.kernel.org/dri-devel/<20260814073258.893007-1-matthew.brost@intel.com>/"
        text: "drm/gpuvm: exec 改两遍锁定，GPU VA 加锁更稳"
        time: "08-14 15:33"
      - link: "https://lore.kernel.org/rust-for-linux/<20260814215145.2050599-1-rafael@rcpassos.me>/"
        text: "Rust: rust_binder 用 lower_bound 迭代提速 debug 信息查询"
        time: "08-15 05:52"
      - link: "https://lore.kernel.org/linux-mm/<20260814-lklm-partial_ctlvec-v2-0-9df50d26e477@kernel.org>/"
        text: "mm: sysctl 向量拒收部分更新，防写错一半的配置生效"
        time: "08-14 18:41"
      - link: "https://lore.kernel.org/linux-media/<20260814052608.39361-1-blbllhy@gmail.com>/"
        text: "media: dvb-core 给 DMX_SET_BUFFER_SIZE ioctl 加上限"
        time: "08-14 13:26"
      - link: "https://lore.kernel.org/linux-block/<20260814223320.4118614-1-shuangpeng.kernel@gmail.com>/"
        text: "block: blk-cgroup 修 blkg_conf_open_bdev 的 use-after-free"
        time: "08-15 06:34"
  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "iomap"
        text: "现代文件系统的 I/O 映射框架，XFS / btrfs 已全量使用；用统一结构描述「文件页↔磁盘块」映射与读写路径"
      - label: "buffer_head"
        text: "老式块缓冲描述结构，ext4 传统 buffered I/O 的最后依赖，正被 iomap 取代"
      - label: "colorop"
        text: "DRM 色彩管线里的原子操作节点，多条 colorop 串联完成整条颜色变换（如 YUV→RGB）"
      - label: "skb_ext"
        text: "网络包 skb 的按需扩展槽，可跨隧道 / 命名空间存活，BPF 元数据的新家"
      - label: "fs-verity"
        text: "文件系统级逐文件完整性校验，基于 Merkle 树，防内容篡改"
      - label: "dma-buf heap"
        text: "内核向用户态提供「可共享 DMA 内存」的分配器（system / cma 等），VPR 是 Tegra 的新成员"
      - label: "SipHash"
        text: "伪随机哈希函数，内核用它随机化哈希表 / 树比较，防碰撞攻击与侧信道"
      - label: "per-VMA lock"
        text: "进程地址空间 VMA 粒度的读锁，昨天刚放开全配置可用，页错误热路径加锁更细"
  - type: closing
    tagline: "ext4 把最后一块 buffer_head 阵地交了出去——今天的地基比楼房多。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
