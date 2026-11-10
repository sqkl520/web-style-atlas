/* 验证 build-prompts.mjs 的两个"从 data.js 抽字段"正则是否依赖键序。
 * 用法：node _cut/regex-probe.mjs
 *
 * 正则原文照抄 build-prompts.mjs:44（RISK）与 :78（REUSE）：
 *   /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g
 *   /"id":\s*"(S\d{2})"[\s\S]*?"landing":\s*"((?:[^"\\]|\\.)*)"/g
 * 三者都测：改前 data.js、改后 data.js、以及一段**人为把 risk 放到 audit 之前**的
 * 合成 JSON —— 用来证明「键序互换」这件事本身不会让正则失配。 */
import fs from 'node:fs';
import vm from 'node:vm';

const RISK_RE = /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g;
const REUSE_RE = /"id":\s*"(S\d{2})"[\s\S]*?"landing":\s*"((?:[^"\\]|\\.)*)"/g;

function extract(src) {
  const risk = {}, landing = {};
  let m;
  RISK_RE.lastIndex = 0;
  while ((m = RISK_RE.exec(src))) risk[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
  REUSE_RE.lastIndex = 0;
  while ((m = REUSE_RE.exec(src))) landing[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
  return { risk, landing };
}

const beforeSrc = fs.readFileSync('deliverables/65-exec/_cut/data.before.js', 'utf8');
const afterSrc = fs.readFileSync('prototypes/_selection/data.js', 'utf8');
const b = extract(beforeSrc), a = extract(afterSrc);

console.log('═══ A. 改前 / 改后：正则抽到的 risk 与 landing ═══');
console.log(`  改前 risk 命中 ${Object.keys(b.risk).length}/30，landing 命中 ${Object.keys(b.landing).length}/30`);
console.log(`  改后 risk 命中 ${Object.keys(a.risk).length}/30，landing 命中 ${Object.keys(a.landing).length}/30`);
let riskDiff = [], landDiff = [];
for (const id of Object.keys(b.risk)) if (b.risk[id] !== a.risk[id]) riskDiff.push(id);
for (const id of Object.keys(b.landing)) if (b.landing[id] !== a.landing[id]) landDiff.push(id);
console.log('  risk 值变化的案：' + (riskDiff.join(' ') || '无（30/30 逐字相同）'));
console.log('  landing 值变化的案：' + (landDiff.join(' ') || '无（30/30 逐字相同）'));

console.log('\n═══ B. 关键问题：正则会不会因为 audit 挡在 risk 前面而"跨条吞"？ ═══');
/* 如果 `[\s\S]*?` 跨过本条记录的边界去抓下一条的 "risk"，那 risk 值会变成
 * 「本条 audit 尾部 … 下一条 risk 开头」这种怪东西。判据：抽到的值与该案
 * audit/landing 字段无关，且逐条与 data.js 里 risk 的真实值相同。 */
const sb = { window: {} };
vm.runInNewContext(afterSrc, sb);
const recs = sb.window.SCHEMES;
let mismatch = 0;
for (const r of recs) {
  if (a.risk[r.id] !== r.risk) { mismatch++; console.log(`  ✗ ${r.id} 抽取值 ≠ 字段真实值`); }
}
console.log(`  抽取值与 data.js 里 risk 字段的真实值比对：${30 - mismatch}/30 相同`);
let lm = 0;
for (const r of recs) {
  const real = String(r.landing || '').replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
  if (a.landing[r.id] !== real) { lm++; console.log(`  ✗ ${r.id} landing 抽取值 ≠ 字段真实值`); }
}
console.log(`  landing 同理：${30 - lm}/30 相同`);

console.log('\n═══ C. 顺序无关性：把 risk 挪到 audit 之前，正则还成立吗 ═══');
/* 合成一条最小记录，两种键序各来一遍。这直接回答「键序变化会不会让正则静默失配」。 */
const mk = (order) => {
  const o = { id: 'S99' };
  for (const k of order) o[k] = k === 'audit' ? 'AAA' : k === 'risk' ? 'RRR' : 'LLL';
  return 'window.SCHEMES = ' + JSON.stringify([o], null, 1) + ';';
};
const orders = [
  ['audit', 'risk', 'landing'],
  ['risk', 'audit', 'landing'],
  ['landing', 'risk', 'audit'],
];
for (const o of orders) {
  const r = extract(mk(o));
  console.log(`  键序 [${o.join(' < ')}]  → risk="${r.risk.S99}" landing="${r.landing.S99}" ` +
    (r.risk.S99 === 'RRR' && r.landing.S99 === 'LLL' ? '✓' : '✗ 失配'));
}

console.log('\n═══ D. 关键判据：每次匹配是否**跨过了本条记录的 } 边界** ═══');
/* 「跨条吞」的准确判据不是「字段里有没有裸引号」（内存里的字符串当然有引号，
 * 那是 JSON 序列化时才转义的——上一版这条判据是假的，20/30 全命中的原因是它测错了对象）。
 * 真正的判据：正则的 `[\s\S]*?` 惰性段，从 "id" 开工到 "risk" 收工，途经的文本里
 * **允许出现 `},`+换行+` {`（下一条记录的开头）吗**？出现就是跨条吞。
 * 做法：把 src 按记录切成 span，逐个 match 看 [m.index, m.index+m[0].length] 是否落在同一 span 内。 */
{
  const spans = [];
  let idx = 0;
  const reRec = /"id":\s*"S\d{2}"/g;
  let mm;
  while ((mm = reRec.exec(afterSrc))) spans.push(mm.index);
  spans.push(afterSrc.lastIndexOf(']'));
  const spanOf = (p) => spans.findIndex((s, i) => p >= s && p < (spans[i + 1] ?? Infinity));
  RISK_RE.lastIndex = 0;
  let cross = 0, checked = 0, m2;
  while ((m2 = RISK_RE.exec(afterSrc))) {
    checked++;
    const s = spanOf(m2.index), e = spanOf(m2.index + m2[0].length - 1);
    if (s !== e || s < 0) { cross++; console.log(`  ✗ 跨条：${m2[1]} 起于 span ${s} 止于 span ${e}`); }
  }
  console.log(`  检查 ${checked} 次匹配，跨条 ${cross} 次 ` + (cross === 0 ? '✓ 全部落在本条记录内' : '✗'));
  /* 旁证：直接在**序列化文本**里数「"audit" 出现在 "risk" 之前」的记录数。
   * 按记录起点切段（不依赖结尾 lookahead，上一版漏掉了最后一条，只数出 29）。 */
  const starts = [...afterSrc.matchAll(/"id":\s*"(S\d{2})"/g)].map((x) => ({ id: x[1], i: x.index }));
  let orderOk = 0;
  starts.forEach((s, k) => {
    const seg = afterSrc.slice(s.i, k + 1 < starts.length ? starts[k + 1].i : afterSrc.length);
    const i1 = seg.indexOf('"audit"'), i2 = seg.indexOf('"risk"');
    if (i1 >= 0 && i2 >= 0 && i1 < i2) orderOk++; else console.log(`  ✗ ${s.id} 文本里 audit/risk 顺序异常 i1=${i1} i2=${i2}`);
  });
  console.log(`  旁证：改后 data.js 的**序列化文本**里 "audit" 在 "risk" 之前的记录数 = ${orderOk}/${starts.length}`);
}
