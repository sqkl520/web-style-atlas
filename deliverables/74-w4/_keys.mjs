// 只读验证：把 'mechanism' 加进 check-prompts.mjs:379 的 KEY_FIELDS，会立刻红还是会静默通过？
import { readFileSync } from 'node:fs';
const sb = { window: {} };
new Function('window', readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;

const raw = JSON.parse(readFileSync('D:/Web/style/prototypes/_prompts/dna-clean.json', 'utf8'));
const arr = Array.isArray(raw) ? raw : Object.values(raw);
const byId = new Map(arr.map((e) => [e.id, e]));

let same = 0, diff = 0, missing = 0;
const diffs = [];
for (const sp of P.schemes) {
  const dc = byId.get(sp.id);
  if (!dc) { missing++; continue; }
  const a = dc.mechanism;
  const b = sp.dna && sp.dna.mechanism;
  if (a === undefined || b === undefined) { missing++; continue; }
  if (String(a) === String(b)) same++;
  else { diff++; diffs.push({ id: sp.id, clean: String(a).slice(0, 40), prompt: String(b).slice(0, 40) }); }
}
console.log(`mechanism 逐案比对：same=${same}  diff=${diff}  missing=${missing}（共 ${P.schemes.length}）`);
for (const d of diffs) console.log(`  ${d.id}\n    dna-clean: ${d.clean}\n    prompts  : ${d.prompt}`);

// 同时看 mechanismSource 在 prompts.js 里是否存在（build-prompts 只在补的那 20 条写）
const withSrc = P.schemes.filter((s) => s.dna && s.dna.mechanismSource !== undefined).length;
console.log(`\nprompts.js 里带 dna.mechanismSource 的案：${withSrc}/30`);
console.log(`dna-clean.json 里带 mechanismSource 的案：${arr.filter((e) => e.mechanismSource !== undefined).length}/30`);
