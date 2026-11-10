/* REVIEW-GATE2 自建纹理注入测试（在沙箱副本上跑，不碰真实 prototypes/）
 *
 * 覆盖终验点名的三种形态：
 *   M-mid  插到文件**中间**（不是末尾）
 *   M-med  @media 块**内部**
 *   M-adj  两个**相邻** body 规则，第二个带图（v1 的正则吃掉 } 的形态）
 *   M-html html 规则带图（契约只点名 body，预期绿 —— 记录行为而非判缺陷）
 *   M-pre  body::before（反向，预期绿）
 * 每个变异跑完立即恢复，并在最后校验“恢复后基线仍为 0”。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SB = 'D:/Web/style/deliverables/73-verify/_g2tmp/sb';
const GATE = `${SB}/prototypes/_build/check-texture.mjs`;
const F = {
  S01: `${SB}/prototypes/S01-red-wedge-broadsheet/style.css`,
  S12: `${SB}/prototypes/S12-lime-knockout-wall/style.css`,
  S24: `${SB}/prototypes/S24-cyanotype-rainforest-path/style.css`,
};
const orig = Object.fromEntries(Object.entries(F).map(([k, p]) => [k, readFileSync(p, 'utf8')]));

const run = () => {
  try {
    const out = execSync(`node "${GATE}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) { return { code: e.status, out: String(e.stdout || '') }; }
};
const restore = () => { for (const [k, p] of Object.entries(F)) writeFileSync(p, orig[k], 'utf8'); };

/* 在文件**中间**的规则边界插入：从 len/2 往后找第一个 '}' */
const midInsert = (s, snippet) => {
  const half = Math.floor(s.length / 2);
  let i = s.indexOf('}', half);
  if (i < 0) i = s.lastIndexOf('}');
  return s.slice(0, i + 1) + '\n' + snippet + '\n' + s.slice(i + 1);
};
/* 在**第一个** @media 块内部插入（紧随其 '{' 之后） */
const mediaInsert = (s, snippet) => {
  const m = s.match(/@media[^{]*\{/);
  if (!m) return null;
  const i = s.indexOf(m[0]) + m[0].length;
  return s.slice(0, i) + '\n  ' + snippet + '\n' + s.slice(i);
};

const BI = 'body { background-image: url("x.png"); }';

const CASES = [];
for (const k of ['S01', 'S12', 'S24']) {
  CASES.push({ name: `${k} 中间插入 body{background-image:url(x.png)}`, key: k, mk: (s) => midInsert(s, BI), expect: 1 });
  CASES.push({ name: `${k} @media 内嵌 body{background-image}`, key: k, mk: (s) => mediaInsert(s, BI), expect: 1 });
  CASES.push({
    name: `${k} 相邻两个 body 规则（第二个带图）`,
    key: k,
    mk: (s) => midInsert(s, 'body { margin: 0; }\nbody { background-image: url("z.png"); }'),
    expect: 1,
  });
  CASES.push({
    name: `${k} 相邻两个 body 规则（第一个带图）`,
    key: k,
    mk: (s) => midInsert(s, 'body { background-image: url("z1.png"); }\nbody { margin: 0; }'),
    expect: 1,
  });
  CASES.push({ name: `${k} 反向：中间插 body::before 挂图 → 应绿`, key: k, mk: (s) => midInsert(s, 'body::before { content:""; background-image: url("g.png"); }'), expect: 0 });
  CASES.push({ name: `${k} 反向：中间插 body{background:#fff} → 应绿`, key: k, mk: (s) => midInsert(s, 'body { background: #fff; }'), expect: 0 });
}

restore();
const base = run();
console.log(`═══ 沙箱基线 exit=${base.code}  ${(base.out.match(/body\/html 规则数\s+(\d+)/) || [])[1]} 条 ═══\n`);

const results = [];
for (const c of CASES) {
  restore();
  const next = c.mk(orig[c.key]);
  if (!next) { results.push({ ...c, ok: null, got: 'PA' }); console.log(`?  ${c.name}（构造失败）`); continue; }
  writeFileSync(F[c.key], next, 'utf8');
  const res = run();
  const hitRoom = (res.out.match(/✗ \[(T\d[^\]]*)\]/) || [])[1] || '';
  const ok = res.code === c.expect;
  results.push({ ...c, ok, got: res.code, hitRoom });
  console.log(`${ok ? '✓' : '✗'}  ${c.name}   期望exit=${c.expect} 实得=${res.code}${hitRoom ? '  ' + hitRoom : ''}`);
}

restore();
const after = run();
console.log(`\n═══ 恢复后基线 exit=${after.code}（应为 0）═══`);
const pass = results.filter((r) => r.ok === true).length;
console.log(`═══ 自建纹理注入: ${pass}/${results.length} ═══`);
if (after.code !== 0) { console.log('⚠⚠ 恢复失败，沙箱被污染'); process.exit(3); }
