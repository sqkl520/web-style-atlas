// 探针 22：B 的「29 个词收在折叠区」到底几层折叠 —— 用 rect 与 display 双判据实测。
// 同时测：不点 toggle 时，29 个词的文本是否在可访问树里（读屏器/搜索会不会读到）。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const PROBE = () => {
  const note = document.querySelector('.scene-unsupported');
  const more = document.querySelector('.scene-more');
  const toggle = document.querySelector('.scene-toggle');
  const info = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { display: cs.display, visibility: cs.visibility, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY), opacity: cs.opacity, chars: (el.textContent || '').length };
  };
  return {
    note: info(note), more: info(more), toggle: info(toggle),
    toggleText: toggle ? toggle.textContent.trim() : null,
    noteText: note ? note.textContent.replace(/\s+/g, ' ').trim() : null,
    moreChips: more ? more.querySelectorAll('button').length : 0,
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
for (const [tier, w, h, mob] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const p = await br.newPage({ width: w, height: h, dsf: 1, mobile: mob });
  await p.goto(PAGE, { settleMs: 2200 });
  await p.eval('document.fonts.ready.then(()=>1)');
  const before = await p.eval(PROBE);
  console.log(`=== ${tier}  （未点 toggle）===`);
  console.log(`  .scene-more   ${before.more ? `display=${before.more.display} ${before.more.w}x${before.more.h}` : '不存在'}  内含按钮 ${before.moreChips}`);
  console.log(`  .scene-toggle ${before.toggle ? `display=${before.toggle.display} ${before.toggle.w}x${before.toggle.h} 「${before.toggleText}」` : '不存在'}`);
  console.log(`  .scene-unsupported ${before.note ? `display=${before.note.display} ${before.note.w}x${before.note.h}  ${before.note.chars} 字` : '不存在'}`);
  console.log(`    文本前 120 字: ${(before.noteText || '').slice(0, 120)}`);

  await p.eval(() => { const t = document.querySelector('.scene-toggle'); if (t) t.click(); return 1; });
  await sleep(400);
  const after = await p.eval(PROBE);
  console.log(`  --- 点开后 ---`);
  console.log(`  .scene-more   ${after.more ? `display=${after.more.display} ${after.more.w}x${after.more.h}` : '—'}`);
  console.log(`  .scene-unsupported ${after.note ? `display=${after.note.display} ${after.note.w}x${after.note.h}  top=${after.note.top}px (第 ${(after.note.top / h).toFixed(2)} 屏)` : '—'}`);
  await p.close();
}
await br.close();
