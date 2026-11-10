/* 红队只读探针公共库。
 * 硬约束：本文件及同目录 *.mjs 绝不写 prototypes/ 、templates/ 、tools/ 、README* 。
 * 所有断言都从 tracked 产物读出，不重新生成它们（clean-dna 会无条件覆写 dna-clean.json，
 * 所以这里复刻它的 pickPalette 并先证明复刻忠实，见 rt-p1-subset.mjs 的 FIDELITY 段）。 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const P = join(ROOT, 'prototypes');
export const SEL = join(P, '_selection');

const HEX6 = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const HEX6or3 = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

export const hexes6 = (s) =>
  [...new Set([...String(s).matchAll(HEX6)].map((m) => ('#' + m[1]).toUpperCase()))];
export const hexesAny = (s) =>
  [...new Set([...String(s).matchAll(HEX6or3)].map((m) => m[0].toUpperCase()))];

/* 在沙箱里求值 window.XXX = ... 的生成物（data.js / prompts.js 都是这个形状） */
export function evalWindow(file) {
  const src = readFileSync(file, 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win;
}

export const loadData = () => evalWindow(join(SEL, 'data.js')).SCHEMES;
export function loadPrompts() {
  const w = evalWindow(join(SEL, 'prompts.js'));
  return (w.STYLE_PROMPTS && w.STYLE_PROMPTS.schemes) || w.SCHEMES || [];
}
export const loadDnaClean = () =>
  JSON.parse(readFileSync(join(P, '_prompts', 'dna-clean.json'), 'utf8'));
export const loadDnaRaw = () =>
  JSON.parse(readFileSync(join(P, '_prompts', 'dna-raw.json'), 'utf8'));

export const setOf = (a) => [...new Set(a.map((h) => String(h).toUpperCase()))];
export const sub = (a, b) => a.filter((h) => !b.includes(h)); // a 有 b 没有
export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 1;
}

export function line(ch = '─', n = 100) { return ch.repeat(n); }
export function h1(t) { console.log('\n' + '═'.repeat(100) + '\n' + t + '\n' + '═'.repeat(100)); }
export function h2(t) { console.log('\n' + '─'.repeat(100) + '\n' + t + '\n' + '─'.repeat(100)); }
export const ok = (b) => (b ? 'PASS' : 'FAIL');
