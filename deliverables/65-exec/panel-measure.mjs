/* 65-exec 面板可发现性：逐案实测（只读仓库，唯一的写是 deliverables/ 下的 json/png）。
   用法：node deliverables/65-exec/panel-measure.mjs before|after
   量的是「用户点开详情后，在 900px 视口里第一眼能到哪」：
     · 面板 scrollHeight / clientHeight（滚屏成本）
     · #d-body 里字段区之前每一段的高度（谁吃掉了首屏）
     · 第一个 .field 在面板滚动坐标系里的 top（= 验收 1 的指标）
   坐标换算：getBoundingClientRect().top - panelRect.top + panel.scrollTop，
   与 deliverables/65-audit/lab/measure-baseline.mjs 同一口径，便于横向对比旧数。 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from '../65-audit/lab/serve.mjs';

const LABEL = process.argv[2] || 'before';
const OUT = resolve('deliverables/65-exec');
const SHOTS = join(OUT, 'shots-panel');
mkdirSync(SHOTS, { recursive: true });

/* 面板内探针：所有数字都在页面里现算，脚本不猜任何值。 */
function probe() {
  const detail = document.getElementById('detail');
  const dRect = detail.getBoundingClientRect();
  const st = detail.scrollTop;
  const rel = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1), bottom: +(r.bottom - dRect.top + st).toFixed(1) };
  };
  const fields = [...document.querySelectorAll('#d-body .field')].map((el) => ({
    label: (el.querySelector('dt') || {}).textContent ? el.querySelector('dt').textContent.trim() : '',
    ...rel(el),
  }));
  const parts = [...document.querySelectorAll('#d-body .parts li')].map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60));
  const det = [...document.querySelectorAll('#d-body details')].map((d) => ({
    summary: ((d.querySelector('summary') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    open: d.open, h: +d.getBoundingClientRect().height.toFixed(1),
  }));
  const stage = document.querySelector('.viewer-stage');
  return {
    contentH: detail.scrollHeight,
    clientH: detail.clientHeight,
    headH: +(document.querySelector('.detail-head') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height.toFixed(1),
    blocks: [...document.querySelectorAll('#d-body > *')].map((el) => ({
      cls: String(el.className || el.tagName.toLowerCase()).split(' ')[0],
      tag: el.tagName.toLowerCase(),
      ...rel(el),
    })),
    viewerStage: rel(stage),
    stageScrollable: stage ? stage.scrollHeight > stage.clientHeight + 2 : null,
    stageScrollH: stage ? stage.scrollHeight : null,
    strip: rel(document.querySelector('.viewer-strip')),
    parts: rel(document.querySelector('.parts')),
    gate: rel(document.querySelector('.gate-box')),
    proto: rel(document.querySelector('.open-proto')),
    cta: rel(document.querySelector('.prompt-cta')),
    fieldsDl: rel(document.querySelector('#d-body .fields')),
    firstFieldTop: fields.length ? fields[0].top : null,
    fieldCount: fields.length,
    fields,
    partsItems: parts,
    details: det,
    hOverflow: detail.scrollWidth - detail.clientWidth,
    docHOverflow: document.documentElement.scrollWidth - innerWidth,
  };
}

const srv = await startServer(resolve('.'));
const browser = await Browser.launch();
const out = { label: LABEL, at: new Date().toISOString(), desktop: [], mobile: [], shots: [] };

const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

try {
  // ── 1440×900：30 案逐案 ───────────────────────────────────────────────
  const dPage = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
  await dPage.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1400 });
  await dPage.eval('document.fonts.ready.then(() => true)').catch(() => {});
  for (const id of IDS) {
    await dPage.eval((sid) => { location.hash = '#' + sid; }, id);
    await sleep(420);
    await dPage.eval(() => { document.getElementById('detail').scrollTop = 0; });
    await sleep(60);
    const m = await dPage.eval(probe);
    m.id = id;
    out.desktop.push(m);
    console.log(`[desktop] ${id} contentH=${m.contentH} firstField=${m.firstFieldTop} stage=${m.viewerStage && m.viewerStage.h} parts=${m.parts && m.parts.h} gate=${m.gate && m.gate.h} proto=${m.proto && m.proto.h} hOv=${m.hOverflow}`);
  }

  // 截图：S01 / S13 / S26（改前改后各一组）
  for (const id of ['S01', 'S13', 'S26']) {
    await dPage.eval((sid) => { location.hash = '#' + sid; }, id);
    await sleep(500);
    await dPage.eval(() => { document.getElementById('detail').scrollTop = 0; });
    await sleep(200);
    const file = join(SHOTS, `${LABEL}-1440-S_id${id}.jpg`);
    await dPage.screenshot({ path: file, quality: 82, clip: { x: 880, y: 0, width: 560, height: 900, scale: 1 } });
    out.shots.push({ file: file.replace(resolve('.') + '\\', '').replace(/\\/g, '/'), id, vp: '1440x900' });
  }
  await dPage.close();

  // ── 390×844：30 案逐案（横向滚动 + 首字段）────────────────────────────
  const mPage = await browser.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  await mPage.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1400 });
  await mPage.eval('document.fonts.ready.then(() => true)').catch(() => {});
  for (const id of IDS) {
    await mPage.eval((sid) => { location.hash = '#' + sid; }, id);
    await sleep(420);
    await mPage.eval(() => { document.getElementById('detail').scrollTop = 0; });
    await sleep(60);
    const m = await mPage.eval(probe);
    m.id = id;
    out.mobile.push(m);
    console.log(`[mobile] ${id} contentH=${m.contentH} firstField=${m.firstFieldTop} hOv=${m.hOverflow} docOv=${m.docHOverflow}`);
  }
  for (const id of ['S01', 'S13', 'S26']) {
    await mPage.eval((sid) => { location.hash = '#' + sid; }, id);
    await sleep(500);
    await mPage.eval(() => { document.getElementById('detail').scrollTop = 0; });
    await sleep(200);
    const file = join(SHOTS, `${LABEL}-390-S_id${id}.jpg`);
    await mPage.screenshot({ path: file, quality: 82 });
    out.shots.push({ file: file.replace(resolve('.') + '\\', '').replace(/\\/g, '/'), id, vp: '390x844' });
  }
  await mPage.close();
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(OUT, `panel-${LABEL}.json`), JSON.stringify(out, null, 2));
const d = out.desktop, m = out.mobile;
const stat = (arr, k) => {
  const v = arr.map((x) => x[k]).filter((x) => typeof x === 'number');
  return { min: Math.min(...v), max: Math.max(...v), avg: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(0) };
};
console.log('\n==== ' + LABEL + ' ====');
console.log('1440 firstField', JSON.stringify(stat(d, 'firstFieldTop')));
console.log('1440 contentH  ', JSON.stringify(stat(d, 'contentH')));
console.log('390  firstField', JSON.stringify(stat(m, 'firstFieldTop')));
console.log('390  contentH  ', JSON.stringify(stat(m, 'contentH')));
console.log('390  hOverflow max', Math.max(...m.map((x) => x.hOverflow)), 'docHOverflow max', Math.max(...m.map((x) => x.docHOverflow)));
console.log('shots:', out.shots.map((s) => s.file).join(' '));
