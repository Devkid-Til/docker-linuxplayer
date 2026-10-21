---
title: "写作：问题陈述写成一条因果链——现象、排除、根因、证据"
date: "2026-10-21"
desc: "今日重点：写作——拆一封 qcom-cci 封面信的四步问题陈述：现象、排除、根因、证据。"
column: "english"
focus: "写作"
tags: ["写作", "地道表达"]
blocks:
  - type: hook
    text: >-
      <strong>今日重点：✍️ 写作</strong>——补丁写得对不对，维护者先看问题陈述信不信得过。
      今天用一封真实的 i2c/qcom-cci 封面信，拆<strong>四步写法</strong>：
      现象写成可以照着复现的、排除写成有名有姓的、根因写成一条环环相扣的链、证据带上分母。
      最后给你一组事实，练一段三句话的根因陈述。
  - type: divider
    label: "✍️ 原文（真实邮件，逐字引用）"
    kind: primary
  - type: quote
    text: >-
      On the Lenovo Yoga Slim 7x (X1E80100) the OV02C10 front camera on CCI1
      master 1 fails to start whenever it is opened again within about a
      second of being closed. The first register write times out ("master 1
      queue 0 timeout") and the stream does not start.
  - type: quote
    text: >-
      Two attempts so far treated this as a sensor power-up problem. One gave
      the ov02c10 driver a longer settle time, the other a minimum off time for
      the camera rails through regulator-off-on-delay-us [1]. Neither is
      needed.
  - type: quote
    text: >-
      The sensor holds SCL and SDA low while it is powered down. If the CCI
      controller stays clocked from then until its next transfer, the master
      no longer starts transfers. The queue stays on its first command, no
      interrupt arrives, and only the reset in cci_run_queue()'s timeout path
      brings it back.
  - type: paragraph
    text: >-
      出处：linux-media，Birk Skyum 的封面信
      <code>[PATCH 0/2] i2c: qcom-cci: Recover after a target powers down under a running controller</code>，
      2026-10-20（UTC；北京时间 10-21 凌晨）。下面五张卡片引用的都是<strong>这封封面信里的原句</strong>，
      卡片下方给的是该句所在的邮件，点开即可对照。
  - type: divider
    label: "✍️ 第一步：现象要能验收"
    kind: primary
  - type: highlight
    title: "① 平台、触发条件、可观察结果，一句写完"
    meta: "让读者能照着复现，而不是只知道「有个 bug」"
    points:
      - label: "原句"
        text: >-
          On the Lenovo Yoga Slim 7x (X1E80100) the OV02C10 front camera on CCI1
          master 1 fails to start whenever it is opened again within about a
          second of being closed. The first register write times out ("master 1
          queue 0 timeout") and the stream does not start.
      - label: "拆解"
        text: >-
          主语是设备与操作——<b>the OV02C10 front camera on CCI1 master 1 fails to start</b>，
          不是「我发现一个 bug」。一句话里塞进了四样东西：
          <b>平台</b>（Lenovo Yoga Slim 7x / X1E80100）、<b>位置</b>（CCI1 master 1）、
          <b>触发条件</b>（opened again within about a second of being closed）、
          <b>结果</b>（fails to start）。<br>
          <b>within about a second</b> 是可操作的时间窗：维护者能拿这个参数去复现；
          <b>about</b> 又保留了不确定性，不把边界说成精确值。
          第二句把「失败」落到日志原文：<b>"master 1 queue 0 timeout"</b> 放在括号里，
          比转述「传输超时」有用得多——对方可以直接搜这行字符串。
      - label: "写法"
        text: >-
          现象句的模板：<b>平台 + 触发条件 + 可观察结果 +（可选）报错原文</b>。
          别写 「sometimes broken」，写清 <b>where / when / what</b>。
          一句话能让陌生人复现，现象段就合格了。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-1-birk.skyum@pm.me&gt;/">Birk Skyum，封面信，2026-10-20</a>
  - type: divider
    label: "✍️ 第二步：排除要指名道姓"
    kind: primary
  - type: highlight
    title: "② 先说别人试过什么，再下结论"
    meta: "Neither is needed. —— 三个词收束两个候选方案"
    points:
      - label: "原句"
        text: >-
          Two attempts so far treated this as a sensor power-up problem. One gave
          the ov02c10 driver a longer settle time, the other a minimum off time for
          the camera rails through regulator-off-on-delay-us [1]. Neither is
          needed.
      - label: "拆解"
        text: >-
          这一段的结构是<b>「先列，再否」</b>。
          先承认此前的判断：<b>Two attempts so far treated this as a sensor power-up problem</b>
          （到目前为止有两次尝试，都把它当成 sensor 上电问题）。
          然后给两个尝试各一个具体做法：一个给了更长的 settle time，另一个通过
          <b>regulator-off-on-delay-us</b> 给摄像头电源轨设了最小关闭时间，并附上 <b>[1]</b> 的链接。
          最后用三个词收束：<b>Neither is needed.</b>（两个都不需要）。<br>
          力度在这里：不是 「probably not needed」，是 <b>not needed</b>。
          作者已经找到了别的根因，才敢把话说到这个份上。
      - label: "为什么这样写"
        text: >-
          维护者最怕「又一个猜测」。把既有尝试列出来、说明为什么不够，
          等于替评审做了一次排除法；<b>[1]</b> 既给对方台阶，也让自己的判断可核对。
          注意顺序：<strong>先有证据，再下断言</strong>。
          没有后面的根因段落，这句 <b>Neither is needed.</b> 就只是冒犯。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-1-birk.skyum@pm.me&gt;/">Birk Skyum，封面信，2026-10-20</a>
  - type: divider
    label: "✍️ 第三步：根因要一环扣一环"
    kind: primary
  - type: highlight
    title: "③ 三句、三个主语、一条链"
    meta: "条件 → 机制 → 结果链，每句都能单独指认"
    points:
      - label: "原句"
        text: >-
          The sensor holds SCL and SDA low while it is powered down. If the CCI
          controller stays clocked from then until its next transfer, the master
          no longer starts transfers. The queue stays on its first command, no
          interrupt arrives, and only the reset in cci_run_queue()'s timeout path
          brings it back.
      - label: "拆解"
        text: >-
          三句话，按因果顺序排：
          ① <b>The sensor holds SCL and SDA low while it is powered down.</b>——条件。
          谁在做什么：sensor 断电时把两根信号线保持在低电平。
          ② <b>If the CCI controller stays clocked from then until its next transfer,
          the master no longer starts transfers.</b>——机制。
          <b>If …</b> 把前一句接成条件；<b>stays clocked</b> 是状态持续，不是一次动作。
          ③ <b>The queue stays on its first command, no interrupt arrives, and only the
          reset in cci_run_queue()'s timeout path brings it back.</b>——结果链。
          三个分句按时间顺序走：queue 停在第一条命令 → 没有中断 → 只有超时路径里的 reset 能救回来。
      - label: "写法"
        text: >-
          根因段落别用含糊的 <b>it</b>。每一句的主语都要能让读者指认——
          sensor、controller、queue，各归各位。
          写完做个检查：把三句拆开单独读，每句还能不能回答「谁对谁做了什么」？
          能，链条就立住了；不能，说明中间缺了一环。
      - label: "顺带"
        text: >-
          <b>holds SCL and SDA low</b> 是硬件行话：把信号线保持在低电平，中文常说「拉低」。
          <b>brings it back</b> 在这里是「让控制器恢复工作」，不是「带回来」。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-1-birk.skyum@pm.me&gt;/">Birk Skyum，封面信，2026-10-20</a>
  - type: divider
    label: "✍️ 第四步：证据要带分母"
    kind: primary
  - type: highlight
    title: "④ 19/20 与 0/20——不写「显著改善」"
    meta: "对照组 + 分母 + 测试边界，三样齐了才叫证据"
    points:
      - label: "原句"
        text: >-
          Tested on the Yoga with the driver from i2c/i2c-next, built as a module
          for a 7.2.8-based kernel whose device tree has no off-on delay for the
          camera rails. The CCI clock runs at 37.5 MHz there.
      - label: "数据"
        text: >-
          表格本身没有形容词，只有分母和对照：修之前 20 次里失败 19 次，
          修之后 20 次里失败 0 次。读者不需要相信作者的判断，自己看数就行。
      - label: "边界条件"
        text: >-
          <b>7.2.8-based kernel</b>、<b>built as a module</b>、
          <b>device tree has no off-on delay</b>、<b>CCI clock runs at 37.5 MHz</b>——
          这些不是废话，是让别人判断「我的环境能不能复现」的参数。
          少了它们，0/20 只是一个漂亮数字；有了它们，别人知道该在什么条件下验证。
      - label: "写法"
        text: >-
          证据 = <b>对照组 + 分母 + 测试边界</b>。
          能写数字就不写形容词：<b>19/20 → 0/20</b> 胜过 「much more reliable」。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-1-birk.skyum@pm.me&gt;/">Birk Skyum，封面信，2026-10-20</a>
  - type: code
    lang: "text"
    text: |-
      pause          0.05 s  0.1 s  0.2 s  0.5 s  1 s
      failed before   19/20  19/20  19/20  19/20  16/20
      failed after     0/20   0/20   0/20   0/20   0/20
  - type: divider
    label: "✍️ 收尾：把动作写成一句祈使句"
    kind: primary
  - type: highlight
    title: "⑤ 一句一个补丁，动词开头"
    meta: "问题讲完，维护者要知道你到底要我合什么"
    points:
      - label: "原句"
        text: >-
          Patch 1 resets the controller on every runtime resume. Patch 2 suspends
          it 50 ms after its last transfer.
      - label: "拆解"
        text: >-
          两句，一句一个补丁，动词开头（<b>resets</b> / <b>suspends</b>），不解释、不重复。
          读者读完问题陈述，需要知道的下一件事就是「你改了什么」——这里给的就是这个。
      - label: "对照"
        text: >-
          Patch 1 的 commit message 把同一件事写得更紧：
          <b>Reset the controller on every runtime resume, as the timeout path does.</b>
          祈使句标题 + <b>as the timeout path does</b> 说明已有先例——
          不是引入新机制，是把超时路径里已有的做法搬到 resume 路径。
          最后这半句降低了维护者的心理成本：改动有据可循，不是凭空发明。
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-1-birk.skyum@pm.me&gt;/">封面信的动作段（Birk Skyum，10-20）</a>；
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-2-birk.skyum@pm.me&gt;/">Patch 1 的 commit message（Birk Skyum，10-20）</a>
  - type: divider
    label: "✨ 辅助彩蛋：三个可以顺手拿走的短语"
  - type: highlight
    title: "短句收束、拉低一根线、救回一个控制器"
    meta: "都是真实原文里的用法，不是仿写"
    points:
      - label: "① Neither is needed."
        text: >-
          两个都不需要。<b>neither</b> 指前文刚列出的两者，短句一锤定音。
          适合在列完两个候选方案后收束；注意它比 <b>Neither of them may be needed</b> 硬得多，
          用之前先确认证据够。
      - label: "② holds SCL and SDA low"
        text: >-
          把 SCL 和 SDA 保持在低电平。硬件语境里 <b>hold a line low</b> / <b>drive a line low</b>
          都是常见说法，中文对应「拉低」；<b>low</b> 在这里是电平状态，不是「低电量」。
      - label: "③ brings it back"
        text: >-
          让控制器恢复工作。<b>bring sth back</b> 在这里不是「带回来」，而是「把卡死的状态救回来」；
          同义可写 <b>recovers it</b>。
      - label: "记忆钩子"
        text: >-
          <b>neither 收束两个，hold low 拉低一根线，bring back 救回一个控制器。</b>
      - label: "溯源"
        text: >-
          <a href="https://lore.kernel.org/linux-media/&lt;20261020193946.51478-1-birk.skyum@pm.me&gt;/">三句均出自同一封封面信，2026-10-20</a>
  - type: divider
    label: "✍️ 今日练习"
    kind: section
  - type: exercise
    text: "下面是从这组补丁里摘出的事实。请写成一段三句的根因陈述：第 1 句写触发条件，第 2 句写控制器侧机制，第 3 句写可观察结果。要求每句主语明确，不用含义不清的 it。事实：OV02C10 每次停止推流都会断电；断电的 sensor 把 SCL/SDA 拉低；控制器时钟从那时起一直开着；下一次传输时 queue 停在第一条命令；没有中断；只有 100 ms 超时路径里的 reset 能恢复。"
    answer: "参考作答（仿写示范，非原文）：The OV02C10 is powered down whenever it stops streaming, and the unpowered sensor holds SCL and SDA low. If the CCI controller stays clocked until the next transfer, the master stops starting transfers: the queue remains on its first command and no interrupt arrives. Only the reset in the 100 ms timeout path of cci_run_queue() recovers the bus. 写法要点：第 1 句用 and 把「断电」与「拉低」接成因果前件；第 2 句用 If … 引出控制器侧机制，冒号后展开两个可观察结果；第 3 句用 Only … 把恢复路径收窄到一个动作，对应原文的 only the reset … brings it back。"
    source: "The sensor holds SCL and SDA low while it is powered down. If the CCI controller stays clocked from then until its next transfer, the master no longer starts transfers. The queue stays on its first command, no interrupt arrives, and only the reset in cci_run_queue()'s timeout path brings it back."
    link: "https://lore.kernel.org/linux-media/<20261020193946.51478-1-birk.skyum@pm.me>/"
  - type: closing
    tagline: "每日一句：Write the failure so it can be reproduced; write the cause so it can be checked."
    source: "仿写示范"
---
