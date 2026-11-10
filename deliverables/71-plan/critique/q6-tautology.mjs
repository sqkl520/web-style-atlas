// Q6 探针：check-twolines.mjs 的 R2/R3/R4 是不是构造恒真式？
//
// 论证：collect-schemes.mjs:483-487 的构造顺序是
//     const pal = [];
//     if (rec.bg) pal.push(rec.bg);          // → pal[0] === bg，必然
//     if (rec.primary …) pal.push(rec.primary);  // → pal[1] === primary，必然
//     rec.palette = pal;
// 然后 check-twolines 的 R3 拿 pal[1] 去比 primary —— 它在赋值那一刻就相等了。
//
// 本探针不用推理，直接做「变异测试」：
//   ① 注入一个「一致的错」（palette[1] 和 primary 同时改成同一个错值）→ 闸门会报吗？
//   ② 注入一个「不一致的错」（只改 palette[1]）→ 闸门会报吗？
// 如果 ① 报不出来，那 §2 那 5 案的错（历史上就是一致的错）它也报不出来。
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const P = join(ROOT, 'prototypes');

const src = readFileSync(join(P, '_build/collect-schemes.mjs'), 'utf8');
console.log('=== 构造顺序（collect-schemes.mjs 原文）===\n');
const lines = src.split(/\r?\n/);
const at = lines.findIndex((l) => /const pal = \[\]/.test(l));
for (let i = at; i < at + 6 && i < lines.length; i++) console.log(`${String(i + 1).padStart(4)}: ${lines[i]}`);

console.log('\n以上 4 行就是证据：pal[0] 被赋成 bg，pal[1] 被赋成 primary，');
console.log('然后 check-twolines 的 R2/R3 拿 pal[0]/pal[1] 去比 bg/primary —— 恒等。');

// 直接对 check-twolines.mjs 的断言做逻辑等价复核
const chk = readFileSync(join(P, '_build/check-twolines.mjs'), 'utf8');
console.log('\n=== check-twolines.mjs 的断言 ===\n');
for (const m of chk.matchAll(/\/\* (R\d[^*]*)\*\//g)) console.log('  ' + m[1].trim());
console.log('\n  R2: dPal[0] !== bg  → FAIL      但 dPal[0] 由 pal.push(rec.bg) 决定');
console.log('  R3: dPal[1] !== pri → FAIL      但 dPal[1] 由 pal.push(rec.primary) 决定');
console.log('  R4: bg/pri 不在 dPal → FAIL      同上，构造保证在');

// 变异测试：模拟闸门逻辑
function gate(rec) {
  const dPal = rec.palette.map((h) => h.toUpperCase());
  const bg = String(rec.bg || '').toUpperCase();
  const pri = String(rec.primary || '').toUpperCase();
  const fails = [];
  if (dPal[0] && bg && dPal[0] !== bg) fails.push('R2 palette[0]!=bg');
  if (dPal[1] && pri && dPal[1] !== pri) fails.push('R3 palette[1]!=primary');
  if (bg && !dPal.includes(bg)) fails.push('R4 bg missing');
  if (pri && !dPal.includes(pri)) fails.push('R4 primary missing');
  return fails;
}

// 读真实的 data.js，取一案来变异
const win = { window: {} };
new Function('window', readFileSync(join(P, '_selection/data.js'), 'utf8'))(win.window);
const base = win.window.SCHEMES.find((s) => s.id === 'S05');
console.log('\n=== 变异测试（用 S05 做样本）===\n');
console.log('原始:      palette[1]=' + base.palette[1] + '  primary=' + base.primary + '  → 闸门: ' + (gate({ ...base }).join(', ') || '全绿'));

// ① 一致的错：两者同时改成同一个假值（模拟历史上"两个都错到同一个答案"）
const consistentWrong = { ...base, palette: [base.palette[0], '#123456', ...base.palette.slice(2)], primary: '#123456' };
const r1 = gate(consistentWrong);
console.log('一致的错:  palette[1]=#123456  primary=#123456  → 闸门: ' + (r1.join(', ') || '全绿 ← 报不出来'));
console.log('           注意：#123456 根本不是主色，但闸门认为一切正常。');

// ② 不一致的错：只改一个
const inconsistent = { ...base, palette: [base.palette[0], '#123456', ...base.palette.slice(2)] };
const r2 = gate(inconsistent);
console.log('不一致的错: palette[1]=#123456  primary=' + base.primary + '  → 闸门: ' + (r2.join(', ') || '全绿'));

console.log('\n=== 结论 ===');
console.log('闸门能抓「不一致的错」，但抓不到「一致的错」。');
console.log('而 §2 实测的 5 案（S02/S05/S07/S09/S10）正是一致的错：');
console.log('  primary 抓错了 → palette[1] 跟着用同一个错值 → R3 比两个相等的东西 → 绿。');
console.log('\n一个恒真的闸门比没有闸门更危险：它会被写进 README 当作「已验证」。');
process.exit(0);
