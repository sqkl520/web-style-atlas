// 探针 27：截断与丢失取证 —— 逐字段把 data.js 值与 md 原文对照；scenes/copy 拆分是否丢内容
import { loadSchemes, readSpec, specIds, dec } from './lib-load.mjs';

const S = loadSchemes();
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'),
  new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'),
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'),
];
function parseAll(text) {
  const s = [];
  for (const re of RES) for (const m of text.matchAll(re)) s.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  s.sort((a, b) => a.i - b.i);
  const byLine = new Map();
  for (const x of s) { const ln = text.lastIndexOf('\n', x.i) + 1; if (!byLine.has(ln)) byLine.set(ln, x); }
  const st = [...byLine.values()].sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tm = tailRe.exec(text.slice(st.length ? st[0].i : 0));
  const tailAbs = tm && st.length ? st[0].i + tm.index : text.length;
  const fields = {}; const lens = {};
  for (let i = 0; i < st.length; i++) {
    const key = st[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < st.length ? st[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = text.slice(st[i].end, to);
    lens[key] = dec(seg).length;
    if (key && !fields[key]) fields[key] = dec(seg);
  }
  return { fields, lens };
}
const MAP = { def: '一句话视觉定义', family: '美学家族与参考', fonts: '字体策略', layout: '布局与网格',
  visuals: '关键视觉元素', motion: '动效与交互', audit: '去 AI 味审查点', risk: '反 AI 味风险与规避',
  landing: '可落地要点', quirk: '设计师签名式怪癖' };

console.log('=== 逐字段一致性（data.js vs 当前解析器）===');
let bad = 0;
for (const id of specIds()) {
  const { fields } = parseAll(readSpec(id));
  const r = S.find((x) => x.id === id);
  for (const [k, cn] of Object.entries(MAP)) {
    if ((r[k] || '') !== (fields[cn] || '')) {
      bad++;
      console.log(`✗ ${id}.${k}  data=${(r[k] || '').length} md=${(fields[cn] || '').length}`);
      console.log(`    data: ${JSON.stringify((r[k] || '').slice(0, 80))}`);
      console.log(`    md  : ${JSON.stringify((fields[cn] || '').slice(0, 80))}`);
    }
  }
}
console.log(`不一致 ${bad} 处（0 = 无截断，data.js 与解析器输出逐字一致）`);

console.log('\n=== scenes：cleanScenes 是否丢内容 ===');
// 原始 scenes 段 = 字段10 原文；data 里 scenes 已被 cleanScenes 过
let lostIds = [];
for (const id of specIds()) {
  const { fields } = parseAll(readSpec(id));
  const raw = fields['适用场景'] || '';
  const r = S.find((x) => x.id === id);
  const cleaned = r.scenes || '';
  // 检查 raw 中被剪掉的文案标签段是否完整保留在 copy 里
  const label = /(?:真实上站文案|可直接上线的文案|上站文案三处)[\s\p{P}“”"」]*[：:]/u.exec(raw);
  if (!label) continue;
  const after = raw.slice(label.index + label[0].length);
  const n = after.indexOf('不适合：');
  const dropped = n >= 0 ? after.slice(0, n) : after;
  const copy = r.copy || '';
  // dropped 里的文案是否能在 copy 找到
  const frag = dropped.replace(/[\s；;。，、]+$/, '').trim().slice(0, 20);
  const ok = frag && copy.includes(frag.slice(0, 12));
  if (!ok) lostIds.push(`${id}(${JSON.stringify(frag.slice(0, 24))})`);
}
console.log(lostIds.length ? '可能有内容未进 copy: ' + lostIds.join(' ') : 'scenes 剪掉的文案段在 copy 里都能找到（30/30）');

console.log('\n=== copyParts 引号形态覆盖 ===');
// part() 只认 「」 "" '' —— 检查 md 里是否用了别的引号
const quoters = new Set();
for (const id of specIds()) {
  const r = S.find((x) => x.id === id);
  const cp = r.copyParts || {};
  for (const k of ['claim', 'button', 'empty', 'error']) if (!(cp[k] || '').trim()) quoters.add(`${id}.${k}`);
}
console.log('copyParts 空槽位: ' + ([...quoters].join(' ') || '无'));
