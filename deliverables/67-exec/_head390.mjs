// _head390.mjs — 行卡标题行 85.1px 是怎么来的；能不能少一行而不删任何标签
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await Browser.launch({ width: 1440, height: 900 });
const p = await browser.newPage({ width: 390, height: 844, dsf: 2, mobile: true, reducedMotion: true });
await p.goto(SRC, { settleMs: 1700 });

const probe = await p.eval(() => {
  const out = {};
  // 前 6 案的行头构成（不同案标签数不同）
  out.rows = [...document.querySelectorAll('.row')].slice(0, 6).map((r) => {
    const head = r.querySelector('.row-head');
    const kids = [...head.children].map((e) => {
      const b = e.getBoundingClientRect();
      return { el: e.tagName.toLowerCase() + (e.className ? '.' + e.className : ''), txt: e.textContent.trim().slice(0, 14),
        top: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    });
    const tops = [...new Set(kids.map((k) => Math.round(k.top)))];
    return { id: r.getAttribute('data-id'), headH: +head.getBoundingClientRect().height.toFixed(1),
      lines: tops.length, kids };
  });
  // 全 30 案：标题行高度分布
  out.headH = [...document.querySelectorAll('.row')].map((r) => +r.querySelector('.row-head').getBoundingClientRect().height.toFixed(1));
  out.metaH = [...document.querySelectorAll('.row')].map((r) => +r.querySelector('.row-meta').getBoundingClientRect().height.toFixed(1));
  out.footH = [...document.querySelectorAll('.row')].map((r) => +r.querySelector('.row-foot').getBoundingClientRect().height.toFixed(1));
  out.rowH = [...document.querySelectorAll('.row')].map((r) => +r.getBoundingClientRect().height.toFixed(1));
  const stat = (a) => ({ min: Math.min(...a), max: Math.max(...a), avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) });
  out.stats = { head: stat(out.headH), meta: stat(out.metaH), foot: stat(out.footH), row: stat(out.rowH) };
  return out;
});
console.log('前 6 案标题行：');
for (const r of probe.rows) {
  console.log(`  ${r.id} headH=${r.headH} 行数=${r.lines}`);
  for (const k of r.kids) console.log(`      ${String(k.top).padStart(7)} w=${String(k.w).padStart(6)} h=${String(k.h).padStart(5)} ${k.el}  «${k.txt}»`);
}
console.log('\n30 案分布：', JSON.stringify(probe.stats, null, 1));
await p.close();
await browser.close();
