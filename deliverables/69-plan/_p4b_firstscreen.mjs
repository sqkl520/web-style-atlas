// 探针 4b：390 档首屏余量的真实口径 —— 有没有固定/粘附元素压在首屏底部？
// Lead 说余量 9.2px，我量到 52.3px，差 43.1px。找出这 43px 是谁。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const M = () => {
  const vh = window.innerHeight;
  const rows = Array.from(document.querySelectorAll('.row'));
  const first = rows[0].getBoundingClientRect();
  // 找所有 position:fixed / sticky 的可见元素
  const fixed = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    fixed.push({
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
      pos: cs.position, top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1), z: cs.zIndex,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50),
    });
  }
  // 首屏底部被什么盖住
  const probeY = vh - 1;
  return {
    vh, docH: document.documentElement.scrollHeight,
    firstRow: { top: +first.top.toFixed(1), bottom: +first.bottom.toFixed(1) },
    rawSlack: +(vh - first.bottom).toFixed(1),
    fixed,
  };
};

const br = await Browser.launch({ width: 390, height: 844 });
const p = await br.newPage({ width: 390, height: 844, dsf: 2, mobile: true });
await p.goto(PAGE, { settleMs: 2500 });
await p.eval('document.fonts.ready.then(()=>1)');
await sleep(400);
const m = await p.eval(M);
console.log('vh', m.vh, 'docH', m.docH, 'first row', JSON.stringify(m.firstRow), 'rawSlack', m.rawSlack);
console.log('\nfixed/sticky 可见元素（' + m.fixed.length + '）：');
for (const f of m.fixed) console.log(`  ${f.pos.padEnd(7)} ${String(f.top).padStart(7)}→${String(f.bottom).padStart(7)} h=${String(f.h).padStart(6)} z=${f.z}  ${f.sel}  「${f.text}」`);

// 命中测试：首屏最底 60px 到底是哪个元素
const hit = await p.eval((vy) => {
  const out = [];
  const vh = window.innerHeight;
  for (let y = vh - 5; y > vh - 80; y -= 10) {
    const el = document.elementFromPoint(window.innerWidth / 2, y);
    if (!el) { out.push({ y, el: null }); continue; }
    out.push({ y, el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) });
  }
  return out;
}, 0);
console.log('\n首屏底部 80px 的 elementFromPoint：');
for (const h of hit) console.log(`  y=${String(h.y).padStart(4)}  ${h.el}  「${h.text}」`);

writeFileSync(join(HERE, 'p1b-firstscreen.json'), JSON.stringify({ m, hit }, null, 1), 'utf8');
await p.close(); await br.close();
console.log('\nwrote p1b-firstscreen.json');
