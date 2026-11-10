// 逐条核对 L7-11 的自述：每条的"改前值"在仓库历史里到底存在过没有。
import { execFileSync } from 'node:child_process';

const git = (args) => { try { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/^\uFEFF/, ''); } catch (e) { return ''; } };
const FIRST = 'caefdd9';
const HEAD = git(['rev-parse', '--short', 'HEAD']).trim();
const FILES = ['style.css', 'index.html', 'wizard.css', 'wizard.html', 'app.js'].map((f) => 'prototypes/_selection/' + f);

const readAt = (rev, f) => git(['show', `${rev}:${f}`]);
const listAt = (rev) => git(['ls-tree', '--name-only', `${rev}:prototypes/_selection`]).trim().split(/\r?\n/);

console.log(`HEAD=${HEAD}  FIRST=${FIRST}`);
console.log('首个提交 _selection 内容:', listAt(FIRST).join(' '));

// 条 1：三级文字对比度 4.2:1 → 5.6:1；#6f6c64 是否真的存在过？
console.log('\n[条1] #6f6c64 出现位置（HEAD 与 FIRST）');
for (const rev of [FIRST, HEAD]) {
  for (const f of FILES) {
    const s = readAt(rev, f); if (!s) continue;
    s.split(/\r?\n/).forEach((l, i) => { if (/#6f6c64/i.test(l)) console.log(`  ${rev} ${f.split('/').pop()}:${i + 1}  ${l.trim().slice(0, 90)}`); });
  }
}
const c3 = (() => {
  const s = readAt(FIRST, 'prototypes/_selection/style.css');
  return s.match(/--ink-3:\s*#[0-9a-f]{6}/i)?.[0];
})();
console.log(`  FIRST 的 --ink-3 = ${c3}  → 首个提交就不是 #6f6c64`);

// 条 2：11/12px 共 115 处？
console.log('\n[条2] 11/12px 计数（逐文件，含内联样式与 app.js）');
for (const rev of [FIRST, HEAD]) {
  let tot11 = 0, tot12 = 0, totvar = 0;
  for (const f of FILES) {
    const s = readAt(rev, f); if (!s) continue;
    const n11 = (s.match(/font-size\s*:\s*11px/g) || []).length;
    const n12 = (s.match(/font-size\s*:\s*12px/g) || []).length;
    const nv = (s.match(/--s-1[12]\b/g) || []).length;
    if (n11 || n12 || nv) console.log(`  ${rev} ${f.split('/').pop()}: 11px=${n11} 12px=${n12} --s-11/12=${nv}`);
    tot11 += n11; tot12 += n12; totvar += nv;
  }
  console.log(`  => ${rev} 合计 font-size:11px=${tot11} font-size:12px=${tot12}（自述说 115 处）`);
}

// 条 3：3.8vw
console.log('\n[条3] 3.8vw 是否曾在 style.css 里作为生效值');
for (const rev of [FIRST, HEAD]) {
  const s = readAt(rev, 'prototypes/_selection/style.css');
  const eff = s.split(/\r?\n/).filter((l) => /3\.8vw/.test(l) && !/^\s*(\/\*|\*)/.test(l));
  console.log(`  ${rev}: 非注释行含 3.8vw = ${eff.length}  ${eff.join(' | ').slice(0, 120)}`);
}

// 条 4：kicker 是否全大写 11px
console.log('\n[条4] .mast-kicker 在 FIRST / HEAD 的完整声明');
for (const rev of [FIRST, HEAD]) {
  const s = readAt(rev, 'prototypes/_selection/style.css');
  const i = s.indexOf('.mast-kicker');
  console.log(`  ${rev}: ${i >= 0 ? s.slice(i, s.indexOf('}', i) + 1).replace(/\s+/g, ' ') : '(无)'}`);
  console.log(`  ${rev} 全文 text-transform: uppercase 出现次数 = ${(s.match(/text-transform\s*:\s*uppercase/g) || []).length}`);
}

// 条 5：1px → 2px 是否真的发生过（逐提交的 2px/1px 比）
console.log('\n[条5] 单边边线宽度分布（逐提交，按时间正序）');
const revs = git(['log', '--reverse', '--format=%h|%ad', '--date=short', '--', 'prototypes/_selection/style.css']).trim().split(/\r?\n/);
for (const r of revs) {
  const [rev, d] = r.split('|');
  const s = readAt(rev, 'prototypes/_selection/style.css');
  const st = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const one = (st.match(/border-(top|bottom|left|right)\s*:\s*(0?\.5|1)px/g) || []).length;
  const two = (st.match(/border-(top|bottom|left|right)\s*:\s*2px/g) || []).length;
  console.log(`  ${d} ${rev}  单边1px=${one}  单边2px=${two}`);
}

// 条 6：.shot 的 1px 描边
console.log('\n[条6] .shot 的 outline/border 史');
for (const rev of [FIRST, HEAD]) {
  const s = readAt(rev, 'prototypes/_selection/style.css');
  const lines = s.split(/\r?\n/);
  lines.forEach((l, i) => { if (/^\.shot\b|^\.shot\s|\.shot img|\.shot figcaption/.test(l.trim()) || (/\.shot/.test(l) && /outline|border/.test(l))) console.log(`  ${rev}:${i + 1}  ${l.trim().slice(0, 100)}`); });
}
console.log('  HEAD 剩余 outline:1px 的地方：');
const hs = readAt(HEAD, 'prototypes/_selection/style.css');
hs.split(/\r?\n/).forEach((l, i) => { if (/outline\s*:\s*1px/.test(l)) console.log(`    L${i + 1}  ${l.trim().slice(0, 90)}`); });

// 条 7：.bar sticky
console.log('\n[条7] .bar 是否曾 sticky');
for (const r of revs) {
  const [rev] = r.split('|');
  const s = readAt(rev, 'prototypes/_selection/style.css');
  const i = s.indexOf('.bar {');
  const seg = i >= 0 ? s.slice(i, s.indexOf('}', i) + 1).replace(/\s+/g, ' ') : '';
  const j = s.indexOf('.bar{');
  const seg2 = j >= 0 ? s.slice(j, s.indexOf('}', j) + 1).replace(/\s+/g, ' ') : seg;
  const block = seg || seg2;
  if (/sticky/.test(block)) console.log(`  ${rev} STICKY: ${block.slice(0, 120)}`);
}
console.log('  (无输出 = .bar 在任何提交里都不是 sticky；sticky 一直只有 .rail 与 .detail-head)');
