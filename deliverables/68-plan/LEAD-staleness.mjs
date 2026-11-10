import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const GIT = 'D:\\Git\\cmd\\git.exe';
const git = (...a) => execFileSync(GIT, a, { encoding: 'utf8', maxBuffer: 64 << 20 });

// 报告的 at 是 2026-10-21T19:51:17Z = 2026-10-22 03:51 +0800
// 找出 report.json 之后，_selection 里被改过的文件，以及它们的改动量
console.log('=== report.json 提交 (1f30e7d) 之后，_selection 各文件被改次数 ===');
const files = ['app.js', 'style.css', 'index.html', 'prompt-copy.js', 'data.js', 'prompts.js', 'wizard.html', 'wizard.css', 'wizard.js'];
for (const f of files) {
  const p = `prototypes/_selection/${f}`;
  const n = git('log', '--oneline', '1f30e7d..HEAD', '--', p).trim().split('\n').filter(Boolean).length;
  const ds = git('log', '--format=', '--numstat', '1f30e7d..HEAD', '--', p)
    .trim().split('\n').filter(Boolean);
  let add = 0, del = 0;
  for (const l of ds) { const [a, d] = l.split('\t'); if (a !== '-') { add += +a; del += +d; } }
  console.log(`  ${f.padEnd(16)} 提交 ${String(n).padStart(2)} 次   +${add} / -${del} 行`);
}

console.log('\n=== 报告能反映的 vs 报告的"检查项" ===');
console.log('报告有的键: url, at, allow, viewports[].metrics{...}, findings, images');
console.log('报告 metrics.surfaces 覆盖: shadowStatic shadowOverlay gradientText hairlines outlinedBoxes dashed blurred textShadow cardRows');
console.log('报告 metrics.type 覆盖: familyCount sizeCount body{size,leading,contrast} monoProseShare smallText microLabels');
console.log('报告 metrics.page 覆盖: height screens words img realPictures horizontalOverflow brokenImages emoji');

console.log('\n=== 这些键在 app.js/style.css 改动后可能失效的具体项 ===');
// 用当前 CSS 重算几个报告里的值，对比
const css = readFileSync('prototypes/_selection/style.css', 'utf8');
const nc = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rep = JSON.parse(readFileSync('prototypes/_selection/.inspect/report.json', 'utf8'));

// 1) hairlines：报告说 0
const h1 = [...nc.matchAll(/border(?:-(?:top|bottom|left|right))?\s*:\s*(?:0?\.5|1)px/g)].length;
console.log(`  hairlines      报告 ${rep.viewports[0].metrics.surfaces.hairlines}  → 静态正则数 ${h1}`);

// 2) shadow：报告说 0
const sh = [...nc.matchAll(/box-shadow/g)].length;
console.log(`  box-shadow     报告 ${rep.viewports[0].metrics.surfaces.shadowStatic}  → 静态正则数 ${sh}`);

// 3) gradients：报告说 0
const gr = [...nc.matchAll(/gradient\(/g)].length;
console.log(`  gradients      报告 ${rep.viewports[0].metrics.surfaces.gradients}  → 静态正则数 ${gr}`);

// 4) body size / sizes
const sizes = [...new Set([...nc.matchAll(/--s-(\d+):\s*(\d+)px/g)].map(m => +m[2]))].sort((a, b) => a - b);
console.log(`  type sizes     报告 ${JSON.stringify(rep.viewports[0].metrics.type.sizes)}`);
console.log(`                 → token 定义 ${JSON.stringify(sizes)}`);

// 5) 屏幕数（报告 15.2 屏 @1440）
console.log(`  page screens   报告 ${rep.viewports[0].metrics.page.screens} 屏（page.height ${rep.viewports[0].metrics.page.height}）`);

console.log('\n=== 结论 ===');
console.log('report.json 的 metrics 是"某一次渲染的快照"。它不会被 check-stale 检查，');
console.log('而 _selection 的 6 个源文件在之后被改了上百行。');
