// 任务 1 探针 J：**严格口径**统计 —— 桌面(base)之外的 @media 值算不算"编造"。
//
// 这是本轮最关键的判定分歧，必须两套数都报：
//   口径 P（宽松）：媒体查询里的值在原型里"确实存在" → 不算编造。现行 0/30 编造。
//   口径 Q（严格）：提示词说的是"全站只用这几级"，媒体查询值只在小屏成立
//                   → 写进全站陈述即失真。此口径下 S27 的 1.2/2.4 是编造。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();
const r2 = (n) => Math.round(n * 100) / 100;

function scoped(dir) {
  const raw = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const html = readFileSync(join(P, dir, 'index.html'), 'utf8');
  const lines = raw.split('\n');
  // 顶层 :root
  const baseVars = {};
  const noC = raw.replace(/\/\*[\s\S]*?\*\//g, (s) => ' '.repeat(s.length));
  const m0 = noC.match(/(?:^|\n):root\s*\{([\s\S]*?)\}/);
  if (m0) for (const d of m0[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) baseVars[d[1]] = d[2].trim();
  const expand = (v, d = 0) => (d > 6 || !/var\(/.test(v)) ? v :
    expand(v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) =>
      baseVars[n] !== undefined ? baseVars[n] : fb !== undefined ? fb : 'UNRES'), d + 1);
  const calc = (v) => v
    .replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (_, a, b) => r2(+a * +b) + 'px')
    .replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (_, a, b) => r2(+a * +b) + 'px');

  const mqOf = (() => {
    const res = new Array(lines.length + 1).fill(null);
    let depth = 0; const st = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const o = (ln.match(/\{/g) || []).length, c = (ln.match(/\}/g) || []).length;
      if (/^\s*@media/.test(ln)) st.push({ d: depth + o, text: ln.trim() });
      for (let k = 0; k < c; k++) if (st.length && depth + o - k <= st[st.length - 1].d - 1) st.pop();
      depth += o - c;
      res[i + 1] = st.length ? st[st.length - 1].text : null;
    }
    return res;
  })();

  const base = new Set(), mq = new Set();
  const push = (set, n) => { if (n > 0) set.add(r2(n)); };
  for (const m of noC.matchAll(/(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g)) {
    const prop = m[0].slice(0, m[0].indexOf(':')).trim();
    const ln = noC.slice(0, m.index).split('\n').length;
    const tgt = mqOf[ln] ? mq : base;
    const v = calc(expand(m[1]));
    if (/UNRES/.test(v)) continue;
    if (/stroke-width/i.test(prop)) {
      const b = v.trim().match(/^([0-9.]+)$/); if (b) push(tgt, +b[1]);
      for (const q of v.matchAll(/([0-9.]+)px/g)) push(tgt, +q[1]);
    } else for (const q of v.matchAll(/([0-9.]+)px/g)) push(tgt, +q[1]);
  }
  for (const src of [html, raw]) for (const m of src.matchAll(/stroke-width(?:=|%3D|:)\s*['"]?(%?[0-9.]+)/gi)) {
    const n = r2(+decodeURIComponent(m[1])); if (n > 0) base.add(n);
  }
  return { base: [...base].sort((a, b) => a - b), mq: [...mq].sort((a, b) => a - b) };
}

const S = {};
for (const d of dirs) S[d.slice(0, 3)] = scoped(d);

const dump = JSON.parse(readFileSync(join(OUT, 'dump30.json'), 'utf8'));
const rows = [];
for (const id of Object.keys(S)) {
  const t = dump.prompts[id] || '';
  const lm = t.match(/5\. 线宽只用这几级：([^，]+)，/);
  const claimed = lm ? [...lm[1].matchAll(/([0-9.]+)px/g)].map((m) => r2(+m[1])) : [];
  const inBase = (v) => S[id].base.some((x) => Math.abs(x - v) < 0.011);
  const inMq = (v) => S[id].mq.some((x) => Math.abs(x - v) < 0.011);
  const phantomStrict = claimed.filter((v) => !inBase(v));         // 严格：桌面不存在
  const phantomLoose = phantomStrict.filter((v) => !inMq(v));      // 宽松：哪儿都不存在
  const omitted = S[id].base.filter((v) => !claimed.some((x) => Math.abs(x - v) < 0.011));
  rows.push({ id, claimed, base: S[id].base, mq: S[id].mq, phantomStrict, phantomLoose, omitted });
}
writeFileSync(join(OUT, 't1-strict.json'), JSON.stringify(rows, null, 1), 'utf8');

console.log('id   声称                  桌面真值              仅窄屏(mq)           严格编造  宽松编造  漏讲');
for (const r of rows) {
  console.log(r.id.padEnd(4), r.claimed.join(',').padEnd(21), r.base.join(',').padEnd(21), r.mq.join(',').padEnd(20),
    (r.phantomStrict.join(',') || '—').padEnd(9), (r.phantomLoose.join(',') || '—').padEnd(9), r.omitted.join(',') || '—');
}
const cS = rows.filter((r) => r.phantomStrict.length).length;
const cL = rows.filter((r) => r.phantomLoose.length).length;
const cO = rows.filter((r) => r.omitted.length).length;
console.log('\n严格口径有编造的案：', cS, '/30');
console.log('宽松口径有编造的案：', cL, '/30');
console.log('有漏讲的案        ：', cO, '/30');
console.log('完全正确的案      ：', rows.filter((r) => !r.phantomLoose.length && !r.omitted.length).length, '/30');
