// RT 探针 4：给 P3 的「机械可核」做**诚实的可行性测试**
//
// 上一版（rt-spec-machine2）把「栏沟未命中」报了 6 案，其中 S03 的规格是 20px、
// CSS 里 `--gutter: 20px` 明明写着 —— 是我的探针只认字面 `gap: 20px`、
// 不认 `gap: calc(var(--u) * 3)` 与 `--gutter` 变量造成的**假阳性**。
// （这正是本仓库 §9.23「量具本身坏掉」的同型错误。）
//
// 本探针做两件事：
//   ① 解析 CSS 自定义属性 + 一层 calc，再做栏沟/正文/行高比对；
//   ② 用**契约 §9.11 已经认账的真偏离（S01 正文 16px/28px 而非规格的 15px/1.75）**
//      做校准：探针必须先把这个已知真缺陷找出来，它的其它命中才可信。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P = join(ROOT, 'prototypes');
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

function fieldText(lines, label) {
  const i = lines.findIndex((l) => l.includes(label));
  if (i < 0) return '';
  let out = lines[i].replace(/^\s*\*\*\d+\.\s*[^*]*\*\*\s*/, '');
  if (out.trim().length < 4) {
    for (let k = i + 1; k < lines.length; k++) {
      if (/^\s*\*\*\d+[.\-]/.test(lines[k]) && k > i + 1) break;
      out += ' ' + lines[k];
    }
  }
  return out;
}

/** 解析 :root / 任一块里的 --var: Npx */
function cssVars(css) {
  const m = new Map();
  for (const d of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    const v = d[2].trim();
    /* 存**带单位**的字符串，不要存 parseFloat —— 上一版存了 16（丢单位），
       evalLen 替换 var() 之后拿到 "16"，再判 /^-?[\d.]+px$/ 就判不出，
       于是 S01 的 --fs-body: 16px 被读成「读不到」。§9.23 第三次同型。 */
    if (/^-?[\d.]+px$/.test(v)) m.set(d[1], v);
  }
  return m;
}

/** 把 calc(var(--x) * n) / calc(var(--x) + npx) 求值；纯字面也求值 */
function evalLen(expr, vars) {
  if (expr == null) return null;
  let e = String(expr).trim();
  e = e.replace(/var\((--[\w-]+)\)/g, (_, n) => (vars.has(n) ? vars.get(n) : 'NaN'));
  e = e.trim();
  /* 先替换再判字面量：原版是反过来的，于是 `var(--fs-body)` → `16px` 之后
     又被丢进 calc 分支判成 null。这正是 §9.23「量具本身坏掉」——
     它会把 S01 的真实 16px 读成「读不到」，从而漏掉契约 §9.11 已认账的真偏离。 */
  if (/^-?[\d.]+px$/.test(e)) return parseFloat(e);
  if (/^NaN/.test(e)) return null;
  const cm = e.match(/^calc\(\s*(-?[\d.]+)(px)?\s*([*+])\s*(-?[\d.]+)(px)?\s*\)$/);
  if (cm) {
    const a = parseFloat(cm[1]), op = cm[3], b = parseFloat(cm[4]);
    return op === '*' ? a * b : a + b;
  }
  return null;
}

const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const specP = join(P, '_specs', id + '.md');
  const cssP = join(P, dir, 'style.css');
  if (!existsSync(specP) || !existsSync(cssP)) continue;
  const lines = readFileSync(specP, 'utf8').split(/\r?\n/);
  const css = readFileSync(cssP, 'utf8');
  const vars = cssVars(css);
  const f5 = fieldText(lines, '布局与网格');

  // ── 栏沟：规格里「Npx 栏沟」或「Npx … 栏沟」
  let specGutter = null;
  const g1 = f5.match(/([0-9]+)\s*px\s*栏沟/);
  const g2 = f5.match(/栏沟\s*([0-9]+)\s*px/);
  if (g1) specGutter = +g1[1]; else if (g2) specGutter = +g2[1];

  // CSS 侧：所有 gap / column-gap 求值 + 所有 --*gutter* / --*gap* 变量
  const gapVals = new Set();
  for (const m of css.matchAll(/(?:^|[^-\w])(?:column-)?gap\s*:\s*([^;{}]+);/g)) {
    for (const part of m[1].split(/\s+/)) {
      const v = evalLen(part, vars); if (v != null) gapVals.add(Math.round(v * 100) / 100);
    }
  }
  for (const [k, v] of vars) if (/gutter|gap|colgap/i.test(k)) gapVals.add(v);
  const gutterHit = specGutter === null ? null : gapVals.has(specGutter);

  // ── 正文 size / 行高
  const bm = f5.match(/正文\s*([\d.]+)\s*px\s*[／/]\s*行高\s*([\d.]+)/);
  const specSize = bm ? +bm[1] : null, specLh = bm ? +bm[2] : null;
  // CSS 侧：body 本身的 font-size / line-height（解析变量）
  const bodyRule = (css.match(/(?:^|\n)\s*body\s*\{([^}]*)\}/) || [])[1] || '';
  const fsM = bodyRule.match(/font-size\s*:\s*([^;]+);/);
  const lhM = bodyRule.match(/line-height\s*:\s*([^;]+);/);
  const cssSize = fsM ? evalLen(fsM[1], vars) : null;
  const cssLhRaw = lhM ? lhM[1].trim() : null;
  const cssLhPx = lhM ? evalLen(cssLhRaw, vars) : null;
  const cssLhRatio = cssLhRaw && /^[\d.]+$/.test(cssLhRaw) ? parseFloat(cssLhRaw) : null;

  // 判定：行高 = 规格比值 × 规格字号（容许 ±0.5px）
  let lhVerdict = null;
  if (specSize && specLh) {
    const want = specSize * specLh;
    if (cssLhRatio != null) lhVerdict = Math.abs(cssLhRatio - specLh) < 0.02 ? 'ok' : `比值 ${cssLhRatio} ≠ ${specLh}`;
    else if (cssLhPx != null) lhVerdict = Math.abs(cssLhPx - want) <= 0.5 ? 'ok' : `实高 ${cssLhPx}px ≠ 规格 ${specSize}×${specLh}=${want.toFixed(2)}px`;
  }
  const sizeHit = specSize === null ? null : (cssSize != null ? Math.abs(cssSize - specSize) < 0.01 : null);

  rows.push({ id, specGutter, gutterHit, gapVals: [...gapVals].slice(0, 6).join('/'),
    specSize, cssSize, sizeHit, specLh, cssLhRaw, cssLhPx, lhVerdict });
}

console.log('== 校准：探针能否抓出契约 §9.11 已认账的 S01 真偏离 ==');
const s01 = rows.find((r) => r.id === 'S01');
console.log(`  S01 规格 正文 ${s01.specSize}px／行高 ${s01.specLh}；CSS body ${s01.cssSize}px / line-height ${s01.cssLhRaw}`);
console.log(`  → 字号判定 ${s01.sizeHit === false ? '✘ 不符（16≠15）' : '✔'}；行高判定 ${s01.lhVerdict}`);
console.log(`  契约 §9.11 原文：「正文 16px/28px 而规格冻结 15px/1.75」`);
console.log(`  ⇒ 探针与人工结论一致？ ${s01.sizeHit === false && s01.lhVerdict && s01.lhVerdict !== 'ok' ? '是（校准通过）' : '否（探针不可信）'}`);

console.log('\n== 正文/行高：全部可核案 ==');
console.log('id  规格字号  CSS字号  字号  规格行高  CSS行高        行高判定');
for (const r of rows) {
  if (r.specSize === null) continue;
  console.log(`${r.id}   ${String(r.specSize).padEnd(7)} ${String(r.cssSize ?? '—').padEnd(8)} ${(r.sizeHit ? '✔' : '✘').padEnd(4)} ${String(r.specLh).padEnd(8)} ${String(r.cssLhRaw ?? '—').padEnd(14)} ${r.lhVerdict}`);
}

console.log('\n== 栏沟（解析变量后）==');
for (const r of rows) {
  if (r.specGutter === null) continue;
  console.log(`  ${r.id}  规格 ${String(r.specGutter).padEnd(4)}px  判定 ${r.gutterHit ? '✔ 命中' : '✘ 未命中'}   CSS 候选: ${r.gapVals}`);
}

const G = rows.filter((r) => r.specGutter !== null);
const S = rows.filter((r) => r.specSize !== null);
console.log('\n== 汇总 ==');
console.log(`  栏沟可核 ${G.length} 案：命中 ${G.filter((r) => r.gutterHit).length}，未命中 ${G.filter((r) => !r.gutterHit).map((r) => r.id).join(' ') || '无'}`);
console.log(`  正文字号可核 ${S.length} 案：命中 ${S.filter((r) => r.sizeHit).length}，不符 ${S.filter((r) => r.sizeHit === false).map((r) => r.id).join(' ') || '无'}`);
console.log(`  行高可核 ${S.length} 案：ok ${S.filter((r) => r.lhVerdict === 'ok').length}，不符 ${S.filter((r) => r.lhVerdict && r.lhVerdict !== 'ok').map((r) => r.id).join(' ') || '无'}`);
