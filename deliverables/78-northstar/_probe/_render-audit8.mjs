#!/usr/bin/env node
/* 渲染层审计 · 第八遍：把 S18 的「opacity 永久 0」查到底 + 截图取证（2026-11-22）
 *
 * 第七遍量出 S18 的 5 个 <article class="job"> 里有 3 个 opacity 恒为 0，
 * 3.3 秒、滚动到底都不恢复。但「动画没跑完」与「动画跑完停在 0」是两件事：
 * 前者不是缺陷，后者是**用户永远看不到那 3 条内容**。
 * 这里读 getAnimations() 的 playState / currentTime / fill，并截图对照。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const buf = await readFile(join(ROOT, rel));
    res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch { if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; } res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/S18/index.html`, { settleMs: 200 });
await new Promise((r) => setTimeout(r, 2500));
const a = await pg.eval(`(() => [...document.querySelectorAll('article.job')].map((e, i) => {
  const anims = e.getAnimations().map((x) => ({
    name: x.animationName || (x.effect && x.effect.getKeyframes ? 'css' : '?'),
    playState: x.playState,
    currentTime: Math.round(x.currentTime || 0),
    fill: x.effect && x.effect.getTiming ? x.effect.getTiming().fill : null,
    duration: x.effect && x.effect.getTiming ? x.effect.getTiming().duration : null,
    delay: x.effect && x.effect.getTiming ? x.effect.getTiming().delay : null,
    easing: x.effect && x.effect.getTiming ? x.effect.getTiming().easing : null,
  }));
  const c = getComputedStyle(e);
  return { i, opacity: c.opacity, animName: c.animationName, animFill: c.animationFillMode,
           animDelay: c.animationDelay, animDur: c.animationDuration, animTiming: c.animationTimingFunction,
           playState: c.animationPlayState, anims };
}))`);
console.log('S18 article.job 动画状态（页面加载 2.5s 后）：');
console.log(JSON.stringify(a, null, 1));

/* 截图取证：万一将来（或别人）要复核，有像素可看 */
const shots = [];
for (const [id, clip] of [['S18', null], ['S32', null], ['S29', null]]) {
  await pg.goto(`http://127.0.0.1:${PORT}/deliverables/78-northstar/_blindtest/${id}/index.html`, { settleMs: 1500 });
  const p = join(ROOT, 'deliverables/78-northstar/_probe', `_shot-${id}.jpg`);
  await pg.screenshot({ path: p, format: 'jpeg', quality: 60 });
  shots.push({ id, p });
}
console.log('\n截图：' + shots.map((s) => s.id).join(' '));
await browser.close(); server.close();
