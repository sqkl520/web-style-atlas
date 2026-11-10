/* S07 的稳定性来源之二：buildGhost() 在字体加载完成前测了矩形。
 *
 * 证据（m17）：
 *   before#0 vs before#1  → 47 处差异，全部在 .ghost 的 <text> 上
 *      "142.05,521.78,1239.95,634.03" → "142.00,524.07,1240.00,632.00"
 *      高度 21.63 → 20.00（= 回退字体的 ascent/descent 与真正字体的差）
 *   after#0 vs after#1    → 0 处
 * 两侧都出现/都不出现，说明**与本次改动无关**，是 S07 自己的加载时序：
 *   buildGhost() 用 getBoundingClientRect() 量 .t 的位置，再把结果烧进 SVG 的 x/y；
 *   若那一刻 webfont 还没换上，量到的是回退字体的行盒，之后不会自动重算。
 *   （app.js 只在 window.resize 里重建：`addEventListener('resize', () => buildGhost(0))`。）
 *
 * 本脚本验证：在**两侧同样**补一次 resize（让 buildGhost 用已加载的字体重量一遍），
 * 几何是否就稳定了。若稳定，A/B 就采用这个步骤 —— 并且这是对页面真实行为的利用，
 * 不是给它打补丁（用户拖动窗口就会触发同一条路径）。
 */
import { serve } from './lib-exec.mjs';
import { Browser, sleep } from './pix-lib.mjs';

const srvB = await serve('D:/Web/style/deliverables/69-exec/_before-tree');
const srvA = await serve('D:/Web/style');
const browser = await Browser.launch({ width: 1440, height: 900 });

const GHOST = `(() => [...document.querySelectorAll('.ghost text')].map(t => {
  const r = t.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height].map(v => v.toFixed(2)).join(',');
}).join(' | '))()`;

async function prep(url, doResize) {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.setViewport({ width: 1440, height: 900, dsf: 1, mobile: false });
  await page.goto(url, { timeoutMs: 30000, settleMs: 900 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  await sleep(1400);
  await page.eval(`(async () => { let n=0; while(n++<150){ if(!document.documentElement.classList.contains('loading')) return true; await new Promise(r=>setTimeout(r,100)); } return false; })()`);
  if (doResize) {
    // 与用户拖窗口等价：app.js 的 resize 处理器会 buildGhost(0) 重测
    await page.eval(`window.dispatchEvent(new Event('resize'))`);
    await sleep(500);
  }
  const g1 = await page.eval(GHOST);
  await page.close();
  return g1;
}

for (const doResize of [false, true]) {
  console.log(`\n########## resize 补齐 = ${doResize}`);
  for (const [name, srv, dir] of [['before', srvB, 'S07-slate-ink-contents/index.html'], ['after', srvA, 'prototypes/S07-slate-ink-contents/index.html']]) {
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await prep(srv.url(dir), doResize));
    const uniq = new Set(runs);
    console.log(`  ${name}: 3 次中 ${uniq.size} 种状态  ${uniq.size === 1 ? '★稳定' : '✗不稳'}`);
    if (uniq.size > 1) {
      const ks = [...uniq];
      console.log(`     A: ${ks[0].slice(0, 90)}`);
      console.log(`     B: ${ks[1].slice(0, 90)}`);
    } else {
      console.log(`     ${runs[0].slice(0, 90)}`);
    }
    // 跨侧比较：before 与 after 是否同一个状态
    if (uniq.size === 1) console.log(`     （若两侧都 ★稳定 且字符串相同 ⇒ 与改动无关）`);
  }
}
await browser.close();
srvB.server.close();
srvA.server.close();
