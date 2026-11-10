// 69-plan 共用装载器：在 vm 里装 data.js + prompts.js + prompt-copy.js，
// 拿到 window.SCHEMES / window.STYLE_PROMPTS / window.buildStylePrompt。
// 只读仓库，不写 prototypes/。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join } from 'node:path';

export const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname)
  .replace(/^\/([A-Za-z]:)/, '$1');

const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/^\uFEFF/, '');

export function loadCtx() {
  const doc = {
    readyState: 'complete',
    addEventListener() {}, removeEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() {
      return {
        style: { cssText: '', setProperty() {} }, dataset: {},
        setAttribute() {}, getAttribute() { return null; },
        appendChild() {}, addEventListener() {}, remove() {},
        classList: { toggle() {}, add() {}, remove() {} },
        focus() {}, select() {}, setSelectionRange() {},
      };
    },
    body: { appendChild() {}, removeChild() {} },
  };
  const sandbox = { console, document: doc, navigator: {}, setTimeout, clearTimeout, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(read('prototypes/_selection/data.js'), ctx, { filename: 'data.js' });
  vm.runInContext(read('prototypes/_selection/prompts.js'), ctx, { filename: 'prompts.js' });
  vm.runInContext(read('prototypes/_selection/prompt-copy.js'), ctx, { filename: 'prompt-copy.js' });
  return sandbox;
}

export const out = (...a) => console.log(...a);
