// 分析 2：模板层对 73 个词的覆盖 + 每个方案 scenesYes 能覆盖几个词（算「新增 1 案能救几个词」的地基）。
import fs from 'node:fs';

const srcD = fs.readFileSync('prototypes/_selection/data.js', 'utf8');
const srcP = fs.readFileSync('prototypes/_selection/prompts.js', 'utf8');
global.window = {};
new Function('window', srcD)(global.window);
const S = global.window.SCHEMES;
global.window = {};
new Function('window', srcP)(global.window);
const P = global.window.STYLE_PROMPTS;

const terms44 = Object.keys(P.sceneIndex);
const terms29 = P.unsupported;
const all = [...terms44, ...terms29];

// ── A. 每个案子的 scenesYes 覆盖了几个「词表里的词」
console.log('=== 每个案 scenesYes 里出现的词表词数 ===');
const cov = S.map(s => {
  const yes = String(s.scenesYes || '');
  const hit = all.filter(t => yes.includes(t));
  return { id: s.id, n: hit.length, terms: hit };
}).sort((a, b) => b.n - a.n);
for (const c of cov) console.log(`${c.id}\t${c.n}\t${c.terms.join(',')}`);
console.log('合计覆盖（并集）:', new Set(cov.flatMap(c => c.terms)).size, '/', all.length);
console.log('单案最多覆盖:', cov[0].n, '词；中位:', cov[Math.floor(cov.length/2)].n);

// ── B. 44 索引词的 direct 集合 vs data.js scenesYes 是否一致
console.log('\n=== sceneIndex 的 direct 是否能在 data.js 的 scenesYes 里找到该词 ===');
let mismatch = [];
for (const t of terms44) {
  const v = P.sceneIndex[t];
  for (const id of (v.direct || [])) {
    const s = S.find(x => x.id === id);
    if (!s) { mismatch.push(`${t} → ${id} 不存在`); continue; }
    if (!String(s.scenesYes || '').includes(t)) mismatch.push(`${t} → ${id} 的 scenesYes 不含「${t}」`);
  }
}
console.log(mismatch.length ? mismatch.join('\n') : '（全部一致）');
console.log('mismatch 数:', mismatch.length);

// ── C. 模板层覆盖：把 prompt-copy.js 的 TEMPLATES/TPL_ALIAS/TPL_ADJACENT 抄成纯数据重算
const TPL = [
  { id: 'M01', scenes: ['律所','咨询','软件服务','设计工作室','代理商'] },
  { id: 'M02', scenes: ['餐厅','咖啡馆','烘焙','民宿','理发店','花店'] },
  { id: 'M03', scenes: ['个人作品集','自由职业者','小型创意工作室','摄影师','设计师','写作者'] },
];
const ALIAS = { 咖啡店: '咖啡馆', 律师: '律所' };
const ADJ = { 甜品: 'M02', 修鞋理发: 'M02', 美甲: 'M02', 作品集: 'M03', 摄影: 'M03', 设计工作室: 'M03' };

const tplRows = all.map(t => {
  const key = ALIAS[t] || t;
  const exact = TPL.filter(x => x.scenes.includes(key)).map(x => x.id);
  const adj = ADJ[t] ? [ADJ[t]] : [];
  return { term: t, exact, adj, any: [...exact, ...adj] };
});
console.log('\n=== 模板层覆盖（exact / adjacent）===');
for (const r of tplRows) if (r.any.length) console.log(`${r.term}\texact=[${r.exact}]\tadj=[${r.adj}]`);
console.log('模板层至少有一个出口的词:', tplRows.filter(r => r.any.length).length, '/', all.length);
console.log('其中 exact:', tplRows.filter(r => r.exact.length).length);
console.log('零出口:', tplRows.filter(r => !r.any.length).map(r => r.term).join(' '));

// ── D. 45 个搜索零命中词里，模板层能接住几个
const probe44 = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/69-audit/probe-44-raw.json','utf8'));
const probe29 = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/69-audit/probe-29-raw.json','utf8'));
const zero = [...probe44, ...probe29].filter(r => r.rows === 0).map(r => r.term);
console.log('\n=== 45 个零命中词中模板层的接住情况 ===');
const zr = tplRows.filter(r => zero.includes(r.term));
console.log('零命中词总数:', zero.length);
console.log('有 exact 模板:', zr.filter(r=>r.exact.length).map(r=>r.term+'→'+r.exact).join(' | '));
console.log('只有 adjacent:', zr.filter(r=>!r.exact.length && r.adj.length).map(r=>r.term+'→'+r.adj).join(' | '));
console.log('完全没出口:', zr.filter(r=>!r.any.length).map(r=>r.term).join(' '), '共', zr.filter(r=>!r.any.length).length, '个');

fs.writeFileSync('D:/Web/style/deliverables/69-audit/coverage.json', JSON.stringify({ cov, tplRows, zero }, null, 1));
