#!/usr/bin/env node
// 从**已有的语料**里给尚未完成的方案配真实照片，并生成纹理与署名文件。
//
// 为什么要这样：抓图源在 2026-10-18 04:15 之后全部不可用 —— 实测
//   Wikimedia（含 upload / commons / wikidata）ECONNRESET 或 30s 连接超时
//   Internet Archive、Openverse、DuckDuckGo 全部 ETIMEDOUT
//   www.loc.gov / tile.loc.gov / picryl / pexels.com / pixabay.com 返回 5KB 的 403 拦截页
// 唯一还能用的可检索来源是 images-api.nasa.gov（检索+下载都正常），
// 以及 images.unsplash.com / images.pexels.com / cdn.pixabay.com / images.nypl.org 这几个
// 只认直链、不给检索的 CDN。
//
// 而工作区里已经有 246 张**真实照片**，是本会话早先网络正常时从 Wikimedia 抓下来并带完整署名的。
// 所以做法是：按题材把这些照片交叉分配给还缺素材的方案，署名照实保留、并注明"原本为哪个方案抓取"。
// 凡是靠交叉分配与 NASA 都凑不够的题材，改用 make-textures.py 生成**明确标注为生成物**的版面，
// 冒充照片写进署名表。
//
//   node assign-assets.mjs --dry        只看分配结果
//   node assign-assets.mjs              真做
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { spawnChecked, assertFilesExist } from './checked-spawn.mjs';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');
// Python：**env 优先，本机 DSH 运行时路径只作最后兜底**（39 §2-B05/B10）。
const PY = process.env.PROTO_PYTHON || process.env.SHOT_PYTHON
  || 'C:/Users/Administrator/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe';
const dry = process.argv.includes('--dry');
// --redo：先把目标方案里由本脚本放进去的文件（reuse-* / nasa-*）清掉再重配。
// 用途：关键词选错了题材时要能重来。实测第一轮 S22（和纸）被 'paper' 这个关键词
// 匹配到了 "laid-paper" 与 "newspaper-pile"，S23（剥落灰泥）匹配到了层压板 —— 题材完全不对。
const redo = process.argv.includes('--redo');

// ── 要补齐的方案：保留自带照片 + 按关键词从语料里取 + NASA 检索 + 纹理 ───────────
const TARGETS = {
  'S18-phosphor-service-deck': {
    keep: true,
    reuse: ['cathode ray', 'vacuum tube', 'amplifier'],
    nasa: ['control panel switch'],
    textures: [
      { name: 'scanline', gen: 'scanlines', w: 8, h: 8, args: { period: 3, alpha: 0.16 } },
      { name: 'phosphor-grain', gen: 'grain', w: 256, h: 256, args: { seed: 7, density: 0.42, alpha: 0.07 } },
      { name: 'schematic-grid', gen: 'grid', w: 128, h: 128, args: { step: 8, alpha: 0.12 } },
    ],
  },
  'S19-copperplate-herbarium-cabinet': {
    keep: true,
    reuse: ['herbarium', 'card catalog', 'hand-book for young painters', 'typescript', 'triplicate', 'lesson'],
    nasa: [],
    textures: [
      { name: 'card-stock', gen: 'fiber', w: 256, h: 256, args: { seed: 21, count: 320, alpha: 0.085 } },
      { name: 'drawer-wood', gen: 'streak', w: 512, h: 128, args: { seed: 4, angle: 0, count: 140, alpha: 0.12 } },
      { name: 'foxing', gen: 'blotch', w: 256, h: 256, args: { seed: 9, count: 9, rmin: 3, rmax: 14, alpha: 0.16, color: '#8a6a3a' } },
    ],
  },
  'S20-plotter-soundfield': {
    keep: true,
    reuse: ['admiralty chart', 'chart', 'control room', 'instruments', 'cockpit', 'flight controls', 'cooling tower', 'propulsion'],
    nasa: ['control panel switch', 'instrument panel'],
    textures: [
      { name: 'coord-paper', gen: 'grid', w: 128, h: 128, args: { step: 12, alpha: 0.16 } },
      { name: 'plotter-line', gen: 'streak', w: 512, h: 512, args: { seed: 15, angle: 1.5708, count: 220, alpha: 0.09 } },
      { name: 'paper-grain', gen: 'grain', w: 256, h: 256, args: { seed: 33, density: 0.4, alpha: 0.05 } },
    ],
  },
  'S21-interlocking-release-book': {
    keep: true,
    // 联锁释放簿：瑞士铁路扳道调度。语料里有货运／道岔／控制台的实拍可用。
    reuse: ['freight', 'rail', 'intermodal', 'control room', 'control panel', 'cockpit', 'telemetry', 'propulsion', 'stationary engines'],
    nasa: ['control panel switch'],
    textures: [
      { name: 'release-grid', gen: 'grid', w: 128, h: 128, args: { step: 6, alpha: 0.14 } },
      { name: 'steel-grain', gen: 'grain', w: 256, h: 256, args: { seed: 111, density: 0.4, alpha: 0.06 } },
    ],
  },
  'S22-paper-screen-folded-sheet': {
    keep: true,
    // 题材＝和纸／障子／透光的纸面。第一轮用 'paper' 当关键词，结果匹配到 "laid-paper" 以外的
    // "newspaper-pile" 与层压板，题材完全不对 —— 这次收窄到确指纸品本身的词。
    // washi（S13 的 src-washi.jpg）与 laid-paper（S13 的 plate-laid-paper）是真正的纸面实拍；
    // 575 页纸摞、报纸堆、装帧书页也都落在"成摞的纸"这件事上。
    reuse: ['washi', 'laid-paper', 'newspaper-pile', 'list-on-paper', 'printing and bookbinding', 'shelving', 'kiosk'],
    nasa: [],
    textures: [
      { name: 'washi-fiber', gen: 'fiber', w: 512, h: 512, args: { seed: 27, count: 1400, alpha: 0.10 } },
      { name: 'crease', gen: 'crease', w: 1024, h: 8, args: { horizontal: true, pos: 0.5, alpha: 0.42, dark: '#6b6558', light: '#ffffff' } },
      { name: 'soft-ground', gen: 'grain', w: 256, h: 256, args: { seed: 41, density: 0.5, alpha: 0.045 } },
    ],
  },
  'S23-exposed-plaster-chronology-wall': {
    keep: true,
    // 题材＝层层覆盖、剥落的旧墙。语料里没有"剥落灰泥"的直接实拍，
    // 所以取**有年代、有表面损伤、有层**的实拍：风化窗格、档案馆的墙面与货架、
    // 1911 年的老厂房、上漆的街面售货亭、老仓库内景。第一轮混进来的层压板是"层叠"但不"陈旧"，已去掉。
    reuse: ['grate', 'src-storagebw', 'src-paraguay', 'src-shelving', 'asbestos', 'warehouse', 'kiosk', 'market', 'shoemaker', 'src-'],
    nasa: [],
    textures: [
      { name: 'plaster-flake', gen: 'flake', w: 1024, h: 1024, args: { seed: 5, count: 11, alpha: 0.9, color: '#c9c3ae' } },
      { name: 'scrape', gen: 'streak', w: 512, h: 512, args: { seed: 17, angle: 0.26, count: 150, alpha: 0.11 } },
      { name: 'pigment-grain', gen: 'grain', w: 256, h: 256, args: { seed: 51, density: 0.45, alpha: 0.06 } },
    ],
  },
  'S24-cyanotype-rainforest-path': {
    keep: true,
    reuse: ['herbarium', 'batik', 'botanical', 'leaf', 'plant', 'radar image', 'river basins'],
    nasa: ['forest canopy', 'river basin'],
    textures: [
      { name: 'cyanotype-grain', gen: 'grain', w: 256, h: 256, args: { seed: 61, density: 0.38, alpha: 0.08, color: '#123a5c' } },
      { name: 'exposure-blotch', gen: 'blotch', w: 512, h: 512, args: { seed: 65, count: 6, rmin: 30, rmax: 120, alpha: 0.10, color: '#1d4e78' } },
    ],
  },
  'S26-geometric-collision-columns': {
    keep: true,
    reuse: ['albion press', 'composing', 'movable type', 'type case', 'letterpress', 'sottsass', 'memphis', 'risograph'],
    nasa: [],
    textures: [
      { name: 'rule-11deg', gen: 'rule', w: 512, h: 512, args: { angle: 0.192, spacing: 24, alpha: 0.18 } },
      { name: 'misreg', gen: 'misreg', w: 512, h: 512, args: { dx: 1.5, dy: 1.2, alpha: 0.85, color: '#c8341f', lineWidth: 2 } },
      { name: 'ink-grain', gen: 'grain', w: 256, h: 256, args: { seed: 71, density: 0.42, alpha: 0.06 } },
    ],
  },
  'S27-hand-painted-bill-dispatch': {
    keep: true,
    // 题材＝手绘／石印的单张通告（"公文幕"）。语料里有两类正好对得上：
    // 一是 S16 那批**未来主义宣言单张**（Le Figaro 宣言、Marinetti 的 Parole in Libertà）——
    // 它们本身就是"印出来的宣言纸"；二是打字稿、复写件、公告、招牌、Batik 手册这类手工纸面。
    reuse: ['manifesto', 'parole', 'figaro', 'typescript', 'triplicate', 'carbon', 'hearings', 'signboard', 'batik', 'shoemaker', 'market', 'handbook', 'letter', 'samizdat'],
    nasa: [],
    textures: [
      { name: 'cloth-fold', gen: 'streak', w: 512, h: 512, args: { seed: 23, angle: 1.35, count: 90, alpha: 0.13 } },
      { name: 'stone-grain', gen: 'grain', w: 256, h: 256, args: { seed: 81, density: 0.5, alpha: 0.07 } },
      { name: 'paint-blotch', gen: 'blotch', w: 512, h: 512, args: { seed: 83, count: 8, rmin: 10, rmax: 44, alpha: 0.14, color: '#0e6258' } },
    ],
  },
  'S28-jazz-intaglio-wall': {
    keep: true,
    // 题材＝爵士唱片封套／凹版印刷。语料里没有爵士本身，
    // 所以取"唱片与录音"（唱机、卡带收音机）加"凹版与印刷"（Risograph、活字、铅字盘）两类，
    // 这个缺口在 CREDITS.md 里要写清楚，不能假装素材对上了题材。
    reuse: ['record player', 'cassette', 'radio', 'risograph', 'movable type', 'type case', 'arcade cabinet', 'silkscreen'],
    nasa: [],
    textures: [
      { name: 'groove', gen: 'groove', w: 256, h: 256, args: { period: 4, alpha: 0.42, vertical: true } },
      { name: 'crop-misreg', gen: 'misreg', w: 512, h: 512, args: { dx: 9, dy: 6, alpha: 0.7, color: '#af74be', lineWidth: 3 } },
      { name: 'press-grain', gen: 'grain', w: 256, h: 256, args: { seed: 91, density: 0.44, alpha: 0.075 } },
    ],
  },
  'S29-wire-bound-safety-manual': {
    keep: true,
    reuse: ['asbestos', 'cold room', 'hvac', 'cooling tower', 'food bank', 'stationary engineers', 'propulsion', 'warehouse', 'freight'],
    nasa: ['industrial pump', 'control panel switch'],
    textures: [
      { name: 'manual-paper', gen: 'fiber', w: 256, h: 256, args: { seed: 95, count: 280, alpha: 0.075 } },
      { name: 'spec-grid', gen: 'grid', w: 128, h: 128, args: { step: 16, alpha: 0.13 } },
      { name: 'torque-grain', gen: 'grain', w: 256, h: 256, args: { seed: 97, density: 0.4, alpha: 0.055 } },
    ],
  },
  'S30-skate-sticker-split': {
    keep: true,
    reuse: ['screen print', 'arcade cabinet', 'risograph', 'printing demonstration', 'laminato', 'memphis'],
    nasa: [],
    textures: [
      { name: 'split-band', gen: 'band', w: 1024, h: 1024, args: { angle: 1.0123, width: 96, alpha: 1.0, color: '#00e676' } },
      { name: 'grip-grain', gen: 'grain', w: 128, h: 128, args: { seed: 101, density: 0.72, alpha: 0.14 } },
      { name: 'peel-edge', gen: 'misreg', w: 512, h: 512, args: { dx: 3, dy: 0, alpha: 0.8, color: '#007b3f', lineWidth: 3 } },
    ],
  },
};

// UA 里不写绝对路径：原来那个写死的仓库根字面量既绑定机器，又会随每次请求发到外网。
const UA = 'prototype-builder/1.0 (web-style-atlas)';

// ── 1 建全局语料索引 ──────────────────────────────────────────────
// 上一版按 credits.json 的 e.file 去找文件，只索引到 22 条 / 4 个方案 —— 因为多数方案的
// credits.json 记的是"原始下载名"，而落盘的是改名后的加工件，对不上。
// 改成**直接扫文件**：文件名本身就带题材信息（很多是 Commons 的原文件名，
// 例如 "HBL-newspaper-composition-room-1934.jpg"、"Codfish Drying Flake, Å i Lofoten.jpg"），
// credits.json 只用来补充作者与许可。
//
// 同时排除加工过的衍生件（plate- / halftone- / dither- / duotone- / texture- 开头的），
// 那些是半调网点、双色调之类的成品图版，不是照片，拿它们当"再加工素材"等于用二手件重印。
// 只排除**明确的合成件**（纹理、光标、噪点、纸纹）。
// 不要排除 plate- / halftone- / dither- / duotone-：S09 的真实照片就叫 assets/plate-01-shoe-repair.png，
// 一刀切排掉会让整个方案的素材消失。同一个题材可能同时存在 raw 与加工件两份，
// 那个问题用"按标题去重 + raw 优先"解决，而不是靠文件名排除。
const DERIVED = /^(texture-|cursor-|grain-|noise-|paper-|crop-)/i;

// 目录枚举**一律排序**（本仓既定口径：collect-schemes.mjs:169、summarize-all.mjs:20、
// write-credits.mjs:36、verify-prototype.mjs:144、check-stale.mjs:44 都这么做）。
// 不排序时 NTFS 与 ext4 的返回顺序不同 ⇒ credits.json / CREDITS.md 的行序会变，
// 并列项还会退回插入序、选出不同的照片（39 §2-B11 / §3-N13）。
const sortDirents = (list) => list.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
const sortNames = (list) => list.slice().sort();

function loadCredits(schemeDir) {
  const map = new Map();
  for (const sub of ['assets/credits.json', 'build/raw/credits.json', 'build/raw-s01/credits.json', 'build/credits.json', 'build/raw/credits-raw.json']) {
    const p = join(PROTO, schemeDir, sub);
    if (!existsSync(p)) continue;
    let arr;
    try {
      // **必须剥掉 UTF-8 BOM**：多数 credits.json 是 PowerShell 写的，开头带 EF BB BF，
      // 直接 JSON.parse 会抛 "Unexpected token '﻿'"。上一版就是这么丢掉
      // S01 / S14 / S15 等一大批方案的 —— 索引从 73 条缩到 22 条，我一开始还以为是标题对不上。
      const txt = readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
      arr = JSON.parse(txt);
    } catch { continue; }
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
      const keys = [e.file, e.filename, e.raw].filter(Boolean);
      for (const k of keys) {
        const b = String(k).replace(/\\/g, '/').split('/').pop();
        map.set(b, e);
        map.set(b.replace(/\.(jpe?g|png|webp)$/i, ''), e);
      }
    }
  }
  return map;
}

const corpus = [];
for (const d of sortDirents(readdirSync(PROTO, { withFileTypes: true }))) {
  if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
  const scheme = d.name.slice(0, 3);
  const creds = loadCredits(d.name);
  const roots = ['build/raw', 'build/raw-s01', 'raw-s01', 'assets', 'build'].map((s) => join(PROTO, d.name, s)).filter(existsSync);
  for (const root of roots) {
    for (const f of sortDirents(readdirSync(root, { withFileTypes: true }))) {
      if (!f.isFile()) continue;
      if (!/\.(jpe?g|png|webp)$/i.test(f.name)) continue;
      const inAssets = /assets[\\/]?$/.test(root + '/') || /assets/.test(root);
      // DERIVED 过滤只对 assets/ 生效。
      // 踩过的坑：S01 的**原始下载件**就叫 plate-01-linotype.jpg（放在 build/raw/ 里），
      // 一刀切排掉 plate- 开头会把它的全部素材都挡在索引外。
      if (inAssets && DERIVED.test(f.name)) continue;
      const p = join(root, f.name);
      const st = statSync(p);
      if (st.size < 80000) continue;
      const c = creds.get(f.name) || creds.get(f.name.replace(/\.(jpe?g|png|webp)$/i, '')) || null;
      // 可检索文本＝标题 + 文件名。标题形如 "File:Admiralty Chart No 2330 Norway South Coast..."，
      // 是判断题材最可靠的字段；文件名常被改成 photo-01-boat 这类内部名，单靠它匹配不到。
      const titleText = String((c && c.title) || '').replace(/^File:/i, '');
      const hay = (titleText + ' ' + f.name).toLowerCase().replace(/[_]+/g, '-');
      corpus.push({
        from: scheme, path: p, file: f.name, bytes: st.size,
        hay,
        title: (c && c.title) || f.name.replace(/\.[a-z]+$/i, ''),
        artist: (c && c.artist) || '（原件未标注作者）',
        license: (c && c.license) || '见来源页',
        page: (c && (c.page || c.original)) || '',
        original: (c && c.original) || '',
        raw: /raw/.test(root),
      });
    }
  }
}
console.log(`语料索引：${corpus.length} 条，来自 ${[...new Set(corpus.map((c) => c.from))].length} 个方案（已排除衍生加工件）`);

// ── 2 NASA 检索（唯一还能用的可检索真图源）──────────────────────────
async function nasaSearch(q, n = 3) {
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=${n}`;
  for (let t = 1; t <= 3; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return ((j.collection && j.collection.items) || []).map((it) => ({
        title: (it.data && it.data[0] && it.data[0].title) || 'NASA image',
        artist: 'NASA',
        license: '公有领域（NASA 图像使用条款）',
        page: (it.links && it.links[0] && it.links[0].href) || '',
        href: (it.links && it.links[0] && it.links[0].href) || '',
      })).filter((x) => x.href);
    } catch (e) {
      if (t === 3) { console.log(`    ! NASA 检索失败「${q}」: ${e.message}`); return []; }
      await new Promise((res) => setTimeout(res, 800 * t));
    }
  }
}
async function nasaDownload(href) {
  for (let t = 1; t <= 3; t++) {
    try {
      const r = await fetch(href, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 30000) throw new Error('too small');
      return b;
    } catch (e) {
      if (t === 3) return null;
      await new Promise((res) => setTimeout(res, 800 * t));
    }
  }
}

// ── 3 逐案执行 ────────────────────────────────────────────────────
const report = [];
for (const [dir, cfg] of Object.entries(TARGETS)) {
  const base = join(PROTO, dir);
  const assets = join(base, 'assets');
  const rawDir = join(base, 'build/raw');
  mkdirSync(assets, { recursive: true });
  mkdirSync(rawDir, { recursive: true });

  const own = [];   // 该案自带的真图
  if (existsSync(assets)) {
    for (const f of sortNames(readdirSync(assets))) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      if (/^texture-/.test(f)) continue;
      if (redo && /^(reuse-|nasa-)/.test(f)) { try { unlinkSync(join(assets, f)); } catch { /* 忽略 */ } continue; }
      if (statSync(join(assets, f)).size < 40000) continue;
      own.push(f);
    }
  }
  const picked = [];
  const takenPaths = new Set();
  // 先保留自带的
  if (cfg.keep) for (const f of own) picked.push({ file: f, local: true });

  // 再按关键词从语料里取。排序：raw 原图优先、大图优先。
  // **按标题去重**：同一张照片常有 raw 原件与加工件两份（例如 S12 的 carlton-bookcase.jpg 与
  // assets/plate-01-carlton-laminate.png 是同一张），不去重会把同题材选两遍。
  const cands = [];
  const seenTitle = new Set();
  for (const kw of cfg.reuse || []) {
    for (const c of corpus) {
      if (c.from === dir.slice(0, 3)) continue;
      if (takenPaths.has(c.path)) continue;
      if (!c.hay.includes(kw.toLowerCase())) continue;
      const tkey = String(c.title).toLowerCase().replace(/^file:/, '').replace(/[^a-z0-9]+/g, '').slice(0, 40);
      if (seenTitle.has(tkey)) continue;
      seenTitle.add(tkey);
      cands.push({ c, kw });
      takenPaths.add(c.path);
    }
  }
  cands.sort((a, b) => (b.c.raw - a.c.raw) || (b.c.bytes - a.c.bytes));
  for (const { c } of cands) {
    if (picked.length >= 6) break;
    const ext = (c.file.match(/\.(jpe?g|png|webp)$/i) || ['.jpg'])[0];
    const stem = c.file.replace(/\.(jpe?g|png|webp)$/i, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    picked.push({ file: `reuse-${c.from.toLowerCase()}-${stem}${ext}`, src: c.path, meta: c });
  }
  // 最后用 NASA 补（文件名必须带哈希，否则不同条目会撞成一个名字互相覆盖）
  const nasaTag = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 5); };
  for (const q of cfg.nasa || []) {
    if (picked.length >= 6) break;
    for (const n of await nasaSearch(q, 3)) {
      if (picked.length >= 6) break;
      if (picked.some((p) => p.meta && p.meta.page === n.page)) continue;
      const stem = n.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36) || 'nasa';
      const file = `nasa-${stem}-${nasaTag(n.page || n.title)}.jpg`;
      picked.push({ file, nasa: n, meta: { title: n.title, artist: 'NASA', license: n.license, page: n.page, from: 'NASA' } });
    }
  }

  if (dry) {
    console.log(`\n${dir}：自带 ${own.length} + 取用 ${picked.length - own.length} = ${picked.length}`);
    for (const p of picked) console.log(`   ${p.local ? '[自带]' : '[新增]'} ${p.file}   ${String((p.meta && p.meta.title) || '').slice(0, 54)}`);
    continue;
  }

  const creds = [];
  for (const p of picked) {
    const dest = join(assets, p.file);
    if (p.local) {
      const c = corpus.find((x) => x.from === dir.slice(0, 3) && x.file === p.file);
      creds.push(c
        ? { file: p.file, title: c.title, artist: c.artist, license: c.license, page: c.page, original: c.original, origin: 'Wikimedia Commons（为本方案抓取）' }
        : { file: p.file, title: p.file, artist: '见本方案 build 目录的原始 credits.json', license: '见来源页', origin: 'Wikimedia Commons（为本方案抓取）' });
      continue;
    }
    if (p.src) copyFileSync(p.src, dest);
    else if (p.nasa) {
      const b = await nasaDownload(p.nasa.href);
      if (!b) { console.log(`    ! NASA 下载失败 ${p.file}`); continue; }
      writeFileSync(dest, b);
    }
    const m = p.meta;
    creds.push({
      file: p.file, title: m.title, artist: m.artist, license: m.license,
      page: m.page, original: m.page,
      origin: p.src ? `Wikimedia Commons（原本为方案 ${m.from} 抓取，本方案按题材复用）` : 'NASA 图像库',
    });
    console.log(`    + ${p.file}  ← ${p.src ? m.from : 'NASA'}  ${String(m.title).slice(0, 46)}`);
  }

  // 纹理
  if (cfg.textures && cfg.textures.length) {
    const jobFile = join(base, 'build', 'texture-job.json');
    writeFileSync(jobFile, JSON.stringify({ outDir: assets.replace(/\\/g, '/'), jobs: cfg.textures }, null, 1), 'utf8');
    // 这里原先是裸 spawnSync(PY, …)：不查返回值 ⇒ Python 挂了也**静默**继续写署名表，
    // 于是 CREDITS.md 自称有 N 张纹理而 assets/ 里一张都没有（实测发生过，39 §T0-8 / §2-B10）。
    // 现在：① checked-spawn 查 error/status/signal 并带 stderr 原文；
    //       ② 查完退出码还要查**文件真在不在**——make-textures.py 对未知生成器是 print + continue，
    //          实测会 return 0 而一张不写（42-scratch/t5-job.json 复现），单查 status 不够。
    const { stdout } = spawnChecked(PY, [join(PROTO, '_build', 'make-textures.py'), jobFile], {
      label: `make-textures.py → ${dir}`,
    });
    if (stdout.trim()) process.stdout.write(stdout.endsWith('\n') ? stdout : stdout + '\n');
    assertFilesExist(assets, cfg.textures.map((t) => `texture-${t.name}.png`), {
      label: `make-textures.py → ${dir}`, detail: `job: ${jobFile}\n${stdout}`,
    });
  }

  const photos = creds.length;
  writeFileSync(join(assets, 'credits.json'), JSON.stringify(creds, null, 1), 'utf8');
  const gen = sortNames(readdirSync(assets)).filter((f) => /^texture-/.test(f));
  const L = [];
  L.push('# 素材来源与署名');
  L.push('');
  // ⚠️ W-4（收敛 ⑰ §1#16）：这里曾写死「2026-10-18 之后所有可检索图源全部不可用/403 拦截页」，
  //    已盖进 12 份交付 CREDITS.md——而契约 §10.1（b0ecb2d）实测更正：commons 200、wikidata 通。
  //    教训：**更正只落在文档、没落在产出文档的那段代码 = 没更正**（生成器会把过期句重新盖回去）。
  //    现在这段只做"历史窗口陈述 + 指路契约"，连通性真值单一来源 = _CONTRACT.md §10.1，本文不复制状态。
  L.push('> **本目录的真图来源**（本块 2026-10-24 改写；逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复断言全网状态）：');
  L.push('> 本方案的实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。');
  L.push('> 2026-10-18 04:15 之后本环境曾进入图源受限窗口（Wikimedia 连接被重置、loc.gov／picryl／pexels／pixabay 返回 403），**2026-10-22 复测已解除**（commons HTTP 200、检索命中、缩略图可下载）。');
  L.push('> 因此下表若有题材与本案主张对不上的图，那是历史窗口的遗留、不是"现在拿不到"——补对题素材是产品决定，逐案缺口须写在下表备注里（契约 §10.1 硬要求）。');
  L.push('');
  L.push('## 一、真实照片');
  L.push('');
  L.push('| 文件 | 标题 | 作者 | 许可 | 来源 |');
  L.push('| --- | --- | --- | --- | --- |');
  for (const c of creds) L.push(`| \`${c.file}\` | ${c.title} | ${c.artist} | ${c.license} | ${c.page ? `[原件页](${c.page})` : '—'} · ${c.origin || ''} |`);
  L.push('');
  L.push('## 二、程序化纹理（生成物，非照片）');
  L.push('');
  L.push('| 文件 | 生成器 | 参数 |');
  L.push('| --- | --- | --- |');
  for (const t of (cfg.textures || [])) L.push(`| \`texture-${t.name}.png\` | \`${t.gen}\` | \`${JSON.stringify(t.args || {})}\` |`);
  L.push('');
  L.push('这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。');
  L.push('');
  L.push('## 三、字体');
  L.push('');
  L.push('页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。');
  L.push('');
  writeFileSync(join(assets, 'CREDITS.md'), L.join('\n'), 'utf8');

  const imgs = sortNames(readdirSync(assets)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f) && !/^texture-/.test(f)).length;
  console.log(`  ${dir}: 真图 ${imgs} 张（署名 ${photos} 条），纹理 ${gen.length} 个`);
  report.push({ dir, photos, textures: gen.length, ok: imgs >= 4 });
}

if (!dry) {
  console.log('\n=== 汇总 ===');
  for (const r of report) console.log(`  ${r.ok ? 'OK  ' : '不足'} ${r.dir}  真图 ${r.photos}  纹理 ${r.textures}`);
}
