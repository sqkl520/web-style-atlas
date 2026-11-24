#!/usr/bin/env node
/* 渲染「链末缺通用族」的后果：同一份 h1，补与不补终止符，实际画字的族一样吗？
 *
 * 复用 `_render-audit16.mjs` 的做法（本地 server + CDP + CSS.getPlatformFontsForNode），
 * 但只测 `_fallback-consequence.mjs` 生成的 10 组对照。
 *
 * 关键：必须用 blocked 口径。open 口径下结果三跑三样（见 79 §六十八），
 * 而这里要回答的是「补与不补有没有区别」，只有可复现的口径才能回答。
 *
 * 判定：
 *   A、B 两臂画字的族相同 → 补终止符**不影响**这一份的渲染
 *   A、B 两臂不同         → 补终止符**确实改变**了渲染结果，判据 A 有真实后果
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');
const OUT = join(HERE, '_fa-out');

if (!existsSync(join(OUT, '_plan.json'))) {
  console.error('先跑 _fallback-consequence.mjs 生成对照样本');
  process.exit(1);
}
const plan = JSON.parse(await readFile(join(OUT, '_plan.json'), 'utf8'));

const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const buf = await readFile(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'Content-Type': MIME[extname(req.url)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    if (/favicon/.test(req.url)) { res.writeHead(204); res.end(); return; }
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.send('Network.enable', {});
/* 阻断外部字体 —— 与 _render-audit16 的 blocked 口径一致 */
await pg.send('Network.setBlockedURLs', {
  urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*', '*fonts.gstatic.font.im*'],
});

/** 渲染一个文件，返回 h1 实际由哪个族画字。
 *
 * nodeId 的拿法跟 A6 的 `_render-audit16.mjs` 一致：`DOM.getDocument` + `DOM.querySelector`。
 * 第一版用 `Runtime.evaluate` 拿 objectId 再 `DOM.requestNode` 转，报
 * 「Could not find node with given id」—— objectId 在手但 DOM 域没同步时转换会失败。
 * 走 querySelector 直接拿 nodeId 更稳，也不需要 DOM.enable 之外的准备。 */
async function actualFont(relPath) {
  await pg.goto(`http://127.0.0.1:${PORT}/${relPath.replace(/\\/g, '/')}`, { settleMs: 400 });
  await pg.eval(`document.fonts.ready.then(() => true)`).catch(() => {});
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: 'h1' });
  if (!q.nodeId) return { err: 'no h1' };
  const fonts = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
  const list = (fonts.fonts || []).map((f) => `${f.familyName}:${f.glyphCount}`);
  return { fonts: list };
}

await pg.send('DOM.enable', {});
await pg.send('CSS.enable', {});

const rows = [];
for (const p of plan) {
  const relA = p.armA.replace(ROOT, '').replace(/^[\\/]/, '');
  const relB = p.armB.replace(ROOT, '').replace(/^[\\/]/, '');
  const a = await actualFont(relA);
  const b = await actualFont(relB);
  const fa = (a.fonts || []).join('|') || '（无）';
  const fb = (b.fonts || []).join('|') || '（无）';
  rows.push({
    id: p.id, chain: p.chain, generic: p.gen,
    armA: fa, armB: fb, same: fa === fb,
  });
}

await browser.close();
server.close();

console.log('链末补通用族，渲染结果变不变？（blocked 口径）\n');
console.log('案         原链末               补的         A 臂画字            B 臂画字            变化');
console.log('─'.repeat(112));
let changed = 0;
for (const r of rows) {
  if (!r.same) changed++;
  const last = (r.chain.split(',').pop() || '').trim().replace(/^["']|["']$/g, '');
  console.log(`${r.id.padEnd(10)} ${last.slice(0, 18).padEnd(19)} ${r.generic.padEnd(12)} ${r.armA.slice(0, 18).padEnd(19)} ${r.armB.slice(0, 18).padEnd(19)} ${r.same ? '不变' : '★ 变了'}`);
}
console.log('─'.repeat(112));
console.log(`\n补终止符后渲染改变：${changed}/${rows.length}`);

const outPath = join(HERE, '_fallback-consequence.json');
await writeFile(outPath, JSON.stringify(rows, null, 1));

console.log('');
if (changed === 0) {
  console.log('⇒ 全部不变。链末缺通用族**不影响本机渲染** ——');
  console.log('  因为本机没有链上那些实名族，浏览器早就落到默认字体了，');
  console.log('  补不补终止符落到的还是同一个地方。');
  console.log('  **判据 A 描述的是真实存在的写法差异，但没有可观测的渲染后果。**');
} else {
  console.log(`⇒ ${changed} 份结果不同。判据 A 有真实渲染后果，应当升级为 FAIL。`);
  console.log('  具体是哪些份、变成了什么，看上面的表。');
}