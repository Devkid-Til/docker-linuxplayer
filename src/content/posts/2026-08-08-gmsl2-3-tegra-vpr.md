---
title: GMSL2/3 加解串器统一框架 v15 · Tegra 显存保护接入 dma-buf
date: "2026-08-08"
desc: "GMSL2/3 统一框架 v15 收编 Maxim 老驱动；Tegra VPR 显存保护首次走 dma-buf heaps。"
column: "daily"
tags: ["media", "DRM", "mm"]
blocks:
  - type: hook
    text: >-
      今天的 Linux 内核圈，值得花 3 分钟看两件事：<strong>Maxim 把 GMSL2/3 加解串器收进统一框架（v15）</strong>，和 <strong>Tegra 显存保护区域首次走 dma-buf heaps</strong>。
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-08-08/cover.png"
    alt: 封面示意 · 8月8日 · GMSL2/3 加解串器统一框架 + Tegra VPR 显存保护
  - type: divider
    label: 🎬 今日导读
    kind: primary
  - type: toc
    items:
      - label: 头条
        text: GMSL2/3 加解串器统一框架 v15（22 补丁）——新框架，Maxim 老驱动批量退役
      - label: 头条
        text: Tegra VPR 显存保护区域接入 dma-buf heaps（v4，10 补丁）
      - label: 机制
        text: mm/cma 允许动态创建 CMA 区域（v4）——连续内存从静态走向运行时
      - label: 机制
        text: kfree_nolock 支持 kmalloc 对象（RFC）——mm/slab 延迟释放泛化
      - label: 亮点
        text: drm/amd 修 vblank NULL 解引用
  - type: divider
    label: 💡 今日头条
    kind: primary
  - type: headline
    title: GMSL2/3 加解串器统一框架 v15：新框架落地，Maxim 老驱动退役
    meta: "〔08-07 21:02 北京〕· [PATCH v15 00/22] maxim-serdes: GMSL2/3 serializer and deserializer framework"
    points:
      - label: 现状
        text: GMSL2/3 是 Maxim 的车载/机器视觉串行链路（camera ↔ 加解串器，走同轴/光纤）。每颗 serdes 芯片一个驱动，各挂一个 v4l2_subdev（V4L2 里代表单个设备节点的抽象）。
      - label: 痛点
        text: 老驱动各自为政、代码重复；加一颗新 serdes 就要复制整个驱动改，维护成本高。
      - label: 方案
        text: v15 收编成统一框架——新增 maxim-serdes serializer / deserializer 双框架，落地 MAX96717、MAX9296A 驱动，退役旧的 MAX96712、MAX96714、MAX96717 驱动。
      - label: 为什么
        text: 把「加新 serdes」从「复制驱动」变成「填配置表」——芯片差异收敛成数据，代码不再按芯片堆。
      - label: 效益
        text: 维护负担骤降；新硬件支持周期缩短；接入路径唯一化，生态不用再猜该用哪个驱动。
      - label: 下一步
        text: 框架合并主线 → 更多 Maxim serdes 并入 → 可能带动 TI ds90ub 跟进统一 serdes 抽象。
    verdict: 摄像头链路统一化的最实在一步——做相机/加解串器方向的，这是主战场。
    link: https://lore.kernel.org/linux-media/20260807-gmsl2-3_serdes-v15-0-7212e9e5156a@analog.com/
  - type: headline
    title: Tegra VPR 显存保护区域首次走 dma-buf heaps
    meta: "〔08-07 23:54 北京〕· [PATCH v4 00/10] dma-buf: heaps: Add support for Tegra VPR"
    points:
      - label: 现状
        text: Tegra 有 VPR（Video Protected Region，视频保护内存区），给 NVDEC 这类受保护媒体引擎用；目前只能固定预留，没有通用管理通道。
      - label: 痛点
        text: VPR 是平台私有内存区域，媒体引擎要 DMA 进出它没有标准接口，驱动各自处理。
      - label: 方案
        text: v4 通过 dma-buf heaps 把 VPR 包装成通用堆：bitmap_allocate 分配器 + debugfs 检查 + Tegra234/264 DT 占位节点，hook 进 host1x / NVDEC。
      - label: 为什么
        text: dma-buf heaps 是内核给用户态/驱动共享内存的通用通道，VPR 走它就能复用标准接口，不用平台私造轮子。
      - label: 效益
        text: 视频编解码引擎能按需拿受保护内存；mm ↔ 显示/视频的跨域路径统一到 dma-buf。
      - label: 下一步
        text: v4 迭代中；同系列还带了动态创建 CMA 区域（见机制雷达），连续内存管理一起动。
    verdict: 平台私有内存区域「通用化」的标准路径——用 dma-buf heaps 兜住，谁都能访问。
    link: https://lore.kernel.org/dri-devel/20260807-tegra-vpr-v4-0-5510d16af89e@nvidia.com/
  - type: divider
    label: 📰 media
    kind: section
  - type: highlight
    title: dw9719 对焦线圈支持 DW9800W（Fairphone）
    meta: "〔08-07 22:30 北京〕· [PATCH RFT 2/3] media: i2c: dw9719: Add DW9800W support"
    points:
      - label: 定位
        text: dw9719 是 V4L2 对焦线圈（VCM）驱动，控制镜头马达；DW9800W 是另一颗兼容线圈芯片。
      - label: 做法
        text: 给 dw9719 加 DW9800W 支持（RFT 测试请求中，Fairphone 参与）。
      - label: 效益
        text: 社区机型前置镜头对焦可复用现有驱动，不用新造一个。
    relevance: 社区机型主线化的常规推进，做 sensor/镜头驱动的可参考多芯片兼容写法。
    link: https://lore.kernel.org/linux-media/3554d8d1-65f7-4556-8b99-1c03e0cdca53@fairphone.com/
  - type: more
    title: 更多动态
    items:
      - link: https://lore.kernel.org/linux-media/20260807160149.41580-1-punnaysharma805@gmail.com/
        text: staging av7110 修 sp8870 初始化与硬件通信（DVB）
        time: 08-08 01:07
  - type: divider
    label: 📰 DRM
    kind: section
  - type: highlight
    title: drm/amd/display 修 vblank NULL 解引用
    meta: "〔08-07 23:06 北京〕· [PATCH] drm/amd/display: Fix NULL pointer dereference in amdgpu_dm_crtc_set_vblank()"
    points:
      - label: 定位
        text: amdgpu_dm_crtc_set_vblank() 在 crtc state 缺失时会解引用崩溃。
      - label: 做法
        text: 加 NULL 检查，state 为空时提前返回。
      - label: 效益
        text: 避免热插拔/面板切换场景下的空指针崩溃。
    relevance: 常见防御性修复，排查 AMD 驱动崩溃可参考。
    link: https://lore.kernel.org/dri-devel/20260807145855.83479-1-samuel.pitoiset@gmail.com/
  - type: highlight
    title: drm/dp 只在 HDMI DFP 读 PCON 最大 FRL 带宽
    meta: "〔08-07 23:26 北京〕· drm/dp: Read the PCON max FRL bandwidth only for HDMI DFPs"
    points:
      - label: 定位
        text: PCON（协议转换器）在 Type-C → HDMI 转换时报告 FRL 带宽；只有 HDMI 方向转换器（DFP）才需要读。
      - label: 做法
        text: 修读取逻辑只在 HDMI DFP 上读 PCON 带宽，避免误读。
      - label: 效益
        text: 正确性修复，批量进 6.6 / 7.1 / 6.18 稳定分支。
    relevance: Type-C 转 HDMI 显示链路稳定性相关。
    link: https://lore.kernel.org/dri-devel/20260807143436.113019595@linuxfoundation.org/
  - type: more
    title: 更多动态
    items:
      - link: https://lore.kernel.org/dri-devel/20260807155140.GA882294-robh@kernel.org/
        text: rockchip dw-dp 修 sound DAI cells
        time: 08-07 23:51
      - link: https://lore.kernel.org/dri-devel/178611771198.882916.15330377894023589629.robh@kernel.org/
        text: Chipwealth CH1115 OLED 控制器 dt-bindings
        time: 08-07 23:48
      - link: https://lore.kernel.org/dri-devel/20260807143432.328519401@linuxfoundation.org/
        text: drm/tegra fbdev 移除 framebuffer offset（stable）
        time: 08-07 23:12
      - link: https://lore.kernel.org/dri-devel/20260807152022.291B61F000E9@smtp.kernel.org/
        text: accel/ivpu 修 autosuspend usage_count 泄漏
        time: 08-07 23:20
  - type: divider
    label: 📌 机制雷达：4 条跨域大改动
    kind: primary
  - type: toc
    items:
      - label: maxim-serdes 统一框架 v15
        text: 新驱动框架：GMSL2/3 加解串器链路统一化 · <a href="https://lore.kernel.org/linux-media/20260807-gmsl2-3_serdes-v15-0-7212e9e5156a@analog.com/">原文</a>
      - label: dma-buf heaps 支持 Tegra VPR
        text: 平台私有内存走通用堆（mm ↔ 视频编解码跨域）· <a href="https://lore.kernel.org/dri-devel/20260807-tegra-vpr-v4-0-5510d16af89e@nvidia.com/">原文</a>
      - label: mm/cma 动态创建 CMA 区域 v4
        text: 连续内存从启动静态划分走向运行时可加 · <a href="https://lore.kernel.org/dri-devel/20260807-tegra-vpr-v4-5-5510d16af89e@nvidia.com/">原文</a>
      - label: kfree_nolock 支持 kmalloc 对象
        text: mm/slab 延迟释放机制泛化（RFC）· <a href="https://lore.kernel.org/linux-media/20260807-kfree_nolock_kmalloc-v1-0-ba993cbf7a60@kernel.org/">原文</a>
      - label: mm PTE hw_pte_t 抽象
        text: 页表项存储类型化，映射层在动（讨论中）· <a href="https://lore.kernel.org/dri-devel/eef14e97-20cd-4b08-ae22-7636af049b09@arm.com/">原文</a>
  - type: divider
    label: 📖 本期概念速查：8 个词看懂今天
    kind: primary
  - type: toc
    items:
      - label: GMSL2/3
        text: Maxim 的串行链路协议（加解串器走同轴/光纤），车载/机器视觉摄像头的主流传输
      - label: serdes（加解串器）
        text: 把并行视频信号转串行长线传输再解回的芯片，GMSL2 即其协议之一
      - label: VPR
        text: 视频保护内存区，Tegra 给受保护媒体引擎（如 NVDEC）预留的专用内存
      - label: dma-buf heaps
        text: 内核给用户态/驱动共享内存的通用堆接口，各类内存按 heap 分类申请
      - label: CMA（连续内存分配器）
        text: 为需要物理连续内存的设备（相机 ISP、显示）预留的内存池
      - label: kfree_nolock
        text: 无需持锁的延迟释放机制，用于中断/原子上下文的释放路径
      - label: PTE / hw_pte_t
        text: 页表项；hw_pte_t 是让页表存储类型化的新抽象
      - label: FRL
        text: HDMI 2.1 的固定速率链路，Type-C 转 HDMI 时由 PCON 转换并报告带宽
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的。"
    source: ""

---
