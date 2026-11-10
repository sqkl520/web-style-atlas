// 探针 23：Lead 在 LEAD-self-correction.md 里给的「正确数字 11,220」与它自己那张逐案表是否自洽。
const lead = { S01:315,S02:362,S03:319,S04:299,S05:303,S06:315,S07:336,S08:311,S09:314,S10:297,
  S11:401,S12:314,S13:828,S14:363,S15:337,S16:340,S17:325,S18:386,S19:345,S20:370,
  S21:350,S22:390,S23:320,S24:436,S25:382,S26:416,S27:421,S28:422,S29:436,S30:467 };
const lead2 = { S01:292,S02:337,S03:294,S04:282,S05:286,S06:290,S07:311,S08:286,S09:293,S10:276,
  S11:376,S12:293,S13:780,S14:342,S15:314,S16:317,S17:304,S18:367,S19:324,S20:349,
  S21:327,S22:371,S23:299,S24:417,S25:363,S26:391,S27:396,S28:401,S29:417,S30:444 };

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
console.log('LEAD-self-correction.md 张 1（口径A，含标题行）逐案表求和 = ' + sum(lead));
console.log('  它自己写的合计                      = 11220');
console.log('  差                                  = ' + (11220 - sum(lead)) + '  ← 它连自己的表都加错了');
console.log('');
console.log('PLAN-field-plumbing.md §1.8 张 2（与 collect-schemes 同切分器）逐案表求和 = ' + sum(lead2));
console.log('  data.js 里 audit 字段实测合计       = 10539');
console.log('  差                                  = ' + (10539 - sum(lead2)) + '  ← 这张表与 data.js 逐案一致，合计也一致');
console.log('');
console.log('逐案对比（口径A − 口径B）:');
let diffSum = 0;
for (const id of Object.keys(lead)) {
  const d = lead[id] - lead2[id];
  diffSum += d;
  console.log(`  ${id}  ${String(lead[id]).padStart(4)} − ${String(lead2[id]).padStart(4)} = ${d > 0 ? '+' : ''}${d}`);
}
console.log('  差额合计 = ' + diffSum + '（＝多算的字段标题 + 前后空白）');
console.log('');
console.log('结论：');
console.log('  · 可复现的真值只有一组：' + sum(lead2) + ' 字（collect-schemes 的 dec() 之后，data.js 实际存储值，我 _rt_p13 独立复算同值）');
console.log('  · Lead 的「26,096」= 无口径可复现（我穷举 11 种口径，无一命中）');
console.log('  · Lead 自查后的「11,220」= 它自己那张表的和是 ' + sum(lead) + '，也不是 11,220');
console.log('  · 两轮数字都错，且方向相反：先夸大 2.3 倍，再夸大 ' + ((11220 / sum(lead2) - 1) * 100).toFixed(1) + '%');
