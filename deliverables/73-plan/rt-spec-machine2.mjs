// RT 探针 3b：修正版机械可核断言（对付两个假阳性源）
//   假阳性源 ①：S11–S30 的规格把字段名单独成行，值在下一行 —— 按行找「配色系统」只拿到标签本身。
//   假阳性源 ②：字段 3 的**后半句**是「为什么不像 AI 默认配色：反的是 #6366F1 配 #FFFFFF」——
//                那些 hex 是**被否定的**，把它们算成「规格要求的色」会 20/30 案全红，全是假阳性。
// 这正是本仓库 §9.19 / §9.23 记的那类错误。修掉之后再看真实命中率。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

/** 取某字段全文：标签行 + （若标签行没有内容）后续到下一个 **N. 前的所有行 */
function fieldText(lines, label) {
  const i = lines.findIndex((l) => l.includes(label));
  if (i < 0) return '';
  let out = lines[i].replace(/^\s*\*\*\d+\.\s*[^*]*\*\*\s*/, '');
  // S01–S10 的值与标签同行；S11+ 单独成行
  if (out.trim().length < 4) {
    for (let k = i + 1; k < lines.length; k++) {
      if (/^\s*\*\*\d+[.\-]/.test(lines[k]) && k > i + 1) break;
      out += ' ' + lines[k];
    }
  }
  return out;
}

/** 剥掉「为什么不像 AI」「反的是…」「不用…」这类否定从句里的 hex */
function positiveHexes(f3) {
  // 否定从句起点
  const cut = f3.search(/为什么不像|反的是|不用那款|不得使用|禁止|反任何/);
  const pos = cut > 0 ? f3.slice(0, cut) : f3;
  return [...new Set((pos.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase()))];
}

const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const specP = join(P, '_specs', id + '.md');
  const cssP = join(P, dir, 'style.css');
  if (!existsSync(specP) || !existsSync(cssP)) continue;
  const lines = readFileSync(specP, 'utf8').split(/\r?\n/);
  const css = readFileSync(cssP, 'utf8');
  const cssL = css.toLowerCase();

  const f3 = fieldText(lines, '配色系统');
  const f5 = fieldText(lines, '布局与网格');
  const f4 = fieldText(lines, '字体策略');

  const hexes = positiveHexes(f3);
  const hexHit = hexes.filter((h) => cssL.includes(h.toLowerCase()));

  // 栏宽比
  const rm = f5.match(/栏宽比\s*([0-9]+(?:\s*:\s*[0-9]+){2,5})|([0-9]+(?:\s*:\s*[0-9]+){2,5})\s*栏宽比/);
  let ratio = (rm && (rm[1] || rm[2])) ? (rm[1] || rm[2]).replace(/\s/g, '') : null;
  let ratioHit = null;
  if (ratio) {
    const parts = ratio.split(':').map(Number);
    const gtc = [...css.matchAll(/grid-template-columns\s*:\s*([^;}{]+)/g)].map((m) => m[1]);
    ratioHit = gtc.some((g) => {
      const fr = [...g.matchAll(/([\d.]+)fr/g)].map((m) => +m[1]);
      if (fr.length !== parts.length) return false;
      return fr.map((x) => (x / fr[0]).toFixed(2)).join(',') === parts.map((x) => (x / parts[0]).toFixed(2)).join(',');
    });
  }
  // 栏沟
  const gm = f5.match(/栏沟\s*([0-9]+)\s*px|([0-9]+)\s*px[^。；]{0,10}栏沟/);
  const gutter = gm ? +(gm[1] || gm[2]) : null;
  const gutterHit = gutter !== null
    ? new RegExp(`(?:column-)?gap\\s*:[^;{}]*\\b${gutter}px`).test(css) ||
      new RegExp(`grid-column-gap\\s*:\\s*${gutter}px`).test(css) : null;
  // 正文 size / 行高
  const bm = f5.match(/正文\s*([\d.]+)\s*px\s*[／/]\s*行高\s*([\d.]+)/);
  const bodySize = bm ? +bm[1] : null, lh = bm ? +bm[2] : null;
  const bodySizeHit = bodySize !== null ? new RegExp(`font-size\\s*:\\s*${bodySize}px`).test(css) : null;
  const lhHit = lh !== null ? new RegExp(`line-height\\s*:\\s*${lh}\\b`).test(css) : null;
  // 断点
  const bps = [...new Set((f5.match(/([0-9]{3,4})\s*px/g) || []).map((s) => parseInt(s)))]
    .filter((n) => n >= 320 && n <= 1920);
  const mediaBps = [...new Set([...css.matchAll(/@media[^{]*?(\d{3,4})\s*px/g)].map((m) => +m[1]))];
  const bpOk = bps.filter((b) => mediaBps.includes(b));

  // 字体：字段 4 里「＝」后的族名，是否出现在 CSS 的 font-family 里
  const fams = [...f4.matchAll(/[＝=]\s*([A-Za-z][A-Za-z0-9 ._-]{2,30})/g)].map((m) => m[1].trim());
  const famHit = fams.filter((f) => cssL.includes(f.toLowerCase()));

  rows.push({ id, hexes, hexOk: hexHit.length, hexMiss: hexes.filter((h) => !hexHit.includes(h)),
    ratio, ratioHit, gutter, gutterHit, bodySize, bodySizeHit, lh, lhHit,
    bps: bps.join('/'), bpOk: bpOk.length, bpTot: bps.length,
    fams: fams.length, famOk: famHit.length });
}

const pct = (n, d) => d ? `${n}/${d} = ${Math.round(n / d * 100)}%` : '—';
console.log('== 修正后的机械断言（30 案）==\n');
console.log('id   字段3正色  栏宽比   栏沟      正文字号  行高      断点    字体族');
for (const r of rows) {
  const b = (v) => v === null ? ' — ' : (v ? '✔' : '✘');
  console.log(`${r.id}   ${String(r.hexOk + '/' + r.hexes.length).padEnd(9)} ${b(r.ratioHit)}${String(r.ratio || '').padEnd(8)} ${b(r.gutterHit)}${String(r.gutter ?? '').padEnd(6)} ${b(r.bodySizeHit)}${String(r.bodySize ?? '').padEnd(7)} ${b(r.lhHit)}${String(r.lh ?? '').padEnd(7)} ${String(r.bpOk + '/' + r.bpTot).padEnd(6)} ${r.famOk}/${r.fams}`);
}
console.log('\n== 汇总 ==');
console.log(`A 字段3 正向色全部在 CSS 里:      ${pct(rows.filter((r) => r.hexOk === r.hexes.length && r.hexes.length).length, rows.length)}`);
const hm = rows.filter((r) => r.hexMiss.length);
console.log(`  仍有漏色:                        ${hm.length} 案 → ${hm.map((r) => r.id + '[' + r.hexMiss.join(' ') + ']').join(' ') || '无'}`);
const R = rows.filter((r) => r.ratio !== null);
console.log(`B 栏宽比可核 ${R.length} 案，命中 ${R.filter((r) => r.ratioHit).length}  → ${R.filter((r) => !r.ratioHit).map((r) => r.id + '(' + r.ratio + ')').join(' ')}`);
const G = rows.filter((r) => r.gutter !== null);
console.log(`C 栏沟可核   ${G.length} 案，命中 ${G.filter((r) => r.gutterHit).length}  → 未命中 ${G.filter((r) => !r.gutterHit).map((r) => r.id + '(' + r.gutter + 'px)').join(' ')}`);
const B = rows.filter((r) => r.bodySize !== null);
console.log(`D 正文字号可核 ${B.length} 案，命中 ${B.filter((r) => r.bodySizeHit).length} → 未命中 ${B.filter((r) => !r.bodySizeHit).map((r) => r.id + '(' + r.bodySize + 'px)').join(' ')}`);
const L = rows.filter((r) => r.lh !== null);
console.log(`D' 行高可核  ${L.length} 案，命中 ${L.filter((r) => r.lhHit).length} → 未命中 ${L.filter((r) => !r.lhHit).map((r) => r.id + '(' + r.lh + ')').join(' ')}`);
const E = rows.filter((r) => r.bpTot > 0);
console.log(`E 断点可核   ${E.length} 案，全命中 ${E.filter((r) => r.bpOk === r.bpTot).length} 案；至少 1 个 ${E.filter((r) => r.bpOk > 0).length} 案`);
const F = rows.filter((r) => r.fams > 0);
console.log(`F 字体族可核 ${F.length} 案，全命中 ${F.filter((r) => r.famOk === r.fams).length} 案；至少 1 个 ${F.filter((r) => r.famOk > 0).length} 案`);
const total = rows.reduce((a, r) => a + r.hexes.length + (r.ratio !== null) + (r.gutter !== null) + (r.bodySize !== null) + (r.lh !== null) + r.bpTot + r.fams, 0);
console.log(`\n纯机械可核断言总条数: ${total} 条（不含「好不好看」）`);

console.log('\n== 需要人判 / 需要人核的清单（机器先筛出来，人只看这些）==');
for (const r of rows) {
  const bad = [];
  if (r.hexMiss.length) bad.push(`缺色 ${r.hexMiss.join(' ')}`);
  if (r.ratio !== null && !r.ratioHit) bad.push(`栏宽比 ${r.ratio} 无对应列定义`);
  if (r.gutter !== null && !r.gutterHit) bad.push(`栏沟 ${r.gutter}px 未见`);
  if (r.bodySize !== null && !r.bodySizeHit) bad.push(`正文 ${r.bodySize}px 未见`);
  if (r.lh !== null && !r.lhHit) bad.push(`行高 ${r.lh} 未见`);
  if (r.bpTot > 0 && r.bpOk === 0) bad.push(`断点 ${r.bps} 全缺`);
  if (bad.length) console.log(`  ${r.id}: ${bad.join('；')}`);
}
