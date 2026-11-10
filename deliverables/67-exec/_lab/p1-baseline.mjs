// p1-baseline.mjs — 390×844 / 1440×900 基线精确测量（2026-10-28）。
// 目的：把 scrollHeight 拆成"必须保留 / 可适度压 / 纯浪费"三类，为方案设计提供数字。
// 不改源码，只读 DOM。
import { Browser } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, PAGE, IDS, COLLECT, openCase, sleep, summary } from './lib.mjs';

const browser = await Browser.launch({ width: 1440, height: 900 });
const out = { at: new Date().toISOString(), base: {}, };

for (const vp of [{ k: '390', w: 390, h: 844, m: true }, { k: '1440', w: 1440, h: 900, m: false }]) {
  const p = await browser.newPage({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.setViewport({ width: vp.w, height: vp.h, dsf: 1, mobile: vp.m });
  await p.goto(PAGE, { settleMs: 1600 });
  const rows = [];
  for (const id of IDS) {
    await openCase(p, id);
    rows.push({ ...(await p.eval(COLLECT)), id });
  }
  out.base[vp.k] = rows;
  const s = summary(rows, 3800);
  console.log(`[${vp.k}] scrollH ${s.min}–${s.max} (avg ${s.avg}, med ${s.med}) 屏数max=${s.screensMax} >3800=${s.over}/30 首字段 ${s.firstFieldMin}–${s.firstFieldMax} fs=${s.fs} lh=${s.lh} textW=${s.textW} details=${s.details} hOv=${s.hOvMax}`);

  // 逐案明细（390 打全，1440 打摘要）
  if (vp.k === '390') {
    for (const r of rows) {
      console.log(`  ${r.id} scrollH=${String(r.scrollH).padStart(5)} 字段区=${String(Math.round(r.fieldsH)).padStart(5)} 首字段=${String(Math.round(r.firstFieldTop)).padStart(4)} 完整字段=${r.fieldsFully}`);
    }
    const r0 = rows[0];
    console.log('  kids of #d-body (S01):', JSON.stringify(r0.kids.map((k) => k.cls + ':' + k.h)));
    console.log('  fields (S01):');
    for (const f of r0.fields) console.log(`    ${f.label.padEnd(12)} top=${String(Math.round(f.top)).padStart(5)} h=${String(Math.round(f.h)).padStart(4)} pad=${f.padT}+${f.padB} dt=${Math.round(f.dtH)} dd=${Math.round(f.ddH)} 字=${f.chars} 行=${f.lines} fs=${f.fs} lh=${f.lh} textW=${f.textW}${f.folded ? ' [FOLD]' : ''}`);
  } else {
    const r0 = rows[0];
    console.log('  kids of #d-body (S01):', JSON.stringify(r0.kids.map((k) => k.cls + ':' + k.h)));
    const f = r0.fields;
    console.log('  fields (S01):', f.map((x) => x.label + '=' + Math.round(x.h)).join(' '));
  }
  await p.close();
}

// 分类统计（390，30 案平均）：把每个字段的 h 拆成 dt / dd / padding / border
{
  const rows = out.base['390'];
  const agg = { fieldsH: 0, ddH: 0, dtH: 0, padH: 0, n: 0, border: 0 };
  for (const r of rows) {
    for (const f of r.fields) {
      agg.fieldsH += f.h; agg.ddH += f.ddH; agg.dtH += f.dtH; agg.padH += f.padT + f.padB; agg.n++;
      agg.border += 1;
    }
  }
  const per = (x) => +(x / 30).toFixed(1);
  const cls = {
    cases: 30, fields: agg.n / 30,
    avgFieldsH: per(agg.fieldsH), avgDdH: per(agg.ddH), avgDtH: per(agg.dtH),
    avgPadH: per(agg.padH), avgBorderH: per(agg.border),
  };
  out.cls390 = cls;
  console.log('\n[390] 字段区平均拆解（30 案）:', JSON.stringify(cls));
  // chrome = scrollH - fieldsH
  const chrome = rows.map((r) => r.scrollH - r.fieldsH);
  console.log('[390] 字段区外 chrome: min ' + Math.min(...chrome).toFixed(1) + ' max ' + Math.max(...chrome).toFixed(1) + ' avg ' + (chrome.reduce((a, b) => a + b, 0) / 30).toFixed(1));
  out.chrome390 = { min: Math.min(...chrome), max: Math.max(...chrome), avg: chrome.reduce((a, b) => a + b, 0) / 30 };
}

writeFileSync(join(HERE, 'p1-baseline.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log('\nwritten p1-baseline.json');
