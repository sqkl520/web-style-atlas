/* 把 prompts.js 每个调色板条目分成四类，判定「有多少色是没有出处的」。
 *
 *   ① SPEC    规格字段 3 里声明的（有面积百分比的那些）
 *   ② ROOT    在 style.css :root 里声明，且行尾有角色注释
 *   ③ BARE    在 :root 里声明，但没有角色注释（只有变量名）
 *   ④ PHANTOM 规格里没有、:root 里也没有 —— 最可疑：它是 pickPalette 从别处捡的
 *
 * 判据要点：规格字段 3 里有负向示例（「反的是 #6366F1」），必须排除。
 */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const promptSrc = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(promptSrc.slice(promptSrc.indexOf('{', promptSrc.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

const NEG = /反的是|不要|禁止|不采用|旧值|作废|避免|拒绝|而不是|不是/;

/** 规格字段 3：取「配色系统」段，按 ；/。/换行 切句，句内含否定词则丢弃 */
function specDeclared(id) {
  let t;
  try { t = readFileSync(new URL(`_specs/${id}.md`, R), 'utf8'); } catch { return { pos: [], neg: [] }; }
  const i = t.indexOf('配色系统');
  if (i < 0) return { pos: [], neg: [] };
  // 字段 3 的终点：下一个「**4.」或「4. **」
  const rest = t.slice(i, i + 1400);
  const endM = rest.slice(5).search(/\n\s*\*?\*?4\.\s/);
  const seg = endM >= 0 ? rest.slice(0, endM + 5) : rest.slice(0, 700);

  const pos = [], neg = [];
  for (const clause of seg.split(/[；;。\n]/)) {
    const hexes = [...clause.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
    if (!hexes.length) continue;
    if (NEG.test(clause)) neg.push(...hexes);
    else if (/\d+\s*%/.test(clause)) pos.push(...hexes);
  }
  const negSet = new Set(neg);
  return { pos: [...new Set(pos)].filter((h) => !negSet.has(h)), neg: [...new Set(neg)] };
}

/** style.css 的 :root 声明：hex -> 角色注释（剥掉注释尾符与空白） */
function rootDecls(id, dir) {
  let css;
  try { css = readFileSync(new URL(`${dir}/style.css`, R), 'utf8'); } catch { return new Map(); }
  const out = new Map();
  for (const line of css.split('\n')) {
    const m = line.match(/(#[0-9A-Fa-f]{6})/g);
    if (!m) continue;
    const nm = line.match(/(--[\w-]+)\s*:/);
    const cm = line.match(/\/\*\s*(.*?)\s*\*\//);
    for (const h of m) {
      const H = h.toUpperCase();
      if (!out.has(H)) out.set(H, { name: nm ? nm[1] : '', comment: cm ? cm[1] : '' });
    }
  }
  return out;
}

const tally = { SPEC: 0, ROOT: 0, BARE: 0, PHANTOM: 0 };
const phantoms = [];

for (const s of sp.schemes) {
  const rawPal = s.dna.palette;
  const pal = (Array.isArray(rawPal)
    ? rawPal
    : String(rawPal || '').split(/[、,，]/)
  ).map((x) => String(x).trim()).filter(Boolean);
  const spec = specDeclared(s.id);
  const root = rootDecls(s.id, s.dir);
  const rows = [];
  for (const item of pal) {
    const hm = item.match(/#[0-9A-Fa-f]{6}/);
    if (!hm) continue;
    const H = hm[0].toUpperCase();
    let kind;
    if (spec.pos.includes(H)) kind = 'SPEC';
    else if (root.has(H) && root.get(H).comment) kind = 'ROOT';
    else if (root.has(H)) kind = 'BARE';
    else kind = 'PHANTOM';
    tally[kind]++;
    const r = root.get(H);
    rows.push({ H, kind, name: r ? r.name : '', comment: r ? r.comment.slice(0, 60) : '' });
    if (kind === 'PHANTOM') phantoms.push({ id: s.id, H });
  }
  const bad = rows.filter((r) => r.kind === 'PHANTOM');
  if (bad.length) {
    console.log(`\n${s.id}  调色板 ${rows.length} 色，其中 PHANTOM ${bad.length}:`);
    for (const b of bad) console.log(`   ${b.H}  (规格未声明 / :root 未声明)`);
  }
}

console.log('\n═══ 汇总 ═══');
const total = Object.values(tally).reduce((a, b) => a + b, 0);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(8)} ${String(v).padStart(3)}  ${(v / total * 100).toFixed(1)}%`);
console.log(`  合计     ${total}`);
