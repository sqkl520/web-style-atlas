#!/usr/bin/env node
// 63-test · step 0: inventory of all copy that must be swapped.
// Prints, per case: unique text-node strings (with counts), CJK-bearing attributes,
// which attributes are functional (referenced from JS/CSS), and top-level block structure.
// Read-only: never writes into prototypes/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('D:/Web/style');
const OUT = join(ROOT, 'deliverables', '63-test', 'data');
mkdirSync(OUT, { recursive: true });

const CASES = [
  'S03-long-exposure-observatory', 'S05-pixel-cold-storage-console', 'S10-grid-versus-sheet',
  'S14-zero-g-launch-sequence', 'S15-fishery-floor-ledger', 'S18-phosphor-service-deck',
  'S20-plotter-soundfield', 'S21-interlocking-release-book', 'S29-wire-bound-safety-manual',
];

const CJK = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/;
const CJK_ONLY = /[\u4e00-\u9fff]/;

// --- tiny HTML scanner: yields text segments and tags, skipping comments/doctype ---
export function scan(html) {
  const parts = [];
  let i = 0;
  const push = (kind, s, start) => parts.push({ kind, s, start });
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const e = html.indexOf('-->', i + 4);
      const end = e === -1 ? html.length : e + 3;
      push('comment', html.slice(i, end), i); i = end; continue;
    }
    if (html[i] === '<') {
      const e = html.indexOf('>', i);
      const end = e === -1 ? html.length : e + 1;
      const raw = html.slice(i, end);
      push(/^<(script|style)\b/i.test(raw) ? 'openraw' : (raw.startsWith('</') ? 'close' : 'open'), raw, i);
      i = end;
      const m = raw.match(/^<(script|style)\b/i);
      if (m) {
        const tag = m[1].toLowerCase();
        const close = html.toLowerCase().indexOf('</' + tag, i);
        const end2 = close === -1 ? html.length : close;
        push('raw', html.slice(i, end2), i);
        i = end2;
      }
      continue;
    }
    const n = html.indexOf('<', i);
    const end = n === -1 ? html.length : n;
    push('text', html.slice(i, end), i);
    i = end;
  }
  return parts;
}

export function attrsOf(tag) {
  const out = [];
  const body = tag.replace(/^<\/?[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(body))) out.push({ name: m[1].toLowerCase(), value: m[3] !== undefined ? m[3] : m[4] });
  const bare = /(^|\s)([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?=\s|$)/g;
  while ((m = bare.exec(body))) out.push({ name: m[2].toLowerCase(), value: null });
  return out;
}

// attributes whose value is *visible copy* (rasterised by CSS/AT) -> swap
const VISIBLE_ATTR = new Set(['alt', 'title', 'aria-label', 'aria-description', 'data-label', 'data-next', 'placeholder']);
// attributes that are machine keys -> never swap
const KEY_ATTR = new Set(['id', 'class', 'href', 'src', 'srcset', 'style', 'for', 'name', 'rel', 'type',
  'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'role', 'tabindex', 'lang', 'charset',
  'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-live', 'aria-hidden', 'aria-pressed',
  'aria-expanded', 'aria-current', 'loading', 'decoding', 'datetime', 'value', 'content', 'property',
  'data-ask', 'data-lock', 'data-excl', 'data-lever', 'data-angle', 'data-slot', 'data-year', 'data-layer',
  'data-part', 'data-chapter', 'data-back', 'data-code', 'data-flip', 'data-wood']);

const store = {};
for (const c of CASES) {
  const html = readFileSync(join(ROOT, 'prototypes', c, 'index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'prototypes', c, 'style.css'), 'utf8');
  const parts = scan(html);
  const texts = new Map();
  const attrVals = new Map();          // name -> Map(value -> count)
  const scriptCjk = [];
  const cssContent = [];
  for (const p of parts) {
    if (p.kind === 'text') {
      const t = p.s.trim();
      if (CJK.test(t)) texts.set(t, (texts.get(t) || 0) + 1);
    } else if (p.kind === 'open') {
      for (const a of attrsOf(p.s)) {
        if (!a.value || !CJK.test(a.value)) continue;
        if (KEY_ATTR.has(a.name)) continue;
        if (!attrVals.has(a.name)) attrVals.set(a.name, new Map());
        const m = attrVals.get(a.name);
        m.set(a.value, (m.get(a.value) || 0) + 1);
      }
    } else if (p.kind === 'raw') {
      const s = p.s;
      for (const m of s.matchAll(/(['"`])((?:[^'"`\\]|\\.){0,400}?)\1/g)) {
        if (CJK.test(m[2])) scriptCjk.push(m[2]);
      }
    }
  }
  for (const m of css.matchAll(/content:\s*("[^"]*")/g)) if (CJK.test(m[1])) cssContent.push(m[1]);
  // which attrs are read back by JS/CSS?
  const used = new Map();
  for (const [name, vals] of attrVals) {
    const probe = new RegExp(`getAttribute\\(\\s*['"]${name}['"]|dataset\\.${name.replace(/^data-/, '')}|attr\\(${name}\\)|\\[${name}[\\]=~|]`, 'g');
    const nJs = (html.match(probe) || []).length + (css.match(probe) || []).length;
    used.set(name, nJs);
  }
  store[c] = {
    textCount: texts.size, textTotal: [...texts.values()].reduce((a, b) => a + b, 0),
    attrCount: attrVals.size, scriptCjk: scriptCjk.length, cssContent: cssContent.length,
    cssContentSample: cssContent.slice(0, 8),
    attrs: [...used.entries()].map(([n, u]) => `${n}(x${u})`),
    attrsValues: Object.fromEntries([...attrVals].map(([n, m]) => [n, [...m.keys()].slice(0, 40)])),
    texts: [...texts].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n}× ${t}`),
  };
}

writeFileSync(join(OUT, 'inventory.json'), JSON.stringify(store, null, 1));
let lines = [];
for (const [c, d] of Object.entries(store)) {
  lines.push(`\n########## ${c}`);
  lines.push(`textNodes=${d.textCount} total=${d.textTotal} scriptStrings=${d.scriptCjk} cssContent=${d.cssContent}`);
  lines.push(`attrs: ${d.attrs.join(' ')}`);
  lines.push(`--- CSS content: ${JSON.stringify(d.cssContentSample)}`);
  lines.push('--- ATTRIBUTE VALUES (sample)');
  for (const [n, v] of Object.entries(d.attrsValues)) lines.push(`  [${n}] ${v.slice(0, 12).join(' | ')}`);
  lines.push('--- TEXT NODES');
  for (const t of d.texts) lines.push('  ' + t.replace(/\s+/g, ' '));
}
writeFileSync(join(OUT, 'inventory.txt'), lines.join('\n'));
console.log('wrote inventory: ' + join(OUT, 'inventory.txt'));
for (const [c, d] of Object.entries(store)) console.log(`${c}: texts=${d.textCount}/${d.textTotal} attrs=${d.attrs.join(',')} script=${d.scriptCjk} css=${d.cssContent}`);
