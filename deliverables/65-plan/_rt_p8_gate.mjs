// 探针 8：闸门 4 个不达标案（S07 S08 S13 S21）的 FAIL 明细 —— 与"死字段"比，哪个更该修？
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO } from './_rt_lib.mjs';

const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

let totalFail = 0, totalWarn = 0;
const byCase = [];
const byRule = {};
for (const dir of dirs) {
  const p = join(PROTO, dir, '.inspect', 'report.json');
  if (!existsSync(p)) continue;
  const j = JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
  const f = (j.findings || []).filter((x) => x.level === 'FAIL');
  const w = (j.findings || []).filter((x) => x.level === 'WARN');
  totalFail += f.length; totalWarn += w.length;
  if (f.length) {
    for (const x of f) {
      const k = x.id || '(no id)';
      byRule[k] = byRule[k] || [];
      byRule[k].push({ id: dir.slice(0, 3), msg: x.msg || x.message || '', where: x.where || x.selector || x.target || '' });
    }
    byCase.push({ id: dir.slice(0, 3), dir, at: j.at, fails: f, warns: w });
  }
}

console.log(`=== 闸门汇总：FAIL ${totalFail} 条 / WARN ${totalWarn} 条 ===`);
console.log('不达标案：' + byCase.map((c) => c.id + '(FAIL ' + c.fails.length + ')').join(' '));
console.log('');
for (const c of byCase) {
  console.log('╔══ ' + c.id + '  ' + c.dir + '  at=' + c.at);
  c.fails.forEach((f, i) => {
    console.log(`║ ${i + 1}. [${f.id}] ${f.msg || f.message || JSON.stringify(f).slice(0, 160)}`);
    for (const k of Object.keys(f)) if (!['id', 'level', 'msg', 'message'].includes(k)) console.log(`║      ${k} = ${JSON.stringify(f[k]).slice(0, 200)}`);
  });
  console.log(`║ (WARN ${c.warns.length}: ${[...new Set(c.warns.map((w) => w.id))].join(' ')})`);
  console.log('╚══════════════════════════════════════');
  console.log('');
}

console.log('=== 按规则聚合 ===');
for (const [k, v] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${k}: ${v.length} 条 → ${v.map((x) => x.id).join(' ')}`);
  console.log(`      样例: ${v[0].msg.slice(0, 140)}`);
}
