/* 内容不稳核查用的一次性度量脚本（不改仓库任何既有文件，只读产物）。
 * 用法: node deliverables/78-northstar/_probe/_ci-scratch/_ci-measure.mjs
 * 输出: 每份产物的 6 个达标量 + 结构签名（DOM 形状、标题层级、区块数、文本量）
 */
import { measure } from '../../../74-q7/measure.mjs';
import { Browser } from '../../../../prototypes/_build/vendor/cdp.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const HERE = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

const FILES = [
  ['S04-a', 'S04-a.html'], ['S04-b', 'S04-b.html'],
  ['S13-a', 'S13-a.html'], ['S13-b', 'S13-b.html'],
  ['S29-a', 'S29-a.html'], ['S29-b', 'S29-b.html'],
];

/* DOM 结构签名：把 body 的标签树归一化成「tag 序列」，用于比较版式骨架 */
async function structureOf(rel) {
  const server = createServer(async (req, res) => {
    try {
      const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      const buf = readFileSync(p);
      res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
      res.end(buf);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await Browser.launch({ width: 1440, height: 900 });
  try {
    const pg = await browser.newPage();
    await pg.goto(`http://127.0.0.1:${port}/${rel}`, { settleMs: 800 });
    const s = await pg.eval(`(() => {
      const body = document.body;
      const tags = [];
      const walk = (n, d) => {
        for (const c of n.children) {
          const t = c.tagName.toLowerCase();
          if (t === 'script' || t === 'style' || t === 'link' || t === 'meta') continue;
          tags.push(d + ':' + t);
          if (d < 4) walk(c, d + 1);
        }
      };
      walk(body, 0);
      const hist = {};
      for (const t of body.querySelectorAll('*')) {
        const n = t.tagName.toLowerCase();
        if (n === 'script' || n === 'style' || n === 'link' || n === 'meta') continue;
        hist[n] = (hist[n] || 0) + 1;
      }
      const heads = [...body.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName.toLowerCase());
      const sections = [...body.querySelectorAll('section,article,header,footer,main,nav,aside,ul,ol,table')].map(x => x.tagName.toLowerCase());
      const text = (body.innerText || '').replace(/\\s+/g, ' ').trim();
      // 版式骨架：每个直接子区块的「首个子元素标签 + 子元素数」
      const shape = [...body.children].filter(c => !['script','style','link','meta'].includes(c.tagName.toLowerCase()))
        .map(c => c.tagName.toLowerCase() + '/' + c.children.length + '/' + (c.firstElementChild ? c.firstElementChild.tagName.toLowerCase() : '-'));
      // 版心 grid 模板（取候选里文字量最大的容器）
      let maxTpl = null, maxTxt = -1;
      for (const el of body.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.display.includes('grid') && cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none') {
          const txt = (el.innerText || '').length;
          if (txt > maxTxt) { maxTxt = txt; maxTpl = cs.gridTemplateColumns; }
        }
      }
      return {
        nodeCount: hist, tagSeq: tags.slice(0, 400), tagSeqLen: tags.length,
        headings: heads, headCount: heads.length,
        blockTags: sections, blockCount: sections.length,
        textLen: text.length, text: text.slice(0, 600),
        shape, mainGridTpl: maxTpl,
        fontFamilies: (() => { const s = new Set(); for (const el of body.querySelectorAll('h1,h2,p,li')) { s.add(getComputedStyle(el).fontFamily.split(',')[0].trim()); } return [...s]; })(),
      };
    })()`);
    return s;
  } finally { await browser.close(); server.close(); }
}

const out = {};
for (const [id, rel] of FILES) {
  const m = await measure('deliverables/78-northstar/_probe/_ci-scratch/' + rel);
  const st = await structureOf('deliverables/78-northstar/_probe/_ci-scratch/' + rel);
  out[id] = { m, st };
  console.error('done', id);
}
console.log(JSON.stringify(out, null, 1));
