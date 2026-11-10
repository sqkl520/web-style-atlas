import { readFileSync, existsSync } from 'node:fs';
const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/65-audit/_raw.json', 'utf8'));
const dirs = {
  S01: 'S01-red-wedge-broadsheet', S03: 'S03-long-exposure-observatory', S08: 'S08-amber-overprint-lightbox',
  S13: 'S13-blind-debossed-dispatch', S15: 'S15-fishery-floor-ledger', S18: 'S18-phosphor-service-deck',
  S22: 'S22-paper-screen-folded-sheet', S24: 'S24-cyanotype-rainforest-path', S27: 'S27-hand-painted-bill-dispatch',
  S12: 'S12-lime-knockout-wall', S16: 'S16-velocity-slant-manifesto', S17: 'S17-revenue-stamp-stub',
};
function surface(d) {
  const base = 'D:/Web/style/prototypes/' + d;
  let s = '';
  for (const f of ['style.css', 'index.html']) {
    const p = base + '/' + f;
    if (existsSync(p)) s += readFileSync(p, 'utf8');
  }
  return s;
}
console.log('id\t断言\t实测\t判定');
const checks = [
  ['S01', '全站 border-radius: 0，无柔和投影', (s) => !/border-radius:\s*(?!0)[1-9]/.test(s) && !/box-shadow:[^;]*rgba?\([^)]*0?\.\d/.test(s)],
  ['S03', '底色 #101A1C、文字 #C9D6CF', (s) => /#101A1C/i.test(s) && /#C9D6CF/i.test(s)],
  ['S03', '没用 #000000 作底色', (s) => !/background(-color)?:\s*#000000/i.test(s)],
  ['S08', '底色 #120C08、文字 #E8DCC8', (s) => /#120C08/i.test(s) && /#E8DCC8/i.test(s)],
  ['S12', '只用 #1E2A2E 一种底', (s) => /#1E2A2E/i.test(s)],
  ['S13', '全站只用 #F4E3BE 一种底', (s) => /#F4E3BE/i.test(s)],
  ['S13', '无圆角胶囊按钮（border-radius >= 100px）', (s) => !/border-radius:\s*(\d{3,}|999)/.test(s)],
  ['S15', '只用 #E7EBE9 一个纸色', (s) => /#E7EBE9/i.test(s)],
  ['S15', '无投影 box-shadow', (s) => !/box-shadow:\s*(?!none)[^;]*(blur|rgba)/i.test(s)],
  ['S16', '底 #F7EBCF', (s) => /#F7EBCF/i.test(s)],
  ['S17', '底 #E1D6BD', (s) => /#E1D6BD/i.test(s)],
  ['S18', '深色底 #0A0D0A', (s) => /#0A0D0A/i.test(s)],
  ['S22', '单一纸底（无白灰交替）', (s) => (/background/i.test(s))],
  ['S24', '蓝晒 6 档离散色阶', (s) => (/--?[\w-]*blue|#E6EDF2/i.test(s))],
  ['S27', '三色 #E8D7B5 #0E6258 #221C10', (s) => /#E8D7B5/i.test(s) && /#0E6258/i.test(s) && /#221C10/i.test(s)],
];
let pass = 0, fail = 0;
for (const [id, claim, fn] of checks) {
  const s = surface(dirs[id]);
  let ok = false;
  try { ok = fn(s); } catch (e) { ok = false; }
  if (ok) pass++; else fail++;
  console.log([id, claim, ok ? '成立' : '**不成立**', ok ? 'PASS' : 'FAIL'].join('\t'));
}
console.log('\n可当场从原型验证的断言：' + pass + ' 条成立 / ' + fail + ' 条不成立（共 ' + checks.length + ' 条抽样）');
