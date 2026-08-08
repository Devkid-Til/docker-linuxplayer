#!/usr/bin/env node
/* OSS 上传脚本：本地图片 → 阿里云 OSS → 输出公开 URL（博客/公众号共用）
 *
 * 用法：
 *   node scripts/upload-oss.mjs <本地文件> [OSS路径]
 *   例：node scripts/upload-oss.mjs cover.png kernel-blog/2026-08-08/cover.png
 *       （省略 OSS 路径时，自动用 kernel-blog/<文件名>）
 *
 * 配置在 .env（不入库）：PUBLIC_OSS_AK_ID / PUBLIC_OSS_AK_SECRET / PUBLIC_OSS_BUCKET / PUBLIC_OSS_REGION
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
  region: process.env.PUBLIC_OSS_REGION,
  accessKeyId: process.env.PUBLIC_OSS_AK_ID,
  accessKeySecret: process.env.PUBLIC_OSS_AK_SECRET,
  bucket: process.env.PUBLIC_OSS_BUCKET,
});

const key = keyArg || `kernel-blog/${path.basename(file)}`;

try {
  const result = await client.put(key, path.resolve(ROOT, file), {
    headers: { 'x-oss-object-acl': 'public-read' },   // 公共读：博客页面可加载
  });
  console.log('✓ 上传成功');
  console.log('OSS 路径:', result.name);
  console.log('公开 URL:', result.url);
} catch (e) {
  console.error('✗ 上传失败:', e.code || e.message);
  if (e.code === 'AccessDenied') console.error('  → 检查 AK/SK 是否正确、RAM 用户是否有 oss:PutObject 权限');
  else if (e.code === 'InvalidAccessKeyId') console.error('  → AccessKey ID 错误');
  else if (e.code === 'SignatureDoesNotMatch') console.error('  → AccessKey Secret 错误');
  else if (e.code === 'NoSuchBucket') console.error('  → Bucket 名称或 Region 错误');
  process.exit(1);
}
