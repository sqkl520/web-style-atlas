// verify-style.mjs —— 「提示词能否产出该风格」的机械判据器（A 的核心工具，可复用）。
//
//   node verify-style.mjs --prompt S16 --page <file.html> --out <dir> [--proto-root <dir>]
//
// 设计要点（每条都对应一个已知陷阱）：
//  1. 只从**提示词字符串**取值，不读原型 CSS。原型的 CSS 只用于防作弊比对（选择器/声明对）。
//  2. 判定分三档：PASS / FAIL / NA（提示词对该项没给可判定的值）。
//     NA 必须单列——把"没说要"混进 PASS 就是自欺。
//  3. 字体不用 computed fontFamily 判定（那只是"声明"），用 CDP CSS.getPlatformFontsForNode
//     看"真的谁在画字"（62-verify 的教训：S07 声明 Libre Franklin，实际 SimSun 在画）。
//  4. 阴影同时看 box-shadow 与 filter:drop-shadow：提示词说"只用 drop-shadow"时，
//     box-shadow 必须为 0；说"只用 inset"时，外投影必须为 0。
//  5. 色值判定允许 alpha 变体（rgba 同 RGB 视为同色），但**不接受近似色**——差一位就是差。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const HERE = dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const ROOT = resolve(HERE, '..', '..');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const promptId = flag('prompt', null);
const pagePath = flag('page', null);
const outDir = flag('out', join(HERE, '_verify-out'));
const protoRoot = flag('proto-root', join(ROOT, 'prototypes'));
if (!promptId || !pagePath) { console.error('usage: --prompt S16 --page x.html [--out dir]'); process.exit(2); }

/* ---------- 1. 取提示词（只从 _selection 三件套，不碰原型） ---------- */
function loadCtx() {
  const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/^\uFEFF/, '');
  const doc = {
    readyState: 'complete', addEventListener() {}, removeEventListener() {},
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { toggle() {} } }; },
    body: { appendChild() {}, removeChild() {} },
  };
  const sb = { console, document: doc, navigator: {}, setTimeout, clearTimeout };
  sb.window = sb; sb.globalThis = sb;
  const c = vm.createContext(sb);
  vm.runInContext(read('prototypes/_selection/data.js'), c, { filename: 'data.js' });
  vm.runInContext(read('prototypes/_selection/prompts.js'), c, { filename: 'prompts.js' });
  vm.runInContext(read('prototypes/_selection/prompt-copy.js'), c, { filename: 'prompt-copy.js' });
  return sb;
}
const W = loadCtx();
const PROMPT = W.buildStylePrompt(promptId, { biz: '', action: '' });
if (!PROMPT) { console.error('no prompt for ' + promptId); process.exit(2); }
const PL = PROMPT.split('\n');
const line = (re) => (PL.find((x) => re.test(x)) || '');

/* ---------- 2. 从提示词抽出可机械判定的约束 ---------- */
const HEX = /#[0-9A-Fa-f]{6}\b/g;
const paletteLine = line(/^1\. 配色只用这几个值/);
const claimedPalette = [...new Set(paletteLine.match(HEX) || [])];
// 禁令色（防退化 ①）：不算调色板，遇到即 FAIL
const bannedHex = new Set((PL.filter((l) => /^① /.test(l)).join(' ').match(HEX) || []).map((x) => x.toUpperCase()));

const fontLine = line(/^2\. 字体/);
const titleStack = ((fontLine.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1]
  || (fontLine.match(/标题用 ([^。]+?)。/) || [])[1]
  || (fontLine.match(/全站只用一款字体：([^（]+)/) || [])[1] || '')
  .split('→').map((x) => x.trim()).filter(Boolean);
const bodyStack = ((fontLine.match(/正文同理，按序取：([^。]+?)。/) || [])[1]
  || (fontLine.match(/正文用 ([^。]+?)。/) || [])[1] || titleStack[0] || '')
  .split('→').map((x) => x.trim()).filter(Boolean);
const monoFont = ((fontLine.match(/等宽\s*([^、，。]+)/) || [])[1] || '').trim();

const radLine = line(/^3\. 圆角/);
const radiusMode = /全站一律 0|全站直角|全直角/.test(radLine) ? 'zero'
  : /仅圆形|50%/.test(radLine) ? 'zero-except-circle' : 'other';

const shLine = line(/^4\. 阴影/);
const shadowMode = /^4\. 阴影：无阴影/.test(shLine) ? 'none'
  : /只用 inset/.test(shLine) ? 'inset-only'
  : /drop-shadow/.test(shLine) ? 'drop-only'
  : /inset 与外投影混用/.test(shLine) ? 'mixed' : 'other';

const lwLine = line(/^5\. 线宽只用这几级/);
const claimedWidths = [...new Set((lwLine.match(/[\d.]+px/g) || []))].map((x) => parseFloat(x));

const nClaim = +((line(/^1\. 这个版式设计时排了/).match(/排了\s*(\d+)\s*个/) || [])[1] || 0);
const picsClaim = +((line(/^4\. 版式里至少要/).match(/至少要\s*(\d+)\s*个/) || [])[1] || 0);
const voidClause = /刻意留空/.test(PROMPT);
const autolayout = /这个版式是自动流排版/.test(PROMPT);

const SPEC = {
  id: promptId, promptChars: PROMPT.length, promptLines: PL.length,
  palette: claimedPalette, bannedHex: [...bannedHex],
  titleStack, bodyStack, monoFont,
  radiusMode, shadowMode, claimedWidths,
  nClaim, picsClaim, voidClause, autolayout,
  promptSha1: null,
};

/* ---------- 3. 在页面里量（CDP） ---------- */
const MEASURE = () => {
  const hex = (rgb) => {
    const m = String(rgb).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length > 3 && p[3] === 0) return null;
    return '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  };
  const painted = new Set();
  const radii = new Map();
  const widths = new Map();
  let boxShadowOuter = 0, boxShadowInset = 0, dropShadow = 0, gradients = 0, backdrop = 0;
  const fams = new Map();
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}]/u;
  let emojiHit = 0;
  const imgs = [];
  const units = {};
  for (const el of document.querySelectorAll('*')) {
    if (/^(HTML|HEAD|META|TITLE|LINK|STYLE|SCRIPT|BASE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    // 只数"用到了这个色"的元素：有自己的一段文字，或者有可见的底/边。
    // 否则每个继承默认 color 的容器都会把 #000000 带进来（html 的初始色），产生假红。
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    const hasBg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none');
    if (ownText) { const h = hex(cs.color); if (h) painted.add(h); }
    if (hasBg) { const h = hex(cs.backgroundColor); if (h) painted.add(h); }
    if (hasBorder) for (const s of ['Top', 'Right', 'Bottom', 'Left']) { const h = hex(cs['border' + s + 'Color']); if (h) painted.add(h); }
    if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) { const h = hex(cs.outlineColor); if (h) painted.add(h); }
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      for (const m of cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) { const h = hex(m[0]); if (h) painted.add(h); }
      if (/gradient\(/.test(cs.backgroundImage)) gradients++;
    }
    // 圆角：只数"有面积且真的有底色/边框"的元素，避免把 0 尺寸工具元素算进去
    if (r.width > 4 && r.height > 4) {
      const v = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius]
        .map((x) => x.split(' ')[0]);
      const rounded = v.some((x) => parseFloat(x) > 0.5);
      if (rounded) radii.set(el.tagName + '.' + String(el.className).slice(0, 20), v.join(' '));
    }
    // 线宽：只数 style 非 none 的边
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) {
      if (cs['border' + s + 'Style'] !== 'none') {
        const w = parseFloat(cs['border' + s + 'Width']);
        if (w > 0) widths.set(w, (widths.get(w) || 0) + 1);
      }
    }
    // 阴影
    const bs = cs.boxShadow;
    if (bs && bs !== 'none') {
      const parts = bs.split(/,(?![^(]*\))/);
      for (const p of parts) {
        if (/inset/.test(p)) boxShadowInset++;
        else if (!/ 0px 0px 0px 0px/.test(p) && !/rgba\(\d+, \d+, \d+, 0\)/.test(p)) boxShadowOuter++;
      }
    }
    if (cs.filter && /drop-shadow/.test(cs.filter)) dropShadow++;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') backdrop++;
    // 字体（声明）
    const f = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
    if (f && el.textContent && el.textContent.trim()) fams.set(f, (fams.get(f) || 0) + 1);
    // emoji
    for (const t of el.childNodes) if (t.nodeType === 3 && emojiRe.test(t.nodeValue)) emojiHit++;
    // 图片
    if (el.tagName === 'IMG') {
      const nw = el.naturalWidth || 0;
      imgs.push({ src: (el.getAttribute('src') || '').slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), nw, nh: el.naturalHeight || 0 });
    }
  }
  // "同构单元"计数：按**第一个 class token** 归组（`word w9 off1` 与 `word w7 off2` 是同一类单元），
  // 并优先取"每个单元里带标题(h1-h4)"的那一组 —— 那才是版式单元。
  // 否则 figure 墙会把词块组盖掉（试点第一次跑就抓到了这个假阴性）。
  for (const p of document.querySelectorAll('*')) {
    const kids = [...p.children];
    if (kids.length < 3) continue;
    const sig = (k) => k.tagName + '.' + String(k.className || '').trim().split(/\s+/)[0];
    const groups = new Map();
    for (const k of kids) {
      const g = sig(k);
      groups.set(g, (groups.get(g) || []).concat(k));
    }
    for (const [g, arr] of groups) {
      if (arr.length < 3) continue;
      const withHead = arr.filter((k) => k.querySelector('h1,h2,h3,h4')).length;
      const prev = units[g] || { n: 0, withHead: 0 };
      units[g] = { n: Math.max(prev.n, arr.length), withHead: Math.max(prev.withHead, withHead) };
    }
  }
  const h1 = document.querySelector('h1');
  const h1cs = h1 ? getComputedStyle(h1) : null;
  return {
    painted: [...painted],
    radii: [...radii.entries()].slice(0, 12),
    widths: [...widths.entries()].sort((a, b) => b[1] - a[1]),
    boxShadowOuter, boxShadowInset, dropShadow, gradients, backdrop,
    declaredFams: [...fams.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    emojiHit,
    imgs,
    realPics: imgs.filter((i) => i.nw >= 200 && i.nh >= 120 && i.w >= 40 && i.h >= 30).length,
    distinctPics: new Set(imgs.map((i) => i.src)).size,
    units: Object.entries(units).sort((a, b) => (b[1].withHead - a[1].withHead) || (b[1].n - a[1].n)).slice(0, 6),
    h1: h1 ? { size: Math.round(parseFloat(h1cs.fontSize)), fam: h1cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), text: (h1.textContent || '').trim().slice(0, 40) } : null,
    docH: document.documentElement.scrollHeight,
    title: document.title,
  };
};

const br = await Browser.launch({ width: 1440, height: 900 });
const pg = await br.newPage({ width: 1440, height: 900, dsf: 1 });
await pg.goto(pathToFileURL(resolve(pagePath)).href, { settleMs: 2200 });
await pg.eval('document.fonts.ready.then(()=>1)');
await sleep(300);
const M = await pg.eval(MEASURE);

/* ---------- 4. 平台字体：真的谁在画 h1 / 正文 ---------- */
let platform = null;
try {
  await pg.send('DOM.enable');
  await pg.send('CSS.enable');
  const doc = await pg.send('DOM.getDocument', { depth: -1 });
  const target = process.env.VS_FONT_SEL || 'h1';
  const q = await pg.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: target });
  if (q && q.nodeId) {
    const pf = await pg.send('CSS.getPlatformFontsForNode', { nodeId: q.nodeId });
    platform = (pf.fonts || []).map((f) => ({ family: f.familyName, glyphs: f.glyphCount })).sort((a, b) => b.glyphs - a.glyphs);
  } else platform = { error: 'no ' + target };
} catch (e) { platform = { error: String(e.message || e).slice(0, 160) }; }

await pg.close(); await br.close();

/* ---------- 5. 判定 ---------- */
const R = [];
const add = (id, verdict, got, want, note) => R.push({ id, verdict, got, want, note });
const upper = (a) => a.map((x) => String(x).toUpperCase());

// 5.1 调色板：页面画出来的每种颜色，是否都在提示词给的集合里
const painted = upper(M.painted);
const palSet = new Set(upper(claimedPalette));
const extra = painted.filter((h) => !palSet.has(h) && !bannedHex.has(h));
add('palette-covered', extra.length === 0 ? 'PASS' : 'FAIL',
  `${painted.length} 色，集合外 ${extra.length} 色`, `⊆ [${claimedPalette.join(' ')}]`,
  extra.length ? '集合外：' + extra.slice(0, 8).join(' ') : '');
// 5.2 禁令色
const bannedHit = painted.filter((h) => bannedHex.has(h));
add('palette-banned', bannedHit.length ? 'FAIL' : 'PASS', bannedHit.join(' ') || '无', '不得出现 ' + [...bannedHex].join(' '), '');

// 5.3 标题字体：平台字体（真画字的）第一顺位 == 提示词标题链第一个可用项
if (platform && !platform.error && platform.length) {
  const realFirst = platform[0].family;
  const want = titleStack[0];
  add('font-title-real', realFirst === want ? 'PASS' : 'FAIL', realFirst, want,
    `平台字体全部：${platform.map((p) => p.family + '(' + p.glyphs + ')').join(', ')}`);
} else {
  add('font-title-real', 'NA', '取不到平台字体', titleStack[0], platform && platform.error ? platform.error : '');
}
// 5.4 字体族数（提示词只给 2 条链 + 1 个等宽槽 → 上限 3）
const famCount = M.declaredFams.length;
add('font-count', famCount <= 3 ? 'PASS' : (famCount === 4 ? 'WARN' : 'FAIL'), String(famCount), '≤3（2 链 + 1 等宽槽）', M.declaredFams.map((x) => x[0]).join(', '));
// 5.5 等宽
if (monoFont) {
  const monoUsed = M.declaredFams.some((f) => f[0].includes(monoFont));
  add('font-mono-slot', monoUsed ? 'PASS' : 'FAIL', monoUsed ? monoFont : '未用', monoFont, '');
} else add('font-mono-slot', 'NA', '—', '提示词没指定等宽', '');

// 5.6 圆角
const rounded = M.radii.length;
if (radiusMode === 'zero') add('radius', rounded === 0 ? 'PASS' : 'FAIL', `${rounded} 处非零`, '0', M.radii.slice(0, 4).map((x) => x[0] + '=' + x[1]).join(' | '));
else if (radiusMode === 'zero-except-circle') {
  const bad = M.radii.filter(([, v]) => !/50%/.test(v));
  add('radius', bad.length === 0 ? 'PASS' : 'FAIL', `${rounded} 处（非圆形 ${bad.length}）`, '0，圆形徽标除外', bad.slice(0, 3).map((x) => x[0] + '=' + x[1]).join(' | '));
} else add('radius', 'NA', `${rounded} 处非零`, radLine.slice(0, 60), '提示词没给可判定值');

// 5.7 阴影
if (shadowMode === 'none') add('shadow', M.boxShadowOuter + M.boxShadowInset + M.dropShadow === 0 ? 'PASS' : 'FAIL', `外${M.boxShadowOuter}/内${M.boxShadowInset}/drop${M.dropShadow}`, '全 0', '');
else if (shadowMode === 'inset-only') add('shadow', M.boxShadowOuter === 0 ? 'PASS' : 'FAIL', `外投影 ${M.boxShadowOuter}`, '外投影 0', `inset ${M.boxShadowInset}`);
else if (shadowMode === 'drop-only') add('shadow', M.boxShadowOuter === 0 ? 'PASS' : 'FAIL', `box 外投影 ${M.boxShadowOuter} / drop ${M.dropShadow}`, 'box-shadow 外投影 0（drop 允许）', '');
else add('shadow', 'NA', `外${M.boxShadowOuter}/内${M.boxShadowInset}/drop${M.dropShadow}`, shLine.slice(0, 50), '提示词声明了混合，无单一判据');

// 5.8 线宽：页面上用到的每种 border-width 是否都在清单里
const usedW = M.widths.map(([w]) => w);
const extraW = usedW.filter((w) => !claimedWidths.includes(w));
add('line-widths', extraW.length === 0 ? 'PASS' : 'FAIL', usedW.join('/') || '无', claimedWidths.join('/'), extraW.length ? '多出 ' + extraW.join('/') : '');

// 5.9 图片
add('pictures', M.realPics >= picsClaim && M.distinctPics >= picsClaim ? 'PASS' : 'FAIL',
  `真图 ${M.realPics} 张 / 不同 src ${M.distinctPics}`, `≥${picsClaim} 张且互不相同`, M.imgs.slice(0, 3).map((i) => `${i.src}(${i.w}x${i.h},nat ${i.nw})`).join(' | '));

// 5.10 单元数（N）：优先取"每单元带标题"的那一组
const topUnit = M.units.find(([, v]) => v.withHead >= 3) || M.units[0];
const unitN = topUnit ? (topUnit[1].withHead || topUnit[1].n) : 0;
add('unit-count', unitN >= Math.round(nClaim * 0.6) ? 'PASS' : 'FAIL',
  topUnit ? `${topUnit[0]} × ${unitN}` : '未识别出同构单元', `设计规模 ${nClaim}（允许 ±40%）`, autolayout ? '本案自动流，数量本来可增减' : '本案位置写死');

// 5.11 防退化 8 条里可机械查的 4 条
add('guard-no-gradient', M.gradients === 0 ? 'PASS' : 'FAIL', `${M.gradients} 处`, '0', '');
add('guard-no-emoji', M.emojiHit === 0 ? 'PASS' : 'FAIL', `${M.emojiHit} 处渲染文本`, '0', '');
add('guard-no-glass', M.backdrop === 0 ? 'PASS' : 'WARN', `${M.backdrop} 处 backdrop-filter`, '0', '');
const textShadow = 0; // 由 grep 侧另测
add('guard-single-cta', 'NA', '需人眼/结构判定', '首屏不得有 2 个并排主 CTA', '');

// 5.12 NA 统计
const tally = R.reduce((a, r) => (a[r.verdict] = (a[r.verdict] || 0) + 1, a), {});

/* ---------- 6. 防作弊：与原型 CSS 的选择器/声明对相似度 ---------- */
function selsOf(css) { const s = new Set(); for (const m of css.matchAll(/([^{}]+)\{/g)) { const x = m[1].split('\n').pop().trim(); if (x && !x.startsWith('@')) s.add(x); } return s; }
function declsOf(css) { const s = new Set(); for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) { const sel = m[1].split('\n').pop().trim(); if (!sel || sel.startsWith('@')) continue; for (const d of m[2].split(';')) { const t = d.trim(); if (!t || t.startsWith('/*')) continue; s.add(sel + '{' + t.replace(/\s+/g, ' ')); } } return s; }
const jac = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
let leak = null;
const protoCssPath = join(protoRoot, PROMPT ? (W.STYLE_PROMPTS.schemes.find((s) => s.id === promptId) || {}).dir || '' : '', 'style.css');
if (existsSync(protoCssPath)) {
  const protoCss = readFileSync(protoCssPath, 'utf8');
  const pageHtml = readFileSync(resolve(pagePath), 'utf8');
  const pageCss = [...pageHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((x) => x[1]).join('\n') || pageHtml;
  const ps = selsOf(protoCss), qs = selsOf(pageCss);
  const pd = declsOf(protoCss), qd = declsOf(pageCss);
  leak = {
    protoSelectors: ps.size, pageSelectors: qs.size, selectorJaccard: +jac(ps, qs).toFixed(3),
    protoDecls: pd.size, pageDecls: qd.size, declJaccard: +jac(pd, qd).toFixed(3),
    // 校准值（见 69-plan/_out_p18）：诚实复刻 ≈ 0.05 / 0.01；整段抄袭 ≈ 0.76 / 0.61
    verdict: jac(pd, qd) > 0.35 || jac(ps, qs) > 0.45 ? 'SUSPECT_COPIED' : 'clean',
  };
}

/* ---------- 7. 落盘 ---------- */
mkdirSync(outDir, { recursive: true });
const report = {
  at: new Date().toISOString(), promptId, page: resolve(pagePath),
  spec: SPEC, measured: M, platformFonts: platform,
  checks: R, tally, leak,
};
const outFile = join(outDir, `${promptId}-${(M.title || 'page').replace(/[^\w\u4e00-\u9fa5]/g, '').slice(0, 12)}.json`);
writeFileSync(outFile, JSON.stringify(report, null, 1), 'utf8');

const mark = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN', NA: ' NA ' };
console.log(`\n=== ${promptId}  vs  ${pagePath} ===`);
console.log(`  提示词 ${SPEC.promptChars} 字 / ${SPEC.promptLines} 行；页面 docH ${M.docH}px`);
for (const r of R) console.log(`  [${mark[r.verdict]}] ${r.id.padEnd(18)} got=${String(r.got).slice(0, 46).padEnd(46)} want=${String(r.want).slice(0, 40)}`);
console.log(`\n  判定：PASS ${tally.PASS || 0} / FAIL ${tally.FAIL || 0} / WARN ${tally.WARN || 0} / NA ${tally.NA || 0}`);
if (leak) console.log(`  防作弊：选择器 Jaccard ${leak.selectorJaccard}，声明对 Jaccard ${leak.declJaccard} → ${leak.verdict}`);
console.log(`  → ${outFile}`);
