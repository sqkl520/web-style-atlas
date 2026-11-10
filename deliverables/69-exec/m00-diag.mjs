// 诊断：页面到底加载了什么
import { Browser, serve, openPage, settle } from './lib-exec.mjs';

const srv = await serve();
console.log('url =', srv.url('prototypes/S07-slate-ink-contents/index.html'));
const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await openPage(browser, { width: 1440, height: 900 });
const how = await page.goto(srv.url('prototypes/S07-slate-ink-contents/index.html'), { timeoutMs: 30000, settleMs: 1500 });
await settle(page);
const info = await page.eval(`(() => ({
  title: document.title,
  how: document.readyState,
  sheets: [...document.styleSheets].map(s => ({ href: s.href, rules: (() => { try { return s.cssRules.length; } catch { return 'blocked'; } })() })),
  bodyFont: getComputedStyle(document.body).fontFamily,
  bodyFs: getComputedStyle(document.body).fontSize,
  h1: (() => { const h = document.querySelector('h1'); return h ? { ff: getComputedStyle(h).fontFamily, fs: getComputedStyle(h).fontSize, r: h.getBoundingClientRect().toJSON() } : null; })(),
  pFont: (() => { const h = document.querySelector('.colophon dd'); return h ? { ff: getComputedStyle(h).fontFamily, fs: getComputedStyle(h).fontSize, txt: h.textContent.trim(), w: h.getBoundingClientRect().width } : null; })(),
  docH: document.documentElement.scrollHeight,
  fonts: [...document.fonts].map(f => f.family + ':' + f.status).slice(0, 20),
  imgs: [...document.images].map(i => i.src.split('/').pop() + ':' + i.naturalWidth),
  cssLinks: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href),
}))()`);
console.log(JSON.stringify(info, null, 1));
console.log('consoleErrors:', page.consoleErrors);
await browser.close();
srv.server.close();
