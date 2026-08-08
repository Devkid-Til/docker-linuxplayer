#!/usr/bin/env node
/* 公众号审阅通知：生成公众号后，把公众号标题 + 封面发到飞书（供董事长审阅）
 *
 * 用法：
 *   node scripts/notify-feishu.mjs <日期前缀> [封面文件]
 *   例：node scripts/notify-feishu.mjs 2026-08-08 cover.png
 *
 * 目标：.env 里 FEISHU_NOTIFY_CHAT_ID（群聊）或 FEISHU_NOTIFY_USER_ID（私聊）；
 * 未配置时默认发到当前登录用户（Jiaqi）私聊。
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [dateArg, coverArg] = process.argv.slice(2);
if (!dateArg) { console.error('用法: node scripts/notify-feishu.mjs <日期前缀> [封面]'); process.exit(1); }

/* 目标：优先群聊 chat_id，其次私聊 user_id，最后当前登录用户；用 bot 身份发送（user 缺 send_as_user 权限） */
const chatId = process.env.FEISHU_NOTIFY_CHAT_ID;
const userId = process.env.FEISHU_NOTIFY_USER_ID || 'ou_fb46f4c127a7ddc0e008740e5bca8e18';
const target = (chatId ? `--chat-id ${chatId}` : `--user-id ${userId}`) + ' --as bot';

/* 读文章 frontmatter */
const dir = path.join(ROOT, 'src/content/posts');
const file = readdirSync(dir).find(f => f.startsWith(dateArg) && f.endsWith('.md'));
if (!file) { console.error('找不到文章:', dateArg); process.exit(1); }
const md = readFileSync(path.join(dir, file), 'utf8');
const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
const data = yaml.load(m[1]);

/* 公众号标题：Linux内核玩家 · MM月DD日｜<今日最大看点> */
const [y, mo, d] = String(data.date).split('-');
const dateLabel = `${Number(mo)}月${Number(d)}日`;
const title = `Linux内核玩家 · ${dateLabel}｜${data.title}`;

function send(cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log('✓', out.trim().slice(0, 150));
  } catch (e) {
    console.error('✗ 发送失败:', (e.message || '').split('\n').slice(0, 3).join(' '));
  }
}

console.log('📢 公众号标题:', title);
send(`lark-cli im +messages-send ${target} --text "📢 公众号审阅：${title}"`);

if (coverArg) {
  const coverAbs = path.resolve(coverArg);
  const coverDir = path.dirname(coverAbs);
  const coverBase = path.basename(coverAbs);
  try {
    execSync(`lark-cli im +messages-send ${target} --image "${coverBase}"`, { cwd: coverDir, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log('✓ 封面已发送');
  } catch (e) {
    console.error('✗ 封面发送失败:', (e.message || '').split('\n').slice(0, 3).join(' '));
  }
}
