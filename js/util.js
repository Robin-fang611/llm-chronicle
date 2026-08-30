/**
 * util.js —— 通用工具层（v3.3 人生决策模拟版）
 * 命名空间：window.Util
 *
 * 职责：数值安全、DOM 助手、安全存储、可复现随机数、格式化。
 * 约束（autonomous-dev-prompt.md §6）：
 *   - 无任何网络请求、无 eval / new Function
 *   - localStorage 读写必须 try/catch，且不得空吞异常
 *   - 不依赖任何外部库
 */
(function (global) {
  'use strict';

  var Util = {};

  /* ---------------------------------------------------------------- 数值 */

  function num(v, fallback) {
    var fb = typeof fallback === 'number' && isFinite(fallback) ? fallback : 0;
    if (typeof v === 'number') return isFinite(v) ? v : fb;
    if (typeof v === 'string' && v.trim() !== '') {
      var n = Number(v);
      return isFinite(n) ? n : fb;
    }
    return fb;
  }

  function clamp(v, min, max) {
    var lo = num(min, 0), hi = num(max, 0);
    if (lo > hi) { var t = lo; lo = hi; hi = t; }
    var n = num(v, lo);
    return n < lo ? lo : (n > hi ? hi : n);
  }

  function clampInt(v, min, max) { return Math.round(clamp(v, min, max)); }

  /* ------------------------------------------------------------ 随机数 */
  function makeRng(seed) {
    var s = (num(seed, 1) >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickIndex(rng, arr) {
    if (!arr || arr.length === 0) return -1;
    var r = typeof rng === 'function' ? rng() : Math.random();
    var i = Math.floor(r * arr.length);
    if (!isFinite(i) || i < 0) i = 0;
    if (i >= arr.length) i = arr.length - 1;
    return i;
  }

  /* -------------------------------------------------------------- 存储 */
  var store = {
    lastError: null,
    available: (function () {
      try {
        var k = '__mc_probe__';
        global.localStorage.setItem(k, '1');
        global.localStorage.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    get: function (key) {
      try {
        if (!global.localStorage) return null;
        return global.localStorage.getItem(key);
      } catch (e) {
        store.lastError = e;
        return null;
      }
    },
    set: function (key, val) {
      try {
        if (!global.localStorage) return false;
        global.localStorage.setItem(key, String(val));
        return true;
      } catch (e) {
        store.lastError = e;
        return false;
      }
    },
    remove: function (key) {
      try {
        if (!global.localStorage) return false;
        global.localStorage.removeItem(key);
      } catch (e) {
        store.lastError = e;
        return false;
      }
    },
    getJSON: function (key, fallback) {
      var raw = store.get(key);
      if (raw === null || raw === '') return fallback;
      try {
        var v = JSON.parse(raw);
        return (v === null || v === undefined) ? fallback : v;
      } catch (e) {
        store.lastError = e;
        return fallback;
      }
    },
    setJSON: function (key, val) {
      try {
        return store.set(key, JSON.stringify(val));
      } catch (e) {
        store.lastError = e;
        return false;
      }
    }
  };

  /* ---------------------------------------------------------------- DOM */
  function $(sel, root) {
    var scope = root || global.document;
    if (!scope || typeof scope.querySelector !== 'function') return null;
    return scope.querySelector(sel);
  }
  function $$(sel, root) {
    var scope = root || global.document;
    if (!scope || typeof scope.querySelectorAll !== 'function') return [];
    return Array.prototype.slice.call(scope.querySelectorAll(sel));
  }

  /**
   * 创建元素。text 以 textContent 写入（天然防 XSS）；
   * 需要富文本时用 html 参数，但禁止拼接用户不可信内容。
   */
  function el(tag, opts) {
    var o = opts || {};
    var d = global.document;
    if (!d) return null;
    var node = d.createElement(tag);
    if (o.className) node.className = o.className;
    if (o.id) node.id = o.id;
    if (o.attrs) {
      Object.keys(o.attrs).forEach(function (k) {
        var v = o.attrs[k];
        if (v === null || v === undefined || v === false) return;
        node.setAttribute(k, String(v));
      });
    }
    if (o.style) node.setAttribute('style', String(o.style));
    if (typeof o.text === 'string' || typeof o.text === 'number') node.textContent = String(o.text);
    if (o.html) node.innerHTML = String(o.html);
    if (o.children) {
      (o.children || []).forEach(function (c) { if (c) node.appendChild(c); });
    }
    return node;
  }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* ------------------------------------------------------------ 格式化 */
  /** 存款：单位「万元」，整数不带小数，否则保留 1 位 */
  function fmtMoney(v) {
    var n = num(v, 0);
    var r = Math.round(n * 10) / 10;
    var s = (Math.abs(r % 1) < 1e-9) ? String(Math.round(r)) : r.toFixed(1);
    return '¥' + s + ' 万';
  }

  /** 点数型资源（技能/人脉/心态）：整数 + 单位 */
  function fmtPoint(v, unit) {
    return Math.round(num(v, 0)) + (unit || '');
  }

  /** 带符号变化量，用于后果标签 */
  function fmtDelta(v, suffix) {
    var n = Math.round(num(v, 0));
    var s = n > 0 ? '+' : (n < 0 ? '' : '±');
    return s + n + (suffix || '');
  }

  /** 百分号不带换行 */
  function fmtPct(v) { return Math.round(num(v, 0)) + '%'; }

  /* -------------------------------------------------------------- 杂项 */
  function clone(o) {
    if (o === null || typeof o !== 'object') return o;
    if (Array.isArray(o)) return o.map(clone);
    var r = {};
    Object.keys(o).forEach(function (k) { r[k] = clone(o[k]); });
    return r;
  }

  function assert(cond, msg) {
    if (!cond) throw new Error('[Util.assert] ' + (msg || '断言失败'));
  }

  function checkText(v, name, maxLen) {
    if (typeof v !== 'string' || v.trim() === '') throw new Error('[Util.checkText] ' + (name || '字段') + ' 不能为空');
    if (typeof maxLen === 'number' && v.length > maxLen) throw new Error('[Util.checkText] ' + (name || '字段') + ' 超长（' + v.length + ' > ' + maxLen + '）');
    return v;
  }

  /** 简单模板替换：把 {key} 换成 data[key]；用于结局/结算文案（key 可为中文，如 {裸辞那年}） */
  function tpl(str, data) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{([^{}]+)\}/g, function (m, k) {
      return (data && data[k] !== undefined && data[k] !== null) ? String(data[k]) : m;
    });
  }

  Util.num = num;
  Util.clamp = clamp;
  Util.clampInt = clampInt;
  Util.makeRng = makeRng;
  Util.pickIndex = pickIndex;
  Util.store = store;
  Util.$ = $;
  Util.$$ = $$;
  Util.el = el;
  Util.esc = esc;
  Util.clear = clear;
  Util.fmtMoney = fmtMoney;
  Util.fmtPoint = fmtPoint;
  Util.fmtDelta = fmtDelta;
  Util.fmtPct = fmtPct;
  Util.clone = clone;
  Util.assert = assert;
  Util.checkText = checkText;
  Util.tpl = tpl;

  global.Util = Util;

  if (typeof module !== 'undefined' && module.exports) module.exports = Util;
})(typeof window !== 'undefined' ? window : globalThis);
