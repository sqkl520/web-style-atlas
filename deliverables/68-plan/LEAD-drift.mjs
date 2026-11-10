import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const GIT = 'D:\\Git\\cmd\\git.exe';
function git(...args) {
  return execFileSync(GIT, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

console.log('=== 1. 报告的时间 vs 本轮 HEAD 的时间 ===');
const rep = JSON.parse(readFileSync('prototypes/_selection/.inspect/report.json', 'utf8'));
console.log('report.at          :', rep.at);
console.log('report.url         :', rep.url);
const logRep = git('log', '-1', '--format=%h %ai %s', '--', 'prototypes/_selection/.inspect/report.json').trim();
console.log('report.json 最后提交:', logRep);
const logSelCss = git('log', '-1', '--format=%h %ai %s', '--', 'prototypes/_selection/style.css').trim();
console.log('style.css 最后提交  :', logSelCss);
const logApp = git('log', '-1', '--format=%h %ai %s', '--', 'prototypes/_selection/app.js').trim();
console.log('app.js 最后提交     :', logApp);

console.log('\n=== 2. report.json 之后，_selection 被改了多少次 ===');
const n = git('log', '--oneline', '--since=2026-10-21T19:51:17', '--', 'prototypes/_selection/').trim().split('\n').filter(Boolean);
console.log('提交数:', n.length);
n.forEach(l => console.log('  ' + l));

console.log('\n=== 3. 报告里的关键 surfaces 指标 vs 现在 lint 实测 ===');
const s = rep.viewports.map(v => ({ w: v.width, hl: v.metrics.surfaces.hairlines, sh: v.metrics.surfaces.shadowStatic, gr: v.metrics.surfaces.gradients, ob: v.metrics.surfaces.outlinedBoxes }));
for (const x of s) console.log(`  ${x.w}px: hairline=${x.hl} shadowStatic=${x.sh} gradients=${x.gr} outlinedBoxes=${x.ob}`);
console.log('  现在 lint 报: hairline 9 / shadow 2 / gradient 1  ← 漂移');

console.log('\n=== 4. h1 尺寸的矛盾：报告说 74px(5.1vw)，本轮修复注释说改前是 56px(4vw) ===');
for (const v of rep.viewports) {
  console.log(`  ${v.width}px: hero.size=${v.metrics.hero.size} vw=${v.metrics.hero.vw}`);
}
console.log('  → 若改前真是 clamp(30px,4vw,56px)，1440 档应得 56px，不是 74px');
console.log('  → 说明 2026-10-22 时 .mast h1 用的是 5.2vw 那套（=--s-h1 的值），后来被改成了 4vw');

console.log('\n=== 5. style.css 里 .mast h1 的演变史 ===');
const hist = git('log', '-p', '--follow', '--format=%h %ai %s', '--', 'prototypes/_selection/style.css');
// 只抓含 mast h1 附近 font-size 的 diff 片段
const blocks = hist.split(/\n(?=[0-9a-f]{7} \d{4}-)/);
let shown = 0;
for (const b of blocks) {
  if (/mast h1|--s-h1/.test(b)) {
    const first = b.split('\n')[0];
    console.log('  ---', first);
    const lines = b.split('\n').filter(l => /^[-+].*(font-size|--s-h1|clamp)/.test(l));
    lines.slice(0, 8).forEach(l => console.log('     ' + l.slice(0, 130)));
    if (++shown >= 5) break;
  }
}
if (!shown) console.log('  (无匹配)');

console.log('\n=== 6. check-stale 会检查 _selection 吗 ===');
const cs = readFileSync('prototypes/_build/check-stale.mjs', 'utf8');
console.log('  提到 _selection:', /_selection/.test(cs));
console.log('  提到 templates :', /templates/.test(cs));
const m = /readdirSync\([^)]*\)/.exec(cs);
console.log('  目录选取代码:', m ? m[0] : '?');
