#!/usr/bin/env node
/**
 * 逻辑回归测试 · 《回到AI纪元第一天》v5
 *
 * v5：年份固定 2017，年龄三档（18/22/25），线性时间线 2017→2026，每局 13 决策。
 * 无浏览器即可跑完整回归：注入最小 DOM + 内存版 localStorage，
 * 加载 build/js/*.js（UMD 风格，挂 window 命名空间），模拟大量对局，
 * 断言核心不变量与数据完整性。
 *
 * 用法：node tools/test-logic.js
 */
'use strict';

const path = require('path');

/* ==================================================================
 * 1. 环境 shim
 * ================================================================== */
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(String(k)) ? this.map.get(String(k)) : null; }
  setItem(k, v) { this.map.set(String(k), String(v)); }
  removeItem(k) { this.map.delete(String(k)); }
  clear() { this.map.clear(); }
}

global.window = global;
global.localStorage = new MemoryStorage();
global.document = {
  createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
  querySelector: () => null,
  querySelectorAll: () => []
};

const BUILD = path.resolve(__dirname, '..', 'build', 'js');
// 加载顺序关键：state.js 在加载时会捕获 global.Logic / global.Util，
// 因此 logic.js 与 util.js 必须在 state.js 之前加载。
require(path.join(BUILD, 'util.js'));
require(path.join(BUILD, 'content.js'));
require(path.join(BUILD, 'logic.js'));
require(path.join(BUILD, 'archives.js'));
require(path.join(BUILD, 'state.js'));

const { Util, Content, State, Logic, Archives } = global;

/* ==================================================================
 * 2. 断言框架
 * ================================================================== */
let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failures.push({ name, message: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || '断言失败'); }
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '值不相等') + '：实际=' + JSON.stringify(a) + ' 期望=' + JSON.stringify(b)); }
function section(t) { console.log('\n' + t); }

const BANDS = Content.AGE_BANDS; // [18, 22, 25]
const ENDING_KEYS = ['A','B','C','D','E','F','G','H','I','normal'];

/* ==================================================================
 * 3. 用例
 * ================================================================== */

section('【数据完整性 · 三档开局】');

check('三档开局独白齐全（18/22/25）', () => {
  BANDS.forEach(A => {
    const t = Content.openings[String(A)];
    assert(typeof t === 'string' && t.length > 4, '缺开局独白：' + A);
  });
});

check('生活题 2017/2018/2021 × 3 档共 9 条题面齐全', () => {
  ['2017','2018','2021'].forEach(Y => {
    BANDS.forEach(A => {
      const s = Content.life[Y][String(A)];
      assert(typeof s === 'string' && s.length > 4, '缺生活题面：' + Y + '-' + A);
    });
  });
});

check('生活题选项库：9 组（S1/S2/S3 × 2017/2018/2021）全部存在且每 2-3 选项', () => {
  ['S1','S2','S3'].forEach(band => {
    ['2017','2018','2021'].forEach(Y => {
      const opts = Content.lifeOptLib[band + '@' + Y];
      assert(Array.isArray(opts) && opts.length >= 2 && opts.length <= 3, band + '@' + Y + ' 选项异常');
    });
  });
});

check('生活题 9 组：同档位三年选项标签互不相同（v6 §4 反重复断言）', () => {
  ['S1','S2','S3'].forEach(band => {
    const ys = ['2017','2018','2021'].map(Y => Content.lifeOptLib[band + '@' + Y].map(o => o.label).join('│'));
    assert(new Set(ys).size === 3, band + ' 档三年选项完全相同（重复）：' + ys.join(' / '));
    // 同档位内任意两组之间也要求整组不相同
    for (let i = 0; i < ys.length; i++) for (let j = i + 1; j < ys.length; j++) {
      assert(ys[i] !== ys[j], band + ' 组 ' + i + ' 与组 ' + j + ' 完全重复');
    }
  });
});

check('生活题 9 组：跨档位同年的选项组语义不冲突（A/B/C 轮换标志位）', () => {
  // 同一选项 label 允许出现在不同档位（如「稳住」），但同档位同年不能出现相同 label
  ['2017','2018','2021'].forEach(Y => {
    ['S1','S2','S3'].forEach(band => {
      const lbls = Content.lifeOptLib[band + '@' + Y].map(o => o.label);
      assert(new Set(lbls).size === lbls.length, band + '@' + Y + ' 组内出现重复 label');
    });
  });
});

check('所有决策选项含 label/effect/echo/life 四要素', () => {
  let bad = 0;
  const scan = (opts) => (opts || []).forEach(o => {
    if (!o.label || !o.effect || !o.echo || !o.life) bad++;
  });
  ['S1','S2','S3'].forEach(band => ['2017','2018','2021'].forEach(Y => scan(Content.lifeOptLib[band + '@' + Y])));
  ['D3','D4','D4b','D5','D6','D7','D8','D9'].forEach(id => scan(Content.era[id].opts));
  Object.keys(Content.breaking).forEach(b => scan(Content.breaking[b].opts));
  eq(bad, 0, '缺要素的选项错误数');
});

check('8 个年代节点 D3-D9 全部存在且各 2-3 个选项', () => {
  ['D3','D4','D4b','D5','D6','D7','D8','D9'].forEach(id => {
    const e = Content.era[id];
    assert(e && e.title && e.scene, '年代节点缺字段：' + id);
    assert(e.opts.length >= 2 && e.opts.length <= 3, '选项数异常：' + id);
  });
});

check('6 个号外事件齐全（b1/b2 参与排期，b3-b6 数据保留）', () => {
  ['b1','b2','b3','b4','b5','b6'].forEach(b => {
    const ev = Content.breaking[b];
    assert(ev && ev.title && ev.yearLabel, '号外缺字段：' + b);
    assert(ev.opts.length >= 2, '号外选项不足：' + b);
  });
  assert(Content.breaking.b5, 'b5 数据应保留（不进排期）');
});

check('10 个结局（A-I + 普通）的 archive 全部存在于档案库', () => {
  const keys = new Set(Archives.all().map(a => a.key));
  ENDING_KEYS.forEach(k => {
    const e = Content.endings[k];
    assert(e, '缺结局：' + k);
    assert(e.name && e.bio && e.judge && e.tendency !== undefined, '结局字段不全：' + k);
    assert(keys.has(e.archive), '结局 ' + k + ' 引用不存在的档案：' + e.archive);
  });
});

check('16 型人格齐全且稀有型定义一致', () => {
  const P = Content.personality;
  eq(P.types.length, 16, '人格类型数');
  P.types.forEach(t => { assert(t.code && t.code.length === 4 && t.name && t.portrait, '人格字段不全：' + t.code); });
  assert(P.rare.RGPI && P.rare.RGPO, '稀有型定义缺失');
});

check('21 份档案：世界线 11 + 人生实录 10，key 唯一', () => {
  eq(Archives.world().length, 11, '世界线档案数');
  eq(Archives.life().length, 10, '人生实录档案数');
  eq(Archives.TOTAL, 21, '档案总数');
  const seen = {};
  Archives.all().forEach(a => {
    assert(a.key && a.cat && a.n && a.title && a.world && a.life, '档案字段不全：' + a.key);
    assert(!seen[a.key], '档案 key 重复：' + a.key);
    seen[a.key] = true;
  });
});

check('内容层无 emoji', () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const scan = (o, where) => {
    if (typeof o === 'string') assert(!emoji.test(o), where + ' 含 emoji：' + o.slice(0, 40));
    else if (o && typeof o === 'object') Object.keys(o).forEach(k => scan(o[k], where + '.' + k));
  };
  scan(Content, 'Content');
  scan(Archives.all(), 'Archives');
});

section('【开局公式与映射（v5：年份恒 2017）】');

check('初始值公式：5 项有限、心态≥35 下限、AI 依赖受控、随年龄单调', () => {
  let prevDeposit = -1, prevSkill = -1, prevNetwork = -1, prevMind = 999;
  BANDS.forEach(A => {
    const v = Logic.initialValues(A);
    ['deposit','skill','network','mind','aiDep'].forEach(k => {
      assert(typeof v[k] === 'number' && isFinite(v[k]), '非有限：' + A + ' ' + k);
    });
    assert(v.mind >= 35, '心态跌破下限：' + A);
    assert(v.aiDep >= 0 && v.aiDep <= 30, 'AI 依赖越界：' + A);
    assert(v.deposit > prevDeposit, '存款应随年龄递增：' + A);
    assert(v.skill > prevSkill, '技能应随年龄递增：' + A);
    assert(v.network > prevNetwork, '人脉应随年龄递增：' + A);
    assert(v.mind < prevMind, '心态应随年龄递减：' + A);
    prevDeposit = v.deposit; prevSkill = v.skill; prevNetwork = v.network; prevMind = v.mind;
  });
});

check('档位映射：18→S1/m3/l1、22→S2/m1/l2、25→S3/m2/l3', () => {
  eq(Content.optKeyForAge(18), 'S1');
  eq(Content.optKeyForAge(22), 'S2');
  eq(Content.optKeyForAge(25), 'S3');
  eq(Logic.modeFor(18), 'm3', '18 档模式');
  eq(Logic.modeFor(22), 'm1', '22 档模式');
  eq(Logic.modeFor(25), 'm2', '25 档模式');
  eq(Logic.stageForAge(18), 'l1', 'stage 18');
  eq(Logic.stageForAge(22), 'l2', 'stage 22');
  eq(Logic.stageForAge(25), 'l3', 'stage 25');
  eq(Logic.eraForYear(2018), 1, 'era 2018');
  eq(Logic.eraForYear(2021), 2, 'era 2021');
  eq(Logic.eraForYear(2024), 3, 'era 2024');
  eq(Logic.eraForYear(2026), 4, 'era 2026');
});

check('开局恒定 2017 年（无年份选择）', () => {
  BANDS.forEach(A => {
    const st = State.newGame(A);
    eq(st.startYear, 2017, 'startYear 恒 2017：' + A);
    eq(st.id, '2017-' + A, '局 id');
  });
});

section('【流程结构 · v5 线性时间线（策划案 §6.0）】');

function decisionCount(plan) {
  return plan.filter(s => ['q1','q2','q3','era','breaking'].indexOf(s.type) >= 0).length;
}

check('决策总数恒 13（三档一致）', () => {
  BANDS.forEach(A => {
    const plan = Logic.buildPlan(A);
    eq(decisionCount(plan), 13, '决策数异常：' + A);
  });
});

check('时间线：步骤序列、年份、年龄公式全部符合 §6.0（线性，不跳年）', () => {
  // 期望序列（类型:id@年份）
  const EXPECTED = [
    ['q1','q1',2017], ['q2','q2',2018], ['era','D3',2019], ['era','D4b',2020],
    ['q3','q3',2021], ['breaking','b1',2022], ['breaking','b2',2023],
    ['era','D4',2024], ['midsettle','mid',2024], ['era','D5',2024],
    ['era','D6',2025], ['era','D7',2025], ['era','D8',2026], ['era','D9',2026],
    ['ending','end',2026]
  ];
  BANDS.forEach(A => {
    const plan = Logic.buildPlan(A);
    eq(plan.length, EXPECTED.length, '步数不一致：' + A);
    plan.forEach((s, i) => {
      const [type, id, year] = EXPECTED[i];
      eq(s.type, type, '第 ' + i + ' 步类型：' + A);
      const wantId = s.type === 'breaking' ? s.breakingId : s.id;
      eq(wantId, id, '第 ' + i + ' 步节点：' + A);
      eq(s.year, year, '第 ' + i + ' 步年份：' + A);
      eq(s.age, A + (year - 2017), '年龄公式：' + A + ' ' + id);
    });
  });
});

check('节点内容年代绑定：D3 2019 / D4b 2020 / D4 2024 / D5 2024 / D6 2025 / D7 2025 / D8 2026 / D9 2026', () => {
  BANDS.forEach(A => {
    const plan = Logic.buildPlan(A);
    plan.forEach(s => {
      if (s.type !== 'era') return;
      const y = s.year;
      if (s.id === 'D3') eq(y, 2019, 'D3');
      if (s.id === 'D4b') eq(y, 2020, 'D4b');
      if (s.id === 'D4' || s.id === 'D5') eq(y, 2024, s.id);
      if (s.id === 'D6' || s.id === 'D7') eq(y, 2025, s.id);
      if (s.id === 'D8' || s.id === 'D9') eq(y, 2026, s.id);
    });
  });
});

check('号外固定：每局恰 2 次 b1@2022 + b2@2023，全档一致', () => {
  BANDS.forEach(A => {
    const brk = Logic.buildPlan(A).filter(s => s.type === 'breaking');
    eq(brk.length, 2, '号外数：' + A);
    eq(brk[0].breakingId, 'b1', 'b1 顺序：' + A);
    eq(brk[0].year, 2022, 'b1 年份：' + A);
    eq(brk[1].breakingId, 'b2', 'b2 顺序：' + A);
    eq(brk[1].year, 2023, 'b2 年份：' + A);
  });
});

check('中段结算恰 1 次 @2024，以 ending@2026 收尾', () => {
  BANDS.forEach(A => {
    const plan = Logic.buildPlan(A);
    const mids = plan.filter(s => s.type === 'midsettle');
    eq(mids.length, 1, '中段次数：' + A);
    eq(mids[0].year, 2024, '中段年份：' + A);
    eq(plan[plan.length - 1].type, 'ending', '收尾：' + A);
  });
});

check('每步决策都能取到 ≥2 个选项（q1/q2/q3 档位专属）', () => {
  BANDS.forEach(A => {
    const st = Logic.newGame(A);
    st.plan.forEach((step, i) => {
      if (['q1','q2','q3','era','breaking'].indexOf(step.type) < 0) return;
      const c = Logic.stepContent(st, step);
      assert(c && Array.isArray(c.options) && c.options.length >= 2, '步骤 ' + i + ' 选项不足：' + A);
      // 生活题选项库必须等于该档位 × 年份组（9 组不混用，v6 §4.4）
      if (step.type === 'q1' || step.type === 'q2' || step.type === 'q3') {
        const band = Content.optKeyForAge(A);
        eq(c.options, Content.lifeOptLib[band + '@' + step.year], '档位×年份选项库错配：' + A + ' ' + step.type + '@' + step.year);
      }
    });
  });
});

check('生活题题面：三档在 2017/2018/2021 的 scene 互不相同（档位专属）', () => {
  ['2017','2018','2021'].forEach(Y => {
    const scenes = BANDS.map(A => Content.life[Y][String(A)]);
    assert(new Set(scenes).size === 3, '档位题面重复：' + Y);
  });
});

section('【通关与不变量 · 三档 × 随机对局】');

function play(state, rng) {
  let guard = 0;
  while (state.screen !== 'ending') {
    if (++guard > 200) throw new Error('流程未终止：' + state.startYear + '-' + state.startAge);
    const step = State.currentStep(state);
    if (['q1','q2','q3','era','breaking'].indexOf(step.type) >= 0) {
      const opts = State.optionsFor(state, step);
      State.choose(state, step, Util.pickIndex(rng, opts));
    }
    State.advance(state);
    // 不变量：资源有限、技能/人脉/心态受控
    const r = state.res;
    ['deposit','skill','network','mind','aiDep'].forEach(k => {
      assert(typeof r[k] === 'number' && isFinite(r[k]), '资源非有限：' + k);
    });
    assert(r.skill >= 0 && r.skill <= 100, '技能越界');
    assert(r.network >= 0 && r.network <= 100, '人脉越界');
    assert(r.mind >= 0 && r.mind <= 100, '心态越界');
    assert(r.aiDep >= 0 && r.aiDep <= 100, 'AI 依赖越界');
  }
  return state;
}

check('3 档 × 10 随机种子：全部走完且资源恒合法', () => {
  BANDS.forEach(A => {
    for (let s = 1; s <= 10; s++) {
      const st = State.newGame(A);
      const rng = Util.makeRng(s * 1000 + A);
      play(st, rng);
      assert(st.ended, '未结束：' + A);
      assert(st.ending && st.ending.key, '缺结局：' + A);
      assert(st.personality && st.personality.code, '缺人格：' + A);
      assert(Array.isArray(st.archives) && st.archives.length > 0, '档案未解锁：' + A);
    }
  });
});

check('结局判定确定性（幂等）', () => {
  BANDS.forEach(A => {
    const st = play(State.newGame(A), Util.makeRng(7));
    const again = Logic.computeEnding(st);
    eq(again.key, st.ending.key, '结局判定不幂等：' + A);
  });
});

section('【结局可达性 · 确定性构造】');

function craftEnding(over) {
  const st = Logic.newGame(18);
  // 重置到可控基线
  st.res = { deposit: 10, skill: 50, network: 50, mind: 60, aiDep: 30 };
  st.flags = {}; st.lows = 0; st.tend = {};
  Object.keys(over).forEach(k => { st[k] = over[k]; });
  return Logic.computeEnding(st).key;
}

check('10 个结局全部可通过构造状态命中', () => {
  const cases = {
    // G 先判（fail 优先）：非 G 构造态需不命中 G（aiDep<22 或 skill>70 或 net<35 或 taughtAI）
    A: craftEnding({ res: { deposit: 10, skill: 72, network: 50, mind: 70, aiDep: 30 }, tend: { 清醒打工人: 100 } }),
    B: craftEnding({ res: { deposit: 9, skill: 62, network: 30, mind: 60, aiDep: 35 }, flags: { bareQuit: true }, tend: { 一人公司: 100 } }),
    C: craftEnding({ res: { deposit: 10, skill: 70, network: 60, mind: 60, aiDep: 15 }, flags: { taughtAI: true }, tend: { 上岸教练: 100 } }),
    D: craftEnding({ res: { deposit: 30, skill: 72, network: 50, mind: 60, aiDep: 22 }, flags: { choseCS: true }, tend: { 技术红利: 100 } }),
    E: craftEnding({ res: { deposit: 10, skill: 50, network: 50, mind: 70, aiDep: 15 }, flags: { backSmallCity: true }, tend: { 数字隐士: 100 } }),
    F: craftEnding({ res: { deposit: 10, skill: 55, network: 50, mind: 50, aiDep: 15 }, lows: 2, tend: { 浪里掌舵: 100 } }),
    G: craftEnding({ res: { deposit: 10, skill: 64, network: 37, mind: 60, aiDep: 29 }, tend: {} }),
    H: craftEnding({ res: { deposit: 10, skill: 71, network: 50, mind: 60, aiDep: 26 }, flags: { scamRisk: true }, tend: { 茧房: 100 } }),
    I: craftEnding({ res: { deposit: 10, skill: 40, network: 30, mind: 60, aiDep: 30 }, tend: { 茧房: 100 } }),
    normal: craftEnding({ res: { deposit: 5, skill: 71, network: 30, mind: 40, aiDep: 30 }, tend: {} })
  };
  const got = Object.keys(cases).filter(k => cases[k] === k);
  const missing = ENDING_KEYS.filter(k => cases[k] !== k);
  if (missing.length) throw new Error('以下结局构造未命中：' + missing.join(',') + ' → ' + JSON.stringify(cases));
});

section('【人格计算】');

check('构造 RGPI 稀有型可命中（resistAI + 高技能 + 裸辞 + 人脉<技能）', () => {
  const st = Logic.newGame(18);
  st.res = { deposit: 10, skill: 80, network: 40, mind: 60, aiDep: 15 }; // 15 < 21（18 档相对基线）→ R
  st.flags = { bareQuit: true };
  const p = Logic.computePersonality(st);
  eq(p.code, 'RGPI', '稀有型代码');
  eq(p.type.rare, true, '应为稀有型');
});

check('普通路径人格代码长度为 4 且类型存在', () => {
  const st = play(State.newGame(22), Util.makeRng(3));
  const p = Logic.computePersonality(st);
  eq(p.code.length, 4, '人格代码长度');
  const found = Content.personality.types.filter(t => t.code === p.code)[0];
  assert(found, '人格代码无对应类型：' + p.code);
});

check('16 型人格全部可通过构造状态命中（含 A 半区，v6 相对基线修复回归）', () => {
  const P = Content.personality.types;
  const bad = [];
  P.forEach(t => {
    const st = Logic.newGame(18);
    const [ar, gs, tp, io] = t.code.split('');
    const aiDepNeed = Logic.initialValues(18).aiDep + (ar === 'A' ? 18 : 0);
    let skill = 50, network = 50;
    if (io === 'I') { skill = 60; network = 50; }
    if (io === 'O') { network = 60; skill = 50; }
    st.res = { deposit: 10, skill: skill, network: network, mind: 60, aiDep: aiDepNeed };
    st.flags = {};
    if (gs === 'G') { st.flags.bareQuit = true; st.bareQuit = true; st.jumps = 2; }
    else st.flags.steady = true;
    if (tp === 'T') st.flags.choseCS = true;
    const p = Logic.computePersonality(st);
    if (p.code !== t.code) bad.push(t.code + '→' + p.code);
  });
  eq(bad.length, 0, '不可达人格型：' + bad.join(', '));
});

section('【结局占位符（策划案 v5 §8.4）】');

check('endingParams：AGE/开局那年恒 2017/裁员那年 2024/2023那年前后 2023', () => {
  const st = State.newGame(25);
  const p = Logic.endingParams(st);
  eq(p.AGE, 34, 'AGE 应为 25 + 9');
  eq(p.开局那年, 2017, '开局那年恒 2017');
  eq(p.被优化那年, 2024, '被优化那年（D5 恒 2024）');
  eq(p.裁员那年, 2024, '裁员那年');
  eq(p['2023 那年前后'], 2023, 'b2 年份（恒 2023）');
  const st18 = State.newGame(18);
  eq(Logic.endingParams(st18).AGE, 27, 'AGE 18 档 = 27');
});

check('裸辞那年 = 实际做出裸辞选择的那一年', () => {
  const st = State.newGame(22);
  const step = st.plan.filter(s => s.type === 'era' && s.id === 'D5')[0];
  State.choose(st, step, 2); // D5-C 辞职搞副业 → bareQuit
  eq(Logic.endingParams(st).裸辞那年, 2024, '裸辞年份');
});

check('全结局文案 tpl 替换后无残留大括号', () => {
  ['A','B','C','D','E','F','G','H','I','normal'].forEach(k => {
    const st = State.newGame(18);
    st.flags = { bareQuit: true, taughtAI: true, choseCS: true, backSmallCity: true, scamRisk: true };
    st.flagYears = { bareQuit: 2023, taughtAI: 2024, choseCS: 2017, scamRisk: 2023 };
    const bio = Util.tpl(Content.endings[k].bio, Logic.endingParams(st));
    assert(bio.indexOf('{') < 0 && bio.indexOf('}') < 0, '残留占位符：结局 ' + k + ' → ' + bio.slice(0, 60));
    assert(bio.indexOf('{AGE}') < 0 && bio.indexOf('{裸辞') < 0, '占位符未替换：' + k);
  });
});

section('【存档与档案】');

check('存档写入后再读，非瞬时态一致', () => {
  const st = State.newGame(22);
  const rng = Util.makeRng(5);
  for (let i = 0; i < 5; i++) {
    const step = State.currentStep(st);
    if (['q1','q2','q3','era','breaking'].indexOf(step.type) >= 0) State.choose(st, step, Util.pickIndex(rng, State.optionsFor(st, step)));
    State.advance(st);
  }
  State.save(st);
  const loaded = State.load();
  assert(loaded, '读档为空');
  eq(loaded.stepIndex, st.stepIndex, '步数不一致');
  eq(loaded.startYear, st.startYear, '起点年不一致');
  eq(JSON.stringify(loaded.res), JSON.stringify(st.res), '资源不一致');
  assert(loaded._pending === null && loaded._lastStamp === undefined, '瞬时态未剔除');
});

check('损坏存档安全返回 null 且不抛错', () => {
  let threw = false, r = null;
  try {
    global.localStorage.setItem(State.SAVE_KEY, '{ 坏掉的 json');
    r = State.load();
  } catch (e) { threw = true; }
  assert(!threw, '读损坏存档应不抛错');
  eq(r, null, '损坏存档应返回 null');
});

check('localStorage 不可用时读写安全降级', () => {
  const backup = global.localStorage;
  global.localStorage = {
    getItem() { throw new Error('模拟存储不可用'); },
    setItem() { throw new Error('模拟存储不可用'); },
    removeItem() { throw new Error('模拟存储不可用'); }
  };
  const st = State.newGame(22);
  const r1 = State.save(st);
  const r2 = State.load();
  assert(r1 === false, 'save 应返回 false');
  assert(r2 === null, 'load 应返回 null');
  global.localStorage = backup;
});

check('档案解锁：6 份人物档案齐全后自动含 chronicle', () => {
  const st = Logic.newGame(22);
  st.reachedYear = 2026;
  const keys = Logic.unlockArchives(st);
  ['openai','moonshot','anthropic','opensource','deepmind','deepseek'].forEach(k =>
    assert(keys.indexOf(k) >= 0, '人物档案未解锁：' + k));
  assert(keys.indexOf('chronicle') >= 0, '隐藏总表未解锁');
  assert(keys.length <= 21, '解锁数越界：' + keys.length);
});

section('【数值与工具】');

check('数字安全：非法输入不产生 NaN / 越界', () => {
  eq(Util.num('abc', 5), 5);
  eq(Util.num(undefined, 0), 0);
  eq(Util.num(Infinity, 3), 3);
  eq(Util.clamp(150, 0, 100), 100);
  eq(Util.clamp(-5, 0, 100), 0);
  eq(Util.clamp('x', 0, 100), 0);
});

check('金额格式化输出合法', () => {
  assert(Util.fmtMoney(3).indexOf('万') >= 0, '金额格式化');
  assert(Util.fmtDelta(-20).indexOf('-') >= 0, '负向 delta');
  assert(Util.fmtDelta(8).indexOf('+') >= 0, '正向 delta');
});

/* ==================================================================
 * 4. 汇总
 * ================================================================== */
console.log('\n' + '─'.repeat(60));
if (failures.length === 0) {
  console.log('[test-logic] 全部通过：' + passed + ' 项');
  console.log('─'.repeat(60));
  process.exit(0);
} else {
  console.log('[test-logic] 通过 ' + passed + ' 项，失败 ' + failures.length + ' 项：');
  failures.forEach(f => console.log('  ✗ ' + f.name + '\n      ' + f.message));
  console.log('─'.repeat(60));
  process.exit(1);
}
