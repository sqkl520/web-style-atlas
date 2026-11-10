// _r7_wayfind.mjs — 用 0 新增高度解决「不知道读到第几个字段」
// 现有 .detail-head 已经 position:sticky 且高 97.5px；把「当前字段名 / 12」塞进去，delta 高度应为 0
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const BOOT = () => {
  window.__mk = function () {
    const d = document.getElementById('detail');
    const head = d.querySelector('.detail-head');
    const title = head.querySelector('.detail-title');
    // 在标题下方插入一行（标题区已有 en 子行，用同一行的剩余空间）
    const p = document.createElement('p');
    p.setAttribute('data-lab', 'wf');
    p.id = 'wf-line';
    p.style.cssText = 'margin:0;font-size:12px;line-height:1.4;color:var(--ink-3);font-variant-numeric:tabular-nums';
    p.textContent = '';
    title.appendChild(p);
    const fields = Array.from(d.querySelectorAll('.fields .field'));
    const total = fields.length;
    const update = () => {
      const headBottom = head.getBoundingClientRect().bottom;
      let cur = null, idx = 0;
      for (let i = 0; i < fields.length; i++) {
        const b = fields[i].getBoundingClientRect();
        if (b.bottom > headBottom + 2) { cur = fields[i]; idx = i + 1; break; }
      }
      const name = cur ? (cur.querySelector('dt')?.textContent.trim() || cur.querySelector('summary')?.textContent.trim() || '') : '';
      p.textContent = cur ? `${idx}/${total} · ${name}` : `${total}/${total} · 读完`;
      p.style.opacity = cur ? '1' : '0.5';
    };
    d.addEventListener('scroll', update, { passive: true });
    update();
    return total;
  };
  return 1;
};

const MEASURE = () => {
  const d = document.getElementById('detail');
  const head = d.querySelector('.detail-head');
  const hb = head.getBoundingClientRect();
  const fields = Array.from(d.querySelectorAll('.fields .field'));
  const tl = document.querySelector('.detail-title');
  return {
    scrollH: d.scrollHeight, clientH: d.clientHeight,
    screens: +(d.scrollHeight / d.clientHeight).toFixed(2),
    headH: +hb.height.toFixed(1),
    titleH: tl ? +tl.getBoundingClientRect().height.toFixed(1) : null,
    fieldCount: fields.length,
    hasWf: !!document.getElementById('wf-line'),
  };
};

// 滚到 3 个位置，记录 sticky 头里显示什么（这才是用户实际能看到的定位信息）
const AT = (y) => (() => {
  const d = document.getElementById('detail');
  const head = d.querySelector('.detail-head');
  d.scrollTop = y;
  const wf = document.getElementById('wf-line');
  const fields = Array.from(d.querySelectorAll('.fields .field'));
  const hb = head.getBoundingClientRect();
  let cur = null;
  for (const f of fields) { if (f.getBoundingClientRect().bottom > hb.bottom + 2) { cur = f.querySelector('dt')?.textContent.trim() || '(折叠)'; break; } }
  return { y, wf: wf ? wf.textContent : null, headText: head.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), curField: cur };
})();

const br = await Browser.launch({ width: 1440, height: 900 });
const out = {};
for (const id of ['S01', 'S26']) {
  const rec = {};
  let p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p.goto(PAGE + '#' + id, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  rec.before = await p.eval(MEASURE);
  p = (await p.close(), null);
  const p2 = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
  await p2.goto(PAGE + '#' + id, { settleMs: 2200 });
  await p2.eval('document.fonts.ready.then(()=>1)');
  await p2.eval(BOOT);
  rec.total = await p2.eval('window.__mk()');
  await sleep(200);
  rec.after = await p2.eval(MEASURE);
  const max = Math.round(rec.after.scrollH - rec.after.clientH);
  rec.probes = [];
  for (const y of [0, 600, 1200, 1800, 2400, Math.max(0, max - 200)]) rec.probes.push(await p2.eval(AT, y));
  await p2.close();
  out[id] = rec;
  console.log('===', id, '=== before headH', rec.before.headH, 'after headH', rec.after.headH,
    'Δ=' + (rec.after.headH - rec.before.headH).toFixed(1), '| scrollH', rec.before.scrollH, '->', rec.after.scrollH,
    '| 字段', rec.total);
  rec.probes.forEach((x) => console.log('   y=' + x.y, '| wf:', x.wf, '| cur:', x.curField));
}
await br.close();
writeFileSync(join(HERE, '_r7_wayfind.json'), JSON.stringify(out, null, 1), 'utf8');
