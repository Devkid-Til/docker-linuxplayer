// Astro 配置
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 生产地址。feed/canonical/OG 的 URL 全由它派生——域名+HTTPS 就绪后改为 https 域名即全站生效
  site: 'http://118.31.67.240',   // TODO: HTTPS 域名接入后改为 https://<domain>
  outDir: './site',               // 构建产物输出到 site/（Nginx 挂载路径不变）
  compressHTML: true,
  vite: {
    css: { minify: false },       // 关 CSS 压缩（global.css 有浏览器容错的注释，lightningcss 不接受）
  },
});
