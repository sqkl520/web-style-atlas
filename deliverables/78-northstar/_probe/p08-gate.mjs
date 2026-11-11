// 探针 08：gate.failIds 明细 + warnIds 集合，判断 gate.fail 对 S31–S35 是否可信
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

console.log('id  fail  failIds                                   warn  warnIds');
for (const s of S) {
  if (s.gate.fail > 0 || s.id >= 'S30') {
    console.log(s.id, String(s.gate.fail).padStart(2),
      JSON.stringify(s.gate.failIds).padEnd(42),
      String(s.gate.warn).padStart(2), JSON.stringify(s.gate.warnIds));
  }
}

console.log('\n=== 全库 FAIL 规则频次 ===');
const fc = {};
for (const s of S) for (const f of s.gate.failIds || []) fc[f] = (fc[f] || 0) + 1;
console.log(JSON.stringify(fc, null, 1));

console.log('\n=== 全库 WARN 规则频次 ===');
const wc = {};
for (const s of S) for (const w of s.gate.warnIds || []) wc[w] = (wc[w] || 0) + 1;
console.log(JSON.stringify(wc, null, 1));

console.log('\n=== gate.at 与 data.js 生成时间 ===');
console.log('S31-35 gate.at:', S.filter(s => s.id >= 'S31').map(s => s.id + '=' + s.gate.at).join(' '));
