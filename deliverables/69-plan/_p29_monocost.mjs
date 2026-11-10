// 探针 29：D 的三条 mono 逐案拆解 —— 改起来到底有多大？
// 判据：runtime mono 只看 monoProseShare>0，而它来自"等宽族落在 <code>/<pre> 之外"。
// 所以修法只有两条：① 把那些元素改成文本字族 ② 把它们包进 <code>。逐案数清楚有几个选择器。
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CASES = {
  S07: ['S07-slate-ink-contents', 'IBM Plex Mono'],
  S13: ['S13-blind-debossed-dispatch', 'DM Mono'],
  S21: ['S21-interlocking-release-book', 'IBM Plex Mono'],
};

const WHO = (monoFam) => {
  const hits = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (!(cs.fontFamily || '').includes(monoFam)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim()).map((n) => n.nodeValue.trim()).join('');
    if (!own) continue;
    // 是否在 code/pre 里
    const inCode = !!el.closest('code,pre,kbd,samp');
    const r = el.getBoundingClientRect();
    hits.push({ tag: el.tagName, cls: String(el.className).slice(0, 30), text: own.slice(0, 18), inCode, w: Math.round(r.width), h: Math.round(r.height) });
  }
  return hits;
};

const br = await Browser.launch({ width: 1440, height: 900 });
for (const [id, [dir, mono]] of Object.entries(CASES)) {
  const p = await br.newPage({ width: 1440, height: 900, dsf: 1 });
  await p.goto('file:///' + join(ROOT, 'prototypes', dir, 'index.html').replace(/\\/g, '/'), { settleMs: 1800 });
  await p.eval('document.fonts.ready.then(()=>1)');
  const hits = await p.eval(WHO, mono);
  await p.close();
  const outside = hits.filter((h) => !h.inCode);
  const sel = [...new Set(outside.map((h) => h.tag + '.' + h.cls))];
  console.log(`=== ${id} (${mono}) ===`);
  console.log(`  等宽文本元素 ${hits.length} 个，其中在 <code>/<pre> 内 ${hits.filter((h) => h.inCode).length}，**在外面 ${outside.length}**`);
  console.log(`  涉及 ${sel.length} 个选择器：`);
  for (const s of sel.slice(0, 12)) console.log(`    ${s}`);
  const byText = {};
  for (const h of outside) byText[h.text] = (byText[h.text] || 0) + 1;
  console.log(`  示例文本：${Object.keys(byText).slice(0, 10).join(' / ')}`);
  // 这些文本是"数字/编号/时刻"吗
  const numeric = outside.filter((h) => /^[\d\s\-:/.,%]+$/.test(h.text));
  console.log(`  其中纯数字/编号：${numeric.length}/${outside.length}`);
  console.log('');
}
await br.close();
