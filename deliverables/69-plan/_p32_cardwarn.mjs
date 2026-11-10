// 探针 32：C 的 UX 现状 —— 卡片上的 ⚠ 与详情里的 ⚠ 是两套口径吗？点开 ⚠ 案有没有替代路径？
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const PROBE = () => {
  const rows = [...document.querySelectorAll('.row')];
  const info = rows.map((r) => ({
    id: r.getAttribute('data-id'),
    hasWarn: /⚠/.test(r.textContent),
    capWarn: !!r.querySelector('.cap-warn'),
    capOk: !!r.querySelector('.cap-ok'),
    warnText: (r.querySelector('.cap-warn') || {}).textContent || '',
    links: [...r.querySelectorAll('a')].map((a) => a.getAttribute('href')),
  }));
  return info.filter((x) => x.hasWarn || x.capWarn);
};

const br = await Browser.launch({ width: 1440, height: 900 });
const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 2200 });
await p.eval('document.fonts.ready.then(()=>1)');
const w = await p.eval(PROBE);
console.log('=== 卡片上带 ⚠ / cap-warn 的案 ===');
for (const x of w) console.log(`  ${x.id}  ⚠字符=${x.hasWarn}  cap-warn=${x.capWarn}  cap-ok=${x.capOk}  「${x.warnText}」  卡片内链接 ${x.links.length}`);
console.log(`  合计 ${w.length} 案`);
// 详情里的 ⚠ 与卡片的差
const detailWarn = await p.eval(() => {
  const ids = [];
  for (const r of document.querySelectorAll('.row')) {
    r.click();
  }
  return 1;
});
await p.close(); await br.close();
