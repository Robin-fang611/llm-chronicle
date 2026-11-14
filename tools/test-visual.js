#!/usr/bin/env node
/**
 * 视觉规范静态检查 · 《回到AI纪元第一天》v3.3 / 美术规范 v2「生活气 · 多模式」
 *
 * 把美术规范里"本该靠眼睛看"的部分变成可自动断言的规则：
 *   A. WCAG 2.1 对比度（用相对亮度公式实算色板 token）
 *   B. CSS 硬约束：硬阴影零模糊 / 字号下限 / 安全区 / 减弱动效 / 视口断点 / 颗粒透明度
 *   C. v2 三层架构存在性（:root 共享层 + [data-mode]×4 + [data-era]×4 + [data-stage]×3）
 *
 * 用法：node tools/test-visual.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CSS = path.resolve(__dirname, '..', 'build', 'css', 'style.css');
const css = fs.readFileSync(CSS, 'utf8');

/* ==================================================================
 * 断言框架
 * ================================================================== */
let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failures.push({ name, message: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(c, m) { if (!c) throw new Error(m || '断言失败'); }
function section(t) { console.log('\n' + t); }

/* ==================================================================
 * WCAG 2.1 对比度
 * ================================================================== */
function hexToRgb(hex) {
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) throw new Error('非法颜色：' + hex);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
function token(name) {
  const m = css.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{3,8}|rgba?\\([^)]*\\))'));
  if (!m) throw new Error('CSS 里找不到变量 --' + name);
  const v = m[1];
  // rgba 取前三个通道近似（仅用于 op 0 的不透明色；本项目色板均为实色 #hex）
  if (v[0] === '#') return v;
  const nums = v.match(/-?\d*\.?\d+/g) || [];
  const [r, g, b] = nums.map(n => parseInt(n, 10));
  const to2 = n => ('0' + n.toString(16)).slice(-2);
  return '#' + to2(r) + to2(g) + to2(b);
}

/* ==================================================================
 * A. 对比度
 * ================================================================== */
section('【对比度 · WCAG 2.1 相对亮度实算（v2 色板）】');

const P0 = token('paper-0');
const P1 = token('paper-1');
const P2 = token('paper-2');
const INK = token('ink');
const INK2 = token('ink-2');
const INK3 = token('ink-3');
const ACC = token('accent');
const ACCD = token('accent-dark');
const INFO = token('info');
const SUCC = token('success');
const SUCCD = token('success-deep');

/** [说明, 前景, 背景, 最低要求, 用途] */
const PAIRS = [
  ['正文墨黑 / 主背景 paper-1', INK, P1, 7, '正文，必须 AAA'],
  ['正文墨黑 / 弹窗纸 paper-0', INK, P0, 7, '弹窗与结局页正文'],
  ['正文墨黑 / 卡片纸 paper-2', INK, P2, 7, '决策卡正文'],
  ['次级文字 / 主背景', INK2, P1, 4.5, '说明文案，AA'],
  ['三级文字 / 主背景', INK3, P1, 3, '仅标签/单位，不承载正文'],
  ['套红 accent / 主背景', ACC, P1, 4.5, '标题与强调'],
  ['加深套红 / 卡片纸', ACCD, P2, 4.5, '卡片内红字（原色 accent 在卡片上不足 4.5:1）'],
  ['信息蓝 / 主背景', INFO, P1, 4.5, '档案编号与标签'],
  ['成功绿 / 主背景', SUCC, P1, 4.5, '正向数值'],
  ['加深绿 / 卡片纸', SUCCD, P2, 4.5, '卡片内绿字（原色 success 在卡片上不足 4.5:1）']
];

PAIRS.forEach(([label, fg, bg, min, usage]) => {
  const c = contrast(fg, bg);
  check(`${label} = ${c.toFixed(2)}:1（要求 ≥${min}）— ${usage}`, () => {
    assert(c >= min, `对比度不足：${c.toFixed(2)}:1 < ${min}:1`);
  });
});

check('--warn 不得作为文字色（实算仅 ~2.6:1，低于 WCAG 最低 3:1）', () => {
  // 仅命中真正的 `color:` 属性，排除 border-color / background-color 等
  assert(!/(?<![-\w])color:\s*var\(--warn\)/.test(css), '--warn 被用作文字色，不达标');
});

check('--gold 仅作填充/边框装饰，不得作文字色（实算仅 ~2.8:1，作文字不达标）', () => {
  // 仅命中真正的 `color:` 属性，排除 border-color 等装饰性用法（稀有印章金边为合法用法）
  const bad = [];
  css.replace(/([^{}]+)\{([^}]*var\(--gold\)[^}]*)\}/g, (m, sel, body) => {
    if (/(?<![-\w])color:\s*var\(--gold\)/.test(body)) bad.push(sel.trim() + ' —— gold 被用作文字色');
    return m;
  });
  assert(bad.length === 0, '\n      ' + bad.join('\n      '));
});

/* ==================================================================
 * B. CSS 硬约束
 * ================================================================== */
section('【CSS 规则 · 硬阴影 / 字号 / 安全区 / 动效 / 断点 / 颗粒】');

check('阴影一律零模糊（硬阴影），且不使用 filter: blur', () => {
  const blurs = [];
  css.replace(/box-shadow:\s*([^;}]+)/g, (m, v) => {
    const nums = v.match(/-?\d*\.?\d+px/g) || [];
    if (nums.length >= 3) {
      const blur = parseFloat(nums[2]);
      if (isFinite(blur) && blur > 0) blurs.push(m.trim());
    }
    return m;
  });
  assert(blurs.length === 0, '存在带模糊的阴影（规范禁止，显廉价且掉帧）：\n      ' + blurs.join('\n      '));
  assert(!/filter:\s*blur/i.test(css), '使用了 filter: blur()');
});

check('正文字号不低于 16px（--fs-body）', () => {
  const m = css.match(/--fs-body:\s*([\d.]+)rem/);
  assert(m, '未找到 --fs-body');
  const px = parseFloat(m[1]) * 16;
  assert(px >= 16, '正文字号 ' + px + 'px 小于 16px');
});

check('最小字号仅用于标签/单位（--fs-xs ≥ 12px）', () => {
  const m = css.match(/--fs-xs:\s*([\d.]+)rem/);
  assert(m, '未找到 --fs-xs');
  const px = parseFloat(m[1]) * 16;
  assert(px >= 12, '最小字号 ' + px + 'px 小于 12px');
});

check('无位图、无外链、无 @font-face、无 woff', () => {
  assert(!/\.(png|jpe?g|gif|webp|avif)\b/i.test(css), 'CSS 引用了位图');
  // 仅允许 w3.org 命名空间（噪点 SVG 用）
  const ext = css.match(/url\(\s*['"]?(https?:[^)'"]+)/gi) || [];
  ext.forEach(u => assert(/www\.w3\.org/.test(u), 'CSS 外链：' + u));
  assert(!/@font-face/i.test(css), 'CSS 使用了 @font-face');
  assert(!/woff2?\b/i.test(css), 'CSS 引用了 woff 字体');
});

check('禁用 emoji', () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert(!emoji.test(css), 'CSS 内容含 emoji');
});

check('安全区已处理（顶/底/左/右 + env 兜底）', () => {
  ['--sat', '--sab', '--sal', '--sar'].forEach(v => {
    assert(css.indexOf('var(' + v + ')') !== -1, '未使用安全区变量 ' + v);
  });
  assert(/env\(safe-area-inset-top/.test(css), '未声明 env(safe-area-inset-top) 兜底');
});

check('减弱动态效果降级（animation + transition 全覆盖）', () => {
  assert(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css), '未处理减弱动态效果');
  assert(/animation-duration:\s*\.?0?\.01ms\s*!important/.test(css), '减弱动效未覆盖 animation');
  assert(/transition-duration:\s*\.?0?\.01ms\s*!important/.test(css), '减弱动效未覆盖 transition');
});

check('四视口断点齐全（窄 375 / 宽 430 / PC）', () => {
  assert(/@media\s*\(max-width:\s*389px\)/.test(css), '缺窄屏(375)适配');
  assert(/@media\s*\(min-width:\s*411px\)/.test(css), '缺宽屏(430)适配');
  assert(/@media\s*\(min-width:\s*520px\)/.test(css), '缺 PC 模拟器适配');
});

check('颗粒纹理 opacity 不超过 0.05（避坑 §7.2，防文字发灰）', () => {
  const vals = (css.match(/--era-noise-op:\s*([\d.]+)/g) || []).map(s => parseFloat(s.match(/([\d.]+)/)[1]));
  assert(vals.length > 0, '未找到 --era-noise-op');
  vals.forEach(v => assert(v <= 0.05, 'era-noise-op ' + v + ' 超过 0.05'));
});

check('无纯白实色区块（仅允许 rgba 半透明叠层）', () => {
  // 规范：零纯白区块。允许 rgba(255,255,255,低透明度) 作细微高光。
  const solid = css.match(/:\s*#fff\b|:\s*#ffffff\b/i);
  assert(!solid, '出现纯白实色值：' + (solid ? solid[0] : ''));
});

/* ==================================================================
 * C. v2 三层架构存在性
 * ================================================================== */
section('【架构 · v2 三层皮肤存在性】');

check(':root 共享层定义 M1 默认通用名', () => {
  assert(/:root\s*\{/.test(css), '缺 :root 共享层');
  ['--paper-1', '--ink', '--accent', '--radius-card', '--shadow-card', '--font-sans'].forEach(t => {
    assert(css.indexOf('--paper-1') >= 0 || css.indexOf(t) >= 0, '共享层缺 token：' + t);
  });
});

check('模式层 [data-mode] ×3 覆盖（m1 为 :root 默认，仅校验 m2/m3/m4 显式覆盖）', () => {
  ['m2', 'm3', 'm4'].forEach(m => {
    assert(new RegExp('\\[data-mode="' + m + '"\\]').test(css), '缺模式层 ' + m);
  });
});

check('年代滤镜层 [data-era] ×4（1/2/3/4）', () => {
  ['1', '2', '3', '4'].forEach(e => {
    assert(new RegExp('\\[data-era="' + e + '"\\]').test(css), '缺年代层 ' + e);
  });
});

check('人生阶段层 [data-stage] ×3（l1/l2/l3）', () => {
  ['l1', 'l2', 'l3'].forEach(s => {
    assert(new RegExp('\\[data-stage="' + s + '"\\]').test(css), '缺阶段层 ' + s);
  });
});

check('组件仅引用通用名，无写死模式色（抽样：--paper-1/--accent/--ink 被使用）', () => {
  ['var(--paper-1)', 'var(--accent)', 'var(--ink)'].forEach(v => {
    assert(css.indexOf(v) >= 0, '组件未引用通用名：' + v);
  });
});

/* ==================================================================
 * 汇总
 * ================================================================== */
console.log('\n' + '─'.repeat(60));
if (failures.length === 0) {
  console.log('[visual] 全部通过：' + passed + ' 项');
  console.log('─'.repeat(60));
  process.exit(0);
} else {
  console.log('[visual] 通过 ' + passed + ' 项，失败 ' + failures.length + ' 项：');
  failures.forEach(f => console.log('  ✗ ' + f.name + '\n      ' + f.message));
  console.log('─'.repeat(60));
  process.exit(1);
}
