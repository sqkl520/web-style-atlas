/* 33 个 BARE 色逐个取证：它们在 style.css / index.html 里到底怎么用的？
 *
 * 判据：一个色如果只出现 1–2 次，且是「文字色 / 边框 / 状态」，那它是派生必需；
 *       如果它出现在 :root 之外并且没有注释，提示词给的「角色名」就是猜的。
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
  const e = rest.slice(5).search(/\n\s*\*?\*?4\.\s/);
  const seg = e >= 0 ? rest.slice(0, e + 5) : rest.slice(0, 700);
  const pos = [], neg = [];
  for (const c of seg.split(/[；;。\n]/)) {
    const hs = [...c.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0].toUpperCase());
    if (!hs.length) continue;
    if (NEG.test(c)) neg.push(...hs); else if (/\d+\s*%/.test(c)) pos.push(...hs);
  }
  const ns = new Set(neg);
  return [...new Set(pos)].filter((h) => !ns.has(h));
}

const rows = [];
for (const s of sp.schemes) {
  const raw = s.dna.palette;
  const pal = String(Array.isArray(raw) ? raw.join('、') : raw).split(/[、,，]/).map((x) => x.trim()).filter(Boolean);
  const spec = specDeclared(s.id);

  let css = '', html = '';
  try { css = readFileSync(new URL(`${s.dir}/style.css`, R), 'utf8'); } catch {}
  try { html = readFileSync(new URL(`${s.dir}/index.html`, R), 'utf8'); } catch {}

  for (const it of pal) {
    const hm = it.match(/#[0-9A-Fa-f]{6}/); if (!hm) continue;
    const H = hm[0].toUpperCase();
    if (spec.includes(H)) continue;

    const inRoot = /:root\s*\{[\s\S]*?\}/.test(css) &&
      (css.match(/:root\s*\{[\s\S]*?\}/) || [''])[0].toUpperCase().includes(H);

    // CSS 正文里用到该色的行（排除 :root 块）
    const rootBlock = (css.match(/:root\s*\{[\s\S]*?\}/) || [''])[0];
    const bodyLines = css.split('\n').filter((l) => l.toUpperCase().includes(H) && !rootBlock.split('\n').includes(l));
    const htmlLines = html.split('\n').filter((l) => l.toUpperCase().includes(H));

    const role = String(it).replace(/#[0-9A-Fa-f]{6}/, '').replace(/[（）()]/g, '').trim();
    rows.push({ id: s.id, H, role, inRoot, nBody: bodyLines.length, nHtml: htmlLines.length, sample: (bodyLines[0] || htmlLines[0] || '').trim().slice(0, 110) });
  }
}

console.log(`BARE 色共 ${rows.length} 个\n`);
console.log('案   色        提示词角色      在:root  正文行  HTML行  取证');
console.log('─'.repeat(112));
for (const r of rows) {
  console.log(`${r.id}  ${r.H}  ${(r.role || '(无角色名)').padEnd(12)}  ${(r.inRoot ? '是' : '否').padEnd(6)}  ${String(r.nBody).padStart(4)}   ${String(r.nHtml).padStart(4)}   ${r.sample.slice(0, 46)}`);
}

const noRoot = rows.filter((r) => !r.inRoot).length;
const noRole = rows.filter((r) => !r.role).length;
console.log(`\n不在 :root 的: ${noRoot}/${rows.length}   提示词没给角色名的: ${noRole}/${rows.length}`);
