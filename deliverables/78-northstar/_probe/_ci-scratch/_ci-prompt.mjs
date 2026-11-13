/* 生成 S04/S13/S29 的**实际提示词**（不传 biz/action，即用户在控制台什么都不填时拿到的原文），
 * 并从提示词里机械统计"涉及文案内容"的句子。只读，不改仓库。
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const load = (rel, key) => {
  const c = { window: {} };
  vm.createContext(c);
  vm.runInContext(readFileSync(resolve(ROOT, rel), 'utf8'), c);
  return c.window[key];
};
const P = load('prototypes/_selection/prompts.js', 'STYLE_PROMPTS');
const S = load('prototypes/_selection/data.js', 'SCHEMES');
const src = readFileSync(resolve(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8');
// 把 IIFE 里注册到 window 的函数拿出来
const ctx = { window: { STYLE_PROMPTS: P, SCHEMES: S }, document: undefined };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const buildPrompt = ctx.window.buildStylePrompt;

const ids = ['S04', 'S13', 'S29'];
const out = {};
for (const id of ids) {
  const p = buildPrompt(id);           // 界面默认：两个输入框都空 → 留 ＿ 槽
  const pFilled = buildPrompt(id, { biz: '测试店', action: '测试动作' });
  out[id] = { len: p.length, prompt: p, lenFilled: pFilled.length };
}
console.log(JSON.stringify(out, null, 1));
