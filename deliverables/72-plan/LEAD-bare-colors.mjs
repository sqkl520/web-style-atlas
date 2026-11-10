/* BARE 色（在 :root 里、有变量名、但无角色注释）在提示词里怎么呈现？
 * 如果只给 AI「#3A4652（ink-2）」这种变量名，AI 无法判断它的用途。
 */
import { readFileSync } from 'node:fs';

const R = new URL('../../prototypes/', import.meta.url);
const promptSrc = readFileSync(new URL('_selection/prompts.js', R), 'utf8');
const sp = JSON.parse(promptSrc.slice(promptSrc.indexOf('{', promptSrc.indexOf('window.STYLE_PROMPTS'))).replace(/;\s*$/, ''));

const NEG = /反的是|不要|禁止|不采用|旧值|作废|避免|拒绝|而不是|不是/;
function specDeclared(id) {
  let t; try { t = readFileSync(new URL(`_specs/${id}.md`, R), 'utf8'); } catch { return []; }
  const i = t.indexOf('配色系统'); if (i < 0) return [];
  const rest = t.slice(i, i + 1400);
  const endM = rest.slice(5).search(/\n\s*\*?\*?4\.\s/);
  const seg = endM >= 0 ? rest.slice(0, endM + 5) : rest.slice(0, 700);
  const pos = [], neg = [];
  for (const c of seg.split(/[；;。\n]/)) {
    const hs = [...c.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
    if (!hs.length) continue;
    if (NEG.test(c)) neg.push(...hs); else if (/\d+\s*%/.test(c)) pos.push(...hs);
  }
  const ns = new Set(neg);
  return [...new Set(pos)].filter((h) => !ns.has(h));
}
function rootDecls(dir) {
  let css; try { css = readFileSync(new URL(`${dir}/style.css`, R), 'utf8'); } catch { return new Map(); }
  const out = new Map();
  for (const line of css.split('\n')) {
    for (const h of line.match(/#[0-9A-Fa-f]{6}/g) || []) {
      const H = h.toUpperCase();
      if (!out.has(H)) {
        const nm = line.match(/(--[\w-]+)\s*:/);
        const cm = line.match(/\/\*\s*(.*?)\s*\*\//);
        out.set(H, { name: nm ? nm[1] : '', comment: cm ? cm[1] : '' });
      }
    }
  }
  return out;
}

let bareCount = 0;
const samples = [];
for (const s of sp.schemes) {
  const raw = s.dna.palette;
  const pal = String(Array.isArray(raw) ? raw.join('、') : raw).split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
  const spec = specDeclared(s.id);
  const root = rootDecls(s.dir);
  const bares = [];
  for (const it of pal) {
    const hm = it.match(/#[0-9A-Fa-f]{6}/); if (!hm) continue;
    const H = hm[0].toUpperCase();
    if (spec.includes(H)) continue;
    const r = root.get(H);
    if (r && !r.comment) { bares.push({ item: it, H, name: r.name }); bareCount++; }
  }
  if (bares.length) samples.push({ id: s.id, bares });
}

console.log(`BARE 色合计 ${bareCount} 个，涉及 ${samples.length} 案\n`);
for (const s of samples.slice(0, 12)) {
  console.log(`${s.id}  (${s.bares.length} 个):`);
  for (const b of s.bares) console.log(`    提示词里写作「${b.item}」   变量名 ${b.name || '(无)'}`);
}

console.log('\n═══ 对照：这些 BARE 色在 CSS 里真的没有注释吗（抽 3 个看原始行）═══');
for (const s of samples.slice(0, 3)) {
  const b = s.bares[0];
  const css = readFileSync(new URL(`${s.id}*/style.css`.replace('*', ''), R), 'utf8');
  const line = css.split('\n').find((l) => l.toUpperCase().includes(b.H));
  console.log(`  ${s.id} ${b.H}: ${line ? line.trim().slice(0, 150) : '(找不到)'}`);
}
