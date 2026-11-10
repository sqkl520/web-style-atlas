/* plan-probe-spec2.mjs — 只读：把 30 份规格的字段 5 开头打出来，
 * 用来判断「栏数」这条到底能不能靠一条正则稳定抽出。
 * 结论会写进 PLAN 的 P3 节。 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');

const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
function specFields(text) {
  const starts = [];
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'))) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  starts.sort((a, b) => a.i - b.i);
  const out = {};
  for (let k = 0; k < starts.length; k++) {
    const key = starts[k].key.replace(/（[^）]*）/g, '').trim();
    const to = k + 1 < starts.length ? starts[k + 1].i : text.length;
    if (key && !out[key]) out[key] = text.slice(starts[k].end, to);
  }
  return out;
}

console.log('═══ P3 · 字段 5「布局与网格」开头的 100 字（30 案）═══\n');
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const f = specFields(readFileSync(join(P, '_specs', id + '.md'), 'utf8'));
  const t = (f['布局与网格'] || '').replace(/\s+/g, ' ').trim();
  console.log(`${id} | ${t.slice(0, 100)}`);
}

console.log('\n═══ 字段 3「配色系统」是否含「面积和 100」／含几个 hex ═══\n');
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const f = specFields(readFileSync(join(P, '_specs', id + '.md'), 'utf8'));
  const t = (f['配色系统'] || '').replace(/\s+/g, ' ');
  const pcts = [...t.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
  const main = (() => {
    for (const seg of t.split(/[；。\n]/)) {
      if (!/主色/.test(seg)) continue;
      if (/(反的是|反\s|不采用|修正前|不是|禁止|不新增|旧值|避免|不用)/.test(seg)) continue;
      const m = seg.match(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/);
      if (m) return '#' + m[1].toUpperCase();
    }
    return null;
  })();
  console.log(`${id} | 面积和100=${/面积和\s*100/.test(t) ? 'Y' : 'N'} | %数=${pcts.length} | 主色=${main || '—'}`);
}
