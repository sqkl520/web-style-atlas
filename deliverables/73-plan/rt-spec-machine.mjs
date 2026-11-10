// RT 探针 3：证明 P3 的「没有客观判据」是错的
// 规格字段 3（色值+面积）与字段 5（栏数/栏沟/基线/字号/行高/断点）都是**纯数字**，
// 全部可以机械核。这里对 30 案逐案做 4 类机械断言，看命中率。
//
// 断言定义（全部来自 _specs/Sxx.md 的原文数字，不是我的发明）：
//   A. 规格字段 3 的 4 个 hex 是否都出现在 style.css（大小写不敏感）
//   B. 规格字段 5 的「栏宽比 a:b:c:d」→ CSS 里是否有对应比例的 grid-template-columns
//   C. 规格字段 5 的「栏沟 Npx」→ CSS 里是否有 Npx 的 gap/column-gap
//   D. 规格字段 5 的「正文 Npx／行高 M」→ CSS 里 body/正文是否有该 size 与行高
//   E. 规格字段 5 的断点像素值 → CSS 里是否有对应 @media
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const specP = join(P, '_specs', id + '.md');
  const cssP = join(P, dir, 'style.css');
  if (!existsSync(specP) || !existsSync(cssP)) { rows.push({ id, skip: true }); continue; }
  const spec = readFileSync(specP, 'utf8');
  const css = readFileSync(cssP, 'utf8');
  const cssL = css.toLowerCase();

  // 字段 3 = 含「配色系统」的那一行
  const f3 = (spec.split(/\r?\n/).find((l) => /配色系统/.test(l)) || '');
  // 字段 5 = 含「布局与网格」的那一行
  const f5 = (spec.split(/\r?\n/).find((l) => /布局与网格/.test(l)) || '');
  // 字段 4 = 字体策略
  const f4 = (spec.split(/\r?\n/).find((l) => /字体策略/.test(l)) || '');

  const hexesP3 = [...new Set((f3.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase()))];
  const hexHit = hexesP3.filter((h) => cssL.includes(h.toLowerCase()));

  // B: 栏宽比
  const ratioM = f5.match(/([0-9]+(?::[0-9]+){2,5})\s*栏宽比|栏宽比\s*([0-9]+(?::[0-9]+){2,5})/);
  let ratio = null, ratioHit = null;
  if (ratioM) {
    ratio = ratioM[1] || ratioM[2];
    const parts = ratio.split(':').map(Number);
    // CSS 里找 grid-template-columns: <n>fr <n>fr ... 同比例
    const gtc = [...css.matchAll(/grid-template-columns\s*:\s*([^;}{]+)/g)].map((m) => m[1]);
    ratioHit = gtc.some((g) => {
      const fr = [...g.matchAll(/([\d.]+)fr/g)].map((m) => +m[1]);
      if (fr.length !== parts.length) return false;
      const s1 = fr.map((x) => x / fr[0]).map((x) => x.toFixed(2)).join(',');
      const s2 = parts.map((x) => x / parts[0]).map((x) => x.toFixed(2)).join(',');
      return s1 === s2;
    });
  }

  // C: 栏沟
  const gutterM = f5.match(/栏沟\s*([0-9]+)px|([0-9]+)px[^。]{0,8}栏沟/);
  let gutter = null, gutterHit = null;
  if (gutterM) {
    gutter = +(gutterM[1] || gutterM[2]);
    gutterHit = new RegExp(`(?:column-)?gap\\s*:[^;]*\\b${gutter}px`).test(css) ||
                new RegExp(`grid-column-gap\\s*:\\s*${gutter}px`).test(css);
  }

  // D: 正文 size / 行高
  const bodyM = f5.match(/正文\s*([\d.]+)px\s*[／/]\s*行高\s*([\d.]+)/);
  let bodySize = null, bodySizeHit = null, lh = null, lhHit = null;
  if (bodyM) {
    bodySize = +bodyM[1]; lh = +bodyM[2];
    bodySizeHit = new RegExp(`font-size\\s*:\\s*${bodySize}px`).test(css);
    lhHit = new RegExp(`line-height\\s*:\\s*${lh}\\b`).test(css);
  }

  // E: 断点
  const bps = [...new Set((f5.match(/([0-9]{3,4})\s*px/g) || []).map((s) => parseInt(s)))].filter((n) => n >= 320 && n <= 1920);
  const mediaBps = [...new Set([...css.matchAll(/@media[^{]*?(\d{3,4})px/g)].map((m) => +m[1]))];
  const bpHit = bps.filter((b) => mediaBps.includes(b));

  rows.push({
    id, nHex: hexesP3.length, hexOk: hexHit.length, hexMiss: hexesP3.filter((h) => !hexHit.includes(h)),
    ratio, ratioHit, gutter, gutterHit,
    bodySize, bodySizeHit, lh, lhHit,
    bps: bps.join('/'), mediaBps: mediaBps.join('/'), bpOk: bpHit.length, bpTot: bps.length,
    hasVar: /:root\s*\{/.test(css),
  });
}

const ok = rows.filter((r) => !r.skip);
const pct = (n, d) => d ? `${n}/${d} = ${Math.round(n / d * 100)}%` : '—';

console.log('== 机械可核断言：30 案命中率 ==\n');
console.log('id   P3色值命中   栏宽比   栏沟    正文字号  行高    断点命中');
for (const r of ok) {
  const b = (v) => v === null ? '  —  ' : (v ? ' ✔ ' : ' ✘ ');
  console.log(`${r.id}  ${String(r.hexOk + '/' + r.nHex).padEnd(10)} ${b(r.ratioHit)}${String(r.ratio || '').padEnd(9)} ${b(r.gutterHit)}${String(r.gutter ?? '').padEnd(5)} ${b(r.bodySizeHit)}${String(r.bodySize ?? '').padEnd(6)} ${b(r.lhHit)}${String(r.lh ?? '').padEnd(5)} ${r.bpOk}/${r.bpTot}`);
}

console.log('\n== 汇总 ==');
console.log(`A 字段3 四个 hex 全部出现在 CSS:            ${pct(ok.filter((r) => r.hexOk === r.nHex && r.nHex > 0).length, ok.length)}`);
console.log(`  字段3 至少漏 1 个 hex:                    ${ok.filter((r) => r.hexMiss.length).length} 案 → ${ok.filter((r) => r.hexMiss.length).map((r) => r.id + '[' + r.hexMiss.join(' ') + ']').join(' ')}`);
const rOk = ok.filter((r) => r.ratio !== null);
console.log(`B 可核栏宽比（规格写了比例的案）:           ${rOk.length} 案，命中 ${rOk.filter((r) => r.ratioHit).length}`);
const gOk = ok.filter((r) => r.gutter !== null);
console.log(`C 可核栏沟:                                ${gOk.length} 案，命中 ${gOk.filter((r) => r.gutterHit).length}`);
const sOk = ok.filter((r) => r.bodySize !== null);
console.log(`D 可核正文字号:                            ${sOk.length} 案，命中 ${sOk.filter((r) => r.bodySizeHit).length}`);
const lOk = ok.filter((r) => r.lh !== null);
console.log(`D' 可核行高:                               ${lOk.length} 案，命中 ${lOk.filter((r) => r.lhHit).length}`);
const bpOk = ok.filter((r) => r.bpTot > 0);
console.log(`E 可核断点:                                ${bpOk.length} 案，至少命中 1 个 ${bpOk.filter((r) => r.bpOk > 0).length} 案`);
console.log(`\n机械可核断言总条数（不是审美判断）:        ${ok.reduce((a, r) => a + r.nHex + (r.ratio !== null) + (r.gutter !== null) + (r.bodySize !== null) + (r.lh !== null) + r.bpTot, 0)} 条`);

console.log('\n== 明确的「规格写了、CSS 没有」清单（= P3 应该找的东西，且无需审美判断）==');
for (const r of ok) {
  const bad = [];
  if (r.hexMiss.length) bad.push(`缺色 ${r.hexMiss.join(' ')}`);
  if (r.ratio !== null && !r.ratioHit) bad.push(`栏宽比 ${r.ratio} 无对应 grid-template-columns`);
  if (r.gutter !== null && !r.gutterHit) bad.push(`栏沟 ${r.gutter}px 未见`);
  if (r.bodySize !== null && !r.bodySizeHit) bad.push(`正文 ${r.bodySize}px 未见`);
  if (r.lh !== null && !r.lhHit) bad.push(`行高 ${r.lh} 未见`);
  if (r.bpTot > 0 && r.bpOk === 0) bad.push(`断点 ${r.bps} 全未出现在 @media`);
  if (bad.length) console.log(`  ${r.id}: ${bad.join('；')}`);
}
