// 探针 7：卡片级警告徽标（cap-warn / cap-ok / 有没有"题材"警告）+ 29 词 note 的到达成本。
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

// ── A. 1440：30 行卡片上的徽标
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { settleMs: 1500 });
  out.cards = await page.eval(() => {
    const P = window.STYLE_PROMPTS;
    const hard = new Set(P.schemes.filter(s => s.hard).map(s => s.id));
    const deg = new Set(P.schemes.filter(s => s.capacity && s.capacity.degrades === 'yes').map(s => s.id));
    return [...document.querySelectorAll('#ledger > li')].map(li => {
      const id = li.getAttribute('data-id');
      const cap = li.querySelector('.cap');
      const warns = [...li.querySelectorAll('*')].filter(e => e.children.length === 0 && /题材|退化|绑在特定/.test(e.textContent || ''));
      return { id, hard: hard.has(id), deg: deg.has(id),
        capCls: cap ? String(cap.className) : null,
        capText: cap ? (cap.innerText || '').trim() : null,
        capTitle: cap ? cap.getAttribute('title') : null,
        topicWarnOnCard: warns.length };
    });
  });
  // 29 词 note：1440 下到它的点击次数与位置
  out.note1440 = await page.eval(() => {
    const n = document.querySelector('.scene-unsupported');
    const t = document.querySelector('.scene-toggle');
    const vh = innerHeight;
    const pos = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { docTop: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1),
               visibleInFirstScreen: Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)),
               display: getComputedStyle(e).display }; };
    const before = pos(n);
    t.click();
    const after = pos(n);
    return { vh, railFoldOpen: document.getElementById('rail-fold').open,
             toggleText: t.innerText, toggle: pos(t), noteBefore: before, noteAfter: after,
             docH: document.documentElement.scrollHeight };
  });
  await page.screenshot({ path: OUT + '/shots/1440-rail-note-open.png', format: 'png' });
  await page.close();
}

// ── B. 390：note 的实际到达（两步点击后滚几屏）
{
  const page = await b.newPage({ width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(BASE, { settleMs: 1500 });
  out.note390 = await page.eval(() => {
    const vh = innerHeight;
    const pos = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { docTop: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1),
               screens: +((r.top + scrollY) / vh).toFixed(2),
               display: getComputedStyle(e).display }; };
    const steps = [];
    const note = () => document.querySelector('.scene-unsupported');
    steps.push({ step: '0 load', note: pos(note()), toggleText: document.querySelector('.scene-toggle')?.innerText,
                 railFoldOpen: document.getElementById('rail-fold').open, docH: document.documentElement.scrollHeight });
    document.querySelector('#rail-fold > summary').click();
    steps.push({ step: '1 rail-fold open', note: pos(note()), toggleText: document.querySelector('.scene-toggle')?.innerText,
                 railFoldOpen: document.getElementById('rail-fold').open, docH: document.documentElement.scrollHeight });
    document.querySelector('.scene-toggle').click();
    steps.push({ step: '2 toggle open', note: pos(note()), toggleText: document.querySelector('.scene-toggle')?.innerText,
                 docH: document.documentElement.scrollHeight });
    // 滚到 note 顶部
    const y = note().getBoundingClientRect().top + scrollY;
    scrollTo(0, y - 40);
    steps.push({ step: '3 scroll to note', scrollY, noteViewportTop: +note().getBoundingClientRect().top.toFixed(1),
                 noteViewportH: +note().getBoundingClientRect().height.toFixed(1) });
    return { vh, steps };
  });
  await page.screenshot({ path: OUT + '/shots/390-note-in-view.png', format: 'png' });
  await page.close();
}

writeFileSync(OUT + '/probe-badges.json', JSON.stringify(out, null, 1));

console.log('id  hard deg  capCls         capText                                   topicWarnOnCard');
for (const c of out.cards) {
  console.log(`${c.id}  ${c.hard ? 'H' : '-'}    ${c.deg ? 'D' : '-'}   ${String(c.capCls).padEnd(14)} ${String(c.capText).padEnd(40)} ${c.topicWarnOnCard}`);
}
console.log('\ncards with cap-warn:', out.cards.filter(c => /cap-warn/.test(c.capCls)).length,
  '| =', out.cards.filter(c => /cap-warn/.test(c.capCls)).map(c => c.id).join(','));
console.log('cards with hard but cap-ok:', out.cards.filter(c => c.hard && /cap-ok/.test(c.capCls)).map(c => c.id).join(','));
console.log('\n-- note 1440 --', JSON.stringify(out.note1440, null, 1));
console.log('\n-- note 390 --', JSON.stringify(out.note390, null, 1));
await b.close();
