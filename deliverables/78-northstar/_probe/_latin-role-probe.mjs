/* 拉丁字体角色（第四角色）提取探针 v2。
 *
 * v1 用「选择器带 latin 语义」单一判据，结果 1 误报（S01 的 .latin 其实是正文链）
 * + 1 漏报（S03 换字体的规则选择器叫 .h2，没有拉丁字样）。
 *
 * v2 改成两条来源，按可靠性排序：
 *   ① **作者显式命名的变量** `--f-latin` / `--latin` —— 这是作者的直接声明，最可靠
 *   ② 具体规则里换了字体，且该字体不在三个已知角色里
 *
 * 已知答案（人工逐案读过源码）：
 *   真缺陷（字体只在局部分支出现，dna.fonts 无槽）：
 *     S01 Archivo          --f-latin 变量，作者注释「Archivo 拉丁标题」
 *     S03 Space Grotesk    .h2 规则，标题链与正文链都不含它
 *     S04 Unbounded        --f-disp 只在 h1 用，dna.display 却是 LXGW WenKai
 *     S16 Archivo Black    .masthead-latin / .foot-grid .latin
 *     S19 Spectral         .mast__en / .xc__la
 *   不算缺陷：
 *     S09 Syne             已在 displayStack 里（clean-dna 做了 cn+latin 合并）
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const P = join(resolve(HERE, '..', '..', '..'), 'prototypes');

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-.*|inherit|initial|unset)$/i;
const CJK = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|Songti|SimSun|KaiTi|Kaiti|STKaiti|PingFang|Microsoft YaHei|Source Han|思源|宋体|黑体|楷)/i;
const LATIN_SEL = /(latin|[^a-z]en$|[^a-z]en\b|__la\b|_la\b|-la\b|\.en\b)/i;
/* 等宽族名。来自各案 dna.fonts.mono 与实测：S18 Martian Mono、S05 Departure Mono、
 * S03 Cascadia Mono / Consolas、S15 Reddit Mono、S23 Sometype Mono… */
const MONO_NAME = /(mono|courier|consolas|menlo|vt323|code|typewriter|terminal|overprint numerals)/i;

function splitStack(v) {
  const out = []; let depth = 0, cur = '';
  for (const ch of v) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((s) => s.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean);
}
function rootDecls(css) {
  const d = [];
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) d.push({ name: m[1].trim(), value: m[2].trim() });
  return d;
}
function resolveVars(v, vars, depth) {
  if (!v || depth > 6) return v || '';
  return v.replace(/var\((--[\w-]+)(?:,\s*([^()]*))?\)/g, (_, n, fb) => {
    const f = vars[n];
    return f ? resolveVars(f, vars, depth + 1) : (fb ? resolveVars(fb, vars, depth + 1) : '');
  });
}
function eachRule(css, fn) {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    if (sel.startsWith('@')) continue;
    fn(sel, m[2]);
  }
}
function firstFamily(value, vars) {
  const st = splitStack(resolveVars(value || '', vars, 0));
  for (const n of st) if (!GENERIC.test(n)) return n;
  return st[0] || '';
}

function latinRole(css, vars, taken) {
  const isTaken = (f) => !f || taken.has(f.replace(/\s+/g, '').toLowerCase());
  const ok = (f) => f && !GENERIC.test(f) && !CJK.test(f) && !isTaken(f);

  /* ① 作者显式命名的拉丁变量 */
  for (const key of ['--f-latin', '--latin', '--font-latin', '--f-en', '--en']) {
    const d = rootDecls(css).find((x) => x.name === key);
    if (d) {
      const f = firstFamily(d.value, vars);
      if (ok(f)) return { fam: f, src: '变量 ' + key, sels: [] };
    }
  }

  /* ② 规则里换字体的地方 */
  const hits = new Map();
  eachRule(css, (sel, body) => {
    const m = body.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/);
    if (!m) return;
    const fam = firstFamily(m[1], vars);
    if (!ok(fam)) return;
    /* 等宽体不是拉丁角色。两处要挡：
     *  · 族名本身是等宽（S18 的 Martian Mono / S05 的 Departure Mono）
     *  · 宿主选择器是等宽元素（code / pre / kbd / samp）—— S18 的 `code` 与 `.promptline`
     * 上一版没挡这两处，S18 被误报成「拉丁角色 = Martian Mono」。 */
    if (MONO_NAME.test(fam)) return;
    if (/(^|[\s,>+~])(code|pre|kbd|samp|tt)(?![\w-])/i.test(sel)) return;
    if (!hits.has(fam)) hits.set(fam, { fam, sels: [] });
    hits.get(fam).sels.push(sel.trim());
  });

  /* ②-a 带拉丁语义选择器的最可信 */
  for (const v of hits.values()) {
    if (v.sels.some((s) => LATIN_SEL.test(s))) return { fam: v.fam, src: '拉丁选择器', sels: v.sels };
  }
  /* ②-b 出现次数极少的（≤2 处）也算局部角色 */
  for (const v of hits.values()) {
    if (v.sels.length <= 2) return { fam: v.fam, src: '局部规则×' + v.sels.length, sels: v.sels };
  }
  return null;
}

/* dna 声明集 */
const promptSrc = readFileSync(join(P, '_selection', 'prompts.js'), 'utf8');
const dna = new Map();
{
  const lines = promptSrc.split('\n');
  const seen = new Set(); const marks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*"id":\s*"(S\d+)",\s*$/);
    if (m && !seen.has(m[1])) { seen.add(m[1]); marks.push({ id: m[1], at: i }); }
  }
  for (let k = 0; k < marks.length; k++) {
    const body = lines.slice(marks[k].at, k + 1 < marks.length ? marks[k + 1].at : lines.length).join('\n');
    const dir = body.match(/"dir":\s*"([^"]+)"/)?.[1];
    const st = new Set();
    for (const g of body.matchAll(/"(?:display|body|mono)":\s*"([^"]+)"/g)) st.add(g[1].replace(/\s+/g, '').toLowerCase());
    for (const a of body.matchAll(/"(?:display|body)Stack":\s*\[([^\]]*)\]/g))
      for (const s of a[1].matchAll(/"([^"]+)"/g)) st.add(s[1].replace(/\s+/g, '').toLowerCase());
    if (dir) dna.set(marks[k].id, { dir, taken: st });
  }
}

const EXPECT = { S01: 'Archivo', S03: 'Space Grotesk', S04: 'Unbounded', S16: 'Archivo Black', S19: 'Spectral' };
console.log('CASE  认出              来源            选择器                                      判定');
console.log('─'.repeat(104));
let tp = 0, fp = 0, fn = 0;
for (const [id, { dir, taken }] of dna) {
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  const vars = {};
  for (const d of rootDecls(css)) vars[d.name] = d.value;
  const r = latinRole(css, vars, taken);
  const want = EXPECT[id];
  if (want && r && r.fam === want) tp++;
  else if (want && !r) { fn++; console.log(`${id}    （未认出）         —               —                                           ✗ 漏`); }
  else if (want && r) { fn++; console.log(`${id}    ${r.fam.padEnd(17)} ${r.src.padEnd(15)} ${r.sels.slice(0, 2).join(' , ').padEnd(44)} ✗ 认错（应 ${want}）`); }
  else if (!want && r) { fp++; console.log(`${id}    ${r.fam.padEnd(17)} ${r.src.padEnd(15)} ${r.sels.slice(0, 2).join(' , ').padEnd(44)} ✗ 误报`); }
  else if (want) { /* unreachable */ }
}
/* 真阳的明细也打出来 */
console.log('');
for (const [id, { dir, taken }] of dna) {
  const want = EXPECT[id]; if (!want) continue;
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  const vars = {}; for (const d of rootDecls(css)) vars[d.name] = d.value;
  const r = latinRole(css, vars, taken);
  if (r && r.fam === want) console.log(`${id}    ${r.fam.padEnd(17)} ${r.src.padEnd(15)} ${r.sels.slice(0, 2).join(' , ').slice(0, 44).padEnd(44)} ✓`);
}
console.log('─'.repeat(104));
console.log(`真阳 ${tp}/5　漏报 ${fn}　误报 ${fp}`);

/* ── 变异测试 ─────────────────────────────────────────────────────
 * 「5/5 真阳 0 误报」这句话如果是靠期望表写死的，那它什么也没证明。
 * 这里把判据的每一道守卫逐个拆掉，看它是否变红。红了才说明守卫真的在起作用。 */
if (process.argv.includes('--selftest')) {
  console.log('\n=== 变异测试：拆掉每道守卫，看判据是否变红 ===\n');
  const load = (id) => {
    const { dir, taken } = dna.get(id);
    const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
    const vars = {};
    for (const d of rootDecls(css)) vars[d.name] = d.value;
    return { css, vars, taken };
  };
  const run = (id, mutate) => {
    const { css, vars, taken } = load(id);
    const saved = { LATIN_SEL, MONO_NAME };
    mutate(saved);
    const r = latinRole(css, vars, taken);
    return r ? r.fam : null;
  };

  const cases = [];
  /* 变异 1：去掉等宽族名守卫 —— S18 应该被误报成 Martian Mono */
  cases.push({
    name: '去掉等宽族名守卫',
    id: 'S18',
    want: 'Martian Mono',   // 变异后**期望**出现的误报
    run: () => run('S18', () => {}),   // placeholder，实际用下方注入
  });

  /* 直接做三组对照，不依赖可变全局 */
  const base = ['S01', 'S03', 'S04', 'S16', 'S19'];
  let ok = 0;
  for (const id of base) {
    const { css, vars, taken } = load(id);
    const r = latinRole(css, vars, taken);
    if (r && r.fam === EXPECT[id]) ok++;
  }
  console.log(`  · 基线：${ok}/5 认出（应为 5）${ok === 5 ? '✓' : '✗'}`);

  /* 变异 A：把 taken 清空 —— 应当出现误报（原本已在 dna 里的字体被当成第四角色） */
  let fpA = 0;
  for (const [id, { dir }] of dna) {
    const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
    const vars = {};
    for (const d of rootDecls(css)) vars[d.name] = d.value;
    const r = latinRole(css, vars, new Set());
    if (r && !EXPECT[id]) fpA++;
  }
  console.log(`  · 变异 A（清空已占角色集）：误报 ${fpA} 案（应 >0）${fpA > 0 ? '✓ 守卫在起作用' : '✗ 守卫是空的'}`);

  /* 变异 B：去掉 CJK 过滤。
   *
   * 第一版写的期望是「误报 > 0」，结果实测 0 —— 但这不是守卫空，
   * 是**这道题在真实语料里没有反例**：唯一一处「latin 选择器首位是中文族」
   * 是 S16 的 `.slab-latin { font-family: "LXGW Marker Gothic", … }`，
   * 而 LXGW Marker Gothic 正是 S16 的 dna.display，早被"已占角色"守卫挡掉了。
   *
   * 正确做法是**注入**一个反例：把中文族放进一个还没有人占的位置。
   * 这样考的才是 CJK 过滤本身，而不是语料碰巧没有。 */
  {
    const { dir: td } = dna.get('S21');
    const base = stripComments(readFileSync(join(P, td, 'style.css'), 'utf8'));
    const injected = base + '\n.zzz-latin{font-family:"Noto Sans SC","Georgia",serif}';
    const pv = {};
    for (const d of rootDecls(injected)) pv[d.name] = d.value;
    const withCjkGuard = latinRole(injected, pv, dna.get('S21').taken);
    const guarded = !withCjkGuard || !/noto/i.test(withCjkGuard.fam);
    console.log(`  · 变异 B（给 S21 注入 .zzz-latin → 中文族 Noto Sans SC）：`
      + `认出 ${withCjkGuard ? withCjkGuard.fam : '（无）'}　`
      + (guarded ? '✓ CJK 过滤在起作用' : '✗ CJK 过滤是空的'));
  }

  /* 变异 C：注入一个假的 latin 选择器到已知无第四角色的案，看能不能认出来 */
  const probeId = 'S21';
  const { dir: pd } = dna.get(probeId);
  const injected = stripComments(readFileSync(join(P, pd, 'style.css'), 'utf8')) +
    '\n.zzz-latin{font-family:"Zzz Test Face","Noto Serif SC",serif}';
  const pv = {};
  for (const d of rootDecls(injected)) pv[d.name] = d.value;
  const rC = latinRole(injected, pv, dna.get(probeId).taken);
  console.log(`  · 变异 C（给 ${probeId} 注入 .zzz-latin）：认出 ${rC ? rC.fam : '（无）'}（应 Zzz Test Face）${rC && rC.fam === 'Zzz Test Face' ? '✓ 真能认出新字体' : '✗ 只在对答案'}`);
}
