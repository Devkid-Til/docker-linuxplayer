# 领域架构地图 — 你在内核里的坐标

**怎么用**：这张图是静态的，补丁是每天往上挂的增量。标注每条亮点补丁前，先在这里定位「它动的是哪一层」，再写「为什么」。**看地图 > 看细节**——先知道位置，细节才有意义。

## 1. V4L2 / 视频采集（主战场）

```
userspace         camera HAL / GStreamer / v4l2-ctl
                      │  VIDIOC_* ioctl · media request API
v4l2-core         v4l2_device ── v4l2_subdev（async subdev 绑定树）
                      │  media graph / media pipeline（media controller 模式）
                      │  media bus format（MEDIA_BUS_FMT_*）
drivers/media     ┌────┴───────────────┐
  i2c/            sensor (ov/imx/...)    GMSL2 加解串器 (max9671x / ds90ub9xx)
  platform/       CSI-2 host (renesas rcar-isp · qcom camss · stm32)
  pci/            ISP / frame grabber / virtio-media
```

**关键架构概念**：v4l2_subdev 异步绑定、media pipeline、media bus formats、V4L2 MC（media controller）模式。你之前看的 `os02g10 sensor`、`RAW12 bayer`、`virtio-media` 分别落在 subdev 驱动层、bus format 层、新驱动框架层。

## 2. DRM / 显示（第二主战场）

```
userspace         Wayland / X11 / Vulkan / KMS client
                      │  DRM_IOCTL · KMS atomic (drm_mode)
drm-core          drm_device → drm_connector / drm_crtc / drm_plane / drm_encoder
                      │  drm_framebuffer / drm_gem / drm_colorop
drivers/gpu/drm   driver (i915 / amdgpu / xe / vkms) → drm_bridge → drm_panel
```

**关键架构概念**：KMS 对象模型（connector/crtc/plane/encoder 四件套）、drm_bridge chain、drm_panel、atomic modeset、色彩管线（drm_colorop）。你之前看的 `Boot logo by DT`、`YUV colorop` 落在 bridge/panel 和色彩管线层。

## 3. 内存管理 linux-mm（第二梯队）

```
分配层   slab/page allocator · vmalloc
VMA 层   mmap / VMA / per-VMA locks
映射层   page tables / follow_pfnmap / KVM 交互
回收层   page reclaim / LRU / MGLRU / workingset / PSI
特殊     HMM / migrate-on-fault / device private pages / vmemmap（HVO）
```

**与驱动的耦合点**（你最容易接触到的 mm 补丁）：dma-buf 分配与导入、DMA pool、device private pages（GPU/加速器）、vfio/mdev。

## 4. 进程调度 linux-sched

```
调度类   CFS / RT / deadline / sched_ext
均衡     sched domains / EAS（能效调度）
触发     timer / hrtimer / 中断线程化
```

**与驱动的耦合点**：RT 线程、中断处理线程化（threaded IRQ）、cpufreq 的 schedutil 调频——视频/相机驱动的高吞吐路径直接受影响。

## 5. PCIe linux-pci

```
总线层   pci_dev / pci_bus / 枚举（config space 读写）
资源     BAR / MSI-X / SR-IOV / VFIO
数据     P2PDMA / dma-buf 映射
接口     pci_driver / probe / 电源管理（D3cold）
```

**与你的耦合**：视频卡/相机采集卡走 PCIe（GPU 上的 ISP、PCIe frame grabber、PCIe 加解串器）；P2PDMA 连接 PCIe ↔ 内存，是最近 linux-media 上那批 dma-buf/nvme 补丁的上下文。

## 跨域耦合点（最值得盯机制补丁的地方）

| 耦合 | 连接的两域 | 常见补丁主题 |
|---|---|---|
| **dma-buf** | mm ↔ 视频/显示 | dmabuf 导出/导入、zero-copy、heap |
| **media controller ↔ DRM** | 视频采集 ↔ 显示 | 共享 DMA/中断/电源域、SoC 一体化 IP |
| **PCI P2PDMA** | PCIe ↔ 内存 | peer-to-peer DMA、dmabuf 兼容 |
| **schedutil / RT** | sched ↔ 驱动 | 实时调度与驱动线程 |
