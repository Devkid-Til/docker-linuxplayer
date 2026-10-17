---
title: "术语卡：dma_buf 这一族——同一个词根，五种角色"
date: "2026-10-17"
desc: "今日重点：术语卡——从内核树 kerneldoc 与今天的 docs 补丁里学 dma_buf 家族：dma_buf（东西）、dma_buf_attachment（关系）、dma_fence（同步）、dma_resv（容器）、dma_buf_io（今天新长出的一支）。定义全部逐字取自原文。"
column: "english"
focus: "术语卡"
tags: ["术语卡", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：🏷️ 术语卡</strong>——前几篇术语卡学的是「一组互不相关的词」，
      或者「一个概念的两个名字」。今天换个学法：<strong>一个词根长出来的一族词</strong>。
      <code>dma_buf</code> 家族五个成员全都以 dma_ 开头，长得像亲兄弟，
      但它们在句子里干的事完全不同。<strong>认角色，比背中文译名有用得多</strong>——
      因为翻译会变，角色不会。
  - type: divider
    label: "📖 原文（真实定义，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      This represents a shared buffer, created by calling dma_buf_export(). The
      userspace representation is a normal file descriptor, which can be created
      by calling dma_buf_fd().
  - type: quote
    text: >-
      This is a container for dma_fence objects which needs to handle multiple
      use cases.
  - type: paragraph
    text: >-
      出处：前一段取自内核树 <code>include/linux/dma-buf.h</code> 的 kerneldoc，后一段取自
      <code>include/linux/dma-resv.h</code>。另有一支是<strong>今天刚被文档化的</strong>——
      Pavel Begunkov 的 <code>[PATCH v2 2/2] dma-buf-io: document dma_buf_io_init_map</code>。
      每条定义下方都给了溯源链接。
  - type: divider
    label: "🏷️ 角色一：dma_buf —— 那个「东西」"
    kind: section
  - type: highlight
    title: "dma_buf（共享缓冲区对象）"
    meta: "家族里唯一一个「实体」"
    points:
      - label: "原文定义"
        text: "This represents a shared buffer, created by calling dma_buf_export(). The userspace representation is a normal file descriptor, which can be created by calling dma_buf_fd()."
      - label: "中文与角色"
        text: "一个跨驱动共享的缓冲区对象。关键在第二句：<b>它在用户态就是一个普通的文件描述符</b>——所以用户态可以对它 read/write、可以传给别人、可以被 poll。它是这一族里唯一一个<b>「东西」</b>：其余四个都是围绕它派生出来的关系、状态或容器。"
      - label: "顺带一句，作者当场把两件事分开了"
        text: "定义紧接着还有一句：Device DMA access is handled by the separate &struct dma_buf_attachment.（设备侧的 DMA 访问由另一个对象单独负责。）<b>这句话就是这一族词的分界线</b>：dma_buf 是「这块内存」，attachment 是「某设备对它的挂接」。"
      - label: "溯源"
        text: "include/linux/dma-buf.h · <a href=\"https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/linux/dma-buf.h\">git.kernel.org</a>"
  - type: divider
    label: "🏷️ 角色二：dma_buf_attachment —— 那段「关系」"
    kind: section
  - type: highlight
    title: "dma_buf_attachment（设备—缓冲区挂接）"
    meta: "一个设备一份，不是缓冲区的一部分"
    points:
      - label: "原文定义"
        text: "This structure holds the attachment information between the dma_buf buffer and its user device(s). The list contains one attachment struct per device attached to the buffer. / An attachment is created by calling dma_buf_attach(), and released again by calling dma_buf_detach()."
      - label: "中文与角色"
        text: "它描述的不是内存，而是<b>「某个设备挂到了这块缓冲区上」这件事</b>。注意 one attachment struct per device——<b>一个设备一份</b>，所以同一个 dma_buf 被三个设备用，就有三个 attachment。中文常译「附件」，但更准的理解是「挂接关系」：它存在的前提是两边都在。"
      - label: "为什么值得单独记"
        text: "新手最容易把 attachment 当成缓冲区的一部分去理解，于是看不懂「为什么 detach 之后 buffer 还在」。<b>东西和关系是两种生命周期</b>——记住这一条，dma-buf 的一半代码就顺了。"
      - label: "溯源"
        text: "include/linux/dma-buf.h · <a href=\"https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/linux/dma-buf.h\">git.kernel.org</a>"
  - type: divider
    label: "🏷️ 角色三：dma_fence —— 那份「同步」"
    kind: section
  - type: highlight
    title: "dma_fence（软件同步原语）"
    meta: "回答「这件事做完了没」"
    points:
      - label: "原文定义"
        text: "struct dma_fence - software synchronization primitive"
      - label: "中文与角色"
        text: "内核里的软件同步原语。名字叫 fence（栅栏），语义是<b>「跨过这道栅栏，说明前面的活儿干完了」</b>——它不是数据，是一个完成信号。所以它既不描述内存也不描述设备，只描述<b>进度</b>。今天日报里 Rust 的 DRM JobQueue 那几封信全都在修 DmaFence 的生命周期，可见这一类对象最容易出错的地方就是「什么时候能把它释放掉」。"
      - label: "记忆钩子"
        text: "看到 fence，问自己「<b>这道栅栏拦的是什么操作</b>」，而不是「它里面装了什么数据」。"
      - label: "溯源"
        text: "include/linux/dma-fence.h · <a href=\"https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/linux/dma-fence.h\">git.kernel.org</a>"
  - type: divider
    label: "🏷️ 角色四：dma_resv —— 那个「容器」"
    kind: section
  - type: highlight
    title: "dma_resv（预留对象 / reservation object）"
    meta: "把散落的 fence 收进一个对象"
    points:
      - label: "原文定义"
        text: "This is a container for dma_fence objects which needs to handle multiple use cases."
      - label: "中文与角色"
        text: "内核原话就是 <b>container for dma_fence objects</b>——它是一个专门用来装 fence 的容器。一块缓冲区上可能同时排着好几个未完成的活儿（GPU 在渲染、显示控制器在读），这些 fence 需要一个地方统一管理，dma_resv 就是那个地方。名字里的 resv 来自 reservation（预留），因为它最早是从 TTM 显存管理里长出来的。"
      - label: "记忆钩子"
        text: "这一族的角色分工可以一句话串起来：<b>dma_buf 是东西，attachment 是关系，fence 是进度，resv 是装进度的盒子。</b>"
      - label: "溯源"
        text: "include/linux/dma-resv.h · <a href=\"https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/include/linux/dma-resv.h\">git.kernel.org</a>"
  - type: divider
    label: "🏷️ 角色五：dma_buf_io —— 今天新长出的一支"
    kind: section
  - type: highlight
    title: "dma_buf_io / dma_buf_io_init_map（新支）"
    meta: "今天刚被文档化，是这一族的最新成员"
    points:
      - label: "原文定义"
        text: "Importer's helper that initialises @map for the provided I/O context and scatter-gather table. The importer should call it once for each map on creation."
      - label: "中文与角色"
        text: "这一支解决的是<b>「让 dma_buf 直接当 I/O 缓冲用」</b>的场景（同一天还有 <code>fs: support dma-buf backed direct I/O</code> 和 <code>nvme/io_uring: enable dma-buf backed passthrough I/O</code> 两条 RFC 在推）。这里的 map 是一层新的映射对象，init_map 负责把它初始化好。<b>注意定义里的 importer</b>——dma-buf 世界把「提供缓冲的一方」叫 exporter、「使用缓冲的一方」叫 importer，这两个词值得单独记住。"
      - label: "怎么用"
        text: "读新 API 的 kerneldoc 时，<b>先找主语是谁</b>：这里 Importer's helper 一句话就告诉你「这是给 importer 用的」，比读函数签名快。"
      - label: "溯源"
        text: "今天的 docs 补丁 · <a href=\"https://lore.kernel.org/linux-media/&lt;a9fdfbe6e447ac583f4d3a3f981b203141a624c4.1792144609.git.asml.silence@gmail.com&gt;/\">lore.kernel.org</a>"
  - type: divider
    label: "✨ 辅助彩蛋：backing —— 最难直译的一个词"
  - type: highlight
    title: "backing scatter-gather table"
    meta: "别去查中文对应词，先问「它在支撑谁」"
    points:
      - label: "原句"
        text: "@sgt: [in] the backing scatter-gather table"
      - label: "中文与语境"
        text: "backing 直译是「背衬 / 支撑」，但它在内核英文里的实际含义是：<b>在背后真正提供数据或存储的那个东西</b>。同族还有 backing store（后端存储）、backing device（承载设备）、backing file（后备文件）。中文没有统一译法——硬译成「后端」在有些语境里会失真。<b>值得留意的是这处措辞本身</b>：同一个函数，描述句里写的是 the provided I/O context and scatter-gather table，而 @sgt 参数的说明里写的是 <b>the backing</b> scatter-gather table——<strong>同一个对象，正式描述里不加修饰，参数说明里才点明它是「底层支撑」</strong>。"
      - label: "怎么用"
        text: "看到 backing，<strong>不要找中文对应词，直接问一句：它在支撑谁</strong>。写作时想说「底层那个 XX」，backing 往往比 underlying 更贴：<b>underlying 强调层次关系，backing 强调「它在提供实质内容」</b>。"
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "用今天这一族词回答三问（英文作答）：① GPU 驱动要把一块 dma_buf 映射到自己的设备上做 DMA，它创建的是家族里哪个对象、用哪两个函数创建与释放？② 这块缓冲区上还排着别的驱动没做完的活，由哪个对象记录？它们的容器又是谁？③ 今天新文档化的那个函数，它的 @sgt 参数在注释里被称为什么（用原文的词）？"
    answer: "参考作答（仿写示范，非原文）：① It creates a dma_buf_attachment -- the list contains one attachment struct per device attached to the buffer; it is created by dma_buf_attach() and released by dma_buf_detach(). ② The outstanding work is recorded as dma_fence objects, described in the header as a software synchronization primitive; the container that manages those fences for a buffer is the dma_resv, which the header defines as a container for dma_fence objects. ③ The @sgt parameter is documented as the backing scatter-gather table -- the function description itself says only \"the provided I/O context and scatter-gather table\"."
    source: "Importer's helper that initialises @map for the provided I/O context and scatter-gather table. The importer should call it once for each map on creation. / @sgt: [in] the backing scatter-gather table"
    link: "https://lore.kernel.org/linux-media/<a9fdfbe6e447ac583f4d3a3f981b203141a624c4.1792144609.git.asml.silence@gmail.com>/"
  - type: closing
    tagline: "每日一句：When a family of names shares a root, learn the roles, not the translations — roles survive the next rename."
    source: "仿写示范"
---
