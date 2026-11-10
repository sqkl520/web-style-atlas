// 复刻 lint.mjs 的 hairline / outlined-box 逐行判定，解释它们的计数与静态计数为何不同。
import { readFileSync } from 'node:fs';

const HAIRLINE = /<hr\b|\bdivide-[xy](-\d|\b)|\b(h|w)-px\b|border-(top|bottom|left|right)\s*:\s*(0?\.5|1)px|\bborder-[tblrxy](?![-\w])|\bborder-[tblrxy]-(?!0\b|none)\[?1?(px)?\]?(?=["'\s`])|height\s*:\s*1px/;
const OUTLINED = /border\s*:\s*1px\s+solid|\bborder\b(?=[^"'`]*\brounded)/;
const FORMISH_SEL = /(^|[\s,>+~(])(table|thead|tbody|tfoot|tr|td|th|input|textarea|select|fieldset)\b/i;

const f = 'prototypes/_selection/style.css';
const lines = readFileSync(f, 'utf8').split(/\r?\n/);
let selector = '', pending = '';
const rows = [];
lines.forEach((line, i) => {
  if (line.includes('{')) { selector = pending + line.slice(0, line.indexOf('{')); pending = ''; }
  else if (!line.includes('}')) pending = (pending + ' ' + line).slice(-300);
  const inUi = /data-ui/.test(selector) || /data-ui/.test(line);
  if (line.includes('}') && !line.includes('{')) { selector = ''; pending = ''; }
  if (line.length > 2000) return;
  if (/taste-skill-ignore/.test(line)) return;
  const h = HAIRLINE.test(line);
  const o = OUTLINED.test(line);
  if (!h && !o) return;
  const exempt = FORMISH_SEL.test(selector);
  rows.push({ line: i + 1, h, o, exempt, inUi, sel: selector.trim().slice(0, 60), text: line.trim().slice(0, 62) });
});

const hs = rows.filter((r) => r.h && !r.exempt && !r.inUi);
const os = rows.filter((r) => r.o && !r.exempt && !r.inUi);
console.log(`hairline 命中（未被豁免）: ${hs.length}`);
for (const r of hs) console.log(`  L${r.line}  [${r.sel}]  ${r.text}`);
console.log(`\noutlined-box 命中（未被豁免）: ${os.length}`);
for (const r of os) console.log(`  L${r.line}  [${r.sel}]  ${r.text}`);

console.log('\n被 formish 选择器豁免掉的（含 input/select/textarea/table…）：');
for (const r of rows.filter((r) => r.exempt)) console.log(`  L${r.line}  hairline=${r.h} outlined=${r.o}  [${r.sel}]`);

// 静态计数：全包 1px solid
const stripped = lines.map((l) => l.replace(/\/\*[\s\S]*?\*\//g, ' '));
const solid = stripped.filter((l) => /border\s*:\s*1px\s+solid/.test(l)).length;
const dashed = stripped.filter((l) => /border\s*:\s*1px\s+(dashed|dotted)/.test(l)).length;
console.log(`\n静态：border: 1px solid = ${solid} 处；border: 1px dashed/dotted = ${dashed} 处`);
