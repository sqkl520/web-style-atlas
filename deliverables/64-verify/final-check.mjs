// 最终一次性复核快照（记录当前磁盘状态下的全部判定）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const load = (p) => { const c = { window: {} }; vm.createContext(c); vm.runInContext(readFileSync(p, 'utf8'), c); return c.window.SCHEMES; };
const S = load(PROTO + '/_selection/data.js');
const H = load(ROOT + '/deliverables/64-verify/snap/data.js.bak'); // 进场时 = HEAD
const BAN = ['#22D3EE', '#0F172A', '#111111', '#EC4899'];

function styleSurface(dir) {
  const parts = [];
  const css = join(PROTO, dir, 'style.css');
  if (existsSync(css)) parts.push(readFileSync(css, 'utf8'));
  const html = join(PROTO, dir, 'index.html');
  if (existsSync(html)) {
    const t = readFileSync(html, 'utf8');
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(PROTO, dir, 'assets');
  if (existsSync(ad)) for (const f of readdirSync(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  return parts.join('\n');
}
const has = (t, h) => new RegExp(h + '(?![0-9A-Fa-f])', 'i').test(t);

const rows = [];
for (const s of S) {
  const surf = styleSurface(s.dir);
  const css = existsSync(join(PROTO, s.dir, 'style.css')) ? readFileSync(join(PROTO, s.dir, 'style.css'), 'utf8') : '';
  rows.push({
    id: s.id,
    n: s.palette.length,
    palette: s.palette,
    banned: s.palette.filter((h) => BAN.includes(h.toUpperCase())),
    allCss: s.palette.every((h) => has(css, h)),
    allSurf: s.palette.every((h) => has(surf, h)),
    primary: s.primary,
    primaryInPalette: s.palette.some((h) => String(h).toUpperCase() === String(s.primary).toUpperCase()),
  });
}

const out = [];
out.push('=== 1. 30 案 palette 全量 ===');
out.push('id   n  banned   allCss allSurf primaryInPalette  palette');
for (const r of rows) out.push(`${r.id}  ${r.n}  ${r.banned.length ? r.banned.join(',') : '-'}  ${r.allCss ? 'Y' : 'N'}     ${r.allSurf ? 'Y' : 'N'}      ${r.primaryInPalette ? 'Y' : 'N'}              ${r.palette.join(' ')}`);

out.push('');
out.push('=== 2. 任务 A 四个目标色是否已清除 ===');
for (const id of ['S02', 'S12', 'S17', 'S28']) {
  const r = rows.find((x) => x.id === id);
  out.push(`${id}: 现存 banned = ${r.banned.length ? r.banned.join(',') : '无'} ；palette 长度 = ${r.n}`);
}
out.push(`全库仍含 banned 色的案: ${rows.filter((r) => r.banned.length).map((r) => r.id + '(' + r.banned + ')').join(' ') || '无'}`);

out.push('');
out.push('=== 3. palette 长度 / 越界 ===');
const lens = rows.map((r) => r.n);
out.push(`min=${Math.min(...lens)} max=${Math.max(...lens)} 分布=${JSON.stringify(lens.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {}))}`);
out.push(`长度 <2 的案: ${rows.filter((r) => r.n < 2).map((r) => r.id).join(' ') || '无（未被清空/削到 1）'}`);
out.push(`长度 >4 的案: ${rows.filter((r) => r.n > 4).map((r) => r.id).join(' ') || '无'}`);

out.push('');
out.push('=== 4. 与进场时（HEAD）相比的 palette 变化 ===');
let added = [], dropped = [], changed = 0;
for (let i = 0; i < S.length; i++) {
  const o = H[i].palette.map((x) => x.toUpperCase()), n = S[i].palette.map((x) => x.toUpperCase());
  const ad = n.filter((h) => !o.includes(h)), dr = o.filter((h) => !n.includes(h));
  if (!ad.length && !dr.length) continue;
  changed++;
  out.push(`${S[i].id}: -[${dr.join(',') || ''}] +[${ad.join(',') || ''}]`);
  ad.forEach((h) => added.push(S[i].id + h));
  dr.forEach((h) => dropped.push(S[i].id + h));
}
out.push(`变化案数 ${changed}/30；新增项 ${added.length} 个；删除项 ${dropped.length} 个`);

out.push('');
out.push('=== 5. primary 是否仍落在 palette 内 ===');
out.push(rows.filter((r) => !r.primaryInPalette).map((r) => `${r.id}(primary=${r.primary})`).join(' ') || '全部 30 案 primary 都在 palette 内');
export {};
import { writeFileSync } from 'node:fs';
writeFileSync(ROOT + '/deliverables/64-verify/final-check.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
