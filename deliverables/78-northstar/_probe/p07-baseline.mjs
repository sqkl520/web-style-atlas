// 探针 07：规划 8 案 vs 随机 8 案基线（蒙特卡洛），证明"分层"是否买到任何东西
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const SAMPLE = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];

const distinct = (rs, k) => new Set(rs.map(r => String(r[k]))).size;
const count = (rs, pred) => rs.filter(pred).length;

const METRICS = [
  ['tone 种类', rs => distinct(rs, 'tone'), 7],
  ['structure 种类', rs => distinct(rs, 'structure'), 23],
  ['band 种类', rs => distinct(rs, 'band'), 8],
  ['ground 种类', rs => distinct(rs, 'ground'), 3],
  ['loud 种类', rs => distinct(rs, 'loud'), 3],
  ['load 种类', rs => distinct(rs, 'load'), 3],
  ['threshold 种类', rs => distinct(rs, 'threshold'), 3],
  ['minPics 档数', rs => distinct(rs, 'minPics'), 9],
  ['degrades 两种都有', rs => distinct(rs, 'degrades'), 2],
  ['含 quiet(chroma<=25)', rs => count(rs, r => r.chroma <= 25)],
  ['含 hard', rs => count(rs, r => r.hard)],
  ['含 gateFail>0', rs => count(rs, r => r.gateFail > 0)],
  ['含 realPictures<=2', rs => count(rs, r => r.realPictures <= 2)],
  ['含 minPics<=1', rs => count(rs, r => r.minPics <= 1)],
  ['含 Q2 新案', rs => count(rs, r => r.q2new)],
];

const sel = SAMPLE.map(id => byId[id]);

const N = 20000;
const sims = [];
for (let t = 0; t < N; t++) {
  const idx = new Set();
  while (idx.size < 8) idx.add(Math.floor(Math.random() * 35));
  sims.push([...idx].map(i => rows[i]));
}

console.log('=== 规划 8 案在各指标上的百分位（相对 20000 次随机抽 8 案）===');
console.log('指标 | 规划8案 | 随机均值 | 随机 p5 | 随机 p95 | 规划的分位');
console.log('---|---|---|---|---|---');
for (const [name, fn] of METRICS) {
  const mine = fn(sel);
  const vals = sims.map(fn).sort((a, b) => a - b);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const p5 = vals[Math.floor(0.05 * N)], p95 = vals[Math.floor(0.95 * N)];
  const pct = vals.filter(v => v < mine).length / N * 100;
  const pctLE = vals.filter(v => v <= mine).length / N * 100;
  console.log(`${name} | ${mine} | ${mean.toFixed(2)} | ${p5} | ${p95} | ${pct.toFixed(1)}% 以下（≤ 为 ${pctLE.toFixed(1)}%）`);
}

// 联合事件：随机 8 案里"一个 quiet 都没有"、"一个 hard 都没有"的概率
const pNoQuiet = sims.filter(rs => count(rs, r => r.chroma <= 25) === 0).length / N;
const pNoHard = sims.filter(rs => count(rs, r => r.hard) === 0).length / N;
const pNoFail = sims.filter(rs => count(rs, r => r.gateFail > 0) === 0).length / N;
const pNoNew = sims.filter(rs => count(rs, r => r.q2new) === 0).length / N;
const pAll4 = sims.filter(rs => count(rs, r => r.chroma <= 25) === 0 && count(rs, r => r.hard) === 0
  && count(rs, r => r.gateFail > 0) === 0 && count(rs, r => r.q2new) === 0).length / N;
console.log('\n=== 联合事件（随机 8 案恰好也全避开）===');
console.log('quiet 全避开 :', (pNoQuiet * 100).toFixed(2) + '%');
console.log('hard 全避开  :', (pNoHard * 100).toFixed(2) + '%');
console.log('fail>0 全避开:', (pNoFail * 100).toFixed(2) + '%');
console.log('Q2 新案全避开:', (pNoNew * 100).toFixed(2) + '%');
console.log('四项同时避开 :', (pAll4 * 100).toFixed(2) + '%');

// 这四类是同一批案子吗？
const quiet = new Set(rows.filter(r => r.chroma <= 25).map(r => r.id));
const fail = new Set(rows.filter(r => r.gateFail > 0).map(r => r.id));
const pics = new Set(rows.filter(r => r.realPictures <= 2).map(r => r.id));
const q2 = new Set(rows.filter(r => r.q2new).map(r => r.id));
const hard = new Set(rows.filter(r => r.hard).map(r => r.id));
console.log('\n=== 四个"困难"集合的重叠 ===');
console.log('quiet  =', [...quiet].join(' '));
console.log('fail>0 =', [...fail].join(' '));
console.log('pics<=2=', [...pics].join(' '));
console.log('Q2新案 =', [...q2].join(' '));
console.log('hard   =', [...hard].join(' '));
console.log('quiet ∩ fail>0 =', [...quiet].filter(x => fail.has(x)).join(' ') || '(empty)');
console.log('union(quiet,fail,pics,q2,hard) =', [...new Set([...quiet, ...fail, ...pics, ...q2, ...hard])].sort().join(' '));
