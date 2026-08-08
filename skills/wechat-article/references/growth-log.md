# Growth Log

append-only。每次撞到新问题追加一条。够 3 条考虑升级到 SKILL.md Gotchas。

格式:
## YYYY-MM-DD — 一句话症状
**上下文**：
**表现**：
**根因**：
**修复**：

## 2026-08-08 — 产出格式整体迁移：手写内联 HTML → blocks 结构化内容
**上下文**：正文模板系统上线，博客端用 Astro 组件、公众号端用 repo 的 render-wechat.mjs 渲染内联 HTML。
**表现**：旧 skill 产出 520 处内联样式堆在 markdown 里，博客端要靠 !important hack 覆盖颜色，每天板块组合不同只能复制 HTML 手改。
**根因**：内容与排版没有分离——排版细节硬编码在内容里。
**修复**：v0.7.0 起 skill 只产出 blocks（11 种板块类型 + YAML 硬规则），样式全部由脚本/组件承载；html-fragments.md 标注废弃。头号新坑：YAML 字符串不引号（冒号/方括号/井号/波浪号）解析即报错——迁移时实测踩了 3 次。
