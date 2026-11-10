// V4b：可见字数 + 截断处末字（用 Range 逐字定位最后可见字符），并对比 HEAD 基线
// HEAD 基线：把 _selection 整体复制到 tmp，换成 HEAD 版 app.js / style.css / data.js / prompts.js
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SEL = join(ROOT, 'prototypes', '_selection');

// 造 HEAD 副本
const HEAD_DIR = join(HERE, 'tmp', 'sel-head');
mkdirSync(HEAD_DIR, { recursive: true });
for (const f of ['index.html', 'wizard.html', 'wizard.css', 'wizard.js']) copyFileSync(join(SEL, f), join(HEAD_DIR, f));
for (const [dst, src] of [['app.js', 'app.HEAD.js'], ['style.css', 'style.HEAD.css'], ['data.js', 'data.HEAD.js']]) {
  copyFileSync(join(HERE, 'frozen', src), join(HEAD_DIR, dst));
}
// prompts.js 本轮未改，直接用现版
copyFileSync(join(SEL, 'prompts.js'), join(HEAD_DIR, 'prompts.js'));
copyFileSync(join(SEL, 'prompt-copy.js'), join(HEAD_DIR, 'prompt-copy.js'));
const headPage = 'file:///' + join(HEAD_DIR, 'index.html').replace(/\\/g, '/');
const nowPage = 'file:///' + join(SEL, 'index.html').replace(/\\/g, '/');

const VISIBLE_FN = () => {
  const rows = [...document.querySelectorAll('.row')];
  return rows.map((el) => {
    const fam = el.querySelector('.row-family');
    if (!fam) return { id: el.getAttribute('data-id'), visible: 0, last: null, rowH: +el.getBoundingClientRect().height.toFixed(1), total: 0 };
    const box = fam.getBoundingClientRect();
    const text = fam.textContent;
    // 逐字二分：找到最后一个"完全在盒内"的字符索引
    const r = document.createRange();
    let lo = 0, hi = text.length, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      r.setStart(fam.firstChild || fam, 0);
      r.setEnd(fam.firstChild || fam, Math.min(mid, (fam.firstChild ? fam.firstChild.length : 0)));
      const rects = [...r.getClientRects()];
      const ok = rects.length > 0 && rects.every((x) => x.bottom <= box.bottom + 1.5);
      if (ok) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return { id: el.getAttribute('data-id'), visible: best, total: text.length,
      last: text.slice(Math.max(0, best - 30), best), rest: text.slice(best, best + 12),
      rowH: +el.getBoundingClientRect().height.toFixed(1) };
  });
};

const browser = await Browser.launch({ width: 1440, height: 900 });
async function run(url, w, h, mobile) {
  const page = await browser.newPage({ width: w, height: h, dsf: 1, mobile });
  await page.goto(url, { settleMs: 1500 });
  const r = await page.eval(VISIBLE_FN);
  await page.close?.();
  return r;
}

for (const [tag, url] of [['NOW', nowPage], ['HEAD', headPage]]) {
  for (const [vp, w, h, m] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
    const rows = await run(url, w, h, m);
    const rowHs = rows.map((x) => x.rowH);
    const vis = rows.map((x) => x.visible);
    const uniqH = [...new Set(rowHs)].sort((a, b) => a - b);
    console.log(`\n=== ${tag} ${vp} ===`);
    console.log(`  行高: min ${Math.min(...rowHs)} / max ${Math.max(...rowHs)} / 去重 ${uniqH.length <= 8 ? JSON.stringify(uniqH) : uniqH.length + ' 种'}`);
    console.log(`  总行高: ${rowHs.reduce((a, b) => a + b, 0).toFixed(1)}`);
    console.log(`  family 可见字总数: ${vis.reduce((a, b) => a + b, 0)} / 全文总数 ${rows.reduce((a, x) => a + x.total, 0)}`);
    const s13 = rows.find((x) => x.id === 'S13');
    console.log(`  S13: 可见 ${s13.visible}/${s13.total} 行高 ${s13.rowH}`);
    console.log(`       可见末30字「${s13.last}」 之后是「${s13.rest}」`);
    writeFileSync(join(HERE, `v4b-${tag}-${vp}.json`), JSON.stringify(rows, null, 2), 'utf8');
  }
}
await browser.close();
