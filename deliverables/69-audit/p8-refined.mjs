// P8 — 精修解法：目录条放进已有的 rail 折叠（零 chrome 成本）、
// 密集视图的图片代价、分组维度的真实粒度、以及「粘性上下文」的缺失。
import { Browser, openPage, settle, setFold, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = { groups: {}, variants: [], sticky: null };

// --- 1) 各候选分组维度的粒度
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  out.groups = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')];
    const cnt=(arr)=>{const m={}; arr.forEach(x=>{if(x)m[x]=(m[x]||0)+1}); return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
    const fr=rows.map(r=>{const e=r.querySelector('.tag-fr'); return e?e.textContent.trim():null});
    const tags=rows.map(r=>{const es=[...r.querySelectorAll('.row-head .tag')]; const t=es.find(e=>!e.classList.contains('tag-fr')); return t?t.textContent.trim():null});
    const fail=rows.map(r=>{const e=r.querySelector('.tag-fail,.tag-pass'); return e?e.textContent.trim():null});
    const warn=rows.map(r=>{const e=r.querySelector('.tag-warn'); return e?e.textContent.trim():null});
    const fams=rows.map(r=>{const e=r.querySelector('.row-family'); if(!e)return null; const m=e.textContent.match(/^[^。：]{2,14}/); return m?m[0]:null});
    const sum=(g)=>({groups:g.length, singletons:g.filter(([,n])=>n===1).length, max:g[0]&&g[0][1], detail:g.slice(0,8)});
    return { fr:{...sum(cnt(fr)), all:cnt(fr)}, tag:{...sum(cnt(tags)), all:cnt(tags)},
             fail:{...sum(cnt(fail)), all:cnt(fail)}, warn:{...sum(cnt(warn)), all:cnt(warn)},
             fam:{...sum(cnt(fams)), all:cnt(fams)} };
  })()`);
  console.log('分组粒度（组数 / 单例组 / 最大组）:');
  for (const k of ['fr', 'tag', 'fail', 'warn', 'fam']) {
    const g = out.groups[k];
    console.log('  ' + k.padEnd(5), 'groups=' + String(g.groups).padEnd(3), 'singletons=' + String(g.singletons).padEnd(3), 'max=' + g.max, '|', (g.all || []).slice(0, 6).map((x) => x.join(':')).join(' '));
  }

  // --- 2) 粘性上下文：滚动时有没有任何东西告诉用户「这是第几案/第几屏」
  out.sticky = await page.eval(`(() => {
    const cands=[...document.querySelectorAll('header, .bar, .rail, .ledger, .row')];
    const sticky=cands.filter(el=>{const cs=getComputedStyle(el); return ['sticky','fixed'].includes(cs.position)}).map(el=>el.className||el.tagName);
    const bar=document.querySelector('.bar');
    return { stickyElements: sticky, barPosition: bar?getComputedStyle(bar).position:null,
             progressEl: !!document.querySelector('progress, [role=progressbar]'),
             currentRowIndicator: !!document.querySelector('.row[aria-current="true"]'),
             countText: (document.querySelector('#count')||{}).textContent };
  })()`);
  console.log('粘性/进度:', JSON.stringify(out.sticky));
  await page.close();
}

// --- 3) 变体：目录条放哪里
const VARIANTS = [
  { label: 'V0 现状', css: null },
  // 5a: 30 行目录放在 ledger 之前（会顶掉首卡）
  { label: 'V5a 目录在清单前', inject: 'before-ledger' },
  // 5b: 30 行目录放进 rail 折叠块内部（折叠态零成本）
  { label: 'V5b 目录进 rail 折叠', inject: 'in-rail' },
  // 3c: 密集视图，去掉脚注只留核心 3 项
  { label: 'V3c 密集(去脚注)', css: `.shots{display:none!important}
      .row{grid-template-columns:42px minmax(0,1fr)!important;gap:6px;padding:8px 0}
      .row-head h3{font-size:16px}
      .row-def{font-size:14px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0}
      .row-family{display:none}
      .row-meta{margin-top:2px;font-size:12px;gap:1px 6px}
      .row-foot{display:none}` },
  // 3d: 保留 152 图 + 家族 1 行 + 脚注 2 行（保形但更紧）
  { label: 'V3d 保图+紧排', css: `.row-family{-webkit-line-clamp:1;display:-webkit-box;-webkit-box-orient:vertical;overflow:hidden}
      .row-foot{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-height:2.9em}
      .row-def{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
      .row{padding:5px 0}` },
  // 两列网格（多数人会想到，实测一下代价）
  { label: 'V6 双列网格', css: `#ledger{display:grid!important;grid-template-columns:1fr 1fr;gap:0 10px}
      .row{grid-template-columns:1fr!important;border-bottom:2px solid var(--ink)}
      .row .no{font-size:20px}
      .shots{display:none}
      .row-foot{display:none}
      .row-family{display:none}
      .row-def{font-size:13px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}` },
];

for (const v of VARIANTS) {
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);

  if (v.css) {
    await page.eval(`(() => { const s=document.createElement('style'); s.textContent=${JSON.stringify(v.css)}; document.head.appendChild(s); return 1; })()`);
    await sleep(700);
  }
  if (v.inject) {
    await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')];
      const host = ${JSON.stringify(v.inject)} === 'in-rail'
        ? document.querySelector('#rail-fold .rail-fold-body')
        : document.querySelector('#ledger');
      const strip=document.createElement('ol');
      strip.id='__idx';
      strip.style.cssText='list-style:none;margin:0 0 10px;padding:0;border-top:2px solid #1c1b18';
      for(const r of rows){
        const id=r.dataset.id, cn=(r.querySelector('h3')||{}).textContent||'';
        const fr=(r.querySelector('.tag-fr')||{}).textContent||'';
        const li=document.createElement('li');
        li.style.cssText='display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #bdbbb2;font-size:13px;line-height:1.35';
        li.innerHTML='<b style="flex:0 0 32px">'+id+'</b><span style="flex:1 1 auto">'+cn+'</span><span style="flex:0 0 auto;color:#56534b;font-size:12px">'+fr.replace(/\\s+/g,' ')+'</span>';
        strip.appendChild(li);
      }
      if (${JSON.stringify(v.inject)} === 'in-rail') host.prepend(strip); else host.before(strip);
      return 1;
    })()`);
    await sleep(700);
  }

  const perSort = {};
  for (const [val] of SORTS) {
    await setSort(page, val);
    await page.eval('window.scrollTo(0,0)');
    await sleep(250);
    perSort[val] = await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')]; const vh=innerHeight;
      const ft=rows[0].getBoundingClientRect().top+scrollY;
      const hs=rows.map(el=>({id:el.dataset.id,h:+el.getBoundingClientRect().height.toFixed(1)}));
      const sl=hs.map(d=>({id:d.id,slack:+(vh-(ft+d.h)).toFixed(1)})).sort((a,b)=>a.slack-b.slack);
      const full=rows.filter(el=>{const b=el.getBoundingClientRect();return b.top>=-0.5&&b.bottom<=vh+0.5;}).length;
      return {full, sh:document.documentElement.scrollHeight, vh:+vh, firstTop:+ft.toFixed(1), worst:sl[0],
              meanH:+(hs.reduce((a,d)=>a+d.h,0)/hs.length).toFixed(1)};
    })()`);
  }
  const n = perSort.n;
  // 图片指标副作用
  const imgs = await page.eval(`(() => {
    const vis=[...document.querySelectorAll('#ledger img')].filter(i=>i.getBoundingClientRect().width>0).length;
    return { ledgerImgs: document.querySelectorAll('#ledger img').length, visibleImgs: vis, dpr: devicePixelRatio };
  })()`);
  const rec = { label: v.label, screens: +(n.sh / n.vh).toFixed(3), fullAll: Object.values(perSort).map((x) => x.full),
    worstSlack: perSort.gate.worst, firstTop: n.firstTop, meanH: n.meanH, imgs, perSort };
  out.variants.push(rec);
  console.log(v.label.padEnd(22), 'screens=' + String(rec.screens).padEnd(7), 'full=' + JSON.stringify(rec.fullAll),
    'worst=' + rec.worstSlack.id + '/' + rec.worstSlack.slack, 'meanH=' + rec.meanH, 'imgs=' + imgs.visibleImgs + '/' + imgs.ledgerImgs);
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p8-refined.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p8-refined.json');
await browser.close();
