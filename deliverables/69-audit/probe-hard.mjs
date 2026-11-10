// 探针 6：hard 案的警告文案（卡片 + 详情面板）与详情面板里有没有提到模板。
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1500 });

const out = {};

// A. 30 行卡片上的警告徽标：哪几行有、文案是什么、tooltip
out.cardBadges = await page.eval(() => {
  const rows = [...document.querySelectorAll('#ledger > li')];
  return rows.map(li => {
    const badges = [...li.querySelectorAll('[class*="warn"], [class*="risk"], [class*="flag"], .row-risk, .risk')]
      .map(e => ({ cls: e.className, text: (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
                   title: e.getAttribute('title') || '' }))
      .filter(x => x.text || x.title);
    const id = li.querySelector('.r-no')?.textContent?.trim() || '';
    return { id, n: badges.length, badges: badges.slice(0, 4) };
  });
});
out.badgedRows = out.cardBadges.filter(r => r.n > 0);

// B. 对 9 个候选案逐个打开详情，抓：警告文案、有没有出现"模板"/"M01/M02/M03"
const ids = ['S03','S05','S10','S14','S15','S18','S20','S21','S29'];
out.detail = {};
for (const id of ids) {
  out.detail[id] = await page.eval((sid) => {
    const row = document.querySelector(`#ledger > li[data-id="${sid}"]`) ||
                [...document.querySelectorAll('#ledger > li')].find(li => li.innerText.includes(sid));
    if (!row) return { err: 'row not found' };
    row.click();
    return new Promise(res => setTimeout(() => {
      const d = document.getElementById('detail');
      const body = document.getElementById('d-body');
      const txt = (body?.innerText || '').replace(/\s+/g, ' ').trim();
      const visible = d && !d.hidden && d.getBoundingClientRect().height > 0;
      const warns = [...(body?.querySelectorAll('*') || [])]
        .filter(e => /⚠|退化|绑在特定题材|手工排定|会留洞/.test(e.textContent || '') && e.children.length === 0)
        .map(e => ({ tag: e.tagName, cls: e.className, text: (e.textContent||'').replace(/\s+/g,' ').trim().slice(0, 300) }));
      const links = [...(body?.querySelectorAll('a') || [])].map(a => ({ href: a.getAttribute('href'), text: a.innerText.trim().slice(0,60) }))
        .filter(a => /template|M0[123]/.test((a.href||'') + a.text));
      const mentionsTpl = /模板|templates\/|M0[123]/.test(txt);
      return {
        visible, bodyH: body ? Math.round(body.getBoundingClientRect().height) : null,
        scrollH: body ? body.scrollHeight : null,
        warns: warns.slice(0, 6),
        nWarn: warns.length,
        tplLinks: links,
        mentionsTpl,
        tplContext: (() => {
          const m = txt.match(/.{0,80}(模板|M0[123]).{0,80}/);
          return m ? m[0] : '';
        })(),
        firstFieldText: txt.slice(0, 220),
        detailHead: (document.getElementById('d-cn')?.innerText || '') + ' / ' + (document.getElementById('d-no')?.innerText || ''),
      };
    }, 400));
  }, id);
  // 关闭
  await page.eval(() => document.getElementById('d-close')?.click());
}

writeFileSync(OUT + '/probe-hard.json', JSON.stringify(out, null, 1));
console.log('--- badged rows ---');
console.log(JSON.stringify(out.badgedRows, null, 1));
console.log('\n--- detail ---');
for (const [id, r] of Object.entries(out.detail)) {
  console.log(`\n【${id}】visible=${r.visible} bodyH=${r.bodyH}/${r.scrollH} nWarn=${r.nWarn} mentionsTpl=${r.mentionsTpl} tplLinks=${JSON.stringify(r.tplLinks)}`);
  console.log('  head:', r.detailHead);
  if (r.warns) for (const w of r.warns) console.log('  WARN[' + w.cls + ']', w.text.slice(0, 220));
  if (r.tplContext) console.log('  tplCtx:', r.tplContext);
  console.log('  first:', (r.firstFieldText||'').slice(0, 180));
}
await page.close();
await b.close();
