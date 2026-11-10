// _r15_wf2.mjs — 归因拆开：nowrap 单独省多少、加定位再省/费多少；并强制同步刷新
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const SETUP = () => {
  window.__setup = function (addWf) {
    const d = document.getElementById('detail');
    const head = d.querySelector('.detail-head');
    const en = head.querySelector('.detail-title p');
    en.style.whiteSpace = 'nowrap'; en.style.overflow = 'hidden'; en.style.textOverflow = 'ellipsis';
    const fields = Array.from(d.querySelectorAll('.fields .field'));
    if (addWf) {
      const tail = document.createElement('span');
      tail.id = 'wf'; tail.style.cssText = 'font-variant-numeric:tabular-nums';
      en.appendChild(tail);
      window.__upd = function () {
        const hb = head.getBoundingClientRect();
        let cur = null, idx = 0;
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].getBoundingClientRect().bottom > hb.bottom + 2) { cur = fields[i]; idx = i + 1; break; }
        }
        const nm = cur ? (cur.querySelector('dt')?.textContent.trim() || cur.querySelector('summary')?.textContent.trim() || '').slice(0, 4) : '';
        tail.textContent = cur ? ' · ' + idx + '/' + fields.length + ' ' + nm : ' · 完';
        return tail.textContent;
      };
      d.addEventListener('scroll', window.__upd, { passive: true });
      window.__upd();
    }
    return 1;
  };
  window.__at = function (y) {
    const d = document.getElementById('detail');
    d.scrollTop = y;
    if (window.__upd) window.__upd();
    const head = d.querySelector('.detail-head');
    const en = head.querySelector('.detail-title p');
    const fields = Array.from(d.querySelectorAll('.fields .field'));
    const hb = head.getBoundingClientRect();
    let cur = null;
    for (const f of fields) { if (f.getBoundingClientRect().bottom > hb.bottom + 2) { cur = f.querySelector('dt')?.textContent.trim() || '(折叠)'; break; } }
    return { y, en: en.textContent, headH: +hb.height.toFixed(1), curField: cur };
  };
  return 1;
};

const HEAD = () => {
  const d = document.getElementById('detail');
  const head = d.querySelector('.detail-head');
  const en = head.querySelector('.detail-title p');
  return { headH: +head.getBoundingClientRect().height.toFixed(1), enH: +en.getBoundingClientRect().height.toFixed(1), scrollH: d.scrollHeight, maxScroll: d.scrollHeight - d.clientHeight };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const id of ['S01', 'S26', 'S29']) {
  const rec = {};
  for (const [tag, wf] of [['base', null], ['nowrapOnly', false], ['nowrap+wf', true]]) {
    const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
    await p.goto(PAGE + '#' + id, { settleMs: 2100 });
    await p.eval('document.fonts.ready.then(()=>1)');
    rec[tag] = await p.eval(HEAD);
    if (wf !== null) {
      await p.eval(SETUP); await p.eval('window.__setup(' + wf + ')'); await sleep(200);
      rec[tag] = await p.eval(HEAD);
      if (wf) {
        rec[tag].at = [];
        const max = rec[tag].maxScroll;
        for (const y of [0, 600, 1200, 1800, max]) rec[tag].at.push(await p.eval('window.__at(' + y + ')'));
        await p.eval('window.__at(0)');
      }
    }
    await p.close();
  }
  out[id] = rec;
}
await br.close();
writeFileSync(join(HERE, '_r15_wf2.json'), JSON.stringify(out, null, 1), 'utf8');
for (const k of Object.keys(out)) {
  const r = out[k];
  console.log('===', k, '=== base headH', r.base.headH, 'enH', r.base.enH, 'scrollH', r.base.scrollH);
  console.log('  nowrapOnly headH', r.nowrapOnly.headH, 'enH', r.nowrapOnly.enH, 'Δ scrollH', r.nowrapOnly.scrollH - r.base.scrollH);
  console.log('  nowrap+wf  headH', r['nowrap+wf'].headH, 'enH', r['nowrap+wf'].enH, 'Δ scrollH', r['nowrap+wf'].scrollH - r.base.scrollH);
  (r['nowrap+wf'].at || []).forEach((x) => console.log('     y=' + x.y, '| headH', x.headH, '| cur=' + x.curField, '|', x.en));
}
