/**
 * main.js —— 启动、路由与皮肤切换（v3.3）
 * 命名空间：window（自执行，挂载在 DOM 就绪后）
 *
 * 职责：
 *   - 拉起 UI（UI.init(root, handlers)）；
 *   - 把双滑杆开局 / 选项 / 推进 / 结局 / 档案导航 串成状态机；
 *   - 把 mode/era/stage 三层皮肤同步到 <html>（art-spec v2 §4/§6），rAF 批处理；
 *   - 全局错误兜底：显式呈现，不静默吞异常。
 *
 * 约束：零外链 / 零位图 / 零 emoji；不发起网络请求；XSS 走 textContent。
 */
(function (global) {
  'use strict';

  var U = global.Util, C = global.Content, L = global.Logic,
      S = global.State, A = global.Archives, UI = global.UI;

  function missing() {
    var miss = [];
    if (!U) miss.push('Util');
    if (!C) miss.push('Content');
    if (!L) miss.push('Logic');
    if (!S) miss.push('State');
    if (!A) miss.push('Archives');
    if (!UI) miss.push('UI');
    return miss;
  }

  var root = null;
  var state = null;
  var lastExtra = null;

  /* ============================ 皮肤同步（art-spec v2 §4/§6） ============================ */
  /* 三层：data-mode(m1..m4) ⊕ data-era(1..4) ⊕ data-stage(l1..l3)
     同时写同名 class 作兜底，兼容后续美术 agent 的两种选择器写法。 */
  var cur = { mode: null, era: null, stage: null };
  var pendingSkin = null, rafQueued = false;
  var raf = global.requestAnimationFrame || function (cb) { cb(); };

  function computeStage(s) {
    // v5：阶段层跟随年龄档（18→校园 l1 / 22→职场 l2 / 25→转型 l3）
    return s.stage || 'l1';
  }

  function computeSkin(s) {
    return {
      mode: s.mode || 'm1',
      era: String(s.era || 1),
      stage: computeStage(s),
      heavy: !!s.isHeavy
    };
  }

  function setLayer(attr, prefix, val) {
    var de = document.documentElement;
    de.setAttribute(attr, val);
    var kept = [];
    var parts = (de.className || '').split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] && parts[i].indexOf(prefix) !== 0) kept.push(parts[i]);
    }
    kept.push(prefix + val);
    de.className = kept.join(' ');
  }

  function flushSkin() {
    rafQueued = false;
    var t = pendingSkin; if (!t) return;
    var de = document.documentElement;
    if (t.mode !== cur.mode) { setLayer('data-mode', 'mode-', t.mode); }
    if (t.era !== cur.era) { setLayer('data-era', 'era-', t.era); }
    if (t.stage !== cur.stage) { setLayer('data-stage', 'stage-', t.stage); }
    var hasHeavy = de.classList.contains('is-heavy');
    if (t.heavy && !hasHeavy) de.classList.add('is-heavy');
    else if (!t.heavy && hasHeavy) de.classList.remove('is-heavy');
    cur = t;
  }

  function applySkin(s) {
    pendingSkin = computeSkin(s);
    if (!rafQueued) { rafQueued = true; raf(flushSkin); }
  }

  /* ============================ 渲染 ============================ */
  function render() {
    if (!UI || !root) return;
    UI.show(state, lastExtra);
    applySkin(state);
  }

  function go(screen, extra) {
    state.screen = screen;
    lastExtra = extra || null;
    render();
    try { S.save(state); } catch (e) { if (global.console) console.error('[save]', e); }
  }

  /* ============================ 处理器（UI 调用） ============================ */
  var HANDLERS = {
    /* 开局：选择年龄档（18/22/25），年份恒 2017（v5 §1.2-2）
       必须重建整局：plan/初始资源随年龄档变，只改 startAge 会导致
       「显示选中的年龄、实际按默认年龄跑」的错位（v3.3 缺陷同源） */
    onPickAge: function (age) {
      var A = U.num(age, 18);
      state = S.newGame(A);
      render();
    },

    /* 开始游戏 */
    onBegin: function () {
      S.begin(state);
      lastExtra = null;
      render();
      try { S.save(state); } catch (e) { if (global.console) console.error('[save]', e); }
    },

    /* 选中一个选项：记录 _pending 后重渲染以展示回声/生活线 */
    onChoose: function (idx) {
      var step = S.currentStep(state);
      S.choose(state, step, idx);
      render();
      try { S.save(state); } catch (e) { if (global.console) console.error('[save]', e); }
    },

    /* 继续：推进到下一步（可能中段结算 / 结局） */
    onContinue: function () {
      S.advance(state);
      render();
      try { S.save(state); } catch (e) { if (global.console) console.error('[save]', e); }
    },

    /* 中段结算 → 分享半场小结（成绩卡 _half 变体） */
    onShareHalf: function () {
      state._half = true;
      go('score', null);
    },

    /* 结局 → 解锁档案 */
    onArchives: function () { go('archives', null); },

    /* 结局 → 生成成绩卡 */
    onScore: function () { state._half = false; go('score', null); },

    /* 成绩卡 / 档案柜 → 返回结局 */
    onBackEnding: function () { go('ending', null); },

    /* 半场成绩卡 → 返回中段结算 */
    onBackMid: function () { state._half = false; go('midsettle', null); },

    /* 档案柜 → 打开单个档案页 */
    onOpenArchive: function (key) { go('archivePage', { key: key }); },

    /* 档案页 → 返回档案柜 */
    onBackCab: function () { go('archives', null); },

    /* 再来一局：回开局页，保留本局年龄档参数（策划案 v5 §1.2-5） */
    onRestart: function () {
      state = S.newGame(state.startAge);
      lastExtra = null;
      try { S.save(state); } catch (e) { if (global.console) console.error('[save]', e); }
      render();
    },

    /* 继续上次：从未完成存档的断点恢复（策划案 v4 §1.2-4） */
    onResume: function () {
      var saved = S.load();
      if (!saved) return;
      state = saved;
      if (state.ended) state.screen = 'ending';
      else if (state.screen !== 'midsettle') state.screen = 'decision';
      lastExtra = null;
      render();
    },

    /* 保存档案页图片（dataURL → 下载） */
    onSaveArchive: function (arch) {
      try {
        var url = UI.exportArchive(arch, state);
        if (!url) return;
        triggerDownload(url, (arch && arch.key ? arch.key : 'archive') + '.png');
      } catch (e) { if (global.console) console.error('[saveArchive]', e); }
    },

    /* 保存成绩卡图片 */
    onSaveScore: function (canvas) {
      try {
        if (!canvas || !canvas.toDataURL) return;
        var url = canvas.toDataURL('image/png');
        triggerDownload(url, 'score.png');
      } catch (e) { if (global.console) console.error('[saveScore]', e); }
    }
  };

  function triggerDownload(url, name) {
    try {
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) { if (global.console) console.error('[download]', e); }
  }

  /* ============================ 启动 ============================ */
  function showFatal(err) {
    if (!root) return;
    U.clear(root);
    var box = U.el('div', { className: 'screen screen-fatal', children: [
      U.el('div', { className: 'masthead', children: [
        U.el('div', { className: 'masthead-title', text: '出错了' }),
        U.el('div', { className: 'masthead-sub', text: 'FATAL' })
      ] }),
      U.el('div', { className: 'scroll-area', children: [
        U.el('p', { text: '游戏启动失败，请刷新重试。' }),
        U.el('p', { className: 'hint', text: (err && err.message) ? String(err.message) : '未知错误' }),
        (function () {
          var b = U.el('button', { className: 'btn btn-primary', attrs: { type: 'button' }, text: '重新加载' });
          b.addEventListener('click', function () {
            if (global.location && typeof global.location.reload === 'function') global.location.reload();
          });
          return U.el('div', { style: 'margin-top:24px', children: [b] });
        })()
      ] })
    ] });
    root.appendChild(box);
  }

  function boot() {
    var miss = missing();
    if (miss.length) { showFatal(new Error('缺少模块：' + miss.join(', '))); return; }
    try {
      root = U.$('#app');
      if (!root) { showFatal(new Error('未找到 #app 容器')); return; }
      UI.init(root, HANDLERS);

      // reduced-motion 标记（art-spec v2 §6）
      try {
        if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          document.documentElement.classList.add('reduce-motion');
        }
      } catch (e) { /* 忽略 */ }

      var saved = S.load();
      if (saved && !saved.ended) {
        // 有未完成存档：仍进开局页（预填上次年龄档），提供「继续上次」（策划案 v5 §1.2-4）
        state = S.newGame(saved.startAge);
        lastExtra = { canResume: true };
      } else {
        state = S.newGame(18);
        lastExtra = null;
      }
      render();
    } catch (e) {
      if (global.console) console.error('[main] 启动失败：', e);
      showFatal(e);
    }
  }

  function onError(e) {
    if (global.console) console.error('[main] 运行期错误：', e && e.error ? e.error : e);
  }

  var doc = global.document;
  if (!doc) return;
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
  global.addEventListener('error', onError);
})(typeof window !== 'undefined' ? window : globalThis);
