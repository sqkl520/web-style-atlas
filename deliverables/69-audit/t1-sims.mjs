// 任务 1 探针 D：三种修法各自的「提示词线宽行」会变成什么，并用统一验证器复算通过数。
//
// 修法定义（全部只改抽取与文案，不动任何原型）：
//   (a) 只补抽取：把 HTML 内联 stroke-width 也扫进 lineWidths（CSS stroke 已在内）。
//   (b) (a) + 按真实级数生成那句话（1 级→「只用 1 级」；2 级→「只用 A、B 两级」；N 级→列举，
//       不再说「不要自创第三级」当级数≠3 时）。
//   (c) 彻底改语义：拆成「CSS border 线宽」与「SVG 描边宽度」两句，各自自洽。
//
// 验证器口径（"线宽行是否为真"）：提示词里出现的每一个 px 数字，
//   都必须在「原型里真的存在」的集合中（border/outline px ∪ CSS stroke ∪ HTML 内联 stroke）。
//   且：原型里真实存在、且承担视觉作用的描边级数，若被提示词整段漏掉 → 也算不通过（漏报）。
//   这就是上一轮我判 FAIL 的口径，这里逐字沿用，保证可比。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const r2 = (n) => Math.round(n * 100) / 100;
const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();

function rootVars(css) {
  const vars = {};
  for (const m of css.matchAll(/:root\s*\{([\s\S]*?)\}/g))
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
  return vars;
}
function expand(v, vars, d = 0) {
  if (d > 6 || !/var\(/.test(v)) return v;
  const s = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) =>
    vars[n] !== undefined ? vars[n] : fb !== undefined ? fb : 'UNRES');
  return expand(s, vars, d + 1);
}
const calc = (v) => v
  .replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (_, a, b) => r2(+a * +b) + 'px')
  .replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (_, a, b) => r2(+a * +b) + 'px');

const cases = {};
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = readFileSync(join(P, dir, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const html = readFileSync(join(P, dir, 'index.html'), 'utf8');
  const vars = rootVars(readFileSync(join(P, dir, 'style.css'), 'utf8'));

  const border = new Set();   // 修法 c 的「CSS border 线宽」
  const cssStroke = new Set(); // CSS 里的 stroke-width
  const inline = new Set();    // HTML 内联 / data-URI 的 stroke-width

  for (const m of css.matchAll(/(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g)) {
    const prop = m[0].slice(0, m[0].indexOf(':')).trim();
    const v = calc(expand(m[1], vars));
    if (/stroke-width/i.test(prop)) {
      const bare = v.trim().match(/^([0-9.]+)$/);
      if (bare && +bare[1] > 0) cssStroke.add(r2(+bare[1]));
      for (const q of v.matchAll(/([0-9.]+)px/g)) if (+q[1] > 0) cssStroke.add(r2(+q[1]));
    } else {
      for (const q of v.matchAll(/([0-9.]+)px/g)) if (+q[1] > 0) border.add(r2(+q[1]));
    }
  }
  for (const src of [html, css]) {
    for (const m of src.matchAll(/stroke-width(?:=|%3D|:)\s*['"]?(%?[0-9.]+)/gi)) {
      const n = r2(+decodeURIComponent(m[1]));
      if (n > 0) inline.add(n);
    }
  }
  cases[id] = { border: [...border].sort((a, b) => a - b), cssStroke: [...cssStroke].sort((a, b) => a - b), inline: [...inline].sort((a, b) => a - b) };
}

// ── 档位收窄：复刻 clean-dna.mjs:495-500 的规则 ──
function narrow(list) {
  const fine = list.filter((w) => w < 1);
  const coarse = [];
  for (const w of list.filter((w) => w >= 1)) if (!coarse.some((c) => Math.abs(c - w) < 0.5)) coarse.push(w);
  return fine.concat(coarse).sort((a, b) => a - b);
}
const fmt = (l) => l.map((n) => n + 'px').join('、');
const union = (a, b) => [...new Set([...a, ...b])].sort((x, y) => x - y);

// ── 三种修法产出的「线宽行文案」 ──
const gen = {
  // 现行（复刻 lineWidthVerdict 现状：CSS 全部 + 0.5 收窄）
  now: (c) => {
    const l = narrow(union(c.border, c.cssStroke));
    return { list: l, text: '5. 线宽只用这几级：' + fmt(l) + '，不要自创第三级。' };
  },
  // (a) 只补抽取：把 HTML 内联也扫进来，文案不变
  a: (c) => {
    const l = narrow(union(union(c.border, c.cssStroke), c.inline));
    return { list: l, text: '5. 线宽只用这几级：' + fmt(l) + '，不要自创第三级。' };
  },
  // (b) 补抽取 + 按真实级数说话
  b: (c) => {
    const l = narrow(union(union(c.border, c.cssStroke), c.inline));
    const n = l.length;
    let tail;
    if (n === 0) return { list: l, text: '5. 全站不画描边，用色块与留白分隔，不要自创边框。' };
    if (n === 1) tail = '，全站只有这 1 级，不要加第二级。';
    else if (n === 2) tail = '，全站只有这 2 级，不要加第三级。';
    else tail = '，全站只有这 ' + n + ' 级，不要自创第 ' + (n + 1) + ' 级。';
    return { list: l, text: '5. 线宽只用这几级：' + fmt(l) + tail };
  },
  // (c) 拆语义：CSS border 一句、SVG 描边一句
  c: (c) => {
    const bl = narrow(c.border);
    const sl = narrow(union(c.cssStroke, c.inline));
    const parts = [];
    if (bl.length) parts.push('5. CSS 边框/焦点环只用 ' + fmt(bl) + ' 这几档' + (bl.length === 1 ? '（只有 1 档）' : '（共 ' + bl.length + ' 档）') + '，不要加新档。');
    else parts.push('5. CSS 不用边框，靠留白与色块分隔。');
    if (sl.length) parts.push('6. SVG 描边宽度只用 ' + fmt(sl) + ' 这几档' + (sl.length === 1 ? '（只有 1 档）' : '（共 ' + sl.length + ' 档）') + '，单位是 SVG 用户单位或 px，按原值写。');
    else parts.push('6. 不用 SVG 描边。');
    return { list: union(bl, sl), text: parts.join('\n') };
  },
};

// ── 验证器：提示词里每个 px 必须在真值集合里；且真值集合里承担视觉的级数不能被整段漏掉 ──
function verify(text, c) {
  const claimed = [...text.matchAll(/([0-9.]+)px/g)].map((m) => r2(+m[1])).filter((n) => n > 0);
  const truth = new Set(union(union(c.border, c.cssStroke), c.inline));
  const phantom = claimed.filter((v) => ![...truth].some((t) => Math.abs(t - v) < 0.011));
  // 漏报：真值里的级数没被任何声称值覆盖
  const missed = [...truth].filter((v) => !claimed.some((x) => Math.abs(x - v) < 0.011));
  return { claimed: [...new Set(claimed)].sort((a, b) => a - b), phantom, missed, pass: phantom.length === 0 && missed.length === 0 };
}

const dump = JSON.parse(readFileSync(join(OUT, 'dump30.json'), 'utf8'));
const rows = [];
const summary = { now: 0, a: 0, b: 0, c: 0 };
for (const id of Object.keys(cases)) {
  const c = cases[id];
  const r = {};
  for (const k of ['now', 'a', 'b', 'c']) {
    const g = gen[k](c);
    const v = verify(g.text, c);
    r[k] = { ...g, ...v };
    if (v.pass) summary[k]++;
  }
  rows.push({ id, ...r });
}
writeFileSync(join(OUT, 't1-sims.json'), JSON.stringify({ rows, summary, cases }, null, 1), 'utf8');

const txt = [];
const p = (s) => { txt.push(s); console.log(s); };
p('案号  现行pass  (a)pass  (b)pass  (c)pass   │ 现行为什么不过');
p('-'.repeat(118));
for (const r of rows) {
  const why = r.now.pass ? '' :
    [r.now.phantom.length ? '幽灵值=' + r.now.phantom.join(',') : '', r.now.missed.length ? '漏报=' + r.now.missed.join(',') : ''].filter(Boolean).join(' ');
  p(r.id.padEnd(5) + String(r.now.pass).padEnd(9) + String(r.a.pass).padEnd(8) + String(r.b.pass).padEnd(8) + String(r.c.pass).padEnd(7) + '│ ' + why);
}
p('');
p('通过数：现行 ' + summary.now + '/30   (a) ' + summary.a + '/30   (b) ' + summary.b + '/30   (c) ' + summary.c + '/30');
p('');
p('=== 五案在四种口径下的逐字文案 ===');
for (const id of ['S09', 'S10', 'S15', 'S25', 'S27']) {
  const r = rows.find((x) => x.id === id);
  p('');
  p('──── ' + id + ' ────');
  p('  真值集：border/outline=[' + cases[id].border.join(',') + ']  CSS-stroke=[' + cases[id].cssStroke.join(',') + ']  内联=[' + cases[id].inline.join(',') + ']');
  for (const k of ['now', 'a', 'b', 'c']) {
    p('  (' + k + ') ' + r[k].text.replace(/\n/g, '\n      '));
    p('      → pass=' + r[k].pass + (r[k].phantom.length ? ' 幽灵=' + r[k].phantom.join(',') : '') + (r[k].missed.length ? ' 漏报=' + r[k].missed.join(',') : ''));
  }
}
writeFileSync(join(OUT, 't1-sims.txt'), txt.join('\n'), 'utf8');
p('');
p('wrote t1-sims.json / t1-sims.txt');
