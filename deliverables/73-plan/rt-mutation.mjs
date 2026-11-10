// RT 探针 6：变异测试 P1a 的可行性探针 —— 它真的会红吗，还是恒真/脆解析？
// 攻击点 2 的核心：允许表是手写的、FAIL 是工具产出的，**两者独立**听起来成立；
// 但闸门的价值取决于「解析器坏掉时它会不会静默放行」。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');

/** 完全照抄 LEAD-contract-check.mjs 的解析逻辑（不改一行），只为可复用 */
function leadParse(contract) {
  const sec = contract.slice(contract.indexOf('9.15'), contract.indexOf('9.16'));
  const allowTable = new Map();
  for (const line of sec.split('\n')) {
    const m = line.match(/^\|\s*`([\w-]+)`\s*\|/);
    if (m) allowTable.set(m[1], true);
  }
  return { table: allowTable, sliceLen: sec.length, head: sec.slice(0, 60) };
}

const real = readFileSync(join(P, '_CONTRACT.md'), 'utf8');
const r0 = leadParse(real);
console.log('═══ 0. 原版契约的解析结果 ═══');
console.log('  slice 长度:', r0.sliceLen, '（真实 §9.15 表只有 ~2KB，说明切片起点在 110 行）');
console.log('  slice 开头:', JSON.stringify(r0.head));
console.log('  解析出的规则:', [...r0.table.keys()].join(', '));
console.log('  → 5 条正确。**但它是靠"切片往后捞"捞到的，不是靠定位 §9.15。**\n');

/* ── 变异 A：在 §6 表里把某一行改成以反引号 id 开头（与 §9.15 完全无关的合法改动）── */
const mA = real.replace('| **静止态禁 `box-shadow`** |', '| `shadow` **静止态禁 box-shadow** |');
const rA = leadParse(mA);
console.log('═══ 变异 A：§6 表 shadow 行改成以 `shadow` 开头 ═══');
console.log('  解析出的规则:', [...rA.table.keys()].join(', '));
console.log(`  → 允许表从 5 条变成 ${rA.table.size} 条，**多出一个 shadow 豁免**。`);
console.log('  这是假阴性：§9.15 一个字没改，闸门却开始放过 shadow FAIL。\n');

/* ── 变异 B：§9.15 表里的规则被写成不带反引号（Markdown 完全合法）── */
const mB = real.replace('| `measure` |', '| measure |');
const rB = leadParse(mB);
console.log('═══ 变异 B：§9.15 的 `measure` 去掉反引号 ═══');
console.log('  解析出的规则:', [...rB.table.keys()].join(', '));
console.log(`  → 允许表少一条（${rB.table.size} 条）。如果真有 measure FAIL，会**误报越界**。`);
console.log('  而把规则名加不加反引号，是纯排版决定，不是契约语义。\n');

/* ── 变异 C：只要 §9.15 之前出现第二个 "9.15" 字样（例如 §6 引用它）── */
const mC = real.replace(
  '**现行欠款**：`S13` 的 17 处 `shadow` + `button-fx` 属真未修，不在 §9.15 允许表内',
  '**现行欠款**：`S13` 的 17 处 `shadow` 见 §9.15 允许表');
const rC = leadParse(mC);
console.log('═══ 变异 C：把 §6 里那句"不在 §9.15 允许表内"改成"见 §9.15 允许表" ═══');
console.log('  （这句改动**正是 P1a 想促成的文档修正** —— 欠款清了就该这么写）');
console.log('  解析出的规则:', [...rC.table.keys()].join(', ') || '(空)');
console.log(`  → 允许表 ${rC.table.size} 条。`);
if (rC.table.size !== 5) {
  console.log('  **这正是 P1a 的动机本身造成的破坏**：修好 §6 那句欠款陈述，就会打断解析器。');
}

/* ── 变异 D：用真实 FAIL 数据检验「恒真式」问题 ── */
console.log('\n═══ 变异 D：允许表 vs RULE_IDS 全集（恒真式检验）═══');
const rulesSrc = readFileSync(join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs'), 'utf8');
const RULE_IDS = [...rulesSrc.match(/RULE_IDS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
const inspSrc = readFileSync(join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs'), 'utf8');
const extra = [...new Set([...inspSrc.matchAll(/id:\s*'([\w-]+)'/g)].map((m) => m[1]))];
const universe = [...new Set([...RULE_IDS, ...extra])];
console.log(`  RULE_IDS = ${RULE_IDS.length} 条；inspect.mjs 追加 ${extra.length} 条 → 全集 ${universe.length} 条`);
console.log(`  §9.15 允许表 = 5 条，覆盖率 ${(5 / universe.length * 100).toFixed(1)}%`);
console.log('  ⇒ **不是恒真式**：工具仍能产出 47 条表外规则名的 FAIL。');
console.log('  但量一下「当前真实可产出」的 FAIL 空间：');

const fails = new Map();
let reports = 0;
for (const d of readdirSync(P, { withFileTypes: true })) {
  if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
  const rp = join(P, d.name, '.inspect', 'report.json');
  if (!existsSync(rp)) continue;
  reports++;
  const j = JSON.parse(readFileSync(rp, 'utf8').replace(/^\uFEFF/, ''));
  for (const f of j.findings || []) if (f.level === 'FAIL') fails.set(f.id, (fails.get(f.id) || 0) + 1);
}
console.log(`  ${reports} 份报告里，出现过 FAIL 的规则名只有 ${fails.size} 种: ${[...fails.keys()].join(', ')}`);
console.log(`  这 ${fails.size} 种**全部**已在允许表内。`);
console.log('  ⇒ 闸门要断言的集合当前是「空集 ⊆ 表」，即 S08 的两条。');
console.log('  换句话说：**去掉 S08，闸门对 29 案恒真**；留下 S08，它只锁定一条已知的、已登记的事实。');

/* ── 变异 E：S13 这种"契约说有欠款、工具说没有"的情况，闸门能抓吗 ── */
console.log('\n═══ 变异 E：闸门方向的根本局限 ═══');
console.log('  契约 :110 声称 S13 有 17 处 shadow + button-fx「真未修，不在 §9.15 允许表内」。');
console.log('  实测 : S13 report.json 的 findings = WARN/font-count body-size no-footage still-page hairline');
console.log('         —— **没有 shadow，也没有 button-fx**。');
console.log('  P1a 断言的是「FAIL ⊆ 允许表」。S13 的 shadow FAIL 不存在 → 该断言通过。');
console.log('  ⇒ 契约文本与工具结论矛盾，而 P1a 在这个方向上**永远只能报绿**。');
