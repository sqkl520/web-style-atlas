// 路线 A：palette 正反面全量核查
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const dataSrc = readFileSync(join(PROTO, '_selection/data.js'), 'utf8');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(dataSrc, ctx);
const SCHEMES = ctx.window.SCHEMES;
console.log('SCHEMES count:', SCHEMES.length);

const BAN = ['#22D3EE', '#0F172A', '#111111', '#EC4899'];
const TARGET = ['S02', 'S12', 'S17', 'S28'];

// 读取每案 style.css + index.html + spec
function readCase(id) {
  const sc = SCHEMES.find((s) => s.id === id);
  return sc;
}
function cssText(dir) {
  const p = join(PROTO, dir, 'style.css');
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}
function htmlText(dir) {
  const p = join(PROTO, dir, 'index.html');
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}
// 递归收集 proto 目录下所有文件文本（用于判断 hex 是否"存在于案内任何地方"）
import { statSync } from 'node:fs';
function allText(dir, depth = 0) {
  const base = join(PROTO, dir);
  let out = '';
  if (!existsSync(base) || depth > 3) return out;
  for (const e of readdirSync(base, { withFileTypes: true })) {
    const p = join(base, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      out += allText(join(dir, e.name), depth + 1);
    } else {
      const st = statSync(p);
      if (st.size > 2_000_000) continue;
      if (/\.(jpg|jpeg|png|webp|avif|woff2?|ttf|otf|gif|mp4|pdf)$/i.test(e.name)) continue;
      try { out += readFileSync(p, 'utf8'); } catch {}
    }
  }
  return out;
}

const rows = [];
let fail4 = [], shortPal = [], notInCss = [], notAnywhere = [];
for (const sc of SCHEMES) {
  const css = cssText(sc.dir);
  const html = htmlText(sc.dir);
  const anyText = allText(sc.dir);
  const cssUpper = (css + '\n' + html).toUpperCase();
  const anyUpper = anyText.toUpperCase();
  const pal = sc.palette || [];
  const banned = pal.filter((h) => BAN.includes(h.toUpperCase()));
  const inCss = pal.map((h) => cssUpper.includes(h.toUpperCase()));
  const inAny = pal.map((h) => anyUpper.includes(h.toUpperCase()));
  const missingCss = pal.filter((h, i) => !inCss[i]);
  const missingAny = pal.filter((h, i) => !inAny[i]);
  if (TARGET.includes(sc.id) && banned.length) fail4.push({ id: sc.id, banned });
  if (pal.length < 2) shortPal.push({ id: sc.id, len: pal.length, pal });
  if (missingCss.length) notInCss.push({ id: sc.id, len: pal.length, missing: missingCss });
  if (missingAny.length) notAnywhere.push({ id: sc.id, missing: missingAny });
  rows.push({
    id: sc.id,
    n: pal.length,
    pal,
    banned,
    inCssAll: missingCss.length === 0,
    missingCss,
    inAnyAll: missingAny.length === 0,
    missingAny,
    primary: sc.primary,
    primaryFirst: pal.length ? (String(sc.primary).toUpperCase() === String(pal[0]).toUpperCase()) : null,
  });
}
import { writeFileSync } from 'node:fs';
writeFileSync(join(ROOT, 'deliverables/64-verify/a-palette.json'), JSON.stringify({ fail4, shortPal, notInCss, notAnywhere, rows }, null, 1));
const p = (s) => s.padEnd(16);
console.log(p('id') + p('len') + p('inCss') + p('inAnywhere') + p('primary==first') + 'palette');
for (const r of rows) {
  console.log(p(r.id) + p(String(r.n)) + p(r.inCssAll ? 'YES' : 'NO ' + r.missingCss.join(',')) + p(r.inAnyAll ? 'YES' : 'NO ' + r.missingAny.join(',')) + p(String(r.primaryFirst)) + r.pal.join(' '));
}
console.log('\nTARGET4 banned remain:', JSON.stringify(fail4));
console.log('palette<2:', JSON.stringify(shortPal));
console.log('not in css:', JSON.stringify(notInCss));
console.log('not anywhere in case dir:', JSON.stringify(notAnywhere));
