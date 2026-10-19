#!/usr/bin/env node
// 抓 Google Fonts 的 css2 端点，把每个 @font-face 引用的 woff2 全部下载到本地，
// 改写 src 为本地相对路径，输出可直接 <link> 的自托管字体样式表。
//
// 为什么必须这样做：
//   1. 工作区没有 fontTools、读不到系统 CJK 字体、没有任何中文字体源料，
//      所以无法自行子集化；而 googleapis 的 css2 端点**返回的本来就是按
//      unicode-range 切好片的 woff2**，形态与 S21 手切的那 71 片一致。
//   2. 现有原型 S17/S08/S13 直接 <link> 到 fonts.googleapis.com，渲染依赖网络；
//      网络一抖字体就回退，正是 font-fallback 规则在这种语料上 earned=0 的原因。
//   3. woff2 在所有原型之间**共享缓存**，避免 22 份重复下载。
//
//   node fetch-fonts.mjs --families "Noto Serif SC:400,600,700" "Literata:400,600"
//   node fetch-fonts.mjs --list          # 只打印会下载多少片、多少字节，不写盘
//
import { mkdirSync, existsSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve('D:/Web/style');
const OUT = join(ROOT, 'prototypes', '_fonts');
const FILES = join(OUT, 'files');
const CSSDIR = join(OUT, 'css');

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const fams = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--families') { for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) fams.push(args[j]); }
}
if (!fams.length) { console.error('用法: node fetch-fonts.mjs --families "Family:400,600" ... [--list]'); process.exit(2); }

// 必须是现代浏览器 UA，否则 googleapis 会回 ttf 而不是 woff2（有些还会回 eot）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseSpec(s) {
  const [family, weights] = s.split(':');
  return { family: family.trim(), weights: (weights || '400').split(',').map(w => w.trim()).filter(Boolean) };
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function get(url, asText = true) {
  for (let t = 1; t <= 4; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': asText ? 'text/css,*/*' : '*/*' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return asText ? await r.text() : Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (t === 4) throw e;
      await new Promise(r => setTimeout(r, 800 * t));
    }
  }
}

// 从 css2 的 CSS 里把所有 @font-face 块整块取出（含 unicode-range）
function blocks(css) {
  const out = [];
  const re = /@font-face\s*\{[^}]*\}/g;
  let m; while ((m = re.exec(css))) out.push(m[0]);
  return out;
}

const summary = [];
for (const spec of fams) {
  const p = parseSpec(spec);
  const q = `family=${encodeURIComponent(p.family).replace(/%20/g, '+')}:wght@${p.weights.join(';')}`;
  const url = `https://fonts.googleapis.com/css2?${q}&display=swap`;
  const css = await get(url);
  const bs = blocks(css);
  if (!bs.length) { console.error(`  ✗ ${p.family}: css2 没有返回 @font-face（族名拼错？）`); continue; }

  const dir = join(FILES, slug(p.family));
  if (!listOnly) mkdirSync(dir, { recursive: true });

  const urls = [...new Set(bs.map(b => (/url\((https:[^)]+\.woff2)\)/.exec(b) || [])[1]).filter(Boolean))];
  let bytes = 0, got = 0, failed = 0;
  const urlMap = new Map();
  const jobs = urls.map(u => {
    const name = /([^/]+\.woff2)$/.exec(u)[1];
    const h = createHash('sha1').update(u).digest('hex').slice(0, 8);
    const fn = h + '-' + name;
    urlMap.set(u, `../files/${slug(p.family)}/${fn}`);
    return { u, name, dest: join(dir, fn) };
  });
  if (!listOnly) {
    const CONC = 8;
    let cursor = 0;
    await Promise.all(Array.from({ length: CONC }, async () => {
      while (cursor < jobs.length) {
        const j = jobs[cursor++];
        if (existsSync(j.dest)) { bytes += statSync(j.dest).size; got++; continue; }
        try { const buf = await get(j.u, false); writeFileSync(j.dest, buf); bytes += buf.length; got++; }
        catch (e) { failed++; console.error(`      ✗ 下载失败 ${j.name}: ${e.message}`); }
      }
    }));
    if (failed) console.error(`      ${p.family}: ${failed} 片失败，请重跑（已下的会跳过）`);
  }

  if (!listOnly) {
    mkdirSync(CSSDIR, { recursive: true });
    const cssOut = bs.map(b => b.replace(/url\((https:[^)]+\.woff2)\)/g, (_, u) => `url('${urlMap.get(u)}')`)).join('\n');
    const key = [slug(p.family), p.weights.join('-')].join('__');
    const header = `/* 自托管字体，由 prototypes/_build/fetch-fonts.mjs 生成，勿手改。\n   族：${p.family}  字重：${p.weights.join('/')}  片数：${bs.length}  实测合计：${(bytes / 1024).toFixed(1)} KB\n   上游：${url} */\n`;
    writeFileSync(join(CSSDIR, key + '.css'), header + cssOut, 'utf8');
    summary.push({ family: p.family, faces: bs.length, files: got, kb: (bytes / 1024).toFixed(1), css: `_fonts/css/${key}.css` });
  } else {
    summary.push({ family: p.family, faces: bs.length, files: urls.length, kb: '—', css: '(未写盘)' });
  }
}

console.log('');
console.log('| 族 | @font-face 片数 | woff2 文件 | 合计 | 样式表 |');
console.log('| --- | --- | --- | --- | --- |');
for (const s of summary) console.log(`| ${s.family} | ${s.faces} | ${s.files} | ${s.kb === '—' ? '—' : s.kb + ' KB'} | \`${s.css}\` |`);
if (!listOnly) console.log('\n缓存目录：' + FILES + '\n样式表目录：' + CSSDIR);
