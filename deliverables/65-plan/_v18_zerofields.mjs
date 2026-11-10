// 裁决 4：三个零消费字段的实测复核
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));

// --- primary ---
let p1 = 0, p0 = 0, pbg = 0, pin = 0, bad = [];
for (const r of rows) {
  const pal = r.palette || [];
  if (r.primary === pal[1]) p1++;
  if (r.primary === pal[0]) p0++;
  if (r.primary === r.bg) pbg++;
  if (pal.includes(r.primary)) pin++;
  if (r.primary !== pal[1]) bad.push(r.id);
}
console.log('=== primary ===');
console.log('= palette[1]:', p1, '/30 ｜ = palette[0]:', p0, '｜ = bg:', pbg, '｜ ∈ palette:', pin);
console.log('不等 palette[1] 的案:', bad.length ? bad.join(' ') : '无');
const lens = rows.map((r) => (r.palette || []).length);
console.log('palette 长度分布:', JSON.stringify(lens.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {})));
console.log('若为「主色」造独立字段，等于重复打印的 HEX 数: 30 个（每案 1 个）');

// --- buttonText ---
const lum = (hex) => {
  const c = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const cr = (a, b) => { const L1 = lum(a), L2 = lum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05); };
let has = 0, ok = 0, wrong = [];
const dist = {};
for (const r of rows) {
  if (r.buttonText) { has++; dist[r.buttonText] = (dist[r.buttonText] || 0) + 1; }
  const pred = cr(r.primary, '#FFFFFF') >= cr(r.primary, '#111111') ? '#FFFFFF' : '#111111';
  if (r.buttonText) { if (pred === r.buttonText) ok++; else wrong.push(`${r.id}:实测${r.buttonText} 预测${pred}`); }
}
console.log('\n=== buttonText ===');
console.log('有值:', has, '/30  分布:', JSON.stringify(dist));
console.log('一条对比度规则推出:', ok, '/', has, ' 错例:', wrong.length ? wrong.join(', ') : '无');
// 补到 30/30 后 13 案的预测值
console.log('缺的 13 案与预测值:');
for (const r of rows.filter((x) => !x.buttonText)) {
  const pred = cr(r.primary, '#FFFFFF') >= cr(r.primary, '#111111') ? '#FFFFFF' : '#111111';
  console.log(`  ${r.id} primary=${r.primary} → ${pred} (vs白 ${cr(r.primary, '#FFFFFF').toFixed(2)} : vs黑 ${cr(r.primary, '#111111').toFixed(2)})`);
}
console.log('buttonText 出现在本案 palette 里的案数:', rows.filter((r) => r.buttonText && (r.palette || []).includes(r.buttonText)).length);

// --- scenesNo ---
let rebuilt = 0, suffix = 0, inScenes = 0, snChars = 0;
for (const r of rows) {
  if (r.scenes === (r.scenesYes || '') + '不适合：' + (r.scenesNo || '')) rebuilt++;
  if ((r.scenes || '').endsWith(r.scenesNo || '')) suffix++;
  if ((r.scenes || '').includes(r.scenesNo || '')) inScenes++;
  snChars += (r.scenesNo || '').length;
}
console.log('\n=== scenesNo ===');
console.log('scenes 可精确重建:', rebuilt, '/30 ｜ 是 scenes 后缀:', suffix, '/30 ｜ 是 scenes 子串:', inScenes, '/30 ｜ 字数', snChars);

// --- 搜索 hay 到底收了哪些字段 ---
const app = readFileSync(resolve('prototypes/_selection/app.js'), 'utf8');
const hayLine = app.split('\n').map((l, i) => ({ l, i: i + 1 })).filter((x) => /r\.errorCode, r\.threshold/.test(x.l) || /function match|hay\s*=/.test(x.l));
console.log('\n=== app.js 搜索 hay 定义 ===');
console.log(hayLine.map((x) => `L${x.i}: ${x.l.trim()}`).join('\n'));
const hay = app.match(/var hay = \[([\s\S]{0,600}?)\]/);
console.log('\nhay 字段列表:');
if (hay) console.log(hay[1].split('\n').map((s) => s.trim()).filter(Boolean).join(' '));
