// 只读原型 v4：px/mm 长度 + %（含 opacity 小数→百分比归一）两类合并，
// 注释命中降级 WARN。验证「能抓 S09/S10/S17 三案、其余零 FAIL」。
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes/';
const sb = { window: {} };
new Function('window', readFileSync(ROOT + '_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;

const MECH_RE = /(?<![\d.])(\d+(?:\.\d+)?)\s*(px|mm|%)(?![\w])/g;

function facts(raw) {
  const noC = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const cmt = [
    ...[...raw.matchAll(/\/\*([\s\S]*?)\*\//g)].map((m) => m[1]),
    ...[...raw.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]),
  ].join('\n');
  const harvest = (t) => {
    const len = new Set(), pct = new Set();
    for (const m of t.matchAll(/(?<![\d.])(\d*\.?\d+)px(?![\w])/g)) len.add(+m[1]);
    for (const m of t.matchAll(/(?<![\d.])(\d*\.?\d+)mm(?![\w])/g)) len.add(+m[1]);
    for (const m of t.matchAll(/stroke-width\s*[:=]\s*["']?(\d*\.?\d+)(?:px)?\s*(?=[;},"'\s])/g)) len.add(+m[1]);
    for (const m of t.matchAll(/\br\s*=\s*["'](\d*\.?\d+)["']/g)) len.add(+m[1]);
    for (const m of t.matchAll(/(?<![\d.])(\d*\.?\d+)%/g)) pct.add(+m[1]);
    // opacity: .14 == 14%
    for (const m of t.matchAll(/opacity\s*:\s*(?:min\(\s*)?(\.\d+|0?\.\d+)/g)) pct.add(Math.round(parseFloat(m[1]) * 1000) / 10);
    return { len, pct };
  };
  return { decl: harvest(noC), comm: harvest(cmt) };
}

const rows = [];
let nLen = 0, nPct = 0, fLen = 0, fPct = 0, wCmt = 0;
for (const s of P.schemes) {
  let raw = '';
  try { raw += readFileSync(ROOT + s.dir + '/style.css', 'utf8'); } catch {}
  try { raw += readFileSync(ROOT + s.dir + '/index.html', 'utf8'); } catch {}
  const { decl, comm } = facts(raw);
  const fail = [], warn = [];
  for (const m of (s.dna.mechanism || '').matchAll(MECH_RE)) {
    const v = parseFloat(m[1]);
    const isPct = m[2] === '%';
    isPct ? nPct++ : nLen++;
    const d = isPct ? decl.pct : decl.len;
    const c = isPct ? comm.pct : comm.len;
    if (d.has(v)) continue;
    if (c.has(v)) { warn.push(m[0].replace(/\s+/g, '')); wCmt++; continue; }
    fail.push(m[0].replace(/\s+/g, ''));
    isPct ? fPct++ : fLen++;
  }
  if (fail.length || warn.length) rows.push({ id: s.id, fail, warn });
}
for (const r of rows.sort((a, b) => b.fail.length - a.fail.length)) {
  console.log(`${r.id}  FAIL=${r.fail.length}  WARN=${r.warn.length}  ${r.fail.join(' ')}${r.warn.length ? '  [仅注释] ' + r.warn.join(' ') : ''}`);
}
console.log(`\n长度 token=${nLen} FAIL=${fLen} | 百分比 token=${nPct} FAIL=${fPct} | 仅注释 WARN=${wCmt}`);
