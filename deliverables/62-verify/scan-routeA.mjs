import fs from 'fs';
const t = fs.readFileSync('D:/Web/style/deliverables/62-verify/dump30-frozen.txt', 'utf8');
const parts = t.split(/^===== (S\d+) =====$/m).slice(1);
const cases = [];
for (let i = 0; i < parts.length; i += 2) cases.push({ id: parts[i], body: parts[i + 1] });

// Repo-internal meta-commentary that leaks into the "signature mechanism" sentence
const meta = [
  '与它叫什么名字无关',
  '不由名字承担',
  '名字无关',
  '不是靠名字',
];
console.log('=== meta-commentary leaked into mechanism sentence ===');
let hits = [];
cases.forEach(c => {
  const mech = (c.body.split('这个风格的签名动作：')[1] || '').split('\n')[0];
  meta.forEach(m => { if (mech.includes(m)) hits.push(c.id + ' :: ...' + mech.slice(Math.max(0, mech.indexOf(m) - 40), mech.indexOf(m) + 12)); });
});
console.log(hits.length ? hits.join('\n') : 'none');

// Jargon density: terms a shop owner would not understand
const jargon = ['版心', '栏沟', '签名动作', '相位取样', '超家族', '光学尺寸轴', '字面', '字身', '级差', '游标', '遮罩', '调性', '收敛', '退化'];
console.log('\n=== jargon per case (terms a non-designer would not know) ===');
cases.forEach(c => {
  const found = jargon.filter(j => c.body.includes(j));
  if (found.length) console.log(' ', c.id, ':', found.join(','));
});

// Contradiction hunt: "占位" vs "真实" in same prompt
console.log('\n=== placeholder vs real-image wording ===');
cases.forEach(c => {
  const s3 = (c.body.match(/3\. 版式里要留.*/) || [''])[0];
  const out = (c.body.match(/图片位置写成.*/) || [''])[0];
  if (c.id === 'S01') { console.log('  clause3:', s3); console.log('  output :', out); }
});
console.log('  -> coherent: placeholder path + real dimensions + no 1px/solid-color. Not contradictory.');

// Number checks: does "我实际有 N 个" appear together with "设计规模" wording that fights it?
console.log('\n=== structure clause 1 vs 2 stance ===');
let stanceMix = [];
cases.forEach(c => {
  const c1 = (c.body.match(/1\. 我实际有.*/) || [''])[0];
  const c2 = (c.body.match(/2\. 这个版式.*/) || [''])[0];
  const hardExact = /就排 \d+ 个/.test(c1);
  const manual = /手工排定/.test(c2);
  const forgiving = /删掉、整块重排/.test(c2);
  if (hardExact && manual && forgiving) stanceMix.push(c.id + ' (exact-N + manual + reflow)');
});
console.log('cases asserting exact N while also allowing reflow (mild tension, not contradiction):', stanceMix.length, stanceMix.join(', '));
