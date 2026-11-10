// 反面核查：样式面判据把 CSS 注释也算作"用上了"吗？
// 做法：把 style.css 的 /* */ 注释剥掉，再逐 palette 项重查，看有没有只存在于注释里的色。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(PROTO + '/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

const stripCss = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
// HTML 注释也剥（<style> 块之外的注释同样不该算）
const stripHtmlComments = (t) => t.replace(/<!--[\s\S]*?-->/g, '');
const has = (t, h) => new RegExp(h + '(?![0-9A-Fa-f])', 'i').test(t);

function surface(dir, { dropComments }) {
  const parts = [];
  const css = join(PROTO, dir, 'style.css');
  if (existsSync(css)) {
    let t = readFileSync(css, 'utf8');
    if (dropComments) t = stripCss(t);
    parts.push(t);
  }
  const html = join(PROTO, dir, 'index.html');
  if (existsSync(html)) {
    let t = readFileSync(html, 'utf8');
    if (dropComments) t = stripHtmlComments(t);
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(PROTO, dir, 'assets');
  if (existsSync(ad)) for (const f of readdirSync(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  return parts.join('\n');
}

const commentOnly = [];
let total = 0;
for (const s of S) {
  const withC = surface(s.dir, { dropComments: false });
  const noC = surface(s.dir, { dropComments: true });
  for (const h of s.palette) {
    total++;
    const inWith = has(withC, h), inNo = has(noC, h);
    if (inWith && !inNo) commentOnly.push({ id: s.id, hex: h });
  }
}
console.log('palette 总项:', total);
console.log('去掉注释后就不再出现的项（= 只被注释命中）:', commentOnly.length);
for (const x of commentOnly) {
  // 打印注释里的那一行作证据
  const css = readFileSync(join(PROTO, S.find((s) => s.id === x.id).dir, 'style.css'), 'utf8');
  const re = new RegExp('#[0-9A-Fa-f]{6}', 'gi');
  const lines = css.split('\n');
  const hit = lines.find((l) => l.includes(x.hex) && /\/\*/.test(l));
  console.log(`  ${x.id} ${x.hex}  ← 只出现在注释行: ${hit ? hit.trim().slice(0, 110) : '(在 <style>/SVG 注释里)'}`);
}
