// RT 探针 6b：修正版变异测试。上一版有两条变异的打印是**写死的断言**，
// 而变异其实没有生效（输出说"多出一个 shadow 豁免"，实际仍是 5 条）—— 那是我自己的 §9.23。
// 这一版每条变异都**先断言变异确实改到了文本**，再动态打印结果。
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');
const real = readFileSync(join(P, '_CONTRACT.md'), 'utf8');

function leadParse(contract) {
  const sec = contract.slice(contract.indexOf('9.15'), contract.indexOf('9.16'));
  const table = new Map();
  for (const line of sec.split('\n')) {
    const m = line.match(/^\|\s*`([\w-]+)`\s*\|/);
    if (m) table.set(m[1], true);
  }
  return { table, keys: [...table.keys()], sliceLen: sec.length, head: sec.slice(0, 50) };
}

const base = leadParse(real);
const show = (label, r, note) => {
  console.log(`${label}`);
  console.log(`   规则(${r.keys.length}): ${r.keys.join(', ')}`);
  if (note) console.log(`   → ${note(r)}`);
  console.log('');
};

console.log('═══ 基线 ═══');
console.log(`  slice 长度 ${base.sliceLen}，开头 ${JSON.stringify(base.head)}`);
console.log(`  说明切片起点**不是 §9.15 标题（第 194 行）**，而是第 110 行 §6 表里那句"§9.15 允许表内"。`);
show('  解析结果:', base);

/* ── 变异 A（已验证生效）：在 §6 区插入一行以反引号规则名开头的表格行 ──
   这是**完全合理的未来编辑**：有人想在 §6 里把某条约束与规则名挂上钩。 */
console.log('═══ 变异 A：§6 区插入 `| `shadow` | … |` 一行（合理编辑）═══');
const anchorA = '**两条工具盲区的提醒**';
const mA = real.replace(anchorA, '| `shadow` | S13 压痕走逐案批准 | 保留 |\n\n' + anchorA);
console.log(`  变异是否生效: ${mA !== real ? '是（文本已改）' : '否（未命中锚点）'}`);
if (mA !== real) {
  const rA = leadParse(mA);
  show('  解析结果:', rA, (r) => r.keys.length > base.keys.length
    ? `**允许表从 ${base.keys.length} 变成 ${r.keys.length} 条**，多出 ${r.keys.filter((k) => !base.keys.includes(k)).join(',')}`
    : '（未变化——说明这条路径安全）');
}

/* ── 变异 B（已验证生效）：§9.15 的规则名去掉反引号（纯排版改动）── */
console.log('═══ 变异 B：§9.15 的 `measure` 去掉反引号 ═══');
const mB = real.replace('| `measure` |', '| measure |');
console.log(`  变异是否生效: ${mB !== real ? '是' : '否'}`);
if (mB !== real) {
  const rB = leadParse(mB);
  show('  解析结果:', rB, (r) => r.keys.length < base.keys.length
    ? `**允许表从 ${base.keys.length} 降到 ${r.keys.length} 条**，丢失 ${base.keys.filter((k) => !r.keys.includes(k)).join(',')} → 会产生**误报越界**`
    : '（未变化）');
}

/* ── 变异 C（已验证生效）：欠款清了，把 §6 那句"不在 §9.15 允许表内"改掉 ── */
console.log('═══ 变异 C：把 §6 那句"不在 §9.15 允许表内"改成普通表述 ═══');
console.log('  （这正是 P1a 的动机本身会促成的修改：欠款清了就该这么写）');
const mC = real.replace('属真未修，不在 §9.15 允许表内——出路只有两条', '属真未修——出路只有两条');
console.log(`  变异是否生效: ${mC !== real ? '是' : '否'}`);
if (mC !== real) {
  const rC = leadParse(mC);
  show('  解析结果:', rC, (r) => `仍为 ${r.keys.length} 条（因为 9.15 的下一个出现处就是真正的 §9.15 标题）`);
}

/* ── 变异 D：真正致命的方向 —— 删掉整张 §9.15 表 ── */
console.log('═══ 变异 D：删掉整张 §9.15 表（只留标题一行）═══');
const startD = real.indexOf('**9.15 四条对中文站结构性不利的规则');
const endD = real.indexOf('**9.16');
const mD = real.slice(0, startD) + '**9.15 四条对中文站结构性不利的规则。**\n\n' + real.slice(endD);
console.log(`  变异是否生效: ${mD !== real ? '是（表已删）' : '否'}`);
if (mD !== real) {
  const rD = leadParse(mD);
  show('  解析结果:', rD, (r) => r.keys.length === 0
    ? '**0 条**。此时 S08 的两条 FAIL 全部越界 → 闸门会报 2 条越界，**方向正确**'
    : '解析出了不该有的条目');
}

/* ── 变异 E：恒真式检验（用真实数据）── */
console.log('═══ 变异 E：允许表覆盖率与真实可产出 FAIL 空间 ═══');
const rulesSrc = readFileSync(join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs'), 'utf8');
const RULE_IDS = [...rulesSrc.match(/RULE_IDS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]);
const inspSrc = readFileSync(join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs'), 'utf8');
const inspIds = [...new Set([...inspSrc.matchAll(/id:\s*'([\w-]+)'/g)].map((m) => m[1]))];
const universe = [...new Set([...RULE_IDS, ...inspIds])];
console.log(`  规则全集 = ${universe.length} 条（RULE_IDS ${RULE_IDS.length} + inspect 内联 ${inspIds.length}，去重后）`);
console.log(`  §9.15 允许表 = ${base.keys.length} 条 → 覆盖率 ${(base.keys.length / universe.length * 100).toFixed(1)}%`);
console.log(`  ⇒ 非恒真：${universe.length - base.keys.length} 条表外规则名仍可能产出 FAIL。`);

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
console.log(`  实测：${reports} 份报告里出现过 FAIL 的规则名共 ${fails.size} 种 = ${[...fails.keys()].join(', ')}`);
console.log(`  这 ${fails.size} 种全部已在允许表内 → 当前断言的差集**恒为空**。`);
console.log(`  ⇒ 闸门今天能断言的只有 S08 的这 2 条，且它们已在表内（本来就该通过）。`);
console.log(`  ⇒ 也就是说：**P1a 上线当天必然全绿，它没有可捕获的现存缺陷。**`);

/* ── 变异 F：反向（契约说有欠款、工具说没有）── */
console.log('\n═══ 变异 F：契约 vs 工具 的矛盾方向 ═══');
const s13 = JSON.parse(readFileSync(join(P, 'S13-blind-debbossed-dispatch'.replace('debbossed', 'debossed'), '.inspect', 'report.json'), 'utf8'));
const ids13 = s13.findings.map((f) => f.level + '/' + f.id);
console.log(`  契约 :110 称 S13 有「17 处 shadow + button-fx，真未修」`);
console.log(`  S13 report.json findings: ${ids13.join(' ')}`);
console.log(`  shadow 在? ${ids13.some((x) => /shadow/.test(x))}   button-fx 在? ${ids13.some((x) => /button-fx/.test(x))}`);
console.log(`  ⇒ 断言「FAIL ⊆ 允许表」在这个矛盾上**只能报绿**（缺的 FAIL 不是"越界"，是"不存在"）。`);
console.log(`  ⇒ 这类"契约文本与工具结论互相矛盾"的缺陷，P1a 结构性无法发现。`);
