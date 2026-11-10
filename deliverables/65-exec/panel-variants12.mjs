/* 变体实验 12：在 H1（移动端 618.4–681.6，余量 38px）的基础上，尽量**少藏字**。
   H1 藏掉了 gate 与 parts 两条副标题。问题是 parts 那条副标题
   「主张句 / 按钮 / 空状态 / 错误状态」正是"里面是什么"的答案，藏了标题就只剩「上站文案 4 段」。
   本脚本比较：
     K1 = H1（gate+parts 副标题都藏）
     K2 = 只藏 gate 副标题（parts 保留四段名）—— 多付 ~18px，看还能不能守住 700
     K3 = 只藏 gate 副标题 + 缩略图 48→40
     K4 = K3 + preview 副标题缩成一行（改文案，不藏）
   判定：worst ≤ 700 且 parts 副标题可见 ⇒ 选它。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  K1: '.fold-gate .fold-sub,.fold-parts .fold-sub{display:none}',
  K2: '.fold-gate .fold-sub{display:none}',
  K3: '.fold-gate .fold-sub{display:none}.fold-thumb{height:40px}',
  K4: '.fold-gate .fold-sub{display:none}.fold-thumb{height:40px}.fold-sub{font-size:12px;line-height:1.4}',
};

const probe = () => {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) }; };
  const f = document.querySelector('#d-body .field');
  return {
    contentH: detail.scrollHeight,
    firstField: f ? rel(f).top : null,
    folds: [...document.querySelectorAll('#d-body details')].map((d) => ({
      cls: d.className, h: +d.getBoundingClientRect().height.toFixed(1),
      subVisible: (() => { const s = d.querySelector('.fold-sub'); return s ? getComputedStyle(s).display !== 'none' : null; })(),
      subText: (() => { const s = d.querySelector('.fold-sub'); return s ? s.textContent : null; })(),
    })),
    hOv: detail.scrollWidth - detail.clientWidth,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  const page = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
  await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
  for (const [name, css] of Object.entries(VARIANTS)) {
    const rows = [];
    for (const id of ids) {
      await page.eval((arg) => {
        const old = document.getElementById('__exp'); if (old) old.remove();
        if (arg.css) { const s = document.createElement('style'); s.id = '__exp'; s.textContent = arg.css; document.head.appendChild(s); }
        location.hash = '#' + arg.sid;
      }, { sid: id, css });
      await sleep(420);
      await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
      rows.push({ id, ...(await page.eval(probe)) });
    }
    const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
    out.variants[name] = {
      min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length),
      contentH: { min: Math.min(...ch), max: Math.max(...ch) },
      over720: rows.filter((r) => r.firstField > 720).length,
      over700: rows.filter((r) => r.firstField > 700).length,
      worst: rows.slice().sort((a, b) => b.firstField - a.firstField).slice(0, 3).map((r) => r.id + '=' + r.firstField).join(' '),
      folds: rows.find((r) => r.id === 'S15').folds.map((f) => f.cls.replace('fold ', '') + ':' + f.h + (f.subVisible ? '+sub' : '')),
      hOvMax: Math.max(...rows.map((r) => r.hOv)),
      rows,
    };
    const v = out.variants[name];
    console.log(`${name}: ff ${v.min}–${v.max} (avg ${v.avg})  ch ${v.contentH.min}–${v.contentH.max}  超720:${v.over720} 超700:${v.over700}  hOv=${v.hOvMax}`);
    console.log(`   worst ${v.worst}`);
    console.log(`   folds ${v.folds.join(' / ')}`);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants12.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants12.json');
