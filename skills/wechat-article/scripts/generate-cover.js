#!/usr/bin/env node
/**
 * 生成公众号报刊风封面（靛蓝底 + 中文标题，4x 高清）
 * 用法：node generate-cover.js --date "08-07" --topic "今日看点" [--slogan "…"] [--out cover.png] [--width 3600]
 * 依赖：同目录 node_modules 下的 @resvg/resvg-js（首次运行请先 npm install @resvg/resvg-js）
 */
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
const now = new Date();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const date   = getArg('--date')   || mm + '-' + dd;
const topic  = getArg('--topic')  || '';
const slogan = getArg('--slogan') || '内核是主业，玩家是态度';
const out    = getArg('--out')    || 'cover.png';
const width  = parseInt(getArg('--width') || '3600', 10);

const base = __dirname;
/* 封面风格注册表：平台/用途 → 模板文件（新增风格 = 加一个 .svg 模板 + 一行注册）
 *  --style blog       紫色现代风（默认，博客/公众号统一）
 *  --style wechat     靛蓝报刊风（旧公众号风格）
 *  --style book       竖版书封（3:4）
 *  --style collection 合集封面
 *  也可直接 --style <任意 .svg 文件名> 指定自定义模板
 */
const STYLES = {
  blog: 'cover-blog-template.svg',
  wechat: 'cover-template.svg',
  paper: 'cover-template.svg',
  book: 'cover-book.svg',
  collection: 'cover-collection.svg',
};
const style = getArg('--style') || getArg('--template') || 'blog';
const tplName = STYLES[style] || (style.endsWith('.svg') ? style : style + '.svg');
const tplPath = path.join(base, '../assets', tplName);
const fontPath = path.join(base, '../assets/fonts/NotoSansSC-Regular.otf');
const boldFontPath = path.join(base, '../assets/fonts/NotoSansSC-Bold.otf');
if (!fs.existsSync(tplPath)) throw new Error('模板不存在: ' + tplPath);
if (!fs.existsSync(fontPath)) throw new Error('字体不存在: ' + fontPath);

const tpl = fs.readFileSync(tplPath, 'utf8');
const svg = tpl
  .replace(/\{\{DATE\}\}/g, () => esc(date))
  .replace(/\{\{TOPIC\}\}/g, () => esc(topic))
  .replace(/\{\{SLOGAN\}\}/g, () => esc(slogan));

const resvg = new Resvg(svg, { font: { fontFiles: [fontPath, boldFontPath] }, fitTo: { mode: 'width', value: width } });
fs.writeFileSync(out, resvg.render().asPng());
console.log('cover written: ' + path.resolve(out));
