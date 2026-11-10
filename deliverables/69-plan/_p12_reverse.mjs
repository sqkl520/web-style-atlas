// 探针 12：反推 Lead 的「19.4 屏」是怎么量出来的。逐个候选口径跑一遍，看哪个 ≈19.4。
// 候选：不同 vh、不同宽度、rail 展开、details 展开、按「卡片总高/视口」、按「首屏起点计」。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('.row'));
  const sumH = rows.reduce((a, r) => a + r.getBoundingClientRect().height, 0);
  const firstTop = rows[0].getBoundingClientRect().top;
  return {
    vh,
    docH: document.documentElement.scrollHeight,
    bodyH: document.body.scrollHeight,
    screensDoc: +(document.documentElement.scrollHeight / vh).toFixed(2),
    screensBody: +(document.body.scrollHeight / vh).toFixed(2),
    screensRowsOnly: +(sumH / vh).toFixed(2),
    screensFromFirstCard: +((document.documentElement.scrollHeight - firstTop) / vh).toFixed(2),
    sumH: Math.round(sumH), firstTop: Math.round(firstTop),
  };
};

const br = await Browser.launch({ width: 390, height: 844 });
const cases = [
  ['390x844 (我用的)', 390, 844, 'none'],
  ['390x844 rail展开', 390, 844, 'rail'],
  ['390x667', 390, 667, 'none'],
  ['375x812', 375, 812, 'none'],
  ['375x667', 375, 667, 'none'],
  ['360x640', 360, 640, 'none'],
  ['390x844 详情展开', 390, 844, 'detail'],
  ['414x896', 414, 896, 'none'],
];
for (const [name, w, h, action] of cases) {
  const p = await br.newPage({ width: w, height: h, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  if (action === 'rail') {
    // 展开所有折叠区（rail 里的 details / 芯片 moreHost）
    await p.eval(() => {
      document.querySelectorAll('details').forEach((d) => { d.open = true; });
      const t = document.querySelector('.scene-toggle'); if (t) t.click();
      return 1;
    });
  }
  if (action === 'detail') {
    await p.eval(() => { const r = document.querySelector('.row'); if (r) r.click(); return 1; });
  }
  await sleep(500);
  const m = await p.eval(M);
  console.log(`${name.padEnd(20)} vh=${m.vh} docH=${String(m.docH).padStart(6)}  docFrames=${String(m.screensDoc).padStart(6)}  bodyFrames=${String(m.screensBody).padStart(6)}  仅卡片=${String(m.screensRowsOnly).padStart(6)}  从首卡起=${String(m.screensFromFirstCard).padStart(6)}  firstTop=${m.firstTop}`);
  await p.close();
}
await br.close();
