// 逐案复算：:root 里声明的唯一色 vs 提示词 palette 里列的色，差哪些。
// 关键是只算「生效声明」，不算注释（红队指出我之前把注释里的色当声明了）。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const c = { window: {} }; vm.createContext(c);
vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'), c);
const P = c.window.STYLE_PROMPTS.schemes;
const byId = Object.fromEntries(P.map((s) => [s.id, s]));

const dirs = readdirSync(join(ROOT, 'prototypes')).filter((d) => /^S\d{2}-/.test(d)).sort();
let totalLost = 0;
const rows = [];
for (const d of dirs) {
  const id = d.slice(0, 3);
  const cssPath = join(ROOT, 'prototypes', d, 'style.css');
  const css = readFileSync(cssPath, 'utf8');
  // 只取 :root 块，且**剥掉注释**——红队指出注释里的色不是声明
  const rootM = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootM) { rows.push([id, '—', '无 :root']); continue; }
  const decls = rootM[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
  const rootHexes = new Set([...decls.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()));
  // 提示词 palette 里的 hex
  const pal = (byId[id] && byId[id].dna && byId[id].dna.palette) || '';
  const palHexes = new Set([...pal.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()));
  const lost = [...rootHexes].filter((h) => !palHexes.has(h));
  totalLost += lost.length;
  rows.push([id, rootHexes.size + '→' + palHexes.size, lost.length ? '丢 ' + lost.join(' ') : '全在']);
}
for (const r of rows) console.log(r[0].padEnd(4), String(r[1]).padStart(7), ' ', r[2]);
console.log('\n全库总计丢色:', totalLost, '个');
const bad = rows.filter((r) => /丢/.test(r[2]));
console.log('有丢色的案:', bad.length, '个 ——', bad.map((r) => r[0]).join(' '));
