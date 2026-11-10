// Precise first-screen contents for the recommended variant (壬), incl. sub-blocks and text.
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { startLabServer } from './serve-lab.mjs';

const LAB = resolve('deliverables/65-audit/lab');
const srv = await startLabServer({
  root: resolve('.'), labDir: join(LAB, 'variants'),
  overrides: [{ prefix: '/prototypes/_selection/', dir: join(LAB, 'snapshot') }],
});
const browser = await Browser.launch();
const out = {};

for (const c of [
  { k: 'desktop', w: 1440, h: 900, mobile: false },
  { k: 'mobile', w: 390, h: 844, mobile: true },
]) {
  for (const scheme of ['S15', 'S08', 'S29']) {
    const page = await browser.newPage({ width: c.w, height: c.h, mobile: c.mobile });
    await page.goto(srv.origin + '/prototypes/_selection/index.html?lab=ren', { settleMs: 900 });
    await page.eval((s) => document.querySelector('.row[data-id="' + s + '"]').click(), scheme);
    await sleep(800);
    await page.eval('document.fonts.ready.then(() => true)').catch(() => {});
    await page.eval('document.getElementById("detail").scrollTop = 0');
    await sleep(200);
    const m = await page.eval(() => {
      const d = document.getElementById('detail');
      const dRect = d.getBoundingClientRect();
      const headH = document.querySelector('.detail-head').getBoundingClientRect().height;
      const H = d.clientHeight;
      const rel = (el) => {
        const r = el.getBoundingClientRect();
        return { top: +(r.top - dRect.top).toFixed(1), bottom: +(r.bottom - dRect.top).toFixed(1), h: +r.height.toFixed(1) };
      };
      const items = [];
      const push = (kind, name, el) => {
        const b = rel(el);
        const vis = b.bottom > headH && b.top < H;
        const full = b.top >= headH && b.bottom <= H;
        items.push({ kind, name, ...b, visible: vis, fullyVisible: full, readable: +Math.max(0, Math.min(b.bottom, H) - Math.max(b.top, headH)).toFixed(1) });
      };
      // preamble + field-level + group summaries, in DOM order
      const walk = (root) => {
        [...root.children].forEach((el) => {
          if (el.tagName === 'DETAILS') { push('group', el.querySelector('summary .lab-grp-t')?.textContent.trim() || '?', el); return; }
          if (el.classList.contains('field')) { push('field', el.querySelector('dt')?.textContent.trim() || '?', el); return; }
          if (el.classList.contains('lab-facts')) { push('facts', '配色/适合/别用在这', el); el.querySelectorAll(':scope > div').forEach((r, i) => push('fact-row', r.querySelector('dt').textContent.trim(), r)); return; }
          if (el.classList.contains('lab-meta')) { push('meta', '打开原型+闸门', el); return; }
          if (el.classList.contains('lab-viewer')) { push('collapsed', el.querySelector('.lab-grp-t')?.textContent.trim() || '?', el); return; }
          if (el.classList.contains('prompt-cta')) { push('cta', '复制 AI 提示词', el); return; }
          if (el.children.length) walk(el);
          else push('block', el.className || el.tagName, el);
        });
      };
      walk(document.getElementById('d-body'));

      // characters actually visible inside the first screen (not covered by sticky head)
      const visibleChars = (el) => {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n = 0; const range = document.createRange();
        while (w.nextNode()) {
          const node = w.currentNode;
          for (let i = 0; i < node.nodeValue.length; i++) {
            if (!/\S/.test(node.nodeValue[i])) continue;
            range.setStart(node, i); range.setEnd(node, i + 1);
            const r = range.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            const t = r.top - dRect.top, b = r.bottom - dRect.top;
            if (b > headH && t < H) n++;
          }
        }
        return n;
      };
      const firstScreenChars = visibleChars(document.getElementById('d-body'));

      return {
        H, headH: +headH.toFixed(1), usable: +(H - headH).toFixed(1),
        contentH: d.scrollHeight, screens: +(d.scrollHeight / H).toFixed(2),
        items,
        firstScreenChars,
        fullyVisibleNames: items.filter((x) => x.fullyVisible).map((x) => x.name),
        partlyVisibleNames: items.filter((x) => x.visible && !x.fullyVisible).map((x) => x.name),
        lastItemBottom: Math.max(...items.map((x) => x.bottom)),
        hOverflow: d.scrollWidth - d.clientWidth,
        docOverflowX: document.documentElement.scrollWidth - innerWidth,
        tapTargets: [...d.querySelectorAll('button, a, summary')].filter((e) => e.getBoundingClientRect().height > 0)
          .map((e) => ({ t: (e.textContent || '').trim().slice(0, 20), h: +e.getBoundingClientRect().height.toFixed(1) }))
          .filter((x) => x.h < 24),
      };
    });
    out[c.k + '-' + scheme] = m;
    console.log(`\n=== ${c.k} ${scheme}  contentH=${m.contentH} (${m.screens} screens) firstScreenChars=${m.firstScreenChars} hOverflow=${m.hOverflow} ===`);
    m.items.forEach((x) => console.log(`  ${x.kind.padEnd(9)} ${x.name.padEnd(26)} top=${String(x.top).padStart(7)} bottom=${String(x.bottom).padStart(7)} ${x.fullyVisible ? 'FULL' : x.visible ? 'PART' : '-'}`));
    if (m.tapTargets.length) console.log('  small tap targets:', JSON.stringify(m.tapTargets));
    await page.close();
  }
}

writeFileSync(join(LAB, 'recommended.json'), JSON.stringify(out, null, 2));
await browser.close();
await srv.close();
