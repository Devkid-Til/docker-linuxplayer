#!/usr/bin/env node
/* OSS 上传脚本：本地图片 → 阿里云 OSS → 输出公开 URL（博客/公众号共用）
 *
 * 用法：
 *   node scripts/upload-oss.mjs <本地文件> [OSS路径]
 *   例：node scripts/upload-oss.mjs cover.png kernel-blog/2026-08-08/cover.png
 *       （省略 OSS 路径时，自动用 kernel-blog/<文件名>）
 *
 * 配置在 .env（不入库）：OSS_AK_ID / OSS_AK_SECRET / OSS_BUCKET / OSS_REGION
 * （注意：OSS 键不带 PUBLIC_ 前缀——那是 Astro 客户端暴露命名空间，纯 Node 脚本勿用）
 */
import 'dotenv/config';
import OSS from 'ali-oss';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [file, keyArg] = process.argv.slice(2);

if (!file) {
  console.error('用法: node scripts/upload-oss.mjs <本地文件> [OSS路径]');
  process.exit(1);
}

const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_AK_ID,
  accessKeySecret: process.env.OSS_AK_SECRET,
  bucket: process.env.OSS_BUCKET,
});

const key = keyArg || `kernel-blog/${path.basename(file)}`;

// 按扩展名显式设置 Content-Type（不依赖 ali-oss 猜测，避免 CDN/浏览器按 octet-stream 处理）
const ext = path.extname(file).toLowerCase();
const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.html': 'text/html', '.md': 'text/markdown',
};
const contentType = MIME[ext] || 'application/octet-stream';

// 网络不稳时最多重试 3 次（OSS 往返 4-7s，上行抖动常见），2s 退避
const MAX_ATTEMPTS = 3;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    const result = await client.put(key, path.resolve(ROOT, file), {
      headers: { 'x-oss-object-acl': 'public-read', 'Content-Type': contentType },   // 公共读：博客页面可加载
    });
    console.log('✓ 上传成功');
    console.log('OSS 路径:', result.name);
    console.log('公开 URL:', result.url);
    process.exit(0);
  } catch (e) {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(`✗ 上传失败（第 ${attempt} 次仍失败）:`, e.code || e.message);
      if (e.code === 'AccessDenied') console.error('  → 检查 AK/SK 是否正确、RAM 用户是否有 oss:PutObject 权限');
      else if (e.code === 'InvalidAccessKeyId') console.error('  → AccessKey ID 错误');
      else if (e.code === 'SignatureDoesNotMatch') console.error('  → AccessKey Secret 错误');
      else if (e.code === 'NoSuchBucket') console.error('  → Bucket 名称或 Region 错误');
      process.exit(1);
    }
    console.warn(`⏳ 第 ${attempt}/${MAX_ATTEMPTS} 次失败（${e.code || e.message}），2s 后重试...`);
    await new Promise(r => setTimeout(r, 2000));
  }
}
