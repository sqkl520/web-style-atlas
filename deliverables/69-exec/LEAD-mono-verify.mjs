// 独立核实：mono FAIL 能否靠「包进 <code>」零像素代价清掉
import { Browser } from 'file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'D:/Web/style';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf' };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = join(ROOT, u);
  if (!existsSync(p)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise(r => server.listen(8560, '127.0.0.1', r));
const browser = await Browser.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, mobile: false });

// 1) 先看三案的 mono 现状：probe 怎么判的
console.log('=== 三案的 <code> 数量与等宽占比 ===');
for (const id of ['S07', 'S13', 'S21']) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  const html = readFileSync(join(ROOT, 'prototypes', dirs[0], 'index.html'), 'utf8');
  const codeCount = (html.match(/<(code|pre|kbd|samp)\b/gi) || []).length;
  console.log(`  ${id} (${dirs[0]}): 已有 <code>/<pre>/<kbd>/<samp> ${codeCount} 个`);

  await page.goto(`http://127.0.0.1:8560/prototypes/${dirs[0]}/index.html`, { settleMs: 2000 });
  const o = await page.eval(`(() => {
    // 复刻 probe.mjs 的 mono 判据：等宽字体落在 code/pre 之外的字符占比
    const isMono = (ff) => {
      const cv = document.createElement('canvas').getContext('2d');
      cv.font = '40px ' + ff.split(',')[0];
      const a = cv.measureText('iiiiiiii').width, b = cv.measureText('WWWWWWWW').width;
      return Math.abs(a - b) < 1;
    };
    const monoFams = new Set();
    let monoChars = 0, monoProse = 0, totalChars = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.nodeValue; if (!t || !t.trim()) continue;
      const el = n.parentElement; if (!el) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const chars = t.trim().length;
      totalChars += chars;
      if (isMono(cs.fontFamily)) {
        monoChars += chars;
        const inCode = !!(el.closest('code,pre,kbd,samp'));
        if (!inCode) monoProse += chars;
      }
    }
    return { totalChars, monoChars, monoProse, share: totalChars ? +(monoProse/totalChars*100).toFixed(2) : 0 };
  })()`);
  console.log(`         等宽字符 ${o.monoChars} / 总 ${o.totalChars}，其中**不在 code 里**的 ${o.monoProse}（${o.share}%）`);
}

// 2) 关键实验：把等宽文本包进 <code> 后，几何是否完全不变
console.log('\n=== 实验：把等宽叶子元素的文本包进 <code>，测几何变化 ===');
for (const id of ['S07', 'S21']) {
  const dirs = readdirSync(join(ROOT, 'prototypes')).filter(d => d.startsWith(id + '-'));
  await page.goto(`http://127.0.0.1:8560/prototypes/${dirs[0]}/index.html`, { settleMs: 2000 });

  const before = await page.eval(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      out.push([el.tagName + '.' + (el.className||'').toString().slice(0,20), Math.round(r.width*100)/100, Math.round(r.height*100)/100, Math.round(r.top*100)/100]);
    }
    return { n: out.length, sample: out.slice(0, 0), docH: document.documentElement.scrollHeight, sig: out.map(x=>x[1]+'x'+x[2]+'@'+x[3]).join('|').length };
  })()`);

  // 注入：把所有「等宽字体且不在 code 里」的叶子元素的文本包进 <code>
  const injected = await page.eval(`(() => {
    const isMono = (ff) => {
      const cv = document.createElement('canvas').getContext('2d');
      cv.font = '40px ' + ff.split(',')[0];
      return Math.abs(cv.measureText('iiiiiiii').width - cv.measureText('WWWWWWWW').width) < 1;
    };
    let cnt = 0;
    for (const el of [...document.querySelectorAll('body *')]) {
      if (el.closest('code,pre,kbd,samp')) continue;
      if (el.children.length > 0) continue;              // 只处理叶子
      const txt = (el.textContent || '').trim();
      if (!txt) continue;
      if (!isMono(getComputedStyle(el).fontFamily)) continue;
      const code = document.createElement('code');
      code.textContent = el.textContent;
      el.textContent = '';
      el.appendChild(code);
      cnt++;
    }
    // 关键：加一条 CSS 让 code 继承字体与字号（否则浏览器默认 monospace + 0.875em）
    const st = document.createElement('style');
    st.id = '__monofix';
    st.textContent = 'code{font-family:inherit;font-size:inherit;font-weight:inherit;letter-spacing:inherit;line-height:inherit;background:none;padding:0;border:0}';
    document.head.appendChild(st);
    return cnt;
  })()`);
  await new Promise(r => setTimeout(r, 500));

  const after = await page.eval(`(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      out.push([el.tagName + '.' + (el.className||'').toString().slice(0,20), Math.round(r.width*100)/100, Math.round(r.height*100)/100, Math.round(r.top*100)/100]);
    }
    return { n: out.length, docH: document.documentElement.scrollHeight };
  })()`);

  console.log(`  ${id}: 包了 ${injected} 个元素`);
  console.log(`     docH ${before.docH} → ${after.docH}（Δ${after.docH - before.docH}）`);
}

await browser.close();
server.close();
