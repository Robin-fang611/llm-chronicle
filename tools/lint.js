#!/usr/bin/env node
/**
 * 静态禁用项扫描 · 《回到AI纪元第一天》
 *
 * 依据 autonomous-dev-prompt.md §6 铁律 + 美术设计规范 §8 验收清单。
 * 扫描范围仅限 build/（本工具自身不受规则约束）。
 *
 * 级别：
 *   FAIL —— 违反硬性禁令，exit 1
 *   WARN —— 需人工核对（如 #fff 在 accent 底按钮上是允许的），exit 不受影响
 *
 * 用法：node tools/lint.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const EXTS = new Set(['.html', '.js', '.css']);

// emoji / 图形符号（刻意不含 U+2190–21FF 箭头区：箭头是规范要求的涨跌冗余编码，不是 emoji）
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const FAIL_RULES = [
  { id: 'inline-script',  re: /<script(?![^>]*\ssrc=)[^>]*>/i,            msg: '内联 <script>' },
  { id: 'event-attr',     re: /\son(click|change|input|submit|error|load|mouse[a-z]+|key[a-z]+|focus|blur|touch[a-z]+)\s*=/i, msg: '内联事件属性 (onclick= 等)' },
  { id: 'eval',           re: /\beval\s*\(/,                              msg: 'eval()' },
  { id: 'new-function',   re: /new\s+Function\s*\(/,                      msg: 'new Function()' },
  { id: 'script-module',  re: /<script[^>]*type\s*=\s*["']module["']/i,   msg: 'type="module"' },
  { id: 'import',         re: /(^|[;}\s])import\s+[{*A-Za-z_$]/,          msg: 'import 语句' },
  { id: 'export',         re: /(^|[;}\s])export\s+(default|const|let|var|function|class|\{)/, msg: 'export 语句' },
  { id: 'fetch',          re: /\bfetch\s*\(/,                             msg: 'fetch()' },
  { id: 'xhr',            re: /XMLHttpRequest/,                           msg: 'XMLHttpRequest' },
  { id: 'external-url',   re: /https?:\/\/(?!www\.w3\.org)/i,             msg: '外链 http(s) URL（仅允许 w3.org 命名空间）' },
  { id: 'font-face',      re: /@font-face/i,                              msg: '@font-face' },
  { id: 'woff',           re: /\.woff2?\b/i,                              msg: 'woff 字体' },
  { id: 'worker',         re: /\bnew\s+(Shared)?Worker\b/,                msg: 'Web Worker' },
  { id: 'sw',             re: /serviceWorker/i,                           msg: 'Service Worker' },
  { id: 'websocket',      re: /WebSocket/,                                msg: 'WebSocket' },
  { id: 'geolocation',    re: /geolocation/i,                             msg: 'geolocation' },
  { id: 'clipboard',      re: /clipboard/i,                               msg: 'clipboard' },
  { id: 'window-open',    re: /window\.open\s*\(/,                        msg: 'window.open()' },
  { id: 'iframe',         re: /<iframe|createElement\(\s*['"]iframe/i,    msg: 'iframe' },
  { id: 'wasm',           re: /WebAssembly/,                              msg: 'WASM' },
  { id: 'bitmap',         re: /(url\(\s*['"]?|<img[^>]+src=|(?:src|href)=\s*['"]|background(?:-image)?:\s*url\()[^)'"]*\.(png|jpe?g|gif|webp|avif)\b/i, msg: '位图资源（禁用 PNG/JPG；画布导出下载名除外）' },
  { id: 'emoji',          re: EMOJI_RE,                                   msg: 'emoji（图标须内联 SVG 或 CSS 几何）' },
  /**
   * 工具注入污染：present_files 用「本地文件路径」预览 HTML 时，会直接改写源文件、
   * 往每个标签注入 data-page-node-id。这些属性会被打进交付 zip。
   * 无害但脏，且看起来像不明来源代码 —— 打包前必须清掉。
   * 规避方式：改用 present_files 预览 localhost URL（只读，不改文件）。
   */
  { id: 'injected-attr',  re: /data-page-node-id|data-node-index|data-page-node-type/i, msg: '被工具注入的属性（预览污染，打包前须清理）' },
];

const WARN_RULES = [
  // 只匹配"颜色值"用法：#fff / #ffffff / `color: white;`；不误伤 `white-space: nowrap`
  { id: 'white-block', re: /#fff\b|#ffffff\b|:\s*white\s*[;}]/i, msg: '白色值（仅 --accent 底按钮文字允许，需人工核对）' },
  { id: 'http-token',  re: /url\(\s*['"]?https?:/i,       msg: 'url() 外链' },
];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(path.extname(name).toLowerCase())) out.push(p);
  }
  return out;
}

function scanFile(file, rules, level) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    for (const r of rules) {
      if (r.re.test(line)) hits.push({ level, id: r.id, msg: r.msg, line: i + 1, text: line.trim().slice(0, 120) });
    }
  });
  return hits;
}

function main() {
  const files = walk(BUILD, []);
  if (files.length === 0) {
    console.log('[lint] build/ 下无 .html/.js/.css 文件，跳过。');
    return 0;
  }

  let fails = [];
  let warns = [];
  for (const f of files) {
    fails = fails.concat(scanFile(f, FAIL_RULES, 'FAIL').map(h => Object.assign({ file: path.relative(ROOT, f) }, h)));
    warns = warns.concat(scanFile(f, WARN_RULES, 'WARN').map(h => Object.assign({ file: path.relative(ROOT, f) }, h)));
  }

  // HTML 结构检查（仅 index.html）
  const index = path.join(BUILD, 'index.html');
  if (fs.existsSync(index)) {
    const html = fs.readFileSync(index, 'utf8');
    const need = [
      { ok: /<meta\s+name=["']viewport["']/i.test(html), msg: 'index.html 缺 <meta name="viewport">' },
      { ok: /id=["']app["']/.test(html), msg: 'index.html 缺单根容器 #app' },
      { ok: /<script\s+src=/i.test(html), msg: 'index.html 未使用外置 <script src>' },
      { ok: /<html[^>]*\slang=/i.test(html), msg: 'index.html 缺 <html lang>' },
    ];
    need.forEach(n => { if (!n.ok) fails.push({ level: 'FAIL', id: 'html-structure', msg: n.msg, file: 'build/index.html', line: 0, text: '' }); });
  }

  const line = '─'.repeat(60);
  console.log(line);
  console.log('[lint] 扫描文件数：' + files.length);
  files.forEach(f => {
    const kb = (fs.statSync(f).size / 1024).toFixed(1);
    console.log('       · ' + path.relative(ROOT, f) + '  (' + kb + ' KB)');
  });
  console.log(line);

  if (fails.length) {
    console.log('[FAIL] ' + fails.length + ' 项硬性违规：');
    fails.forEach(h => console.log('  ✗ [' + h.id + '] ' + h.file + (h.line ? ':' + h.line : '') + '\n      ' + h.msg + (h.text ? '\n      > ' + h.text : '')));
  } else {
    console.log('[FAIL] 0 项 —— 全部硬性禁令通过');
  }

  if (warns.length) {
    console.log('\n[WARN] ' + warns.length + ' 项待人工核对：');
    warns.forEach(h => console.log('  ! [' + h.id + '] ' + h.file + ':' + h.line + '  ' + h.msg + '\n      > ' + h.text));
  } else {
    console.log('[WARN] 0 项');
  }
  console.log(line);

  return fails.length ? 1 : 0;
}

process.exit(main());
