// S05 追加自检（不属于契约闸门，只是为了把闸门没覆盖的三个面量出来）：
//   1) 1920 / 1024 两个闸门没跑的宽度：横向溢出、面板与点阵实测尺寸
//   2) prefers-reduced-motion: reduce 时逐行显影与自检序列是否真的冻结、闪烁灯是否常亮
//   3) 错误态与空状态在无脚本前提下是否可见（把 JS 关掉再量一次）
// 用法：node build/extra-check.mjs   （cwd 必须是 D:\Web\style）
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { Browser, sleep } from '../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = resolve('D:/Web/style');
const FILE = resolve(ROOT, 'prototypes/S05-pixel-cold-storage-console/index.html');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  try {
    let f = resolve(join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (f !== ROOT && !f.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    if (statSync(f).isDirectory()) f = join(f, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(f).pipe(res);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${relative(ROOT, FILE).split(sep).join('/')}`;

const browser = await Browser.launch();
const out = {};

async function measure(width, height, opts = {}) {
  const page = await browser.newPage({ width, height, dsf: 1, mobile: width < 600, reducedMotion: !!opts.reduced });
  if (opts.noJs) await page.send('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto(url, { timeoutMs: 30000, settleMs: 800 });
  await sleep(opts.noJs ? 600 : 1800);
  const data = await page.eval(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top) }; };
    const cs = (el, p) => getComputedStyle(el).getPropertyValue(p).trim();
    const panels = [...document.querySelectorAll('.panel')].filter((p) => getComputedStyle(p).display !== 'none');
    const lattices = [...document.querySelectorAll('.lattice')].filter((s) => { const b = s.getBoundingClientRect(); return b.width > 0; });
    const alarm = document.querySelector('.panel--alarm');
    const alarmNote = alarm.querySelector('.panel-note');
    const probe = document.querySelector('.panel--probe');
    const lamps = [...document.querySelectorAll('.lamp')];
    const scanTargets = [...document.querySelectorAll('.panel, .plate, .rail')];
    return {
      viewport: [innerWidth, innerHeight],
      scrollWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - innerWidth,
      panelCount: panels.length,
      panelWidths: panels.map((p) => r(p).w),
      rail: r(document.querySelector('.rail')),
      railDisplay: cs(document.querySelector('.rail'), 'display'),
      latticeSizes: lattices.map((s) => {
        const b = s.getBoundingClientRect();
        return [Math.round(b.width), Math.round(b.height), s.getAttribute('aria-label')];
      }),
      alarm: { w: r(alarm).w, h: r(alarm).h, noteVisible: alarmNote.getBoundingClientRect().height > 0, noteChars: alarmNote.innerText.length },
      probePanel: { w: r(probe).w, warningText: probe.innerText.slice(0, 30) },
      lampAnimations: lamps.slice(0, 4).map((l) => cs(l, 'animation-name') + '/' + cs(l, 'animation-duration') + '/' + cs(l, 'opacity')),
      scanAnimations: scanTargets.slice(0, 4).map((t) => t.className.split(' ')[0] + ':' + (t.classList.contains('is-scanned') ? 'scanned' : 'plain')),
      headingLines: [...document.querySelectorAll('h1,h2')].map((h) => [h.textContent.trim(), Math.round(h.getBoundingClientRect().height / (parseFloat(cs(h, 'font-size')) * 1.2))]),
      codeFont: cs(document.querySelector('.rows code'), 'font-family') + ' @ ' + cs(document.querySelector('.rows code'), 'font-size'),
      errorVisible: alarm.getBoundingClientRect().top < innerHeight * 0.95 || alarmNote.getBoundingClientRect().height > 0,
      bodyBgImage: cs(document.body, 'background-image'),
      lever: (() => {
        const i = document.querySelector('.lever-input'); const a = document.querySelector('.lever-arm');
        const b = i.getBoundingClientRect();
        return { inputPosition: cs(i, 'position'), inputOpacity: cs(i, 'opacity'), inputBox: [Math.round(b.width), Math.round(b.height)], armDisplay: cs(a, 'display'), trackBg: cs(i, 'appearance') };
      })(),
    };
  });
  const name = `${width}${opts.reduced ? '-reduce' : ''}${opts.noJs ? '-nojs' : ''}`;
  out[name] = data;
  await page.close();
}

await measure(1920, 1080);
await measure(1024, 768);
await measure(768, 1024);
await measure(390, 844);
await measure(1440, 900, { reduced: true });
await measure(390, 844, { noJs: true });

console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
