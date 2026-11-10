// _r9_now.mjs — 当前工作树（已被并发 Agent 改成"折 4 长字段"）实测：到底压到多少
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const d = document.getElementById('detail');
  const fields = Array.from(d.querySelectorAll('.fields .field'));
  const dets = Array.from(d.querySelectorAll('details'));
  const longFolds = Array.from(d.querySelectorAll('.field-long'));
  const sum = Array.from(d.querySelectorAll('.field-fold > details > summary, .field-long > details > summary'))
    .map((s) => { const r = s.getBoundingClientRect(); return { h: +r.height.toFixed(1), t: (s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) }; });
  return {
    scrollH: d.scrollHeight, clientH: d.clientHeight, screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    fieldCount: fields.length, detailsCount: dets.length, detailsOpen: dets.filter((x) => x.open).length,
    longFoldCount: longFolds.length,
    summaries: sum,
    // 展开全部长字段后的高度（验证"内容一字未删"）
    fontsLoaded: document.fonts.status,
  };
};
const OPEN_ALL = () => { document.querySelectorAll('.field-long > details, .field-fold > details').forEach((x) => { x.open = true; }); return 1; };

const br = await Browser.launch({ width: 1440, height: 900 });
const out = { at: new Date().toISOString(), three: {}, all: [] };
for (const [tier, w, h, m] of [['390', 390, 844, true], ['414', 414, 896, true], ['1440', 1440, 900, false]]) {
  const ids = [];
  for (const id of ['S01', 'S08', 'S14', 'S26', 'S29']) {
    const p = await br.newPage({ width: w, height: h, dsf: 2, mobile: m });
    await p.goto(PAGE + '#' + id, { settleMs: 2000 });
    await p.eval('document.fonts.ready.then(()=>1)');
    const closed = await p.eval(M);
    await p.eval(OPEN_ALL); await sleep(250);
    const opened = await p.eval(M);
    ids.push({ id, closed: closed.scrollH, opened: opened.scrollH, screens: closed.screens, dets: closed.detailsCount, long: closed.longFoldCount, sumH: closed.summaries.map((s) => s.h) });
    await p.close();
  }
  out.three[tier] = ids;
  console.log('===', tier, '===');
  ids.forEach((x) => console.log('  ', x.id, 'closed', x.closed, '(' + x.screens + '屏)', '| 全展开', x.opened, '| details', x.dets, '| field-long', x.long, '| summary高', x.sumH.join('/')));
}
await br.close();
writeFileSync(join(HERE, '_r9_now.json'), JSON.stringify(out, null, 1), 'utf8');
