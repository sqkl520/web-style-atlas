/* 打印某案 audit / risk 全文与标记位置。用法：node _cut/show.mjs <data.js> <S13> */
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(process.argv[2], 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const id = process.argv[3] || 'S13';
const r = sandbox.window.SCHEMES.find((x) => x.id === id);
const a = String(r.audit || '');
console.log(`=== ${id} audit len=${a.length} ===`);
console.log(a);
console.log(`\n=== markers ===`);
for (const m of ['反套路改造三指标', '打勾', '供 V-11', '反套路']) {
  const idx = a.indexOf(m);
  console.log(`${JSON.stringify(m)} indexOf = ${idx}`);
}
const cut = a.indexOf('反套路改造三指标');
if (cut >= 0) {
  console.log(`\n=== head (0..${cut}) len=${cut} ===`);
  console.log(JSON.stringify(a.slice(0, cut)));
  console.log(`\n=== head trimmed len=${a.slice(0, cut).trimEnd().length} ===`);
  console.log(a.slice(0, cut).trimEnd());
}
console.log(`\n=== ${id} risk len=${String(r.risk || '').length} ===`);
