// P7 — 解法2（分组折叠）、解法4（加载更多/分页）、解法5（我自己的：30 行目录索引）
import { Browser, openPage, settle, setSort, SORTS, sleep } from './lib.mjs';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '8901';
const browser = await Browser.launch({ width: 1200, height: 900 });
const out = { groups: null, variants: [] };

// 先取分组维度的真实分布
{
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);
  out.groups = await page.eval(`(() => {
    const rows=[...document.querySelectorAll('#ledger .row')];
    const pick=(sel)=>rows.map(r=>{const e=r.querySelector(sel); return e?e.textContent.trim():null});
    const fr=[...document.querySelectorAll('.row-head .tag-fr')].map(e=>e.textContent.trim());
    const tone=[...document.querySelectorAll('.row-head .tag:not(.tag-fr)')].map(e=>e.textContent.trim());
    const fam=rows.map(r=>{const e=r.querySelector('.row-family'); return e?e.textContent.trim().slice(0,20):null});
    const cnt=(a)=>{const m={}; a.forEach(x=>{if(x)m[x]=(m[x]||0)+1}); return Object.entries(m).sort((x,y)=>y[1]-x[1]);};
    return { frGroups: cnt(fr), toneGroups: cnt(tone), familySample: fam.slice(0,5),
             frDistinct: new Set(fr).size,
             heights: rows.map(r=>+r.getBoundingClientRect().height.toFixed(1)) };
  })()`);
  console.log('FR 分组（结构类型）:', JSON.stringify(out.groups.frGroups));
  console.log('distinct fr =', out.groups.frDistinct);
  await page.close();
}

// 解法2：按结构类型分组，只留组头条（模拟「默认收起」）
// 解法4a：加载更多（先 10 行 + 一个按钮）
// 解法5：顶部 30 行紧凑目录（一行一案）
const VARIANTS = {
  'V2 分组折叠(仅组头)': `#ledger .row{display:none}
     #ledger .row:nth-child(1),#ledger .row:nth-child(6),#ledger .row:nth-child(12),
     #ledger .row:nth-child(18),#ledger .row:nth-child(24),#ledger .row:nth-child(29){display:grid}`,
  'V4a 加载更多(先10行)': `#ledger .row:nth-child(n+11){display:none}`,
  'V4b 分页(每页10行)': `#ledger .row:nth-child(n+11){display:none}`,
  'V5 顶部30行目录(一行一案)': null,
};

for (const [label, css] of Object.entries(VARIANTS)) {
  const page = await openPage(browser, { width: 390, height: 844, mobile: true, dsf: 2 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/_selection/`, { settleMs: 1200 });
  await settle(page, 1500);

  if (label.startsWith('V5')) {
    // 注入一个 30 行紧凑目录（真实 DOM，不写文件）
    await page.eval(`(() => {
      const rows=[...document.querySelectorAll('#ledger .row')];
      const strip=document.createElement('ol');
      strip.id='__idx';
      strip.style.cssText='list-style:none;margin:0 0 10px;padding:0;border-top:2px solid #1c1b18';
      for(const r of rows){
        const id=r.dataset.id;
        const cn=(r.querySelector('h3')||{}).textContent||'';
        const fr=(r.querySelector('.tag-fr')||{}).textContent||'';
        const li=document.createElement('li');
        li.style.cssText='display:flex;gap:8px;align-items:baseline;padding:7px 0;border-bottom:1px solid #bdbbb2;font-size:13px;line-height:1.35';
        li.innerHTML='<b style="flex:0 0 32px">'+id+'</b><span style="flex:1 1 auto">'+cn+'</span><span style="flex:0 0 auto;color:#56534b;font-size:12px">'+fr.replace(/\\s+/g,' ')+'</span>';
        strip.appendChild(li);
      }
      document.querySelector('#ledger').before(strip);
      return 1;
    })()`);
    await sleep(600);
  } else if (css) {
    await page.eval(`(() => { const s=document.createElement('style'); s.id='__v'; s.textContent=${JSON.stringify(css)}; document.head.appendChild(s); return 1; })()`);
    await sleep(700);
  }

  const r = await page.eval(`(() => {
    const d=document.documentElement, vh=innerHeight;
    const vis=[...document.querySelectorAll('#ledger .row')].filter(el=>{const b=el.getBoundingClientRect();return b.height>0 && b.bottom>0 && b.top<vh;});
    const idx=document.getElementById('__idx');
    const ib=idx?idx.getBoundingClientRect():null;
    return { sh:d.scrollHeight, vh:+vh, screens:+(d.scrollHeight/vh).toFixed(3),
      rowsShown: [...document.querySelectorAll('#ledger .row')].filter(el=>el.getBoundingClientRect().height>0).length,
      firstScreenRows: vis.map(el=>el.dataset.id),
      idxH: ib?+ib.height.toFixed(0):null, idxScreens: ib?+(ib.height/vh).toFixed(2):null,
      idxFirstScreenItems: ib? [...idx.querySelectorAll('li')].filter(li=>{const b=li.getBoundingClientRect();return b.bottom>0&&b.top<vh;}).length : null };
  })()`);
  out.variants.push({ label, ...r });
  console.log(label.padEnd(26), 'screens=' + String(r.screens).padEnd(7), 'rowsShown=' + String(r.rowsShown).padEnd(3),
    'idxH=' + r.idxH, 'idxScreens=' + r.idxScreens, 'idxFirstScreen=' + r.idxFirstScreenItems);
  await page.close();
}

writeFileSync('deliverables/69-audit/data-p7-group-load.json', JSON.stringify(out, null, 2));
console.log('\nwrote data-p7-group-load.json');
await browser.close();
