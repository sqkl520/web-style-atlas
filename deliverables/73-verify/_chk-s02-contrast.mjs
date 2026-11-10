/* S02 的 lowContrast = 0 是否可信？
 * 若 body 挂了纹理，bgBehind() 会在 body 就 return null，所有文字被 continue 跳过。
 * 用独立方法算：从 :root 取色，手工算 S02 主要文字对主要底色的对比度。
 */
import { readFileSync } from 'node:fs';

const css = readFileSync('D:/Web/style/prototypes/S02-gilded-symmetry-salon/style.css', 'utf8');
const root = (css.match(/:root\s*\{([\s\S]*?)\}/) || ['', ''])[1];
console.log('=== S02 :root 色 ===');
const vars = new Map();
for (const line of root.split('\n')) {
  const m = line.match(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/);
  if (m) { vars.set(m[1], m[2].toUpperCase()); console.log(`  ${m[1].padEnd(12)} ${m[2]}`); }
}

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const ratio = (a, b) => {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

console.log('\n=== 手工对比度（fg on bg）===');
const bg = vars.get('--card');
const pairs = [
  ['--ivory', '正文色 on 卡纸'],
  ['--ivory-2', '次级色 on 卡纸'],
  ['--gold', '金色 on 卡纸'],
  ['--dirty', '脏色 on 卡纸'],
  ['--band', '暗金带 on 卡纸'],
];
for (const [k, label] of pairs) {
  const fg = vars.get(k);
  if (!fg || !bg) continue;
  const r = ratio(fg, bg);
  const pass = r >= 4.5 ? 'AA' : r >= 3 ? '仅大字' : '**不达标**';
  console.log(`  ${k.padEnd(12)} ${fg} on ${bg} = ${r.toFixed(2)}:1  ${pass}  (${label})`);
}

console.log('\n=== 结论 ===');
console.log('  若上面有 <4.5 的正文色，而 report.json 的 lowContrast 是 0，');
console.log('  说明 bgBehind() 确实被 body 的纹理短路了 —— contrast 闸门对该案失明。');
