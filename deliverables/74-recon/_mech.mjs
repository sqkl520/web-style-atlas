import { readFileSync } from 'node:fs';
const root = 'D:/Web/style/prototypes/';
const sandbox = { window: {} };
new Function('window', readFileSync(root + '_selection/prompts.js', 'utf8'))(sandbox.window);
const P = sandbox.window.STYLE_PROMPTS;
const rows = [];
for (const s of P.schemes) {
  const dir = root + s.dir;
  let blob = '';
  try { blob += readFileSync(dir + '/style.css', 'utf8'); } catch {}
  try { blob += readFileSync(dir + '/index.html', 'utf8'); } catch {}
  blob = blob.replace(/\/\*[\s\S]*?\*\//g, '');
  const m = s.dna.mechanism || '';
  const toks = [...m.matchAll(/(\d+(?:\.\d+)?)\s*(px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em)/g)]
    .map(x => x[0].replace(/\s+/g, ''));
  const miss = [];
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
    if (!pats.some(p => p.test(blob))) miss.push(t);
  }
  rows.push([s.id, toks.length, miss.length, miss.slice(0, 5).join(' ')]);
}
rows.sort((a, b) => b[2] - a[2]);
for (const r of rows) console.log(r[0].padEnd(4), String(r[1]).padStart(3), String(r[2]).padStart(4), '  ', r[3]);
let t = 0, mi = 0;
for (const r of rows) { t += r[1]; mi += r[2]; }
console.log('TOTAL tokens', t, 'missing', mi, (100 * mi / t).toFixed(1) + '%');
