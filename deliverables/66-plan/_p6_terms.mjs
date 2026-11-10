// P6：44 个索引词逐个走「搜索框」这条真实路径，与 sceneIndex 的口径对照
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT, loadPrompts } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const P = loadPrompts();
const terms = Object.keys(P.sceneIndex);
console.log('sceneIndex 词数 = %d；有直连 = %d；只有近似 = %d',
  terms.length,
  terms.filter((t) => (P.sceneIndex[t].direct || []).length).length,
  terms.filter((t) => !(P.sceneIndex[t].direct || []).length).length);

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1600 });

const res = await p.eval(async (ts) => {
  const q = document.getElementById('q');
  const out = [];
  for (const t of ts) {
    if (window.benchClearSceneIds) window.benchClearSceneIds();
    q.value = t; q.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 70));
    const ids = [...document.querySelectorAll('#ledger [data-id]')].map((e) => e.getAttribute('data-id'));
    const strip = document.getElementById('tpl-strip');
    const empty = document.getElementById('empty-tpl');
    const lead = document.getElementById('tpl-strip-lead');
    out.push({
      term: t, rows: ids.length, ids,
      count: (document.getElementById('count') || {}).textContent || '',
      strip: strip ? !strip.hidden : null,
      empty: empty ? !empty.hidden : null,
      lead: lead ? lead.textContent.trim() : '',
      tplCards: [...new Set([...document.querySelectorAll('.tpl-card')].map((e) => e.getAttribute('data-tpl')))],
    });
  }
  q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true }));
  return out;
}, terms);

const merged = res.map((r) => {
  const idx = P.sceneIndex[r.term] || {};
  const direct = idx.direct || [], near = idx.near || [];
  const claimedDirect = /是这个图集的直连方案/.test(r.lead);
  const claimedNone = /没有专为/.test(r.lead);
  return {
    ...r, direct, near,
    // 判据：搜出来的行里是否包含索引声明的直连方案
    directShown: direct.filter((d) => r.ids.includes(d)),
    directMissing: direct.filter((d) => !r.ids.includes(d)),
    contradiction: direct.length > 0 && claimedNone && !/点左侧/.test(r.lead),
  };
});
writeFileSync(join(HERE, 'p6-terms.json'), JSON.stringify(merged, null, 1), 'utf8');

console.log('\n== 分类 ==');
const zeroWithDirect = merged.filter((m) => m.rows === 0 && m.direct.length);
const zeroNoDirect = merged.filter((m) => m.rows === 0 && !m.direct.length);
console.log('A. 搜索框 0 行，但索引里有直连方案：%d 个 → %s', zeroWithDirect.length, zeroWithDirect.map((m) => `${m.term}(${m.direct.join('/')})`).join(' '));
console.log('B. 搜索框 0 行，索引也无直连（只有近似或什么都没有）：%d 个', zeroNoDirect.length);
console.log('   B1 有近似：%d → %s', zeroNoDirect.filter((m) => m.near.length).length, zeroNoDirect.filter((m) => m.near.length).map((m) => `${m.term}(${m.near.join('/')})`).join(' '));
console.log('   B2 无近似：%d → %s', zeroNoDirect.filter((m) => !m.near.length).length, zeroNoDirect.filter((m) => !m.near.length).map((m) => m.term).join(' '));
const withRows = merged.filter((m) => m.rows > 0);
console.log('C. 搜索框有行：%d 个', withRows.length);

console.log('\n== D. 索引说有直连、但搜出来的行里没有那个直连：==');
for (const m of merged.filter((x) => x.directMissing.length)) {
  console.log('  %s  direct=%s  rows=%s  缺=%s', m.term, m.direct.join('/'), m.ids.join(',') || '0', m.directMissing.join('/'));
}

console.log('\n== E. 自相矛盾（索引有直连 + 界面说"没有专为它做的"）：==');
for (const m of merged.filter((x) => x.contradiction)) {
  console.log('  %s  direct=%s  rows=%d ids=%s', m.term, m.direct.join('/'), m.rows, m.ids.join(','));
  console.log('       lead: ' + m.lead.slice(0, 200));
  console.log('       empty: ' + (m.empty ? 'YES' : 'no'));
}
await b.close();
