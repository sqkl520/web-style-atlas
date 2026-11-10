// 任务 1 探针 H（定稿）：三种修法的通过数 —— 单位感知 + 作用域感知。
//
// 前几版错在哪（自我披露，逐条）：
//   版 D：把 SVG 用户单位当 px 比 → 得出"提示词漏报 3.6px"这种**我自己造的缺陷**。
//   版 G：用 getComputedStyle 当真值 → **漏掉所有伪元素上的边框**
//         （S27 的 .act__sign::before / .plate__frame::before 都是边框宿主，
//          querySelectorAll('*') 看不到 ::before），且 Chrome 会把 border-width
//          取整（1.8px 读成 2 或 1），精度全丢。
// 定稿口径：只信「作者写下的声明文本」，但把它放在正确的量纲与作用域里：
//   kind  = 'abs'   —— 带 px 的 CSS 长度（border/outline）→ 屏幕 px，与视口无关
//   kind  = 'user'  —— SVG stroke-width（px 或无单位）→ 用户单位，除以 viewBox 宽再乘渲染宽
//   scope = 'base'  —— 顶层规则（任意视口都成立）
//   scope = 'mq'    —— 落在 @media 里（只在某些视口成立）
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();
const r2 = (n) => Math.round(n * 100) / 100;

function analyze(dir) {
  const raw = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const lines = raw.split('\n');
  const html = readFileSync(join(P, dir, 'index.html'), 'utf8');

  // 桌面基数：只取顶层 :root（不在 @media 内），后者覆盖前者
  const baseVars = {};
  {
    let depth = 0; const stack = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const o = (ln.match(/\{/g) || []).length, c = (ln.match(/\}/g) || []).length;
      if (/:root\s*\{/.test(ln) && !stack.some((s) => /^@media/.test(s.sel))) {
        const body = ln.slice(ln.indexOf('{'));
        for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) baseVars[d[1]] = d[2].trim();
      }
      if (o) for (let k = 0; k < o; k++) stack.push({ line: i + 1, sel: ln.slice(0, ln.indexOf('{')).trim() });
      for (let k = 0; k < c; k++) stack.pop();
    }
  }
  // 顶层 :root 块可能跨多行，补一次整块扫描
  {
    const noC = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    // 只吃文件里第一个 :root{...}（顶层），因为媒体查询里的 :root 都缩进且带 @media 前缀
    const m0 = noC.match(/(?:^|\n):root\s*\{([\s\S]*?)\}/);
    if (m0) for (const d of m0[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) baseVars[d[1]] = d[2].trim();
  }

  const expand = (v, d = 0) => {
    if (d > 6 || !/var\(/.test(v)) return v;
    return expand(v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_, n, fb) =>
      baseVars[n] !== undefined ? baseVars[n] : fb !== undefined ? fb : 'UNRES'), d + 1);
  };
  const calc = (v) => v
    .replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, (_, a, b) => r2(+a * +b) + 'px')
    .replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, (_, a, b) => r2(+a * +b) + 'px');

  // 逐行判定作用域
  const mqOfLine = (() => {
    const res = new Array(lines.length + 1).fill(null);
    let depth = 0; const stack = [];
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const o = (ln.match(/\{/g) || []).length, c = (ln.match(/\}/g) || []).length;
      if (/^\s*@media/.test(ln)) stack.push({ d: depth + o, text: ln.trim() });
      for (let k = 0; k < c; k++) if (stack.length && depth + o - k <= stack[stack.length - 1].d - 1) stack.pop();
      depth += o - c;
      res[i + 1] = stack.length ? stack[stack.length - 1].text : null;
    }
    return res;
  })();

  const rec = { abs: new Map(), user: new Map(), inlineUser: new Map() };
  const add = (mp, key, scope, note) => {
    if (!mp.has(key)) mp.set(key, { base: 0, mq: 0, notes: [] });
    const x = mp.get(key); x[scope]++;
    if (note && x.notes.length < 3) x.notes.push(note);
  };
  const noC = raw.replace(/\/\*[\s\S]*?\*\//g, (s) => ' '.repeat(s.length));

  for (const m of noC.matchAll(/(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g)) {
    const prop = m[0].slice(0, m[0].indexOf(':')).trim();
    const ln = noC.slice(0, m.index).split('\n').length;
    const scope = mqOfLine[ln] ? 'mq' : 'base';
    const v = calc(expand(m[1]));
    if (/UNRES/.test(v)) continue;
    if (/stroke-width/i.test(prop)) {
      const bare = v.trim().match(/^([0-9.]+)$/);
      if (bare && +bare[1] > 0) add(rec.user, r2(+bare[1]), scope, 'L' + ln + ' ' + prop + ':' + m[1].trim());
      for (const q of v.matchAll(/([0-9.]+)px/g)) if (+q[1] > 0) add(rec.user, r2(+q[1]), scope, 'L' + ln + ' ' + prop + ':' + m[1].trim());
    } else {
      for (const q of v.matchAll(/([0-9.]+)px/g)) if (+q[1] > 0) add(rec.abs, r2(+q[1]), scope, 'L' + ln + ' ' + prop + ':' + m[1].trim());
    }
  }
  // HTML 内联 stroke-width（含 data-URI）
  for (const src of [html, raw]) {
    for (const m of src.matchAll(/stroke-width(?:=|%3D|:)\s*['"]?(%?[0-9.]+)/gi)) {
      const n = r2(+decodeURIComponent(m[1]));
      if (n > 0) add(rec.inlineUser, n, 'base', 'html');
    }
  }
  return rec;
}

const T = {};
for (const dir of dirs) T[dir.slice(0, 3)] = analyze(dir);

// 档位收窄（复刻 clean-dna.mjs:495-500）
function narrow(list) {
  const fine = list.filter((w) => w < 1);
  const coarse = [];
  for (const w of list.filter((w) => w >= 1)) if (!coarse.some((c) => Math.abs(c - w) < 0.5)) coarse.push(w);
  return fine.concat(coarse).sort((a, b) => a - b);
}
const keys = (mp, scopes = ['base', 'mq']) => [...mp.entries()].filter(([, v]) => scopes.some((s) => v[s] > 0)).map(([k]) => k).sort((a, b) => a - b);
const fmt = (l) => l.map((n) => n + 'px').join('、');
const U = (...ls) => [...new Set(ls.flat())].sort((a, b) => a - b);

// 文案生成
const gen = {
  now: (t) => {
    const l = narrow(U(keys(t.abs), keys(t.user)));           // 现行：abs ∪ user，不分量纲，含 mq
    return '5. 线宽只用这几级：' + fmt(l) + '，不要自创第三级。';
  },
  a: (t) => {                                                  // 补抽取（含内联），文案不变
    const l = narrow(U(keys(t.abs), keys(t.user), keys(t.inlineUser)));
    return '5. 线宽只用这几级：' + fmt(l) + '，不要自创第三级。';
  },
  b: (t) => {                                                  // 补抽取 + 按真实级数说话
    const l = narrow(U(keys(t.abs), keys(t.user), keys(t.inlineUser)));
    const n = l.length;
    const tail = n === 0 ? '' : n === 1 ? '，全站只有这 1 级，不要加第二级。' : n === 2 ? '，全站只有这 2 级，不要加第三级。' : '，全站只有这 ' + n + ' 级，不要自创第 ' + (n + 1) + ' 级。';
    return n === 0 ? '5. 全站不画线，靠色块与留白分隔。' : '5. 线宽只用这几级：' + fmt(l) + tail;
  },
  c: (t) => {                                                  // 拆量纲
    const bl = narrow(keys(t.abs)), sl = narrow(U(keys(t.user), keys(t.inlineUser)));
    return [
      bl.length ? '5. CSS 边框/焦点环只用 ' + fmt(bl) + '（共 ' + bl.length + ' 档），不要加新档。' : '5. CSS 不用边框，靠留白与色块分隔。',
      sl.length ? '6. SVG 描边宽度只用 ' + fmt(sl) + '（共 ' + sl.length + ' 档，SVG 用户单位），按原值写，不要折算。' : '6. 不用 SVG 描边。',
    ].join('\n');
  },
  d: (t) => {                                                  // 拆量纲 + 只报 base（桌面），mq 值另注
    const bl = narrow(keys(t.abs, ['base'])), sl = narrow(U(keys(t.user, ['base']), keys(t.inlineUser)));
    const bMq = narrow(keys(t.abs, ['mq'])).filter((v) => !bl.some((x) => Math.abs(x - v) < 0.011));
    const sMq = narrow(keys(t.user, ['mq'])).filter((v) => !sl.some((x) => Math.abs(x - v) < 0.011));
    const out = [
      bl.length ? '5. CSS 边框/焦点环只用 ' + fmt(bl) + '（共 ' + bl.length + ' 档），不要加新档。' : '5. CSS 不用边框，靠留白与色块分隔。',
      sl.length ? '6. SVG 描边宽度只用 ' + fmt(sl) + '（共 ' + sl.length + ' 档，SVG 用户单位），按原值写，不要折算。' : '6. 不用 SVG 描边。',
    ];
    if (bMq.length || sMq.length) out.push('   小屏断点另有 ' + fmt(U(bMq, sMq)) + '，只在窄屏出现，不要带回桌面版。');
    return out.join('\n');
  },
  /* (e) = (d) + 去掉 narrow() 的 0.5px 去重。
   * 这一档是我在跑完 (a)~(d) 之后才发现的第三个独立缺陷的修法：
   * clean-dna.mjs:495-500 会把 ≥1px 的值按 0.5px 粒度合并，于是
   *   S25 的 1 与 1.2 合成一档（1.2 被吞）、S28 的 1 与 1.2 同上、S30 的 1.6 与 2 同上。
   * 这些值在原型里是**不同元素上的不同线宽**，合并就是把说明书改错。
   * 去掉去重后不重不漏，代价是 S13 会吐出 7 档（本来就有 7 档，属实的）。 */
  e: (t) => {
    const bl = U(keys(t.abs, ['base'])), sl = U(keys(t.user, ['base']), keys(t.inlineUser));
    const bMq = keys(t.abs, ['mq']).filter((v) => !bl.some((x) => Math.abs(x - v) < 0.011));
    const sMq = keys(t.user, ['mq']).filter((v) => !sl.some((x) => Math.abs(x - v) < 0.011));
    const out = [
      bl.length ? '5. CSS 边框/焦点环只用 ' + fmt(bl) + '（共 ' + bl.length + ' 档），不要加新档。' : '5. CSS 不用边框，靠留白与色块分隔。',
      sl.length ? '6. SVG 描边宽度只用 ' + fmt(sl) + '（共 ' + sl.length + ' 档，SVG 用户单位），按原值写，不要折算。' : '6. 不用 SVG 描边。',
    ];
    if (bMq.length || sMq.length) out.push('   小屏断点另有 ' + fmt(U(bMq, sMq)) + '，只在窄屏出现，不要带回桌面版。');
    return out.join('\n');
  },
};

// 验证器：分「真」与「全」两个维度
//   真（no-phantom）：文案里每个 px 数字，必须在真值集里（abs∪user∪inline，含 mq）
//   全（no-omit）   ：真值集里每个 base 值，必须被文案覆盖（mq 值另注也算覆盖）
function verify(text, t) {
  const truth = new Set(U(keys(t.abs), keys(t.user), keys(t.inlineUser)));
  const baseTruth = U(keys(t.abs, ['base']), keys(t.user, ['base']), keys(t.inlineUser));
  const claimed = [...new Set([...text.matchAll(/([0-9.]+)px/g)].map((m) => r2(+m[1])).filter((n) => n > 0))];
  const phantom = claimed.filter((v) => ![...truth].some((x) => Math.abs(x - v) < 0.011));
  const omitted = baseTruth.filter((v) => !claimed.some((x) => Math.abs(x - v) < 0.011));
  // 级数话术自洽性：「不要自创第三级」但列表不是 2 档 → 文案自相矛盾
  const mTail = text.match(/只有这\s*(\d+)\s*级|不要自创第三级/);
  let tailBad = false;
  const nList = (text.match(/([0-9.]+)px/g) || []).filter((_, i, a) => a.indexOf(a[i]) === i).length;
  if (/不要自创第三级/.test(text) && nList !== 2) tailBad = true;
  return { claimed, phantom, omitted, tailBad, truth: true, full: phantom.length === 0 && omitted.length === 0, pass: phantom.length === 0 && omitted.length === 0 && !tailBad };
}

const summary = {};
const rows = [];
for (const id of Object.keys(T)) {
  const t = T[id];
  const r = { id };
  for (const k of ['now', 'a', 'b', 'c', 'd', 'e']) {
    const text = gen[k](t);
    r[k] = { text, ...verify(text, t) };
  }
  rows.push(r);
}
for (const k of ['now', 'a', 'b', 'c', 'd', 'e']) {
  summary[k] = {
    full: rows.filter((r) => r[k].full).length,
    pass: rows.filter((r) => r[k].pass).length,
    phantomFree: rows.filter((r) => r[k].phantom.length === 0).length,
    tailOk: rows.filter((r) => !r[k].tailBad).length,
  };
}
writeFileSync(join(OUT, 't1-final-sim.json'), JSON.stringify({ rows, summary }, null, 1), 'utf8');

const L = [];
const p = (s) => { L.push(s); console.log(s); };
p('口径：(真)=文案里没有编造的 px；(全)=桌面真值没被漏讲；(自洽)=级数话术与列表不打架');
p('');
p('案号   now    (a)    (b)    (c)    (d)    (e)     │ now 失败原因');
p('-'.repeat(110));
for (const r of rows) {
  const cell = (x) => (x.pass ? 'pass ' : (x.phantom.length ? '编造 ' : x.omitted.length ? '漏讲 ' : '话术 ')).padEnd(7);
  const why = [];
  if (r.now.phantom.length) why.push('编造=' + r.now.phantom.join(','));
  if (r.now.omitted.length) why.push('漏讲=' + r.now.omitted.join(','));
  if (r.now.tailBad) why.push('话术(列表≠2却说第三级)');
  p(r.id.padEnd(5) + cell(r.now) + cell(r.a) + cell(r.b) + cell(r.c) + cell(r.d) + cell(r.e) + '│ ' + why.join(' '));
}
p('');
p('通过数（真+全+自洽全满足）：');
for (const k of ['now', 'a', 'b', 'c', 'd', 'e']) p('  (' + k + ') ' + summary[k].pass + '/30   其中 无编造=' + summary[k].phantomFree + ' 话术自洽=' + summary[k].tailOk + ' 无漏讲=' + summary[k].full);
writeFileSync(join(OUT, 't1-final-sim.txt'), L.join('\n'), 'utf8');
p('');
p('wrote t1-final-sim.json / .txt');
