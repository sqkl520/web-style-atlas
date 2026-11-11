/* 取产品实际输出的提示词（buildStylePrompt），用于盲测。
 * 这是修盲测提示词不等价的正确做法：不自己拼，直接调产品函数。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const stubEl = () => ({
  style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, appendChild() {}, addEventListener() {},
  querySelector: () => null, querySelectorAll: () => [], innerHTML: '', textContent: '',
  insertBefore() {}, removeChild() {}, remove() {}, focus() {},
  cloneNode() { return stubEl(); },
});

const w = {};
w.window = w;
w.document = {
  readyState: 'complete',
  createElement: stubEl, querySelector: () => null, querySelectorAll: () => [],
  body: stubEl(), documentElement: stubEl(), addEventListener() {},
};
w.navigator = { clipboard: { writeText: async () => {} } };
w.setTimeout = () => {}; w.clearTimeout = () => {};
w.console = console;

const ctx = vm.createContext(w);
/* 加载顺序必须与 index.html 一致：data.js → prompts.js → prompt-copy.js。
 * 顺序错了 buildPrompt 里读 window.SCHEMES 会拿到 undefined（prompt-copy.js:497 附近依赖它取 tone）。 */
for (const f of ['prototypes/_selection/data.js',
  'prototypes/_selection/prompts.js',
  'prototypes/_selection/prompt-copy.js']) {
  try {
    vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  } catch (e) {
    console.error(`加载 ${f} 失败: ${e.message}`);
  }
}

if (typeof w.buildStylePrompt !== 'function') {
  console.error('window.buildStylePrompt 不存在 —— 加载顺序或 DOM stub 有问题');
  process.exit(1);
}

const ids = process.argv.slice(2).filter((a) => /^S\d{2}$/.test(a));
const targets = ids.length ? ids : ['S31'];
for (const id of targets) {
  /* 不传 opts —— 让提示词用 DNA 里的默认值，避免引入用户画像那段（盲测不需要「我经营一家…」）。 */
  let t = '';
  try { t = w.buildStylePrompt(id) || ''; } catch (e) { console.error(`${id} 抛错: ${e.message}`); continue; }
  if (!t) { console.error(`${id}: 空提示词`); continue; }
  const out = join(ROOT, 'deliverables/78-northstar/blind', id, 'task-product.txt');
  writeFileSync(out, t);
  console.log(`${id}: ${t.split('\n').length} 行 / ${Buffer.byteLength(t)} 字节 → ${out}`);
}
