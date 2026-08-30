/**
 * logic.js —— 核心规则层（v3.3，纯逻辑，不碰 DOM）
 * 命名空间：window.Logic
 *
 * 职责：初始值公式 / 决策序列生成(含短局适配与号外调度) /
 *       资源结算 / 结局判定 / 16 型人格 / 档案解锁。
 *
 * 依赖：Content（内容数据）、Util（数值安全）。
 */
(function (global) {
  'use strict';

  var Content = global.Content || (typeof require !== 'undefined' ? require('./content.js') : null);
  var Util = global.Util || (typeof require !== 'undefined' ? require('./util.js') : null);
  var num = Util.num, clamp = Util.clamp;

  var Logic = {};

  /* ============================ 13.1 初始值公式 ============================ */
  Logic.initialValues = function (Y, A) {
    Y = Util.num(Y, 2017); A = Util.num(A, 18);
    var deposit = 0.5 + (A - 18) * 1.2 + (Y - 2017) * 0.3;
    var skill = 15 + (A - 18) * 4 + (Y - 2017) * 1;
    var network = 20 + (A - 18) * 3;
    var mind = Math.max(35, 58 - (A - 18) * 2 - (Y - 2017) * 1);
    var aiDep = Math.min(30, 3 + (Y - 2017) * 1.5 + (A - 18) * 0.5);
    return {
      deposit: Math.round(deposit * 10) / 10,
      skill: Math.round(skill),
      network: Math.round(network),
      mind: Math.round(mind),
      aiDep: Math.round(aiDep)
    };
  };

  /* ============================ 5.3 开局格 → 模式映射 ============================ */
  var MODE_TABLE = {
    "2017": { 18: "m1", 19: "m1", 20: "m1", 21: "m1", 22: "m2", 23: "m2", 24: "m3", 25: "m4" },
    "2018": { 18: "m1", 19: "m1", 20: "m1", 21: "m1", 22: "m2", 23: "m2", 24: "m2", 25: "m3" },
    "2019": { 18: "m1", 19: "m1", 20: "m1", 21: "m3", 22: "m1", 23: "m4", 24: "m2", 25: "m4" },
    "2020": { 18: "m1", 19: "m1", 20: "m1", 21: "m3", 22: "m3", 23: "m2", 24: "m4", 25: "m2" },
    "2021": { 18: "m3", 19: "m1", 20: "m2", 21: "m1", 22: "m2", 23: "m2", 24: "m3", 25: "m4" },
    "2022": { 18: "m1", 19: "m1", 20: "m4", 21: "m2", 22: "m3", 23: "m3", 24: "m2", 25: "m4" },
    "2023": { 18: "m1", 19: "m1", 20: "m2", 21: "m4", 22: "m4", 23: "m4", 24: "m2", 25: "m4" },
    "2024": { 18: "m4", 19: "m4", 20: "m1", 21: "m3", 22: "m4", 23: "m2", 24: "m1", 25: "m4" }
  };
  Logic.modeFor = function (Y, A) {
    var row = MODE_TABLE[String(Y)];
    return (row && row[A]) ? row[A] : "m1";
  };

  /* ============================ 年代滤镜 / 阶段层 ============================ */
  Logic.eraForYear = function (gy) {
    if (gy <= 2019) return 1;
    if (gy <= 2022) return 2;
    if (gy <= 2024) return 3;
    return 4;
  };
  Logic.stageForAge = function (A) {
    if (A <= 20) return "l1";
    if (A <= 22) return "l2";
    return "l3";
  };
  Logic.genLabel = function (gy) {
    if (gy <= 2019) return "初代模型";
    if (gy <= 2022) return "二代浪潮";
    if (gy <= 2024) return "百模大战";
    return "深度思考";
  };

  /* ============================ 决策序列生成（策划案 v4 §6.0） ============================ */
  /* 返回有序 steps；每个 step:
     { type:'q1'|'q2'|'era'|'breaking'|'midsettle'|'ending',
       id, year, age }  （breaking 额外有 breakingId）
     midsettle / ending 为虚拟步骤（标记位置，不消耗选项）。
     权威规则（禁止自由发挥）：
       - 年龄公式：age = A + (year - Y)，禁止硬编码年龄差
       - 核心序列见 §6.0 表；D4b 仅 Y<=2019 且恒 2020；D4/中段恒 2024；结局恒 2026
       - 号外：每局恰好 2 次，排期 = { 2017-2021: b1+b2, 2022: b2+b4, 2023: b2+b3, 2024: b2+b6 }
       - 号外插入：排在「年份 <= 事件年 的最后一个步骤」之后
  */
  Logic.buildPlan = function (Y, A) {
    Y = Util.num(Y, 2017); A = Util.num(A, 18);
    function ageAt(g) { return A + (g - Y); }
    function st(type, id, year, extra) {
      var s = { type: type, id: id, year: year, age: ageAt(year) };
      if (extra) for (var k in extra) s[k] = extra[k];
      return s;
    }

    // 核心序列（§6.0 表）
    var steps = [];
    steps.push(st("q1", "q1", Y));
    steps.push(st("q2", "q2", Y));
    steps.push(st("era", "D3", Math.max(Y, 2019)));
    if (Y <= 2019) steps.push(st("era", "D4b", 2020));
    steps.push(st("era", "D4", 2024));
    steps.push(st("midsettle", "mid", 2024));
    steps.push(st("era", "D5", 2024));
    steps.push(st("era", "D6", 2025));
    steps.push(st("era", "D7", 2025));
    steps.push(st("era", "D8", 2026));
    steps.push(st("era", "D9", 2026));

    // 号外排期（§6.0 表）
    var lineUp = [];
    if (Y <= 2021) lineUp.push({ id: "b1", year: 2022 });
    if (Y <= 2023) lineUp.push({ id: "b2", year: 2023 });
    else lineUp.push({ id: "b2", year: 2024 });
    if (Y === 2022) lineUp.push({ id: "b4", year: 2025 });
    if (Y === 2023) lineUp.push({ id: "b3", year: 2024 });
    if (Y === 2024) lineUp.push({ id: "b6", year: 2024 });

    // 插入规则：排在「年份 <= 事件年 的最后一个步骤」之后
    var result = steps.slice();
    for (var i = 0; i < lineUp.length; i++) {
      var ev = lineUp[i];
      var pos = 0;
      for (var j = 0; j < result.length; j++) {
        if (result[j].year <= ev.year) pos = j + 1;
      }
      result.splice(pos, 0, st("breaking", "brk", ev.year, { breakingId: ev.id }));
    }
    result.push(st("ending", "end", 2026));
    return result;
  };

  /* ============================ 资源结算 ============================ */
  var TEND_KEYS = ["技术红利", "清醒打工人", "数字隐士", "一人公司", "浪里掌舵", "上岸教练", "茧房"];

  function emptyTend() {
    var t = {};
    TEND_KEYS.forEach(function (k) { t[k] = 0; });
    return t;
  }

  Logic.applyEffect = function (state, eff) {
    if (!eff) return;
    var r = state.res;
    if (eff.deposit != null) r.deposit = Math.round((r.deposit + eff.deposit) * 10) / 10;
    if (eff.skill != null) r.skill = clamp(r.skill + eff.skill, 0, 100);
    if (eff.network != null) r.network = clamp(r.network + eff.network, 0, 100);
    if (eff.mind != null) r.mind = clamp(r.mind + eff.mind, 0, 100);
    if (eff.aiDep != null) r.aiDep = clamp(r.aiDep + eff.aiDep, 0, 100);
  };

  Logic.applyTend = function (state, tend) {
    if (!tend) return;
    if (tend.__all) {
      TEND_KEYS.forEach(function (k) { state.tend[k] = (state.tend[k] || 0) + tend.__all; });
      return;
    }
    Object.keys(tend).forEach(function (k) {
      state.tend[k] = (state.tend[k] || 0) + tend[k];
    });
  };

  Logic.applyFlag = function (state, flag, opt) {
    if (!flag) return;
    var arr = Array.isArray(flag) ? flag : [flag];
    arr.forEach(function (f) {
      state.flags[f] = true;
      // 记录每个 flag 首次出现的年份（结局占位符 {裸辞那年} 等用，策划案 v4 §8.4）
      if (!state.flagYears[f]) state.flagYears[f] = (opt && opt.year) || state.year;
      if (f === "jump") state.jumps += 1;
      if (f === "bareQuit") state.bareQuit = true;
    });
  };

  /* 选择一个选项（已含 effect/tend/flag） */
  Logic.choose = function (state, option, stepMeta) {
    Logic.applyEffect(state, option.effect);
    Logic.applyTend(state, option.tend);
    Logic.applyFlag(state, option.flag, stepMeta);
    // 瓶颈：记录低谷次数（每种低态只记一次）
    if (state.res.deposit <= 0 && !state._lowDeposit) { state.lows += 1; state._lowDeposit = true; }
    if (state.res.mind <= 20 && !state._lowMind) { state.lows += 1; state._lowMind = true; }
    // 记录选择（用于中段结算「三个关键选择」）
    var sig = 0;
    if (option.effect) Object.keys(option.effect).forEach(function (k) { sig += Math.abs(option.effect[k]); });
    if (option.flag) sig += 5;
    state.choices.push({
      step: stepMeta ? stepMeta.id : "",
      label: option.label,
      year: stepMeta ? stepMeta.year : state.year,
      significance: sig
    });
  };

  /* ============================ 8. 结局判定 ============================ */
  function judgeOK(j, s) {
    // 注意：j.fail 仅是「失败结局」的样式标记（warn），不参与匹配；
    // 真正的匹配条件写在下方各 min/max/flags 字段里。
    if (j.aiDep_max != null && !(s.res.aiDep <= j.aiDep_max)) return false;
    if (j.aiDep_min != null && !(s.res.aiDep >= j.aiDep_min)) return false;
    if (j.skill_min != null && !(s.res.skill >= j.skill_min)) return false;
    if (j.skill_max != null && !(s.res.skill <= j.skill_max)) return false;
    if (j.mind_min != null && !(s.res.mind >= j.mind_min)) return false;
    if (j.deposit_min != null && !(s.res.deposit >= j.deposit_min)) return false;
    if (j.network_min != null && !(s.res.network >= j.network_min)) return false;
    if (j.network_max != null && !(s.res.network <= j.network_max)) return false;
    if (j.lows_min != null && !(s.lows >= j.lows_min)) return false;
    if (j.flags) {
      for (var i = 0; i < j.flags.length; i++) if (!s.flags[j.flags[i]]) return false;
    }
    if (j.notFlags) {
      for (var m = 0; m < j.notFlags.length; m++) if (s.flags[j.notFlags[m]]) return false;
    }
    return true;
  }

  Logic.computeEnding = function (state) {
    var E = Content.endings;
    // 先判 3 个失败结局
    var fails = ["G", "H", "I"];
    for (var f = 0; f < fails.length; f++) {
      if (judgeOK(E[fails[f]].judge, state)) return E[fails[f]];
    }
    // 再按倾向分从高到低匹配 6 个鲜活结局
    var vivid = ["A", "B", "C", "D", "E", "F"];
    var best = null, bestScore = -1;
    for (var v = 0; v < vivid.length; v++) {
      var e = E[vivid[v]];
      if (!judgeOK(e.judge, state)) continue;
      var score = state.tend[e.tendency] || 0;
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (best) return best;
    return E.normal;
  };

  /* ============================ 9. 人格计算 ============================ */
  Logic.computePersonality = function (state) {
    var r = state.res, fl = state.flags;
    // A/R
    var ar = r.aiDep >= 50 ? "A" : "R";
    // G/S
    var gs;
    if (fl.bareQuit || state.jumps >= 2) gs = "G";
    else if (fl.steady || fl.backSmallCity) gs = "S";
    else gs = "S";
    // T/P
    var tp;
    var isT = !!fl.choseCS || !!fl.aiSkill;
    var isP = !!fl.taughtAI || (r.network > r.skill);
    if (isT && !isP) tp = "T";
    else if (isP && !isT) tp = "P";
    else tp = isT ? "T" : "P";
    // I/O
    var io = r.network > r.skill ? "O" : "I";

    var code = ar + gs + tp + io;
    var P = Content.personality;
    // 稀有隐藏型覆盖
    var rare = P.rare[code];
    if (rare) {
      var ok = true;
      if (rare.resistAI && ar !== "R") ok = false;
      if (rare.skill_min != null && r.skill < rare.skill_min) ok = false;
      if (rare.bareQuit && !fl.bareQuit) ok = false;
      if (rare.network_lt_skill && !(r.network < r.skill)) ok = false;
      if (ok) {
        var rt = P.types.filter(function (t) { return t.code === code; })[0];
        if (rt) return { code: code, type: rt, dims: { ar: ar, gs: gs, tp: tp, io: io } };
      }
    }
    var type = P.types.filter(function (t) { return t.code === code; })[0] || P.types[0];
    return { code: code, type: type, dims: { ar: ar, gs: gs, tp: tp, io: io } };
  };

  /* ============================ 中段结算：关键选择 ============================ */
  Logic.keyChoices = function (state, n) {
    var sorted = state.choices.slice().sort(function (a, b) { return b.significance - a.significance; });
    return sorted.slice(0, n || 3);
  };

  /* ============================ 结局占位符参数（策划案 v4 §8.4） ============================ */
  /* 返回结局模板替换数据：{AGE, 裸辞那年, 被优化那年, 开局那年, 裁员那年, 2023那年前后} */
  Logic.endingParams = function (state) {
    var plan = state.plan || [];
    function planYearOf(pred) {
      for (var i = 0; i < plan.length; i++) if (pred(plan[i])) return plan[i].year;
      return null;
    }
    var d5 = planYearOf(function (s) { return s.type === 'era' && s.id === 'D5'; });
    var b2 = planYearOf(function (s) { return s.type === 'breaking' && s.breakingId === 'b2'; });
    return {
      AGE: state.startAge + (2026 - state.startYear),
      裸辞那年: state.flagYears && state.flagYears.bareQuit ? state.flagYears.bareQuit : (d5 || 2024),
      被优化那年: d5 || 2024,
      开局那年: state.startYear,
      裁员那年: d5 || 2024,
      "2023 那年前后": b2 || 2023
    };
  };

  /* ============================ 档案解锁 ============================ */
  /* 返回已解锁档案 key 数组（来自 archives.js 的全集）。 */
  Logic.unlockArchives = function (state) {
    var keys = [];
    var reached = state.reachedYear || 2026;
    // 世界线（人物 6）按到达年份
    if (reached >= 2022) keys.push("openai");
    if (reached >= 2023) { keys.push("moonshot"); keys.push("anthropic"); keys.push("opensource"); }
    if (reached >= 2024) keys.push("deepmind");
    if (reached >= 2025) keys.push("deepseek");
    // 世界线（反事实 4）到达 2024 后解锁
    if (reached >= 2024) { keys.push("f_acquired"); keys.push("f_ousted"); keys.push("f_moat"); keys.push("f_quiet"); }
    // 隐藏总表：集齐 6 份人物档案
    var persons = ["openai", "moonshot", "anthropic", "opensource", "deepmind", "deepseek"];
    var got = persons.filter(function (k) { return keys.indexOf(k) >= 0; }).length;
    if (got >= 6) keys.push("chronicle");

    // 人生实录（10）：结局对应 + 高倾向解锁
    var ending = state.ending || Logic.computeEnding(state);
    if (ending && ending.archive) keys.push(ending.archive);
    TEND_KEYS.forEach(function (k) {
      if ((state.tend[k] || 0) >= 3) keys.push(k); // 与 life-record key 同名
    });
    if (keys.indexOf("普通人") < 0) keys.push("普通人"); // 兜底常驻

    // 去重
    var seen = {};
    return keys.filter(function (k) { if (seen[k]) return false; seen[k] = true; return true; });
  };

  /* ============================ 当前步骤的可渲染内容 ============================ */
  /**
   * 返回某步骤的展示数据（标题/场景/选项/号外变体等），供 UI 直接渲染。
   * 选项统一为 [{label, effect, tend, flag, echo, life}] 结构。
   * 纯函数，只读 Content，不改 state。
   */
  Logic.stepContent = function (state, step) {
    var C = Content;
    var Y = state.startYear, A = state.startAge;
    if (step.type === 'q1') {
      var qk = C.q1[Y + '-' + A].opt;
      return { kind: 'decision', chapter: '第一题', scene: C.q1[Y + '-' + A].scene, options: C.optLib.q1[qk] };
    }
    if (step.type === 'q2') {
      var qk2 = C.q2[Y + '-' + A].opt;
      var opts2;
      if (qk2 === 'S1') opts2 = C.optLib.q2.S1[C.q2VariantForYear(state.year)];
      else opts2 = C.optLib.q2[qk2];
      return { kind: 'decision', chapter: '第二题', scene: C.q2[Y + '-' + A].scene, options: opts2 };
    }
    if (step.type === 'era') {
      var e = C.era[step.id];
      // 场景占位符（策划案 v4 §6.8/§6.9）：{AGE}=本步年龄，{START_AGE}=开局年龄
      var scene = Util.tpl(e.scene, { AGE: step.age, START_AGE: state.startAge });
      return { kind: 'decision', chapter: e.title, scene: scene, options: e.opts };
    }
    if (step.type === 'breaking') {
      var b = C.breaking[step.breakingId];
      // 号外年份角标（策划案 v4 §6.3）：b2 在 2024 开局时显示步骤年份，其余用事件自带标签
      var yearLabel = b.yearLabel;
      if (step.breakingId === 'b2' && step.year > 2023) yearLabel = String(step.year);
      return { kind: 'breaking', kicker: b.kicker, title: b.title, scene: b.sub, options: b.opts, variant: b.variant, yearLabel: yearLabel };
    }
    if (step.type === 'midsettle') return { kind: 'midsettle' };
    if (step.type === 'ending') return { kind: 'ending' };
    return { kind: 'unknown' };
  };

  /* ============================ 初始化一局 ============================ */
  Logic.newGame = function (Y, A) {
    var init = Logic.initialValues(Y, A);
    var state = {
      startYear: Y, startAge: A,
      year: Y, age: A,
      res: { deposit: init.deposit, skill: init.skill, network: init.network, mind: init.mind, aiDep: init.aiDep },
      flags: {}, jumps: 0, bareQuit: false, lows: 0, flagYears: {},
      tend: emptyTend(),
      choices: [],
      plan: Logic.buildPlan(Y, A),
      stepIndex: 0,
      reachedYear: Y,
      ending: null, personality: null,
      _lowDeposit: false, _lowMind: false
    };
    state.mode = Logic.modeFor(Y, A);
    state.stage = Logic.stageForAge(A);
    state.isHeavy = (Y === 2022 && A === 23);
    return state;
  };

  /* 当前步骤的展示信息 */
  Logic.stepView = function (state, step) {
    var gy = step.year;
    return {
      year: gy,
      age: step.age,
      era: Logic.eraForYear(gy),
      gen: Logic.genLabel(gy),
      mode: state.mode,
      stage: state.stage,
      isHeavy: state.isHeavy
    };
  };

  Logic.Util = Util;
  Logic.Content = Content;
  global.Logic = Logic;
  if (typeof module !== 'undefined' && module.exports) module.exports = Logic;
})(typeof window !== 'undefined' ? window : globalThis);
