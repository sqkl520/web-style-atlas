// 探针 6b：hard 案详情面板 —— 点击与读取拆成两次 eval，避免页内长 Promise。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const page = await b.newPage({ width: 1440, height: 900 });
await page.goto(BASE, { settleMs: 1500 });

const out = {};

// A. 卡片上的警告徽标
out.cardBadges = await page.eval(() => {
  const rows = [...document.querySelectorAll('#ledger > li')];
  return rows.map(li => {
    const nodes = [...li.querySelectorAll('*')].filter(e =>
      e.children.length === 0 && /⚠|退化|绑在特定题材|手工排定|留洞/.test(e.textContent || ''));
    return {
      id: li.getAttribute('data-id'),
      badges: nodes.map(e => ({ tag: e.tagName, cls: String(e.className), text: (e.textContent||'').replace(/\s+/g,' ').trim().slice(0,240),
                                title: e.getAttribute('title') || '' })),
    };
  });
});

// B. 9 个案逐个开详情
const ids = ['S03','S05','S10','S14','S15','S18','S20','S21','S29'];
out.detail = {};
for (const id of ids) {
  const clicked = await page.eval((sid) => {
    const row = document.querySelector('#ledger > li[data-id="' + sid + '"]');
    if (!row) return false;
    row.click();
    return true;
  }, id);
  await sleep(700);
  const r = await page.eval(() => {
    const d = document.getElementById('detail');
    const body = document.getElementById('d-body');
    const txt = (body?.innerText || '').replace(/\s+/g, ' ').trim();
    const nodes = [...(body?.querySelectorAll('*') || [])]
      .filter(e => e.children.length === 0 && /⚠|退化|绑在特定题材|手工排定|会留洞|ktx/.test(e.textContent || ''));
    const links = [...(body?.querySelectorAll('a') || [])]
      .map(a => ({ href: a.getAttribute('href'), text: a.innerText.trim().slice(0, 50) }))
      .filter(a => /template|M0[123]/.test((a.href || '') + a.text));
    const m = txt.match(/.{0,90}(模板|M0[123]).{0,90}/);
    return {
      open: d && !d.hidden && d.getBoundingClientRect().height > 0,
      dNo: document.getElementById('d-no')?.innerText,
      dCn: document.getElementById('d-cn')?.innerText,
      bodyH: body ? Math.round(body.getBoundingClientRect().height) : null,
      scrollH: body ? body.scrollHeight : null,
      nWarn: nodes.filter(e => /⚠/.test(e.textContent)).length,
      warns: nodes.slice(0, 8).map(e => ({ cls: String(e.className), text: (e.textContent||'').replace(/\s+/g,' ').trim().slice(0,260) })),
      tplLinks: links,
      tplMention: m ? m[0] : '',
      headText: txt.slice(0, 200),
    };
  });
  out.detail[id] = { clicked, ...r };
  await page.eval(() => document.getElementById('d-close')?.click());
  await sleep(250);
}

writeFileSync(OUT + '/probe-hard.json', JSON.stringify(out, null, 1));
console.log('--- rows with warning badges ---');
for (const r of out.cardBadges) if (r.badges.length) console.log(r.id, JSON.stringify(r.badges));
console.log('\n--- detail panels ---');
for (const [id, r] of Object.entries(out.detail)) {
  console.log(`\n【${id}】open=${r.open} ${r.dNo} ${r.dCn} bodyH=${r.bodyH}/${r.scrollH} nWarn=${r.nWarn} tplLinks=${JSON.stringify(r.tplLinks)}`);
  for (const w of r.warns || []) console.log('   [' + w.cls + '] ' + w.text.slice(0, 200));
  if (r.tplMention) console.log('   tplMention: ' + r.tplMention);
  console.log('   head: ' + (r.headText || '').slice(0, 150));
}
await page.close();
await b.close();
