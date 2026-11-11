// 探针 14（最终复算）：一次性产出报告需要的全部数字，可重复运行、无随机
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
const promptBy = Object.fromEntries(P.schemes.map(e => [e.id, e]));
const Q2_NEW = new Set(['S31', 'S32', 'S33', 'S34', 'S35']); // git --diff-filter=A @ 2026-11-10

const rows = S.map(s => {
  const p = promptBy[s.id] || {};
  return {
    id: s.id, cn: s.cn, structure: s.structure, threshold: s.threshold, tone: s.tone,
    band: s.axes.band, ground: s.axes.ground, chroma: s.axes.chroma,
    loud: s.axes.loud, load: s.axes.load, words: s.axes.words,
    gateFail: s.gate.fail, gateWarn: s.gate.warn, realPictures: s.gate.realPictures,
    minPics: p.minPics, minItems: p.minItems,
    degrades: p.capacity ? p.capacity.degrades : null,
    hard: hardIds.has(s.id), promptLen: ctx.buildStylePrompt(s.id).length,
    q2new: Q2_NEW.has(s.id),
  };
});
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const PLANNER = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];

const table = (key, keys) => {
  const a = {}, b = {};
  for (const r of rows) a[String(r[key])] = (a[String(r[key])] || 0) + 1;
  for (const id of PLANNER) b[String(byId[id][key])] = (b[String(byId[id][key])] || 0) + 1;
  const all = keys || [...new Set([...Object.keys(a), ...Object.keys(b)])].sort((x, y) => (a[y] || 0) - (a[x] || 0));
  return all.map(k => ({ k, all: a[k] || 0, eight: b[k] || 0 }));
};

console.log('##### 底色带 #####');
console.log(table('band').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### 调性 #####');
console.log(table('tone').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### 结构标签（23 个）#####');
console.log(table('structure').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### ground #####');
console.log(table('ground').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### loud #####');
console.log(table('loud').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### load #####');
console.log(table('load').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### threshold #####');
console.log(table('threshold').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### minPics #####');
console.log(table('minPics', ['1', '3', '4', '5', '6', '7', '8', '9', '10']).map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### degrades #####');
console.log(table('degrades').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### hard #####');
console.log(table('hard').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));
console.log('\n##### Q2 新建 #####');
console.log(table('q2new').map(x => `${x.k}\t${x.all}\t${x.eight}`).join('\n'));

console.log('\n##### 关键计数 #####');
const q = (f) => rows.filter(f).map(r => r.id);
console.log('chroma<=25 全库:', q(r => r.chroma <= 25).length, q(r => r.chroma <= 25).join(' '));
console.log('chroma<=25 8案:', PLANNER.filter(id => byId[id].chroma <= 25).length, '(0 = 全漏)');
console.log('chroma<=30 全库:', q(r => r.chroma <= 30).length);
console.log('minPics<=1 全库:', q(r => r.minPics <= 1).length, q(r => r.minPics <= 1).join(' '));
console.log('minPics<=1 8案 :', PLANNER.filter(id => byId[id].minPics <= 1).length);
console.log('hard 全库:', q(r => r.hard).join(' '), '| 8案:', PLANNER.filter(id => byId[id].hard).length);
console.log('gate.fail>0 全库:', q(r => r.gateFail > 0).join(' '), '| 8案:', PLANNER.filter(id => byId[id].gateFail > 0).length);
console.log('realPictures<=2 全库:', q(r => r.realPictures <= 2).join(' '), '| 8案:', PLANNER.filter(id => byId[id].realPictures <= 2).length);
console.log('Q2 新建:', q(r => r.q2new).join(' '), '| 8案:', PLANNER.filter(id => byId[id].q2new).length);
console.log('promptLen 全库: min', Math.min(...rows.map(r => r.promptLen)), 'max', Math.max(...rows.map(r => r.promptLen)));
console.log('promptLen 8案 : min', Math.min(...PLANNER.map(id => byId[id].promptLen)), 'max', Math.max(...PLANNER.map(id => byId[id].promptLen)));
console.log('structure 标签数:', new Set(rows.map(r => r.structure)).size);
console.log('8 案覆盖 structure 数:', new Set(PLANNER.map(id => byId[id].structure)).size);
console.log('8 案覆盖 tone 数:', new Set(PLANNER.map(id => byId[id].tone)).size, '/ 7');
console.log('8 案结构标签重复:', new Set(PLANNER.map(id => byId[id].structure)).size !== 8 ? '有重复' : '零重复');

console.log('\n##### 我的规则（加权集合覆盖）#####');
console.log('8 案: S01 S08 S09 S12 S15 S24 S31 S34');
console.log('3 案: S15 S24 S31');
