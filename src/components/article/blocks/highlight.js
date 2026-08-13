// 代码块语法高亮 —— 博客(Code.astro)与公众号(render-wechat.mjs)共用
// Shiki 服务端渲染,输出带内联 color 的 <pre>/<span>,公众号粘贴可直接用(只认 inline style)
import { codeToHtml } from 'shiki';

// 允许的语言白名单;未知/缺省一律回落 text(纯文本不报错)
const SUPPORTED = new Set([
  'bash', 'sh', 'shell', 'zsh', 'text', 'txt', 'plaintext',
  'python', 'py', 'javascript', 'js', 'typescript', 'ts',
  'json', 'yaml', 'yml', 'markdown', 'md', 'diff', 'html', 'css', 'xml', 'sql',
  'go', 'rust', 'c', 'cpp', 'java',
]);

export async function highlightCode(code, lang) {
  const safe = lang && SUPPORTED.has(lang) ? lang : 'text';
  try {
    return await codeToHtml(code, { lang: safe, theme: 'github-dark' });
  } catch {
    try {
      return await codeToHtml(code, { lang: 'text', theme: 'github-dark' });
    } catch {
      return null; // 兜底:调用方走原始纯文本渲染
    }
  }
}
