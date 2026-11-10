#!/usr/bin/env node
// 63-test · step 1 (final): build the swapped twin of each case.
//
// Contract enforced here, then verified after the fact:
//   1. ONLY text nodes (outside <script>/<style>/comments), CJK string literals inside
//      page <script>, and purely-copy attribute values are rewritten.
//   2. Every CJK run  -> fruit run of the SAME character count.
//      Every Latin word -> fruit-Latin word of the SAME letter count / case class.
//      Every digit run  -> nonsense number of the SAME digit count.
//      Punctuation, spaces, entities, indentation: untouched.
//   3. Swaps are MEMOISED: an original string always maps to the same replacement, so a
//      value echoed in two places stays self-consistent.
//   4. Attribute values that CSS selects on ([data-label="互斥"]) are rewritten together
//      with their selector; values used as JS logic keys are left alone and reported.
//
// Variants (env):
//   SUFFIX='' | '-cjk'          output filename suffix
//   LATIN_MODE=swap|keep        keep = leave Latin words verbatim (control run)
//   NUM_MODE=swap|keep          keep = leave every digit run verbatim (control run)
//
// Output: replica/<case>/index.swap<SUFFIX>.html + data/swap-audit<SUFFIX>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scan, mapAttrs, CJK } from './lib/html.mjs';

const ROOT = resolve('D:/Web/style');
const REPLICA = join(ROOT, 'deliverables', '63-test', 'replica');
const DATA = join(ROOT, 'deliverables', '63-test', 'data');
mkdirSync(DATA, { recursive: true });

const CASES = [
  'S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual',
];

const F1 = ['梨', '桃', '柚', '杏', '梅', '枣', '橙'];
const F2 = ['苹果', '香蕉', '橘子', '葡萄', '西瓜', '草莓', '柠檬', '桃子', '樱桃', '芒果', '菠萝', '荔枝',
  '龙眼', '枇杷', '石榴', '柿子', '蓝莓', '木瓜', '榴莲', '椰子', '杨梅', '山楂', '覆盆', '青柠'];
const F3 = ['猕猴桃', '火龙果', '哈密瓜', '车厘子', '百香果', '番石榴', '无花果', '圣女果', '牛油果', '杨桃干'];
const FRUIT_CHARS = new Set([...F1, ...F2, ...F3].join(''));
const LATIN = ['APPLE', 'MANGO', 'GRAPE', 'LEMON', 'PEACH', 'CHERRY', 'BANANA', 'MELON', 'PLUM', 'PEAR',
  'FIG', 'KIWI', 'LYCHEE', 'PAPAYA', 'GUAVA', 'APRICOT', 'COCONUT', 'ORANGE', 'PERSIMMON'];

const LATIN_MODE = process.env.LATIN_MODE || 'swap';
const NUM_MODE = process.env.NUM_MODE || 'swap';
const SUFFIX = process.env.SUFFIX || '';
const CJK_MODE = process.env.CJK_MODE || 'fruit';   // 'fruit' | 'inset' (page's own glyphs)
const vsHtml = `index.swap${SUFFIX}.html`;

function rng(seedStr) {
  let x = 2166136261 >>> 0;
  for (const ch of seedStr) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619) >>> 0; }
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

function makeEngine(seed, insetAlphabet) {
  const rand = rng(seed);
  const memo = new Map();
  let numSeq = 0;
  const numMemo = new Map();

  function fruitRun(n) {
    if (CJK_MODE === 'inset') {
      // control for subsetted fonts: draw glyphs from THIS page's own vocabulary, so the
      // case's hand-subsetted webfont certainly covers them. Meaning is still destroyed
      // (order is scrambled), but coverage is guaranteed.
      let s = '';
      for (let i = 0; i < n; i++) s += insetAlphabet[Math.floor(rand() * insetAlphabet.length)];
      return s;
    }
    let out = '';
    let guard = 0;
    while (out.length < n && guard++ < 500) {
      const want = Math.min(n - out.length, 1 + Math.floor(rand() * 3));
      const pool = want === 1 ? F1 : want === 2 ? F2 : F3;
      out += pool[Math.floor(rand() * pool.length)];
      if (out.length > n) out = out.slice(0, n);
    }
    if (out.length < n) out += F1[0].repeat(n - out.length);
    return out;
  }
  function latinWord(w) {
    if (LATIN_MODE === 'keep') return w;
    const base = LATIN[Math.floor(rand() * LATIN.length)];
    let s = (base + base + base).slice(0, w.length);
    if (w === w.toUpperCase()) return s;
    if (w[0] === w[0].toUpperCase() && w.slice(1) === w.slice(1).toLowerCase()) return s[0] + s.slice(1).toLowerCase();
    return s.toLowerCase();
  }
  function digits(run) {
    if (NUM_MODE === 'keep') return run;
    if (numMemo.has(run)) return numMemo.get(run);
    numSeq += 1;
    const n = run.length;
    let s = String(100 + numSeq * 7 + (numSeq % 3) * 1000).slice(-Math.max(n, 2));
    while (s.length < n) s = String((numSeq * 13 + s.length * 7) % 10) + s;
    s = s.slice(-n);
    if (s[0] === '0') s = '1' + s.slice(1);
    numMemo.set(run, s);
    return s;
  }
  function transplant(text) {
    if (memo.has(text)) return memo.get(text);
    let out = '';
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (CJK.test(ch)) {
        let j = i; while (j < text.length && CJK.test(text[j])) j++;
        out += fruitRun(j - i); i = j;
      } else if (/[0-9]/.test(ch)) {
        let j = i; while (j < text.length && /[0-9]/.test(text[j])) j++;
        out += digits(text.slice(i, j)); i = j;
      } else if (/[A-Za-z]/.test(ch)) {
        let j = i; while (j < text.length && /[A-Za-z]/.test(text[j])) j++;
        out += latinWord(text.slice(i, j)); i = j;
      } else { out += ch; i++; }
    }
    memo.set(text, out);
    return out;
  }
  return { transplant };
}

// ---------- which attribute values are LOGIC keys rather than copy ----------
function logicAttrs(html, css) {
  const out = new Set();
  for (const m of html.matchAll(/(?:getAttribute\(\s*['"]([\w-]+)['"]\s*\)|dataset\.([A-Za-z0-9_]+))/g)) {
    const name = (m[1] || ('data-' + m[2])).toLowerCase();
    const after = m.index + m[0].length;
    const tail = html.slice(after, after + 60);
    const head = html.slice(Math.max(0, after - 80), after);
    const usedAsIndex = /^\s*\]/.test(tail);
    const compared = /^\s*(===|!==|==|!=|>|<|\.includes|\.indexOf|\.match)/.test(tail);
    const branchy = /(if|while|switch)\s*\([^)\n]*$/.test(head.slice(-90));
    if (usedAsIndex || compared || branchy) out.add(name);
  }
  for (const m of css.matchAll(/\[\s*([\w-]+)\s*[=~|^$*]?=/g)) out.add(m[1].toLowerCase());
  return out;
}
function attrRendered(css) {
  const out = new Set();
  for (const m of css.matchAll(/attr\(\s*([\w-]+)\s*\)/g)) out.add(m[1].toLowerCase());
  return out;
}
function cssSelectorValues(css) {
  const out = new Set();
  for (const m of css.matchAll(/\[[^\]]*?=\s*["']([^"']*)["']/g)) out.add(m[1]);
  return out;
}
const COPY_ATTRS = new Set(['alt', 'title', 'aria-label', 'aria-description', 'aria-roledescription', 'placeholder']);
const JUICE = new Set(['', '·', '|', '/', '—', '-', '•', '｜']);

const audit = {};
for (const c of CASES) {
  const html = readFileSync(join(REPLICA, c, 'index.html'), 'utf8');
  const cssOrig = readFileSync(join(REPLICA, c, 'style.css'), 'utf8');
  const keys = logicAttrs(html, cssOrig);
  const rendered = attrRendered(cssOrig);
  const selVals = cssSelectorValues(cssOrig);
  // this page's own CJK vocabulary, for the in-set control
  const ownCjk = [...new Set((html.match(/[\u4e00-\u9fff]/g) || []))];
  const eng = makeEngine(c, ownCjk);

  const changes = [];
  const protectedHits = new Map();
  const selectorRenames = new Map();
  let out = '';
  let attrSwapped = 0;

  for (const p of scan(html)) {
    if (p.kind === 'text') {
      if (!/[\u3400-\u9fff]/.test(p.s) && !/[A-Za-z]{3,}/.test(p.s)) { out += p.s; continue; }
      const replaced = eng.transplant(p.s);
      if (replaced !== p.s) changes.push({ where: 'text', from: p.s.trim().slice(0, 100), to: replaced.trim().slice(0, 100) });
      out += replaced;
    } else if (p.kind === 'raw') {
      // <script>: ONLY string literals containing CJK are copy. Latin-only literals are
      // ids, selectors, class names and data keys — touching them breaks the page
      // instead of testing it.
      out += p.s.replace(/(['"])((?:[^'"\\\n]|\\.){0,900}?)\1/g, (all, q, body) => {
        if (!/[\u3400-\u9fff]/.test(body)) return all;
        const replaced = eng.transplant(body);
        if (replaced !== body) changes.push({ where: 'js-string', from: body.slice(0, 100), to: replaced.slice(0, 100) });
        return q + replaced + q;
      });
    } else if (p.kind === 'tag') {
      out += mapAttrs(p.s, (name, val) => {
        if (!/[\u3400-\u9fff]/.test(val)) return null;
        if (JUICE.has(val.trim())) return null;
        if (keys.has(name) && !rendered.has(name)) {
          protectedHits.set(name, (protectedHits.get(name) || 0) + 1); return null;
        }
        if (selVals.has(val)) {
          let next = selectorRenames.get(val);
          if (!next) { next = eng.transplant(val); selectorRenames.set(val, next); }
          protectedHits.set(name + '(renamed-with-css)', (protectedHits.get(name + '(renamed-with-css)') || 0) + 1);
          return next;
        }
        attrSwapped++;
        return eng.transplant(val);
      });
    } else out += p.s;
  }

  // CSS selector literals must move in lockstep, or the swap would test a broken page.
  let css = cssOrig;
  for (const [oldV, newV] of selectorRenames) {
    css = css.split(`"${oldV}"`).join(`"${newV}"`).split(`'${oldV}'`).join(`'${newV}'`);
  }
  if (css !== cssOrig) writeFileSync(join(REPLICA, c, `style.swap${SUFFIX}.css`), css, 'utf8');

  // ---------- verification ----------
  const norm = (s) => scan(s).filter((q) => q.kind === 'tag')
    .map((q) => q.s.replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g,
      (a, n, _q2, dq, sq) => (/[\u3400-\u9fff]/.test(dq ?? sq ?? '') ? `${n}=#V#` : a))).join('\n');
  const structSame = norm(html) === norm(out);
  const tagCount = (s) => scan(s).filter((q) => q.kind === 'tag').length;

  const residual = [];
  for (const q of scan(out)) {
    const grab = (s, kind) => {
      for (const ch of s) if (/[\u3400-\u9fff]/.test(ch) && !FRUIT_CHARS.has(ch)) { residual.push({ kind, s: s.slice(0, 70) }); return; }
    };
    if (q.kind === 'text') grab(q.s, 'text');
    if (q.kind === 'raw') for (const m of q.s.matchAll(/(['"])((?:[^'"\\\n]|\\.){0,900}?)\1/g)) grab(m[2], 'js');
    if (q.kind === 'tag') for (const m of q.s.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)) grab(m[2], m[1]);
  }

  const textOf = (s) => scan(s).filter((q) => q.kind === 'text').map((q) => q.s).join('');
  const a = textOf(html), b = textOf(out);
  const runsA = [...a.matchAll(/\d+/g)].map((m) => m[0].length);
  const runsB = [...b.matchAll(/\d+/g)].map((m) => m[0].length);
  const digitFidelity = runsA.length === runsB.length && runsA.every((n, i) => n === runsB[i]);

  const nodesOf = (s) => {
    const list = [];
    for (const q of scan(s)) {
      if (q.kind === 'text' && q.s.trim()) list.push(q.s.trim());
      if (q.kind === 'tag') for (const m of q.s.matchAll(/(?:alt|title|aria-label|aria-description|placeholder)\s*=\s*"([^"]*)"/g)) if (m[1].trim()) list.push(m[1].trim());
    }
    return list;
  };
  const la = nodesOf(html), lb = nodesOf(out);
  const lens = la.map((s, i) => { const t = lb[i] ?? ''; return { s, t, d: t.length - s.length, ratio: s.length ? Math.abs(t.length - s.length) / s.length : 0 }; });
  const swapped = lens.filter((x) => x.s !== x.t);
  const meanRatio = swapped.reduce((acc, x) => acc + x.ratio, 0) / (swapped.length || 1);

  writeFileSync(join(REPLICA, c, vsHtml), out, 'utf8');
  audit[c] = {
    variant: { SUFFIX, LATIN_MODE, NUM_MODE },
    structSame, tagCount: tagCount(html), tagCountSwap: tagCount(out),
    textLenOrig: a.length, textLenSwap: b.length,
    digitRunsPreserved: digitFidelity,
    stringsCompared: lens.length, stringsOver5pct: lens.filter((x) => x.ratio > 0.05).length,
    meanLenDriftPct: +(meanRatio * 100).toFixed(2),
    swaps: changes.length, attrSwapped,
    cssRewritten: css !== cssOrig,
    protectedAttrs: Object.fromEntries(protectedHits),
    residualCount: residual.length, residual: residual.slice(0, 10),
    samples: changes.slice(0, 12),
  };
  console.log(`${c}
  tags ${tagCount(html)}->${tagCount(out)}  struct-identical=${structSame}  digitsPreserved=${digitFidelity}
  textLen ${a.length}->${b.length}  strings=${lens.length} over5%=${audit[c].stringsOver5pct} meanLenDrift=${audit[c].meanLenDriftPct}%
  swaps=${changes.length} attrSwapped=${attrSwapped} cssRewritten=${css !== cssOrig} residual=${residual.length}`);
}

writeFileSync(join(DATA, `swap-audit${SUFFIX}.json`), JSON.stringify(audit, null, 1));
const bad = Object.entries(audit).filter(([, x]) => !x.structSame || !x.digitRunsPreserved);
console.log(bad.length ? '\n!! FAILED invariants: ' + bad.map(([c]) => c).join(', ') : '\nAll twins: tag-identical, digit-run-identical.');
