#!/usr/bin/env node
// 按配置表为一个方案备好整套素材：真实照片（Wikimedia Commons）+ 程序化纹理 + 署名文件。
//
// 为什么由 Lead 用脚本做而不是交给 agent：
//   实测两个 agent 在这一步上分别转了 25 分钟与 60+ 分钟，其中 S15 的素材在第 20 分钟就够用了，
//   之后它一直在重写 make-plates.py 与 qc-assets.py 自我迭代。素材是**确定性**工作，
//   不该由会自由发挥的 agent 来做。页面才需要设计判断 —— 那部分仍然交给 agent。
//
//   node --use-system-ca fetch-scheme-assets.mjs S18-phosphor-service-deck
//   node --use-system-ca fetch-scheme-assets.mjs --all-missing
//   node --use-system-ca fetch-scheme-assets.mjs --list
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = join(ROOT, 'prototypes');
// Python 解释器：env（PROTO_PYTHON/SHOT_PYTHON）优先 → 由 os.homedir() 派生开发机的 DSH 运行时
// （不写死用户名——公共仓库不泄漏作者机路径，47 号 E7；同时也让闸门在本机继续能跑——
// 纯走 PATH 的 python 在 Windows 下会撞商店 stub，status 9009）→ 最后兜底 PATH。
const DSH_PY = (() => {
  const p = os.homedir().replace(/\\/g, "/") + "/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/python.exe";
  return existsSync(p) ? p : "python";
})();
const PY = process.env.PROTO_PYTHON || process.env.SHOT_PYTHON || DSH_PY;
// UA 里不写绝对路径（原来那个写死的仓库根字面量既绑定机器，又会随每次请求发到外网）。
const UA = 'prototype-builder/1.0 (web-style-atlas; contact: local)';

// ── 配置表：每个方案的检索词与纹理清单 ───────────────────────────────
// queries 用英文（Commons 的检索对英文更友好）；textures 复用 make-textures.py 里的生成器。
const PLAN = {
  'S18-phosphor-service-deck': {
    queries: ['oscilloscope screen', 'cathode ray tube instrument', 'vacuum tube amplifier', 'control panel indicator lamp', 'electronic service manual schematic'],
    want: 6,
    textures: [
      { name: 'scanline', gen: 'scanlines', w: 8, h: 8, args: { period: 3, alpha: 0.16 } },
      { name: 'phosphor-grain', gen: 'grain', w: 256, h: 256, args: { seed: 7, density: 0.42, alpha: 0.07 } },
      { name: 'schematic-grid', gen: 'grid', w: 128, h: 128, args: { step: 8, alpha: 0.12 } },
    ],
  },
  'S19-copperplate-herbarium-cabinet': {
    queries: ['herbarium sheet specimen', 'pressed plant specimen sheet', 'botanical engraving copperplate', 'card catalogue drawer library', 'botanical illustration 19th century'],
    want: 6,
    textures: [
      { name: 'card-stock', gen: 'fiber', w: 256, h: 256, args: { seed: 21, count: 320, alpha: 0.085 } },
      { name: 'drawer-wood', gen: 'streak', w: 512, h: 128, args: { seed: 4, angle: 0, count: 140, alpha: 0.12 } },
      { name: 'foxing', gen: 'blotch', w: 256, h: 256, args: { seed: 9, count: 9, rmin: 3, rmax: 14, alpha: 0.16, color: '#8a6a3a' } },
    ],
  },
  'S20-plotter-soundfield': {
    queries: ['pen plotter drawing', 'chart recorder paper', 'oscilloscope waveform trace', 'seismograph record', 'coordinate paper graph'],
    want: 6,
    textures: [
      { name: 'coord-paper', gen: 'grid', w: 128, h: 128, args: { step: 12, alpha: 0.16 } },
      { name: 'plotter-line', gen: 'streak', w: 512, h: 512, args: { seed: 15, angle: 1.5708, count: 220, alpha: 0.09 } },
      { name: 'paper-grain', gen: 'grain', w: 256, h: 256, args: { seed: 33, density: 0.4, alpha: 0.05 } },
    ],
  },
  'S22-paper-screen-folded-sheet': {
    queries: ['shoji screen japanese', 'washi paper texture', 'japanese tea room interior', 'folded paper crease', 'japanese paper lantern'],
    want: 6,
    textures: [
      { name: 'washi-fiber', gen: 'fiber', w: 256, h: 256, args: { seed: 27, count: 420, alpha: 0.10 } },
      { name: 'crease', gen: 'crease', w: 1024, h: 8, args: { horizontal: true, pos: 0.5, alpha: 0.42, dark: '#6b6558', light: '#ffffff' } },
      { name: 'soft-ground', gen: 'grain', w: 256, h: 256, args: { seed: 41, density: 0.5, alpha: 0.045 } },
    ],
  },
  'S23-exposed-plaster-chronology-wall': {
    queries: ['peeling paint wall layers', 'exposed plaster wall', 'mural detail mexico', 'distemper paint wall', 'old wall plaster damage'],
    want: 6,
    textures: [
      { name: 'plaster-flake', gen: 'flake', w: 1024, h: 1024, args: { seed: 5, count: 11, alpha: 0.9, color: '#c9c3ae' } },
      { name: 'scrape', gen: 'streak', w: 512, h: 512, args: { seed: 17, angle: 0.26, count: 150, alpha: 0.11 } },
      { name: 'pigment-grain', gen: 'grain', w: 256, h: 256, args: { seed: 51, density: 0.45, alpha: 0.06 } },
    ],
  },
  'S24-cyanotype-rainforest-path': {
    queries: ['cyanotype photogram', 'fern leaf specimen', 'rainforest canopy leaves', 'leaf veins macro', 'blueprint botanical'],
    want: 6,
    textures: [
      { name: 'cyanotype-grain', gen: 'grain', w: 256, h: 256, args: { seed: 61, density: 0.38, alpha: 0.08, color: '#123a5c' } },
      { name: 'paper-edge', gen: 'fiber', w: 256, h: 256, args: { seed: 63, count: 300, alpha: 0.09 } },
      { name: 'exposure-blotch', gen: 'blotch', w: 512, h: 512, args: { seed: 65, count: 6, rmin: 30, rmax: 120, alpha: 0.10, color: '#1d4e78' } },
    ],
  },
  'S26-geometric-collision-columns': {
    queries: ['bauhaus poster 1920s', 'letterpress colour proof', 'geometric print bauhaus', 'bauhaus workshop dessau', 'overprint registration mark'],
    want: 6,
    textures: [
      { name: 'rule-11deg', gen: 'rule', w: 512, h: 512, args: { angle: 0.192, spacing: 24, alpha: 0.18 } },
      { name: 'misreg', gen: 'misreg', w: 512, h: 512, args: { dx: 1.5, dy: 1.2, alpha: 0.85, color: '#c8341f', lineWidth: 2 } },
      { name: 'ink-grain', gen: 'grain', w: 256, h: 256, args: { seed: 71, density: 0.42, alpha: 0.06 } },
    ],
  },
  'S27-hand-painted-bill-dispatch': {
    queries: ['indian hand painted film poster', 'hand painted signboard india', 'lithography stone printing', 'bombay cinema 1960s', 'hand painted advertisement wall'],
    want: 6,
    textures: [
      { name: 'cloth-fold', gen: 'streak', w: 512, h: 512, args: { seed: 23, angle: 1.35, count: 90, alpha: 0.13 } },
      { name: 'stone-grain', gen: 'grain', w: 256, h: 256, args: { seed: 81, density: 0.5, alpha: 0.07 } },
      { name: 'paint-blotch', gen: 'blotch', w: 512, h: 512, args: { seed: 83, count: 8, rmin: 10, rmax: 44, alpha: 0.14, color: '#0e6258' } },
    ],
  },
  'S28-jazz-intaglio-wall': {
    queries: ['jazz record sleeve 1950s', 'intaglio printing press', 'vinyl record macro groove', 'recording studio tape machine', 'jazz album cover design'],
    want: 6,
    textures: [
      { name: 'groove', gen: 'groove', w: 256, h: 256, args: { period: 4, alpha: 0.42, vertical: true } },
      { name: 'crop-misreg', gen: 'misreg', w: 512, h: 512, args: { dx: 9, dy: 6, alpha: 0.7, color: '#af74be', lineWidth: 3 } },
      { name: 'press-grain', gen: 'grain', w: 256, h: 256, args: { seed: 91, density: 0.44, alpha: 0.075 } },
    ],
  },
  'S29-wire-bound-safety-manual': {
    queries: ['industrial pump machine', 'machine tool workshop', 'technical manual diagram', 'wire bound notebook', 'industrial safety sign factory'],
    want: 6,
    textures: [
      { name: 'manual-paper', gen: 'fiber', w: 256, h: 256, args: { seed: 95, count: 280, alpha: 0.075 } },
      { name: 'spec-grid', gen: 'grid', w: 128, h: 128, args: { step: 16, alpha: 0.13 } },
      { name: 'torque-grain', gen: 'grain', w: 256, h: 256, args: { seed: 97, density: 0.4, alpha: 0.055 } },
    ],
  },
  'S30-skate-sticker-split': {
    queries: ['skateboard deck grip tape', 'sticker covered surface', 'screen printed sticker', 'skatepark concrete', 'skateboard wheels close up'],
    want: 6,
    textures: [
      { name: 'split-band', gen: 'band', w: 1024, h: 1024, args: { angle: 1.0123, width: 96, alpha: 1.0, color: '#00e676' } },
      { name: 'grip-grain', gen: 'grain', w: 128, h: 128, args: { seed: 101, density: 0.72, alpha: 0.14 } },
      { name: 'peel-edge', gen: 'misreg', w: 512, h: 512, args: { dx: 3, dy: 0, alpha: 0.8, color: '#007b3f', lineWidth: 3 } },
    ],
  },
};

// S16 的位图已经有了（9 个），只缺署名文件 —— 这里允许只补 credits。
const CREDITS_ONLY = {
  'S16-velocity-slant-manifesto': { queries: [], want: 0, textures: [], creditsFromRaw: true },
};

function stripQuery(u) { return String(u).split('?')[0]; }

async function api(params) {
  const qs = new URLSearchParams({ format: 'json', origin: '*', ...params });
  const url = 'https://commons.wikimedia.org/w/api.php?' + qs.toString();
  // 与 download 同样加重试：实测连续检索时 API 也会间歇性 fetch failed
  let lastErr;
  for (let t = 1; t <= 6; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 600 * Math.pow(1.6, t)));
    }
  }
  throw lastErr;
}

async function download(url, dest) {
  // 6 次重试、指数退避：实测 Commons 的 upload 端点在连续取图时会间歇性 fetch failed
  // （连接被重置），退避不够就会丢图。丢图比慢更糟 —— 它会让"真实图片 ≥4"这条悄悄不达标。
  let lastErr;
  for (let t = 1; t <= 6; t++) {
    try {
      const r = await fetch(stripQuery(url), { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length < 12000) throw new Error('太小 (' + b.length + ' B)');
      writeFileSync(dest, b);
      return b.length;
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 600 * Math.pow(1.6, t)));
    }
  }
  throw lastErr;
}

const clean = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// 文件名必须带一个由原始标题算出的短哈希。
// 踩过的坑：slug 截断到 46 字符之后，两张不同的图会得到同一个文件名
// （S18 就出现了 ntm-cathode-ray-tubers-kr-birkeland-1890s-img-.jpg 出现两次、
//  一次 3120x3840 一次 4112x2751），后下的把先下的**静默覆盖**，署名表就对不上了。
function fileFor(title, mime) {
  const base = String(title).replace(/^File:/, '').replace(/\.[a-z]+$/i, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  let h = 2166136261;
  for (let i = 0; i < title.length; i++) { h ^= title.charCodeAt(i); h = Math.imul(h, 16777619); }
  const tag = (h >>> 0).toString(36).slice(0, 5);
  return `${base}-${tag}${mime === 'image/png' ? '.png' : '.jpg'}`;
}

async function doScheme(dir, cfg) {
  const base = join(PROTO, dir);
  const assets = join(base, 'assets');
  const raw = join(base, 'build', 'raw');
  mkdirSync(assets, { recursive: true });
  mkdirSync(raw, { recursive: true });
  const credits = [];
  const seen = new Set();

  if (!cfg.creditsFromRaw) {
    for (const q of cfg.queries) {
      if (credits.length >= cfg.want) break;
      let j;
      try { j = await api({ action: 'query', generator: 'search', gsrsearch: q, gsrnamespace: '6', gsrlimit: '10', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200' }); }
      catch (e) { console.log(`    ! 检索失败「${q}」: ${e.message}`); continue; }
      const pages = Object.values((j.query && j.query.pages) || {});
      for (const p of pages) {
        if (credits.length >= cfg.want) break;
        const ii = (p.imageinfo || [])[0];
        if (!ii) continue;
        const mime = ii.mime || '';
        if (!/^image\/(jpeg|png)$/.test(mime)) continue;           // 排除 svg / tiff / gif
        if (!ii.width || ii.width < 1000) continue;                 // 要真实分辨率
        const title = p.title || '';
        const key = title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const name = fileFor(title, mime);
        const dest = join(assets, name);
        const src = ii.thumburl || ii.url;
        try {
          const bytes = existsSync(dest) ? statSync(dest).size : await download(src, dest);
          const em = ii.extmetadata || {};
          credits.push({
            file: name,
            title: clean(title),
            artist: clean(em.Artist && em.Artist.value) || '（Commons 未标注作者）',
            license: clean(em.LicenseShortName && em.LicenseShortName.value) || '见来源页',
            origin: clean(em.Credit && em.Credit.value) || 'Wikimedia Commons',
            page: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
            original: ii.url,
            width: ii.width, height: ii.height, bytes,
            query: q,
          });
          console.log(`    + ${name}  ${ii.width}x${ii.height}  ${(bytes / 1024) | 0}KB  ${clean(em.LicenseShortName && em.LicenseShortName.value)}`);
        } catch (e) {
          console.log(`    ! 下载失败 ${name}: ${e.message}`);
        }
      }
    }
  } else {
    // 位图已存在，只从 build/raw 里的旧 credits.json 汇总
    const p = join(raw, 'credits.json');
    if (existsSync(p)) {
      try { credits.push(...JSON.parse(readFileSync(p, 'utf8'))); } catch { /* 忽略 */ }
    }
  }

  // 纹理（交给确定性 Python 生成器）
  if (cfg.textures && cfg.textures.length) {
    const jobFile = join(base, 'build', 'texture-job.json');
    writeFileSync(jobFile, JSON.stringify({ outDir: assets.replace(/\\/g, '/'), jobs: cfg.textures }, null, 1), 'utf8');
    const r = spawnSync(PY, [join(PROTO, '_build', 'make-textures.py'), jobFile], { stdio: 'inherit' });
    if (r.status !== 0) console.log('    ! 纹理生成失败，exit=' + r.status);
  }

  // 署名文件（由数据生成，不手抄）
  writeFileSync(join(assets, 'credits.json'), JSON.stringify(credits, null, 1), 'utf8');
  const lines = [];
  lines.push('# 素材来源与署名');
  lines.push('');
  lines.push('本目录的位图分两类：**真实照片**来自 Wikimedia Commons（逐张列出作者与许可），**程序化纹理**由 `prototypes/_build/make-textures.py` 生成（生成器名与参数在 `build/texture-job.json` 里，可复算，无第三方权利）。');
  lines.push('');
  lines.push('## 一、真实照片（Wikimedia Commons）');
  lines.push('');
  if (credits.length) {
    lines.push('| 文件 | 原始标题 | 作者 | 许可 | 尺寸 | 来源页 |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const c of credits) {
      lines.push(`| \`${c.file}\` | ${c.title} | ${c.artist} | ${c.license || '见来源页'} | ${c.width || '?'}×${c.height || '?'} | [原件页](${c.page || c.original || ''}) |`);
    }
    lines.push('');
    lines.push('署名要求：CC BY / CC BY-SA 的图片在页面上必须保留作者与许可；CC0 与公有领域标注来源即可。');
  } else {
    lines.push('（本目录没有真实照片，全部为程序化生成。）');
  }
  lines.push('');
  lines.push('## 二、程序化纹理');
  lines.push('');
  lines.push('| 文件 | 生成器 | 参数 |');
  lines.push('| --- | --- | --- |');
  for (const t of (cfg.textures || [])) {
    lines.push(`| \`texture-${t.name}.png\` | \`${t.gen}\` | \`${JSON.stringify(t.args || {})}\` |`);
  }
  if (!(cfg.textures || []).length) lines.push('| — | — | — |');
  lines.push('');
  lines.push('## 三、字体');
  lines.push('');
  lines.push('页面所用字体全部自托管在 `prototypes/_fonts/`，来源为 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。');
  lines.push('');
  writeFileSync(join(assets, 'CREDITS.md'), lines.join('\n'), 'utf8');

  const imgs = readdirSync(assets).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  console.log(`  ${dir}: 位图 ${imgs.length} 个，署名 ${credits.length} 条`);
  return { dir, photos: credits.length, images: imgs.length };
}

// ── 主流程 ───────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes('--list')) {
  for (const [d, c] of Object.entries({ ...PLAN, ...CREDITS_ONLY })) console.log(`${d}  检索 ${c.queries.length} 条  纹理想 ${c.textures.length} 个`);
  process.exit(0);
}

let targets;
if (argv.includes('--all-missing')) {
  targets = [];
  for (const [d, c] of Object.entries(PLAN)) {
    const a = join(PROTO, d, 'assets');
    const have = existsSync(a) ? readdirSync(a).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length : 0;
    if (have < 4) targets.push([d, c]); else console.log(`跳过 ${d}：已有 ${have} 个位图`);
  }
} else {
  targets = argv.filter((a) => !a.startsWith('--')).map((d) => {
    const c = PLAN[d] || CREDITS_ONLY[d];
    if (!c) { console.error('配置表里没有 ' + d); process.exit(2); }
    return [d, c];
  });
}

const out = [];
for (const [d, c] of targets) {
  console.log('\n=== ' + d + ' ===');
  try { out.push(await doScheme(d, c)); }
  catch (e) { console.log('  ! 失败: ' + e.message); out.push({ dir: d, error: e.message }); }
}
console.log('\n完成 ' + out.length + ' 个方案');
