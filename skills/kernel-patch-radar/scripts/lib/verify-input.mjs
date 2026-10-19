// lib/verify-input.mjs — 校验脚本的共享前置断言与三态退出契约
//
// 契约见 /ws/dev/ag-org/AGENTS.md 第七节：
//   0 = 已校验且通过
//   1 = 已校验且发现错误
//   2 = 无法校验（输入缺失 / 为空 / 不可读 / 过期 / 校验器自身异常）
//
// 为什么需要这个库（2026-10-17 事故）：
//   核对脚本拿到空源（/tmp/lore/linux-media 被清理），却把「源缺失」渲染成
//   「所有邮件引用未命中」——误报全错，白跑一轮返工。源缺失与比对失败必须在
//   输出上可区分，且都不能被调用方当成「通过」。

import { statSync, readFileSync } from 'node:fs';

export const EXIT_OK = 0;
export const EXIT_FAIL = 1;
export const EXIT_UNVERIFIABLE = 2;

/** 输入不可校验时抛出；由 runTriState 统一转成 exit 2。 */
export class UnverifiableError extends Error {}

const fmtBytes = n => (n >= 1024 ? `${(n / 1024).toFixed(1)}KB` : `${n}B`);

/**
 * 断言每个源都存在、可读、非空（可选：行数下限、时效上限）。
 * 任一不满足 → throw UnverifiableError。
 */
export function requireSources(paths, { minBytes = 1, minLines = 0, maxAgeHours = 0, label = '源' } = {}) {
  for (const p of paths) {
    let st;
    try {
      st = statSync(p);
    } catch {
      throw new UnverifiableError(`${label}不存在或不可读：${p}`);
    }
    if (!st.isFile()) throw new UnverifiableError(`${label}不是普通文件：${p}`);
    if (st.size < minBytes) {
      throw new UnverifiableError(`${label}为空或过小（${fmtBytes(st.size)} < ${fmtBytes(minBytes)}）：${p}`);
    }
    if (maxAgeHours > 0) {
      const ageH = (Date.now() - st.mtimeMs) / 3600000;
      if (ageH > maxAgeHours) {
        throw new UnverifiableError(`${label}已过期（${ageH.toFixed(1)}h > ${maxAgeHours}h）：${p}`);
      }
    }
    if (minLines > 0) {
      const text = readFileSync(p, 'utf8');
      const lines = text.split('\n').filter(l => l.trim() !== '').length;
      if (lines < minLines) {
        throw new UnverifiableError(`${label}行数过少（${lines} < ${minLines}）：${p}——疑似被截断`);
      }
    }
  }
}

/** 断言 + 读取，返回原始文本数组（与 paths 同序）。 */
export function readSources(paths, opts = {}) {
  requireSources(paths, opts);
  return paths.map(p => readFileSync(p, 'utf8'));
}

/** 用法错误统一走 exit 2（无法校验），不要用 exit 1 冒充「校验失败」。 */
export function usageError(tag, msg) {
  console.error(`[${tag}] ⚠ 无法校验：用法错误 —— ${msg}`);
  process.exit(EXIT_UNVERIFIABLE);
}

/**
 * 执行校验函数并按其返回值退出；任何未预期异常都收敛成 2，
 * 不允许裸栈溢出后以 1 退出（那会被调用方误读成「内容有错」）。
 */
export function runTriState(tag, verify) {
  try {
    const code = verify();
    process.exit(code ?? EXIT_OK);
  } catch (e) {
    if (e instanceof UnverifiableError) {
      console.error(`[${tag}] ⚠ 无法校验：${e.message}；修好输入后重跑`);
    } else {
      console.error(`[${tag}] ⚠ 无法校验：校验器自身异常 —— ${e?.message ?? e}`);
    }
    process.exit(EXIT_UNVERIFIABLE);
  }
}
