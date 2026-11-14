#!/usr/bin/env node
/**
 * 平衡模拟 · 《回到AI纪元第一天》v5
 *
 * 1) 随机瞎选 3000 局（三档 18/22/25 均分）→ 结局分布
 * 2) 目标导向：10 个结局各自的可达性（构造倾向与资源策略，走完整局）
 *
 * 用法：node tools/balance.js
 */
'use strict';

const path = require('path');

global.window = global;
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.document = { createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }), querySelector: () => null, querySelectorAll: () => [] };

const BUILD = path.resolve(__dirname, '..', 'build', 'js');
require(path.join(BUILD, 'util.js'));
require(path.join(BUILD, 'content.js'));
require(path.join(BUILD, 'logic.js'));
require(path.join(BUILD, 'archives.js'));
require(path.join(BUILD, 'state.js'));

const { Util, Content, State, Logic } = global;
const BANDS = Content.AGE_BANDS;

function playRandom(state, rng) {
  let guard = 0;
  while (state.screen !== 'ending') {
    if (++guard > 200) throw new Error('未终止');
    const step = State.currentStep(state);
    if (['q1','q2','q3','era','breaking'].indexOf(step.type) >= 0) {
      State.choose(state, step, Util.pickIndex(rng, State.optionsFor(state, step)));
    }
    State.advance(state);
  }
  return state;
}

/* ---------- 1. 随机分布 ---------- */
const dist = {};
const N = 3000;
for (let i = 0; i < N; i++) {
  const A = BANDS[i % BANDS.length];
  const st = playRandom(State.newGame(A), Util.makeRng(i * 31 + 7));
  dist[st.ending.key] = (dist[st.ending.key] || 0) + 1;
}
console.log('=== 随机瞎选 ' + N + ' 局分布（三档均分）===');
Object.keys(dist).sort((a, b) => dist[b] - dist[a]).forEach(k => {
  console.log('  ' + k.padEnd(8) + (100 * dist[k] / N).toFixed(1) + '%');
});

/* ---------- 2. 目标导向可达性 ---------- */
/* 对每个结局：线性打分选择最该选的选项（权重按结局定制），走完整局 */
function playTargeted(state, c) {
  let guard = 0;
  while (state.screen !== 'ending') {
    if (++guard > 200) throw new Error('未终止');
    const step = State.currentStep(state);
    if (['q1','q2','q3','era','breaking'].indexOf(step.type) >= 0) {
      const opts = State.optionsFor(state, step);
      let best = 0, bestScore = -Infinity;
      opts.forEach((o, i) => {
        let sc = 0;
        if (c.nodePick && c.nodePick[step.id] != null && c.nodePick[step.id] === i) sc += 1000;
        if (o.tend) Object.keys(o.tend).forEach(t => { if (t === c.tend) sc += c.wTend || 8; });
        if (c.wantFlags) c.wantFlags.forEach(f => { if (o.flag === f) sc += c.wFlag || 25; });
        if (c.avoidFlags) c.avoidFlags.forEach(f => { if (o.flag === f) sc -= (c.wAvoid || 30); });
        if (c.skillCap != null && o.effect && o.effect.skill != null && state.res.skill + o.effect.skill > c.skillCap) sc -= 60;
        if (o.effect && c.wRes) Object.keys(c.wRes).forEach(k => {
          if (o.effect[k] != null) sc += c.wRes[k] * o.effect[k];
        });
        if (sc > bestScore) { bestScore = sc; best = i; }
      });
      State.choose(state, step, best);
    }
    State.advance(state);
  }
  return state;
}

const cases = [
  // A 清醒打工人：少依赖、多技能/心态；不回小城（否则被 E 吸走）；心态权重高于技能（境界是「稳」）
  { key: 'A', name: '清醒打工人', starts: [18, 22, 25], tend: '清醒打工人', avoidFlags: ['backSmallCity'],
    wRes: { mind: 2.2, skill: 1.5, aiDep: -2.5 } },
  // B 一人公司：裸辞 + 技能/存款 + AI 依赖 ≥30，避开诈骗标记；D8 必须"不上车"（防存款击穿）
  { key: 'B', name: '一人公司', starts: [18, 25], tend: '一人公司', wantFlags: ['bareQuit'], avoidFlags: ['scamRisk'],
    wFlag: 70, wTend: 5, nodePick: { D8: 1 }, wRes: { skill: 1.3, deposit: 4.5, aiDep: 4.0, mind: -0.6 } },
  // C 上岸教练：教人 + 技能/人脉
  { key: 'C', name: '上岸教练', starts: [18, 22], tend: '上岸教练', wantFlags: ['taughtAI'], wRes: { skill: 1.5, network: 1.5, aiDep: 0.6 } },
  // D 技术红利：计算机 + 存款/技能（存款权重高于技能与倾向分，避免负存款选项）
  { key: 'D', name: '技术红利', starts: [18], tend: '技术红利', wantFlags: ['choseCS'], wRes: { deposit: 5.0, skill: 1.0 } },
  // E 数字隐士：回小城 + 心态高，AI 依赖压低（防 H/G/I）
  { key: 'E', name: '数字隐士', starts: [18, 22, 25], tend: '数字隐士', wantFlags: ['backSmallCity'], wRes: { mind: 2, aiDep: -3, skill: -0.5 } },
  // F 浪里掌舵：制造一次低谷（存款≤0 或 心态≤20），再保技能/心态
  // 25 岁档存款 8.9 起步、心态 44 起步，低谷难触发（设计意图：底子厚的人不易「被浪打翻」）
  { key: 'F', name: '浪里掌舵', starts: [18, 22], tend: '浪里掌舵', avoidFlags: ['scamRisk', 'backSmallCity'],
    wRes: { deposit: -2.5, skill: 1.2, mind: 0.8, aiDep: -2 } },
  // G 被浪吞：AI 依赖拉满（≥22）+ 技能 ≤70 + 人脉 ≥36；不教别人（taughtAI 会归 A/C）
  // 仅 18 岁档测（22 岁档技能底子 31 起步 + AI 选项必然 +35 = 66+，天然免疫；25 岁档同理——设计意图：越有基础越难被吞）
  { key: 'G', name: '被浪吞', starts: [18], tend: null, avoidFlags: ['scamRisk', 'backSmallCity', 'taughtAI'], skillCap: 70,
    wRes: { aiDep: 5, skill: -0.6, network: 1.0, mind: 0.05 } },
  // H 反诈受害者：拿诈骗标记 + AI 依赖 ≥26，不装防骗
  { key: 'H', name: '反诈受害者', starts: [18, 22, 25], tend: null, wantFlags: ['scamRisk'], avoidFlags: ['antiScam', 'backSmallCity'],
    wRes: { aiDep: 2, mind: 0.5 } },
  // I 茧房：AI 依赖拉满 + 技能 ≤60 + 人脉 ≤35；避开回小城
  // 22 岁档人脉 32、技能 31 起步，涨得快；25 岁档人脉 41 >35 天然免疫（设计意图：年纪越大越难掉进茧房）
  { key: 'I', name: '茧房', starts: [18], tend: '茧房', avoidFlags: ['scamRisk', 'backSmallCity'], skillCap: 60,
    wRes: { aiDep: 5, skill: -2.5, network: -1.5, mind: -0.3 } },
  // normal 普通型：心态压低（A/E 失效）、不拿关键 flag、AI 依赖不越 30（防 H）
  { key: 'normal', name: '普通型', starts: [18, 25], tend: null, avoidFlags: ['scamRisk', 'bareQuit', 'backSmallCity', 'taughtAI', 'choseCS', 'jump'],
    wRes: { mind: -2, skill: -0.5, aiDep: -1.5 } }
];

console.log('\n=== 目标导向可达性（每结局多个年龄档）===');
let allOk = true;
cases.forEach(c => {
  const results = [];
  c.starts.forEach(A => {
    const st = playTargeted(State.newGame(A), c);
    results.push(A + '岁:' + st.ending.key);
  });
  const ok = results.every(r => r.indexOf(':' + c.key) >= 0);
  if (!ok) allOk = false;
  console.log('  ' + c.key.padEnd(8) + (ok ? 'OK  ' : 'FAIL') + ' ' + c.name + '  →  ' + results.join(' / '));
});
if (!allOk) process.exit(1);
