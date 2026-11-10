// 探针 3：逐案列出所有 starts（行号 + key + 所属正则），标出可疑/空 key
import { readSpec, specIds } from './lib-load.mjs';

const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  { n: 'R1', re: new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm') },
  { n: 'R2', re: new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm') },
  { n: 'R3', re: new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm') },
];
const lines = (t) => t.split(/\r?\n/);

for (const id of specIds()) {
  const text = readSpec(id);
  const L = lines(text);
  const offs = []; let acc = 0;
  for (const l of L) { offs.push(acc); acc += l.length + 1; }
  const lineOf = (idx) => { let k = 0; while (k + 1 < offs.length && offs[k + 1] <= idx) k++; return k + 1; };

  const hits = [];
  for (const R of RES) for (const m of text.matchAll(R.re)) hits.push({ i: m.index, num: m[1], ext: m[2] || '', key: m[3], by: R.n });
  hits.sort((a, b) => a.i - b.i);
  const seen = new Set(); const d = [];
  for (const h of hits) { const ln = lineOf(h.i); if (seen.has(ln)) continue; seen.add(ln); d.push({ ...h, ln }); }

  const out = d.map((h) => `${h.ln}:${h.by}:${h.num}${h.ext}:"${h.key.slice(0, 30)}"`);
  const suspicious = d.filter((h) => !h.key.trim() || /^\d/.test(h.key) || /[，。；]/.test(h.key));
  console.log(`${id} starts=${d.length}${suspicious.length ? '  ⚠可疑:' + suspicious.map((s) => s.ln + '/"' + s.key.slice(0, 24) + '"').join(' ') : ''}`);
  console.log('   ' + out.join('  '));
}
