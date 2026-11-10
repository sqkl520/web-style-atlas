/* 变体实验 8：定稿形态。
   前六轮的硬结论（都在 1440×900 与 390×844 上逐 30 案实测）：
     1) `.viewer-stage{max-height:62vh}` 在 1440 档**从未生效**：面板宽 560px，桌面截图 1440×900
        按宽度缩放后整图只有 323px，比 62vh(=558px) 矮 ⇒ 这条规则只省 0px。
        规划 Agent 估的「降 200–350px」不成立，实测降 123px（200px 限高生效后）。
     2) 另一个 Agent 在本轮中途改了 prompt-copy.js/style.css，把 .prompt-cta 从 93px 撑到
        299–394px（新增两个输入框）。首字段因此从 1,140 → 1,362–1,464。规划给的
        784–1,196 与「①+② ≤720」在这个现状下已不成立。
     3) 只要大图**默认可见**，哪怕压到 140px、其余全折，桌面最好也只到 695–747（14/30 超 720）、
        移动 840–905（30/30 超）。原因是 390 档 .prompt-cta 独占 394px + 头部 92px。
     4) 大图**默认收起**后，两档都过：桌面 455–505、移动 579–642。
   所以图必须默认收起。但"收起"不等于"看不见"：summary 里放一张真缩略图，
   用户第一眼仍看到这案长什么样，点开才是可滚动的全图。本脚本量这个 summary 的成本。 */
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const OUT = resolve('deliverables/65-exec');
const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

const VARIANTS = {
  'F1_thumb110_gateclosed': { thumb: 110, foldGate: true },
  'F2_thumb110_gateopen': { thumb: 110, foldGate: false },
  'F3_thumb64_gateclosed': { thumb: 64, foldGate: true },
  'F4_nothumb_gateclosed': { thumb: 0, foldGate: true },
  'F5_thumb110_gateclosed_notight': { thumb: 110, foldGate: true, tight: false },
};

function apply(arg) {
  const { thumb, foldGate, tight = true } = arg;
  const T = '.viewer{margin-bottom:12px}.open-proto{margin-bottom:12px}.gate-box{margin-bottom:0}.parts{margin-bottom:0}';
  const old = document.getElementById('__exp'); if (old) old.remove();
  const st = document.createElement('style'); st.id = '__exp';
  st.textContent = '.viewer-stage{max-height:200px}' + (tight ? T : '');
  document.head.appendChild(st);
  const mk = (cls, sum) => {
    const d = document.createElement('details');
    d.className = 'fold ' + cls;
    d.innerHTML = sum;
    return d;
  };
  const viewer = document.querySelector('#d-body .viewer');
  if (viewer && !viewer.closest('details')) {
    const img = document.querySelector('#d-body .viewer-stage img');
    const src = img ? img.getAttribute('src') : '';
    const th = thumb
      ? '<img class="fold-thumb" style="height:' + thumb + 'px" src="' + src + '" alt="">'
      : '';
    const d = mk('fold-view',
      '<summary>' + th + '<span class="fold-t">原型截图预览 · 点开看全图（可滚动）</span>' +
      '<span class="fold-sub">1440 / 768 / 390 三档</span></summary>');
    viewer.parentNode.insertBefore(d, viewer); d.appendChild(viewer);
  }
  const parts = document.querySelector('#d-body .parts');
  if (parts && !parts.closest('details')) {
    const n = parts.querySelectorAll('li').length;
    const d = mk('fold-parts', '<summary>上站文案 ' + n + ' 段：主张句 / 按钮 / 空状态 / 错误状态</summary>');
    parts.parentNode.insertBefore(d, parts); d.appendChild(parts);
  }
  const gate = document.querySelector('#d-body .gate-box');
  if (foldGate && gate && !gate.closest('details')) {
    const tags = [...gate.querySelectorAll('.tag')].map((t) => t.textContent).join(' · ');
    const nums = (gate.querySelector('.gate-line span') || {}).textContent || '';
    const d = mk('fold-gate', '<summary>闸门：' + tags + '　' + nums + '</summary>');
    gate.parentNode.insertBefore(d, gate); d.appendChild(gate);
  }
  return true;
}

const probe = () => {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
  };
  const f = document.querySelector('#d-body .field');
  return {
    contentH: detail.scrollHeight,
    firstField: f ? rel(f).top : null,
    folds: [...document.querySelectorAll('#d-body details')].map((d) => ({
      sum: (d.querySelector('summary') || {}).textContent.replace(/\s+/g, ' ').trim().slice(0, 26),
      h: +d.getBoundingClientRect().height.toFixed(1),
    })),
    hOv: detail.scrollWidth - detail.clientWidth,
    docOv: document.documentElement.scrollWidth - innerWidth,
  };
};

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), variants: {} };
try {
  for (const vp of [{ k: 'desktop', w: 1440, h: 900, mobile: false }, { k: 'mobile', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1500 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    for (const [name, v] of Object.entries(VARIANTS)) {
      const rows = [];
      for (const id of IDS) {
        await page.eval((sid) => { location.hash = '#' + sid; }, id);
        await sleep(400);
        await page.eval(apply, v);
        await sleep(90);
        await page.eval(() => { document.getElementById('detail').scrollTop = 0; });
        rows.push({ id, ...(await page.eval(probe)) });
      }
      const ff = rows.map((r) => r.firstField), ch = rows.map((r) => r.contentH);
      const key = vp.k + ':' + name;
      out.variants[key] = {
        firstField: { min: Math.min(...ff), max: Math.max(...ff), avg: Math.round(ff.reduce((a, b) => a + b, 0) / ff.length) },
        contentH: { min: Math.min(...ch), max: Math.max(...ch) },
        over720: rows.filter((r) => r.firstField > 720).length,
        over3800: rows.filter((r) => r.contentH > 3800).length,
        hOvMax: Math.max(...rows.map((r) => r.hOv)), docOvMax: Math.max(...rows.map((r) => r.docOv)),
        folds: rows[0].folds,
        rows,
      };
      const v2 = out.variants[key];
      console.log(`${key.padEnd(36)} ff ${v2.firstField.min}–${v2.firstField.max} (avg ${v2.firstField.avg})  ch ${v2.contentH.min}–${v2.contentH.max}  超720:${v2.over720}/30  超3800:${v2.over3800}/30  hOv ${v2.hOvMax}  folds=${v2.folds.map((f) => f.h).join('/')}`);
    }
    await page.close();
  }
} finally { await browser.close(); await srv.close(); }
writeFileSync(join(OUT, 'panel-variants8.json'), JSON.stringify(out, null, 2));
console.log('\nwrote panel-variants8.json');
