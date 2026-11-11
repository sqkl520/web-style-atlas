// 探针 18：修正版精确概率（minPics 分组、以及"8 案全落在同一档"的联合概率）
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const N = 35, n = 8;
const C = (a, b) => { if (b < 0 || b > a) return 0; let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };
const P = (K, x) => C(K, x) * C(N - K, n - x) / C(N, n);

const groups = [
  ['minPics<=5（少图一侧）', r => r.minPics <= 5],
  ['minPics>=6', r => r.minPics >= 6],
  ['minPics<=2', r => r.minPics <= 2],
  ['chroma<=25', r => r.chroma <= 25],
  ['chroma<=30', r => r.chroma <= 30],
  ['hard', r => r.hard],
  ['gate.fail>0', r => r.gateFail > 0],
  ['q2new', r => r.q2new],
  ['调性=混乱活力或温暖手作', r => r.tone === '混乱活力 / 街头' || r.tone === '温暖手作 / 人味'],
];
const S8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

console.log('组 | K(全库) | k(8案) | 期望 | P(X=0) | P(X>=k) | 备注');
console.log('---|---|---|---|---|---|---');
for (const [name, f] of groups) {
  const mem = rows.filter(f).map(r => r.id);
  const K = mem.length;
  const k = mem.filter(id => S8.includes(id)).length;
  const p0 = P(K, 0);
  let pge = 0; for (let i = k; i <= Math.min(K, n); i++) pge += P(K, i);
  console.log(`${name} | ${K} | ${k} | ${(K * n / N).toFixed(2)} | ${(p0 * 100).toFixed(2)}% | ${(pge * 100).toFixed(2)}% |`);
}

// "8 案 minPics 全部 >= 6" 就是一个事件：P(X=8) where X 从 25 个 minPics>=6 里抽
console.log('\nminPics>=6 有 25 案；8 案全抽中 = P(X=8|K=25) =', (P(25, 8) * 100).toFixed(4) + '%');
console.log('（这正等于"minPics<=5 的 10 案一个没抽中" = P(X=0|K=10) =', (P(10, 0) * 100).toFixed(3) + '%）');

// 8 案的 chroma 最小值 = 29，即全库最安静的 6 案（12,12,13,14,18,19）全部被避开
const sorted = rows.map(r => r.chroma).sort((a, b) => a - b);
console.log('\n全库 chroma 最小 7 个:', sorted.slice(0, 7).join(','));
console.log('8 案 chroma 最小 =', Math.min(...S8.map(id => byId[id].chroma)), '（排在全库第 7 位）');
console.log('=> 8 案把全库最安静的 6 案 100% 排除，且一个 minPics<=5 的案都没选');
