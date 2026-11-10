/**
 * 07 · fonts 的形状差异（Q3）：字符串 vs 对象，能不能统一？
 *
 * 先把「形状不同」和「值不同」分开，这是两件事：
 *   形状：L1 是规格原文整段（字符串）；L2/L3 是 {display, body, mono, displayStack, bodyStack}
 *   值：规格里**点名**的字体（设计意图） vs CSS 里**解析到**的字体（落地事实）
 *
 * 只有把第二件事量出来，才能回答"该不该统一"：
 *   · 若 UI 只是展示文字 → 字符串够用，统一成对象反而是把可读的原文切碎
 *   · 若值一致 → 统一不会丢信息
 *   · 若值不一致（规格说 Archivo，CSS 解析出 Noto Sans SC）→ **两种都是事实，合并就是丢事实**
 *
 * 同时逐处核实 UI 到底拿 fonts 做了什么（这是判断依据，不能靠推测）。
 *
 * 运行：node deliverables/71-plan/facts/07-fonts.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IDS, ROOT, PROTO, DIR_OF, loadData, loadPrompts, loadDnaClean, parseSpec, readRoot, writeJson, mdTable,
} from './lib.mjs';

const D = Object.fromEntries(loadData().rows.map((r) => [r.id, r]));
const P = Object.fromEntries(loadPrompts().doc.schemes.map((r) => [r.id, r]));
const C = Object.fromEntries(loadDnaClean().rows.map((r) => [r.id, r]));

/* ── UI 消费点普查（静态扫描，逐行给出证据） ─────────────────────
 * 这是 Q3 的核心依据：fonts 在 UI 里被用来做什么，决定了它需要什么形状。
 */
const UI_FILES = ['app.js', 'wizard.js', 'prompt-copy.js', 'self-gate.js'];
const uiUse = [];
for (const f of UI_FILES) {
  const p = join(PROTO, '_selection', f);
  const lines = readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((L, i) => {
    // 只看真正读 r.fonts 的地方（r = data.js 的行）；d.fonts / x.dna.fonts 是 prompts.js 侧
    if (/\br\.fonts\b/.test(L)) uiUse.push({ file: f, line: i + 1, code: L.trim(), side: 'data.js (字符串)' });
    if (/\bd\.fonts\b|\bx\.dna\.fonts\b|dna\.fonts/.test(L)) uiUse.push({ file: f, line: i + 1, code: L.trim(), side: 'prompts.js (对象)' });
  });
}

/* ── 是否存在"字体可用性检测"── 若有，UI 就需要结构化 */
const availabilityAPI = uiUse.length ? [] : [];
const API_PATTERNS = ['document.fonts', 'fonts.check(', 'FontFace', 'measureText', 'getComputedStyle'];
for (const f of UI_FILES) {
  const s = readFileSync(join(PROTO, '_selection', f), 'utf8');
  for (const a of API_PATTERNS) if (s.includes(a)) availabilityAPI.push({ file: f, api: a });
}

/* 中英别名：同一个字体常有两个名字，只按字面比会误判"未落地"。
 * 这张表只收**确知等价**的几对（中文名 ↔ 拉丁名），不做模糊匹配。 */
const ALIAS = {
  '霞鹜文楷': ['LXGW WenKai', 'LXGW WenKai TC'],
  '霞鹜漫黑': ['LXGW Marker Gothic'],
  '得意黑': ['Smiley Sans'],
  '思源黑体': ['Noto Sans SC', 'Source Han Sans'],
  '思源宋体': ['Noto Serif SC', 'Source Han Serif'],
  '文津宋体': ['WenJin Mincho'],
  '京华老宋体': ['JinghuaOldSong'],
};
/* 不是字体名的东西（CSS 描述符/属性名/单位），扫反引号时会混进来 */
const NOT_A_FONT = /^(size-adjust|font-display|font-weight|font-size|letter-spacing|line-height|swap|optional|block|auto|latin|latin-ext|opsz|SOFT|WONK|wght.*|OFL.*)$/i;
/* 否定语境词表：规格字段 4 里同样写着「被替换掉的字体」。
 * 实测 8 案命中（S11 EB Garamond、S21 Antonio、S22 Petrona、S23 Alfa Slab One、
 * S25 Besley、S27 Chivo、S29 Saira Condensed、S30 Anton）——它们**故意不在 CSS 里**，
 * 若算进"规格点名但未落地"，就会把设计意图里的否定句当成落地失败。
 * 这与 collect-schemes.mjs:412 的 NEG 是同一个坑，只是发生在字段 4 而不是字段 3。 */
const NEG_FONT = /(反的是|反对|原用|原为|不用|不使用|不得|禁止|删去|改为|换掉|替换|弃用|不采用|避免|规避|而不是|而非|不再用|降级为)/;
/* 与上游 dec() 同一口径（collect-schemes.mjs:22） */
const decBoth = (s) => String(s).replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

/* ── 规格点名 vs CSS 落地 ─────────────────────────────────────── */
const rows = [];
for (const id of IDS) {
  const p4 = (parseSpec(id).fields['字体策略'] || {}).text || '';
  const root = readRoot(id);
  const obj = C[id].fonts || {};

  /* 规格里被反引号包起来的英文字体名（作者点名的候选）；否定语境里的（被替换掉的旧字体）单列，不算"未落地"。
   * 中文族名常见写法是「霞鹜文楷（OFL 1.1…）」不带反引号，所以另扫一次常见中文字体词。 */
  const backtickAll = [...new Set((p4.match(/`([^`]{2,44})`/g) || []).map((s) => s.replace(/`/g, '').trim()))]
    .filter((s) => /^[A-Za-z][A-Za-z0-9 .\-–]*$/.test(s) && !NOT_A_FONT.test(s));
  const negatedFonts = [];
  const backtick = backtickAll.filter((name) => {
    const idx = p4.indexOf('`' + name + '`');
    const ctx = p4.slice(Math.max(0, idx - 30), idx + 30);
    if (NEG_FONT.test(ctx)) { negatedFonts.push(name); return false; }
    return true;
  });
  const CJK_FONTS = ['得意黑', '思源黑体', '思源宋体', '霞鹜文楷', '霞鹜漫黑', '文津宋体', '京华老宋体', '寒蝉', '屏显', '悠哉', '杨任东'];
  const cjkNamed = CJK_FONTS.filter((f) => p4.includes(f));
  const specFamilies = [...new Set([...backtick, ...cjkNamed])];

  /* 命中判定：字面互相包含，或经 ALIAS 表命中 */
  const matches = (f, cand) => {
    const fl = f.toLowerCase(), cl = cand.toLowerCase();
    if (fl.includes(cl) || cl.includes(fl)) return true;
    for (const al of (ALIAS[f] || [])) {
      const a = al.toLowerCase();
      if (cl.includes(a) || a.includes(cl)) return true;
    }
    return false;
  };

  /* CSS 落地：**全文件**扫 font-family 声明 + @font-face + :root 的字体变量。
   * ⚠️ 自我纠错：第一版只扫 :root 里名字带 font/f-/display/text 的变量，于是
   * S11 的 `font-family: "EB Garamond", …`（直接写在规则里，没走变量）被判成"未落地 5 个"。
   * 那是**我的口径比数据窄**（正是这个仓库反复翻车的那种错），不是规格没落地。
   * 现在三条来源都扫：:root 变量值 ∪ 所有 font-family 声明 ∪ @font-face 的族名。
   */
  const cssRaw = readFileSync(join(PROTO, DIR_OF[id], 'style.css'), 'utf8');
  const cssNoComment = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  const cssFamilies = [];
  const pushFamilyList = (v) => {
    for (const part of v.split(',')) {
      const s = part.trim().replace(/^["']|["']$/g, '').trim();
      if (!s) continue;
      if (/^(serif|sans-serif|monospace|system-ui|ui-[\w-]+|cursive|fantasy|inherit|initial|unset|var\(.*\))$/i.test(s)) continue;
      cssFamilies.push(s);
    }
  };
  for (const d of root.declarations) {
    if (/font|f-|display|text|mono|cn|cjk|latin|serif|sans/i.test(d.name)) pushFamilyList(d.value);
  }
  /* 规则里的 `font-family: var(--display)` 要展开成变量值，否则 S24/S26 这种
   * 「所有 font-family 都走变量」的案，族名一个都抓不到（第一版就漏了它们）。 */
  const varsMap = {};
  for (const d of root.declarations) varsMap[d.name] = d.value;
  const expandVar = (v) => String(v).replace(/var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/g, (_, n, fb) => varsMap[n] || (fb || ''));
  for (const m of cssNoComment.matchAll(/font-family\s*:\s*([^;}]+)/g)) pushFamilyList(expandVar(m[1]));
  for (const m of cssNoComment.matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*["']([^"']+)["']/g)) cssFamilies.push(m[1]);
  const cssUniq = [...new Set(cssFamilies)];

  /* 结构化对象里的三个槽 + 两个栈 */
  const slots = { display: obj.display || null, body: obj.body || null, mono: obj.mono || null };
  const stacks = { displayStack: obj.displayStack || [], bodyStack: obj.bodyStack || [] };

  /* 关键量：规格点名的字体，有多少出现在 CSS 里（= 设计意图真的落地了） */
  const hit = specFamilies.filter((f) => cssUniq.some((c) => matches(f, c)));
  const miss = specFamilies.filter((f) => !hit.includes(f));

  rows.push({
    id,
    L1_kind: 'string', L1_len: String(D[id].fonts || '').length,
    /* data.js 的 fonts 是不是规格字段 4 的**逐字原文**。
     * 第一版直接与 p4.trim() 比，只有 9/30 相等 —— 那是**比较口径**问题，不是数据问题：
     * data.js 的值过了上游 dec()（去 `**`、去反引号、折叠空白），原文没有。
     * 两边都套 dec 才是同口径比较。 */
    L1_isRawSpecText: decBoth(D[id].fonts) === decBoth(p4),
    L2_kind: 'object', L3_kind: 'object',
    L2_eq_L3: JSON.stringify(C[id].fonts) === JSON.stringify(P[id].dna.fonts),
    slots, stacks,
    specFamilies, negatedFonts, cssFamilies: cssUniq,
    specHitInCss: hit, specMissInCss: miss,
    hitRatio: specFamilies.length ? +(hit.length / specFamilies.length).toFixed(2) : null,
    /* UI 侧真正需要的形状 */
    uiNeedsOnlyText: true,     // app.js:1353 field('字体策略', r.fonts) —— 只是打印
    uiNeedsSearch: true,       // app.js:235 把 r.fonts 拼进搜索 haystack
    uiNeedsStructured: false,  // 无任何可用性检测 / 无字体名单独渲染
  });
}

const sum = {
  n: rows.length,
  L1_isRawSpecText: rows.filter((r) => r.L1_isRawSpecText).length,
  L2_eq_L3: rows.filter((r) => r.L2_eq_L3).length,
  ui: { useSites: uiUse, availabilityAPI },
  specFamilyStats: {
    meanSpecFamilies: +(rows.reduce((a, r) => a + r.specFamilies.length, 0) / rows.length).toFixed(2),
    meanCssFamilies: +(rows.reduce((a, r) => a + r.cssFamilies.length, 0) / rows.length).toFixed(2),
    meanHitRatio: +(rows.reduce((a, r) => a + (r.hitRatio || 0), 0) / rows.length).toFixed(3),
    perfect: rows.filter((r) => r.specMissInCss.length === 0).length,
    worst: rows.map((r) => ({ id: r.id, miss: r.specMissInCss })).filter((x) => x.miss.length).sort((a, b) => b.miss.length - a.miss.length).slice(0, 6),
  },
  emptySlots: {
    display: rows.filter((r) => !r.slots.display).length,
    body: rows.filter((r) => !r.slots.body).length,
    mono: rows.filter((r) => !r.slots.mono).map((r) => r.id),
  },
};
writeJson('07-fonts.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 07 fonts 形状与值 ===');
console.log('L1 是规格原文整段（逐字等于字段 4）：' + sum.L1_isRawSpecText + '/30');
console.log('L2 === L3（整对象）：' + sum.L2_eq_L3 + '/30');
console.log('');
console.log('UI 侧真正读 fonts 的地方（全部）：');
for (const u of sum.ui.useSites) console.log('  ' + u.file + ':' + u.line + '  [' + u.side + ']  ' + u.code.slice(0, 110));
console.log('  字体可用性检测 API：' + (sum.ui.availabilityAPI.length ? JSON.stringify(sum.ui.availabilityAPI) : '**一处都没有**'));
console.log('');
console.log('规格点名族数均值 ' + sum.specFamilyStats.meanSpecFamilies + ' · CSS 落地族数均值 ' + sum.specFamilyStats.meanCssFamilies);
console.log('规格点名的字体在 CSS 里能找到的比例（均值）：' + (sum.specFamilyStats.meanHitRatio * 100).toFixed(1) + '%');
console.log('全部命中的案：' + sum.specFamilyStats.perfect + '/30');
console.log('漏得最多的案：');
for (const w of sum.specFamilyStats.worst) console.log('  ' + w.id + ' 未落地 ' + w.miss.length + ' 个：' + w.miss.join(' / '));
console.log('');
console.log('结构化对象的空槽：display 空 ' + sum.emptySlots.display + ' · body 空 ' + sum.emptySlots.body + ' · mono 空 ' + sum.emptySlots.mono.length + ' 案');
if (sum.emptySlots.mono.length) console.log('  mono 空：' + sum.emptySlots.mono.join(' '));
console.log('');
console.log(mdTable(['案', 'L1 长度', '规格点名族', 'CSS 落地族', '命中率', '未落地'],
  rows.map((r) => [r.id, r.L1_len, r.specFamilies.length, r.cssFamilies.length, (r.hitRatio * 100).toFixed(0) + '%', r.specMissInCss.join(' / ') || '—'])));
console.log('');
console.log('→ deliverables/71-plan/facts/07-fonts.json');
