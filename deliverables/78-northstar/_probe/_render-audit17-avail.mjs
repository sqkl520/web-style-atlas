#!/usr/bin/env node
/* 渲染层审计 · 第十七遍：本机字体可得性（带正/负对照）（2026-11-24）
 *
 * audit15 的 canvas 宽度法有假阴性（SimSun 恰好就是 monospace 的 CJK 回退面）；
 * audit16 的 offscreen 探针有时返回空数组（未绘制 → 渲染器不给平台字体）。
 * 本遍用「可见但几乎透明」的探针 + 三次重试，并且**带正负对照**：
 *   正对照 Arial / Georgia / SimSun / Noto Sans SC —— 本机确定有
 *   负对照 __NoSuchFont_XYZ__ —— 本机确定没有（应回落）
 * 若对照不成立，整张可得性表作废（这是 MEMORY 里「拿正对照验判据」那条）。
 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const LAT = 'AbCdEfGh1234';
const CJK = '修鞋配钥匙预约';

/* 从 audit14 的产物与提示词里收集所有出现过的族名 */
const cases = JSON.parse(await readFile(join(ROOT, 'deliverables/78-northstar/_probe/_render-audit14.json'), 'utf8'));
const fams = new Set(['Arial', 'Georgia', 'SimSun', 'Noto Sans SC', 'Microsoft YaHei', '__NoSuchFont_XYZ__']);
for (const c of cases) for (const w of ['title', 'body']) {
  const o = c.out[w]; if (!o) continue;
  o.chain.forEach((f) => fams.add(f));
  o.decl.split(',').forEach((f) => { const t = f.replace(/["']/g, '').trim(); if (t) fams.add(t); });
  (o.real || []).forEach((f) => fams.add(f));
}

const browser = await Browser.launch({ width: 1440, height: 900 });
const pg = await browser.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.send('DOM.enable');
await pg.send('CSS.enable');
await pg.send('Network.enable');
await pg.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
await pg.goto('data:text/html;charset=utf-8,<!doctype html><title>probe</title><body style="margin:0"><div id="host"></div></body>', { settleMs: 100 });

const norm = (s) => String(s).replace(/\s+/g, '').replace(/["']/g, '').toLowerCase();

async function drawProbe(list) {
  /* 每个族两个 span：拉丁样本、汉字样本。位置可见、颜色 1% 透明（保证绘制） */
  await pg.eval(`(() => {
    const host = document.getElementById('host');
    host.innerHTML = '';
    const list = ${JSON.stringify(list)};
    list.forEach((fam, i) => {
      for (const [k, txt] of [['lat', ${JSON.stringify(LAT)}], ['cjk', ${JSON.stringify(CJK)}]]) {
        const s = document.createElement('span');
        s.id = 'p' + i + '_' + k;
        s.textContent = txt;
        s.style.cssText = 'font-size:40px;color:rgba(0,0,0,0.01);white-space:pre;font-family:' + JSON.stringify(fam);
        host.appendChild(s);
        host.appendChild(document.createElement('br'));
      }
    });
    return true;
  })()`);
}

async function readProbe(list) {
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const out = {};
  for (let i = 0; i < list.length; i++) {
    for (const k of ['lat', 'cjk']) {
      const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#p' + i + '_' + k });
      let fonts = null;
      if (q.nodeId) { try { fonts = ((await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId })).fonts || []).map((f) => ({ fam: f.familyName, glyphs: f.glyphCount, custom: !!f.isCustomFont })); } catch { fonts = null; } }
      out[list[i] + '|' + k] = fonts;
    }
  }
  return out;
}

const list = [...fams];
const acc = {};
for (let attempt = 0; attempt < 3; attempt++) {
  await drawProbe(list);
  const got = await readProbe(list);
  for (const [key, v] of Object.entries(got)) {
    if (!v || !v.length) continue;
    const [fam, k] = key.split('|');
    acc[fam] = acc[fam] || {};
    if (!acc[fam][k]) acc[fam][k] = v;
  }
  const missing = list.filter((f) => !acc[f] || !acc[f].lat);
  if (!missing.length) break;
}
await browser.close();

const verdict = {};
for (const fam of list) {
  const l = acc[fam]?.lat || null, c = acc[fam]?.cjk || null;
  const own = (arr) => !!arr && arr.length > 0 && arr.every((x) => norm(x.fam) === norm(fam));
  verdict[fam] = { hasLatin: own(l), hasCJK: own(c), lat: l, cjk: c };
}
const path = join(ROOT, 'deliverables/78-northstar/_probe/_render-audit17-avail.json');
await writeFile(path, JSON.stringify(verdict, null, 1));

console.log('族'.padEnd(24) + '拉丁  汉字   实际绘制（拉丁 | 汉字）');
for (const fam of list.sort()) {
  const v = verdict[fam];
  const f = (a) => (a || []).map((x) => x.fam + (x.custom ? '*' : '')).join('+') || '空';
  console.log(fam.padEnd(24) + String(v.hasLatin).padEnd(6) + String(v.hasCJK).padEnd(7) + f(v.lat) + ' | ' + f(v.cjk));
}
/* 对照判定 */
const posOK = ['Arial', 'Georgia', 'SimSun', 'Noto Sans SC'].every((f) => verdict[f]?.hasLatin);
const negOK = !verdict['__NoSuchFont_XYZ__']?.hasLatin;
console.log(`\n正对照（Arial/Georgia/SimSun/Noto Sans SC 全部判「本机有」）：${posOK ? '通过' : '★★失败★★'}`);
console.log(`负对照（__NoSuchFont_XYZ__ 判「本机无」）：${negOK ? '通过' : '★★失败★★'}`);
if (!posOK || !negOK) process.exitCode = 2;
console.log('JSON → ' + path);