/* 探针：build-prompts.mjs 那两个正则的**潜在**脆弱点（不是本轮改动造成的，但与本轮键序话题相邻）。
 *
 * 正则（照抄 build-prompts.mjs:44 / :78）：
 *   /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g
 *   /"id":\s*"(S\d{2})"[\s\S]*?"landing":\s*"((?:[^"\\]|\\.)*)"/g
 *
 * 它靠 `[\s\S]*?` 惰性跨过本条记录里的**所有中间键**去够 "risk"。
 * 本轮我把 audit 放在 risk 之前，中间键就从 0 个变成了 1 个 —— 实测没问题（30/30 精确）。
 * 但「跨过中间键」这个机制本身有一个边界：**当某条记录缺这个键时，正则不会失败，它会
 * 安静地拿了下一条记录的值**。那正是「静默失配」，值得留一份可复现的证据。 */
import fs from 'node:fs';

const RISK_RE = /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g;
const extract = (src) => {
  const out = {};
  let m;
  RISK_RE.lastIndex = 0;
  while ((m = RISK_RE.exec(src))) out[m[1]] = m[2];
  return out;
};

const mk = (recs) => 'window.SCHEMES = ' + JSON.stringify(recs, null, 1) + ';';
const full = [
  { id: 'S01', audit: 'AAA1', risk: 'RISK-1', landing: 'L1' },
  { id: 'S02', audit: 'AAA2', risk: 'RISK-2', landing: 'L2' },
];

console.log('═══ 正常两案 ═══');
console.log(JSON.stringify(extract(mk(full))));

console.log('\n═══ 把 S01 的 risk 键整个删掉 ═══');
const broken = JSON.parse(JSON.stringify(full));
delete broken[0].risk;
const got = extract(mk(broken));
console.log('  抽到 = ' + JSON.stringify(got));
console.log(`  S01 的 risk = ${JSON.stringify(got.S01)}`);
console.log('  判定：' + (got.S01 === 'RISK-2'
  ? '✗ 静默失配 —— S01 拿到了 S02 的值，build-prompts 不会报错，提示词里会印出别人的风险禁令'
  : '✓ 未发生跨条'));

console.log('\n═══ 把 S01 的 risk 改成空串（键还在）═══');
const empty = JSON.parse(JSON.stringify(full));
empty[0].risk = '';
const got2 = extract(mk(empty));
console.log('  抽到 = ' + JSON.stringify(got2));
console.log('  判定：' + (got2.S01 === '' ? '✓ 正确取空（键存在即可，空值安全）' : '✗ 异常'));

console.log('\n═══ 对照：audit 的值里含 "risk" 这个词 ═══');
const tricky = [{ id: 'S01', audit: '这里提到 risk 与 landing 两个词', risk: 'RISK-1', landing: 'L1' }];
const got3 = extract(mk(tricky));
console.log('  抽到 = ' + JSON.stringify(got3) + '  判定：' + (got3.S01 === 'RISK-1' ? '✓ 安全（裸词不构成 "risk": 键形态）' : '✗'));

console.log('\n═══ 结论 ═══');
console.log('  本轮改动（audit 在 risk 之前）不触发上面任何一种：实跑 30/30 逐字正确（见 regex-probe.mjs §B/§D）。');
console.log('  但「记录缺键 ⇒ 静默拿邻居的值」这条**先于我的改动就存在**，');
console.log('  触发条件是「某案 risk 或 landing 字段整个缺失」，而 collect-schemes 永远写这两个键（空串也算有），');
console.log('  所以当前不可达。写在这里是因为下一个改生成器的人可能会「顺手」把空值键省掉。');
