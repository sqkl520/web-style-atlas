// 裁决 3 + 5 实测：行卡布局（family 放开的代价）与详情面板可发现性
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startServer } from './_v_srv.mjs';

const OUT = resolve('deliverables/65-plan/_v_out');
mkdirSync(OUT, { recursive: true });

const srv = await startServer({ root: resolve('.') });
const browser = await Browser.launch();
const out = { at: new Date().toISOString(), rows: [], panel: [] };

const probeRows = () => {
  const rows = [...document.querySelectorAll('.row')];
  return rows.map((row) => {
    const r = row.getBoundingClientRect();
    const fam = row.querySelector('.row-family');
    const def = row.querySelector('.row-def');
    const main = row.querySelector('.row-main');
    const meta = row.querySelector('.row-meta');
    const cs = fam ? getComputedStyle(fam) : null;
    return {
      id: row.getAttribute('data-id'),
      rowH: +r.height.toFixed(1),
      famH: fam ? +fam.getBoundingClientRect().height.toFixed(1) : 0,
      famW: fam ? +fam.getBoundingClientRect().width.toFixed(1) : 0,
      famScrollW: fam ? fam.scrollWidth : 0,
      famText: fam ? fam.textContent : '',
      famLineH: cs ? parseFloat(cs.lineHeight) : 0,
      famWhite: cs ? cs.whiteSpace : '',
      metaH: meta ? +meta.getBoundingClientRect().height.toFixed(1) : 0,
      mainH: main ? +main.getBoundingClientRect().height.toFixed(1) : 0,
      defH: def ? +def.getBoundingClientRect().height.toFixed(1) : 0,
      metaWraps: meta ? meta.getBoundingClientRect().height > 22 : null,
    };
  });
};

// 把 family 换成「全长第一句」/「第一句+机制句」/「全文」，量行卡高度变化
const applyFamilyVariant = (arg) => {
  const { mode, map } = arg;
  const rows = [...document.querySelectorAll('.row')];
  for (const row of rows) {
    const id = row.getAttribute('data-id');
    const fam = row.querySelector('.row-family');
    if (!fam) continue;
    const full = map[id] || '';
    const segs = full.split('。').filter((s) => s.trim());
    const name = (segs[0] || '').split('：').pop();
    const mech = (segs.find((s, i) => i > 0 && /偷|拿的|不是/.test(s)) || '');
    let txt = name;
    if (mode === 'name') txt = name;
    else if (mode === 'name_mech') txt = name + (mech ? '。' + mech : '');
    else if (mode === 'full') txt = full;
    else if (mode === 'name_noslice') txt = name;
    fam.textContent = txt;
  }
  return true;
};

try {
  // ---- 行卡：1440 桌面 ----
  const families = {};
  const dataTxt = (await import('node:fs')).readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
  const rowsData = JSON.parse(dataTxt.slice(dataTxt.indexOf('= ') + 2).replace(/;\s*$/, ''));
  for (const r of rowsData) families[r.id] = r.family || '';

  for (const vp of [{ label: 'desktop-1440', w: 1440, h: 900 }, { label: 'mobile-390', w: 390, h: 844, mobile: true }]) {
    const page = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: !!vp.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await sleep(600);

    for (const mode of ['name', 'name_mech', 'full']) {
      await page.eval(applyFamilyVariant, { mode, map: families });
      await sleep(350);
      const m = await page.eval(probeRows);
      const heights = m.map((x) => x.rowH);
      const fams = m.map((x) => x.famH);
      const sum = heights.reduce((a, b) => a + b, 0);
      out.rows.push({
        viewport: vp.label, mode,
        rowH: { min: Math.min(...heights), max: Math.max(...heights), avg: +(sum / heights.length).toFixed(1), sum: +sum.toFixed(1) },
        famH: { min: Math.min(...fams), max: Math.max(...fams), avg: +(fams.reduce((a, b) => a + b, 0) / fams.length).toFixed(1) },
        details: m,
      });
      console.log(`${vp.label} mode=${mode.padEnd(9)} rowH min/max/avg=${Math.min(...heights)}/${Math.max(...heights)}/${(sum / heights.length).toFixed(1)}  famH avg=${(fams.reduce((a, b) => a + b, 0) / fams.length).toFixed(1)}`);
    }
    await page.close();
  }

  // ---- 详情面板：首字段位置、scrollHeight、各段高度 ----
  for (const sid of ['S01', 'S08', 'S13', 'S15', 'S24', 'S26', 'S30']) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
    await sleep(800);
    await page.eval('document.getElementById("detail").scrollTop = 0');
    await sleep(200);
    const m = await page.eval(() => {
      const detail = document.getElementById('detail');
      const head = document.querySelector('.detail-head');
      const dRect = detail.getBoundingClientRect();
      const st = detail.scrollTop;
      const rel = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: +(r.top - dRect.top + st).toFixed(1), h: +r.height.toFixed(1) };
      };
      const body = document.getElementById('d-body');
      const fields = [...document.querySelectorAll('#d-body .field')].map((el, i) => ({
        i,
        label: el.querySelector('dt') ? el.querySelector('dt').textContent.trim() : '',
        ...rel(el),
      }));
      return {
        contentH: detail.scrollHeight,
        clientH: detail.clientHeight,
        headH: +head.getBoundingClientRect().height.toFixed(1),
        bodyTop: rel(body).top,
        cta: rel(document.querySelector('.prompt-cta')),
        viewer: rel(document.querySelector('.viewer')),
        viewerStage: rel(document.querySelector('.viewer-stage')),
        proto: rel(document.querySelector('.open-proto')),
        gate: rel(document.querySelector('.gate-box')),
        parts: rel(document.querySelector('.parts')),
        fieldsDl: rel(document.querySelector('#d-body .fields')),
        firstFieldTop: fields.length ? fields[0].top : null,
        fieldCount: fields.length,
        fields,
        scrollScreens: +(detail.scrollHeight / detail.clientHeight).toFixed(2),
      };
    });
    out.panel.push({ id: sid, ...m });
    console.log(`${sid} contentH=${m.contentH} screens=${m.scrollScreens} firstField=${m.firstFieldTop} cta=${m.cta && m.cta.top} viewer=${m.viewer && m.viewer.h} parts=${m.parts && m.parts.h} fieldsN=${m.fieldCount}`);
    await page.close();
  }

  // ---- 详情面板：加一个 audit 折叠块（模拟 <details>）量增量 ----
  for (const sid of ['S13', 'S15', 'S26']) {
    const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
    await page.goto(srv.origin + '/prototypes/_selection/index.html', { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await page.eval((id) => { const r = document.querySelector('.row[data-id="' + id + '"]'); if (r) r.click(); }, sid);
    await sleep(700);
    const before = await page.eval(() => document.getElementById('detail').scrollHeight);
    const afterFold = await page.eval((id) => {
      const dl = document.querySelector('#d-body .fields');
      const S = window.SCHEMES.find((x) => x.id === id);
      const d = document.createElement('div');
      d.className = 'field';
      d.innerHTML = '<dt>去 AI 味审查点</dt><dd><details><summary>summary</summary><div>' + String(S.audit || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) + '</div></details></dd>';
      dl.appendChild(d);
      return { h: document.getElementById('detail').scrollHeight, auditLen: (S.audit || '').length };
    }, sid);
    const afterOpen = await page.eval(() => {
      const d = document.querySelector('#d-body .fields details');
      if (d) d.open = true;
      return document.getElementById('detail').scrollHeight;
    });
    out.panel.push({ id: sid, foldTest: { before, afterFoldClosed: afterFold.h, afterFoldOpen: afterOpen, auditLen: afterFold.auditLen } });
    console.log(`${sid} FOLD before=${before} closed=${afterFold.h} (+${afterFold.h - before}) open=${afterOpen} (+${afterOpen - before}) audit=${afterFold.auditLen}字`);
    await page.close();
  }
} finally {
  await browser.close();
  await srv.close();
}

writeFileSync(join(OUT, 'measure.json'), JSON.stringify(out, null, 2));
console.log('\nwrote _v_out/measure.json');
