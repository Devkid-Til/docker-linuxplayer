# 领域架构地图 — 你在内核里的坐标

**怎么用**：这张图是静态的，补丁是每天往上挂的增量。标注每条亮点补丁前，先在这里定位「它动的是哪一层」，再写「为什么」。**看地图 > 看细节**——先知道位置，细节才有意义。

## 1. media（V4L2 / 视频采集）

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

## 2. DRM（显示）

```
userspace         Wayland / X11 / Vulkan / KMS client
                      │  DRM_IOCTL · KMS atomic (drm_mode)
drm-core          drm_device → drm_connector / drm_crtc / drm_plane / drm_encoder
                      │  drm_framebuffer / drm_gem / drm_colorop
drivers/gpu/drm   driver (i915 / amdgpu / xe / vkms) → drm_bridge → drm_panel
```

**关键架构概念**：KMS 对象模型（connector/crtc/plane/encoder 四件套）、drm_bridge chain、drm_panel、atomic modeset、色彩管线（drm_colorop）。你之前看的 `Boot logo by DT`、`YUV colorop` 落在 bridge/panel 和色彩管线层。

## 3. mm（内存管理）

```
分配层   slab/page allocator · vmalloc
VMA 层   mmap / VMA / per-VMA locks
映射层   page tables / follow_pfnmap / KVM 交互
回收层   page reclaim / LRU / MGLRU / workingset / PSI
特殊     HMM / migrate-on-fault / device private pages / vmemmap（HVO）
```

**与驱动的耦合点**（你最容易接触到的 mm 补丁）：dma-buf 分配与导入、DMA pool、device private pages（GPU/加速器）、vfio/mdev。

## 4. sched（进程调度 · 跨域 · RT 走 linux-rt-devel）

> 来源提示：linux-sched 无专属 lore 镜像，主线程调度补丁靠 lkml（linux-kernel 广播源）+ 各板块跨帖捕获；**RT 实时调度（RT/deadline/RT-mutex）走专属列表 linux-rt-devel**（lore 镜像名，不是 linux-sched）；关键词见 SKILL.md。

```
调度类   CFS / RT / deadline / sched_ext
均衡     sched domains / EAS（能效调度）
触发     timer / hrtimer / 中断线程化
```

**与驱动的耦合点**：RT 线程、中断处理线程化（threaded IRQ）、cpufreq 的 schedutil 调频——视频/相机驱动的高吞吐路径直接受影响。

## 5. PCI（PCIe 总线）

```
总线层   pci_dev / pci_bus / 枚举（config space 读写）
资源     BAR / MSI-X / SR-IOV / VFIO
数据     P2PDMA / dma-buf 映射
接口     pci_driver / probe / 电源管理（D3cold）
```

**与你的耦合**：视频卡/相机采集卡走 PCIe（GPU 上的 ISP、PCIe frame grabber、PCIe 加解串器）；P2PDMA 连接 PCIe ↔ 内存，是最近 linux-media 上那批 dma-buf/nvme 补丁的上下文。

## 6. net（网络）

```
userspace       socket · TCP / UDP / QUIC
                    │  sk_buff · netfilter（nf_tables）
net-core        protocol stacks · NAPI · devlink · phylib
                    │  net_device_ops · XDP / BPF hooks
drivers/net     NIC（mlx5 / igc）· switchdev / DSA · virtio-net · phy
```

**关键架构概念**：sk_buff 生命周期、NAPI 软中断收包、XDP 挂载点（驱动 → net-core）、page_pool 页池（与 mm 的耦合点）、nf_tables 规则引擎。
**与你的耦合**：virtio-net（虚拟化）、page_pool（mm 交互）、DSA switch（PCIe 上的交换机）、phy（媒体无关接口，和视频 serdes 同族）。

## 7. fs（文件系统）

```
userspace       syscall（open/read/write）· io_uring
VFS             inode / dentry / file / super_block
page cache      与 mm 共用的缓存层（address_space）
具体 FS         ext4 / btrfs / xfs / bcachefs / overlayfs
```

**关键架构概念**：VFS 抽象（inode/dentry）、page cache（mm 交互最深处）、io_uring 异步 I/O、overlayfs 只读合并。
**与你的耦合**：page cache 归 mm 管；块设备（PCIe NVMe）挂在 VFS 之下；相机 RAW 落盘性能受 FS 调度影响。

## 8. virtio（虚拟化）

```
guest 驱动      virtio-net / blk / gpu / media
virtqueue       虚拟队列协议（split / packed ring）
vhost / VDUSE   vhost 内核后端 · VDUSE 用户态后端
```

**关键架构概念**：virtqueue 双环握手、packed ring、admin virtqueue（配置/管理通道，新机制）、vDPA。
**与你的耦合**：virtio-media（视频虚拟化）你已在追；virtio-gpu 显示虚拟化同族；dri-devel 上 Rust 抽象常挂 virtio。

> 来源提示：virtio-dev 列表极低频（实测 0.12 条/天，20 条≈半年），雷达按 N20 兜底、日报只作信号提示不展开；virtio 板块当日 signal 主要靠跨帖捕获（netdev 的 virtio-net / dri-devel 的 virtio-gpu / linux-media 的 virtio-media / linux-block 的 virtio-blk）。

## 9. Rust

```
rust-for-linux  内核里用 Rust 写驱动/模块的框架
                    │  kernel crate：安全抽象（把 C 的不安全封装成安全 Rust API）
实际使用         rp2040 板 · asahi（Apple silicon）GPU / IOMMU
```

**关键架构概念**：`kernel` crate 的安全抽象（spinlock / dma_fence 包装）、`unsafe` 边界最小化、kbuild + bindgen 集成。
**与你的耦合**：dri-devel 上已有 Rust dma_fence 抽象（你之前看过）；Rust 模块是 driver-core / 驱动框架方向的头条候选。

## 10. LSM（安全）

```
userspace       权限决策 · 设备节点访问
LSM 框架        SELinux / AppArmor / Landlock / IMA / lockdown
keys            密钥环 keyrings
```

**关键架构概念**：LSM hook 点（open/exec/网络/keys）、capabilities、Landlock 无特权沙箱、IMA 完整性校验。
**与你的耦合**：多媒体设备节点 ACL（/dev/video0）、UVC 相机权限、虚拟化里的隔离与密钥。

## 11. driver-core（驱动框架 · 跨域 · 无专属 lore 列表）

> 来源提示：linux-kernel 的 lore 镜像名是 lkml（全内核广播源），driver core 补丁靠 lkml + 各驱动子系统（linux-media / dri-devel / netdev 等）跨帖捕获；关键词见 SKILL.md。

```
drivers/base    device / bus / driver 模型 · probe 流程 · devlink
通用机制        workqueue / kthread / module · component framework
```

**关键架构概念**：device→driver 匹配与 probe、component aggregate（DRM 显示子系统组织方式）、devlink 设备配置链路。
**与你的耦合**：media/drm 驱动都长在这套框架上；component framework 是 DRM 子系统的骨架。

## 12. block（块设备）

```
块层      blk-mq（多队列）· bio / biovec · I/O 调度器（mq-deadline / none）
设备      NVMe · dm（device mapper）· md · loop · virtio-blk
路径      通用 block layer → 驱动（nvme / sd / dm-multipath）
```

**关键架构概念**：blk-mq 多队列（CPU 亲和、免锁）、bio 生命周期（与 mm 页交互）、I/O 调度与异步（io_uring）、dm 层叠设备。
**与你的耦合**：PCIe NVMe（挂在 PCI 总线下）；io_uring 异步 I/O（视频帧落盘路径）；virtio-blk（虚拟化）。

## 13. arch（架构）

```
arch/       arm64 / riscv / x86 / loongarch 平台代码
CPU 特性    errata 处理 · CPUID/ISA 特性解析 · 内存模型（memory ordering / barrier）
启动/固件   ACPI / EFI · device tree · kexec / KASLR / 重定位
```

**关键架构概念**：各 arch 的 Kconfig/能力位、ACPI/EFI 固件接口、内存模型与 barrier、重定位（relocation）。
**与你的耦合**：arm64/riscv 板级支持（相机平台落地的基础）；ACPI/EFI（服务器/嵌入式平台初始化）；跨架构机制补丁是「架构动向」的信号源。

## 跨域耦合点（最值得盯机制补丁的地方）

| 耦合 | 连接的两域 | 常见补丁主题 |
|---|---|---|
| **dma-buf** | mm ↔ 视频/显示 | dmabuf 导出/导入、zero-copy、heap |
| **media controller ↔ DRM** | 视频采集 ↔ 显示 | 共享 DMA/中断/电源域、SoC 一体化 IP |
| **PCI P2PDMA** | PCIe ↔ 内存 | peer-to-peer DMA、dmabuf 兼容 |
| **schedutil / RT** | sched ↔ 驱动 | 实时调度与驱动线程 |
| **sched_ext** | sched ↔ 各域 | 可扩展调度器（重调度器头条候选） |
| **page_pool** | mm ↔ 网络 | 网络页池与内存回收 |
| **io_uring** | fs ↔ mm/块 | 异步 I/O 与 page cache |
| **block ↔ mm** | 块层 ↔ 内存 | bio 页生命周期、I/O 与 reclaim 交互 |
| **component framework** | 显示 ↔ driver core | DRM 子系统组件组织 |
| **virtqueue / vDPA** | virtio ↔ 网络/显示 | 虚拟化队列协议 |
| **LSM hook** | 安全 ↔ 各域 | 设备访问控制与隔离 |
