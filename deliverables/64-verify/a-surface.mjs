// 路线 A 反面：样式面（style.css ∪ index.html <style>/style=/SVG 属性 ∪ assets/*.svg）逐 hex 核查
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(PROTO, '_selection/data.js'), 'utf8'), ctx);
const SCHEMES = ctx.window.SCHEMES;

function styleSurface(dir) {
  const parts = [];
  const css = join(PROTO, dir, 'style.css');
  if (existsSync(css)) parts.push(readFileSync(css, 'utf8'));
  const html = join(PROTO, dir, 'index.html');
  if (existsSync(html)) {
    const t = readFileSync(html, 'utf8');
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*'([^']*)'/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color|flood-color|color|lighting-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(PROTO, dir, 'assets');
  if (existsSync(ad)) for (const f of readdirSync(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  return parts.join('\n');
}
function cssOnly(dir) {
  const p = join(PROTO, dir, 'style.css');
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}
const inText = (t, h) => new RegExp(h + '(?![0-9A-Fa-f])', 'i').test(t);

const rows = [];
for (const sc of SCHEMES) {
  const surf = styleSurface(sc.dir);
  const css = cssOnly(sc.dir);
  const per = sc.palette.map((h) => ({ h, css: inText(css, h), surf: inText(surf, h) }));
  rows.push({ id: sc.id, per });
}
const notCss = [], notSurf = [];
for (const r of rows) {
  for (const x of r.per) {
    if (!x.css) notCss.push(`${r.id}${x.h}${x.surf ? '(在样式面其他处命中)' : '(样式面也没有)'}`);
    if (!x.surf) notSurf.push(`${r.id}${x.h}`);
  }
}
console.log('总 palette 项:', rows.reduce((a, r) => a + r.per.length, 0));
console.log('\n不在 style.css 的项（' + notCss.length + '）:\n  ' + (notCss.join('\n  ') || '无'));
console.log('\n不在样式面（含内联/SVG/assets）的项（' + notSurf.length + '）:\n  ' + (notSurf.join('\n  ') || '无'));
// 只靠内联/SVG 救回来的项
const onlyInline = [];
for (const r of rows) for (const x of r.per) if (!x.css && x.surf) onlyInline.push(`${r.id} ${x.h}`);
console.log('\n只在内联/SVG 里出现、style.css 没有的项（' + onlyInline.length + '）: ' + onlyInline.join(' ') );
// palette 长度分布
const lens = SCHEMES.map((s) => s.palette.length);
console.log('\npalette 长度: min', Math.min(...lens), 'max', Math.max(...lens), '长度=2 的案:', SCHEMES.filter(s=>s.palette.length===2).map(s=>s.id).join(','));
