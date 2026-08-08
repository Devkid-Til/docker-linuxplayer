---
title: 虚拟机里的摄像头，终于要成标准设备了
date: "2026-08-06"
desc: "virtio-media v6 + Rust dma_fence v9 双头条；设备页迁移修复、Starvis2 泛化。"
column: "daily"
tags: ["虚拟化", "Rust", "视频 / 相机", "显示 / DRM"]
blocks:
  - type: hook
    text: >-
      今天的 Linux 内核视频圈，值得花 3 分钟看两件事：<strong>虚拟机里的摄像头要成标准设备了</strong>，和 <strong>Rust 正在接管 GPU 同步</strong>。
  - type: image
    alt: "封面示意 —— 虚拟机里接入摄像头/采集设备的 virtio-media"
  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "virtio-media 驱动 v6 —— VM 里的摄像头要成标准设备了"
      - label: "头条"
        text: "Rust dma_fence 抽象 v9 —— Rust 内核打通 GPU/显示同步"
      - label: "机制"
        text: "低内存回退时的设备页迁移修复 v3 —— mm 与 DRM 的跨域硬骨头"
      - label: "亮点"
        text: "imx678 泛化成 Sony Starvis 2 通用驱动（RFC）"
  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "虚拟机里的摄像头，终于要成标准设备了"
    meta: "〔08-06 01:33 北京〕· virtio-media 驱动 v6"
    points:
      - label: "现状"
        text: "虚拟机的网卡、磁盘、显卡各有标准 virtio 设备（virtio-net/blk/gpu），但相机、采集卡这类媒体设备没有标准类型，V4L2 里也没有接入 virtio 的路径。"
      - label: "痛点"
        text: "云厂商想给云主机提供摄像头/采集能力，只能靠私有方案或设备模拟，复用不了 virtio 成熟的队列 + 共享内存机制，用户态也接不进标准 V4L2 接口。"
      - label: "方案"
        text: "新增 virtio-media 驱动（Google 主导）：新 virtio 设备类型 + V4L2 驱动骨架，含 session 管理、scatterlist 构建、ioctl 逻辑与 USERPTR 内存支持。"
      - label: "为什么"
        text: "与其每个云厂商自造轮子，不如把媒体设备定义成标准 virtio 设备，统一走 virtqueue + dma-buf 共享内存。"
      - label: "效益"
        text: "VM 里能用标准 V4L2 接口访问虚拟摄像头/采集设备——云游戏、远程桌面、云端 AI 摄像头都有了基础设施。"
      - label: "下一步"
        text: "v6 迭代中，设备类型还要在 virtio spec 里定稿。新框架，正缺参与者。"
    verdict: "云上音视频是明牌，virtio-media 就是在铺这条路。做视频方向的值得盯。"
    link: "https://lore.kernel.org/linux-media/20260805172545.653506-1-briandaniels@google.com/"
  - type: headline
    title: "Rust 正在让 GPU 同步「不可能出错」"
    meta: "〔08-05 23:01 北京〕· rust / dma_buf: dma_fence 抽象 v9"
    points:
      - label: "现状"
        text: "dma_fence 是内核里表示「一次 DMA 完成/失败」的同步原语，GPU/显示/相机驱动靠它协调共享内存的读写进度；Rust 内核正在把子系统接口封装成安全抽象。"
      - label: "痛点"
        text: "Rust 驱动要和 C 侧 dma_fence 交互却无安全抽象——生命周期靠手动管理，引用计数一错就是 UAF/泄漏；RCU 等待也缺 Rust 封装。"
      - label: "方案"
        text: "新增 Rust dma_fence 抽象（含 ARef&lt;T&gt; 的 ForeignOwnable、rcu_barrier 抽象、补全错误码），并新增 MAINTAINERS 条目。"
      - label: "为什么"
        text: "把 dma_fence 封装成类型安全的引用计数对象，让编译器管生命周期而不是靠人肉；RCU 等待一并安全化。"
      - label: "效益"
        text: "用 Rust 写 GPU/显示/媒体驱动时能安全使用同步原语，dma-buf 这条 mm ↔ 驱动大动脉先打通。"
      - label: "下一步"
        text: "v9 接近合并窗口。想入坑 Rust 内核，这是入口级补丁集。"
    verdict: "Rust 化不是炫技——GPU 是最容易出 UAF 的地方，交给编译器兜底。"
    link: "https://lore.kernel.org/linux-media/20260805145949.938505-2-phasta@kernel.org/"
  - type: divider
    label: "📰 linux-media（视频/相机）"
    kind: section
  - type: highlight
    title: "imx678 → 通用 Sony Starvis 2 驱动（RFC）"
    meta: "〔08-06 00:11〕"
    points:
      - label: "定位"
        text: "sensor 驱动层（v4l2_subdev，drivers/media/i2c/）。树莓派把 IMX678 驱动参数化，改造成覆盖 imx662/imx675 的通用 Starvis 2 驱动。"
      - label: "做法"
        text: "固定走 window mode + 配置参数化 + 新增两款型号支持。"
      - label: "效益"
        text: "一个驱动撑起整个 Starvis 2 家族；RFC 征求方向意见。"
    relevance: "想写第一个 sensor 驱动，这是现成的泛化范本。"
    link: "https://lore.kernel.org/linux-media/20260805-media-starvis2-v1-0-91e8e4eae44f@raspberrypi.com/"
  - type: highlight
    title: "Nothing Phone (1) 前置摄像头支持（IMX471）"
    meta: "〔08-06 03:55〕"
    points:
      - label: "定位"
        text: "sensor 驱动 + 平台设备树（imx471 驱动 + sm7325-nothing-spacewar DT）。"
      - label: "做法"
        text: "新增 IMX471 驱动（DT 匹配 + vdig/vif 供电），补前置相机 DT 节点。"
      - label: "效益"
        text: "Nothing Phone (1) 主线支持前置摄像头，社区机型矩阵 +1。"
    relevance: "社区机型主线化，感兴趣的可以照抄 DTS 流程。"
    link: "https://lore.kernel.org/linux-media/20260805-imx471-v1-0-7be79f539ed8@mainlining.org/"
  - type: highlight
    title: "ipu7 ABI 头清理"
    meta: "〔08-06 02:23〕"
    points:
      - label: "定位"
        text: "staging 里的 Intel IPU7 图像处理单元 ABI 头文件层。"
      - label: "做法"
        text: "删除未用的 ABI 结构、枚举、宏与 #pragma pack。"
      - label: "效益"
        text: "staging 瘦身，向转正（出 staging）再进一步。"
    relevance: "staging 是新人练手区，这类清理补丁门槛友好。"
    link: "https://lore.kernel.org/linux-media/20260805-ipu7_abi-v1-0-46d420cef267@gmail.com/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/linux-media/20260805204704.3789917-1-shuangpeng.kernel@gmail.com/"
        text: "dvb-core UAF 修复（dvb_ca_en50221）"
        time: "08-06 04:47"
      - link: "https://lore.kernel.org/linux-media/6a73bd4e.01d0871a.3a0d52.0007.GAE@google.com/"
        text: "syzbot: dw210x_op_rw 越界读"
        time: "08-06 06:46"
      - link: "https://lore.kernel.org/linux-media/6a73bcd4.01d0871a.3a0d52.0002.GAE@google.com/"
        text: "syzbot: rc_dev_uevent 释放后使用"
        time: "08-06 06:44"
      - link: "https://lore.kernel.org/linux-media/20260805135635.56556-2-ahmisaranrao@gmail.com/"
        text: "imx415 VBLANK 错误路径 runtime PM 修复"
        time: "08-05 21:56"
      - link: "https://lore.kernel.org/linux-media/20260805-shikra-camss-review-v6-5-a8dbc66f0d87@oss.qualcomm.com/"
        text: "qcom shikra IMX577 相机 DT overlay"
        time: "08-05 21:53"
  - type: divider
    label: "📰 dri-devel（显示/DRM）"
    kind: section
  - type: highlight
    title: "低内存回退时设备页迁移修复（v3）"
    meta: "〔08-06 07:10〕"
    points:
      - label: "定位"
        text: "mm 的 migrate_device 与 drm/pagemap（device private pages 迁移，mm ↔ DRM 跨域），Intel 主导。"
      - label: "做法"
        text: "修低内存回退时 folio 分配失败、THP 拆分的设备私有 folio、dma-unmap 时机与 use-after-put。"
      - label: "效益"
        text: "GPU/加速器显存页在内存紧张时能可靠迁回，不再数据损坏或崩溃。"
    relevance: "GPU 显存页面迁移，做 AI 推理/异构内存的绕不开。"
    link: "https://lore.kernel.org/dri-devel/20260805231041.3791771-1-matthew.brost@intel.com/"
  - type: highlight
    title: "rust: dma 单缓冲流式 DMA API + nova-core 首个使用者"
    meta: "〔08-06 05:55〕"
    points:
      - label: "定位"
        text: "Rust 内核 DMA 抽象层（ContiguousBuffer + streaming DMA），NVIDIA nova-core 用它映射 WPR meta。"
      - label: "做法"
        text: "新增单缓冲流式 DMA API，nova-core 落地首个真实用法。"
      - label: "效益"
        text: "Rust 写 GPU 驱动（Nova）补上 DMA 缺口。"
    relevance: "Nova 用 Rust 写 GPU，是 Rust 内核的样板工程。"
    link: "https://lore.kernel.org/dri-devel/20260805-dma-streaming-v1-0-03974c86b141@mailbox.org/"
  - type: highlight
    title: "Bug 221838：nouveau 休眠唤醒黑屏回归"
    meta: "〔08-06 05:20〕"
    points:
      - label: "定位"
        text: "nouveau 电源/恢复路径（Dell M4800 Optimus + Quadro K1100M，内核 7.0.0-28）。"
      - label: "做法"
        text: "回归报告：resume 后黑屏、无背光。"
      - label: "下一步"
        text: "可复现，等 bisect 定位。"
    relevance: "机器匹配（Optimus 笔记本）可以直接帮忙 bisect。"
    link: "https://lore.kernel.org/dri-devel/bug-221838-2300@https.bugzilla.kernel.org/"
  - type: more
    title: "更多动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/6a73bcd5.01d0871a.3a0d52.0003.GAE@google.com/"
        text: "syzbot: i915_pci_probe 通用保护错误"
        time: "08-06 06:44"
      - link: "https://lore.kernel.org/dri-devel/20260805-fix_imagination-v2-1-7391a13c891f@samsung.com/"
        text: "drm/imagination rogue_fwif_hwrtdata 对齐"
        time: "08-06 03:43"
      - link: "https://lore.kernel.org/dri-devel/20260805210641.21740-1-deller@kernel.org/"
        text: "sticon/parisc STI 显卡检测"
        time: "08-06 05:06"
      - link: "https://lore.kernel.org/dri-devel/CABQX2QNHpUbxT=GdHedVq1+Z0Qp82hYC1saHuHuWNX-0VvoRYw@mail.gmail.com/"
        text: "vmwgfx cmdbuf slab 泄漏 ~103 MiB/天"
        time: "08-06 01:36"
  - type: divider
    label: "📌 机制雷达：5 条跨域大改动"
    kind: primary
  - type: toc
    items:
      - label: "virtio-media v6"
        text: "新驱动框架：媒体设备虚拟化"
      - label: "rust: dma_fence v9"
        text: "Rust 内核化 + dma-buf 同步原语"
      - label: "migrate_device / drm/pagemap"
        text: "mm ↔ DRM 跨域修复"
      - label: "ipu7 ABI 清理"
        text: "staging 转正前奏"
      - label: "rust: dma streaming API"
        text: "GPU 驱动 DMA 抽象"
  - type: divider
    label: "📖 本期速查：9 个词看懂今天"
    kind: primary
  - type: toc
    items:
      - label: "virtio"
        text: "虚拟化里收发数据的标准机制（virtqueue + 共享内存），virtio-media 是其媒体设备扩展"
      - label: "dma_fence"
        text: "表示一次 DMA 完成/失败的同步原语，共享内存设备的读写进度靠它协调"
      - label: "migrate_device"
        text: "设备私有页（如 GPU 显存）迁回系统内存的机制，mm 与设备驱动的跨域通道"
      - label: "THP 拆分"
        text: "透明大页在迁移/分裂时拆成普通小页"
      - label: "dma-buf"
        text: "跨设备共享内存的抽象，mm 与驱动的桥"
      - label: "v4l2_subdev"
        text: "V4L2 里代表单个设备节点（sensor/加解串器/ISP 各一个）的抽象"
      - label: "Starvis 2"
        text: "Sony 汽车/监控级 CMOS 传感器系列（IMX6xx）"
      - label: "nouveau / nova"
        text: "NVIDIA 的开源驱动（nouveau 老牌 C 驱动；nova 新一代，内核部分用 Rust）"
  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的。"
    source: ""

---
