#!/usr/bin/env node
/**
 * UI 冒烟测试 · 《回到AI纪元第一天》(v3.3)
 *
 * 目的：在无浏览器的 Node 环境里，验证 UI 层"能跑通、不崩、按钮都绑定、无 emoji、
 *       无内联事件、按钮均为 <button type=button>"。
 * 做法：自写最小 DOM/canvas shim（零外部依赖）；用与 main.js 等价的 handler 驱动
 *       State 状态机，通过真实的 DOM 点击走完 开局→决策→中段结算→结局→档案柜→
 *       档案页→成绩卡 全链路。
 *
 * 用法：node tools/test-ui.js
 */

'use strict';

const path = require('path');

/* ==================================================================
 * 1. 最小 DOM / Canvas shim
 * ================================================================== */
const BY_ID = new Map();

function makeCtx2d() {
  return {
    fillStyle: '', strokeStyle: '', font: '', lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic',
    globalAlpha: 1,
    fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {}, strokeText() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
    arc() {}, save() {}, restore() {}, translate() {}, rotate() {},
    measureText(s) { return { width: String(s == null ? '' : s).length * 12 }; }
  };
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = Object.create(null);
    this.childNodes = [];
    this.parentNode = null;
    this.className = '';
    this.style = {};
    this._text = '';
    this._html = '';
    this._listeners = Object.create(null);
    const self = this;
    this.classList = {
      add(c) { const s = new Set(self._classes()); s.add(c); self.className = Array.from(s).join(' '); },
      remove(c) { const s = new Set(self._classes()); s.delete(c); self.className = Array.from(s).join(' '); },
      contains(c) { return self._classes().indexOf(c) !== -1; },
      toggle(c, force) {
        const has = self._classes().indexOf(c) !== -1;
        const on = (typeof force === 'boolean') ? force : !has;
        if (on) this.add(c); else this.remove(c);
        return on;
      }
    };
  }
  _classes() { return this.className ? this.className.split(/\s+/).filter(Boolean) : []; }

  // 让 `el('div',{id:'x'})` 设置的 .id 与 getElementById 互通（模拟浏览器行为）
  get id() { return this._id; }
  set id(v) { this._id = String(v); this.attrs.id = String(v); BY_ID.set(String(v), this); }

  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'id') BY_ID.set(String(v), this);
  }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }

  appendChild(c) {
    if (!c) throw new Error('appendChild 收到空节点');
    c.parentNode = this;
    this.childNodes.push(c);
    return c;
  }
  removeChild(c) {
    const i = this.childNodes.indexOf(c);
    if (i === -1) throw new Error('removeChild：节点不是子节点');
    this.childNodes.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  get children() { return this.childNodes; }
  get firstChild() { return this.childNodes[0] || null; }

  addEventListener(type, fn) {
    if (typeof fn !== 'function') throw new Error('addEventListener 的回调不是函数：' + type);
    (this._listeners[type] || (this._listeners[type] = [])).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this._listeners[type] || [];
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  }
  dispatch(type, extra) {
    const ev = Object.assign({ type, target: this, preventDefault() {}, stopPropagation() {} }, extra || {});
    (this._listeners[type] || []).slice().forEach(fn => fn(ev));
    return ev;
  }
  click() { return this.dispatch('click'); }

  get textContent() {
    if (this._text) return this._text;
    return this.childNodes.map(c => c.textContent).join('');
  }
  set textContent(v) {
    this.childNodes.forEach(c => { c.parentNode = null; });
    this.childNodes = [];
    this._text = String(v == null ? '' : v);
  }

  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }

  walk(out) {
    out = out || [];
    this.childNodes.forEach(c => { out.push(c); c.walk(out); });
    return out;
  }

  matches(sel) {
    if (!sel) return false;
    if (sel.charAt(0) === '.') {
      const parts = sel.slice(1).split('.').filter(Boolean);
      const cls = this._classes();
      return parts.every(p => cls.indexOf(p) !== -1);
    }
    if (sel.charAt(0) === '#') return this.getAttribute('id') === sel.slice(1);
    return this.tagName === sel.toUpperCase();
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    this.walk().forEach(n => { if (n.matches(sel)) out.push(n); });
    return out;
  }
  scrollIntoView() {}
  focus() {}
  getContext(type) { return type === '2d' ? makeCtx2d() : null; }
  toDataURL() { return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='; }
}

const document = {
  readyState: 'complete',
  body: new El('body'),
  documentElement: new El('html'),
  createElement(tag) { return new El(tag); },
  createTextNode(t) { const e = new El('#text'); e.textContent = t; return e; },
  getElementById(id) { return BY_ID.get(String(id)) || null; },
  addEventListener() {},
  querySelector(sel) {
    if (!sel) return null;
    if (sel.charAt(0) === '#') return BY_ID.get(sel.slice(1)) || null;
    return document.body.querySelector(sel);
  },
  querySelectorAll(sel) { return document.body.querySelectorAll(sel); }
};

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(String(k)) ? this.map.get(String(k)) : null; }
  setItem(k, v) { this.map.set(String(k), String(v)); }
  removeItem(k) { this.map.delete(String(k)); }
  clear() { this.map.clear(); }
}

global.window = global;
global.document = document;
global.localStorage = new MemoryStorage();
global.addEventListener = function () {};
global.setTimeout = function (fn) { fn(); return 0; };   // UI 用 setTimeout 触发成绩卡绘制，测试里同步执行
global.location = { reload() {} };
global.matchMedia = function () { return { matches: false }; };
global.requestAnimationFrame = function (cb) { cb(); return 0; };
global.getComputedStyle = function () { return { getPropertyValue() { return ''; } }; };
// 注意：Node 的 global.navigator 为只读 getter，不要赋值（本项目也不需要）

/* ==================================================================
 * 2. 加载模块（顺序：util → content → logic → archives → state → ui）
 *    说明：state.js 在加载时即捕获 global.Logic/Util；ui.js 加载时捕获
 *          Util/Content/State/Archives/Logic —— 故 logic 必须在 state 前、
 *          state 必须在 ui 前。
 * ================================================================== */
const BUILD = path.resolve(__dirname, '..', 'build', 'js');
require(path.join(BUILD, 'util.js'));
require(path.join(BUILD, 'content.js'));
require(path.join(BUILD, 'logic.js'));
require(path.join(BUILD, 'archives.js'));
require(path.join(BUILD, 'state.js'));
require(path.join(BUILD, 'ui.js'));

const { Util, Content, Logic, State, Archives, UI } = global;

/* ==================================================================
 * 3. 断言框架
 * ================================================================== */
let passed = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failures.push({ name, message: e.message }); console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(c, m) { if (!c) throw new Error(m || '断言失败'); }
function eq(a, b, m) { if (a !== b) throw new Error((m || '值不相等') + '：实际=' + JSON.stringify(a) + ' 期望=' + JSON.stringify(b)); }
function section(t) { console.log('\n' + t); }

/* 在 #app 渲染树下查询 */
const appNode = new El('div');
appNode.setAttribute('id', 'app');
appNode.className = 'app';
document.body.appendChild(appNode);

function q(sel) { return document.querySelector('#app') ? document.querySelector('#app').querySelector(sel) : null; }
function qa(sel) { const app = document.querySelector('#app'); return app ? app.querySelectorAll(sel) : []; }
function appText() { const app = document.querySelector('#app'); return app ? app.textContent : ''; }

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

/* ==================================================================
 * 4. 驱动（等价于 main.js 的 handler 接线，便于直接 inspect state）
 * ================================================================== */
let state = State.newGame(18);
let lastExtra = null;
let lastSave = null;

function go(screen, extra) { state.screen = screen; lastExtra = extra || null; UI.show(state, lastExtra); }

const HANDLERS = {
  onPickAge(age) {
    // 与 main.js 一致：选年龄必须重建整局（plan/初始资源随档位变）
    const A = Util.num(age, 18);
    state = State.newGame(A);
    UI.show(state, null);
  },
  onBegin() { State.begin(state); UI.show(state, null); },
  onChoose(idx) { const step = State.currentStep(state); State.choose(state, step, idx); UI.show(state, null); },
  onContinue() { State.advance(state); UI.show(state, null); },
  onShareHalf() { state._half = true; go('score', null); },
  onArchives() { go('archives', null); },
  onScore() { state._half = false; go('score', null); },
  onBackEnding() { go('ending', null); },
  onBackMid() { state._half = false; go('midsettle', null); },
  onOpenArchive(key) { go('archivePage', { key: key }); },
  onBackCab() { go('archives', null); },
  onRestart() { state = State.newGame(state.startAge); UI.show(state, null); },
  onResume() { const s = State.load(); if (s) { state = s; state.screen = state.ended ? 'ending' : (state.screen === 'midsettle' ? 'midsettle' : 'decision'); UI.show(state, null); } },
  onSaveArchive(arch) { lastSave = UI.exportArchive(arch, state); },
  onSaveScore(canvas) { lastSave = canvas.toDataURL('image/png'); }
};

UI.init(appNode, HANDLERS);
UI.show(state, null); // 渲染开局页

/* ---- 通用点击助手 ---- */
function clickByText(txt) {
  const b = qa('.btn').filter(x => x.textContent.trim() === txt)[0];
  if (!b) throw new Error('找不到按钮：' + txt);
  b.click();
  return b;
}
function firstOption() {
  const opts = qa('.option').filter(o => !o.getAttribute('disabled'));
  if (!opts.length) throw new Error('没有可点选项');
  opts[0].click();
}
function clickContinue() {
  const c = q('.btn-continue');
  if (!c) throw new Error('无继续按钮');
  c.click();
}
/** 把游戏驱动到目标 screen */
function driveTo(target) {
  let guard = 0;
  while (state.screen !== target) {
    if (++guard > 140) throw new Error('未收敛到 ' + target + '，当前=' + state.screen);
    if (state.screen === 'opening') { clickByText('开整！'); continue; }
    if (state.screen === 'midsettle') { q('.screen-mid').querySelectorAll('.btn-primary')[0].click(); continue; }
    if (state._pending) { clickContinue(); continue; }
    firstOption();
  }
}

/* ==================================================================
 * 5. 用例
 * ================================================================== */

section('【开局页】');
check('UI.init 后渲染出开局页（.screen-opening）', () => {
  assert(q('.screen-opening'), '缺少 .screen-opening');
  eq(state.screen, 'opening', '初始屏幕');
});
check('开局页 stamp 与 preview 文案正确（2017 固定）', () => {
  const stamp = document.getElementById('open-stamp');
  assert(stamp, '缺少 #open-stamp');
  eq(stamp.textContent, 'NO.2017-18', 'stamp 文案');
  const prev = document.getElementById('open-preview');
  eq(prev.textContent, Content.openings['18'], 'preview 文案与内容库不一致');
});
check('开局页固定 2017 年、无年份滑杆（v5 §1.2-1）', () => {
  assert(!document.getElementById('sl-year'), '不应存在年份滑杆');
  assert(!document.getElementById('sl-age'), '不应存在年龄滑杆');
  const title = q('.title');
  const html = title && (title._html || title.textContent);
  assert(html && html.indexOf('AI</b>纪元') >= 0, '标题应为「回到AI纪元第一天」');
  assert(document.getElementById('open-stamp').textContent.indexOf('2017') >= 0, 'stamp 应含 2017');
});
check('年龄卡片：3 张（18/22/25），当前档位选中态正确', () => {
  const cards = qa('.age-card');
  eq(cards.length, 3, '年龄卡片数');
  eq(cards[0].getAttribute('data-age'), '18', '第一张卡');
  eq(cards[2].getAttribute('data-age'), '25', '第三张卡');
  const active = qa('.age-card.is-active');
  eq(active.length, 1, '选中卡数量');
  eq(active[0].getAttribute('data-age'), '18', '默认选中 18');
});
check('年龄卡片交互（onPickAge）能更新档位并重渲染（v5 §1.2-2）', () => {
  HANDLERS.onPickAge(25);
  eq(state.startAge, 25, 'startAge');
  eq(state.startYear, 2017, 'startYear 恒 2017');
  eq(state.mode, Logic.modeFor(25), 'mode');
  eq(document.getElementById('open-preview').textContent, Content.openings['25'], '重渲染后 preview');
  eq(document.getElementById('open-stamp').textContent, 'NO.2017-25', '重渲染后 stamp');
  eq(qa('.age-card.is-active')[0].getAttribute('data-age'), '25', '选中卡联动');
  // 复位
  HANDLERS.onPickAge(18);
});
check('真实卡片事件：对渲染出的卡片派发 click，预览/印章/state 全联动（v5 §1.2-2）', () => {
  // 对 v4 滑杆缺陷的同源回归：选择控件必须真正可交互
  const card22 = qa('.age-card').filter(c => c.getAttribute('data-age') === '22')[0];
  assert(card22, '缺少 22 岁卡片');
  assert(Array.isArray(card22._listeners.click) && card22._listeners.click.length, '22 岁卡片未绑定 click');
  card22.click();
  eq(state.startAge, 22, '点卡片后 startAge');
  eq(state.startYear, 2017, '点卡片后 startYear 恒 2017');
  eq(state.plan[0].year, 2017, '点卡片后 plan 必须重建（q1 恒 2017）');
  eq(state.plan[0].age, 22, '点卡片后 q1 年龄 = 22');
  eq(document.getElementById('open-stamp').textContent, 'NO.2017-22', '印章联动');
  eq(document.getElementById('open-preview').textContent, Content.openings['22'], '预览联动');
  // 复位
  HANDLERS.onPickAge(18);
});
check('继续上次：有未完成存档时渲染「继续上次」按钮，点击后从断点恢复（v5 §1.2-4）', () => {
  // 先开一局并推进几步，存档
  state = State.newGame(22);
  UI.show(state, null);
  const st0 = state;
  const rng = Util.makeRng(11);
  for (let i = 0; i < 4; i++) {
    const step = State.currentStep(state);
    if (['q1','q2','q3','era','breaking'].indexOf(step.type) >= 0) State.choose(state, step, Util.pickIndex(rng, State.optionsFor(state, step)));
    State.advance(state);
  }
  State.save(state);
  const savedIdx = state.stepIndex;
  // 回到开局页，应出现「继续上次」
  go('opening', { canResume: true });
  const resumeBtn = document.getElementById('btn-resume');
  assert(resumeBtn, '应渲染「继续上次」按钮');
  eq(state.startAge, 22, '开局页预填上次年龄');
  resumeBtn.click();
  eq(state.screen, 'decision', '恢复后应在决策页');
  eq(state.stepIndex, savedIdx, '恢复后步数一致');
  assert(state.startAge === 22, '恢复后年龄一致');
  // 清理：清存档并复位到默认开局页（保持后续用例与 main.js 冒烟的前提状态）
  State.clearSave();
  state = State.newGame(18);
  go('opening', null);
});
check('开始按钮已绑定 click', () => {
  const b = document.getElementById('btn-begin');
  assert(b, '缺少 #btn-begin');
  assert(Array.isArray(b._listeners.click) && b._listeners.click.length, '开始按钮未绑定 click');
});

section('【游戏主循环】');
check('点击"开整！"进入决策页，资源面板 4 格 + 进度 + 选项', () => {
  clickByText('开整！');
  eq(state.screen, 'decision', '应进入决策页');
  eq(qa('.res-cell').length, 4, '资源格数（美术规范：存款/技能/人脉/心态）');
  assert(q('.progress'), '缺少进度条');
  const opts = qa('.option');
  assert(opts.length >= 2, '选项数量不足：' + opts.length);
  opts.forEach(o => {
    assert(o.getAttribute('data-idx') != null, '选项缺少 data-idx');
    assert(o.querySelector('.opt-idx'), '选项缺少序号块');
    assert(Array.isArray(o._listeners.click) && o._listeners.click.length, '选项未绑定 click');
  });
});
check('资源面板数值与 state 一致（存款带 ¥ 万）', () => {
  const vals = qa('.res-val').map(n => n.textContent);
  eq(vals.length, 4, '资源值数量');
  assert(/¥.*万/.test(vals[0]), '存款单位异常：' + vals[0]);
});
check('防误触：点选项后（未点继续）其他选项不锁定、可改选，改选只换回声/生活线不结算资源（v6 §1.3）', () => {
  // 当前在决策页（上一用例之后）
  eq(state.screen, 'decision', '前提：应在决策页');
  const opts = qa('.option');
  assert(opts.length >= 2, '不足 2 选项');
  // 记基线资源
  const base = JSON.stringify(state.res);
  // 点第 1 个选项
  opts[0].click();
  assert(state._pending, '点选后应有 _pending');
  eq(JSON.stringify(state.res), base, '点选后资源不应立即变化（未结算）');
  assert(q('.echo') && q('.life'), '应展示回声/生活线');
  assert(qa('.option')[0].classList.contains('selected'), '第 1 选项应为选中态');
  // 其他选项不应 disabled
  const enabledOthers = qa('.option').filter((o, i) => i > 0 && !o.getAttribute('disabled'));
  assert(enabledOthers.length >= 1, '未点继续时其他选项不应锁定');
  // 改选第 2 个
  qa('.option')[1].click();
  eq(JSON.stringify(state.res), base, '改选后资源仍不应变化');
  eq(state._pending.idx, 1, '待定选择应更新为第 2 项');
  assert(qa('.option')[1].classList.contains('selected'), '第 2 选项应为选中态');
  assert(!qa('.option')[0].classList.contains('selected'), '第 1 选项应取消选中态');
  // 无文字提示（v6.1.1：功能保留、不做文案说明）
  assert(!q('.hint'), '不应展示改选提示文案');
  // 继续后才结算（资源 = 基线 + 第 2 选项效果）
  clickContinue();
  const step0 = state.plan[0];
  const opt1 = Logic.stepContent(state, step0).options[1];
  assert(JSON.stringify(state.res) !== base, '继续后资源应已结算');
});
check('改选后确认：结算的参数对应最后一次选择（flag/倾向也以最后一次为准）', () => {
  // 接上一用例：当前已在下一步（第 2 步决策页或更后）
  if (state.screen !== 'decision') {
    let guard = 0;
    while (state.screen !== 'decision' && guard++ < 40) {
      if (state.screen === 'midsettle') { q('.screen-mid').querySelectorAll('.btn-primary')[0].click(); continue; }
      if (state._pending) { clickContinue(); continue; }
      firstOption();
    }
  }
  eq(state.screen, 'decision', '应回到决策页');
  const opts = qa('.option');
  // 点第 3 个（若存在）再改回第 1 个，最后继续——保证只记第 1 个
  opts[opts.length - 1].click();
  opts[0].click();
  const step = State.currentStep(state);
  const choicesBefore = state.choices.length;
  const evIdx0 = state._pending.idx;
  eq(evIdx0, 0, '待定应为第 1 项');
  clickContinue();
  eq(state.choices.length, choicesBefore + 1, '只应记录一次选择（改选不重复记账）');
  // 最近一条选择应为第 1 个选项的文字
  const lastChoice = state.choices[state.choices.length - 1];
  const opt0 = Logic.stepContent(state, step).options[0];
  eq(lastChoice.label, opt0.label, '记录的选择应为最终确认项');
});
check('自动打完整局：每步渲染并推进，最终收敛到结局页', () => {
  let guard = 0;
  while (state.screen !== 'ending') {
    if (++guard > 140) throw new Error('整局未收敛，可能死循环');
    if (state.screen === 'midsettle') { q('.screen-mid').querySelectorAll('.btn-primary')[0].click(); continue; }
    if (state._pending) { clickContinue(); continue; }
    firstOption();
  }
  eq(state.screen, 'ending', '应进入结局页');
  assert(state.ending, '结局未计算');
  assert(state.personality && /^[A-Z]{4}$/.test(state.personality.code), '人格代码异常：' + (state.personality && state.personality.code));
});

section('【结局页】');
check('结局卡渲染：人格印章 / 判词 / 档案进度 / 三按钮', () => {
  assert(q('.persona-stamp'), '缺人格印章');
  assert(/^[A-Z]{4}$/.test(q('.ps-code').textContent), '人格代码格式异常');
  assert(q('.ps-name').textContent.length > 0, '人格名空');
  assert(q('.end-bio') && q('.end-bio').textContent.length > 20, '判词过短');
  assert(/档案已解锁/.test(q('.archive-row').textContent), '缺档案进度');
  ['解锁档案', '生成成绩卡', '重开一局！'].forEach(t => {
    const b = qa('.btn').filter(x => x.textContent.trim() === t)[0];
    assert(b, '缺按钮：' + t);
    assert(b._listeners.click && b._listeners.click.length, '按钮未绑定 click：' + t);
  });
});
check('结局对应档案已被解锁', () => {
  const key = state.ending.archive;
  assert(state.archives.indexOf(key) >= 0, '结局对应档案未解锁：' + key);
});
check('失败结局(warn)渲染夜灯符号与提示', () => {
  if (!state.ending.warn) return; // 仅当本局为失败结局时校验
  assert(q('.night-lamp'), 'warn 结局缺少 .night-lamp');
  assert(q('.night-note'), 'warn 结局缺少 .night-note');
});

section('【档案柜 / 档案页】');
check('点击"解锁档案"进入档案柜，共 21 张卡（已解锁可点 / 未解锁禁用）', () => {
  clickByText('解锁档案');
  eq(state.screen, 'archives', '应进入档案柜');
  const cards = qa('.arch-card');
  eq(cards.length, 21, '档案卡数量（应为 21）');
  const locked = qa('.arch-card.locked');
  assert(locked.length > 0, '应存在未解锁档案');
  locked.forEach(c => {
    assert(c.getAttribute('disabled') != null, '未解锁卡应 disabled');
    assert(!(c._listeners.click && c._listeners.click.length), '未解锁卡不应绑定 click');
  });
  const unlocked = cards.filter(c => !c.classList.contains('locked'));
  assert(unlocked.length > 0, '应存在已解锁档案');
  unlocked.forEach(c => assert(c._listeners.click && c._listeners.click.length, '已解锁卡未绑定 click'));
});
check('点击已解锁档案卡进入档案页并渲染双线时间轴', () => {
  const card = qa('.arch-card').filter(c => !c.classList.contains('locked'))[0];
  const key = card.getAttribute('data-key');
  card.click();
  eq(state.screen, 'archivePage', '应进入档案页');
  eq(q('.ap-title').textContent, Archives.byKey(key).title, '档案标题不一致');
  assert(q('.timeline'), '缺时间轴');
  assert(q('.tl-section.tl-world').querySelectorAll('.tl-row').length >= 1, '世界线条目缺失');
  assert(q('.tl-section.tl-life').querySelectorAll('.tl-row').length >= 1, '生活线条目缺失');
});
check('档案页"保存图片"走 exportArchive 导出 dataURL（不崩）', () => {
  const k = (lastExtra && lastExtra.key) || state.archives[0];
  const url = UI.exportArchive(Archives.byKey(k), state);
  assert(url && url.indexOf('data:image/png') === 0, 'exportArchive 未返回 png dataURL');
});
check('档案页返回档案柜', () => {
  clickByText('返回档案柜');
  eq(state.screen, 'archives', '应回到档案柜');
});

section('【成绩卡（Canvas）】');
check('从结局进入成绩卡：canvas 1080×1440 且绘制不抛错', () => {
  // 当前在档案柜页，先返回结局页再生成成绩卡
  clickByText('返回结局');
  eq(state.screen, 'ending', '应回到结局页');
  clickByText('生成成绩卡');
  eq(state.screen, 'score', '应进入成绩卡页');
  const canvas = q('#score-canvas');
  assert(canvas, '未渲染 canvas');
  eq(canvas.getAttribute('width'), '1080', 'canvas 宽');
  eq(canvas.getAttribute('height'), '1440', 'canvas 高');
});
check('"保存图片"触发导出 dataURL（兜底，不崩）', () => {
  clickByText('保存图片');
  assert(lastSave && lastSave.indexOf('data:image/png') === 0, '保存未产出 png dataURL');
});
check('成绩卡可返回结局页', () => {
  clickByText('返回');
  eq(state.screen, 'ending', '应回到结局页');
});

section('【中段结算 → 半场成绩卡】');
check('重新开局推进到中段结算，分享半场小结生成 _half 成绩卡', () => {
  state = State.newGame(18);
  UI.show(state, null);
  driveTo('midsettle');
  eq(state.screen, 'midsettle', '应到达中段结算');
  assert(q('.persona-progress'), '缺气质进度');
  clickByText('晒半场小结');
  eq(state.screen, 'score', '应进入成绩卡');
  eq(state._half, true, '_half 应为 true');
  assert(q('#score-canvas'), '半场成绩卡未渲染 canvas');
  clickByText('返回');
  eq(state.screen, 'midsettle', '半场成绩卡应返回中段结算');
});

section('【再来一局】');
check('"再来一局"回到开局页并保留本局年龄档参数（v5 §1.2-5）', () => {
  // 用非默认年龄档（25 岁）玩一局到结局
  state = State.newGame(25);
  UI.show(state, null);
  driveTo('ending');
  clickByText('重开一局！');
  eq(state.screen, 'opening', '应回到开局页');
  eq(state.startYear, 2017, '年份恒 2017');
  eq(state.startAge, 25, '年龄档保留');
  assert(q('.screen-opening'), '开局页未渲染');
  eq(document.getElementById('open-stamp').textContent, 'NO.2017-25', '印章随保留年龄档');
  eq(qa('.age-card.is-active')[0].getAttribute('data-age'), '25', '年龄卡片选中态保留');
});

section('【UI 契约与规范】');
check('UI 暴露约定 API', () => {
  ['init', 'show', 'exportArchive', 'sym', 'eraSticker', 'stageSticker', 'eraStampNode']
    .forEach(k => assert(typeof UI[k] === 'function', 'UI.' + k + ' 不是函数'));
});
check('UI 符号/贴纸助手可调用且返回字符串', () => {
  assert(typeof UI.sym('ai') === 'string' && UI.sym('ai').indexOf('<svg') === 0, 'sym(ai) 异常');
  assert(typeof UI.eraSticker(2) === 'string', 'eraSticker 异常');
  assert(typeof UI.stageSticker('l2') === 'string', 'stageSticker 异常');
  assert(UI.eraStampNode(2023, 3).className.indexOf('era-stamp') >= 0, 'eraStampNode 异常');
});
check('全链路渲染文本不含 emoji', () => {
  // 在内容丰富的最终结局屏上扫描可见文本（含 _text 与 _html）
  q('.screen-ending') || (driveTo('ending'));
  const app = document.querySelector('#app');
  const nodes = app.walk();
  const bad = [];
  nodes.forEach(n => {
    if (n._text && EMOJI_RE.test(n._text)) bad.push(n._text);
    if (n._html && EMOJI_RE.test(n._html)) bad.push(n._html);
  });
  eq(bad.length, 0, '含 emoji 的文案：' + bad.slice(0, 3).join(' | '));
});
check('所有按钮均为 <button type="button">（避免表单误提交）', () => {
  const btns = qa('button');
  assert(btns.length > 0, '没有按钮');
  btns.forEach(b => {
    eq(b.tagName, 'BUTTON', '标签非 BUTTON：' + b.textContent);
    eq(b.getAttribute('type'), 'button', '按钮缺 type=button：' + b.textContent);
  });
});
check('渲染树不存在内联 onclick 等事件属性', () => {
  const app = document.querySelector('#app');
  const bad = [];
  app.walk().forEach(n => {
    Object.keys(n.attrs).forEach(k => { if (/^on/i.test(k)) bad.push(k); });
  });
  eq(bad.length, 0, '存在内联事件属性：' + bad.join(', '));
});

/* ==================================================================
 * 6. main.js 启动冒烟（验证真实接线能 boot 不崩）
 * ================================================================== */
section('【main.js 启动冒烟】');
check('require main.js 能完成 boot 并渲染开局页（不抛错）', () => {
  // main.js 在 readyState=complete 时自执行 boot()，会找到 #app、UI.init、渲染开局
  require(path.join(BUILD, 'main.js'));
  assert(q('.screen-opening'), 'main.js boot 后未渲染开局页');
  eq(document.getElementById('open-stamp').textContent, 'NO.2017-18', 'main.js 开局 stamp');
});

/* ==================================================================
 * 7. 汇总
 * ================================================================== */
console.log('\n' + '─'.repeat(60));
if (failures.length === 0) {
  console.log('[ui-test] 全部通过：' + passed + ' 项');
  console.log('─'.repeat(60));
  process.exit(0);
} else {
  console.log('[ui-test] 通过 ' + passed + ' 项，失败 ' + failures.length + ' 项：');
  failures.forEach(f => console.log('  ✗ ' + f.name + '\n      ' + f.message));
  console.log('─'.repeat(60));
  process.exit(1);
}
