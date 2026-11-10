// 量化 check-docs 的「闸门达标数」断言有多少句式它看不见。
// 病根：nums/schemes 用 GATE_TAIL 把一类句子「转交」给 nums/gate，
//       而 nums/gate 的正则只认三种固定语序 —— 转交给了看不见的检查器。
import { readFileSync } from 'node:fs';

const RE1 = /([\d]{1,3})\s*(?:个闸门 FAIL=0|pass(?:es)? the gate with FAIL\s*=?\s*0|案 FAIL=0)/gi;
const RE2 = /FAIL\s*=\s*0[^\n]{0,20}?([\d]{1,3})\s*(?:案|schemes)/gi;
const GATE_TAIL = /^\s*(?:pass|passed|passes|passing|达标|at\s+FAIL|机械闸门|闸门|FAIL)/i;
const NUM = '(\d[\d,]{0,5}|[〇零一二两三四五六七八九十百廿卅卌]{1,6})';
const UNIT = '(?:个设计方案|个可运行的原型|个可运行原型|个方案(?!的)|个案(?!子)|个原型|design\s+schemes?|runnable\s+prototypes?|schemes?|prototypes?)';
const RESCHEMES = new RegExp(NUM + '\s*' + UNIT, 'g');

for (const doc of ['README.md', 'README-EN.md']) {
  const L = readFileSync(doc, 'utf8').split('\n');
  console.log('\n========== ' + doc + ' ==========');
  let seen = 0, blind = 0;
  L.forEach((line, i) => {
    // 这一行是否在讲「闸门达标数」？用宽判据找候选
    const looksGate = /FAIL\s*=?\s*0/i.test(line) && /(\d{1,3})\s*(案|个|prototypes|schemes)/i.test(line);
    if (!looksGate) return;
    const hit1 = [...line.matchAll(RE1)].map((m) => m[0]);
    const hit2 = [...line.matchAll(RE2)].map((m) => m[0]);
    // 这一行是否被 nums/schemes 的 GATE_TAIL 转交？（即含数字+UNIT 且后面跟 GATE_TAIL）
    let handed = [];
    for (const m of line.matchAll(RESCHEMES)) {
      const tail = line.slice(m.index + m[0].length, m.index + m[0].length + 40);
      if (GATE_TAIL.test(tail)) handed.push(m[0].trim());
    }
    const total = hit1.length + hit2.length;
    if (total === 0) {
      blind++;
      console.log('\n  ✗ 第 ' + (i + 1) + ' 行 —— 两条正则都看不见，但它在讲达标数：');
      console.log('     ' + line.trim().slice(0, 150));
      if (handed.length) console.log('     ⚠️ nums/schemes 把它转交给了 nums/gate：' + handed.join(' / ') + '  ← 转交后无人接手');
    } else {
      seen++;
    }
  });
  console.log('\n  断言能看见的句子: ' + seen + ' 行；看不见的: ' + blind + ' 行');
}
