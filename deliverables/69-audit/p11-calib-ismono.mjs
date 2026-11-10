// 诊断 2：isMono 的 canvas 判据在本机是否可靠？用已知比例体/等宽体做对照。
import { createServer } from 'node:http';
import { createReadStream, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const DIR = 'D:/Web/style/deliverables/69-audit/exp-calib';
mkdirSync(DIR, { recursive: true });
writeFileSync(join(DIR, 'index.html'), `<!doctype html><meta charset="utf-8">
<style>
  body { background:#fff; font-size:16px; }
  .a { font-family: "EB Garamond", serif; }
  .b { font-family: "DM Mono", ui-monospace, monospace; }
  .c { font-family: serif; }
  .d { font-family: monospace; }
  .e { font-family: "Noto Serif SC", "Songti SC", serif; }
</style>
<div class="a">iiiiiiii WWWWWWWW</div>
<div class="b">iiiiiiii WWWWWWWW</div>
<div class="c">iiiiiiii WWWWWWWW</div>
<div class="d">iiiiiiii WWWWWWWW</div>
<div class="e">iiiiiiii WWWWWWWW</div>`);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const s = createServer((req, res) => {
  const f = resolve(join(DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  try {
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': statSync(f).size });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => s.listen(8761, '127.0.0.1', r));
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1, mobile: false });
await page.setViewport({ width: 1440, height: 900, mobile: false, dsf: 1 });
await page.goto('http://127.0.0.1:8761/index.html', { timeoutMs: 30000, settleMs: 600 });
await page.eval('document.fonts.ready.then(() => true)');
await sleep(900);
const out = await page.eval(`(() => {
  const mctx = document.createElement('canvas').getContext('2d');
  const meas = (family) => {
    mctx.font = '40px ' + family;
    const applied = mctx.font;
    const a = mctx.measureText('iiiiiiii').width, b = mctx.measureText('WWWWWWWW').width;
    return { family, applied, i: a, W: b, verdict: Math.abs(a - b) < 1 ? 'MONO' : 'proportional' };
  };
  const res = ['"EB Garamond", serif', '"DM Mono", ui-monospace, monospace', 'serif', 'monospace', '"Noto Serif SC", "Songti SC", serif', 'sans-serif', 'serif'].map(meas);
  // 真实 DOM 测量作为对照（不依赖 canvas）
  const dom = [...document.querySelectorAll('div')].map((el) => {
    const cs = getComputedStyle(el);
    const r = document.createRange(); r.selectNodeContents(el); const rects = [...r.getClientRects()];
    return { cls: el.className, ff: cs.fontFamily, rectW: rects.map((x) => Math.round(x.width)) };
  });
  // 逐字符真实宽度：用 span 量 i 与 W
  const perChar = (ff) => {
    const mk = (ch) => { const sp = document.createElement('span'); sp.textContent = ch; sp.style.cssText = 'font-family:' + ff + ';font-size:40px;white-space:pre;position:absolute;left:-9999px'; document.body.appendChild(sp); const w = sp.getBoundingClientRect().width; sp.remove(); return Math.round(w * 100) / 100; };
    return { i: mk('i'), W: mk('W'), mono: Math.abs(mk('i') - mk('W')) < 0.5 };
  };
  return { canvas: res, domBySpan: { garamond: perChar('"EB Garamond", serif'), dmono: perChar('"DM Mono", ui-monospace, monospace'), noto: perChar('"Noto Serif SC", serif'), serif: perChar('serif'), monospace: perChar('monospace') }, dom };
})()`);
console.log(JSON.stringify(out, null, 1));
await browser.close(); s.close();
