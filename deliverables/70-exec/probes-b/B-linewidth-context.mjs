#!/usr/bin/env node
/* EXEC-B：线宽声明的**语境分类**（这是根因所在，不是渲染口径）
 *
 * 问题不是"实测值 vs 设计值"，而是当前抽取器把**四种根本不在同一层的声明**混为一谈：
 *   static    普通规则里写的 —— 静态页面上真的会出现，这是设计分级
 *   state     :hover / :focus / :focus-visible / :active / [aria-pressed] 里写的
 *             —— 用户不交互就看不见。把它写进"线宽只用这几级"是错层级。
 *   media     与 1440×900 不匹配的 @media（max-width <1440、prefers-contrast、
 *             forced-colors、prefers-reduced-motion、hover:none…）—— 该视口下不生效
 *   var       经 var() 间接给出，当前实现已能展开
 *
 * 本探针把每个 px 值按语境归类，并给出"若只取 static 会得到什么"，供修法决策。
 * 同时统计 HTML 侧来源（stroke-width 属性 / inline style）——当前实现完全读不到，
 * 这是 S24 的 3.2、S25 的 1.2 从未被声称的直接原因。
 */
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const DIRS = readdirSync(join(ROOT, 'prototypes'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

/* 把 @media 的 prelude 判成"1440×900 下是否生效" */
function mediaApplies(prelude, W = 1440) {
  const p = prelude.toLowerCase();
  // 这些"开关型"查询在桌面 Chrome 默认设置下不成立（或不该被视为设计分级）
  if (/prefers-contrast|forced-colors|prefers-reduced-motion|prefers-reduced-transparency|inverted-colors/.test(p)) return false;
  if (/\bhover\s*:\s*none|pointer\s*:\s*coarse|any-hover\s*:\s*none/.test(p)) return false;
  if (/\bprint\b/.test(p)) return false;
  // 解析 width 条件
  let ok = true;
  for (const m of p.matchAll(/\(\s*(min|max)-width\s*:\s*([0-9.]+)\s*(px|em|rem)\s*\)/g)) {
    const unit = m[3];
    let v = parseFloat(m[2]);
    if (unit === 'em' || unit === 'rem') v *= 16;
    if (m[1] === 'min' && W < v) ok = false;
    if (m[1] === 'max' && W > v) ok = false;
  }
  // 区间写法 (width >= 1024px) / (1024px <= width)
  for (const m of p.matchAll(/\(\s*width\s*>=\s*([0-9.]+)px\s*\)/g)) if (W < parseFloat(m[1])) ok = false;
  for (const m of p.matchAll(/\(\s*width\s*<=\s*([0-9.]+)px\s*\)/g)) if (W > parseFloat(m[1])) ok = false;
  if (/\(\s*width\s*</.test(p) || /\(\s*width\s*>/.test(p)) {
    for (const m of p.matchAll(/\(\s*width\s*<\s*([0-9.]+)px\s*\)/g)) if (W >= parseFloat(m[1])) ok = false;
    for (const m of p.matchAll(/\(\s*width\s*>\s*([0-9.]+)px\s*\)/g)) if (W <= parseFloat(m[1])) ok = false;
  }
  return ok;
}

const STATE_RE = /:hover|:focus|:focus-visible|:focus-within|:active|:target|\[aria-pressed|\[aria-expanded|\[data-pressed|\[open\]/i;

/* 逐字符扫描，跟踪当前所在的 @media 语境与规则选择器，输出每个 px 声明的语境 */
function classify(cssText) {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const decls = [];
  let i = 0;
  const stack = [];            // { kind:'media', prelude, applies } | { kind:'rule', sel }
  let buf = '';
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const head = buf.trim();
      buf = '';
      if (/^@media/i.test(head)) {
        const prelude = head.replace(/^@media/i, '').trim();
        stack.push({ kind: 'media', prelude, applies: mediaApplies(prelude) });
      } else if (/^@supports|^@layer|^@container/i.test(head)) {
        stack.push({ kind: 'at', prelude: head });
      } else {
        stack.push({ kind: 'rule', sel: head });
      }
      i++; continue;
    }
    if (ch === '}') { stack.pop(); buf = ''; i++; continue; }
    if (ch === ';' && stack.length && stack[stack.length - 1].kind === 'rule') {
      const decl = buf.trim(); buf = '';
      const medias = stack.filter((s) => s.kind === 'media');
      const rule = stack[stack.length - 1];
      const ctx = medias.every((m) => m.applies)
        ? (STATE_RE.test(stack.filter((s) => s.kind === 'rule').map((s) => s.sel).join(' , ')) ? 'state' : 'static')
        : 'media';
      const mm = decl.match(/^(border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*(.+)$/i);
      if (mm) {
        decls.push({
          prop: mm[1].toLowerCase(), value: mm[2].trim(), ctx,
          sel: stack.filter((s) => s.kind === 'rule').map((s) => s.sel).join(' , ').slice(0, 90),
          media: medias.map((m) => m.prelude).join(' && ').slice(0, 70),
        });
      }
      i++; continue;
    }
    buf += ch; i++;
  }
  return decls;
}

const rows = [];
for (const d of DIRS) {
  const sid = d.slice(0, 3);
  const cssPath = join(ROOT, 'prototypes', d, 'style.css');
  const htmlPath = join(ROOT, 'prototypes', d, 'index.html');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  const decls = classify(css);
  const byCtx = { static: [], state: [], media: [] };
  for (const x of decls) {
    const vals = [];
    for (const q of x.value.match(/[0-9.]+px/g) || []) vals.push(Math.round(parseFloat(q) * 100) / 100);
    if (/^stroke-width$/.test(x.prop)) {
      const bare = x.value.match(/^\s*([0-9.]+)\s*$/);
      if (bare) vals.push(Math.round(parseFloat(bare[1]) * 100) / 100);
    }
    for (const v of vals) if (v > 0) byCtx[x.ctx].push({ v, prop: x.prop, sel: x.sel, media: x.media });
  }
  const set = (arr) => [...new Set(arr.map((x) => x.v))].sort((a, b) => a - b);
  // HTML 侧
  const htmlVals = new Set();
  for (const q of html.matchAll(/stroke-width\s*=\s*["']?\s*([0-9.]+)/g)) {
    const v = Math.round(parseFloat(q[1]) * 100) / 100; if (v > 0) htmlVals.add(v);
  }
  for (const q of html.matchAll(/style\s*=\s*"([^"]*)"/g)) {
    for (const z of q[1].matchAll(/\b(?:border|stroke-width)[^;"]*?([0-9.]+)px/g) || []) {
      const v = Math.round(parseFloat(z[1]) * 100) / 100; if (v > 0) htmlVals.add(v);
    }
  }
  rows.push({
    sid, dir: d,
    staticVals: set(byCtx.static),
    stateVals: set(byCtx.state),
    mediaVals: set(byCtx.media),
    htmlVals: [...htmlVals].sort((a, b) => a - b),
    stateDetail: byCtx.state.slice(0, 40),
    mediaDetail: byCtx.media.slice(0, 40),
    staticDetail: byCtx.static.slice(0, 60),
  });
}

writeFileSync(join(ROOT, 'deliverables/70-exec/probes-b/linewidth-context.json'), JSON.stringify(rows, null, 1));

console.log('案    static（静态语境）               state（交互态）        media（1440 不生效）    html 属性');
for (const r of rows) {
  console.log(
    r.sid.padEnd(4) + '  ' +
    (r.staticVals.join(',') || '—').padEnd(28) + '  ' +
    (r.stateVals.join(',') || '—').padEnd(20) + '  ' +
    (r.mediaVals.join(',') || '—').padEnd(22) + '  ' + (r.htmlVals.join(',') || '—')
  );
}

console.log('\n=== 只出现在交互态/不生效媒体查询里的值（这些就是假声称的来源）===');
for (const r of rows) {
  const onlyState = r.stateVals.filter((v) => !r.staticVals.includes(v));
  const onlyMedia = r.mediaVals.filter((v) => !r.staticVals.includes(v) && !r.htmlVals.includes(v));
  if (onlyState.length || onlyMedia.length) {
    console.log(`  ${r.sid}  state-only: ${onlyState.join(',') || '—'}   media-only: ${onlyMedia.join(',') || '—'}`);
    for (const x of r.stateDetail.filter((y) => onlyState.includes(y.v)).slice(0, 6))
      console.log(`      ${x.v}px  ${x.prop}  sel=${x.sel}`);
    for (const x of r.mediaDetail.filter((y) => onlyMedia.includes(y.v)).slice(0, 6))
      console.log(`      ${x.v}px  ${x.prop}  @media ${x.media}`);
  }
}
console.log('\n=== HTML 属性里有、CSS static 里没有的值（当前实现完全读不到）===');
for (const r of rows) {
  const onlyHtml = r.htmlVals.filter((v) => !r.staticVals.includes(v));
  if (onlyHtml.length) console.log(`  ${r.sid}  ${onlyHtml.join(',')}`);
}
