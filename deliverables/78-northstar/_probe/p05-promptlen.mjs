// 探针 05：真实 buildPrompt 长度（stub DOM；失败则退回 dna JSON 长度近似）
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const noop = () => {};
const fakeEl = () => ({
  style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
  appendChild: noop, insertBefore: noop, removeChild: noop, addEventListener: noop,
  removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
  focus: noop, blur: noop, click: noop, remove: noop, cloneNode: () => fakeEl(),
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }),
  children: [], childNodes: [], firstChild: null, parentNode: null,
  innerHTML: '', textContent: '', value: '', dataset: {}, offsetHeight: 0, scrollHeight: 0,
});

const doc = {
  readyState: 'complete',
  documentElement: fakeEl(),
  body: fakeEl(),
  head: fakeEl(),
  createElement: () => fakeEl(),
  createTextNode: () => ({}),
  createDocumentFragment: () => fakeEl(),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: noop,
  removeEventListener: noop,
  execCommand: () => true,
  activeElement: null,
};

const win = { document: doc, console, navigator: { clipboard: undefined, userAgent: 'node' },
  location: { href: 'file:///x', search: '' }, localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  setTimeout, clearTimeout, addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }) };
win.window = win;
const ctx = vm.createContext(win);

vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'), ctx);

let ok = false;
try {
  vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompt-copy.js', 'utf8'), ctx);
  ok = typeof ctx.buildStylePrompt === 'function';
} catch (e) {
  console.log('prompt-copy load FAILED:', e.message);
}
console.log('buildStylePrompt available =', ok);

if (ok) {
  console.log('\n--- real prompt length (no opts) ---');
  for (const s of ctx.SCHEMES) {
    let len = -1, err = '';
    try { len = ctx.buildStylePrompt(s.id).length; } catch (e) { err = e.message; }
    console.log(s.id, len, err);
  }
}
