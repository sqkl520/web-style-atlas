// 探针 33：扫描常见手机宽度，找「首屏余量 9.2px」出现在哪一档；同时给出"1 张完整卡"的稳健区间。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('.row'));
  const b0 = rows[0].getBoundingClientRect();
  const full = rows.filter((r) => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length;
  return { vh, slack: +(vh - b0.bottom).toFixed(1), cardH: +b0.height.toFixed(1), full, docH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / vh).toFixed(2) };
};

const br = await Browser.launch({ width: 390, height: 844 });
const sizes = [[320, 568], [360, 640], [360, 780], [375, 667], [375, 812], [390, 844], [393, 873], [412, 915], [414, 896], [430, 932]];
console.log('w x h      vh   卡高   首屏余量   完整卡  docH   屏数');
for (const [w, h] of sizes) {
  const p = await br.newPage({ width: w, height: h, dsf: 2, mobile: true });
  await p.goto(PAGE, { settleMs: 2000 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await sleep(200);
  const m = await p.eval(M);
  const flag = Math.abs(m.slack - 9.2) < 1.5 ? '  ← 9.2px 在这里' : (m.full === 1 ? '' : '  ⚠️ 首屏完整卡 != 1');
  console.log(`${String(w).padStart(3)}x${String(h).padStart(3)}  ${String(m.vh).padStart(4)}  ${String(m.cardH).padStart(6)}  ${String(m.slack).padStart(8)}   ${m.full}      ${String(m.docH).padStart(5)}  ${m.screens}${flag}`);
  await p.close();
}
await br.close();
