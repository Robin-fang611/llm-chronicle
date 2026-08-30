/**
 * state.js —— 游戏状态机（v3.3，纯逻辑，不碰 DOM，node 可直接加载测试）
 * 命名空间：window.State
 *
 * 职责：开局 / 选项结算 / 步骤推进（含中段结算与结局）/ 存档读写。
 * 约束（autonomous-dev-prompt.md §6）：localStorage 读写 try/catch，不得空吞异常；
 * 瞬时态（_ 开头）不持久化。
 */
(function (global) {
  'use strict';

  var Util = global.Util;
  var Logic = global.Logic;

  var SAVE_KEY = 'mc_save_v4';

  /** 开一局新游戏 */
  function newGame(Y, A) {
    var s = Logic.newGame(Util.num(Y, 2017), Util.num(A, 18));
    s.screen = 'opening';
    s.era = Logic.eraForYear(s.year);
    s.archives = [];
    s.id = s.startYear + '-' + s.startAge;
    s._pending = null;     // 选中选项后的瞬时态（echo/life 展示），不持久化
    s._lastStamp = null;   // 触发「时代邮票」的年份（入场动画用）
    return s;
  }

  function currentStep(s) { return s.plan[s.stepIndex]; }

  function stepContent(s, step) { return Logic.stepContent(s, step); }

  function optionsFor(s, step) {
    var c = stepContent(s, step);
    return c && c.options ? c.options : [];
  }

  /** 决策进度（第 X/Y 个决定，剔除中段结算与结局虚拟步） */
  function decisionProgress(s) {
    var plan = s.plan, total = 0, idx = 0;
    for (var i = 0; i < plan.length; i++) {
      var t = plan[i].type;
      var dec = (t === 'q1' || t === 'q2' || t === 'era' || t === 'breaking');
      if (dec) total++;
      if (i <= s.stepIndex && dec) idx++;
    }
    return { index: idx, total: total };
  }

  /** 选择一个选项：应用结算并记录回声/生活线，返回用于展示的信息 */
  function choose(s, step, idx) {
    var opts = optionsFor(s, step);
    var opt = opts[idx];
    if (!opt) return null;
    Logic.choose(s, opt, step);
    s._pending = { idx: idx, option: opt };
    return opt;
  }

  /** 推进到下一步；必要时结算中段/结局 */
  function advance(s) {
    s.stepIndex += 1;
    s._pending = null;
    if (s.stepIndex >= s.plan.length) { finalize(s); s.screen = 'ending'; return; }
    var step = currentStep(s);
    s.year = step.year; s.age = step.age;
    var newEra = Logic.eraForYear(step.year);
    if (newEra !== s.era) s._lastStamp = step.year;
    s.era = newEra;
    if (step.year > (s.reachedYear || 0)) s.reachedYear = step.year;
    if (step.type === 'midsettle') s.screen = 'midsettle';
    else if (step.type === 'ending') { finalize(s); s.screen = 'ending'; }
    else s.screen = 'decision';
  }

  function begin(s) { s.screen = 'decision'; }

  function finalize(s) {
    s.ending = Logic.computeEnding(s);
    s.personality = Logic.computePersonality(s);
    s.archives = Logic.unlockArchives(s);
    s.ended = true;
  }

  /* -------- 存档：剔除瞬时态（_ 开头） -------- */
  function serialize(s) {
    var o = {};
    Object.keys(s).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      o[k] = s[k];
    });
    return o;
  }
  function save(s) {
    try { return Util.store.setJSON(SAVE_KEY, serialize(s)); }
    catch (e) { Util.store.lastError = e; return false; }
  }
  function load() {
    var o = Util.store.getJSON(SAVE_KEY, null);
    if (!o || !o.plan) return null;
    o.screen = o.screen || 'decision';
    o._pending = null;
    return o;
  }
  function clearSave() { return Util.store.remove(SAVE_KEY); }

  global.State = {
    SAVE_KEY: SAVE_KEY,
    newGame: newGame,
    begin: begin,
    currentStep: currentStep,
    stepContent: stepContent,
    optionsFor: optionsFor,
    decisionProgress: decisionProgress,
    choose: choose,
    advance: advance,
    finalize: finalize,
    save: save,
    load: load,
    clearSave: clearSave,
    resMeta: global.Content ? global.Content.resMeta : null
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.State;
})(typeof window !== 'undefined' ? window : globalThis);
