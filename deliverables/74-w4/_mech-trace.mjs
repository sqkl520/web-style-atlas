// 只读诊断：复刻 deliverables/74-recon/_mech.mjs 的判据，逐 token 打印命中位置。
import { readFileSync } from 'node:fs';
const root = 'D:/Web/style/prototypes/';
const sb = { window: {} };
new Function('window', readFileSync(root + '_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;

const TOKEN_RE = /(\d+(?:\.\d+)?)\s*(px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em)/g;

for (const id of ['S07', 'S09', 'S13', 'S17', 'S03']) {
  const s = P.schemes.find((x) => x.id === id);
  const dir = root + s.dir;
  let blob = '';
  try { blob += readFileSync(dir + '/style.css', 'utf8'); } catch {}
  try { blob += readFileSync(dir + '/index.html', 'utf8'); } catch {}
  blob = blob.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = s.dna.mechanism || '';
  const toks = [...m.matchAll(TOKEN_RE)].map((x) => x[0].replace(/\s+/g, ''));
  console.log(`\n== ${id}  mech: ${m}`);
  console.log(`   tokens: ${toks.join(' | ')}`);
  for (const t of toks) {
    const num = t.match(/[\d.]+/)[0];
    const unit = t.slice(num.length);
    const n = num.replace('.', '\\.');
    let pats = [];
    if (unit === '度' || unit === '°' || unit === 'deg') {
      pats = [new RegExp(n + '\\s*(?:°|deg|度)'), new RegExp('rotate\\(\\s*' + n), new RegExp(n + 'deg')];
    } else if (unit === '栏' || unit === '列') {
      pats = [new RegExp(n + '\\s*(?:栏|列)'), new RegExp('repeat\\(\\s*' + n + '\\b'),
              new RegExp('span\\s+' + n + '\\b'), new RegExp('grid-column[^;]*' + n), new RegExp('grid-template[^;]*' + n)];
    } else if (unit === '枚' || unit === '档' || unit === '级') {
      pats = [new RegExp(n + '\\s*(?:枚|档|级)'), new RegExp('repeat\\(\\s*' + n + '\\b'),
              new RegExp('--[a-z-]*' + n + '\\b'), new RegExp(n + '\\s*(?:条|个)')];
    } else if (unit === '秒') {
      pats = [new RegExp(n + '\\s*(?:s|秒|ms)')];
    } else {
      pats = [new RegExp(n + '\\s*' + unit)];
    }
    let which = null, sample = null;
    for (const p of pats) {
      const re = new RegExp(p.source, 'g');
      const found = [...blob.matchAll(re)];
      if (found.length) { which = p.source; sample = found.slice(0, 3).map((x) => JSON.stringify(x[0])); break; }
    }
    if (which) console.log(`   ${t.padEnd(7)} PASS  via /${which}/  ${sample.join(' ')}`);
    else console.log(`   ${t.padEnd(7)} MISS`);
  }
}
