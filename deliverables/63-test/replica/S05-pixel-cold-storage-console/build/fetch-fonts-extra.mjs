#!/usr/bin/env node
// S05 专用：抓取 Google Fonts 渠道之外的两款规格字体，烘焙进共享字体缓存 prototypes/_fonts/。
//   - Departure Mono（OFL 1.1，像素等宽，rektdeckard/departure-mono v1.500 发布物 woff2，22.5KB）
//   - 未来荧黑 Glow Sans SC（OFL 1.1，lvwzhen/glow-sans；经 @fontpkg/glow-sans-sc npm 分发，
//     发布物只有 OTF 全字库，故落盘后用 fontTools 子集化为 woff2 —— 见 subset-glow.py）
// 为什么要单独写：prototypes/_build/fetch-fonts.mjs 只能走 fonts.googleapis.com 的 css2 端点，
// 本案字段 4 指定的两款字体都不在该渠道，链路必须自建，否则只能降档到别的字体。
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FONTS = 'D:/Web/style/prototypes/_fonts';
const MINE = 'D:/Web/style/prototypes/S05-pixel-cold-storage-console/build';
const GROUND = join(MINE, 'ground');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const jobs = [
  {
    what: 'Departure Mono 1.500 woff2',
    url: 'https://raw.githubusercontent.com/rektdeckard/departure-mono/main/public/assets/DepartureMono-1.500.woff2',
    dest: join(FONTS, 'files', 'departure-mono', 'DepartureMono-1.500.woff2'),
  },
  {
    what: 'Glow Sans SC Normal Regular OTF',
    url: 'https://cdn.jsdelivr.net/npm/@fontpkg/glow-sans-sc@0.93.2/GlowSansSC-Normal-Regular.otf',
    dest: join(GROUND, 'GlowSansSC-Normal-Regular.otf'),
  },
  {
    what: 'Glow Sans SC Normal Medium OTF',
    url: 'https://cdn.jsdelivr.net/npm/@fontpkg/glow-sans-sc@0.93.2/GlowSansSC-Normal-Medium.otf',
    dest: join(GROUND, 'GlowSansSC-Normal-Medium.otf'),
  },
];

async function get(url, tries = 4) {
  for (let t = 1; t <= tries; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (t === tries) throw e;
      await new Promise((res) => setTimeout(res, 700 * t));
    }
  }
}

for (const j of jobs) {
  mkdirSync(join(j.dest, '..'), { recursive: true });
  if (existsSync(j.dest) && statSync(j.dest).size > 1024) {
    console.log('skip (已存在) ' + j.what + '  ' + statSync(j.dest).size + 'B');
    continue;
  }
  const buf = await get(j.url);
  writeFileSync(j.dest, buf);
  console.log('ok   ' + j.what + '  ' + buf.length + 'B  -> ' + j.dest);
}
