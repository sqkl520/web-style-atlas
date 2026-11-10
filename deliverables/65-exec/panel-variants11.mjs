/* 变体实验 11：移动端最后 40–60px 从哪来。
   现状（after4）：移动端 657.4–720.6，worst 720.6 = 完全没有余量（差 0.6px 就破线）。
   注意这 720.6 里的 .prompt-cta 是 338.5px —— 那是**另一个 Agent 本轮新加的两个输入框**，
   不在我的改动范围（prompt-copy.js 明确不许动）。也就是说我的余量必须能吸收它。
   候选（全部只动 CSS，不动内容）：
     H1 ≤620 档隐藏 .fold-gate/.fold-parts 的副标题行（标题仍写清是什么、段数仍在标题里）
     H2 H1 + 缩略图 48→40
     H3 ≤620 档三条副标题全隐藏（预览那条也藏）
   判定：worst ≤ 700 才算留出余量（20px = 一次字体回退）。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(3 - 1, '0').slice(-2));
const ids = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  H0_none: '',
  H1_hideGatePartsSub: '.fold-gate .fold-sub,.fold-parts .fold-sub{display:none}',
  H2_plus_thumb40: '.fold-gate .fold-sub,.fold-parts .fold-sub{display:none}.fold-thumb{height:40px}',
  H3_hideAllSub: '.fold-sub{display:none}',
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
    foldH: [...document.querySelectorAll('#d-body details')].map((d) => +d.getBoundingClientRect().height.toFixed(1)),
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
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
        const { sid, css } = arg;
        const old = document.getElementById('__exp'); if (old) old.remove();
        if (css) { const s = document.createElement('style'); s.id = '__exp'; s.textContent = css; document.head.appendChild(s); }
        location.hash = '#' + sid;
      }, { sid: id, css });
      await sleep(420);
      await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
      rows.push({ id, ...(await page.eval(probe)) });
    }
    const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
    out.variants[name] = {
      firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
      contentH: { min: Math.min(...ch), max: Math.max(...ch) },
      over720: rows.filter((r) => r.firstField > 720).length,
      worst: rows.slice().sort((a, b) => b.firstField - a.firstField).slice(0, 5).map((r) => r.id + '=' + r.firstField).join(' '),
      foldH: rows.find((r) => r.id === 'S15').foldH,
      hOvMax: Math.max(...rows.map((r) => r.hOv)),
      rows,
    };
    const v = out.variants[name];
    console.log(`${name.padEnd(22)} ff ${v.firstField.min}–${v.firstField.max} (avg ${v.firstField.avg})  ch ${v.contentH.min}–${v.contentH.max}  超720:${v.over720}  folds=${v.foldH.join('/')}  hOv=${v.hOvMax}`);
    console.log(`   worst: ${v.worst}`);
  }
  await page.close();
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants11.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants11.json');
