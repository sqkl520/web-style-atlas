/* C4 的 isMeta 第四轮验证 —— 加入复核 Agent 的 4 条结构绕过。
 *
 * 完整测试集：
 *   · 终验的 9 条（每条只嵌一个元词）      → 必须全部抓到
 *   · 复核的 4 条（元主语 + 工具动作 + 真欠款）→ 必须全部抓到  ← 本轮新增
 *   · 真元描述（C4 抓到两处…实测 0 条）    → 必须放过
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const orig = readFileSync(CON, 'utf8');

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const restore = () => writeFileSync(CON, orig, 'utf8');

/* 终验的第 1 轮攻击：9 条，每条只嵌一个元词 */
const R1 = [
  '`S13` 的 17 处 `shadow` 属真未修。',
  '`S13` 的 17 处 `shadow` 属真未修，这一点检查器不反对。',
  '`S13` 的 17 处 `shadow` 属真未修，断言里也没说它清了。',
  '`S13` 的 17 处 `shadow` 属真未修，闸门对此无异议。',
  '`S13` 的 17 处 `shadow` 属真未修，没人抓到过它被修的证据。',
  '`S13` 的 17 处 `shadow` 属真未修（实测 0 条只说明没人查）。',
  '`S13` 的 17 处 `shadow` 属真未修，这条断言指的是别的事。',
  '`S13` 的 17 处 `shadow` 属真未修，C1 到 C3 都没覆盖它。',
  '`S13` 的 17 处 `shadow` 属真未修，check-docs 管不到。',
];

/* 复核的第 2 轮攻击：4 条，元主语 + 工具动作 + 真欠款（结构绕过） */
const R2 = [
  '这个工具至今没有发现：`S13` 的 17 处 `shadow` 属真未修。',
  '检查器没有报出 `S13` 的 17 处 `shadow` 属真未修，所以它还欠着。',
  '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。',
  '`S13` 的 17 处 `shadow` 属真未修；这个工具只会据此放行，不会修它。',
];

/* 真元描述：必须放过 */
const META = [
  '为什么需要 C4：这条断言上线当天就抓到两处「文档替一个已经不存在的缺陷要豁免」，实测 0 条。',
  '本闸门抓到过两处文档替已不存在的缺陷要豁免。',
];

console.log('═══ 基线 ═══');
restore();
let r = run();
console.log(`  exit=${r.code}\n`);
if (r.code !== 0) { console.log('  ⚠ 基线不绿，终止'); process.exit(1); }

const results = [];
const testClaim = (name, sentence) => {
  restore();
  const next = orig.replace('## 10 ', sentence + '\n\n## 10 ');
  if (next === orig) { results.push({ name, ok: null, kind: 'claim' }); return; }
  writeFileSync(CON, next, 'utf8');
  const res = run();
  results.push({ name, ok: res.code === 1 && /C4-doc-claims-fail-that-is-gone/.test(res.out), kind: 'claim', code: res.code });
  restore();
};
const testMeta = (name, sentence) => {
  restore();
  const next = orig.replace('## 10 ', sentence + '\n\n## 10 ');
  if (next === orig) { results.push({ name, ok: null, kind: 'meta' }); return; }
  writeFileSync(CON, next, 'utf8');
  const res = run();
  results.push({ name, ok: res.code === 0, kind: 'meta', code: res.code });
  restore();
};

console.log('── 第 1 轮：9 条单点元词攻击 ──');
R1.forEach((s, i) => testClaim(`R1-${i + 1} ${s.slice(0, 40)}…`, s));

console.log('── 第 2 轮：4 条结构绕过（复核 Agent 的）──');
R2.forEach((s, i) => testClaim(`R2-${i + 1} ${s.slice(0, 40)}…`, s));

console.log('── 反向：2 条真元描述 ──');
META.forEach((s, i) => testMeta(`META-${i + 1} ${s.slice(0, 40)}…`, s));

restore();
console.log('');
for (const x of results) {
  const want = x.kind === 'claim' ? '抓到' : '放过';
  console.log(`${x.ok === true ? '✓' : x.ok === false ? '✗' : '?'}  ${x.name}   期望${want}（exit=${x.code}）`);
}
const r1 = results.filter((x) => x.name.startsWith('R1'));
const r2 = results.filter((x) => x.name.startsWith('R2'));
const mt = results.filter((x) => x.name.startsWith('META'));
console.log(`\n═══ 第 1 轮: ${r1.filter((x) => x.ok).length}/${r1.length} ═══`);
console.log(`═══ 第 2 轮（结构绕过）: ${r2.filter((x) => x.ok).length}/${r2.length} ═══`);
console.log(`═══ 反向元描述: ${mt.filter((x) => x.ok).length}/${mt.length} ═══`);
const passed = results.filter((x) => x.ok === true).length;
console.log(`═══ 合计: ${passed}/${results.length} ═══`);

r = run();
console.log(`\n恢复后: exit=${r.code}  ${(r.out.match(/合计 FAIL \d+ \/ WARN \d+ \/ INFO \d+/) || [''])[0]}`);
