// 步骤 1：量出三案里「等宽字体 + 不在 code 里 + 有文本」的元素清单。
// 输出：每个元素的选择器路径、tag、class、文本样本、字符数、是否叶子、是否有子元素。
import { Browser, serve, openPage, settle } from './lib-exec.mjs';
import { writeFileSync } from 'node:fs';

const CASES = [
  ['S07', 'S07-slate-ink-contents'],
  ['S13', 'S13-blind-debossed-dispatch'],
  ['S21', 'S21-interlocking-release-book'],
];

const srv = await serve();
const browser = await Browser.launch({ width: 1440, height: 900 });
const out = {};

for (const [id, dir] of CASES) {
  const page = await openPage(browser, { width: 1440, height: 900 });
  await page.goto(srv.url(`prototypes/${dir}/index.html`), { timeoutMs: 30000, settleMs: 900 });
  await settle(page);

  const data = await page.eval(`(() => {
    // 复刻 probe.mjs 的 isMono：canvas 比 'iiiiiiii' 与 'WWWWWWWW' 的宽度
    const cv = document.createElement('canvas').getContext('2d');
    const isMono = (ff) => {
      const first = ff.split(',')[0].replace(/["']/g, '').trim();
      cv.font = '40px ' + JSON.stringify(first);
      const a = cv.measureText('iiiiiiii').width, b = cv.measureText('WWWWWWWW').width;
      return Math.abs(a - b) < 1;
    };
    const path = (el) => {
      const parts = [];
      let e = el;
      while (e && e !== document.body) {
        let s = e.tagName.toLowerCase();
        if (e.id) s += '#' + e.id;
        else if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\\s+/).join('.');
        parts.unshift(s);
        e = e.parentElement;
      }
      return parts.join('>');
    };
    const rows = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue;
      if (!t || !t.trim()) continue;
      const el = n.parentElement;
      if (!el) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (!isMono(cs.fontFamily)) continue;
      const inCode = !!el.closest('code,pre,kbd,samp,textarea');
      rows.push({
        sel: path(el),
        tag,
        cls: (el.className || '').toString(),
        text: t.trim().slice(0, 40),
        chars: t.trim().length,
        inCode,
        leaf: el.children.length === 0,
        childTags: [...el.children].map((c) => c.tagName.toLowerCase()),
        ff: cs.fontFamily.slice(0, 60),
        fs: cs.fontSize,
        lh: cs.lineHeight,
        ls: cs.letterSpacing,
        fw: cs.fontWeight,
        ws: cs.whiteSpace,
        // 元素自身的几何
        w: +el.getBoundingClientRect().width.toFixed(2),
        rectText: (() => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)); })(),
        // 祖先里还有谁也是等宽的（用来判断能不能在更外层包一次）
        monoAncestor: (() => { let e = el.parentElement; while (e && e !== document.body) { if (isMono(getComputedStyle(e).fontFamily)) return path(e); e = e.parentElement; } return null; })(),
      });
    }
    // 总结
    const bySel = new Map();
    for (const r of rows) {
      const k = r.sel + ' || ' + r.text.slice(0, 20);
      bySel.set(k, (bySel.get(k) || 0) + 1);
    }
    return {
      total: rows.length,
      notInCode: rows.filter((r) => !r.inCode).length,
      inCode: rows.filter((r) => r.inCode).length,
      leafNotInCode: rows.filter((r) => !r.inCode && r.leaf).length,
      nonLeafNotInCode: rows.filter((r) => !r.inCode && !r.leaf).length,
      charsNotInCode: rows.filter((r) => !r.inCode).reduce((a, r) => a + r.chars, 0),
      codeTags: document.querySelectorAll('code,pre,kbd,samp').length,
      rows,
      docH: document.documentElement.scrollHeight,
    };
  })()`);

  // 归并：按 tag.class（+ 是否有 id）聚合 —— 不是按完整路径。
  // 为什么：S07 的 46 条目录项各自带 id，按路径聚合会碎成 95 组，看不出「这一族能不能一次性包掉」。
  const groups = new Map();
  for (const r of data.rows.filter((x) => !x.inCode)) {
    const k = r.tag + '.' + (r.cls || '-') + (/#/.test(r.sel.split('>').pop() || '') ? ' (with id)' : '');
    if (!groups.has(k)) groups.set(k, { key: k, tag: r.tag, cls: r.cls, n: 0, chars: 0, leaf: r.leaf, samples: [], fs: r.fs, ff: r.ff, w: r.w, monoAncestor: r.monoAncestor, childTags: r.childTags });
    const g = groups.get(k);
    g.n++; g.chars += r.chars;
    if (g.samples.length < 4) g.samples.push(r.text);
    if (r.monoAncestor) g.monoAncestor = r.monoAncestor;
  }
  out[id] = { ...data, rows: undefined, groups: [...groups.values()] };
  console.log(`\n===== ${id} =====`);
  console.log(`  <code>/<pre>/<kbd>/<samp> 现有 ${data.codeTags} 个`);
  console.log(`  等宽文本节点 ${data.total}，其中不在 code ${data.notInCode}（叶子 ${data.leafNotInCode} / 非叶子 ${data.nonLeafNotInCode}），在 code ${data.inCode}`);
  console.log(`  不在 code 的等宽字符 ${data.charsNotInCode}   docH ${data.docH}`);
  console.log(`  按 tag.class 归并 ${groups.size} 组：`);
  for (const g of [...groups.values()].sort((a, b) => b.chars - a.chars)) {
    console.log(`    ×${String(g.n).padEnd(3)} chars=${String(g.chars).padEnd(4)} leaf=${g.leaf ? 'Y' : 'N'} fs=${g.fs} w=${g.w}  ${g.key}`);
    console.log(`         ${g.ff}`);
    console.log(`         样本: ${g.samples.join(' | ')}`);
    if (!g.leaf) console.log(`         子元素: ${g.childTags.join(',')}  等宽祖先: ${g.monoAncestor || '—'}`);
  }
  await page.close();
}

writeFileSync('D:/Web/style/deliverables/69-exec/_mono-inventory.json', JSON.stringify(out, null, 1), 'utf8');
await browser.close();
srv.server.close();
