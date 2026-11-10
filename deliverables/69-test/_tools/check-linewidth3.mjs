// 精确检查 v3：处理 "0.6/1.2/2.4px" 这种只给最后一个数字带 px 的写法。
// 规则：在机制句里找到线宽类关键词后 24 字符内的所有数字（含 a/b/c 斜杠串联），
// 只要该片段里出现过 px，就把这些数字都当作声称的线宽。
import { readFileSync } from 'node:fs';
const S = 'D:/Web/style/deliverables/69-test/_staging';
const idx = JSON.parse(readFileSync(`${S}/index.json`, 'utf8'));
const KEYS = ['线宽', '走线', '描边', '环线', '栏线', '线条', '亮线', '白带'];

const rows = [];
for (const r of idx) {
  const p = readFileSync(`${S}/prompt-${r.id}.txt`, 'utf8');
  const lines = p.split('\n');
  const mech = lines.find((l) => l.startsWith('这个风格的签名动作')) || '';
  const lwLine = lines.find((l) => l.startsWith('5. 线宽')) || '';
  const lwPx = [...new Set((lwLine.match(/[\d.]+px/g) || []))].map((s) => parseFloat(s));

  const segs = [];
  for (const k of KEYS) {
    let i = -1;
    while ((i = mech.indexOf(k, i + 1)) !== -1) {
      const seg = mech.slice(i, i + 26);
      if (!/px/.test(seg)) continue;
      // 抓 "0.35" 与 "0.6/1.2/2.4px" 两种：先按斜杠串联块抓，再补单个
      const nums = [];
      const chainRe = /([\d.]+(?:\/[\d.]+)+)px/g;
      let m;
      while ((m = chainRe.exec(seg)) !== null) nums.push(...m[1].split('/').map(parseFloat));
      const singleRe = /([\d.]+)px/g;
      while ((m = singleRe.exec(seg)) !== null) {
        const v = parseFloat(m[1]);
        if (!nums.includes(v)) nums.push(v);
      }
      if (nums.length) segs.push({ key: k, seg: seg.replace(/\s+/g, ' '), px: nums });
    }
  }
  if (!segs.length) continue;
  const claimed = [...new Set(segs.flatMap((s) => s.px))];
  const outside = claimed.filter((x) => !lwPx.some((y) => Math.abs(x - y) < 0.02));
  rows.push({ id: r.id, claimed, lwPx, outside, segs });
}

console.log('机制句提到线宽类词并给 px 的案数 =', rows.length);
console.log('');
let bad = 0;
for (const r of rows) {
  const flag = r.outside.length ? '✗ 冲突' : '✓ 一致';
  if (r.outside.length) bad++;
  console.log(`${r.id}  ${flag}   机制句 ${JSON.stringify(r.claimed)}  线宽行 ${JSON.stringify(r.lwPx)}  越界 ${JSON.stringify(r.outside)}`);
  for (const s of r.segs) console.log(`      [${s.key}] …${s.seg}`);
}
console.log('');
console.log(`合计 ${bad}/${rows.length} 案冲突`);
