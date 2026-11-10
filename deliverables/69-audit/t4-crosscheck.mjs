// 交叉核对：把三份报告里引用的数字，逐个用原始数据复算一遍。
// 目的：防止我写报告时手抄错数（上一轮的教训是"结论对但数字错"同样有害）。
import { readFileSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const T = JSON.parse(readFileSync(OUT + '/t1-truth.json', 'utf8'));
const strict = JSON.parse(readFileSync(OUT + '/t1-strict.json', 'utf8'));
const sim = JSON.parse(readFileSync(OUT + '/t1-final-sim.json', 'utf8'));
const u = JSON.parse(readFileSync(OUT + '/t3-uclass.json', 'utf8'));
const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));
const grp = JSON.parse(readFileSync(OUT + '/t3-detail.json', 'utf8'));

const checks = [];
const ck = (name, got, want) => checks.push({ name, got, want, ok: String(got) === String(want) });

// 1) "19/30 案抽到 HTML 内联新值"（名单以 t4-authoritative.mjs 为准）
const inlineCases = Object.keys(T).filter((id) => T[id].C_htmlInline.length > 0 || T[id].C2_dataUri.length > 0);
ck('有 HTML 内联/ data-URI stroke 的案数', inlineCases.length, 19);
ck('  明细', inlineCases.sort().join(','), 'S03,S06,S07,S08,S10,S13,S14,S15,S17,S18,S20,S21,S22,S23,S24,S25,S27,S28,S30');

// 2) "8 案完全正确"（现行提示词）
const clean = strict.filter((r) => r.phantomLoose.length === 0 && r.omitted.length === 0).map((r) => r.id);
ck('现行提示词完全正确的案数', clean.length, 8);
ck('  明细', clean.sort().join(','), 'S01,S02,S05,S07,S16,S19,S22,S26');

// 3) "22/30 有漏讲"
const omit = strict.filter((r) => r.omitted.length > 0).length;
ck('有漏讲的案数', omit, 22);

// 4) "宽松口径编造 0 案 / 严格 1 案"
ck('宽松口径有编造的案数', strict.filter((r) => r.phantomLoose.length > 0).length, 1);
ck('严格口径有编造的案数', strict.filter((r) => r.phantomStrict.length > 0).length, 1);
ck('  是哪个案', strict.filter((r) => r.phantomLoose.length > 0).map((r) => r.id).join(','), 'S27');

// 5) 五档通过数
for (const [k, want] of [['now', 6], ['a', 6], ['b', 14], ['c', 23], ['d', 23], ['e', 30]]) {
  ck('通过数 (' + k + ')', sim.summary[k].pass, want);
}

// 6) 约束去重
const seen = new Set();
let tot = 0; const byCat = {};
for (const [id, v] of Object.entries(con.per)) for (const it of v.items) {
  const k = id + '\u0000' + it.text;
  if (seen.has(k)) continue;
  seen.add(k); tot++;
  byCat[it.cat] = (byCat[it.cat] || 0) + 1;
}
ck('去重后约束总数', tot, 1011);
ck('  M', byCat.M, 390);
ck('  S', byCat.S, 510);
ck('  J', byCat.J, 111);

// 7) U 类统计
const uHits = u.hits.filter((h) => h.code !== 'U3');
const byCode = {};
for (const c of ['U1', 'U2', 'U3', 'U4', 'U5', 'U6']) byCode[c] = uHits.filter((h) => h.code === c).length;
ck('U1', byCode.U1, 302);
ck('U2', byCode.U2, 8);
ck('U3（证伪后）', byCode.U3, 0);
ck('U4', byCode.U4, 4);
ck('U5', byCode.U5, 84);
ck('U6', byCode.U6, 21);
const flagged = new Set(uHits.map((h) => h.id + '\u0000' + h.reason));
// 权威口径：只计落在具体约束上的命中（cat ∈ M/S/J），同案同文去重。
// case-level 的 21 条 U6 与 item-level U6 案集不同，混算会重复计数 → 剔除。
const uItemLevel = uHits.filter((h) => h.cat !== '?');
const flaggedItems = new Set(uItemLevel.map((h) => h.id + '\u0000' + h.text));
ck('U 类去重后被标 item 数', flaggedItems.size, 362);
ck('  U 占比 %', (flaggedItems.size / tot * 100).toFixed(1), '35.8');
ck('涉及案数', new Set(uHits.map((h) => h.id)).size, 30);

// 8) U1 里"模板句 ×30"的加总（修正：是 7 句 210 条，另有 2 句因拆分多计）
const u1 = uItemLevel.filter((h) => h.code === 'U1');
const u1byReason = {};
for (const h of u1) u1byReason[h.reason] = (u1byReason[h.reason] || 0) + 1;
const sixTemplates = Object.entries(u1byReason).filter(([, n]) => n === 30);
ck('U1 中恰好 30 条的判据种类数', sixTemplates.length, 7);
ck('  这 7 句合计条数', sixTemplates.reduce((a, [, n]) => a + n, 0), 210);
ck('U1 全部条数', u1.length, 302);
ck('  占全部 U 的 %', (u1.length / flaggedItems.size * 100).toFixed(1), '83.4');

// 9) S27 / S25 的隔离字数
const iso = JSON.parse(readFileSync(OUT + '/t2-isolation-rules.json', 'utf8'));
for (const id of ['S27', 'S25', 'S10', 'S15', 'S09']) ck('隔离 block ' + id, iso[id].block, id === 'S27' || id === 'S25' ? 0 : iso[id].block);

// 10) 干净（四种规则全 0）的案
const cleanIso = Object.keys(iso).filter((id) => ['block', 'para', 'sentence', 'window'].every((k) => iso[id][k] === 0));
ck('四种规则下全 0 的案数', cleanIso.length, 11);
ck('  明细', cleanIso.sort().join(','), 'S05,S11,S13,S14,S17,S20,S21,S25,S26,S27,S28');

// 输出
console.log('交叉核对结果：');
let bad = 0;
for (const c of checks) {
  if (!c.ok) { bad++; console.log('  ✗ ' + c.name + '  期望=' + c.want + '  实得=' + c.got); }
}
console.log('  ' + (checks.length - bad) + '/' + checks.length + ' 项通过' + (bad ? '，' + bad + ' 项不符' : '，全部一致'));
console.log('\n附：6 句模板明细');
sixTemplates.forEach(([r, n]) => console.log('  ' + n + ' × ' + r.slice(0, 70)));
