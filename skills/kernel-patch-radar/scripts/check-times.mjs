#!/usr/bin/env node
/* check-times.mjs — 时间戳换算护栏（成文后必跑，与 check-links.mjs 配对）
 *
 * 用法：
 *   node check-times.mjs <文章.md> <radar 输出文件>
 *
 * 退出码（三态契约，见 ag-org/AGENTS.md 第七节）：
 *   0 = 全部命中（或文章里确实没有时间戳）
 *   1 = 已校验，有时间戳不在 radar 的 UTC+8 集合里
 *   2 = 无法校验（用法错误 / 文章或 radar 源缺失、为空、疑似截断）
 *
 * 为什么需要它：
 *   雷达输出的是 UTC（ISO 8601 的 Z 结尾），成文要用北京时间（UTC+8）。
 *   手工换算有两个高频错法：
 *     1) 直接抄了 UTC 的小时数（09-08 18:28Z 写成「10-08 18:28 北京」，实为 10-09 02:28）；
 *     2) 少加/多加一小时（取分钟时四舍五入）。
 *   两者 YAML 通得过、build 通过、排版正常——和假链接一样，排版类校验从不检查事实。
 *
 * 判据：文章里每一个 〔MM-DD HH:MM 北京〕 与 more 条目的 time: "MM-DD HH:MM"，
 *       都必须在「当天 radar 输出的全部时间戳换算到 UTC+8」后的集合里出现。
 *
 * 注意：radar 输出的 UTC 时间是**落盘归档时间**（见 memory: radar-git-timestamp-caveat），
 * 可能与邮件 Date 头差一天以内；本脚本只校验「文章时间是否来自雷达数据」，
 * 不校验它是否等于真实发信时间。
 *
 * 2026-10-19 改造：用法错误由 exit 1 改为 exit 2；源缺失/为空/截断统一 exit 2。
 */
import { EXIT_OK, EXIT_FAIL, readSources, usageError, runTriState } from './lib/verify-input.mjs';

const TAG = 'check-times';

const [postPath, radarPath] = process.argv.slice(2);
if (!postPath || !radarPath) {
  usageError(TAG, '用法: node check-times.mjs <文章.md> <radar 输出文件>');
}

runTriState(TAG, () => {
  const [post, radar] = readSources([postPath, radarPath], {
    label: '文章/radar 源',
    minLines: 2,
  });

  /* radar → 北京时间集合 */
  const bj = new Set();
  for (const m of radar.matchAll(/(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):\d{2}Z/g)) {
    const d = new Date(Date.UTC(
      Number(m[1].slice(0, 4)), Number(m[1].slice(5, 7)) - 1, Number(m[1].slice(8, 10)),
      Number(m[2]), Number(m[3]),
    ));
    d.setUTCHours(d.getUTCHours() + 8);           // 北京时间 = UTC+8
    const p = n => String(n).padStart(2, '0');
    bj.add(`${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`);
  }

  /* 文章 → 声明的时间戳集合 */
  const used = new Set([
    ...[...post.matchAll(/〔(\d{2}-\d{2} \d{2}:\d{2})\s*北京〕/g)].map(m => m[1]),
    ...[...post.matchAll(/^\s*time:\s*"?(\d{2}-\d{2} \d{2}:\d{2})"?\s*$/gm)].map(m => m[1]),
  ]);

  if (used.size === 0) {
    console.log('[check-times] ✓ 文章中未发现时间戳（〔MM-DD HH:MM 北京〕或 time:）——无可校验项');
    return EXIT_OK;
  }

  if (bj.size === 0) {
    // 有声明的时间戳、但源里解不出任何时间戳 → 源格式不对或被截断，不能判成「文章错」。
    console.error(`[check-times] ⚠ 无法校验：radar 源中未解析出任何 UTC 时间戳（${radarPath}）——疑似源格式异常，而不是文章写错`);
    return 2;
  }

  const missing = [...used].filter(t => !bj.has(t)).sort();
  if (missing.length) {
    console.error(`[check-times] ✗ 校验失败：${missing.length}/${used.size} 个时间戳不在 radar 输出的 UTC+8 集合里：`);
    for (const t of missing) console.error(`   ${t} 北京`);
    console.error('   → 多半是漏加 8 小时、抄了 UTC 小时数，或该条原本就不在当天雷达输出里。请回雷达第 1 字段取真值重算。');
    return EXIT_FAIL;
  }

  console.log(`[check-times] ✓ ${used.size} 个时间戳全部命中（radar UTC+8 换算，共 ${bj.size} 个候选）`);
  return EXIT_OK;
});
