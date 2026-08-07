// Astro 配置（feature/astro 分支）
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'http://118.31.67.240',   // 生产域名/IP
  outDir: './site',               // 构建产物输出到 site/（Nginx 挂载路径不变）
  compressHTML: true,
  vite: {
    css: { minify: false },       // 关 CSS 压缩（global.css 有浏览器容错的注释，lightningcss 不接受）
  },
});
