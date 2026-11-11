// 探针 19：五个风险组全避开的联合概率（精确，非蒙特卡洛）+ 报告用表
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const N = 35, n = 8;
const C = (a, b) => { if (b < 0 || b > a) return 0; let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };

// 五个风险组
const RISK = {
  quiet: r => r.chroma <= 25,
  hard: r => r.hard,
  gateFail: r => r.gateFail > 0,
  fewpics: r => r.minPics <= 1,
  q2new: r => r.q2new,
};
const riskUnion = new Set(rows.filter(r => Object.values(RISK).some(f => f(r))).map(r => r.id));
console.log('五个风险组的并集 =', riskUnion.size, '案:', [...riskUnion].sort().join(' '));
console.log('"=> 35 - 11 = 24 案属于"无任何风险标记"的普通案"');
const safe = rows.filter(r => !riskUnion.has(r.id)).length;
console.log(`随机抽 8 案全部落在 ${safe} 个普通案里的概率 = C(${safe},8)/C(35,8) = ${(C(safe, 8) / C(35, 8) * 100).toFixed(4)}%`);

console.log('\n### 8 案提示词长度 ###');
const S8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
for (const id of S8) { const r = rows.find(x => x.id === id); console.log(`${id}\t${r.promptLen}\t${r.cn}`); }
const lens = rows.map(r => r.promptLen).sort((a, b) => a - b);
console.log('全库长度: min', lens[0], 'median', lens[17], 'max', lens[34]);
console.log('8 案长度: min', Math.min(...S8.map(id => rows.find(r => r.id === id).promptLen)),
  'max', Math.max(...S8.map(id => rows.find(r => r.id === id).promptLen)));

console.log('\n### minItems 分布 ###');
const mi = {};
for (const r of rows) { const k = r.minItems <= 8 ? '3-8' : r.minItems <= 15 ? '9-15' : r.minItems <= 25 ? '16-25' : '26+'; mi[k] = (mi[k] || 0) + 1; }
console.log(mi);
const mi8 = {};
for (const id of S8) { const v = rows.find(r => r.id === id).minItems; const k = v <= 8 ? '3-8' : v <= 15 ? '9-15' : v <= 25 ? '16-25' : '26+'; mi8[k] = (mi8[k] || 0) + 1; }
console.log('8 案:', mi8);

console.log('\n### band × 8案 精确超几何：冷暗带被过采样 ###');
const K = rows.filter(r => r.band === '冷暗带').length;
let pge = 0; for (let i = 3; i <= K; i++) pge += C(K, i) * C(N - K, n - i) / C(N, n);
console.log(`冷暗带 K=${K}，8 案中 3 个；P(X>=3) = ${(pge * 100).toFixed(2)}%（未达 5% 显著，但方向明确：占 8 案 37.5% vs 全库 14.3%，2.6×）`);
