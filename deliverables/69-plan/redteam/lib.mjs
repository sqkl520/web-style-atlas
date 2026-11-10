// Load the selection-app model layer (prompts.js + prompt-copy.js + data.js) in plain Node,
// with a minimal fake `window`, so buildPrompt() can be exercised without a browser.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = 'D:\\Web\\style';
export const SEL = join(ROOT, 'prototypes', '_selection');

export function makeCtx() {
  const win = {};
  globalThis.window = win;
  // prompt-copy.js ends with a DOM-ready mount; stub enough that it no-ops.
  const stubEl = () => ({
    style: {}, className: '', innerHTML: '', textContent: '',
    appendChild() {}, addEventListener() {}, setAttribute() {}, remove() {},
    classList: { add() {}, remove() {}, toggle() {} },
  });
  const doc = {
    readyState: 'complete',
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: stubEl,
    addEventListener() {},
    body: stubEl(),
  };
  win.document = doc;
  globalThis.document = doc;
  const load = (name) => {
    const p = join(SEL, name);
    const src = readFileSync(p, 'utf8');
    const fn = new Function('window', 'globalThis', 'document', src + '\n//# sourceURL=' + name);
    fn(win, globalThis, doc);
  };
  load('prompts.js');
  load('data.js');
  load('prompt-copy.js');
  return win;
}

export const norm = (s) => String(s).replace(/\r\n/g, '\n');

// Pull every #RRGGBB / #RGB literal in declaration order (deduped, case-insensitive).
export function hexes(text) {
  const out = [];
  const seen = new Set();
  const re = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;
  let m;
  while ((m = re.exec(text))) {
    const h = m[0].toUpperCase();
    if (!seen.has(h)) { seen.add(h); out.push(h); }
  }
  return out;
}

export function readOrNull(p) { return existsSync(p) ? readFileSync(p, 'utf8') : null; }
