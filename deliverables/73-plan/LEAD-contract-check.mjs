/* 契约 §7.2 说：FAIL 集合 ⊆ §9.15 允许表 ∪ 逐案批准记录。
 * 但 --allow 从未使用（30 案 allow 全空），也没有闸门在验证这条关系。
 *
 * 后果：§9.15 是一张**只能靠人读**的表。它今天恰好和 S08 的 2 条 FAIL 一致，
 * 但如果：
 *   · 有人给 S08 加了第 3 条 FAIL  → 契约仍然「成立」（不在允许表就不是豁免），
 *     但没有任何机制提醒他「你现在有一条不在豁免里的 FAIL」
 *   · 有人改了 §9.15 但没改原型     → 同上
 * 这正是本仓库 §7.4 定义过的「引用跳空」。
 *
 * 本探针验证：把 §9.15 表解析出来，与 30 案实测 FAIL 集合做比对。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const contract = readFileSync(join(ROOT, 'prototypes/_CONTRACT.md'), 'utf8');

/* §9.15 允许表：| `rule` | 理由 | 处理 | */
const sec = contract.slice(contract.indexOf('9.15'), contract.indexOf('9.16'));
const allowTable = new Map();
for (const line of sec.split('\n')) {
  const m = line.match(/^\|\s*`([\w-]+)`\s*\|/);
  if (m) allowTable.set(m[1], true);
}
console.log('═══ §9.15 允许表解析结果 ═══');
console.log('  规则数:', allowTable.size, '→', [...allowTable.keys()].join(', '));

/* 逐案实测 FAIL */
const P = join(ROOT, 'prototypes');
const cases = readdirSync(P, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

console.log('\n═══ 实测 FAIL vs 允许表 ═══\n');
const violations = [];
const allowed = [];
for (const dir of cases) {
  const rp = join(P, dir, '.inspect', 'report.json');
  if (!existsSync(rp)) { violations.push({ id: dir.slice(0, 3), rule: '(报告缺失)', note: '没有 report.json，无法判定' }); continue; }
  const j = JSON.parse(readFileSync(rp, 'utf8'));
  for (const f of (j.findings || []).filter((x) => x.level === 'FAIL')) {
    if (allowTable.has(f.id)) allowed.push({ id: dir.slice(0, 3), rule: f.id });
    else violations.push({ id: dir.slice(0, 3), rule: f.id, note: f.message.slice(0, 80) });
  }
}

console.log(`  在允许表内的 FAIL: ${allowed.length} 条`);
for (const a of allowed) console.log(`     ${a.id}  ${a.rule}  ✓ 已登记于 §9.15`);

console.log(`\n  不在允许表的 FAIL: ${violations.length} 条  ← 契约 §7.2 要求必须为 0`);
for (const v of violations) console.log(`     ${v.id}  ${v.rule}   ${v.note}`);

/* 反向：允许表里登记了，但当前没有任何案触发 —— 供人工确认是否已过期 */
const triggered = new Set([...allowed].map((a) => a.rule));
const stale = [...allowTable.keys()].filter((k) => !triggered.has(k));
console.log('\n═══ 允许表里登记但当前无案触发的规则 ═══');
console.log(' ', stale.length ? stale.join(', ') : '（无，每条都还在用）');

console.log(`\n═══ 结论 ═══`);
console.log(`  契约 §7.2 成立: ${violations.length === 0 ? '是' : '否'}`);
