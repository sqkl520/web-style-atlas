// P2：选型台真机实测。搜词 / 芯片 / 模板层 / 行卡 clamp / 面板高度（390 与 1440）
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });

// ── 1) 1440：搜词与芯片的行为 ──────────────────────────────────────────
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });

const search = await p.eval(async () => {
  const q = document.getElementById('q');
  const rowsOut = [];
  const terms = ['餐厅', '咖啡店', '咖啡馆', '书店', '酒吧', '电商', '甜品', '作品集', '设计工作室'];
  const fire = () => q.dispatchEvent(new Event('input', { bubbles: true }));
  for (const t of terms) {
    // 清空芯片（走仓库自己的公开接口，保证与真实路径一致）
    if (window.benchClearSceneIds) window.benchClearSceneIds();
    q.value = t; fire();
    await new Promise((r) => setTimeout(r, 90));
    const ledgerRows = document.querySelectorAll('#ledger .row, #ledger li').length;
    const ids = [...document.querySelectorAll('#ledger [data-id]')].map((e) => e.getAttribute('data-id'));
    const strip = document.getElementById('tpl-strip');
    const empty = document.getElementById('empty-tpl');
    const lead = document.getElementById('tpl-strip-lead');
    const cards = [...document.querySelectorAll('#tpl-cards .tpl-card, .tpl-cards .tpl-card')]
      .map((e) => e.getAttribute('data-tpl'));
    const count = document.getElementById('count') ? document.getElementById('count').textContent.trim() : null;
    rowsOut.push({
      term: t,
      countText: count,
      ledgerRows,
      ids,
      stripVisible: strip ? !strip.hidden : null,
      emptyVisible: empty ? !empty.hidden : null,
      tplCards: [...new Set(cards)],
      stripLead: lead ? lead.textContent.trim().slice(0, 220) : null,
      emptyText: empty && !empty.hidden ? empty.textContent.replace(/\s+/g, ' ').trim().slice(0, 260) : null,
    });
  }
  q.value = ''; fire();
  return rowsOut;
});
writeFileSync(join(HERE, 'p2-search.json'), JSON.stringify(search, null, 1), 'utf8');
for (const s of search) {
  console.log(`\n[${s.term}] count=${s.countText} rows=${s.ledgerRows} ids=${s.ids.join(',') || '—'} strip=${s.stripVisible} empty=${s.emptyVisible} tpl=${s.tplCards.join(',') || '—'}`);
  if (s.stripLead) console.log('   stripLead: ' + s.stripLead);
  if (s.emptyText) console.log('   emptyText: ' + s.emptyText);
}

// 芯片：咖啡店 的模板角标 + 点击后行数
const chip = await p.eval(async () => {
  const out = {};
  const c = document.querySelector('#flt-scene button[data-scene="咖啡店"]');
  const c2 = document.querySelector('#flt-scene button[data-scene="餐厅"]');
  out.hasChipCoffee = !!c;
  out.hasRestaurantChipDirect = !!document.querySelector('#flt-scene button[data-scene="餐厅"]');
  out.coffeeBadge = c ? (c.querySelector('.scene-tpl') || {}).textContent || null : null;
  out.coffeeTitle = c ? c.title : null;
  // 餐厅 芯片在「近似」抽屉里
  const more = document.querySelectorAll('.scene-more button[data-scene]');
  out.nearChips = [...more].map((e) => e.getAttribute('data-scene'));
  out.restaurantInNear = out.nearChips.includes('餐厅');
  const r = document.querySelector('.scene-more button[data-scene="餐厅"]');
  if (r) { r.click(); await new Promise((s) => setTimeout(s, 120)); }
  out.afterRestaurantClick = {
    rows: document.querySelectorAll('#ledger [data-id]').length,
    ids: [...document.querySelectorAll('#ledger [data-id]')].map((e) => e.getAttribute('data-id')),
    stripVisible: !document.getElementById('tpl-strip').hidden,
    lead: document.getElementById('tpl-strip-lead').textContent.trim().slice(0, 240),
    cards: [...new Set([...document.querySelectorAll('.tpl-card')].map((e) => e.getAttribute('data-tpl')))],
  };
  return out;
});
console.log('\n== 芯片 ==');
console.log(JSON.stringify(chip, null, 1));

await p.eval(() => { if (window.benchClearSceneIds) window.benchClearSceneIds(); location.hash = ''; });
const q2 = await p.eval(() => { const q = document.getElementById('q'); q.value = '餐厅'; q.dispatchEvent(new Event('input', { bubbles: true })); return true; });
await sleep(400);
await p.screenshot({ path: join(HERE, 'shot-1440-search-canting.png'), format: 'png' });
// 咖啡店芯片态
await p.eval(() => document.querySelector('#flt-scene button[data-scene="咖啡店"]').click());
await sleep(400);
await p.screenshot({ path: join(HERE, 'shot-1440-chip-coffee.png'), format: 'png' });

// ── 2) 行卡 clamp：可见字符与括号配平（1440 + 390） ──────────────────
const clampFn = () => {
  function visible(el) {
    const node = el.firstChild;
    if (!node || node.nodeType !== 3) return { text: el.textContent, truncated: false, total: (el.textContent || '').length };
    const r = document.createRange();
    const box = el.getBoundingClientRect();
    let last = -1;
    for (let i = 0; i < node.length; i++) {
      r.setStart(node, i); r.setEnd(node, i + 1);
      const b = r.getBoundingClientRect();
      if (b.height === 0) continue;
      if (b.bottom <= box.bottom + 1.5) last = i; else break;
    }
    return { text: node.textContent.slice(0, last + 1), truncated: last + 1 < node.length, total: node.length, boxH: Math.round(box.height) };
  }
  const bal = (s) => {
    const pairs = [['（', '）'], ['(', ')'], ['「', '」'], ['【', '】'], ['《', '》'], ['“', '”']];
    return pairs.map(([a, c]) => {
      const open = (s.match(new RegExp('\\' + a, 'g')) || []).length;
      const close = (s.match(new RegExp('\\' + c, 'g')) || []).length;
      return { pair: a + c, open, close, ok: open === close };
    }).filter((x) => x.open || x.close);
  };
  const rows = [...document.querySelectorAll('#ledger [data-id]')].map((row) => {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) return { id, missing: true };
    const v = visible(fam);
    const cs = getComputedStyle(fam);
    return {
      id,
      clamp: cs.webkitLineClamp,
      truncated: v.truncated,
      total: v.total,
      shown: v.text.length,
      boxH: v.boxH,
      last3: v.text.slice(-3),
      visibleText: v.text,
      imbalance: bal(v.text).filter((x) => !x.ok),
    };
  });
  return rows;
};

const clamp1440 = await p.eval(clampFn);
writeFileSync(join(HERE, 'p2-clamp-1440.json'), JSON.stringify(clamp1440, null, 1), 'utf8');

// 390 档（同一个 page 改视口即可，但为避免 sticky/折叠态干扰，重开一个 page）
const pm = await b.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
await pm.goto(PAGE, { settleMs: 1500 });
const clamp390 = await pm.eval(clampFn);
writeFileSync(join(HERE, 'p2-clamp-390.json'), JSON.stringify(clamp390, null, 1), 'utf8');

for (const [w, rows] of [[1440, clamp1440], [390, clamp390]]) {
  const trunc = rows.filter((r) => r.truncated);
  const bad = rows.filter((r) => (r.imbalance || []).length);
  console.log(`\n== 行卡 clamp ${w} ==  共 ${rows.length} 行；被截断 ${trunc.length}；可见文本括号不配平 ${bad.length}`);
  for (const r of trunc) {
    console.log(`  ${r.id} clamp=${r.clamp} 显示 ${r.shown}/${r.total} 字 末3=「${r.last3}」 不配平=${JSON.stringify(r.imbalance)}`);
  }
  if (bad.length) {
    console.log('  -- 不配平明细 --');
    for (const r of bad) console.log(`  ${r.id}: ${JSON.stringify(r.imbalance)} tail=…${r.visibleText.slice(-40)}`);
  }
}
await b.close();
