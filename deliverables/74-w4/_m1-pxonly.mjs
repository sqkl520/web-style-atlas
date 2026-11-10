// 只读原型 v3：只检查「长度类」值（px / mm / 无单位 SVG 长度）。
// 这是 §5 推荐的**最小可上线范围**。目标：抓 S10(1px) 与 S17(96px)，其余 28 案零红。
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes/';
const sb = { window: {} };
new Function('window', readFileSync(ROOT + '_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;

const MECH_RE = /(?<![\d.])(\d+(?:\.\d+)?)\s*(px|mm)(?![\w])/g;

function facts(raw) {
  const noC = raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  const cmt = [
    ...[...raw.matchAll(/\/\*([\s\S]*?)\*\//g)].map((m) => m[1]),
    ...[...raw.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]),
  ].join('\n');
  const harvest = (t) => {
    const out = new Set();
    for (const m of t.matchAll(/(?<![\d.])(\d*\.?\d+)px(?![\w])/g)) out.add(+m[1]);
    for (const m of t.matchAll(/(?<![\d.])(\d*\.?\d+)mm(?![\w])/g)) out.add(+m[1]);
    // SVG/CSS 无单位：stroke-width: N ; r="N"
    for (const m of t.matchAll(/stroke-width\s*[:=]\s*["']?(\d*\.?\d+)(?:px)?\s*(?=[;},"'])/g)) out.add(+m[1]);
    for (const m of t.matchAll(/\br\s*=\s*["'](\d*\.?\d+)["']/g)) out.add(+m[1]);
    // 小数简写 .5px 已被上面覆盖；补充 0.5 与 .5 等值
    return out;
  };
  return { decl: harvest(noC), comm: harvest(cmt) };
}

const rows = [];
let totTok = 0, totFail = 0, totWarn = 0;
for (const s of P.schemes) {
  let raw = '';
  try { raw += readFileSync(ROOT + s.dir + '/style.css', 'utf8'); } catch {}
  try { raw += readFileSync(ROOT + s.dir + '/index.html', 'utf8'); } catch {}
  const { decl, comm } = facts(raw);
  const toks = [...(s.dna.mechanism || '').matchAll(MECH_RE)].map((m) => m[0].replace(/\s+/g, ''));
  const fail = [], warn = [];
  for (const t of toks) {
    const m = t.match(/^([\d.]+)(.*)$/);
    const v = parseFloat(m[1]);
    if (decl.has(v)) continue;
    if (comm.has(v)) { warn.push(t); continue; }
    fail.push(t);
  }
  totTok += toks.length; totFail += fail.length; totWarn += warn.length;
  if (fail.length || warn.length) rows.push({ id: s.id, n: toks.length, fail, warn });
}
for (const r of rows.sort((a, b) => b.fail.length - a.fail.length)) {
  console.log(`${r.id}  tok=${String(r.n).padStart(2)}  FAIL=${r.fail.length}  WARN=${r.warn.length}  ${r.fail.join(' ')}${r.warn.length ? '  [仅注释] ' + r.warn.join(' ') : ''}`);
}
console.log(`\nTOTAL 长度 token=${totTok}  FAIL=${totFail}  WARN(仅注释)=${totWarn}`);
