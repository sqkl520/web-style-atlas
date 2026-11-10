// 探针 2：逐字复刻 collect-schemes.mjs 的 parseSpec 切分逻辑（只读），
// 回答一个问题：FIELDS 里声明的 13 项，有几项**真的**出现在 spec.fields 里？
// 特别是「机制」—— 它到底被解析出来了、还是连键都没生成。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, PROTO } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const FIELDS = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];

// —— 下面这段与 collect-schemes.mjs L138-169 等价（注释略）——
function parseStarts(text) {
  const starts = [];
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3], raw: m[0] });
  }
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3], raw: m[0] });
  }
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3], raw: m[0] });
  }
  starts.sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts.length ? starts[0].i : 0));
  const tailAbs = tailM && starts.length ? starts[0].i + tailM.index : text.length;
  const fields = {};
  const dropped = [];
  for (let i = 0; i < starts.length; i++) {
    const rawKey = starts[i].key;
    const key = rawKey.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = text.slice(starts[i].end, to);
    if (key && !fields[key]) fields[key] = dec(seg);
    else dropped.push({ rawKey, key, head: dec(seg).slice(0, 50), len: dec(seg).length, raw: starts[i].raw.trim() });
  }
  return { fields, dropped, starts };
}

const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name.slice(0, 3)).sort();

console.log('=== FIELDS 声明 13 项，逐项统计「在 spec.fields 里真实存在的案数」 ===');
const tally = {};
for (const f of FIELDS) tally[f] = 0;
const keyUniverse = {};
const perCase = [];
for (const id of ids) {
  const text = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const { fields, dropped } = parseStarts(text);
  for (const f of FIELDS) if (fields[f] && fields[f].length) tally[f]++;
  for (const k of Object.keys(fields)) keyUniverse[k] = (keyUniverse[k] || 0) + 1;
  perCase.push({ id, fields, dropped });
}
for (const f of FIELDS) console.log(String(tally[f]).padStart(2) + '/30  ' + (tally[f] === 0 ? '❌ ' : tally[f] === 30 ? '✅ ' : '⚠ ') + f);

console.log('');
console.log('=== spec.fields 里实际出现过的所有键（案数） ===');
for (const [k, n] of Object.entries(keyUniverse).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(2) + '/30  ' + JSON.stringify(k));

console.log('');
console.log('=== 被丢弃的 starts（key 被括号剥离后为空 → 整段蒸发） ===');
for (const { id, dropped } of perCase) {
  for (const d of dropped) {
    console.log(`${id}  raw=${JSON.stringify(d.raw)}  rawKey=${JSON.stringify(d.rawKey)}  →key=${JSON.stringify(d.key)}  len=${d.len}  head=${JSON.stringify(d.head)}`);
  }
}

console.log('');
console.log('=== 「去 AI 味审查点」每案字数 ===');
let total = 0;
for (const { id, fields } of perCase) {
  const v = fields['去 AI 味审查点'] || '';
  total += v.length;
  console.log(`${id}  ${String(v.length).padStart(4)}  ${v.slice(0, 30)}`);
}
console.log('合计（含空白按 1 计）: ' + total);

console.log('');
console.log('=== 「机制」键是否存在 ===');
console.log(perCase.filter((c) => c.fields['机制']).length + '/30 案存在 fields["机制"]');
