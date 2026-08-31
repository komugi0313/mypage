/* Load the real Pocket鑑定 app (engine + main script) in Node with DOM/browser stubs,
   so we can call the ACTUAL buildSystemPrompt()/computeChart() and eval real conversation quality.
   No key or secret is stored here. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

function makeNode() {
  const style = {}, dataset = {};
  const h = {
    get(t, p) {
      if (typeof p === 'symbol') return undefined;
      if (p === 'then') return undefined;                 // not thenable
      if (p === 'style') return style;
      if (p === 'dataset') return dataset;
      if (p === 'classList') return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
      if (p === 'children' || p === 'childNodes') return [];
      if (p === 'options') return [];
      if (p === 'length') return 0;
      if (['value','textContent','innerHTML','innerText','className','id','tagName','type','name'].includes(p)) return '';
      if (['nextSibling','previousSibling','nextElementSibling','previousElementSibling'].includes(p)) return null;
      if (['parentNode','parentElement','firstChild','lastChild','firstElementChild','lastElementChild','offsetParent'].includes(p)) return makeNode();
      if (['checked','disabled','hidden','selected'].includes(p)) return false;
      if (['offsetTop','offsetHeight','offsetWidth','scrollTop','scrollHeight','clientHeight','clientWidth'].includes(p)) return 0;
      if (p === 'getAttribute') return () => null;
      if (p === 'hasAttribute' || p === 'matches') return () => false;
      if (['setAttribute','removeAttribute','setSelectionRange','focus','blur','click','scrollIntoView','remove','scrollTo'].includes(p)) return () => {};
      if (['appendChild','removeChild','insertBefore','append','prepend','replaceChild'].includes(p)) return (x) => x;
      if (['addEventListener','removeEventListener','dispatchEvent'].includes(p)) return () => {};
      if (p === 'querySelector') return () => makeNode();
      if (p === 'querySelectorAll' || p === 'getElementsByClassName' || p === 'getElementsByTagName') return () => [];
      if (p === 'closest') return () => null;
      if (p === 'cloneNode') return () => makeNode();
      if (p === 'insertAdjacentHTML' || p === 'insertAdjacentElement') return () => {};
      if (p === 'getBoundingClientRect') return () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 });
      return makeNode();
    },
    set() { return true; },
    apply() { return makeNode(); },
    has() { return true; },
  };
  return new Proxy(function () {}, h);
}

const mem = {};
const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = '' + v; }, removeItem: k => { delete mem[k]; }, clear: () => { for (const k in mem) delete mem[k]; }, key: () => null, length: 0 };

const documentStub = new Proxy({}, {
  get(t, p) {
    if (typeof p === 'symbol') return undefined;
    if (p === 'getElementById') return () => makeNode();
    if (p === 'querySelector') return () => makeNode();
    if (p === 'querySelectorAll' || p === 'getElementsByClassName' || p === 'getElementsByTagName') return () => [];
    if (p === 'createElement' || p === 'createElementNS' || p === 'createDocumentFragment' || p === 'createTextNode') return () => makeNode();
    if (p === 'body' || p === 'documentElement' || p === 'head') return makeNode();
    if (p === 'addEventListener' || p === 'removeEventListener') return () => {};
    if (p === 'cookie') return '';
    if (p === 'referrer') return '';
    if (p === 'readyState') return 'complete';
    if (p === 'visibilityState') return 'visible';
    if (p === 'hidden') return false;
    if (p === 'title') return 'Pocket';
    if (p === 'location') return ctx.location;
    return makeNode();
  },
  set() { return true; },
});

const noop = () => {};
const ctx = {
  console, JSON, Math, Date, RegExp, Object, Array, String, Number, Boolean, parseInt, parseFloat,
  isNaN, isFinite, encodeURIComponent, decodeURIComponent, Intl, Promise, Error, Map, Set, Symbol,
  fetch: (...a) => global.fetch(...a),
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  requestAnimationFrame: () => 0, cancelAnimationFrame: noop, queueMicrotask: (f) => Promise.resolve().then(f),
  performance: { now: () => Date.now() }, btoa: s => Buffer.from(s, 'binary').toString('base64'),
  atob: s => Buffer.from(s, 'base64').toString('binary'),
  localStorage: storage, sessionStorage: storage, document: documentStub,
  navigator: { userAgent: 'node', language: 'ja', languages: ['ja'], onLine: true, serviceWorker: { register: () => Promise.resolve({}) }, vibrate: noop },
  location: { href: 'https://app.local/', origin: 'https://app.local', pathname: '/', search: '', hash: '', reload: noop, replace: noop, assign: noop, protocol: 'https:', host: 'app.local' },
  history: { replaceState: noop, pushState: noop, back: noop },
  matchMedia: () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  alert: noop, confirm: () => true, prompt: () => null, scrollTo: noop,
  CustomEvent: function () {}, Event: function () {}, Notification: function () {},
  IntersectionObserver: function () { return { observe: noop, unobserve: noop, disconnect: noop }; },
  ResizeObserver: function () { return { observe: noop, unobserve: noop, disconnect: noop }; },
  MutationObserver: function () { return { observe: noop, disconnect: noop }; },
  Image: function () {}, Audio: function () {}, URL, URLSearchParams, TextEncoder, TextDecoder,
  screen: { width: 390, height: 844 }, devicePixelRatio: 2, innerWidth: 390, innerHeight: 844,
  addEventListener: noop, removeEventListener: noop, dispatchEvent: noop, focus: noop,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;

vm.createContext(ctx);

function loadFile(f) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
}
function loadInlineMainScript() {
  const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // largest inline (non-src) script = the app
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m, best = '';
  while ((m = re.exec(h))) { if (/\bsrc=/.test(m[1])) continue; if (m[2].length > best.length) best = m[2]; }
  vm.runInContext(best, ctx, { filename: 'index.inline.js' });
}

module.exports = { ctx, loadFile, loadInlineMainScript, makeNode };
