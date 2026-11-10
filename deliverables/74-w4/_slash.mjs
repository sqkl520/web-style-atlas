// 只读诊断：_mech.mjs 的 token 正则对「斜杠表 / 冒号比例」的截断行为。
import { readFileSync } from 'node:fs';
const sb = { window: {} };
new Function('window', readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;
const RE = /(\d+(?:\.\d+)?)\s*(px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em)/g;
const ANY = /\d+(?:\.\d+)?/g;

for (const s of P.schemes) {
  const m = s.dna.mechanism || '';
  const toks = [...m.matchAll(RE)].map((x) => x[0].replace(/\s+/g, ''));
  const nums = [...m.matchAll(ANY)].map((x) => x[0]);
  const lost = nums.length - [...new Set(toks.map((t) => t.replace(/[^\d.]/g, '')))].length;
  if (lost > 0) {
    console.log(`${s.id}  数字 ${String(nums.length).padStart(2)}  被检查 ${String(new Set(toks.map((t) => t.replace(/[^\d.]/g, ''))).size).padStart(2)}  未检查 ${lost}`);
  }
}

console.log('\n== 斜杠/冒号表示例（_mech 只看得到最后一个）==');
for (const id of ['S05', 'S12', 'S15', 'S16', 'S18', 'S21', 'S24', 'S26', 'S28']) {
  const s = P.schemes.find((x) => x.id === id);
  const m = s.dna.mechanism || '';
  const toks = [...m.matchAll(RE)].map((x) => x[0].replace(/\s+/g, ''));
  const seg = m.match(/[\d.]+(?:\s*[:/]\s*[\d.]+)+/);
  console.log(`${id}  斜杠/冒号串=${seg ? seg[0] : '—'}   token=${toks.join(',')}`);
}
