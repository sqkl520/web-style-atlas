// 探针 30：硬核验证 —— 标题写法变体全集 + 三条正则的覆盖/漏检/误检
import { readSpec, specIds } from './lib-load.mjs';

// 当前（已修）的三条正则
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const NOW = [
  { n: 'R1', re: new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm') },
  { n: 'R2', re: new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm') },
  { n: 'R3', re: new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm') },
];
// 修复前（HEAD）的正则：R1 的分隔符是可选的
const OLD = [
  { n: 'R1-old', re: new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm') },
  { n: 'R2', re: NOW[1].re }, { n: 'R3', re: NOW[2].re },
];

// 逐个枚举 30 份 md 里每一条“字段标题行”，按书写形态归类
const shapes = new Map();
const CHECKS = [];

for (const id of specIds()) {
  const text = readSpec(id);
  const L = text.split(/\r?\n/);
  let off = 0;
  for (let i = 0; i < L.length; i++) {
    const line = L[i];
    const stripped = line.replace(/\*\*/g, '');
    const m = /^(\d{1,2})(-附)?([.．])?\s*(\*\*)?\s*(.+?)(\*\*)?\s*([：:])/.exec(stripped);
    const m2 = /^\*\*(\d{1,2})(-附)?([.．])?\s*(.+?)\*\*\s*$/.exec(line);
    if (!m && !m2) { off += line.length + 1; continue; }
    // 归类书写形态
    let shape;
    const boldWhole = /^\*\*\d{1,2}(-附)?[.．]?\s/.test(line) && /\*\*\s*$/.test(line.trim());
    const boldName = /^\d{1,2}(-附)?[.．]?\s*\*\*/.test(line);
    const sep = (m && m[3]) || (m2 && m2[3]) || (/-附/.test(line) ? '-附' : '无');
    if (boldWhole) shape = `**N. 名字**（整行加粗独占）`;
    else if (boldName) shape = `N. **名字**：正文`;
    else shape = `N${sep === '-附' ? '-附' : sep === '无' ? '' : '.'} 名字：正文`;

    if (!shapes.has(shape)) shapes.set(shape, { cnt: 0, ids: new Set(), ex: '' });
    const s = shapes.get(shape); s.cnt++; s.ids.add(id); if (!s.ex) s.ex = line.slice(0, 60);
    off += line.length + 1;
  }
}

console.log('=== 字段标题的书写形态全集（按 starts 三条正则能认的形态）===');
for (const [k, v] of shapes) console.log(`x${v.cnt}\t${v.ids.size}案\t${k}\n        例: ${JSON.stringify(v.ex)}`);

// 关键：分别用 OLD 与 NOW 跑，比较字段 5 的结果
console.log('\n\n=== OLD(分隔符可选) vs NOW(分隔符必需) 对字段 5「布局与网格」的影响 ===');
console.log('案号\tOLD字段5长度\tNOW字段5长度\tOLD多出的伪字段');
const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
function run(res, text) {
  const s = [];
  for (const R of res) for (const m of text.matchAll(R.re)) s.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  s.sort((a, b) => a.i - b.i);
  const byLine = new Map();
  for (const x of s) { const ln = text.lastIndexOf('\n', x.i) + 1; if (!byLine.has(ln)) byLine.set(ln, x); }
  const st = [...byLine.values()].sort((a, b) => a.i - b.i);
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tm = tailRe.exec(text.slice(st.length ? st[0].i : 0));
  const tailAbs = tm && st.length ? st[0].i + tm.index : text.length;
  const f = {};
  for (let i = 0; i < st.length; i++) {
    const key = st[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < st.length ? st[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    if (key && !f[key]) f[key] = dec(text.slice(st[i].end, to));
  }
  return f;
}
for (const id of specIds()) {
  const t = readSpec(id);
  const a = run(OLD, t), b = run(NOW, t);
  const la = (a['布局与网格'] || '').length, lb = (b['布局与网格'] || '').length;
  const pseudo = Object.keys(a).filter((k) => !['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'].includes(k));
  if (la !== lb || pseudo.length) console.log(`${id}\t${la}\t${lb}\t${pseudo.map((p) => '"' + p.slice(0, 28) + '"').join(' ') || '—'}`);
}
