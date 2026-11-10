// RT 探针 2：30 案 report.json 的 FAIL/WARN 全量枚举 + allow 字段 + at 一致性
// 目的：回答「FAIL ⊆ 允许表」是不是恒真式、当前是否真的只有 S08 两条 FAIL。
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const P = new URL('../../prototypes/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const failsById = new Map();
const warnsById = new Map();
const perCase = [];
for (const name of dirs) {
  const rep = join(P, name, '.inspect', 'report.json');
  if (!existsSync(rep)) continue;
  let j;
  try { j = JSON.parse(readFileSync(rep, 'utf8').replace(/^\uFEFF/, '')); } catch (e) { perCase.push({ id: name.slice(0, 3), err: String(e) }); continue; }
  const f = (j.findings || []).filter((x) => x.level === 'FAIL');
  const w = (j.findings || []).filter((x) => x.level === 'WARN');
  for (const x of f) failsById.set(x.id, (failsById.get(x.id) || 0) + 1);
  for (const x of w) warnsById.set(x.id, (warnsById.get(x.id) || 0) + 1);
  perCase.push({ id: name.slice(0, 3), at: j.at, allow: j.allow, nF: f.length, nW: w.length, fids: f.map((x) => x.id) });
}
console.log('== 每案 FAIL/WARN ==');
for (const c of perCase) {
  if (c.err) { console.log(`${c.id}  PARSE_ERR ${c.err}`); continue; }
  console.log(`${c.id}  at=${c.at}  allow=${JSON.stringify(c.allow)}  FAIL=${c.nF}${c.nF ? ' [' + c.fids.join(',') + ']' : ''}  WARN=${c.nW}`);
}
console.log('\n== FAIL id 频次（全 30 案合计）==');
console.log([...failsById.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join('  ') || '(无)');
console.log('\n== WARN id 频次 ==');
console.log([...warnsById.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join('  '));
console.log('\n== 有 allow 字段的案 ==');
const withAllow = perCase.filter((c) => c.allow !== undefined && c.allow !== null);
console.log(withAllow.length ? JSON.stringify(withAllow.map((c) => [c.id, c.allow])) : '(30 案全部没有 allow 字段)');
console.log('\n== 案数与 report 数 ==');
console.log(`case dirs=${dirs.length}  reports=${perCase.filter((c) => !c.err).length}`);
