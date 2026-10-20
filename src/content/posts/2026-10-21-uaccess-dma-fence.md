---
title: "拆掉 __get_user，dma_fence 想用锁换掉 RCU"
date: "2026-10-21"
desc: "Linus 公开 uaccess 清理分支；dma_fence 改用锁的 RFC 被 AMD 挡回。"
column: "daily"
tags: ["arch", "DRM", "media", "mm", "PCI", "net", "fs", "block"]
blocks:
  - type: hook
    text: >-
      今天两场改动都动到 API 契约：<strong>Linus 把 __get_user/__put_user
      从 x86 拿掉</strong>，起因是一起 vringh 内核内存泄漏；
      <strong>dma_fence 有人想用自旋锁换掉 RCU</strong>，AMD 认为这是 no-go。
      硬件侧，Rockchip 的 eDP 与 tyr 驱动都有新版本。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-21/cover.png"
    alt: "封面 · 10月21日 · 拆掉 __get_user"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-21/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-21 06:23 北京，近 24h 各板块真实计数：net 753 · DRM 365 · mm 232 ·
      PCI 175 · media 135 · fs 110 · Rust 109 · LSM 55 · block 40 · rt 31 ·
      arch 2 · virtio 1。net 的高位主要来自 v7.4 合并窗口的 GIT PULL，
      机制讨论则集中在 <strong>uaccess 原语退场</strong> 与
      <strong>dma_fence 的同步模型</strong>。

  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: 头条
        text: Linus 的 uaccess-cleanups：删掉两个用户内存原语
      - label: 显示
        text: dma_fence 锁方案被挡回；tyr 进 VM/BO ioctl；RK3568 eDP 到 v3
      - label: 采集
        text: Apple AVD 驱动 v3、Qualcomm CCI 恢复、VD55G0 bring-up
      - label: 其他
        text: memory.reclaim 源选择、P2PDMA 上 Intel Xeon、ceph 子卷隔离

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "Linus 拆掉 __get_user：把正确性从调用者记忆里拿走"
    meta: >-
      〔10-20 15:25 北京〕· Removing __get_user / __put_user for good
      （Linus Torvalds，uaccess-cleanups 分支）
    points:
      - label: 现状
        text: >-
          内核给驱动两套访问用户内存的原语：<code>get_user()</code>/<code>put_user()</code>
          做完整的地址检查与缺页处理；<code>__get_user()</code>/<code>__put_user()</code>
          只负责拷贝，地址合法性、页错误禁用都由调用者自己保证。后者长期被当作快路径，
          出现在 vhost、vDPA、i915 等大量驱动里。
      - label: 痛点
        text: >-
          这套分工把正确性押在调用者的记忆上。10-19 的报告给出实例：vringh 的
          <code>getu16_iotlb()</code> 把 <code>iotlb_translate()</code> 的结果直接送进
          <code>__get_user()</code>，全程没有 <code>access_ok()</code>，在 vDPA 透传场景
          可以泄漏内核内存。MST 的修复是改用 <code>get_user()</code>；他也指出用户页被换出时
          会返回 <code>-EFAULT</code>，需要 worker 重试，而 vdpa_sim 目前没有做。
      - label: 方案
        text: >-
          在这条讨论里，Linus 公开了 <code>uaccess-cleanups</code> 分支，目标是把
          <code>__get_user()</code>/<code>__put_user()</code> 整个删掉：先完成 x86，
          随后补上 alpha、hexagon、32 位 arm、powerpc 中「显然正确」的转换；
          需要裸拷贝的地方改为 <code>unsafe_get_user()</code>/<code>unsafe_put_user()</code>，
          并用 scoped user access 显式圈定禁页错误的范围。
      - label: 为什么
        text: >-
          这是一次「删 API」而不是「加检查」的清理。与其要求每个调用者记住先
          <code>access_ok()</code>、再 <code>__get_user()</code>、还要选对上下文，
          不如让这个容易误用的原语消失。注意分支并不删除所有 <code>access_ok()</code>：
          Linus 明确说只拿掉两个原语，<code>raw_copy_*_user()</code> 与 fork 的栈检查
          等仍会保留。
      - label: 效益
        text: >-
          x86 已由 Ingo Molnar 做了 64 位与 32 位 build + boot 验证，MST 在 VM 里测过
          vDPA 并给了 Acked-by，i915 侧已送 CI；vringh 本身按新方式修好。一个附带的新约束：
          架构如果去掉 <code>__get_user()</code>，必须提供
          <code>arch_get_kernel_nofault()</code>，否则通用实现会重新引入它。
      - label: 下一步
        text: >-
          Linus 的测试只到「能 build、能 boot」，他自己说异常路径覆盖不足。剩下较多的是
          alpha/mips/sparc 的信号栈代码——他说 sparc32 那部分「太乱」，留给熟悉架构的人。
          分支已在 kernel.org 公开，等待更多测试与评审。
    verdict: "删掉一个可被误用的原语，比在每个调用点加检查更能收敛风险；代价是各架构的边角路径要有人真的跑过。"
    link: "https://lore.kernel.org/dri-devel/<CAHk-=wipGHx_1Uztmu773yuTM2ka1fq996UmNoJpvKS0gqEdMg@mail.gmail.com>/"

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "dma_fence 想用一把锁换掉 RCU，AMD 说这是 no-go"
    meta: >-
      〔10-20 18:01〕· [RFC PATCH v2 0/3] Solve dma_fence's problems by locking
      （Philipp Stanner）
    points:
      - label: 定位
        text: >-
          <code>dma_fence</code> 是 DRM 与 media 共用的同步原语：GPU 命令、显示翻转、
          摄像头帧完成都用它串联。当前 <code>fence->ops</code> 由 RCU 保护，回调可以在
          RCU 读侧并发执行；驱动释放 fence 前要自己等 <code>synchronize_rcu()</code>。
      - label: 做法
        text: >-
          Philipp Stanner 的 v2 RFC 用三个补丁把 <code>fence->ops</code> 的 RCU 保护
          去掉，改成用 fence 自带的自旋锁保护回调；模块卸载路径与
          <code>get_*_name()</code> 回调也一并改为锁保护。目标很直接：让
          <code>dma_fence_signal()</code> 之后可以立即 <code>kfree()</code>，
          不再需要外部再等一轮 grace period。
      - label: 争议
        text: >-
          Christian König 明确反对：锁会把回调串行化，而 <code>is_signaled()</code>
          等回调本来就要并行；轮询与中断两条信令路径已经有锁序反转，加锁只会更糟，
          他认为应该继续用 RCU 并扩大范围。作者回应说除 <code>set_deadline()</code>
          外回调本来就在锁内执行，并请对方给出真正会死锁的内核实例。到今天结束，
          双方没有收敛。
    relevance: "凡是写 DRM 驱动、用 fence 串命令的，都会受这条约定影响：它决定 signal 之后能不能直接释放。"
    link: "https://lore.kernel.org/linux-media/<20261020100034.759183-2-phasta@kernel.org>/"

  - type: highlight
    title: "tyr 补上 VM/BO ioctl，在 RK3588S 上跑过 panthor IGT"
    meta: >-
      〔10-20 16:26〕· [PATCH v4 00/11] drm/tyr: add VM and BO ioctl support
      （Ke Sun）
    points:
      - label: 定位
        text: >-
          <code>drm/tyr</code> 是面向 CSF 架构 Mali GPU 的新驱动，用户态接口对齐
          panthor。v4 加入 VM 与 BO 的 ioctl，是这条 Rust DRM 路线补 uAPI 的一步。
      - label: 做法
        text: >-
          系列 11 个补丁，基于 <code>drm-file</code> 系列与 Sami Tolvanen 的 buffer
          缓存管理补丁。v4 重做 VmPool 拆除：<code>add()</code> 返回调用者持有的错误，
          冲突的 VM 用 <code>EBUSY</code> 杀掉，<code>remove()</code> 先 kill 再复用 ID；
          另引入 <code>DmaAttr</code> 描述一致性属性。
      - label: 效益
        text: >-
          panthor 的 IGT 测试在 RK3588S 上通过；作者给出完整系列与前置补丁的 GitLab 分支。
    relevance: "RK3588S 是 Mali-G610，tyr 是这条线上 Rust GPU 驱动最直接的参照。"
    link: "https://lore.kernel.org/dri-devel/<20261020-tyr-ioctls-v4-0-704de77da223@kylinos.cn>/"

  - type: highlight
    title: "RK3568 eDP 补齐：Analogix 控制器加 NaNeng PHY"
    meta: "〔10-20 11:10〕· [PATCH v3 0/6] Add eDP support for RK3568（Damon Ding）"
    points:
      - label: 定位
        text: >-
          RK3568 的 eDP 输出由 Analogix DP 控制器与 Rockchip 的 NaNeng eDP PHY 组成，
          主线此前缺这套组合的绑定、PHY 驱动与 DTS。
      - label: 做法
        text: >-
          六个补丁：补 <code>rockchip,rk3568-edp</code> 绑定；为 NaNeng PHY 新增驱动；
          给 <code>analogix_dp</code> bridge 与 rockchip 封装加 RK3568 分支；最后补
          eDP 控制器与 PHY 节点。
      - label: 效益
        text: >-
          作者在 RK3568 EVB1 上用 LG LP079QX1 面板验证，DTS 示例直接给出
          <code>aux-bus</code> 下的 panel 节点。
    relevance: "同属 Rockchip 显示栈，RK3588 的 eDP 调试可以对着这份实现看。"
    link: "https://lore.kernel.org/dri-devel/<20261020030916.3223833-1-damon.ding@rock-chips.com>/"

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "Apple AVD 解码器 v3：用 Cortex-M3 编程的 V4L2 stateless 驱动"
    meta: "〔10-20 17:39〕· [PATCH v3 00/17] media: apple: add avd driver（Sofus Forstreuter）"
    points:
      - label: 定位
        text: >-
          AVD 是 Apple M1/M2/M3 上的视频解码 IP。它没有「每个参数一个寄存器」，
          而是一个寄存器下发整段指令，因此驱动要保证写入顺序与节流；执行交给片上的
          Cortex-M3 协处理器。驱动实现 V4L2 M2M stateless 解码接口。
      - label: 做法
        text: >-
          17 个补丁：驱动把指令写进内存段交给 CM3，CM3 编程硬件并回报完成或错误；
          框架大量复用 rkvdec。支持 H.264、H.265、VP9 与 AV1（M3 起），输出
          NV12/NV16/P010/P210，参考帧使用 Apple 私有的 Interchange 压缩格式，
          系列同时补了 P210 与 Apple interchange 两个像素格式。
      - label: 效益
        text: >-
          作者给出 v4l2-compliance 49/49 全过，以及 fluster 分数：HEVC 145/147、
          AV1 238/242、VP9 216/305、H.264 77/135。reset 依赖 apple-dart 的一个补丁。
    relevance: "想看 stateless 解码器如何把固件/协处理器包进 V4L2 M2M，这是一份完整样例。"
    link: "https://lore.kernel.org/linux-media/<20261020-avd-v3-0-85cbaa2125d8@icloud.com>/"

  - type: highlight
    title: "Qualcomm CCI：sensor 掉电拉低 I2C 线，控制器从此不再启动传输"
    meta: >-
      〔10-21 03:39〕· [PATCH 0/2] i2c: qcom-cci: Recover after a target powers
      down under a running controller（Birk Skyum）
    points:
      - label: 定位
        text: >-
          CCI 是 Qualcomm 摄像头的 I2C 主机控制器。在 Lenovo Yoga Slim 7x
          （X1E80100）上，OV02C10 关闭后约 1 秒内再次打开必然超时：
          sensor 掉电时把 SCL/SDA 拉低，而 CCI 一直保持时钟，master 从此不再启动传输，
          队列停在第 1 条命令，直到超时路径自己复位。
      - label: 做法
        text: >-
          两个补丁：resume 时重置控制器（现有 resume 只在电源域塌陷时才清状态）；
          最后一次传输后等 50 ms 再 suspend，避免控制器在 sensor 掉电后继续被时钟。
      - label: 效益
        text: >-
          此前两次尝试都误判为 sensor 上电时序问题（加 settle time、加 regulator
          off-on 延迟），本次从控制器状态入手解决。
    relevance: "相机 bring-up 里，I2C 主机状态与 sensor 掉电顺序的耦合很常见。"
    link: "https://lore.kernel.org/linux-media/<20261020193946.51478-1-birk.skyum@pm.me>/"

  - type: highlight
    title: "VD55G0：能进 STREAMING 却不出帧，问题在两处 VD55G1 遗留"
    meta: "〔10-21 02:10〕· [PATCH 2/4] media: i2c: Add ST VD55G0 global shutter sensor driver（评审回复）"
    points:
      - label: 定位
        text: >-
          ST VD55G0 是全局快门 sensor，在 Surface Pro 11（Snapdragon X Elite，
          CAMSS）上以单 lane 840 Mbps 运行。驱动启动后 sensor 接受 start、
          也报告 STREAMING，但不出帧，stop 也永不完成。
      - label: 做法
        text: >-
          评审指出两处按 VD55G1 抄来的设置：最小行长度 1128 在 840 Mbps 下必须改为
          1200（ST 参考驱动在 900 Mbps 以下用 1200）；对 VD55G0 写 0 到
          <code>0x0329</code>（映射为 ISL_ENABLE）会直接停帧，而 ST 参考驱动从不写它。
      - label: 效益
        text: >-
          修正后 sensor 正常出流。它也说明 stream on 的返回码不能证明链路真的在工作。
    relevance: "sensor 驱动的行长度与寄存器映射按型号分叉，是 camera 调试的高频坑。"
    link: "https://lore.kernel.org/linux-media/<20261020181025.8625-1-geocausa@gmail.com>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "memory.reclaim 增加 source=：分层内存终于能指定从哪层开始回收"
    meta: "〔10-20 17:07〕· [RFC 0/2] mm: add source selectors to memory.reclaim（Li Zhe / ByteDance）"
    points:
      - label: 定位
        text: >-
          cgroup v2 的 <code>memory.reclaim</code> 只能表达「从这个 memcg 回收 N 字节」。
          在 DRAM 加 CXL/远端 tier 的分层内存上，内核按老化决定降级与回收，
          用户态无法指定从哪一层开始施加压力。
      - label: 做法
        text: >-
          RFC 加入 typed <code>source=</code>：只声明回收的源范围（指定 node/tier），
          不改变降级目标，也不改变 <code>memory.current</code> 的完成度记账；
          不写 source 时行为完全不变。
      - label: 效益
        text: >-
          旧的 <code>nodes=</code> 提案被指出把源选择、回收域、降级目标混在一个参数里，
          实现也没有覆盖整条回收路径。新方案缩小语义边界，让分层内存的调度器能用
          memcg 粒度表达「先压哪一层」。
    relevance: "做 CXL/分层内存或 cgroup 内存控制时，这是少见的、面向用户态的回收策略旋钮。"
    link: "https://lore.kernel.org/linux-mm/<6b0a2dba-6096-432d-bc1a-251343dd1e74@bytedance.com>/"

  - type: highlight
    title: "Live Update 会话可以提前冻结，缩短 kexec 停机窗口"
    meta: "〔10-20 22:47〕· [PATCH v2 0/2] liveupdate: Add LIVEUPDATE_SESSION_FREEZE ioctl（Pasha Tatashin）"
    points:
      - label: 定位
        text: >-
          Live Update（LUO）在 kexec 时保留会话与其中的文件。现在只在 reboot 路径里
          逐个冻结会话，且全程持全局写锁，冻结被压到停机阶段。
      - label: 做法
        text: >-
          v2 增加 <code>LIVEUPDATE_SESSION_FREEZE</code> ioctl：用户态用完一个会话就冻结，
          只拿 per-session mutex；已冻结的会话在 kexec 时跳过自动冻结，若在 kexec 前关闭
          则走 unfreeze 回滚文件。
      - label: 效益
        text: >-
          多个会话可以并发预先冻结，kexec 的黑屏时间缩短；错误路径也补了 ucmd 失败时的解冻。
    relevance: "Live Update 是 kexec 保设备/保状态这条线的关键组件，改的是停机窗口。"
    link: "https://lore.kernel.org/linux-mm/<20261020144710.4154339-1-pasha.tatashin@soleen.com>/"

  - type: divider
    label: "📰 PCI 总线"
    kind: section
  - type: highlight
    title: "P2PDMA 上 Intel Xeon：按服务器代际放行设备直连 DMA"
    meta: "〔10-21 01:37〕· [PATCH v4 0/2] PCI/P2PDMA: Allow P2PDMA on Intel Xeon server CPUs（Pavel Popov）"
    points:
      - label: 定位
        text: >-
          P2PDMA 允许两个 PCI 设备直接互访内存（例如 GPU 直读 NVMe），不走系统内存。
          是否可用取决于主机桥；AMD 用 CPU 代际判断，Intel 一直是空白。
      - label: 做法
        text: >-
          v4 两个补丁把 <code>CONFIG_X86</code> 的 ifdef 从
          <code>cpu_supports_p2pdma()</code> 里移出，并加入 Xeon 服务器代际白名单
          （Skylake-SP 到 Diamond Rapids）。VMware/Hyper-V 透传没有 host bridge 设备，
          只能靠 CPU 判断。
      - label: 效益
        text: >-
          Intel 服务器上 P2PDMA 从「默认拒绝」变成按代际放行，Logan Gunthorpe 的
          Reviewed-by 已带上；剩余意见集中在 asm 头文件的包含方式。
    relevance: "做 DMA/IOMMU、虚拟化直通或 GPU 直连存储时，主机桥白名单直接决定能不能用。"
    link: "https://lore.kernel.org/linux-pci/<20261020173736.81755-1-pavel.e.popov@intel.com>/"

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "netmem 与 page_pool 引用计数对称化，想赶这次合并窗口"
    meta: "〔10-21 06:03〕· [PATCH net-next v3 0/6] net: unify symmetric netmem and page_pool refcounting（Mina Almasry）"
    points:
      - label: 定位
        text: >-
          page_pool 与 netmem 是收包路径的两套内存抽象，它们的引用计数规则与命名并不对称，
          驱动要在两种语义之间切换。
      - label: 做法
        text: >-
          v3 六个补丁统一对称的引用计数与命名。作者还打算在 net-next 重开后，
          把 <code>get_netmem</code> 的命名对齐 <code>folio_get</code> 的现代写法。
      - label: 效益
        text: >-
          Jakub Kicinski 希望在本次合并窗口内进入 net-next，避免以后回移植的负担；
          作者也打算把命名约定写进 page_pool 文档。
    relevance: "改 page_pool/netmem 的驱动与 XDP 收包路径会直接碰到这套语义。"
    link: "https://lore.kernel.org/netdev/<20261020150307.258b00e9@kernel.org>/"

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "CephFS 子卷隔离 v5：缓存元数据也要有 quarantine cap"
    meta: "〔10-21 04:26〕· [PATCH v5 0/5] ceph: support subvolume quarantine（Alex Markuze）"
    points:
      - label: 定位
        text: >-
          CephFS 的 subvolume quarantine 把某个子卷隔离，同时允许持有
          <code>q/Q</code> MDS auth cap 的恢复客户端访问。难点在于：隔离期间
          哪些缓存路径还能直接用本地缓存。
      - label: 做法
        text: >-
          v5 把 fscrypt 符号链接缓存的前置改动与 quarantine 系列合并。关键修正是：
          缓存 head metadata 的访问必须具备 live、quarantine-aware 的
          <code>AUTH_SHARED</code> cap，否则每次操作都问权威 MDS，包括缓存 stat、
          目录回复与加密策略/nonce ioctl。快照路径用 MDS 给出的 subvolume ID 判定，
          32 位客户端重新校验。
      - label: 效益
        text: >-
          隔离不再只靠客户端自觉；快照、断连快照与不稳定命名空间世代都有对应的重新校验。
    relevance: "分布式文件系统的权限与缓存一致性，与本地 VFS 的 dentry/inode 缓存是两套思路。"
    link: "https://lore.kernel.org/linux-fsdevel/<cover.1792527529.git.amarkuze@redhat.com>/"

  - type: divider
    label: "📰 block 块层"
    kind: section
  - type: highlight
    title: "O_DIRECT 的对齐契约可以被绕过：两处 iterator 边界错误"
    meta: "〔10-21 02:43〕· [patch 1/1] iov_iter: validate extracted segment for bvec alignment（Daehyeon Ko / Andrew Morton）"
    points:
      - label: 定位
        text: >-
          块层 O_DIRECT 依赖 iovec/bvec 的对齐契约。两处边角让契约失效：
          <code>iov_iter_extract_bvecs()</code> 在跳过空段或截断后，校验范围与实际取出的段
          不一致；<code>bio_iov_iter_get_pages()</code> 拒绝错位 bio 时没有回滚 iterator。
      - label: 做法
        text: >-
          Daehyeon Ko 用 <code>iter->count</code> 界定快路径长度；Andrew Morton 在拒绝路径上
          保存并恢复整个 iterator，而不是只减字节数（跳过空段会改变位置但不消耗字节）。
      - label: 效益
        text: >-
          前者有未提权 <code>O_DIRECT preadv()</code> 复现：bvec 出现 (1,4095) 与 (0,1)，
          bio 进入 brd 并完成 4096 字节，而不是 <code>-EINVAL</code>；后者在空 iovec 加
          10/1015 段的复现里触发 KASAN 越界读，修复后 writev 返回 1025。
    relevance: "直通 I/O、DMA 对齐与 iovec 处理是驱动和文件系统交界处的高频问题。"
    link: "https://lore.kernel.org/linux-block/<20261020184333.19AAA1F01573@smtp.kernel.org>/"

  - type: divider
    label: "📌 机制雷达：3 条跨域改动"
    kind: primary
  - type: toc
    items:
      - label: v7.4 合并窗口
        text: >-
          今天 lkml 被 GIT PULL 占满：x86 的 asm/boot/bugs/cache/cleanups/cpu/fpu/platform/sev/
          misc/kdump/microcode/mm/tdx 各组、arm64、vfs 19 组、sysctl、IPE、Rust timekeeping、
          hte、EDAC 都在往 7.4-rc1 送，下周 rc1 的内容基本定型 ·
          <a href="https://lore.kernel.org/linux-fsdevel/<atdn5xA9AZHAWNsM@hobbes>/">原文</a>
      - label: virtio-blk 内联加密
        text: >-
          v3 两补丁（控制 virtqueue + 内联加密）讨论从 10-12 持续到 10-20，NVIDIA、Qualcomm
          与 MST 在 virtqueue 管理上往来多轮；virtio-dev 近 24h 只有 1 条新邮件，
          本次抓到的 20 条里 16 条属于这条线程 ·
          <a href="https://lore.kernel.org/virtio-dev/<8537dffb-0cb5-41a3-980c-7970ab1bc927@oss.qualcomm.com>/">原文</a>
      - label: sched_ext 回调语义
        text: >-
          <code>ops.cpu_acquire/release()</code> 的可靠性 RFC 在 lkml 继续评审。
          Tejun 认为追踪「CPU 是否被更高 sched_class 占用」超出 sched_class 的职责，
          建议改成 tracepoint 记录每 CPU 当前生效的调度类 ·
          <a href="https://lore.kernel.org/lkml/<ba9d879aa8b0474d09577b82a1d68940@kernel.org>/">原文</a>

  - type: more
    title: "更多驱动与存储动态"
    items:
      - link: "https://lore.kernel.org/linux-pci/<20261020031049.969895-11-den@valinux.co.jp>/"
        text: "[PATCH v5 10/17] PCI: dwc: Free the MSI domain after the host .deinit() callback"
        time: "10-20 11:11"
      - link: "https://lore.kernel.org/linux-media/<20261020015001.15672-3-patrakov@gmail.com>/"
        text: "[PATCH 3/3] media: i2c: ov5675: Add the OVTI5678 RGB-IR variant"
        time: "10-20 09:50"
      - link: "https://lore.kernel.org/linux-media/<20261020-dw-csi2rx-v1-1-c58a2e5cd43d@oss.nxp.com>/"
        text: "[PATCH] media: synopsys: dw-mipi-csi2rx: Fix DPHY testclr reset sequence"
        time: "10-20 11:00"
      - link: "https://lore.kernel.org/netdev/<20261020020147.790274-1-yanxia@cmss.chinamobile.com>/"
        text: "[PATCH net] veth: fix stale peer max_mtu on XDP program replacement"
        time: "10-20 10:02"
      - link: "https://lore.kernel.org/netdev/<20261020190319.884375-2-opensource@grische.xyz>/"
        text: "[PATCH net 1/3] net: stmmac: honour Rx checksum errors in the AF_XDP zero-copy path"
        time: "10-21 03:03"
      - link: "https://lore.kernel.org/netdev/<atekzexnMd27Kctl@devvm7509.cco0.facebook.com>/"
        text: "[RFC PATCH net-next 0/4] tcp: carry a BPF-chosen identifier in TSval low bits"
        time: "10-21 01:58"
      - link: "https://lore.kernel.org/linux-block/<20261020125129.430600-1-nirmoyd@nvidia.com>/"
        text: "[PATCH] blk-mq: clear stale inactive flag on hctx reuse"
        time: "10-20 20:52"
      - link: "https://lore.kernel.org/linux-security-module/<20261020140030.92643-1-mike.michalo@gmail.com>/"
        text: "[PATCH] apparmor: check address length before reading AF_UNSPEC bind address"
        time: "10-20 22:00"

  - type: more
    title: "更多跨域动态"
    items:
      - link: "https://lore.kernel.org/rust-for-linux/<20261020-rust-workqueue-v3-0-ea7c74d02068@google.com>/"
        text: "[PATCH v3 0/4] workqueue: OwnedQueue and ScopedWork"
        time: "10-20 20:52"
      - link: "https://lore.kernel.org/rust-for-linux/<20261020153112.299745-1-work@onurozkan.dev>/"
        text: "[PATCH v13 0/7] rust: add ww_mutex support"
        time: "10-20 23:31"
      - link: "https://lore.kernel.org/linux-security-module/<20261020174325.2229448-1-jarkko@kernel.org>/"
        text: "[PATCH v4 0/3] KEYS: rhashtable bug fixes"
        time: "10-21 01:43"
      - link: "https://lore.kernel.org/linux-rt-devel/<20261020100526.bFEM4NFd@linutronix.de>/"
        text: "[ANNOUNCE] v6.18.57-rt9"
        time: "10-20 18:05"
      - link: "https://lore.kernel.org/linux-rt-devel/<20261020-aplic-async-probe-v5-0-c4861c2aafca@mobileye.com>/"
        text: "[PATCH v5 0/2] irqchip/riscv-aplic: fix probing of multiple APLIC instances"
        time: "10-20 23:39"
      - link: "https://lore.kernel.org/lkml/<ba9d879aa8b0474d09577b82a1d68940@kernel.org>/"
        text: "[RFC PATCH sched_ext/for-7.4 0/5] sched_ext: Make ops.cpu_acquire/release() reliable"
        time: "10-21 03:00"
      - link: "https://lore.kernel.org/linux-arch/<atfwCcRfC6rWFywH@e129823.arm.com>/"
        text: "[PATCH v2 12/15] arm64: drtm: Update the linker script for EFI_STUB_DRTM"
        time: "10-21 06:49"
      - link: "https://lore.kernel.org/virtio-dev/<8537dffb-0cb5-41a3-980c-7970ab1bc927@oss.qualcomm.com>/"
        text: "[PATCH v3 0/2] virtio-blk: Add inline encryption support"
        time: "10-20 11:22"

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: unsafe_get_user
        text: 只做用户内存拷贝、不做地址检查的原语；必须配合 scoped user access 或 pagefault_disable 使用。
      - label: scoped user access
        text: 用作用域显式圈定「这段代码在访问用户内存」的新接口，替代调用者手工判断 access_ok。
      - label: dma_fence
        text: GPU 命令、显示翻转与摄像头帧之间的同步对象；signal 之后等待方才能继续。
      - label: SRCU
        text: 可睡眠的 RCU 变体；König 认为 dma_fence 的回调保护应继续走 RCU 方向。
      - label: P2PDMA
        text: 两个 PCI 设备之间的直接 DMA，不经过系统内存；需要主机桥与 CPU/芯片组支持。
      - label: netmem
        text: 收包路径里统一描述页与 net_iov 的内存抽象，与 page_pool 共同管理回收与引用。
      - label: AVD / CM3
        text: Apple 视频解码器与它的 Cortex-M3 协处理器；驱动下发指令段，由 CM3 编程硬件。
      - label: LUO
        text: Live Update Orchestration，kexec 时保留会话与文件；本期的 freeze ioctl 让用户态提前冻结。

  - type: closing
    tagline: "如果对你有用，点个赞，或转给需要的朋友。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
