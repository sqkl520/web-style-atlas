// 探针 11：任务 5 —— 「承认边界」到底多醒目。三种入口逐一量：
//   入口 A：搜索框打一个零命中词（#empty + #empty-tpl）
//   入口 B：折进 rail 的 29 词 note
//   入口 C：页头 #tpl-exit（折叠块里）
import { Browser, sleep } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:8811/prototypes/_selection/';
const OUT = 'D:/Web/style/deliverables/69-audit';
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const spec of [{ w: 390, h: 844, mobile: true, dsf: 2, tag: '390' },
                    { w: 1440, h: 900, mobile: false, dsf: 1, tag: '1440' }]) {
  const page = await b.newPage({ width: spec.w, height: spec.h, mobile: spec.mobile, dsf: spec.dsf });
  await page.goto(BASE, { settleMs: 1800 });

  const r = await page.eval(() => {
    const vh = innerHeight;
    const pos = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
      return { docTop: +(r.top + scrollY).toFixed(1), h: +r.height.toFixed(1),
               screens: +((r.top + scrollY) / vh).toFixed(2),
               visNow: Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top)) }; };
    const d = {};
    d.vh = vh; d.docH = document.documentElement.scrollHeight;
    d.docScreens = +(document.documentElement.scrollHeight / vh).toFixed(1);

    // 入口 C：页头 tpl-exit（在 mast-fold 里）
    const exit = document.getElementById('tpl-exit');
    const mastFold = document.getElementById('mast-fold');
    d.tplExit = { ...pos(exit), foldOpen: mastFold.open, inFold: !!exit.closest('.mast-fold'),
                  text: (exit.innerText||'').replace(/\s+/g,' ').slice(0,120) };

    // 入口 B：29 词 note（在 rail-fold + scene-more 两层里）
    const note = document.querySelector('.scene-unsupported');
    d.note = { ...pos(note), display: getComputedStyle(note).display,
               layer1_railFoldOpen: document.getElementById('rail-fold').open,
               layer2_moreVisible: getComputedStyle(document.querySelector('.scene-more')).display !== 'none',
               toggleText: document.querySelector('.scene-toggle')?.innerText };

    // 入口 A：搜零命中词
    const q = document.getElementById('q');
    q.value = '电商'; q.dispatchEvent(new Event('input', { bubbles: true }));
    const empt = document.getElementById('empty');
    const etpl = document.getElementById('empty-tpl');
    d.searchZero = {
      empty: pos(empt), etpl: pos(etpl),
      etplCards: [...etpl.querySelectorAll('.tpl-card')].map(c => c.dataset.tpl),
      emptyText: (empt.innerText||'').replace(/\s+/g,' ').slice(0, 300),
      etplText: (etpl.innerText||'').replace(/\s+/g,' ').slice(0, 320),
    };
    // 需要几次点击 / 滚多少才看完
    d.toSeeNote_clicks = 2; // rail-fold + scene-toggle
    d.toSeeTplExit_clicks = mastFold.open ? 0 : 1;
    d.toSeeSearchZero_clicks = 0;
    return d;
  });
  out[spec.tag] = r;
  await page.screenshot({ path: `${OUT}/shots/${spec.tag}-zero-search.png`, format: 'png' });
  await page.close();
}

writeFileSync(OUT + '/probe-visibility.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
