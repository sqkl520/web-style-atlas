// 探针 30：Lead 说「390 档首屏 1 张完整卡，余量仅 9.2px」—— 我量到 52.3px。
// 找出 9.2px 出现在哪个口径下（不同宽度 / 不同高度 / 不同设备像素比 / 是否含 scrollbar）。
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
  return { vh, iw: window.innerWidth, cardBottom: +b0.bottom.toFixed(1), cardH: +b0.height.toFixed(1), slack: +(vh - b0.bottom).toFixed(1), full, docH: document.documentElement.scrollHeight, screens: +(document.documentElement.scrollHeight / vh).toFixed(2) };
};

const br = await Browser.launch({ width: 390, height: 844 });
for (const [w, h, dsf, mob] of [[390, 844, 2, true], [390, 844, 1, true], [390, 844, 3, true], [390, 844, 2, false], [393, 852, 2, true], [392, 850, 2, true], [390, 831, 2, true]]) {
  const p = await br.newPage({ width: w, height: h, dsf, mobile: mob });
  await p.goto(PAGE, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  await sleep(300);
  const m = await p.eval(M);
  console.log(`${w}x${h} dsf=${dsf} mobile=${mob}  → vh=${m.vh} 卡高 ${m.cardH} bottom=${m.cardBottom} **余量 ${m.slack}px** 完整卡 ${m.full} docH ${m.docH} (${m.screens} 屏)`);
  await p.close();
}
await br.close();
