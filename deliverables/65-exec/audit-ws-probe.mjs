// 检查 audit 原文里的空白形态：决定 UI 用 white-space:pre-line 还是默认。
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');

let multi = 0, nl = 0;
for (const r of B) {
  const t = r.audit || '';
  const m = t.match(/\s{2,}/g) || [];
  const hasNl = /\n/.test(t);
  if (m.length || hasNl) {
    multi++;
    console.log(r.id, '连续空白', m.length, '换行', hasNl, JSON.stringify((t.match(/.{0,8}\s{2,}.{0,8}/g) || []).slice(0, 2)));
  }
}
console.log('含连续空白或换行的案数', multi, '/30（换行', nl, '）');
console.log('首尾有空白的案:', B.filter((r) => /^\s|\s$/.test(r.audit || '')).map((r) => r.id).join(',') || '（无）');
console.log('含全角空格 U+3000 的案:', B.filter((r) => (r.audit || '').includes('\u3000')).map((r) => r.id).join(',') || '（无）');
console.log('含英文引号/ASCII 的案数:', B.filter((r) => /["']/.test(r.audit || '')).length);
