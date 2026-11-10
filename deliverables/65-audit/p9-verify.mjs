// 探针 9：逐文件逐字段精确命中（用与 p7/p8 一致的访问形态正则），并列出 layout 缺失案
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const FILES = ['app.js', 'index.html', 'prompt-copy.js', 'wizard.js', 'wizard.html', 'style.css'];
const src = Object.fromEntries(FILES.map((f) => [f, existsSync(join(SEL, f)) ? readFileSync(join(SEL, f), 'utf8') : '']));
const S = loadSchemes();

const CHECKS = ['layout', 'visuals', 'motion', 'load', 'loud', 'ground', 'band', 'words', 'chroma',
  'copy', 'primary', 'buttonText', 'scenesNo', 'scenesYes', 'def', 'landing', 'quirk'];

for (const k of CHECKS) {
  const row = [];
  for (const f of FILES) {
    const re = new RegExp('(\\.' + k + '\\b|\\[\\s*[\'"]' + k + '[\'"]\\s*\\]|\\b' + k + '\\s*:)', 'g');
    const m = src[f].match(re);
    if (m) row.push(f + '×' + m.length);
  }
  console.log(k + '\t' + (row.join(', ') || '（0 命中）'));
}

console.log('\n--- layout 有值案 (' + S.filter((r) => r.layout).length + ') ---');
console.log(S.filter((r) => r.layout).map((r) => r.id).join(' '));
console.log('--- layout 空案 ---');
console.log(S.filter((r) => !r.layout).map((r) => r.id).join(' '));
console.log('\n--- buttonText null 案 (' + S.filter((r) => !r.buttonText).length + ') ---');
console.log(S.filter((r) => !r.buttonText).map((r) => r.id).join(' '));
