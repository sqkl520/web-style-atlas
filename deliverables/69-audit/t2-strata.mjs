// 任务 2 探针 C：分层维度表 —— 每案 5 个维度，供抽样用。
// 维度（沿用我上一轮 §4.4 的定义）：
//   degrades  —— 提示词里有"降级/折叠/不足 N 个就重排"这一类分岔指令
//   hasVoid   —— 提示词里有"空位/占位/留白承接"这类结构
//   lineClean —— 线宽行是否为真（用本轮 t1-strict 的口径）
//   mDensity  —— M 类约束条数（约束里最硬的一类）
//   tone      —— 风格气质（来自 prompts.js 的 SCHEMES）
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const R = 'D:/Web/style';
const dump = JSON.parse(readFileSync(OUT + '/dump30.json', 'utf8'));
const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const strict = JSON.parse(readFileSync(OUT + '/t1-strict.json', 'utf8'));
const iso = JSON.parse(readFileSync(OUT + '/t2-isolation-rules.json', 'utf8'));
const pjs = readFileSync(R + '/prototypes/_selection/prompts.js', 'utf8');

// tone：从 prompts.js 的 schemes 抓
const tone = {};
{
  const re = /"id":\s*"(S\d\d)"[\s\S]*?"tone":\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(pjs))) tone[m[1]] = m[2];
}
// 兜底：从 dump 的气质行抓
for (const id of Object.keys(dump.prompts)) {
  if (!tone[id]) {
    const m = dump.prompts[id].match(/这个案子的调性是「([^」]*)」/);
    if (m) tone[id] = m[1];
  }
}

const ids = Object.keys(dump.prompts).sort();
const rows = [];
for (const id of ids) {
  const t = dump.prompts[id];
  // degrades 判据：数条目 + 降级/折叠/重排/不足 的措辞
  const degrades = /不足.{0,12}(个|条|项)?\s*.{0,8}(重排|改|折)|折叠|降到|依次降|断点|窄屏|移动端/.test(t);
  const hasVoid = /空位|占位|留白承接|空缺|空槽/.test(t);
  const s = strict.find((x) => x.id === id) || {};
  const lineClean = (s.phantomLoose || []).length === 0 && (s.omitted || []).length === 0;
  const mDensity = (con.per[id] && con.per[id].counts && con.per[id].counts.M) || 0;
  rows.push({
    id, degrades, hasVoid, lineClean, mDensity,
    tone: tone[id] || '(缺)',
    mentionChars: iso[id].block, mention0: iso[id].block === 0,
    chars: t.length,
  });
}
writeFileSync(OUT + '/t2-strata.json', JSON.stringify(rows, null, 1), 'utf8');

const b = (x) => (x ? 'Y' : '.');
console.log('id   degrade void  线宽干净 M类 隔离0  气质                     字数');
for (const r of rows) {
  console.log(r.id.padEnd(5), b(r.degrades).padEnd(8), b(r.hasVoid).padEnd(5), b(r.lineClean).padEnd(9),
    String(r.mDensity).padEnd(5), b(r.mention0).padEnd(6), r.tone.slice(0, 22).padEnd(24), r.chars);
}
console.log('\n统计：');
console.log('  degrades=Y :', rows.filter((r) => r.degrades).length);
console.log('  hasVoid=Y  :', rows.filter((r) => r.hasVoid).length);
console.log('  线宽干净   :', rows.filter((r) => r.lineClean).length);
console.log('  隔离干净(0):', rows.filter((r) => r.mention0).length);
console.log('  M 类 min/med/max:', Math.min(...rows.map((r) => r.mDensity)), '/',
  rows.map((r) => r.mDensity).sort((a, b) => a - b)[15], '/', Math.max(...rows.map((r) => r.mDensity)));
console.log('  气质分布：');
const byTone = {};
for (const r of rows) (byTone[r.tone] = byTone[r.tone] || []).push(r.id);
for (const [k, v] of Object.entries(byTone).sort((a, b) => b[1].length - a[1].length)) console.log('    ' + (k || '(空)').padEnd(24), v.length, v.join(','));
