// 统一行号口径：lint.mjs 用 split(/\r?\n/)，本脚本与之对齐，并统计孤立 \r（read 工具会把它们也当换行）。
import { readFileSync } from 'node:fs';

const files = ['prototypes/_selection/style.css', 'prototypes/_selection/wizard.css', 'prototypes/_selection/index.html'];
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  const lf = raw.split(/\r?\n/);
  const cr = raw.split(/\r/).length;
  const loneCr = (raw.match(/(?<!\r)\r(?!\n)/g) || []).length;
  console.log(`${f}: LF-lines=${lf.length} CR-split-lines=${cr} loneCR=${loneCr} bytes=${Buffer.byteLength(raw)}`);
}

const css = readFileSync('prototypes/_selection/style.css', 'utf8').split(/\r?\n/);
const pats = [
  /border-(top|bottom|left|right)\s*:\s*(0?\.5|1)px/,
  /border\s*:\s*(0?\.5|1)px\s+solid/,
  /position\s*:\s*(sticky|fixed)/,
  /hairline|1px/,
];
console.log('\n--- 1px / sticky 逐行（LF 口径）---');
css.forEach((l, i) => {
  if (pats[0].test(l) || pats[1].test(l) || pats[2].test(l)) {
    let sel = '';
    for (let j = i; j >= 0 && j > i - 8; j--) {
      if (/\{/.test(css[j])) { sel = css[j].slice(0, css[j].indexOf('{')).trim(); break; }
    }
    console.log(`${i + 1}\t${sel}\t${l.trim().slice(0, 90)}`);
  }
});
