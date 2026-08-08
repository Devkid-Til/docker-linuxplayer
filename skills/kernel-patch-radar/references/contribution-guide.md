# 内核补丁提交指南 — 署名与规范

**何时读**：提交第一颗补丁前**必读**。这份不是「怎么写好代码」，是「怎么把补丁送进内核」的硬规范——格式错，维护者不会看内容。

## 一、为什么需要这套规范（Why）

Linux 内核每天几百封补丁，维护者靠**格式**快速判断「这封能不能进入 review 流程」。格式是门禁：`checkpatch.pl` 是机器门禁，Signed-off-by 是法律门禁，子系统前缀是分流。**格式对 = 你被认真对待；格式错 = 直接被忽略。**

## 二、完整署名格式（真实示例）

取自 linux-media 上一条真实补丁（imx415 修复）：

```
Subject: [PATCH v2 2/2] media: i2c: imx415: Release runtime PM reference on VBLANK error
From:   Narasimharao Vadlamudi <ahmisaranrao@gmail.com>
Cc:     michael.riesch@collabora.com,
Cc:     stable@vger.kernel.org
Reviewed-by: Michael Riesch <michael.riesch@collabora.com>
Signed-off-by: Narasimharao Vadlamudi <ahmisaranrao@gmail.com>
```

| 字段 | 格式 | 谁写 |
|---|---|---|
| git **Author** | `Full Name <email>` | 提交者，**实名** |
| **Subject 前缀** | `[PATCH v2 2/2]` | v2=第二版；2/2=系列第 2 颗共 2 颗 |
| **子系统前缀** | `media: i2c: imx415:` | 让补丁分流到维护者 |
| **Reviewed-by** | `Reviewed-by: 审核者 <email>` | 维护者/审核者在邮件列表里加的 tag |
| **Signed-off-by** | `Signed-off-by: 提交者 <email>` | 提交者自己，**必填** |

## 三、Signed-off-by 与 DCO（为什么是法律认证）

`Signed-off-by:` 是 **Developer's Certificate of Origin（DCO）** 的签名。签名者证明：
1. 代码是我写的，或我有权提交（不剽窃、不侵权）
2. 我同意以 GPL 许可分发
3. 需要时我可以说明来源

**为什么实名**：法律效力需要真实身份。内核**不接受网名/昵称/GitHub 用户名**——`git config user.name` 必须是你真名。

**为什么可能是多行链**：补丁经手维护者/被 backport 到 stable 时，每经手一人追加一行 Signed-off-by，形成来源追溯链。

## 四、Subject 与 commit message 规范

- **Subject 行**：`[PATCH vN a/b] 子系统: 一句话描述`，≤ 75 字符，祈使语气（"Fix..." 而非 "Fixed..."）
- **正文**：为什么改（痛点）→ 怎么改（方案）→ 影响（可选），讲「为什么」比「干了啥」更重要（呼应本 skill 的六步弧线）
- 结尾空一行 + `Signed-off-by:` 收尾

## 五、tag 链（谁会在你的补丁上加 tag）

维护者审核时在邮件列表回复里加 tag，最终由维护者合入时收进 commit：
- `Reviewed-by:` 审核通过
- `Acked-by:` 相关子系统维护者认可
- `Tested-by:` 实测通过
- `Reported-by:` 报 bug 的人（尊重他人劳动，应加）
- `Cc:` 抄送相关人（如 stable@ 申请 backport）

## 六、提交前准备（一次配好，终身受用）

```bash
# 1. git 身份（必配！当前你的 git config 是空的）
git config --global user.name  "你的实名"
git config --global user.email "你稳定能收邮件的地址"

# 2. 自检（内核源码树里跑）
scripts/checkpatch.pl <你的.patch文件>     # 机器门禁：格式/Signed-off-by/行宽
scripts/get_maintainer.pl <你的.patch文件>  # 找维护者和 Cc 列表
```

## 七、提交流程

```bash
git format-patch -1            # 生成 .patch 文件（git config 配好后自动带 Signed-off-by）
git send-email --to <维护者> --cc <列表> *.patch
```
或按 `scripts/get_maintainer.pl` 输出的 To/Cc 填。**不要**用 `git push` 到 PR——内核是邮件列表驱动的。

## 八、新人常见坑

1. **没配 git user.name/user.email** → format-patch 不带 Signed-off-by，或署名是空的
2. **网名/昵称当 Author** → 维护者直接忽略或打回
3. **Subject 超长** → checkpatch 报错
4. **伪造别人 Signed-off-by** → 严重违规（DCO 是法律承诺，只能签自己的）
5. **用 HTML 邮件发补丁** → 列表拒绝；必须纯文本
6. **不发 RFC 就写完整代码** → 新机制先 `[RFC PATCH]` 讨论设计，省得写完被否
7. **漏 Cc stable@** → backport 修复记得加 `Cc: stable@vger.kernel.org`

## 参考

- 官方文档：`Documentation/process/submitting-patches.rst`（内核源码树内）
- DCO 全文：`Documentation/process/submitting-patches.rst` 内 Developer's Certificate of Origin
- 本 skill 相关：`references/architecture-map.md`（理解补丁落哪一层，写 commit message 时用）
