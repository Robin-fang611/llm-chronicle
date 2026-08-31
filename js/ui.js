/**
 * ui.js —— 渲染与事件绑定（本项目唯一触碰 DOM 的层）
 * 命名空间：window.UI
 *
 * 约束（autonomous-dev-prompt.md §6 / 美术规范 v2 §11）：
 *   - 零外链 / 零位图 / 零 emoji 图标；装饰一律符号库内联 SVG
 *   - 文本一律 textContent（天然防 XSS）；仅可信 SVG 字符串用 innerHTML
 *   - 不发起网络请求、不留 console 噪声
 */
(function (global) {
  'use strict';

  var U = global.Util, C = global.Content, S = global.State, A = global.Archives, L = global.Logic;
  var el = U.el;

  var HANDLERS = {};
  var ROOT = null;

  /* ============================================================ 符号库（内联 SVG） */
  /* 统一 1.5px 线宽、2px 圆角、currentColor 描边，随模式 ink 变色 */
  var SYM = {
    ai: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="14" r="1.6" fill="currentColor"/><circle cx="16" cy="12" r="1.6" fill="currentColor"/><circle cx="21" cy="14" r="1.6" fill="currentColor"/><circle cx="13" cy="19" r="1.6" fill="currentColor"/><circle cx="19" cy="19" r="1.6" fill="currentColor"/></svg>',
    course: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><rect x="6" y="7" width="20" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="13" x2="26" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="19" x2="26" y2="19" stroke="currentColor" stroke-width="1.5"/><line x1="13" y1="7" x2="13" y2="25" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="7" x2="20" y2="25" stroke="currentColor" stroke-width="1.5"/></svg>',
    ticket: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><rect x="5" y="11" width="22" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 14 l2 -3 2 3 2 -3 2 3 2 -3 2 3 2 -3 2 3 2 -3 2 3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="16" r="1.3" fill="currentColor"/><circle cx="21" cy="16" r="1.3" fill="currentColor"/></svg>',
    pencil: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><path d="M21 7 l4 4 -12 12 -5 1 1 -5 z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><line x1="19" y1="9" x2="23" y2="13" stroke="currentColor" stroke-width="1.5"/></svg>',
    plant: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><path d="M11 22 h10 l-1 4 h-8 z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 22 c-5 -2 -6 -8 -2 -12" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 22 c5 -2 6 -8 2 -12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    lamp: '<svg viewBox="0 0 32 32" class="sym sym-lamp" aria-hidden="true"><path d="M12 22 h8 v3 h-8 z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 22 h10" stroke="currentColor" stroke-width="1.5"/><path d="M13 22 c0 -7 6 -7 6 0" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="19" y1="9" x2="23" y2="6" stroke="currentColor" stroke-width="1.5"/><line x1="20" y1="13" x2="25" y2="13" stroke="currentColor" stroke-width="1.5"/><line x1="19" y1="17" x2="23" y2="19" stroke="currentColor" stroke-width="1.5"/></svg>',
    news: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><rect x="6" y="7" width="20" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="17" x2="23" y2="17" stroke="currentColor" stroke-width="1.5"/><line x1="9" y1="21" x2="17" y2="21" stroke="currentColor" stroke-width="1.5"/></svg>',
    window: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><rect x="7" y="8" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="8" x2="16" y2="24" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="16" x2="25" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="26" x2="25" y2="26" stroke="currentColor" stroke-width="1.5"/></svg>',
    takeout: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><path d="M9 11 h14 l-1.5 13 h-11 z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M11 11 q5 -5 10 0" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    ledger: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><rect x="11" y="5" width="11" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="11" x2="19" y2="11" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="15" x2="19" y2="15" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="19" x2="19" y2="19" stroke="currentColor" stroke-width="1.5"/></svg>',
    id: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><path d="M11 6 q-4 4 -4 10" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="10" width="12" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="6" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    thermos: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><rect x="12" y="9" width="8" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M13 9 q3 -4 6 0" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="15" x2="18" y2="15" stroke="currentColor" stroke-width="1.5"/></svg>',
    bubble: '<svg viewBox="0 0 32 32" class="sym" aria-hidden="true"><path d="M6 10 h20 a3 3 0 0 1 3 3 v8 a3 3 0 0 1 -3 3 h-11 l-6 4 v-4 h-3 a3 3 0 0 1 -3 -3 v-8 a3 3 0 0 1 3 -3 z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
  };
  function sym(name) { return SYM[name] || SYM.bubble; }
  /* 阶段 / 年代贴纸映射 */
  function stageSticker(stage) {
    return stage === 'l1' ? 'course' : stage === 'l2' ? 'ticket' : 'id';
  }
  function eraSticker(era) {
    return era === 1 ? 'news' : era === 2 ? 'window' : era === 3 ? 'ai' : 'plant';
  }

  /* ============================================================ 工具 */
  function esc(s) { return U.esc(s); }
  function resName(k) { return C.resMeta[k] ? C.resMeta[k].name : k; }
  function resFmt(k, v) {
    if (k === 'deposit') return U.fmtMoney(v);
    return U.fmtPoint(v, '');
  }
  function deltaTags(effect) {
    var order = [['deposit', '存款'], ['skill', '技能'], ['network', '人脉'], ['mind', '心态']];
    var out = [];
    order.forEach(function (o) {
      if (effect && effect[o[0]] != null) {
        var v = effect[o[0]];
        var cls = v > 0 ? 'up' : (v < 0 ? 'down' : 'flat');
        out.push({ name: o[1], cls: cls, txt: U.fmtDelta(v, o[0] === 'deposit' ? ' 万' : '') });
      }
    });
    return out;
  }

  /* ============================================================ 资源面板 */
  function resourcePanel(state) {
    var keys = ['deposit', 'skill', 'network', 'mind'];
    var wrap = el('div', { className: 'resource-panel' });
    keys.forEach(function (k) {
      var v = state.res[k];
      var low = (k === 'mind' && v <= 20) || (k === 'deposit' && v <= 0);
      var cell = el('div', { className: 'res-cell' + (low ? ' is-low' : '') });
      cell.appendChild(el('div', { className: 'res-name', text: resName(k) }));
      cell.appendChild(el('div', { className: 'res-val', text: resFmt(k, v) }));
      if (low) cell.appendChild(el('div', { className: 'res-note', text: k === 'deposit' ? '见底了' : '撑不住了' }));
      wrap.appendChild(cell);
    });
    return wrap;
  }

  /* ============================================================ 开局页 */
  function renderOpening(state, extra) {
    var Y = state.startYear, A = state.startAge;
    var screen = el('div', { className: 'screen screen-opening' });
    screen.appendChild(el('div', { className: 'op-logo', id: 'open-logo', html:
      '<svg viewBox="0 0 132 66" width="132" height="66" aria-hidden="true">' +
        '<g transform="rotate(-6 66 33)">' +
          '<rect x="7" y="7" width="118" height="52" fill="#E8B64C" stroke="#2B2620" stroke-width="6"/>' +
          '<rect x="15" y="15" width="102" height="36" fill="none" stroke="#FBF6EA" stroke-width="3"/>' +
          '<text x="66" y="42" text-anchor="middle" font-size="27" font-weight="700" fill="#2B2620" font-family="Kaiti SC,KaiTi,STKaiti,serif">第 1 天</text>' +
        '</g>' +
      '</svg>' }));
    screen.appendChild(el('div', { className: 'stamp', id: 'open-stamp', text: 'NO.' + Y + '-' + A }));
    screen.appendChild(el('h1', { className: 'title', html: '回到<b>AI</b>纪元<br>第一天' }));
    screen.appendChild(el('div', { className: 'title-sub', text: '你那年几岁？选一个，直接开穿' }));

    // 年龄三档卡片（v6：固定 2017，只选年龄 18/22/25；文案=§1.1 逐字「{age} 岁 · {阶段}」）
    var cards = el('div', { className: 'age-cards' });
    [18, 22, 25].forEach(function (age) {
      var active = age === A;
      var card = el('button', { className: 'age-card' + (active ? ' is-active' : ''), attrs: { type: 'button', 'data-age': age, 'aria-pressed': active ? 'true' : 'false' } });
      card.appendChild(el('div', { className: 'age-card-num', text: String(age) }));
      card.appendChild(el('div', { className: 'age-card-sub', text: C.bandTitle(age) }));
      card.addEventListener('click', function () { HANDLERS.onPickAge && HANDLERS.onPickAge(age); });
      cards.appendChild(card);
    });
    screen.appendChild(cards);

    screen.appendChild(el('div', { className: 'preview-card', id: 'open-preview', text: C.openings[String(A)] }));
    var begin = el('button', { className: 'btn btn-primary', id: 'btn-begin', attrs: { type: 'button' }, text: '开整！' });
    begin.addEventListener('click', function () { HANDLERS.onBegin && HANDLERS.onBegin(); });
    screen.appendChild(begin);
    if (extra && extra.canResume) {
      var resume = el('button', { className: 'btn btn-ghost', id: 'btn-resume', attrs: { type: 'button' }, text: '继续上次' });
      resume.addEventListener('click', function () { HANDLERS.onResume && HANDLERS.onResume(); });
      screen.appendChild(resume);
    }
    screen.appendChild(el('div', { className: 'footnote', text: '不用懂 AI，选你当年会选的就行——AI 只是背景音，你才是主角' }));
    return screen;
  }

  /* ============================================================ 决策页 / 号外 */
  function renderDecision(state) {
    var step = S.currentStep(state);
    var c = S.stepContent(state, step);
    var isBreak = c.kind === 'breaking';
    var screen = el('div', { className: 'screen screen-decision' + (isBreak ? ' screen-breaking' : '') });
    if (isBreak) {
      screen.appendChild(el('div', { className: 'breaking-kicker', text: c.kicker || '号外 · BREAKING' }));
      screen.appendChild(el('div', { className: 'breaking-year', text: c.yearLabel || '' }));
    }

    screen.appendChild(resourcePanel(state));

    var prog = S.decisionProgress(state);
    screen.appendChild(el('div', { className: 'progress', text: '第 ' + prog.index + '/' + prog.total + ' 个决定 · ' + step.year + ' 年 · ' + L.genLabel(step.year) }));

    var title = c.chapter || c.title || '';
    var scene = el('div', { className: 'scene-card' });
    scene.appendChild(el('div', { className: 'scene-title', text: title }));
    scene.appendChild(el('div', { className: 'scene-text', text: c.scene }));
    screen.appendChild(scene);

    // D9 回首题：作答前展示「这些年你做过的关键选择」（策划案 v4 §6.9）
    if (step.id === 'D9' && !state._pending) {
      var kc = L.keyChoices(state, 5).slice().sort(function (a, b) { return a.year - b.year; });
      var kcWrap = el('div', { className: 'key-choices' });
      kcWrap.appendChild(el('div', { className: 'kc-head', text: '这些年，你干过的关键事' }));
      kc.forEach(function (ch) {
        var row = el('div', { className: 'kc-row' });
        row.appendChild(el('div', { className: 'kc-year', text: (ch.year || '') + ' 年' }));
        row.appendChild(el('div', { className: 'kc-label', text: ch.label }));
        kcWrap.appendChild(row);
      });
      screen.appendChild(kcWrap);
    }

    var pending = state._pending;
    var optsWrap = el('div', { className: 'options' });
    c.options.forEach(function (opt, i) {
      var btn = el('button', { className: 'option', attrs: { type: 'button', 'data-idx': i } });
      btn.appendChild(el('span', { className: 'opt-idx', text: ('0' + (i + 1)).slice(-2) }));
      var body = el('div', { className: 'opt-body' });
      body.appendChild(el('div', { className: 'opt-label', text: opt.label }));
      var tags = deltaTags(opt.effect);
      if (tags.length) {
        var tagWrap = el('div', { className: 'opt-tags' });
        tags.forEach(function (t) { tagWrap.appendChild(el('span', { className: 'tag tag-' + t.cls, text: t.name + ' ' + t.txt })); });
        body.appendChild(tagWrap);
      }
      btn.appendChild(body);
      // v6 §1.3：选中后不锁定——所有选项均可点击改选；改选后仅替换待定选择并刷新回声/生活线，
      // 资源结算在点「继续」时才发生（防误触）。
      btn.addEventListener('click', function () { HANDLERS.onChoose && HANDLERS.onChoose(i); });
      if (pending && pending.idx === i) btn.classList.add('selected');
      optsWrap.appendChild(btn);
    });
    screen.appendChild(optsWrap);

    if (pending) {
      var echo = el('div', { className: 'echo' });
      echo.appendChild(el('div', { className: 'echo-kicker', text: c.kind === 'breaking' ? '那年真实' : '回声' }));
      echo.appendChild(el('div', { className: 'echo-text', text: pending.option.echo }));
      screen.appendChild(echo);
      var life = el('div', { className: 'life' });
      life.appendChild(el('div', { className: 'life-kicker', text: '生活线' }));
      life.appendChild(el('div', { className: 'life-text', text: pending.option.life }));
      screen.appendChild(life);
      screen.appendChild(el('div', { className: 'hint', text: '手滑了？再点一次别的，改到你满意为止。' }));
      var cont = el('button', { className: 'btn btn-primary btn-continue', attrs: { type: 'button' }, text: '继续' });
      cont.addEventListener('click', function () { HANDLERS.onContinue && HANDLERS.onContinue(); });
      screen.appendChild(cont);
    }
    return screen;
  }

  /* ============================================================ 中段结算 */
  function renderMidsettle(state) {
    var screen = el('div', { className: 'screen screen-mid' });
    screen.appendChild(el('div', { className: 'mid-title', text: '中场 · 你活成啥样了' }));
    screen.appendChild(el('div', { className: 'mid-sub', text: state.year + ' 年 · 你 ' + state.age + ' 岁' }));

    var quad = el('div', { className: 'res-quad' });
    ['deposit', 'skill', 'network', 'mind'].forEach(function (k) {
      var cell = el('div', { className: 'quad-cell' });
      cell.appendChild(el('div', { className: 'quad-name', text: resName(k) }));
      cell.appendChild(el('div', { className: 'quad-val', text: resFmt(k, state.res[k]) }));
      quad.appendChild(cell);
    });
    screen.appendChild(quad);

    var kc = L.keyChoices(state, 3);
    var kcWrap = el('div', { className: 'key-choices' });
    kcWrap.appendChild(el('div', { className: 'kc-head', text: '这些年你的三个关键选择' }));
    kc.forEach(function (ch) {
      var row = el('div', { className: 'kc-row' });
      row.appendChild(el('div', { className: 'kc-year', text: (ch.year || '') + ' 年' }));
      row.appendChild(el('div', { className: 'kc-label', text: ch.label }));
      kcWrap.appendChild(row);
    });
    screen.appendChild(kcWrap);

    // 气质进度：AR/GS 按当前已做选择即时可判（v6 修：此前 state.personality 只在结局才计算，
    // 导致中段永远 4 个「?」却写死「2/4」）；TP/IO 依赖最终资源差，保持「?」
    var ppv = L.computePersonality(state);
    var dims = [
      { code: 'AR', name: 'AI 姿态', known: true, val: ppv.ar === 'A' ? '拥抱' : '抵抗' },
      { code: 'GS', name: '人生策略', known: true, val: ppv.gs === 'G' ? '敢闯' : '求稳' },
      { code: 'TP', name: '吃饭武器', known: false, val: '?' },
      { code: 'IO', name: '能量方向', known: false, val: '?' }
    ];
    var pp = el('div', { className: 'persona-progress' });
    pp.appendChild(el('div', { className: 'pp-head', text: '此刻气质 2/4（懂的都懂）' }));
    dims.forEach(function (d) {
      pp.appendChild(el('div', { className: 'pp-cell' + (d.known ? ' lit' : ''), text: d.code + ' ' + d.val }));
    });
    screen.appendChild(pp);

    var actions = el('div', { className: 'mid-actions' });
    var cont = el('button', { className: 'btn btn-primary', attrs: { type: 'button' }, text: '冲！最后两年' });
    cont.addEventListener('click', function () { HANDLERS.onContinue && HANDLERS.onContinue(); });
    actions.appendChild(cont);
    var share = el('button', { className: 'btn btn-ghost', attrs: { type: 'button' }, text: '晒半场小结' });
    share.addEventListener('click', function () { HANDLERS.onShareHalf && HANDLERS.onShareHalf(); });
    actions.appendChild(share);
    screen.appendChild(actions);
    return screen;
  }

  /* ============================================================ 结局卡 */
  function renderEnding(state) {
    var ending = state.ending, p = state.personality;
    var endAge = state.startAge + (2026 - state.startYear);
    var isWarn = ending && ending.warn;
    var screen = el('div', { className: 'screen screen-ending' + (isWarn ? ' is-warn' : '') });

    // 人格印章（右上）
    var rare = p && p.type && p.type.rare;
    var stamp = el('div', { className: 'persona-stamp' + (rare ? ' rare' : '') });
    stamp.appendChild(el('div', { className: 'ps-code', text: p ? p.code : '' }));
    stamp.appendChild(el('div', { className: 'ps-name', text: p ? p.type.name : '' }));
    screen.appendChild(stamp);

    // 人物首字肖像
    screen.appendChild(el('div', { className: 'portrait', text: (state.startYear + '').slice(-1) }));
    screen.appendChild(el('div', { className: 'end-age', text: '2026 年，你 ' + endAge + ' 岁' }));

    var bio = ending ? U.tpl(ending.bio, L.endingParams(state)) : '';
    screen.appendChild(el('div', { className: 'end-bio', text: bio }));

    if (isWarn) {
      var nl = el('div', { className: 'night-lamp' });
      nl.innerHTML = sym('lamp');
      screen.appendChild(nl);
      screen.appendChild(el('div', { className: 'night-note', text: '太迟的第二天，也还是第二天。' }));
    }

    var n = (state.archives || []).length;
    screen.appendChild(el('div', { className: 'archive-row', text: '档案已解锁 ' + n + ' / 21' }));

    var actions = el('div', { className: 'end-actions' });
    var b1 = el('button', { className: 'btn btn-ghost', attrs: { type: 'button' }, text: '解锁档案' });
    b1.addEventListener('click', function () { HANDLERS.onArchives && HANDLERS.onArchives(); });
    var b2 = el('button', { className: 'btn btn-primary', attrs: { type: 'button' }, text: '生成成绩卡' });
    b2.addEventListener('click', function () { HANDLERS.onScore && HANDLERS.onScore(); });
    var b3 = el('button', { className: 'btn btn-ghost', attrs: { type: 'button' }, text: '重开一局！' });
    b3.addEventListener('click', function () { HANDLERS.onRestart && HANDLERS.onRestart(); });
    actions.appendChild(b1); actions.appendChild(b2); actions.appendChild(b3);
    screen.appendChild(actions);
    return screen;
  }

  /* 档案生活线过滤（策划案 v4 §10.1/§10.3）：
     只显示 开局年份 <= 条目年份 <= 到达年份 的行；年份含 ? 的反事实条目在到达年份 >= 2024 时才显示 */
  function lifeRowVisible(e, state) {
    var y = String(e.y);
    var reached = state.reachedYear || 2026;
    if (y.indexOf('?') >= 0) return reached >= 2024;
    var m = y.match(/^(\d{4})/);
    if (!m) return true;
    var n = parseInt(m[1], 10);
    return n >= state.startYear && n <= reached;
  }

  /* ============================================================ 档案柜 */
  function renderArchives(state) {
    var screen = el('div', { className: 'screen screen-archives' });
    var n = (state.archives || []).length;
    screen.appendChild(el('div', { className: 'arch-header', text: '档案 ' + n + ' / 21' }));
    var grid = el('div', { className: 'arch-grid' });
    A.summary(state).forEach(function (item) {
      var a = item.arch;
      var card = el('button', { className: 'arch-card cat-' + a.cat + (item.unlocked ? '' : ' locked'), attrs: { type: 'button', 'data-key': a.key } });
      card.appendChild(el('div', { className: 'arch-no', text: 'ARCHIVE ' + a.n + '/21' }));
      card.appendChild(el('div', { className: 'arch-title', text: a.title }));
      if (!item.unlocked) {
        var cl = el('div', { className: 'classified' });
        cl.appendChild(el('div', { className: 'classified-bars' }));
        cl.appendChild(el('div', { className: 'classified-text', text: 'CLASSIFIED · 内容已涂黑' }));
        card.appendChild(cl);
        var rv = el('div', { className: 'revealed' });
        item.revealed.forEach(function (r) { rv.appendChild(el('div', { className: 'rv-row', text: r.y + '  ' + r.t })); });
        card.appendChild(rv);
      } else {
        card.appendChild(el('div', { className: 'unlocked-tag', text: '已解锁' }));
      }
      if (item.unlocked) card.addEventListener('click', function () { HANDLERS.onOpenArchive && HANDLERS.onOpenArchive(a.key); });
      else card.setAttribute('disabled', 'disabled');
      grid.appendChild(card);
    });
    screen.appendChild(grid);
    var back = el('button', { className: 'btn btn-ghost', attrs: { type: 'button' }, text: '返回结局' });
    back.addEventListener('click', function () { HANDLERS.onBackEnding && HANDLERS.onBackEnding(); });
    screen.appendChild(back);
    return screen;
  }

  /* ============================================================ 档案页 */
  function renderArchivePage(state, key) {
    var a = A.byKey(key);
    var screen = el('div', { className: 'screen screen-archive-page' });
    if (!a) { screen.appendChild(el('div', { className: 'ap-title', text: '档案不存在' })); return screen; }
    screen.appendChild(el('div', { className: 'ap-stamp', text: 'ARCHIVE ' + a.n + '/21' }));
    screen.appendChild(el('div', { className: 'ap-title', text: a.title }));

    var tl = el('div', { className: 'timeline' });
    var wsec = el('div', { className: 'tl-section tl-world' });
    wsec.appendChild(el('div', { className: 'tl-head', text: '世界线' }));
    a.world.forEach(function (e) { wsec.appendChild(el('div', { className: 'tl-row', text: e.y + '  ' + e.t })); });
    tl.appendChild(wsec);

    var lsec = el('div', { className: 'tl-section tl-life' });
    lsec.appendChild(el('div', { className: 'tl-head', text: '生活线' }));
    var shown = 0;
    a.life.forEach(function (e) {
      if (!lifeRowVisible(e, state)) return;
      lsec.appendChild(el('div', { className: 'tl-row', text: e.y + '  ' + e.t }));
      shown++;
    });
    if (shown === 0) lsec.appendChild(el('div', { className: 'tl-row tl-muted', text: '（你还没走到能看清它的年份）' }));
    tl.appendChild(lsec);
    screen.appendChild(tl);

    var save = el('button', { className: 'btn btn-primary', attrs: { type: 'button' }, text: '保存图片' });
    save.addEventListener('click', function () { HANDLERS.onSaveArchive && HANDLERS.onSaveArchive(a); });
    var back = el('button', { className: 'btn btn-ghost', attrs: { type: 'button' }, text: '返回档案柜' });
    back.addEventListener('click', function () { HANDLERS.onBackCab && HANDLERS.onBackCab(); });
    var acts = el('div', { className: 'ap-actions' });
    acts.appendChild(save); acts.appendChild(back);
    screen.appendChild(acts);
    return screen;
  }

  /* ============================================================ 成绩卡（Canvas） */
  function renderScore(state) {
    var screen = el('div', { className: 'screen screen-score' });
    var canvas = el('canvas', { attrs: { id: 'score-canvas', width: 1080, height: 1440 } });
    screen.appendChild(canvas);
    var acts = el('div', { className: 'score-actions' });
    var save = el('button', { className: 'btn btn-primary', attrs: { type: 'button' }, text: '保存图片' });
    save.addEventListener('click', function () { HANDLERS.onSaveScore && HANDLERS.onSaveScore(canvas); });
    var back = el('button', { className: 'btn btn-ghost', attrs: { type: 'button' }, text: '返回' });
    back.addEventListener('click', function () {
      if (state._half) { HANDLERS.onBackMid && HANDLERS.onBackMid(); }
      else { HANDLERS.onBackEnding && HANDLERS.onBackEnding(); }
    });
    acts.appendChild(save); acts.appendChild(back);
    screen.appendChild(acts);
    // 等挂载后绘制
    setTimeout(function () { drawScore(canvas, state); }, 0);
    return screen;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function drawScore(canvas, state) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = 1080, H = 1440;
    var paper1 = cssVar('--paper-1') || '#F4EEDC';
    var paper0 = cssVar('--paper-0') || '#FBF5E8';
    var ink = cssVar('--ink') || '#26303A';
    var accent = cssVar('--accent') || '#B23A2E';
    var gold = cssVar('--gold') || '#A8801F';
    var fontSans = '"PingFang SC","Microsoft YaHei",sans-serif';
    var fontNote = '"Kaiti SC","楷体",serif';

    ctx.fillStyle = paper1; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(24, 24, W - 48, H - 48);

    var bandH = 250;
    ctx.fillStyle = ink; ctx.fillRect(24, 24, W - 48, bandH);
    var ending = state.ending || null, p = state.personality || null;
    var endAge = state.startAge + (2026 - state.startYear);
    var param = '我从 ' + state.startYear + ' 年 ' + state.startAge + ' 岁走到 2026 年 ' + endAge + ' 岁';
    ctx.fillStyle = paper0;
    ctx.font = '700 56px ' + fontSans;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(param, W / 2, 24 + bandH / 2);

    if (state._half) {
      // 中场小结版（结局未定，只呈现中段资源与关键选择）
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = accent; ctx.font = '700 56px ' + fontSans;
      ctx.fillText('中场 · 我活成这样了', 70, 24 + bandH + 90);
      var resY = 24 + bandH + 170;
      ['deposit', 'skill', 'network', 'mind'].forEach(function (k, i) {
        var x = 70 + (i % 2) * 480, y = resY + Math.floor(i / 2) * 130;
        ctx.fillStyle = ink; ctx.font = '700 40px ' + fontSans; ctx.fillText(resName(k), x, y);
        ctx.fillStyle = accent; ctx.font = '700 56px ' + fontSans; ctx.fillText(resFmt(k, state.res[k]), x, y + 60);
      });
      var kcY = resY + 320;
      ctx.fillStyle = ink; ctx.font = '700 40px ' + fontSans; ctx.fillText('三个关键选择', 70, kcY);
      var kc = L.keyChoices(state, 3);
      kc.forEach(function (ch, i) {
        ctx.fillStyle = ink; ctx.font = '34px ' + fontSans;
        wrapText(ctx, (ch.year || '') + ' 年 · ' + ch.label, 70, kcY + 60 + i * 56, W - 140, 48);
      });
      ctx.fillStyle = ink; ctx.globalAlpha = 0.4; ctx.font = '26px ' + fontSans;
      ctx.fillText('回到AI纪元第一天', 70, H - 60); ctx.globalAlpha = 1;
      return;
    }

    // 人格印章（右上，圆内双线）
    var psX = W - 150, psY = 24 + bandH + 80, psR = 92;
    ctx.strokeStyle = gold; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(psX, psY, psR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(psX, psY, psR - 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = 'center';
    ctx.font = '700 38px ' + fontSans; ctx.fillText(p ? p.code : '', psX, psY - 14);
    ctx.font = '28px ' + fontNote; ctx.fillText(p ? p.type.name : '', psX, psY + 26);

    // 活法
    var y = 24 + bandH + 90;
    ctx.textAlign = 'left'; ctx.fillStyle = ink;
    ctx.font = '700 44px ' + fontSans;
    ctx.fillText('我的十年活法', 70, y);
    ctx.fillStyle = accent; ctx.font = '700 52px ' + fontSans;
    ctx.fillText((ending ? ending.name : ''), 70, y + 70);

    // 气质代码 + 一句话肖像
    y += 170;
    ctx.fillStyle = ink; ctx.font = '700 40px ' + fontSans;
    ctx.fillText('气质代码：' + (p ? p.code : '') + ' · ' + (p ? p.type.name : ''), 70, y);
    ctx.fillStyle = ink; ctx.font = '34px ' + fontNote;
    wrapText(ctx, p ? p.type.portrait : '', 70, y + 56, W - 140, 48);

    // 档案进度
    y += 170;
    ctx.fillStyle = ink; ctx.font = '700 40px ' + fontSans;
    ctx.fillText('档案收集：' + (state.archives ? state.archives.length : 0) + ' / 21', 70, y);

    // 你做过的一件事
    y += 80;
    var top = (state.choices || []).slice().sort(function (a, b) { return b.significance - a.significance; })[0];
    ctx.fillStyle = ink; ctx.font = '700 40px ' + fontSans;
    ctx.fillText('你做过的一件事', 70, y);
    ctx.fillStyle = ink; ctx.font = '34px ' + fontSans;
    wrapText(ctx, top ? top.label : '（那年你做了一个选择）', 70, y + 56, W - 140, 48);

    // 评论区钩子
    y += 170;
    ctx.fillStyle = accent; ctx.font = '700 40px ' + fontSans;
    ctx.fillText('评论区对号入座吗？', 70, y);

    // 水印
    ctx.fillStyle = ink; ctx.globalAlpha = 0.4; ctx.font = '26px ' + fontSans;
    ctx.fillText('回到AI纪元第一天', 70, H - 60);
    ctx.globalAlpha = 1;
  }

  /** 档案页导出为图片（dataURL），供「保存图片」 */
  function exportArchive(arch, state) {
    try {
      var c = document.createElement('canvas'); c.width = 1080; c.height = 1440;
      var ctx = c.getContext('2d');
      var paper1 = cssVar('--paper-1') || '#F4EEDC', ink = cssVar('--ink') || '#26303A', accent = cssVar('--accent') || '#B23A2E';
      var fontSans = '"PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillStyle = paper1; ctx.fillRect(0, 0, 1080, 1440);
      ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.strokeRect(24, 24, 1032, 1392);
      ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 30px ' + fontSans; ctx.fillText('ARCHIVE ' + arch.n + '/21', 70, 90);
      ctx.font = '700 64px ' + fontSans; ctx.fillText(arch.title, 70, 160);
      ctx.font = '700 40px ' + fontSans; ctx.fillText('世界线', 70, 240);
      var y = 290; ctx.font = '32px ' + fontSans;
      arch.world.forEach(function (e) { wrapText(ctx, e.y + '  ' + e.t, 70, y, 940, 44); y += 52; });
      y += 30; ctx.fillStyle = accent; ctx.font = '700 40px ' + fontSans; ctx.fillText('生活线', 70, y);
      y += 50; ctx.fillStyle = ink; ctx.font = '32px ' + fontSans;
      arch.life.forEach(function (e) { if (!lifeRowVisible(e, state)) return; wrapText(ctx, e.y + '  ' + e.t, 70, y, 940, 44); y += 52; });
      return c.toDataURL('image/png');
    } catch (e) { return null; }
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    if (!text) return y;
    var chars = String(text).split('');
    var line = '', yy = y;
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = chars[i]; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy;
  }

  /* ============================================================ 时代邮票（入场动画用） */
  function eraStampNode(year, era) {
    var node = el('div', { className: 'era-stamp is-in' });
    node.innerHTML = sym(eraSticker(era));
    node.appendChild(el('div', { className: 'era-stamp-year', text: String(year) }));
    return node;
  }

  /* ============================================================ 入口 */
  function init(root, handlers) {
    ROOT = root; HANDLERS = handlers || {};
  }
  function show(state, extra) {
    if (!ROOT) return;
    U.clear(ROOT);
    ROOT.setAttribute('class', 'app screen-' + state.screen);
    var node;
    switch (state.screen) {
      case 'opening': node = renderOpening(state, extra); break;
      case 'decision': node = renderDecision(state); break;
      case 'midsettle': node = renderMidsettle(state); break;
      case 'ending': node = renderEnding(state); break;
      case 'archives': node = renderArchives(state); break;
      case 'archivePage': node = renderArchivePage(state, extra && extra.key); break;
      case 'score': node = renderScore(state); break;
      default: node = renderDecision(state);
    }
    ROOT.appendChild(node);
    ROOT.scrollTop = 0;
    if (state._lastStamp) {
      var es = eraStampNode(state._lastStamp, L.eraForYear(state._lastStamp));
      document.body.appendChild(es);
      setTimeout(function () { if (es.parentNode) es.parentNode.removeChild(es); }, 1100);
      state._lastStamp = null;
    }
  }

  global.UI = {
    init: init, show: show, eraStampNode: eraStampNode, eraSticker: eraSticker,
    sym: sym, stageSticker: stageSticker, exportArchive: exportArchive
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.UI;
})(typeof window !== 'undefined' ? window : globalThis);
