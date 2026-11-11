// 探针 04：用 gate.at 与目录 mtime 判定"新案"
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

console.log('id  gate.at                    dir-first-commit-ish   mtime');
const rows = [];
for (const s of S) {
  const p = 'D:/Web/style/prototypes/' + s.dir + '/style.css';
  let mt = '';
  try { mt = statSync(p).mtime.toISOString(); } catch { mt = 'MISSING'; }
  console.log(`${s.id}  ${s.gate.at}  ${mt}`);
  rows.push({ id: s.id, at: s.gate.at, mt });
}
console.log('\n--- distinct gate.at ---');
const byAt = {};
for (const r of rows) byAt[r.at] = (byAt[r.at] || 0) + 1;
console.log(JSON.stringify(byAt, null, 1));
