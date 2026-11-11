// 探针 13：精确超几何检验 —— 规划 8 案的偏斜是否超出随机波动
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const N = 35, n = 8;
const SAMPLE8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];

const C = (a, b) => { if (b < 0 || b > a) return 0; let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };
// P(X = x) 超几何
const pmf = (K, x) => C(K, x) * C(N - K, n - x) / C(N, n);
const cdfLE = (K, x) => { let s = 0; for (let i = 0; i <= x; i++) s += pmf(K, i); return s; };
const cdfGE = (K, x) => { let s = 0; for (let i = x; i <= Math.min(K, n); i++) s += pmf(K, i); return s; };

function group(pred) { return rows.filter(pred).map(r => r.id); }

const tests = [
  ['冷暗带', group(r => r.band === '冷暗带')],
  ['暖暗带', group(r => r.band === '暖暗带')],
  ['很安静(loud)', group(r => r.loud === '很安静')],
  ['chroma<=25', group(r => r.chroma <= 25)],
  ['hard', group(r => r.hard)],
  ['gate.fail>0', group(r => r.gateFail > 0)],
  ['realPictures<=2', group(r => r.realPictures <= 2)],
  ['minPics<=1', group(r => r.minPics <= 1)],
  ['Q2 新建', group(r => r.q2new)],
  ['调性:混乱活力/街头', group(r => r.tone === '混乱活力 / 街头')],
  ['调性:温暖手作/人味', group(r => r.tone === '温暖手作 / 人味')],
];

console.log('组 | 全库K | 8案中k | 期望 | P(X>=k) | P(X<=k) | 判读');
console.log('---|---|---|---|---|---|---');
for (const [name, members] of tests) {
  const K = members.length;
  const k = members.filter(id => SAMPLE8.includes(id)).length;
  const exp = K * n / N;
  const pGE = cdfGE(K, k), pLE = cdfLE(K, k);
  let verdict = '正常';
  if (k === 0 && pLE < 0.05) verdict = '显著缺失';
  else if (k > 0 && pGE < 0.05) verdict = '显著过采样';
  else if (k === 0 && pLE < 0.15) verdict = '偏缺';
  console.log(`${name} | ${K} | ${k} | ${exp.toFixed(2)} | ${pGE.toFixed(4)} | ${pLE.toFixed(4)} | ${verdict}`);
  // 双尾 p
  const two = Math.min(1, 2 * Math.min(pGE, pLE));
  if (verdict !== '正常') console.log(`   ↳ 双尾 p = ${two.toFixed(4)}${two < 0.05 ? '（<0.05）' : ''}`);
}

// 调性：两组合并 = 10 案零覆盖
const K10 = rows.filter(r => r.tone === '混乱活力 / 街头' || r.tone === '温暖手作 / 人味').length;
const pZero = pmf(K10, 0);
console.log(`\n调性两组合并（混乱活力 + 温暖手作）= ${K10} 案；8 案中 0 案；P(X=0) = ${pZero.toFixed(4)}`);

// 同一结构标签被选两次的情况
const stc = new Map();
for (const id of SAMPLE8) { const s = byId[id].structure; stc.set(s, (stc.get(s) || 0) + 1); }
console.log('\n=== 8 案中结构标签重复情况 ===');
console.log([...stc.entries()].map(([k, v]) => `${k}×${v}`).join('  '));
console.log('重复标签数:', [...stc.values()].filter(v => v > 1).length);

// 全库中只出现 2 次、且 8 案里选了两个（过采样）的标签
const all2 = [...new Set(rows.map(r => r.structure))].filter(s => rows.filter(r => r.structure === s).length === 2);
const over = all2.filter(s => SAMPLE8.filter(id => byId[id].structure === s).length >= 2);
console.log('全库仅 2 次的标签中被 8 案两次选中的:', over.join(' ') || '(无)');
