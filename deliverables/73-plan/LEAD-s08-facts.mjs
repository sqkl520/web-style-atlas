/* S08 是 30 案里唯一 FAIL 的案。两条 FAIL：
 *   1) palette-terracotta  按钮色 #c46a1f 不在调色板里
 *   2) font-count          4 个字族，上限 2
 * 先把事实查清：这两条是真缺陷，还是规则的误判？
 */
import { readFileSync, existsSync } from 'node:fs';

const P = new URL('../../prototypes/S08-amber-overprint-lightbox/', import.meta.url);
const css = readFileSync(new URL('style.css', P), 'utf8');
const html = readFileSync(new URL('index.html', P), 'utf8');

console.log('═══ 1) #C46A1F 的用法 ═══');
for (const [name, text] of [['style.css', css], ['index.html', html]]) {
  for (const line of text.split('\n')) {
    if (!/#C46A1F/i.test(line)) continue;
    console.log(`  ${name}: ${line.trim().slice(0, 130)}`);
  }
}

console.log('\n═══ 2) :root 声明的调色板 ═══');
const root = (css.match(/:root\s*\{([\s\S]*?)\}/) || ['', ''])[1];
for (const line of root.split('\n')) {
  if (/--[\w-]+\s*:/.test(line)) console.log('  ' + line.trim().slice(0, 120));
}

console.log('\n═══ 3) font-family 实际用了几族 ═══');
const fams = new Map();
for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
  for (const f of m[1].split(',')) {
    const n = f.trim().replace(/^["']|["']$/g, '');
    if (!n || /^(serif|sans-serif|monospace|system-ui|inherit|var)/i.test(n)) continue;
    fams.set(n, (fams.get(n) || 0) + 1);
  }
}
for (const [k, v] of [...fams.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(24)} ${v} 次`);

console.log('\n═══ 4) @font-face / link 引入的字体 ═══');
for (const m of html.matchAll(/href="([^"]*_fonts[^"]*)"/g)) console.log('  ' + m[1]);

console.log('\n═══ 5) 规格字段 3 声明的调色板 ═══');
const spec = readFileSync(new URL('../_specs/S08.md', new URL('./', P)), 'utf8');
const i = spec.indexOf('配色系统');
console.log('  ' + spec.slice(i, i + 460).replace(/\n/g, '\n  '));

console.log('\n═══ 6) 规格字段 4 声明的字体 ═══');
const j = spec.indexOf('字体策略');
console.log('  ' + spec.slice(j, j + 420).replace(/\n/g, '\n  '));
