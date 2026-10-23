#!/usr/bin/env node
// 复用件（`reuse-sXX-<文件>`）署名回填的**分析器**：
// 扫全库 `assets/credits*.json` 里的 `reuse-*` 行，剥掉前缀后拿文件名去**源案**的
// credits 记录里按 `file`/`filename`/`raw` 的 basename 精确匹配，报告哪些行能从源案取回
// `artist/license/page/source/creator/licenseUrl`。
//
// 来历：37 号 T0-1 需要"补齐 10 行精确匹配署名"。37 号自己写的是**只读分析**，
// **它不写回任何 credits.json / CREDITS.md**（原版唯一的写入是 stdout 与一个 scratch json）。
// 所以这个脚本的作用是**给出那 10 行的清单与可取字段**，写回是另一步（见 --print-rows）。
//
//   node prototypes/_build/backfill-credits.mjs            # 打印报告
//   node prototypes/_build/backfill-credits.mjs --json      # 同时把明细打到 stdout（不落盘）
//   node prototypes/_build/backfill-credits.mjs --out <路径> # 明细写到指定文件
//
// ⚠️ 本脚本**不改任何交付物**：全库只读，默认不写文件。
import fs from 'node:fs';
import path from 'node:path';

// 仓库根由脚本自身位置推得（模板 = check-stale.mjs:16；含 Windows 盘符修正与 39 §3-N10 的 decodeURIComponent）。
// 37 号原版把 PROTO 写死成作者机绝对路径，clone 者跑不了——那正是它必须进 _build 的理由。
const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const PROTO = path.join(ROOT, 'prototypes');

// credits.json 有两种编码（UTF-8 带 BOM / PowerShell 留下的 UTF-16LE BOM），都要能吃。
function readLoose(p) {
  const b = fs.readFileSync(p);
  if (b.length >= 2 && b[0] === 0xFF && b[1] === 0xFE) return b.toString('utf16le').replace(/^\uFEFF/, '');
  return b.toString('utf8').replace(/^\uFEFF/, '');
}
function allCreds(schemeDir) {
  const base = path.join(PROTO, schemeDir);
  const cands = [];
  const push = (p) => { if (fs.existsSync(p)) cands.push(p); };
  const ad = path.join(base, 'assets');
  if (fs.existsSync(ad)) for (const f of fs.readdirSync(ad)) if (/^credits.*\.json$/i.test(f)) push(path.join(ad, f));
  // build/ 下这几条在**被 .gitignore 忽略的目录**里（prototypes/*/build/）；clone 者跑到这里只会少命中，不会报错。
  for (const sub of ['build/raw/credits.json', 'build/raw-s01/credits.json', 'build/credits.json', 'build/raw/credits-raw.json', 'build/raw/credits.fetch.json']) push(path.join(base, sub));
  const rows = [];
  for (const p of cands) {
    let o; try { o = JSON.parse(readLoose(p)); } catch { continue; }
    const arr = Array.isArray(o) ? o : (o.images || []).concat(o.textures || [], o.fonts || []);
    for (const r of arr) if (r && typeof r === 'object') rows.push({ _from: path.relative(PROTO, p).replace(/\\/g, '/'), ...r });
  }
  return rows;
}
const cases = fs.readdirSync(PROTO, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d\d-/.test(d.name)).map((d) => d.name).sort();
const byId = {}; for (const c of cases) byId[c.slice(0, 3)] = c;

const out = [];
for (const c of cases) {
  const ad = path.join(PROTO, c, 'assets');
  if (!fs.existsSync(ad)) continue;
  for (const f of fs.readdirSync(ad)) {
    if (!/^credits.*\.json$/i.test(f)) continue;
    let o; try { o = JSON.parse(readLoose(path.join(ad, f))); } catch { continue; }
    if (!Array.isArray(o)) continue;
    for (const r of o) {
      const file = String(r.file || '');
      if (!/^reuse-/.test(file)) continue;
      const m = file.match(/^reuse-(s\d\d)-(.*)$/i);
      const srcId = m ? m[1].toUpperCase() : null;
      let stem = file.replace(/^reuse-(s\d\d)-/i, '');
      const hops = [srcId];
      while (/^reuse-(s\d\d)-/i.test(stem)) { const mm = stem.match(/^reuse-(s\d\d)-/i); hops.push(mm[1].toUpperCase()); stem = stem.replace(/^reuse-(s\d\d)-/i, ''); }
      const rows = srcId && byId[srcId] ? allCreds(byId[srcId]) : [];
      const hit = rows.find((x) => {
        const k = [x.file, x.filename, x.raw].filter(Boolean).map((s) => String(s).replace(/\\/g, '/').split('/').pop());
        return k.includes(stem) || k.includes(stem.replace(/\.(jpe?g|png|webp)$/i, ''));
      });
      const fields = hit ? ['title', 'artist', 'license', 'page', 'source', 'original', 'creator', 'licenseUrl'].filter((k) => hit[k] && String(hit[k]).trim()) : [];
      out.push({ case: c.slice(0, 3), caseDir: c, mdFile: f, file, srcId, stem, hops: hops.join('>'), srcCase: srcId ? byId[srcId] : '(缺)', hitRow: hit ? hit._from : null, hitFields: fields, values: hit ? Object.fromEntries(fields.map((k) => [k, String(hit[k])])) : {}, lic: r.license, artist: r.artist, page: r.page || r.source || '' });
    }
  }
}
const bad = out.filter((o) => /见来源页/.test(String(o.lic)) || !String(o.lic || '').trim() || !o.page);
const fixable = bad.filter((o) => o.hitRow);

console.log(`全库 reuse-* 行 ${out.length} 条｜其中许可或来源有缺 ${bad.length} 条｜源案能精确命中（可回填）${fixable.length} 条｜命中不了 ${bad.length - fixable.length} 条`);
console.log(`注：命中数依赖 prototypes/*/build/ 下的 credits*.json，而那个目录被 .gitignore 排除——`);
console.log(`    clone 者跑本脚本时命中数会比作者机**少**（本机实测 build/ 在盘 ⇒ ${fixable.length} 条）。\n`);
console.log('案 | 文件 | 源案链 | 命中的源行 | 可取字段');
for (const o of fixable) console.log(`  ${o.case} | ${o.file} | ${o.hops} | ${o.hitRow} | ${o.hitFields.join(',')}`);
console.log('\n不可回填（源案查不到这条记录）:');
for (const o of bad.filter((x) => !x.hitRow)) console.log(`  ${o.case} | ${o.file} | 源案 ${o.srcCase} | 现状 lic=${o.lic}`);
console.log('\n逐案计数（可回填/有缺）:');
const bc = {}, bh = {};
for (const o of bad) bc[o.case] = (bc[o.case] || 0) + 1;
for (const o of fixable) bh[o.case] = (bh[o.case] || 0) + 1;
for (const k of Object.keys(bc).sort()) console.log(`  ${k}: ${bh[k] || 0}/${bc[k]}`);

if (process.argv.includes('--json') || process.argv.includes('--out')) {
  const payload = JSON.stringify(out, null, 1);
  const oi = process.argv.indexOf('--out');
  if (oi !== -1 && process.argv[oi + 1]) {
    const dest = path.resolve(ROOT, process.argv[oi + 1]);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, payload, 'utf8');
    console.log(`\n明细已写 ${path.relative(ROOT, dest)}`);
  } else {
    console.log('\n----- JSON -----\n' + payload);
  }
}
