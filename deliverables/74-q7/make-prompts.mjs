#!/usr/bin/env node
/* 生成 Q7 复刻验货用的三份提示词（S03 / S07 / S17）
 *
 * 为什么是这三案：它们是唯一有「机制句与实现不符」硬错史的三案，
 * 也是 A/B 分类里代表三种不同 JS 依赖程度的案子：
 *   S03 刻度轴（B，CSS 可近似）
 *   S07 逐行量几何的镜像文本（A，纯 CSS 做不到）
 *   S17 业务状态机（C，纯 CSS 够）
 *
 * 用法：node deliverables/74-q7/make-prompts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const SEL = join(ROOT, 'prototypes/_selection');

/* 与 check-prompts.mjs 的 loadBuildPrompt 同源 —— 复用它的 DOM stub 思路，
 * 否则 prompt-copy.js 末尾的 mountSceneChips 会抛。 */
function loadBuildPrompt() {
  const dataSrc = readFileSync(join(SEL, 'data.js'), 'utf8');
  const promptsSrc = readFileSync(join(SEL, 'prompts.js'), 'utf8');
  const copySrc = readFileSync(join(SEL, 'prompt-copy.js'), 'utf8');
  const w = { console: { warn() {}, log() {} } };
  w.window = w;
  new Function('window', dataSrc)(w);
  new Function('window', promptsSrc)(w);
  const stubEl = () => ({
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, appendChild() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], innerHTML: '', textContent: '',
    insertBefore() {}, removeChild() {}, remove() {}, focus() {}, cloneNode() { return stubEl(); },
  });
  w.document = {
    createElement: stubEl, querySelector: () => null, querySelectorAll: () => [],
    body: stubEl(), addEventListener() {}, documentElement: stubEl(),
    getElementById: () => null, readyState: 'complete',
  };
  w.navigator = { clipboard: { writeText: async () => {} } };
  w.setTimeout = () => 0; w.clearTimeout = () => {};
  new Function('window', 'document', 'navigator', 'setTimeout', 'clearTimeout', copySrc)(
    w, w.document, w.navigator, w.setTimeout, w.clearTimeout);
  return w.buildStylePrompt;
}

const build = loadBuildPrompt();
if (!build) { console.error('取不到 buildStylePrompt'); process.exit(1); }

/* 用户场景固定成「一家只做手冲的咖啡店」—— 与 README 里那份示例一致，
 * 这样三份提示词只差 DNA，便于横向比较「提示词能否把风格带过去」。 */
const BIZ = '一家只做手冲的咖啡店，5 个产区的豆子，加微信订、不做在线支付';
const ACTION = '看完豆单就想问价';

for (const id of ['S03', 'S07', 'S17']) {
  const text = build(id, { biz: BIZ, action: ACTION });
  const out = join(ROOT, 'deliverables/74-q7', `prompt-${id}.txt`);
  writeFileSync(out, text, 'utf8');
  console.log(`${id}: ${text.length} 字 → ${out}`);
}
