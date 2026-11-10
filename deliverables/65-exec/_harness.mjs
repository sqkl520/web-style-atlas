/* 在 Node 里跑 prompt-copy.js 的最小宿主。
 *
 * 为什么要它：prompt-copy.js 是 IIFE，只认 window/document 两个全局。
 * 想「30 案 × 未填/已填」逐案导出提示词，用浏览器跑 60 次太慢且不可 diff，
 * 所以这里给一个空壳 window/document，把 data.js + prompts.js + prompt-copy.js
 * 按 index.html 的顺序 eval 进去（顺序必须一致：data.js 提供 SCHEMES，prompts.js 提供 STYLE_PROMPTS，
 * 而 buildPrompt 里查 tone 读的是 window.SCHEMES）。
 *
 * 第二个参数 file 用来加载**改动前**的副本（deliverables/65-exec/_orig/prompt-copy.js，
 * 由 `git show HEAD:prototypes/_selection/prompt-copy.js` 取出）。
 * 对照组必须来自 git，不能来自我自己的记忆 —— 「现状 1617–1905」是别人实测的数字，
 * 我只能用同一份代码在同一个进程里重算，才有资格拿它当基准。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SEL = join(ROOT, 'prototypes/_selection');

export function loadPromptCopy(file) {
  const win = {};
  win.window = win;
  const noop = () => {};
  const el = () => ({
    style: { cssText: '' }, setAttribute: noop, getAttribute: () => null,
    appendChild: noop, insertBefore: noop, addEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [], classList: { add: noop, remove: noop, toggle: noop },
    textContent: '', innerHTML: '', remove: noop, parentNode: { appendChild: noop },
  });
  const doc = {
    readyState: 'loading',          // 走 addEventListener 分支，不触发 mountSceneChips
    addEventListener: noop, removeEventListener: noop,
    createElement: el, getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [],
    body: { appendChild: noop, removeChild: noop },
  };
  const ctx = vm.createContext({ window: win, document: doc, console, navigator: {}, setTimeout, clearTimeout });

  for (const f of ['data.js', 'prompts.js']) {
    vm.runInContext(readFileSync(join(SEL, f), 'utf8'), ctx, { filename: f });
  }
  const target = file ? join(ROOT, file) : join(SEL, 'prompt-copy.js');
  vm.runInContext(readFileSync(target, 'utf8'), ctx, { filename: target });
  return {
    build: win.buildStylePrompt,
    schemes: win.STYLE_PROMPTS.schemes.map((s) => s.id),
  };
}
