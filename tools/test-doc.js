#!/usr/bin/env node
/**
 * 文档 ↔ 代码一致性测试 · 《回到AI纪元第一天》v6
 *
 * 解析《策划案-v6.md》的权威表格，断言与 build/js 的实现完全一致：
 *   1) §3 三档开局独白表 ↔ Content.openings
 *   2) §4.1-§4.3 九条生活题题面 ↔ Content.life
 *   3) §4.1-§4.3 九组选项库（档位×年份）↔ Content.lifeOptLib
 *   4) §5 时代节点 + 号外 ↔ Content.era / Content.breaking
 *   5) §6.0 线性时间线总表 ↔ logic.buildPlan
 *   6) §8.5 结局占位符规则 ↔ logic.endingParams
 *   7) §10.2 档案全文 ↔ archives.js
 *
 * 用途：任何人改动代码或策划案导致两者分叉，本测试立即失败。
 * 用法：node tools/test-doc.js
 */
'use strict';

const path = require('path');
const fs = require('fs');

/* ==================================================================
 * 1. 环境 shim + 加载模块
 * ================================================================== */
global.window = global;
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = { createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }), querySelector: () => null, querySelectorAll: () => [] };

const BUILD = path.resolve(__dirname, '..', 'build', 'js');
require(path.join(BUILD, 'util.js'));
require(path.join(BUILD, 'content.js'));
require(path.join(BUILD, 'logic.js'));
require(path.join(BUILD, 'archives.js'));
require(path.join(BUILD, 'state.js'));
const { Util, Content, Logic, State, Archives } = global;

const DOC = fs.readFileSync(path.resolve(__dirname, '..', '策划案-v6.md'), 'utf8');

let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failures.push({ name, message: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(c, m) { if (!c) throw new Error(m || '断言失败'); }
function eq(a, b, m) { if (a !== b) throw new Error((m || '值不相等') + '：实际=' + JSON.stringify(a) + ' 期望=' + JSON.stringify(b)); }
function section(t) { console.log('\n' + t); }

const BANDS = Content.AGE_BANDS; // [18, 22, 25]
const LIFE_YEARS = ['2017', '2018', '2021'];

/* ==================================================================
 * 2. Markdown 表格解析
 * ================================================================== */
/** 取两个标题之间的文本 */
function between(headA, headB) {
  const ia = DOC.indexOf(headA);
  assert(ia >= 0, '文档缺章节：' + headA);
  const ib = headB ? DOC.indexOf(headB, ia) : DOC.length;
  return DOC.slice(ia, ib < 0 ? DOC.length : ib);
}
/** 解析表格行：返回 cell 数组（跳过表头/分隔行；表头特征 = 全行无数字） */
function tableRows(text) {
  const rows = [];
  text.split('\n').forEach(line => {
    line = line.trim();
    if (line.indexOf('|') !== 0) return;
    const cells = line.split('|').slice(1, -1).map(c => c.trim().replace(/\*\*/g, ''));
    if (!cells.length) return;
    if (/^[-\s]+$/.test(cells.join(''))) return;          // 分隔行
    if (!cells.some(c => /\d/.test(c))) return;            // 表头（无数字的整行）
    rows.push(cells);
  });
  return rows;
}

/* ==================================================================
 * 3. 用例
 * ================================================================== */

section('【内容表 ↔ content.js】');

check('§1.3 防误触改选规则存在且与代码一致（_pending 不结算、继续才结算）', () => {
  const sec = between('### 1.3', '## 2');
  assert(sec.indexOf('不得 `disabled`') >= 0, '文档缺「不锁定」规则');
  assert(sec.indexOf('唯一结算点 = 点「继续」按钮') >= 0, '文档缺「继续才结算」规则');
  // 代码侧：choose 只记录 pending 不调 Logic.choose；advance 出口才结算
  const stateSrc = fs.readFileSync(path.join(BUILD, 'state.js'), 'utf8');
  assert(/function choose\(s, step, idx\) \{[\s\S]*?s\._pending = \{ idx: idx, option: opt \};\s*\n\s*return opt;/.test(stateSrc), 'state.choose 不应直接结算');
  assert(/if \(s\._pending\) \{\s*Logic\.choose\(s, s\._pending\.option, currentStep\(s\)\);/.test(stateSrc), 'state.advance 出口应结算 _pending');
});

check('§3 三条开局独白 ↔ Content.openings 逐字一致', () => {
  const rows = tableRows(between('## 3. 开局：三条人生起点', '## 4. 生活题'));
  eq(rows.length, 3, '表行数');
  rows.forEach(([age, stage, text]) => {
    const got = Content.openings[age];
    assert(got !== undefined, 'content 缺开局：' + age);
    eq(got, text, '开局独白不一致：' + age);
  });
});

check('§3 档位标签：bandTitle 与文档「人生阶段」列一致', () => {
  const rows = tableRows(between('## 3. 开局：三条人生起点', '## 4. 生活题'));
  const map = { '18': '大一开始', '22': '工作开始', '25': '跳槽转型' };
  rows.forEach(([age, stage]) => {
    eq(Content.bandTitle(parseInt(age, 10)), age + ' 岁 · ' + map[age], 'bandTitle(' + age + ')');
  });
});

check('§4.1-§4.3 九条生活题题面 ↔ Content.life 逐字一致', () => {
  const secs = ['### 4.1 2017 年 · 起点（q1）', '### 4.2 2018 年 · 第二年（q2）', '### 4.3 2021 年 · 第三次选择（q3）'];
  let total = 0;
  for (let i = 0; i < secs.length; i++) {
    // 题面表位于「**题面（档位专属）：**」与「**选项组（...）：**」之间
    const ia = DOC.indexOf(secs[i]);
    assert(ia >= 0, '文档缺章节：' + secs[i]);
    const tb = DOC.indexOf('**题面（档位专属）：**', ia);
    assert(tb >= 0, secs[i] + ' 缺「题面」锚点');
    const te = DOC.indexOf('**选项组', tb);
    assert(te >= 0, secs[i] + ' 缺「选项组」锚点');
    const rows = tableRows(DOC.slice(tb, te));
    eq(rows.length, 3, '第 ' + (i + 1) + ' 节表行数');
    const year = ['2017','2018','2021'][i];
    rows.forEach(([band, text]) => {
      const got = Content.life[year][band];
      assert(got !== undefined, 'content 缺生活题：' + band);
      eq(got, text, '生活题不一致：' + year + '-' + band);
      total++;
    });
  }
  eq(total, 9, '生活题总数');
});

check('§4.1-§4.3 九组选项（档位×年份）与代码 label 逐字一致', () => {
  // 文档结构：每个「档位 · 年份 · 阶段」小节各一张选项表
  // 用「**{band} 岁 · {year} · ...（S{band}@{year}）**」锚点定位
  const secs = [
    ['18 岁 · 2017 · 大一开始（S1@2017）', 'S1@2017'],
    ['22 岁 · 2017 · 工作开始（S2@2017）', 'S2@2017'],
    ['25 岁 · 2017 · 跳槽转型（S3@2017）', 'S3@2017'],
    ['18 岁 · 2018 · 大二（S1@2018）', 'S1@2018'],
    ['22 岁 · 2018 · 第二年（S2@2018）', 'S2@2018'],
    ['25 岁 · 2018 · 转型第一年（S3@2018）', 'S3@2018'],
    ['18 岁 · 2021 · 毕业求职（S1@2021）', 'S1@2021'],
    ['22 岁 · 2021 · 第五年跳槽窗口（S2@2021）', 'S2@2021'],
    ['25 岁 · 2021 · 第七年再选择（S3@2021）', 'S3@2021']
  ];
  secs.forEach(([anchor, key]) => {
    const ia = DOC.indexOf('**' + anchor + '**');
    assert(ia >= 0, '文档缺选项小节：' + anchor);
    const ib = DOC.indexOf('**', ia + anchor.length + 4);
    const rows = tableRows(DOC.slice(ia, ib < 0 ? DOC.length : ib));
    eq(rows.length, 3, anchor + ' 选项行数');
    rows.forEach((cells, idx) => {
      const docLabel = cells[0].replace(/^[ABC]\s*/, '');
      const opt = Content.lifeOptLib[key][idx];
      assert(opt, key + ' 缺第 ' + idx + ' 选项');
      eq(docLabel, opt.label, key + ' 选项文字不一致：第 ' + (idx + 1) + ' 项');
    });
  });
});

check('§4.4 绑定规则（18→S1、22→S2、25→S3，按年份取组）↔ optKeyForAge', () => {
  assert(between('### 4.4', '## 5').indexOf('18 岁档 → S1@2017') >= 0, '文档规则行缺失');
  eq(Content.optKeyForAge(18), 'S1');
  eq(Content.optKeyForAge(22), 'S2');
  eq(Content.optKeyForAge(25), 'S3');
});

check('§5 时代节点 D3-D9 标题/场景在文档中逐字存在；号外 b1/b2 与文档一致', () => {
  ['D3','D4','D4b','D5','D6','D7','D8','D9'].forEach(id => {
    const e = Content.era[id];
    assert(DOC.indexOf(e.title) >= 0, '文档缺节点标题：' + id + ' ' + e.title);
    const sceneCore = e.scene.split('。')[0].slice(0, 12);
    assert(DOC.indexOf(sceneCore) >= 0, '文档缺节点场景：' + id);
    e.opts.forEach((o, i) => {
      assert(DOC.indexOf(o.label) >= 0, '文档缺节点选项 label：' + id + ' ' + o.label);
    });
  });
  ['b1','b2'].forEach(b => {
    const ev = Content.breaking[b];
    assert(DOC.indexOf(ev.title) >= 0, '文档缺号外标题：' + b + ' ' + ev.title);
    assert(DOC.indexOf(ev.sub.slice(0, 12)) >= 0, '文档缺号外正文：' + b);
  });
  const sec61 = between('### 5.9 号外', '## 6');
  assert(sec61.indexOf('b3-b6 数据保留但永不排期') >= 0, '文档缺 b3-b6 保留说明');
  // b3-b6 保留数据的全文一致性（不排期但照抄复现）
  ['b3','b4','b5','b6'].forEach(b => {
    const ev = Content.breaking[b];
    assert(sec61.indexOf(ev.title) >= 0, '文档缺备用号外标题：' + b + ' ' + ev.title);
    const subCore = ev.sub.slice(0, 10);
    assert(sec61.indexOf(subCore) >= 0, '文档缺备用号外正文：' + b);
    ev.opts.forEach(o => {
      assert(sec61.indexOf(o.label) >= 0, '文档缺备用号外选项：' + b + ' ' + o.label);
    });
  });
});

section('【§6.0 线性时间线总表 ↔ logic.buildPlan】');

check('时间线总表：步骤 id 序列 + 年份 ↔ buildPlan 完全一致（三档）', () => {
  const rows = tableRows(between('### 6.0 核心序列', '## 7'));
  const seq = [];
  rows.forEach(cells => {
    const [no, stepType, node, year, type] = cells;
    let y = parseInt(year, 10);
    if (isNaN(y)) { const m = year.match(/^(\d{4})/); if (m) y = parseInt(m[1], 10); }
    if (!isFinite(y) || !node) return;
    // 节点列 = 具体 id（D3/D4b/b1/mid/D5...）；q 系列用 node 内嵌（q1/q2/q3 在步骤列）
    const nodeText = node.trim();
    let id;
    const mId = nodeText.match(/^(q1|q2|q3|D3|D4b|D4|D5|D6|D7|D8|D9|b1|b2|mid|end|\d+)/);
    if (/^q[123]$/.test(stepType)) id = stepType;
    else if (mId && /^(D3|D4b|D4|D5|D6|D7|D8|D9|b1|b2)$/.test(mId[1])) id = mId[1];
    else if (/虚拟/.test(type) && /中段结算卡/.test(nodeText)) id = 'mid';
    else if (/虚拟/.test(type)) id = 'end';
    else id = stepType;   // 兜底（era/breaking 等类型名）
    seq.push({ step: id, node: nodeText, type, year: y });
  });
  BANDS.forEach(A => {
    const plan = Logic.buildPlan(A);
    const codeSteps = plan.map(s => s.type === 'breaking' ? s.breakingId : (s.type === 'midsettle' ? 'mid' : s.type === 'ending' ? 'end' : s.id));
    const codeYears = plan.map(s => s.year);
    const docSteps = seq.map(s => s.step);
    const docYears = seq.map(s => s.year);
    eq(codeSteps.join(','), docSteps.join(','), '步骤 id 序列（' + A + '）');
    eq(codeYears.join(','), docYears.join(','), '步骤年份序列（' + A + '）');
    const docVirtual = seq.filter(s => /虚拟/.test(s.type)).map(s => s.step === 'mid' ? 'mid' : 'end');
    const codeVirtual = plan.filter(s => s.type === 'midsettle' || s.type === 'ending').map(s => s.type === 'midsettle' ? 'mid' : 'end');
    eq(codeVirtual.join(','), docVirtual.join(','), '虚拟步骤序列（' + A + '）');
  });
});

check('§6.0 硬性规则：决策数恒 13 / 疫情 2020 / 中段 2024 / 结局 2026 / 年龄公式', () => {
  assert(between('### 6.0', '## 7').indexOf('决策数恒 13') >= 0, '文档缺失 13 决策规则');
  BANDS.forEach(A => {
    const plan = Logic.buildPlan(A);
    const dec = plan.filter(s => ['q1','q2','q3','era','breaking'].indexOf(s.type) >= 0).length;
    eq(dec, 13, '决策数（' + A + '）');
    plan.forEach(s => {
      eq(s.age, A + (s.year - 2017), '年龄公式（' + A + ' ' + s.id + '）');
      if (s.type === 'era' && s.id === 'D4b') eq(s.year, 2020, '疫情（' + A + '）');
      if (s.type === 'midsettle') eq(s.year, 2024, '中段（' + A + '）');
      if (s.type === 'ending') eq(s.year, 2026, '结局（' + A + '）');
    });
  });
});

check('§5.9 号外排期：b1@2022 + b2@2023 全档必出，每局恰 2 次', () => {
  BANDS.forEach(A => {
    const brk = Logic.buildPlan(A).filter(s => s.type === 'breaking');
    eq(brk.length, 2, '号外数（' + A + '）');
    eq(brk[0].breakingId, 'b1', 'b1（' + A + '）');
    eq(brk[0].year, 2022, 'b1 年份（' + A + '）');
    eq(brk[1].breakingId, 'b2', 'b2（' + A + '）');
    eq(brk[1].year, 2023, 'b2 年份（' + A + '）');
  });
});

section('【§8.5 占位符 ↔ endingParams】');

check('结局占位符键与 endingParams 完全一致', () => {
  const st = State.newGame(18);
  const p = Logic.endingParams(st);
  ['AGE', '裸辞那年', '被优化那年', '开局那年', '裁员那年', '2023 那年前后'].forEach(k => {
    assert(p[k] !== undefined, 'endingParams 缺键：' + k);
  });
  const sec = between('### 8.5', '## 9');
  ['{AGE}', '{裸辞那年}', '{被优化那年}', '{开局那年}', '{裁员那年}', '{2023 那年前后}'].forEach(ph => {
    assert(sec.indexOf(ph) >= 0, '§8.5 缺占位符：' + ph);
  });
});

check('§8.5 占位符规则：开局那年恒 2017，AGE = A+9，裁员/被优化恒 2024，b2 恒 2023', () => {
  BANDS.forEach(A => {
    const p = Logic.endingParams(State.newGame(A));
    eq(p.开局那年, 2017, '开局那年（' + A + '）');
    eq(p.AGE, A + 9, 'AGE（' + A + '）');
    eq(p.被优化那年, 2024, '被优化那年（' + A + '）');
    eq(p.裁员那年, 2024, '裁员那年（' + A + '）');
    eq(p['2023 那年前后'], 2023, 'b2 年份（' + A + '）');
  });
});

section('【§10.2 档案全文 ↔ archives.js】');

check('§10.2 档案全文：21 份的标题/世界线/生活线逐字存在', () => {
  const P = Archives.all();
  eq(P.length, 21, '档案数');
  P.forEach(a => {
    assert(DOC.indexOf(a.title) >= 0, '文档缺档案标题：' + a.title);
    a.world.forEach(e => {
      assert(DOC.indexOf(e.t) >= 0, '文档缺世界线条目：' + a.title + ' / ' + e.t.slice(0, 12));
    });
    a.life.forEach(e => {
      // 生活线格式：{y} {t} 或 {y} {t}（y 可能为 ?）
      assert(DOC.indexOf(e.t) >= 0, '文档缺生活线条目：' + a.title + ' / ' + e.t.slice(0, 12));
    });
  });
});

/* ==================================================================
 * 4. 汇总
 * ================================================================== */
console.log('\n' + '─'.repeat(60));
if (failures.length === 0) {
  console.log('[test-doc] 全部通过：' + passed + ' 项');
  console.log('─'.repeat(60));
  process.exit(0);
} else {
  console.log('[test-doc] 通过 ' + passed + ' 项，失败 ' + failures.length + ' 项：');
  failures.forEach(f => console.log('  ✗ ' + f.name + '\n      ' + f.message));
  console.log('─'.repeat(60));
  process.exit(1);
}
