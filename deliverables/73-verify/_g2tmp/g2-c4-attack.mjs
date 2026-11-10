/* REVIEW-GATE2 自建攻击 #2：C4 isMeta 的**新**攻击 + 不收窄检查 + 对照
 *
 * 与 ab-c4-meta 的区别：
 *   · ab-c4-meta 的 9 条攻击每条只嵌「一个元词」，但**位置固定**在句尾、且
 *     全部是同一句型的后缀。这里换成**元词出现在句首/句中/跨子句**的形态。
 *   · 更关键：C4 的 isMeta 现在是「主语+动作同句」。任何**真声称**只要恰好
 *     含一个工具主语 + 一个工具动作，就会被错放过。攻击 3 条专打这一点。
 *
 * 另外验证终验原话「同句只加『人工检查器』五个字，就从抓到翻成放过」是否仍成立。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const CON = `${ROOT}/prototypes/_CONTRACT.md`;
const orig = readFileSync(CON, 'utf8');
const ANCHOR = '## 10 ';

const run = () => {
  try { return { code: 0, out: execSync('node prototypes/_build/check-contract.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const restore = () => writeFileSync(CON, orig, 'utf8');

if (!orig.includes(ANCHOR)) { console.log('锚点不存在'); process.exit(2); }

/* 每条 = { name, text, expect: 'red'|'green' } */
const CASES = [
  /* ── 3 条全新攻击：换元词组合、换语序 ── */
  {
    name: 'A1 元词在句首：「检查器不反对，S13 的 17 处 shadow 属真未修」',
    text: '检查器不反对：`S13` 的 17 处 `shadow` 属真未修。',
    expect: 'red',
  },
  {
    name: 'A2 元词数量五（该规则/C1/该规则/C1/该规则），无工具动作',
    text: '`S13` 的 17 处 `shadow` 属真未修；该规则仍然欠着，C1 管不到它的这一面，该规则与 C1 都与本条无关，该规则依旧在欠款表里。',
    expect: 'red',
  },
  {
    name: 'A3 真欠款句里嵌了「该工具 + 发现」—— 结构与元描述同形',
    text: '该工具在 2026-10-31 之前从未发现：`S13` 的 17 处 `shadow` 属真未修。',
    expect: 'red',
  },

  /* ── 终验原话的对照：真声称 + 只加「人工检查器」五字 ── */
  {
    name: 'C1 对照·真声称原句（应红）',
    text: '`S13` 的 17 处 `shadow` 属真未修。',
    expect: 'red',
  },
  {
    name: 'C2 对照·同句加「人工检查器」（终验说会翻成放过 → 那就仍是缺陷）',
    text: '`S13` 的 17 处 `shadow` 属真未修，人工检查器不反对。',
    expect: 'red',
  },

  /* ── 反向：必须真的放过（防收窄过头变成全红） ── */
  {
    name: 'R1 元描述：本闸门 + 抓到（同句）→ 放过',
    text: '本闸门上线当天抓到两处「文档替不存在的缺陷要豁免」，其中一处称 `S13` 有 17 处 `shadow` 未清。',
    expect: 'green',
  },
  {
    name: 'R2 元描述：这条断言 + 检测到（同句）→ 放过',
    text: '这条断言检测到「`S13` 的 17 处 `shadow` 属真未修」这句话与实测不符。',
    expect: 'green',
  },
];

restore();
let base = run();
console.log(`═══ 基线 exit=${base.code} ═══`);
if (base.code !== 0) { console.log('  ⚠ 基线不绿（有并发改动？），结果仅供参考'); }

const results = [];
for (const c of CASES) {
  restore();
  writeFileSync(CON, orig.replace(ANCHOR, c.text + '\n\n' + ANCHOR), 'utf8');
  const res = run();
  const red = res.code === 1 && /C4-doc-claims-fail-that-is-gone/.test(res.out);
  const got = red ? 'red' : 'green';
  results.push({ ...c, got, ok: got === c.expect, code: res.code });
  console.log(`${got === c.expect ? '✓' : '✗'}  ${c.name}   期望=${c.expect} 实得=${got}`);
}
restore();
const passed = results.filter((r) => r.ok).length;
console.log(`\n═══ REVIEW-GATE2 自建 C4 攻击: ${passed}/${results.length} ═══`);

base = run();
if (base.code !== 0) console.log(`⚠ 恢复后基线不绿 exit=${base.code}（并发改动）`);
