/* 动态数据来源：逻辑在 ./derive-source.js（与 scripts/render-wechat.mjs 共享，防双份漂移），
   这里仅做 TS 类型适配 */
import { deriveSource as _derive } from './derive-source.js';

export function deriveSource(blocks: unknown[]): string {
  return _derive(blocks);
}
