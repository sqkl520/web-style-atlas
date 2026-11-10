import { loadCtx } from '../../69-plan/_lib.mjs';
import { writeFileSync } from 'node:fs';
const ctx = loadCtx();
const P = ctx.window.STYLE_PROMPTS;
const out = [];
for (const s of P.schemes) {
  const prompt = ctx.window.buildStylePrompt(s.id);
  out.push({ id: s.id, palette: s.dna.palette, lineWidths: s.dna.lineWidths, h1Size: s.dna.h1Size, radius: s.dna.radius, shadow: s.dna.shadow, fonts: s.dna.fonts, len: prompt.length, prompt });
}
writeFileSync('deliverables/70-plan/redteam/prompts30.json', JSON.stringify(out, null, 1));
console.log('n=', out.length);
for (const r of out) console.log(r.id, '| palette:', r.palette, '| len:', r.len);

