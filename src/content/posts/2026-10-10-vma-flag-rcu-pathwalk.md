---
title: "内核把「没人看得懂的标志位」拆成了会说话的函数；VFS 找回 RCU 路径上漏掉的宽限期"
date: "2026-10-10"
desc: "mm 用 38 个补丁消除 VM_SPECIAL，把标志位换成会说话的谓词；VFS 补上 RCU 路径行走漏掉的宽限期。"
column: "daily"
tags: ["mm", "fs", "net", "DRM", "media", "Rust", "block", "arch", "sched"]
blocks:
  - type: hook
    text: >-
      今天两条主线都是「把已经承诺过的事，写成能被检查的形式」：mm 用 <strong>38 个补丁干掉 VM_SPECIAL</strong>，
      把只有作者看得懂的标志位换成读代码就能懂的谓词；另一边 <strong>VFS 找回 RCU 路径行走上漏掉的宽限期</strong>，
      把八个文件系统里「还在被读、却已经被释放」的对象一次性清掉。

  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-10/cover.png"
    alt: "封面 · 10月10日 · 标志位拆成会说话的函数"

  - type: divider
    label: "🎬 今日导读"
    kind: primary
  - type: toc
    items:
      - label: "头条"
        text: "mm：38 个补丁消除 VM_SPECIAL，把「说不出口的标志位」换成谓词函数"
      - label: "头条"
        text: "fs：RCU 路径行走上的 use-after-free，ext4 / ntfs3 / eventfs 等八个文件系统中招"
      - label: "mm"
        text: "vmap 失败不再留半张映射表；zram 重做压缩后端，顺手治了读被写堵住的优先级反转"
      - label: "net"
        text: "PON 子系统 RFC：把光网络单元做成一个像 wiphy 一样、本身不是网卡的内核对象"
      - label: "DRM"
        text: "nova-core 把 GSP 命令队列拆成与消息类型无关；MSM 的 DP / eDP 开始支持静态 HDR"
      - label: "media"
        text: "GalaxyCore 两颗传感器进主线（GC5035 / GC8034）；i.MX 的 MIPI CSIS 补上 YUYV 格式"
      - label: "机制"
        text: "Rust 侧 DRM 作业队列、blk-mq tag set 进 debugfs、sched_ext 新回调、客户机里的 P2PDMA"

  - type: divider
    label: "📊 板块活跃度"
    kind: section
  - type: image
    src: "http://kernelplayer.oss-cn-beijing.aliyuncs.com/kernel-blog/2026-10-10/board-heat.png"
    alt: "板块活跃度条形图 · 近 24h · 全 12 列表"
  - type: paragraph
    text: >-
      数据截至 10-10 06:23 北京，近 24h 各板块真实计数：net 639 · DRM 347 · mm 223 · PCI 150 · fs 145 ·
      media 117 · Rust 62 · block 61 · arch 49 · LSM 23 · rt 10 · virtio 2。
      net 依旧是量最大的一头（大头是驱动修复与 PHY/DSA 新芯片）；今天的重量集中在两处：
      mm 侧是那个 38 帖的 VMA 标志语义重构，fs 侧是一串「只有在没有 umount 的窄路径上才爆」的释放竞态。

  - type: divider
    label: "💡 今日头条"
    kind: primary
  - type: headline
    title: "38 个补丁干掉 VM_SPECIAL：内核终于把 VMA 标志「说不出口的意思」变成了函数名"
    meta: "〔10-10 02:04 北京〕· [PATCH v5 00/38] mm: make VMA flag semantics explicit, eliminate VM_SPECIAL（Lorenzo Stoakes / ARM）"
    points:
      - label: 现状
        text: >-
          VMA（虚拟内存区域）是 mm 与驱动共用的数据结构。一个 VMA 的内容由谁填充、能不能被合并或扩展，
          历史上靠 <code>VM_SPECIAL</code> 这一组标志位间接表达——它是
          <code>VM_IO | VM_DONTEXPAND | VM_PFNMAP | VM_DONTDUMP</code> 的打包。
      - label: 痛点
        text: >-
          这组标志把互不相关的性质搅在一起：<strong>「谁在管这块内存」「能不能扩」「是不是 mlock 那种怪异情况」
          共用一个位图</strong>。驱动作者经常猜错——连 <code>VM_IO</code> 都不能再假设等于 IOMMU 映射，
          因为 mlock 也在滥用它；hugetlb 又设了 <code>VMA_DONTEXPAND_BIT</code> 却并不想被当成 special。
          作者原话是「这一团相当乱」。而 special 这个词本身在 mm 里也早已过载：VDSO 与 VVAR 映射也叫 special。
      - label: 方案
        text: >-
          系列做三层：一把<strong>驱动能用哪些标志</strong>收紧成不变量——
          mm 管理的映射既不许设 <code>VMA_IO_BIT</code>、也不许清 <code>VMA_MAYWRITE_BIT</code>，
          并在每次 mmap / mmap_prepare 钩子之后<strong>校验 VMA 状态</strong>；二把散落的标志测试换成四个说人话的谓词：
          <code>vma_is_mm_managed()</code>（内容是不是核心 mm 建立并管理的）、
          <code>vma_is_mm_backed()</code>（后备内存是不是核心 mm 缺页进来并留住的）、
          <code>vma_is_fixed_mapping()</code>（不许扩展或合并）、
          <code>vma_can_merge()</code>（能不能和邻居合并）；三整体删除 <code>VM_SPECIAL</code> 与 <code>VMA_SPECIAL_FLAGS</code>。
      - label: 为什么
        text: >-
          选「用谓词描述行为」而不是「继续加标志」，是因为加标志只是把同一个坑换个名字。
          真正让越界无处可藏的是那条不变量加钩子后校验——它把错误从「某个驱动三个月后的诡异 bug」
          提前到「提交那一刻就报」。
      - label: 效益
        text: >-
          跟着改的子系统是一长串：scsi sg 与 usbmon 改用 <code>mmap_prepare</code>、
          fbdev defio / cmt_speech / uprobes / bpf arena 补上 <code>VM_MIXEDMAP</code>、
          ALSA PCM 状态页改成 <code>vm_insert_page()</code>、selinux 去掉 mmap 的读写检查、
          fuse/dax 不再设 <code>VM_MIXEDMAP</code>、THP 的 <code>vma_is_special_huge()</code> 直接删掉。
          换句话说：每一个「自己映射内存」的子系统都在这 38 帖里留下了痕迹——这正是它值得一读的原因。
      - label: 下一步
        text: >-
          v5 已经吃下大量 Reviewed-by，主要工作是按 Suren、David、Liam、Zi 的意见做重命名与收紧
          （<code>vma_is_persistent()</code> 改成 <code>vma_is_mm_backed()</code> 就来自 David）。
          系列走 akpm 的 mm 树。对想入门 mm 的人，这套「先立不变量、再换谓词、最后删旧标志」的收敛过程
          本身就是很好的读补丁材料。
    verdict: >-
      删掉一个被滥用二十年的标志位，比新增一个 API 难得多。这一版的价值不在功能，
      在于把「约定」变成了「会被校验的规则」——而规则才是能拦住下一个人犯错的东西。
    link: "https://lore.kernel.org/linux-mm/<20261009-b4-mmap-prepare-vma-flag-sanify-v5-0-923b70125b1e@kernel.org>/"
  - type: headline
    title: "VFS 的 RCU 路径行走漏了宽限期：八个文件系统把「还在被读的东西」提前释放了"
    meta: "〔10-10 05:52 北京〕· [PATCH 0/8] fs: fix a range of UAFs during rcu pathwalk caused by non-rcu frees（Christian Brauner）"
    points:
      - label: 现状
        text: >-
          路径查找（pathwalk）在 RCU 模式下不加锁地走 dentry，因此
          <code>-&gt;permission()</code>、<code>-&gt;d_revalidate()</code>、<code>-&gt;get_link()</code>、
          <code>-&gt;d_hash()</code>、<code>-&gt;d_compare()</code> 里读到的任何东西，
          都必须<strong>等一个 RCU 宽限期之后</strong>才能释放。这是自从 rcu pathwalk 那批修复之后，
          明确交给文件系统自己负责的事。
      - label: 痛点
        text: >-
          多数时候 <code>umount(2)</code> 帮大家挡住了：<code>namespace_unlock()</code>
          会先等一个宽限期再放下挂载点，此时走路径的人早就走了。
          但<strong>最后一个挂载引用不一定在 umount 里消失</strong>——从一个惰性卸载的目录
          <code>chdir()</code> 出去，或者关掉最后一个文件，引用就直接掉了，中间没有任何宽限期。
          这时 <code>-&gt;put_super()</code> 与 <code>-&gt;kill_sb()</code> 会释放掉仍然在被读的东西。
      - label: 方案
        text: >-
          逐一改成「谁读谁负责，读的东西就用宽限期释放」：ext4 的 sbi 与 extent 状态计数器
          （符号链接的目标存在数据块里时，<code>ext4_get_link()</code> 会在 RCU 模式下读它们）、
          ext4 / f2fs / tmpfs 的 unicode 大小写折叠映射（<code>generic_ci_d_hash()</code> 在用）、
          ntfs3 的 sbi 与挂载选项（remount 甚至不需要卸载就能踩到）、
          eventfs 的 eventfs_inode（原来只等 SRCU，但 <code>tracefs_d_revalidate()</code> 是在
          <code>rcu_read_lock()</code> 下读的）。afs 与 9p 今天还够不到，
          但作者也一并让它们自己等宽限期，<strong>不让它们依赖私有 bdi 顺带带来的那个宽限期</strong>。
          第 5 帖是另一类 bug：<code>create_ipc_ns()</code> 在 <code>mq_init_ns()</code> 之后失败，
          会漏掉 mqueue 的挂载与超级块。
      - label: 为什么
        text: >-
          不选「继续依赖 umount 路径的巧合」，而是把责任显式落在每个文件系统身上。
          作者说得很直白：afs 与 9p 现在没暴露，只是因为 <code>generic_shutdown_super()</code> 调的
          <code>bdi_unregister()</code> 要等宽限期，而那个宽限期本来是为 <code>bdi_list</code> 的
          RCU 读者准备的——「我不想让它们靠这个巧合活着」。
      - label: 效益
        text: >-
          打开 KASAN 加 vfs.fixes 就能看到这一串：ext4 会命中 NULL 解引用、sbi 的 use-after-free，
          或落到已销毁的 percpu 计数器上缺页。系列还附了复现器——用 kprobe 把走路径的调用
          卡在文件系统回调里两秒，另一边去释放。
      - label: 下一步
        text: >-
          这类「RCU 模式回调里究竟能读到什么」的审计没做完。作者是因为在做
          <code>namespace_unlock()</code> 宽限期消除，顺路把「文件系统关停时释放了什么」过了一遍才发现的；
          同一条路径上大概率还有下一批。
    verdict: >-
      这是一类只在「没有 umount、也没有锁」那条窄路上才爆的 bug——KASAN 报得出来，人眼很难看出来。
      系列里最值得学的不是补丁本身，而是作者发现问题的方式：先问「谁还会读它」，再问「谁把它释放了」。
    link: "https://lore.kernel.org/linux-fsdevel/<20261009-work-fixes-rcu-v1-0-7446d2d335e6@kernel.org>/"

  - type: divider
    label: "📰 mm 内存管理"
    kind: section
  - type: highlight
    title: "vmap 失败不该留下半张映射表：把回滚从「调用者各自负责」收进映射函数"
    meta: "〔10-09 14:35 北京〕· [RFC PATCH 0/4] mm/vmalloc: make the mapping functions undo their partial mappings"
    points:
      - label: 定位
        text: >-
          vmalloc 的映射函数（<code>__vmap_pages_range_noflush()</code> 这一族）在失败时，
          可能已经装进去一部分 PTE 却留在那里不管。
      - label: 做法
        text: >-
          麻烦在于调用者的做法并不一致：<code>pcpu_map_pages()</code> 与
          <code>kmsan_ioremap_page_range()</code> 自己回滚已映射的部分，而
          <code>vm_module_tags_populate()</code> 与 <code>__vmalloc_area_node()</code> 的
          <code>__GFP_NOFAIL</code> 重试循环则假设映射函数会清理干净。RFC 把回滚<strong>移进映射函数本身</strong>：
          失败的 vmap 什么都不留，调用者不再需要擦屁股。
      - label: 效益
        text: >-
          修掉的是一类「再试一次就炸」的 bug：同一段地址空间被重新映射时会撞上残留，
          大页路径直接在 <code>vmap_pte_range()</code> 里 BUG()，小页路径则是警告。
    relevance: >-
      vmalloc 是驱动里最常见的「要一块连续虚拟地址」手段。这类「失败路径上谁负责收尾」的分歧，
      在任何自己管理资源的子系统里都会出现——统一到最底层，是最省事的解法。
    link: "https://lore.kernel.org/linux-mm/<20261009063619.112313-1-hao.ge@linux.dev>/"
  - type: highlight
    title: "zram 重做压缩后端：每个 CPU 一条流，读写挤在一起才闹出优先级反转"
    meta: "〔10-09 15:12 北京〕· [PATCH v2 00/11] zram: redesign zcomp and rework backends"
    points:
      - label: 定位
        text: >-
          zram 把内存当块设备用，压缩上下文 <code>zcomp</code> 按 per-CPU 组织。
          历史设计里，<strong>读上下文和写上下文一直共用同一条流</strong>。
      - label: 做法
        text: >-
          开启可抢占的 zram 之后这就成了问题：优先级更高的读者可以抢在写者前面运行，
          但压缩流还被那个被抢占的写者持着，读者于是卡在<strong>同一把流锁</strong>上——典型的优先级反转。
          而实际上并没有任何理由把读上下文和写上下文塞进同一条流。
      - label: 效益
        text: >-
          重构压缩后端，并顺手省内存：按后端与配置不同，每个上下文 / 每 CPU 省下两位数到三位数 KB。
          对内存紧张又要开 zram 的设备，这是直接可感知的收益。
    relevance: >-
      「共享一份可抢占地持有的状态」是嵌入式里反复踩的坑——GMSL2 链路上多个流共享一把锁时，
      同样的反转会以「偶发丢帧」的形式出现。
    link: "https://lore.kernel.org/linux-mm/<20261009071157.3730698-1-senozhatsky@chromium.org>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-mm/<20261009163146.83112-1-usama.arif@linux.dev>/"
        text: "mm：zswap 减少 load 路径上的请求竞争（v2，2 帖）"
        time: 10-10 00:31
      - link: "https://lore.kernel.org/linux-mm/<20261009112308.240769-1-zhen.ni@easystack.cn>/"
        text: "mm：page_owner 增加 bpf_iter 与 kfuncs，不用再让用户态解析整个 debugfs 转储就能按 pid / cgroup / 栈切片"
        time: 10-09 19:23
      - link: "https://lore.kernel.org/linux-mm/<cover.1791577417.git.ehab.ababneh@intel.com>/"
        text: "mm：kswapd 每节点多线程、按 NUMA 负载唤醒的 RFC（v2，5 帖）"
        time: 10-10 04:30
      - link: "https://lore.kernel.org/linux-mm/<20261009214639.2878857-1-kuniyu@google.com>/"
        text: "mm：KASAN 现在能检出涉及 kfree_rcu_sheaf() 的双重释放（2 帖）"
        time: 10-10 05:46
      - link: "https://lore.kernel.org/linux-mm/<20261009165518.3863950-1-willy@infradead.org>/"
        text: "mm：移除 add_to_page_cache_lru() 的 RFC（Matthew Wilcox）"
        time: 10-10 00:55

  - type: divider
    label: "📰 net 网络"
    kind: section
  - type: highlight
    title: "PON 子系统 RFC：把光网络单元做成一个像 wiphy 一样、本身不是网卡的内核对象"
    meta: "〔10-09 20:11 北京〕· [RFC net-next 00/12] net: add the PON subsystem（John Crispin）"
    points:
      - label: 定位
        text: >-
          新增 <code>net/pon</code>——面向 ITU-T 无源光网络（PON）的 ONU（光网络单元）侧子系统。
          它不是一个网卡驱动，而是一套<strong>对象模型</strong>，作者给的对标物是
          「cfg80211 + 一个 fullmac 驱动」。
      - label: 做法
        text: >-
          <code>struct pon_dev</code> 是 PON 对象、<strong>本身不是 netdev</strong>，
          用户态用设备 id 寻址（就像 nl80211 寻址 wiphy）。MAC 驱动负责跑 PLOAM 激活与密钥层级，
          通过 <code>pon_dev_state_report()</code> 上报状态，核心负责校验这个状态跳转是否符合
          ITU-T G.9807.1 表 C.12.4，再据此发布状态、设置 carrier。
          T-CONT、GEM 端口与上行分类规则（那套 802.1p mapper）由核心持有、驱动卸载；
          业务流量走普通数据网卡加若干 GEM 网卡（rtnetlink 的 link kind <code>gem</code>）；
          OMCI 走一个 generic netlink family，<strong>既不新建地址族，也不建 OMCI 网卡</strong>。
      - label: 为什么
        text: >-
          这是上一轮「通用 PON 框架」讨论收敛出的形状：把芯片差异全部压进 MAC 驱动，
          OMCI 这种协议栈留在用户态，核心只回答一个问题是——「什么是合法状态」。
      - label: 效益
        text: >-
          第一个驱动（Airoha AN7581 PON MAC，含 PON PHY、光模块驱动与 airoha_eth 里的 conduit）
          没有随这版发出，因为它依赖尚未上游的 Airoha PCS 系列。
      - label: 下一步
        text: >-
          讨论已经很热。MaxLinear 表态支持做通用抽象，但强调必须支持多芯片组与不同底层架构，
          并直言「从第一眼看，它按现状不能也不该这么工作」。另一边来了一份现场数据：
          基于 Realtek RTL9602C 的开源 G-PON ONU 棒项目（odi-oss）跑 mainline 6.18，
          PLOAM 在 MAC 驱动、OMCI 在用户态走 netlink——和这版的分法一致。
          作者说当前范围是 XGS-PON，但 mode 枚举里留了 <code>gpon</code> / <code>xg-pon</code> 给后续驱动。
    relevance: >-
      「一个子系统该把什么放进核心、什么留给驱动」是照抄不来的架构判断。
      这条的取舍逻辑，和 DRM 的 connector/bridge 分层、V4L2 的 subdev 分层是同一类问题。
    link: "https://lore.kernel.org/netdev/<a341d713-25e0-41b4-8588-7771fee7ba8f@phrozen.org>/"
  - type: highlight
    title: "PSP 连接能换密钥了：设备密钥轮换之后，加密 TCP 不用断线重连"
    meta: "〔10-10 04:46 北京〕· [PATCH net-next v2 0/7] psp: support rekeying psp protected tcp connections"
    points:
      - label: 定位
        text: >-
          PSP（Packet Security Protocol）是内核里给 TCP 做加密的协议栈——可以理解成沉到内核、
          并且能交给硬件卸载的 TLS。PSP 规范要求：<strong>设备密钥轮换时，连接上的密钥必须能换</strong>。
      - label: 做法
        text: >-
          一条 PSP 连接的两端各有两把密钥：一把解密入向流量、一把加密出向流量。
          因此 rekey 有两个方向：rx rekey 是给自己分配新的 spi + 解密密钥再交给对端，tx rekey 反过来。
          系列把两个方向都做出来，并给 SADB 类驱动加了<strong>延迟的 tx 密钥删除</strong>
          （等还在飞的包走完再删），另加一个「未结算 tx 密钥」的核心统计。
      - label: 效益
        text: >-
          长连接可以跨设备密钥轮换继续存活；对做硬件卸载的驱动，这同时是一份
          「密钥生命周期归谁管」的接口约定。配套的 drv-net selftest 已经跟上——
          rekey 测试，以及一个专门验证 tx rekey 排空的测试。
    relevance: >-
      「密钥换了但连接不能断」是任何长连接安全协议都要过的关。这里的解法
      （延迟删除 + 未结算计数）在驱动侧很常见，只是换了对象。
    link: "https://lore.kernel.org/netdev/<20261009-psp-v2-0-5596ab50f677@gmail.com>/"
  - type: highlight
    title: "车规以太网又一块拼图：onsemi S2500（10Base-T1S）走到 v9"
    meta: "〔10-10 01:12 北京〕· [PATCH net-next v9 00/11] Support for onsemi's S2500 10Base-T1S MAC-PHY"
    points:
      - label: 定位
        text: >-
          10Base-T1S 是车载与工业的单对以太网（IEEE 802.3cg），S2500 是带集成 MAC 的收发器，
          也就是 MAC-PHY。
      - label: 做法
        text: >-
          驱动对齐内核里已有的 OA TC6 框架，并<strong>给该框架补上硬件时间戳支持</strong>；
          自带 selftest 与 loopback 测试，ethtool 可读流量、RMON 与时间戳相关统计。
      - label: 效益
        text: >-
          车载以太网侧多了一颗可上游的 PHY。更值得留意的是硬件时间戳是加在
          <strong>框架</strong>上的——后面接进来的芯片都能复用，而不是各自实现一遍。
    relevance: >-
      和 GMSL2 属于同一类问题：车规链路的驱动，看的从来不是「能不能通」，
      而是时序、时间戳精度与诊断统计这三件事。
    link: "https://lore.kernel.org/netdev/<20261009-s2500-mac-phy-support-v9-0-dcefe1d0bf0d@onsemi.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/netdev/<20261009-stmmac-rx-mb-v5-0-c38fa4eaa138@oss.qualcomm.com>/"
        text: "net：stmmac 引入 XDP 接收多缓冲支持（v5，3 帖）"
        time: 10-09 18:26
      - link: "https://lore.kernel.org/netdev/<20261009182836.50631-1-ansuelsmth@gmail.com>/"
        text: "net：PCS 引入 fwnode 支持（v18，12 帖）——长跑系列，已到第十八版"
        time: 10-10 02:28
      - link: "https://lore.kernel.org/netdev/<20261009201455.1904698-1-omar@blockcast.net>/"
        text: "net：amt 修中继隧道 keying 与未认证 Request 导致的 DoS（v2，3 帖）"
        time: 10-10 04:14
      - link: "https://lore.kernel.org/netdev/<20261009183258.18624-1-mmc@linux.ibm.com>/"
        text: "net：ibmveth 修挂起、use-after-free 与 netpoll 竞态（v3，8 帖）"
        time: 10-10 02:33
      - link: "https://lore.kernel.org/netdev/<20261009123309.284193-1-krystianmkaniewski@gmail.com>/"
        text: "net：taprio 修「重放调度条目」引发的 RCU stall（v2，2 帖）"
        time: 10-09 20:33
      - link: "https://lore.kernel.org/netdev/<20261009122836.1534400-1-kyle.switch@motor-comm.com>/"
        text: "net：DSA 的 motorcomm 驱动加上 yt922x 支持（v12，5 帖）"
        time: 10-09 20:34

  - type: divider
    label: "📰 DRM 显示"
    kind: section
  - type: highlight
    title: "为 r000 固件腾地方：nova-core 把 GSP 命令队列拆成「与消息类型无关」"
    meta: "〔10-09 19:54 北京〕· [PATCH v4 00/10] gpu: nova-core: gsp: prepare the command queue for r000 dual-message types"
    points:
      - label: 定位
        text: >-
          nova-core 是 NVIDIA 开源内核驱动的 Rust 实现。GSP（GPU System Processor）固件
          通过命令队列与内核通信。
      - label: 做法
        text: >-
          目前只支持 RPC 一种命令类型，于是 RPC 的头部被直接嵌进了最底层的消息头里，
          两层被当成一层处理。r000 固件会引入第二种命令（GMC），照现状硬加，
          传输层代码就会在两套消息类型之间复制。这版把<strong>RPC 层整体抽到自己的子模块</strong>，
          让 <code>cmdq</code> 变成对消息类型完全无感的传输层。
      - label: 效益
        text: >-
          r000 的 GMC 支持可以干净地落进来。这也是「一个抽象撑不住第二种实现时该在哪一刀切开」
          的教科书式重构——先让现有实现退到正确的层次，再往里加新东西。
    relevance: >-
      Rust 驱动已经走到「重构既有抽象」这一步，而不是只做新驱动——
      这比新增一个 Rust 驱动更能说明 Rust for Linux 的成熟度。
    link: "https://lore.kernel.org/dri-devel/<20261009-cmdq-rpc-v4-0-c9ab8de1d3f2@nvidia.com>/"
  - type: highlight
    title: "MSM 的 DP / eDP 开始支持静态 HDR：先把「能送元数据、能点亮」这层做扎实"
    meta: "〔10-09 11:19 北京〕· [PATCH v2 00/20] drm/msm/dp: Add static HDR support for DP and eDP"
    points:
      - label: 定位
        text: >-
          DRM/KMS 的色彩管理链路——把用户空间提供的静态 HDR 元数据
          （<code>HDR_OUTPUT_METADATA</code>）经由 connector 属性送到 DP / eDP。
      - label: 做法
        text: >-
          用标准 KMS 静态 HDR 元数据加 BT.2020 RGB 信令，目标用例是 HDR10。
          顺带整理了一堆周边：让 max bpc 能在 connector state 分配之前注册、
          恢复 attached 属性的默认值、把 SDP 槽位泛化；
          并把运行时 PM 调用移出 connection lock、用 HPD 串行化流操作、确立 PHY 的电源归属。
      - label: 效益
        text: >-
          边界划得很清楚：DSC、动态 HDR 与色调映射都不在这一版。20 帖里有一半在建地基——
          这也解释了为什么「加个 HDR」需要 20 个补丁。
    relevance: >-
      面板与桥接侧的色彩改动，最终都要落到 connector state 与 atomic_check 上。
      昨天刚有 panel 进 atomic 状态的 RFC，这两条是同一件事的两头。
    link: "https://lore.kernel.org/dri-devel/<20261009-msm-dp-hdr10-v2-0-1835d4966da3@radxa.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/dri-devel/<20261009-claude-fixes-v14-0-cb743b3b973b@collabora.com>/"
        text: "DRM：Panfrost 修复合集到 v14（15 帖）——作者写明起点是 Claude 找出的问题，后续由 Sashiko 评审与维护者讨论不断扩围"
        time: 10-09 20:34
      - link: "https://lore.kernel.org/dri-devel/<20261009173152.2436195-1-zachary.mckevitt@oss.qualcomm.com>/"
        text: "DRM：drm_ras 新增 telemetry 节点类型，给 qaic 加速器上报遥测（3 帖）"
        time: 10-10 01:35
      - link: "https://lore.kernel.org/dri-devel/<20261009-my-fixups-v2-0-839e2bbe514d@gmail.com>/"
        text: "DRM：nouveau 修三处空指针解引用（v2，3 帖）"
        time: 10-10 01:44
      - link: "https://lore.kernel.org/dri-devel/<179152903254.1726604.8785647683993800694@yahoo.com>/"
        text: "DRM：vkms 支持立体（HDMI 3D）模式的 RFC——让虚拟显示能当 3D 接收端，供合成器与 IGT 测试用"
        time: 10-09 14:57
      - link: "https://lore.kernel.org/dri-devel/<20261009-fp6-panel-v4-0-7c3819664778@fairphone.com>/"
        text: "DRM：Novatek NT37705 面板驱动（Fairphone 6）到 v4（4 帖）"
        time: 10-09 19:25

  - type: divider
    label: "📰 media 视频采集"
    kind: section
  - type: highlight
    title: "两颗 GalaxyCore 传感器进主线：GC5035 与 GC8034，先只做 ACPI"
    meta: "〔10-09 15:27 北京〕· [PATCH 0/3] media: Add GalaxyCore GC5035 and GC8034 sensor drivers"
    points:
      - label: 定位
        text: >-
          V4L2 传感器子层。这两颗是 raw Bayer 传感器，都出现在 CHUWI Hi10 X1
          （Intel N100 / Alder Lake-N 平板）上：GC5035 是 500 万像素前置、2 lane CSI-2、
          ACPI HID <code>GCTI5035</code>；GC8034 是 800 万像素后置、4 lane、<code>GCTI8034</code>。
      - label: 做法
        text: >-
          两个驱动加 IPU6 侧 ipu-bridge 的匹配条目。作者明确说明<strong>只做 ACPI</strong>——
          手头没有搭载这两颗传感器的设备树平台，所以不写自己无法验证的 binding。
      - label: 效益
        text: >-
          Intel 平板这类「小众传感器 + ACPI 枚举」的缺口补上一个样本。
          如果你要在别的 SoC 上移植类似 sensor，这两份驱动的上电时序、时钟与寄存器序列可以直接当参照。
    relevance: >-
      传感器是整条 camera 链路的源头。新传感器驱动最值得看的从来不是寄存器表，
      而是 probe 顺序、电源域与 clock 的处理方式——那才是移植时真正会踩的地方。
    link: "https://lore.kernel.org/linux-media/<20261009072733.39877-1-nicfio@gmail.com>/"
  - type: highlight
    title: "i.MX 的 MIPI CSIS 补上 YUYV：同一份 CSI-2 数据，少一次格式转换"
    meta: "〔10-09 18:54 北京〕· [PATCH] media: imx-mipi-csis: add support for MEDIA_BUS_FMT_YUYV8_1X16（NXP）"
    points:
      - label: 定位
        text: >-
          media bus format 是「传感器 / 桥接芯片与 CSI 接收端之间的约定格式」。
          i.MX 的 CSIS 驱动此前只认 <code>UYVY8_1X16</code>，不认 <code>YUYV8_1X16</code>。
      - label: 做法
        text: >-
          两者用的是同一个 CSI-2 YUV422 8-bit 数据类型与 16-bit 并行总线宽度，
          差别只在分量顺序，所以补一张格式表就够了。
      - label: 效益
        text: >-
          输出 YUYV 的 sensor 或桥接芯片可以直接接到 i.MX CSIS，
          不必再插一级格式转换——转换意味着一次内存搬运加一次 CPU 开销。
    relevance: >-
      「同一个 DT、只差分量顺序」这种坑在任何 SoC 的 CSI 接收端都会遇到，
      排查时通常表现为颜色错位而不是报错。
    link: "https://lore.kernel.org/linux-media/<20261009-csis_sam-v1-1-81f2b0fb76ef@oss.nxp.com>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-media/<aslsXPVJIuYRrgKv@kekkonen.localdomain>/"
        text: "media：int3472 的 GPIO 类型命名与 Intel Windows 驱动不一致——0x0f / 0x10 / 0x11 该不该给正式名字，改了会不会撞默认名"
        time: 10-10 06:36
      - link: "https://lore.kernel.org/linux-media/<20261009183700.71021-1-kulikeduard89@gmail.com>/"
        text: "media：Himax HM1092 单色近红外（NIR）传感器驱动（v6，2 帖）"
        time: 10-10 02:37
      - link: "https://lore.kernel.org/linux-media/<20261009093216.2205375-1-sakari.ailus@linux.intel.com>/"
        text: "media：ov05c10 清理与修复（v3，4 帖，Sakari Ailus）"
        time: 10-09 17:34
      - link: "https://lore.kernel.org/linux-media/<20261009-purwa_camss-v5-0-58c13dc7c4d2@oss.qualcomm.com>/"
        text: "media：Qualcomm CAMSS 增加 purwa 平台支持（v5，3 帖）"
        time: 10-09 16:11
      - link: "https://lore.kernel.org/linux-media/<20261009165248.56440-1-walid.badar@gmail.com>/"
        text: "media：uvcvideo 处理「从 bulk URB 中间开始」的载荷"
        time: 10-10 00:53

  - type: divider
    label: "📰 fs 文件系统"
    kind: section
  - type: highlight
    title: "ext4 的缓冲 I/O 换到 iomap：v7 发出时，v6 已经合进 ext4 dev 分支"
    meta: "〔10-09 18:37 北京〕· [PATCH v7 00/31] ext4: use iomap for regular file's buffered I/O path（Zhang Yi / Huawei）"
    points:
      - label: 定位
        text: >-
          缓冲 I/O 路径。ext4 至今走 buffer_head，而 <code>iomap</code> 是新一代文件系统的
          通用 I/O 框架（XFS 已经在用）——把「一次 I/O 覆盖哪些块、怎么映射」这件事从各文件系统
          自己实现的 buffer_head 循环里抽出来。
      - label: 做法
        text: >-
          v7 相比 v6 没有大改：修 Sashiko 指出的 bug、补 commit message 与注释以避免误报、
          少量优化，并基于 7.3-rc4 重基。作者在 cover letter 里顺带说明——
          <strong>v6 已经被合进 ext4 dev 分支</strong>，如果维护者希望后续补丁单独发，说一声即可。
      - label: 效益
        text: >-
          这条转换已经过半。对读者来说，31 帖的粒度展示了「把一条 I/O 路径换框架」实际要动多少东西：
          读、写、回写、DAX、以及一堆边角语义。
    relevance: >-
      iomap 是内核里少数几个「跨文件系统统一 I/O」的成功抽象。
      buffer_head 到 iomap 的迁移，和 DRM 从旧模式设置切到 atomic 是同一类工程。
    link: "https://lore.kernel.org/linux-fsdevel/<20261009103033.2920530-1-yi.zhang@huaweicloud.com>/"
  - type: highlight
    title: "块设备的九个修复：CONFIG_BUFFER_HEAD=n 下，mmap 写会被静默丢弃"
    meta: "〔10-10 00:50 北京〕· [PATCH v6 0/9] block device fixes for large block sizes, IOCB_NOWAIT, and direct I/O"
    points:
      - label: 定位
        text: >-
          块设备自身的 file_operations（不是其上文件系统的那套）——大块大小、
          <code>IOCB_NOWAIT</code> 与直接 I/O 三条路径。
      - label: 做法
        text: >-
          第 1 帖修 <code>CONFIG_BUFFER_HEAD=n</code> 时 mmap 写入被<strong>静默丢弃</strong>；
          第 2、3 帖在直接 I/O 写回退路径与 splice 读路径上拿 <code>i_rwsem</code>——
          这两条会和 <code>set_blocksize()</code> 修改 mapping 的最小 folio order 抢跑；
          第 4 帖让缓冲读路径真正遵守 <code>IOCB_NOWAIT</code> 而不是无视它。
      - label: 效益
        text: >-
          这一类「只在某个 config 或某个 block size 下才现形」的静默丢数据，
          是人工评审最难发现的一种。
      - label: 下一步
        text: >-
          作者把来源写得很清楚：前两个是 Sashiko 在评审 RWF_DONTCACHE 系列时发现的，
          第四、五个来自对 v1 的评审，其余是<strong>让 LLM 去找同类问题</strong>找出来的。
          每个问题都有复现，修复都验证过。
    relevance: >-
      这是本期第三处「AI 站在内核协作链上」的证据（另两处在 DRM 与 mm 的动态里）。
      值得注意的不是 AI 找出了 bug，而是作者如实标注了每个 bug 的来源。
    link: "https://lore.kernel.org/linux-fsdevel/<20261009-blkdev-fixes-v6-0-307939c387df@columbia.edu>/"
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-fsdevel/<010001a1222f66ba-0c745f29-d4fe-4862-93ff-1db2055b05fc-000000@email.amazonses.com>/"
        text: "fs：exfat 回归——被删目录的陈旧 dentry 缓冲会覆盖新文件的数据（7.2）"
        time: 10-10 03:41
      - link: "https://lore.kernel.org/linux-fsdevel/<20261009171704.11379-1-almaz.alexandrovich@paragon-software.com>/"
        text: "fs：ntfs3 一批修复与重构（11 帖），含零簇计数、对齐的 hole punching 拒绝、ugm 挂载选项"
        time: 10-10 01:17
      - link: "https://lore.kernel.org/linux-fsdevel/<20261009213132.997851-1-slava@dubeyko.com>/"
        text: "fs：hfsplus 修时间戳回绕，并支持 2040 年之后的时间（v2，3 帖）"
        time: 10-10 05:31
      - link: "https://lore.kernel.org/linux-fsdevel/<20261009095754.430875-1-l.sichert@proxmox.com>/"
        text: "fs：块设备回写时跨缓冲区与 folio 合并 bio 的 RFC（4 帖）"
        time: 10-09 17:58

  - type: divider
    label: "📰 其余板块"
    kind: section
  - type: more
    title: "今日动态"
    items:
      - link: "https://lore.kernel.org/linux-block/<20261009090945.1504194-1-dlemoal@kernel.org>/"
        text: "block：存储元件「下线（depopulation）」支持到 v4（9 帖，Damien Le Moal）——给分区块设备定义一组通用操作，SCSI 磁盘实现、zloop 做模拟"
        time: 10-09 17:09
      - link: "https://lore.kernel.org/linux-block/<20261009041727.3170811-1-linlin.zhang@oss.qualcomm.com>/"
        text: "block/virtio：virtio-blk 加内联加密支持（v4，2 帖）——给客户机的块设备做 FBE 虚拟化"
        time: 10-09 12:17
      - link: "https://lore.kernel.org/lkml/<20261009212501.971158-1-linmag7@gmail.com>/"
        text: "arch：alpha 补完 direct-mm 的 TLB shootdown 修复（v3，2 帖）"
        time: 10-10 05:25
      - link: "https://lore.kernel.org/linux-arch/<20261009102215.3360863-1-shradhagupta@linux.microsoft.com>/"
        text: "arch：Hyper-V 的 VMBus 在 kexec 时从 syscore shutdown 做清理（v4，2 帖）"
        time: 10-09 18:22
      - link: "https://lore.kernel.org/linux-pci/<20261009154034.82321-1-pavel.e.popov@intel.com>/"
        text: "PCI：允许在 VMware 与 Hyper-V 客户机的 Intel 宿主上做 P2PDMA（2 帖）"
        time: 10-09 23:40
      - link: "https://lore.kernel.org/linux-security-module/<20261009111212.1516243-1-roberto.sassu@huaweicloud.com>/"
        text: "LSM：EVM 检查 crypto_shash 各函数的返回值（Roberto Sassu）"
        time: 10-09 19:29
      - link: "https://lore.kernel.org/lkml/<20261009220001.196762128-1-tj@kernel.org>/"
        text: "sched：sched_ext 修「延迟重入队用到已销毁的用户 DSQ」的 use-after-free（for-7.3-fixes，Tejun Heo）"
        time: 10-10 06:01

  - type: divider
    label: "📌 机制雷达：4 条跨域信号"
    kind: primary
  - type: toc
    items:
      - label: "Rust 侧 DRM 作业队列"
        text: >-
          <code>drm::JobQueue</code> 的 RFC 走到 v5：给 Rust 驱动一套提交作业、等依赖 fence、
          跑回调的抽象。这版把 <code>Revocable&lt;JobQueueInner&gt;</code> 加回来
          （队列在依赖 fence 还没信号时被 drop 会死锁），并<strong>改为不持锁调用 <code>run_job()</code></strong>
          ——因为 <code>run_job()</code> 可能睡眠。顺带把 <code>DriverFence</code> drop 里的
          <code>call_rcu()</code> 换成 <code>synchronize_rcu()</code>：只需要保证一个 RCU 宽限期，
          不需要异步。
          <a href="https://lore.kernel.org/linux-media/<20261009191124.1022902-2-phasta@kernel.org>/">原文</a>
      - label: "blk-mq 的 tag set 进 debugfs"
        text: >-
          块层 debugfs 能看到请求队列与硬件上下文，却看不到它们共享的 <strong>tag set</strong>。
          这条加一个 tag set 视图（配置、CPU 映射、驱动 tag），并从请求队列目录链过去。
          前置改动更关键：把驱动 tag 的分配与回收<strong>从单个请求队列的初始化挪到 tag set 级别</strong>，
          这样 debugfs 里的 tag 文件才能有可协调的生命周期。
          <a href="https://lore.kernel.org/linux-block/<20261009030111.57784-1-lei.chen@smartx.com>/">原文</a>
      - label: "sched_ext 再加一个回调"
        text: >-
          <code>ops.sub_child_ecaps_updated()</code>：当子调度器的 CPU 性能目标发生撤销时通知父调度器。
          同一天还有一条 sched_ext 的 use-after-free 修复进了 for-7.3-fixes——
          一个已销毁的用户 DSQ 被延迟重入队再次使用。新调度器类还在快速补边界。
          <a href="https://lore.kernel.org/lkml/<2b60fc415bbe7299f8637fb19724d769@kernel.org>/">原文</a>
      - label: "客户机里也能做 P2PDMA 了"
        text: >-
          P2PDMA（设备对设备直接 DMA）此前只在裸金属上可靠。这条允许在 VMware 与 Hyper-V 的
          客户机里、且宿主是 Intel 时启用：靠的是宿主会把这些客户机的物理地址映射直通，
          于是「设备 A 写的地址设备 B 能读」这个前提成立。
          <a href="https://lore.kernel.org/linux-pci/<20261009154034.82321-1-pavel.e.popov@intel.com>/">原文</a>

  - type: divider
    label: "📖 本期概念速查"
    kind: primary
  - type: toc
    items:
      - label: "VMA / VM_SPECIAL"
        text: >-
          VMA 是「一段虚拟地址空间的配置」，mm 与驱动共用。
          <code>VM_SPECIAL</code> 是历史上打包了 <code>VM_IO | VM_DONTEXPAND | VM_PFNMAP | VM_DONTDUMP</code>
          的复合标志，本期被彻底删除，改用描述行为的谓词函数。
      - label: "RCU 路径行走（rcu pathwalk）"
        text: >-
          打开文件时查找路径的一种快速模式：<strong>不加锁</strong>、只用 RCU 保护地走 dentry。
          代价是它读到的任何对象都必须等一个 RCU 宽限期之后才能释放——本期八个文件系统没做到这点。
      - label: "PLOAM / OMCI"
        text: >-
          PON 的两层控制协议。PLOAM 是 MAC 层的激活与密钥管理（G.984.3 定义了它的状态机），
          OMCI 是更上层的设备管理协议。本期 PON 子系统把前者放进 MAC 驱动、后者交给用户态。
      - label: "PSP / rekey"
        text: >-
          PSP（Packet Security Protocol）是内核里给 TCP 加密、可硬件卸载的协议栈。
          rekey 指设备密钥轮换后重新协商连接密钥——本期把 rx / tx 两个方向都实现了。
      - label: "iomap"
        text: >-
          文件系统的通用 I/O 框架：把「这次 I/O 覆盖哪些块、怎么映射到存储」抽成公共逻辑，
          取代各文件系统自己写的 buffer_head 循环。XFS 已用，ext4 正在迁移（v7，31 帖）。
      - label: "10Base-T1S / MAC-PHY"
        text: >-
          10Base-T1S 是 IEEE 802.3cg 定义的单对以太网，面向车载与工业。
          MAC-PHY 指把 MAC 集成进收发器内部的芯片形态（本期是 onsemi S2500）。

  - type: closing
    tagline: "如果对你有用，点个赞，或留言聊聊你最关心的板块。"
    source: "数据来源：lore.kernel.org（全内核 13 列表）· 北京时间"
---
