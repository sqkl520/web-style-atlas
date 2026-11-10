// V4c：复核执行 C 的「首句最长 34 字」主张 + 逐案 390 档行高增量
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEL = join(HERE, '..', '..', 'prototypes', '_selection');
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sb, { filename: 'data.js' });
const S = sb.window.SCHEMES;

// HEAD app.js 里 family 的切法
const headApp = readFileSync(join(HERE, 'frozen', 'app.HEAD.js'), 'utf8');
const m = headApp.match(/family[^\n]*slice\(0,\s*(\d+)\)/);
console.log(`HEAD 的 family 截断长度: ${m ? m[1] : '未找到'}`);

// 首句：以「。」「；」切
const rows = S.map((s) => {
  const fam = s.family || '';
  const first = fam.split(/[。；]/)[0];
  return { id: s.id, famLen: fam.length, firstLen: first.length, first };
});
const byFirst = [...rows].sort((a, b) => b.firstLen - a.firstLen);
console.log('\n=== family 首句长度 Top 8 ===');
byFirst.slice(0, 8).forEach((r) => console.log(`  ${r.id}  首句 ${r.firstLen} 字  family 全长 ${r.famLen}  「${r.first.slice(0, 50)}…」`));
const over34 = rows.filter((r) => r.firstLen > 34);
console.log(`\n首句 > 34 字的案: ${over34.length}/30  ${over34.map((r) => `${r.id}(${r.firstLen})`).join(' ')}`);
console.log(`首句最长: ${byFirst[0].id} = ${byFirst[0].firstLen} 字`);
console.log(`family 全长区间: ${Math.min(...rows.map((r) => r.famLen))}–${Math.max(...rows.map((r) => r.famLen))}`);

// 390 档逐案增量
const now = JSON.parse(readFileSync(join(HERE, 'v4b-NOW-390.json'), 'utf8'));
const head = JSON.parse(readFileSync(join(HERE, 'v4b-HEAD-390.json'), 'utf8'));
const d = now.map((n) => {
  const h = head.find((x) => x.id === n.id);
  return { id: n.id, now: n.rowH, head: h.rowH, delta: +(n.rowH - h.rowH).toFixed(1) };
});
const ups = d.filter((x) => x.delta > 0.5);
console.log(`\n=== 390 档逐案行高增量 ===`);
console.log(`  30 案总高: HEAD ${head.reduce((a, x) => a + x.rowH, 0).toFixed(1)} → NOW ${now.reduce((a, x) => a + x.rowH, 0).toFixed(1)}`);
const hSum = head.reduce((a, x) => a + x.rowH, 0), nSum = now.reduce((a, x) => a + x.rowH, 0);
console.log(`  总变化: ${(nSum - hSum).toFixed(1)}px = ${((nSum / hSum - 1) * 100).toFixed(2)}%`);
console.log(`  涨高的案: ${ups.length}/30，区间 ${Math.min(...ups.map((x) => x.delta))}~${Math.max(...ups.map((x) => x.delta))}px`);
console.log(`  变矮的案: ${d.filter((x) => x.delta < -0.5).length}/30  ${d.filter((x) => x.delta < -0.5).map((x) => `${x.id}(${x.delta})`).join(' ')}`);
console.log(`  不变的案: ${d.filter((x) => Math.abs(x.delta) <= 0.5).length}/30`);
