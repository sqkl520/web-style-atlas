// 探针 17：决定性实验 —— 逐个移除字段，量它对面板总高的**真实贡献**（含 margin）。
// 这样「接通一个字段 = 面板变深多少」就不再是估算，而是实测。
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const REPO = 'D:\\Web\\style';
const OUT = join(REPO, 'deliverables/65-plan/_rt_out');
mkdirSync(OUT, { recursive: true });

function removeByLabel(label) {
  const fs = [...document.querySelectorAll('#d-body .field')];
  const el = fs.find((f) => (f.querySelector('dt') || {}).textContent === label);
  if (!el) return { found: false };
  const before = document.getElementById('detail').scrollHeight;
  el.remove();
  const after = document.getElementById('detail').scrollHeight;
  return { found: true, before, after, delta: before - after };
}

const srv = await startServer(REPO);
const browser = await Browser.launch();
const all = {};
try {
  const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
  await page.eval('document.fonts.ready.then(()=>true)').catch(() => {});
  await sleep(400);

  for (const id of ['S15', 'S13', 'S29', 'S01']) {
    await page.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); return true; }, id);
    await sleep(450);
    const labels = await page.eval(() => [...document.querySelectorAll('#d-body .field dt')].map((d) => d.textContent));
    const base = await page.eval(() => document.getElementById('detail').scrollHeight);
    const res = [];
    for (const lab of labels) {
      // 每轮重新点开，保证 DOM 是干净的
      await page.eval((sid) => { document.querySelector('.row[data-id="' + sid + '"]').click(); return true; }, id);
      await sleep(260);
      const r = await page.eval(removeByLabel, lab);
      res.push({ label: lab, delta: r.delta });
    }
    all[id] = { base, fields: res };
  }
  await page.close();
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(OUT, 'field-contrib.json'), JSON.stringify(all, null, 1), 'utf8');
for (const [id, v] of Object.entries(all)) {
  console.log(`═══ ${id}  基线 contentH = ${v.base}px`);
  v.fields.slice().sort((a, b) => b.delta - a.delta).forEach((f) => console.log(`   ${String(f.delta).padStart(5)}px  ${f.label}`));
  console.log('');
}
const s15 = all.S15.fields;
const land = s15.find((f) => f.label === '可落地要点');
const lay = s15.find((f) => f.label === '布局与网格');
console.log('关键复算（S15）：');
console.log(`  「可落地要点」真实贡献 ${land.delta}px`);
console.log(`  「布局与网格」真实贡献 ${lay.delta}px`);
console.log(`  2991 + ${land.delta} = ${2991 + land.delta}  vs 65-audit 实测 3478  → 差 ${3478 - 2991 - land.delta}px`);
console.log(`  3478 + ${lay.delta} = ${3478 + lay.delta}  vs 本轮实测 ${all.S15.base}  → 差 ${all.S15.base - 3478 - lay.delta}px`);
