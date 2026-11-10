// 探针 16：核实两件事
//  A. 字段之间的间距（用来精确解释 2991 → 3478 的 487px 差额）
//  B. audit 是否是 WIP 修复**新造出来的第 4 个孤儿字段**（data.js 有、UI 零消费）
import { readFileSync } from 'node:fs';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const REPO = 'D:\\Web\\style';

// B 部分：静态统计
const appSrc = readFileSync(REPO + '/prototypes/_selection/app.js', 'utf8');
const pcSrc = readFileSync(REPO + '/prototypes/_selection/prompt-copy.js', 'utf8');
const prSrc = readFileSync(REPO + '/prototypes/_selection/prompts.js', 'utf8');
const dl = readFileSync(REPO + '/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(dl.slice(dl.indexOf('= ') + 2).replace(/;\s*$/, ''));

const keys = Object.keys(D[0]);
console.log('═══ B. data.js 的 33 个键，逐个查 UI 消费 ═══');
console.log('键'.padEnd(18) + ' app.js  prompt-copy.js  prompts.js  verdict');
const rowsOut = [];
for (const k of keys) {
  const inApp = new RegExp('r\\.' + k + '\\b|\\[\\s*[\'"]' + k + '[\'"]\\s*\\]|\\.' + k + '\\b').test(appSrc);
  const inPC = new RegExp('r\\.' + k + '\\b|\\.' + k + '\\b').test(pcSrc);
  const inPR = prSrc.includes('"' + k + '"') || prSrc.includes(k);
  const verdict = inApp ? 'UI 消费' : (inPC || inPR ? '间接' : '★ 零消费');
  console.log(k.padEnd(18) + String(inApp).padEnd(9) + String(inPC).padEnd(15) + String(inPR).padEnd(11) + verdict);
  rowsOut.push({ k, inApp, inPC, inPR, verdict });
}
const orphans = rowsOut.filter((r) => !r.inApp && !r.inPC && !r.inPR).map((r) => r.k);
console.log('');
console.log('零消费键：' + (orphans.join(' ') || '无'));
console.log('（注：上表用宽口径，属实的有 ' + rowsOut.filter((r) => r.verdict === '★ 零消费').length + ' 个）');

// A 部分：真浏览器量字段间距
function gaps() {
  const fs = [...document.querySelectorAll('#d-body .field')];
  const out = [];
  for (let i = 1; i < fs.length; i++) {
    const a = fs[i - 1].getBoundingClientRect();
    const b = fs[i].getBoundingClientRect();
    out.push({ from: (fs[i - 1].querySelector('dt') || {}).textContent, to: (fs[i].querySelector('dt') || {}).textContent, gap: +(b.top - a.bottom).toFixed(1) });
  }
  return out;
}

const srv = await startServer(REPO);
const browser = await Browser.launch();
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
  await sleep(400);
  await page.eval(() => { document.querySelector('.row[data-id="S15"]').click(); return true; });
  await sleep(500);
  const g = await page.eval(gaps);
  console.log('');
  console.log('═══ A. 详情面板里相邻字段的垂直间距（S15）═══');
  g.forEach((x) => console.log(`  ${String(x.from).padEnd(20)} → ${String(x.to).padEnd(20)} gap = ${x.gap}px`));
  const uniq = [...new Set(g.map((x) => x.gap))];
  console.log('  间距取值集合: ' + uniq.join(' / ') + '  → 单值即等于块间距');
  await page.close();
} finally {
  await browser.close();
  await srv.close();
}
