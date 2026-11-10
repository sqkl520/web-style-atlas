// 探针 5：specs 源头 —— 13 字段在 30 个 md 里的实际出现率、字段标题写法变体、字段 8 体量
import { readSpec, specIds, dec } from './lib-load.mjs';

const ids = specIds();
const CANON = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素',
  '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];

// ── A. 每种字段的“标题行原文写法”变体（按字段名归组）──
const byField = new Map(CANON.map((f) => [f, new Map()]));
const mechLines = [];
for (const id of ids) {
  const text = readSpec(id);
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l) continue;
    // 找出该行像不像某个字段标题
    for (const f of CANON) {
      const bare = f.replace(/\s/g, '');
      // 允许“去 AI 味审查点（≥3 条）”这类后缀
      const re = new RegExp('^(\\*\\*)?(\\d{1,2})(-附)?[.．]?\\s*(\\*\\*)?' + f.slice(0, 4).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (!re.test(l.replace(/\s/g, '').replace(/^(\*\*)?(\d{1,2})(-附)?[.．]?/, (s) => s)) &&
          !l.replace(/\s/g, '').includes(bare.slice(0, 4)) ) continue;
      if (!/^(\*\*)?\d{1,2}(-附)?[.．]?/.test(l.replace(/\s/g, ''))) continue;
      if (!l.replace(/\s/g, '').includes(bare.slice(0, 4))) continue;
      // 归一化形状：编号→<N>，字段名→<NAME>，保留加粗/冒号位置
      let shape = l
        .replace(/^\*\*/, '<B>').replace(/\*\*$/, '</B>')
        .replace(/^(\*\*)?(\d{1,2})(-附)?[.．]?/, (s) => s.replace(/\d{1,2}/, '<N>'))
        .replace(new RegExp(f + '[^：:*\\n]*'), '<NAME>')
        .replace(/[：:]/, '<C>');
      const short = shape.length > 60 ? shape.slice(0, 60) + '…' : shape;
      const m = byField.get(f);
      if (!m.has(short)) m.set(short, { ids: new Set(), ex: l.slice(0, 70) });
      m.get(short).ids.add(id);
    }
    if (/^(\*\*)?\d{1,2}-附/.test(l.replace(/\s/g, ''))) mechLines.push({ id, l: l.slice(0, 60) });
  }
}

console.log('=== A. 每个字段在 md 里的标题写法变体 ===');
for (const f of CANON) {
  const m = byField.get(f);
  console.log(`\n[${f}]  ${m.size} 种写法`);
  for (const [k, v] of m) console.log(`   x${v.ids.size}案 ${v.ids.size < 30 ? '[' + [...v.ids].join(' ') + ']' : ''}  ${JSON.stringify(v.ex)}`);
}

console.log('\n=== B. “机制”在 md 里的实际载体（-附 行）===');
for (const x of mechLines) console.log(`  ${x.id}  ${x.l}`);
console.log('  合计 ' + mechLines.length + ' 处；涉及案：' + [...new Set(mechLines.map((x) => x.id))].join(' '));

// ── C. 字段 8 体量：按案统计字数 ──
console.log('\n=== C. 字段 8「去 AI 味审查点」体量（按 starts 切分后的 dec 正文长度）===');
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'),
  new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'),
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'),
];
function parseFields(text) {
  const starts = [];
  for (const re of RES) for (const m of text.matchAll(re)) starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  starts.sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts.length ? starts[0].i : 0));
  const tailAbs = tailM && starts.length ? starts[0].i + tailM.index : text.length;
  const fields = {};
  for (let i = 0; i < starts.length; i++) {
    const key = starts[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    if (key && !fields[key]) fields[key] = dec(text.slice(starts[i].end, to));
  }
  return fields;
}
const rows = [];
for (const id of ids) {
  const f = parseFields(readSpec(id));
  const v = f['去AI味审查点'] || f['去 AI 味审查点'] || '';
  // 数条目：①②③④ 或 （1）（2）
  const n1 = (v.match(/[①②③④⑤⑥⑦⑧⑨]/g) || []).length;
  const n2 = (v.match(/（\d）|\(\d\)/g) || []).length;
  rows.push({ id, len: v.length, items: Math.max(n1, n2), has: !!v });
}
console.log('案号\t字数\t条目数');
for (const r of rows) console.log(`${r.id}\t${r.len}\t${r.items}`);
const g1 = rows.filter((r) => +r.id.slice(1) <= 10);
const g2 = rows.filter((r) => +r.id.slice(1) >= 11 && +r.id.slice(1) <= 20);
const g3 = rows.filter((r) => +r.id.slice(1) >= 21);
const avg = (a) => Math.round(a.reduce((s, r) => s + r.len, 0) / a.length);
console.log(`\nS01–S10 平均 ${avg(g1)} 字（min ${Math.min(...g1.map(r=>r.len))} / max ${Math.max(...g1.map(r=>r.len))}）`);
console.log(`S11–S20 平均 ${avg(g2)} 字（min ${Math.min(...g2.map(r=>r.len))} / max ${Math.max(...g2.map(r=>r.len))}）`);
console.log(`S21–S30 平均 ${avg(g3)} 字（min ${Math.min(...g3.map(r=>r.len))} / max ${Math.max(...g3.map(r=>r.len))}）`);
console.log(`全库合计 ${rows.reduce((s, r) => s + r.len, 0)} 字`);

// ── D. 规则编号引用 ──
console.log('\n=== D. 字段 8 里引用的规则编号 ===');
const pats = {
  'C-x.y': /C-\d+\.\d+/g,
  'C-x 第 y 条': /C-\d+\s*第\s*\d+\s*条/g,
  'PN (P\d)': /\bP\d+\b/g,
  '0X-xxx': /\b\d{2}-[A-Za-z0-9]+/g,
  'R-xx': /R-\d+/g,
  'M-xx': /M-\d+/g,
  'Q-xx': /Q-\d+/g,
  'MR-x': /MR-\d+/g,
  'F-xx/x': /\bF\d+\b/g,
};
for (const [name, re] of Object.entries(pats)) {
  const all = [];
  for (const id of ids) {
    const f = parseFields(readSpec(id));
    const v = f['去AI味审查点'] || f['去 AI 味审查点'] || '';
    for (const m of v.matchAll(re)) all.push({ id, t: m[0] });
  }
  console.log(`${name}: ${all.length} 处  ${all.slice(0, 40).map((x) => x.id + ':' + x.t).join(' ')}`);
}
