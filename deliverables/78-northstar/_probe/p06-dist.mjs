// 探针 06：全库 35 案 × 全部维度，导出为 JSON + 分布表
import { readFileSync, writeFileSync } from 'node:fs';
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
  readyState: 'complete', documentElement: fakeEl(), body: fakeEl(), head: fakeEl(),
  createElement: () => fakeEl(), createTextNode: () => ({}), createDocumentFragment: () => fakeEl(),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener: noop, removeEventListener: noop, execCommand: () => true, activeElement: null,
};
const win = { document: doc, console, navigator: { clipboard: undefined, userAgent: 'node' },
  location: { href: 'file:///x', search: '' },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  setTimeout, clearTimeout, addEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop }) };
win.window = win;
const ctx = vm.createContext(win);

vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'), ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompt-copy.js', 'utf8'), ctx);

const S = ctx.window.SCHEMES;
const P = ctx.window.STYLE_PROMPTS;
const hardIds = new Set(P.hardIds);
const promptBy = {};
for (const e of P.schemes) promptBy[e.id] = e;

// Q2 新建案：git add-commit 落于 2026-11-10 的五案（见 git log --diff-filter=A）
const Q2_NEW = new Set(['S31', 'S32', 'S33', 'S34', 'S35']);

const rows = S.map(s => {
  const p = promptBy[s.id] || {};
  let plen = -1;
  try { plen = ctx.buildStylePrompt(s.id).length; } catch { /* leave -1 */ }
  return {
    id: s.id,
    cn: s.cn,
    structure: s.structure,
    threshold: s.threshold,
    tone: s.tone,
    band: s.axes.band,
    ground: s.axes.ground,
    chroma: s.axes.chroma,
    loud: s.axes.loud,
    load: s.axes.load,
    groundL: s.axes.groundL,
    bandL: s.axes.bandL,
    words: s.axes.words,
    gateFail: s.gate.fail,
    gateWarn: s.gate.warn,
    realPictures: s.gate.realPictures,
    screens: s.gate.screens,
    minPics: p.minPics,
    minItems: p.minItems,
    degrades: p.capacity ? p.capacity.degrades : null,
    hard: hardIds.has(s.id),
    promptLen: plen,
    q2new: Q2_NEW.has(s.id),
    scenesYes: s.scenesYes,
    scenesNo: s.scenesNo,
    gateAt: s.gate.at,
  };
});

writeFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', JSON.stringify(rows, null, 1));

const SAMPLE = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const sel = rows.filter(r => SAMPLE.includes(r.id));

function dist(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const k = String(r[key]);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function table(key, order) {
  const all = dist(rows, key);
  const eight = dist(sel, key);
  const keys = order || [...new Set([...all.keys(), ...eight.keys()])].sort((a, b) => (all.get(b) || 0) - (all.get(a) || 0));
  const lines = [];
  lines.push(`| ${key} | 全库 n=35 | 占比 | 8 案 n=8 | 占比 | 8/全库 覆盖 |`);
  lines.push('|---|---|---|---|---|---|');
  for (const k of keys) {
    const a = all.get(k) || 0, b = eight.get(k) || 0;
    const cov = a ? `${b}/${a}` : '—';
    lines.push(`| ${k} | ${a} | ${(a / 35 * 100).toFixed(1)}% | ${b} | ${(b / 8 * 100).toFixed(1)}% | ${cov} |`);
  }
  return lines.join('\n');
}

console.log('=== band ===\n' + table('band'));
console.log('\n=== ground ===\n' + table('ground'));
console.log('\n=== tone ===\n' + table('tone'));
console.log('\n=== structure ===\n' + table('structure'));
console.log('\n=== threshold ===\n' + table('threshold'));
console.log('\n=== loud ===\n' + table('loud'));
console.log('\n=== load ===\n' + table('load'));
console.log('\n=== minPics ===\n' + table('minPics'));
console.log('\n=== degrades ===\n' + table('degrades'));
console.log('\n=== hard ===\n' + table('hard'));
console.log('\n=== q2new ===\n' + table('q2new'));

console.log('\n=== 数值维度：chroma / promptLen / gateFail / realPictures ===');
function stats(rs, key) {
  const v = rs.map(r => r[key]).filter(x => typeof x === 'number' && x >= 0).sort((a, b) => a - b);
  if (!v.length) return 'n/a';
  const q = p => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return `n=${v.length} min=${v[0]} p25=${q(0.25)} med=${q(0.5)} p75=${q(0.75)} max=${v[v.length - 1]} mean=${mean.toFixed(1)}`;
}
for (const k of ['chroma', 'promptLen', 'gateFail', 'gateWarn', 'realPictures', 'minItems', 'words', 'groundL', 'bandL']) {
  console.log(`${k.padEnd(13)} 全库 ${stats(rows, k)}`);
  console.log(`${''.padEnd(13)} 8案  ${stats(sel, k)}`);
}

console.log('\n=== chroma ≤25 非常安静判据 ===');
const quietAll = rows.filter(r => r.chroma <= 25).map(r => r.id);
const quiet8 = sel.filter(r => r.chroma <= 25).map(r => r.id);
console.log('全库 chroma<=25:', quietAll.length, quietAll.join(' '));
console.log('8案 chroma<=25:', quiet8.length, quiet8.join(' ') || '(none)');
console.log('全库 chroma<=30:', rows.filter(r => r.chroma <= 30).map(r => r.id).join(' '));

console.log('\n=== structure 稀有度（全库出现 <=2 次的标签）===');
const stc = dist(rows, 'structure');
const rare = [...stc.entries()].filter(([, n]) => n <= 2).sort((a, b) => a[1] - b[1]);
for (const [k, n] of rare) {
  const who = rows.filter(r => r.structure === k).map(r => r.id);
  const in8 = who.filter(x => SAMPLE.includes(x));
  console.log(`${k} × ${n}: ${who.join(' ')}  ${in8.length ? '<< 8案含 ' + in8.join(' ') : ''}`);
}
console.log('\nstructure 标签总数 =', stc.size, '｜ 8 案覆盖标签数 =', new Set(sel.map(r => r.structure)).size);
console.log('tone 种类总数 =', dist(rows, 'tone').size, '｜ 8 案覆盖 =', new Set(sel.map(r => r.tone)).size, '=>', [...new Set(sel.map(r => r.tone))].join(' / '));

console.log('\n=== 8 案逐案原文 ===');
for (const r of sel) {
  console.log([r.id, r.cn, r.structure, r.tone, r.band, 'chroma=' + r.chroma, 'minPics=' + r.minPics,
    'len=' + r.promptLen, 'fail=' + r.gateFail, 'pics=' + r.realPictures, 'hard=' + r.hard, 'q2new=' + r.q2new].join(' | '));
}

console.log('\n=== 全库 gate.fail>0 ===');
console.log(rows.filter(r => r.gateFail > 0).map(r => `${r.id}(fail=${r.gateFail})`).join(' ') || '(none)');
console.log('\n=== 全库 realPictures===0 / <=2 ===');
console.log('=0:', rows.filter(r => r.realPictures === 0).map(r => r.id).join(' ') || '(none)');
console.log('<=2:', rows.filter(r => r.realPictures <= 2).map(r => `${r.id}(${r.realPictures})`).join(' ') || '(none)');
console.log('\n=== minPics <=1 ===');
console.log(rows.filter(r => r.minPics <= 1).map(r => `${r.id}(${r.minPics})`).join(' '));
