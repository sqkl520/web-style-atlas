// A1: does buildPrompt('S19') NOW contain #4A5C3A? And what does the prompt's palette
// claim vs what S19's style.css :root actually declares?
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeCtx, SEL, ROOT, hexes } from './lib.mjs';

const win = makeCtx();
const ids = win.SCHEMES.map((s) => s.id);
const out = { head: null, s19: {}, all: [] };

for (const id of ids) {
  const prompt = win.buildStylePrompt(id);
  const css = readFileSync(join(ROOT, 'prototypes', win.SCHEMES.find((s) => s.id === id).dir || id, 'style.css'), 'utf8');
  const ph = hexes(prompt);
  const ch = hexes(css);
  out.all.push({ id, promptLen: [...prompt].length, promptHexes: ph, cssHexes: ch.slice(0, 40), cssHexCount: ch.length });
}
const s19 = out.all.find((r) => r.id === 'S19');
out.s19 = {
  promptLen: s19.promptLen,
  has4A5C3A: s19.promptHexes.includes('#4A5C3A'),
  promptHexes: s19.promptHexes,
  cssHexes: s19.cssHexes,
};
out.paletteLineS19 = (win.buildStylePrompt('S19').match(/[^\n]*配色[^\n]*/g) || []);
out.head = { schemeCount: ids.length, ids };
console.log(JSON.stringify(out, null, 1));
