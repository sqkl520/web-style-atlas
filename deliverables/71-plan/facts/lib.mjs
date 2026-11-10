/**
 * 71-plan 事实测绘：共享库。
 *
 * 目标：把「四条数据层」用**可独立重跑**的方式读出来，任何一层的读取都不假设另一层。
 *
 *   层 0  规格原文      prototypes/_specs/Sxx.md（按字段标题切段，带行号）
 *   层 1  data.js       window.SCHEMES             ← _build/collect-schemes.mjs
 *   层 2  dna-clean.json 直接 JSON                  ← _prompts/extract-dna.mjs → clean-dna.mjs
 *   层 3  prompts.js    window.STYLE_PROMPTS.schemes ← _prompts/build-prompts.mjs
 *
 * 所有路径从本文件位置推得，不写死盘符（理由见 _prompts/extract-dna.mjs:15-19 的注释）。
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FACTS = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(FACTS, '../../..');
export const PROTO = join(ROOT, 'prototypes');
export const SPECS = join(PROTO, '_specs');

export const IDS = Array.from({ length: 30 }, (_, i) => 'S' + String(i + 1).padStart(2, '0'));

/* 目录名 → 案号。用真实目录，不用拼字符串，免得漏案。 */
export const DIRS = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();
export const DIR_OF = Object.fromEntries(DIRS.map((d) => [d.slice(0, 3), d]));

/* ────────────────────────── 沙箱求值 ──────────────────────────
 * data.js / prompts.js 是 `window.X = ...` 形态的普通脚本，不是模块。
 * 用 new Function('window', src) 求值，但要**兜住**其它全局引用：
 * 先试纯 {window}，捕获 ReferenceError 里缺的名字，逐个补 stub 再试。
 * 这样「它到底引用了什么全局」是**测出来的**，不是假设的（结果写进 eval-notes.json）。
 */
const STUB_FACTORY = {
  document: () => ({ createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: {} }),
  location: () => ({ href: '', search: '', pathname: '/' }),
  navigator: () => ({ userAgent: 'probe' }),
  localStorage: () => ({ getItem: () => null, setItem() {}, removeItem() {} }),
  console: () => console,
  setTimeout: () => 0,
  clearTimeout: () => {},
};

export function evalWindowScript(src, globalName) {
  const used = [];
  const win = {};
  let attempt = 0;
  for (;;) {
    attempt++;
    if (attempt > 8) throw new Error('too many stub rounds for ' + globalName);
    const fn = new Function('window', src);
    try {
      fn(win);
      return { value: win[globalName], used, attempts: attempt };
    } catch (e) {
      const m = /^(\w+) is not defined/.exec(String(e && e.message));
      if (!m) throw e;
      const name = m[1];
      if (name === 'window' || !(name in STUB_FACTORY)) throw e;
      if (!used.includes(name)) used.push(name);
      globalThis[name] = STUB_FACTORY[name]();  // 真的挂到全局，让 new Function 能看见
    }
  }
}

export function loadData() {
  const src = readFileSync(join(PROTO, '_selection', 'data.js'), 'utf8');
  const r = evalWindowScript(src, 'SCHEMES');
  return { rows: r.value, meta: { used: r.used, attempts: r.attempts, bytes: src.length } };
}

export function loadPrompts() {
  const src = readFileSync(join(PROTO, '_selection', 'prompts.js'), 'utf8');
  const r = evalWindowScript(src, 'STYLE_PROMPTS');
  return { doc: r.value, meta: { used: r.used, attempts: r.attempts, bytes: src.length } };
}

export function loadDnaClean() {
  const src = readFileSync(join(PROTO, '_prompts', 'dna-clean.json'), 'utf8');
  return { rows: JSON.parse(src.replace(/^\uFEFF/, '')) };
}

/* ────────────────────────── 规格切段（带行号） ──────────────────────────
 * 不复用 collect-schemes.mjs 的解析器：那是被测对象之一。这里用**独立**实现，
 * 只依赖规格文件的三种书写惯例（A: `1. 名：` 同行；B: `**1. 名**` 独占行；
 * C: `1. **名**：`），三者在 S01/S11/S21 各出现一次，可自证。
 * 切出来的每段都带 [startLine, endLine]，报告里引原话必须能回指。
 */
const FIELD_NAMES = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格',
  '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];

export function parseSpec(id) {
  const path = join(SPECS, id + '.md');
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const heads = [];   // { lineNo(1-based), key, bodyStart }
  /* 分隔符有两种合法形态：`1.` 与 `1-附`，**都必须能单独成立**。
   * 我第一版把点写成必需（`(\d{1,2})(-附)?[.．]`），`-附` 于是形同虚设 —— S01–S10 的
   * `1-附（去掉名字之后的机制）：…` 不被认成字段起点，机制句被并进字段 1（实测 S01 字段 1
   * 199 字 vs 上游 107 字）。这正是上游 collect-schemes.mjs:241-245 注释里踩过的同一个坑：
   * 「只能收『一个分隔符都不带』的口子，不能反过来要求必须有点」。 */
  const SEP = '(-附|[.．])';
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    let m;
    // A: `3. 配色系统：正文`
    if ((m = new RegExp('^\\s*(\\d{1,2})' + SEP + '\\s*([^：:*\\d][^：:*]{0,38}?)\\s*：').exec(L))) {
      heads.push({ lineNo: i + 1, key: m[3].replace(/（[^）]*）/g, '').trim(), bodyStart: i + 1, inline: L.slice(m[0].length) });
      continue;
    }
    // B: `**4. 字体策略**` 独占一行
    if ((m = new RegExp('^\\s*\\*\\*(\\d{1,2})(-附)?[.．]?\\s*([^：:*\\d][^：:*]{0,38}?)\\*\\*\\s*$').exec(L))) {
      heads.push({ lineNo: i + 1, key: m[3].replace(/（[^）]*）/g, '').trim(), bodyStart: i + 1, inline: '' });
      continue;
    }
    // C: `1. **一句话视觉定义**：正文`
    if ((m = new RegExp('^\\s*(\\d{1,2})' + SEP + '?\\s*\\*\\*([^：:*\\d][^：:*]{0,38}?)\\*\\*\\s*[：:]').exec(L))) {
      heads.push({ lineNo: i + 1, key: m[3].replace(/（[^）]*）/g, '').trim(), bodyStart: i + 1, inline: L.slice(m[0].length) });
      continue;
    }
  }
  /* 字段区结束：自评 / 版本 / 校验 / 审查。
   * ⚠️ 自我纠错（第一版写错过）：这里原本还列了「真实上站文案｜可直接上线的文案｜上站文案三处」，
   * 于是 S11–S20 的文案段（落在字段 10 与 11 之间）被当成收尾，**字段 11/12 整段丢失**
   * （实测 S11 只剩 10 个字段、S13 同样）。文案段是插在字段区**中间**的段落，不是结尾。
   * 收尾只能认真正位于字段区之后的标记。 */
  let tail = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(?:\*\*)?(?:自评|版本|校验|审查)(?:\*\*)?\s*[：:]/.test(lines[i])) { tail = i; break; }
  }
  const fields = {};
  for (let i = 0; i < heads.length; i++) {
    const from = heads[i].bodyStart - 1 + (heads[i].inline ? 0 : 1);
    const to = Math.min(i + 1 < heads.length ? heads[i + 1].lineNo - 1 : tail, tail);
    if (to < from) continue;
    const bodyLines = heads[i].inline
      ? [heads[i].inline, ...lines.slice(heads[i].bodyStart, to)]
      : lines.slice(heads[i].bodyStart, to);
    const key = heads[i].key;
    if (!key || fields[key]) continue;
    fields[key] = {
      text: bodyLines.join('\n').trim(),
      startLine: heads[i].lineNo,
      endLine: Math.max(heads[i].lineNo, to),
      // 原话里所有 HEX（按出现顺序、去重），供与另两层对照
      hexes: [...new Set((bodyLines.join('\n').match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()))],
    };
  }
  const full = lines.join('\n');
  return {
    id, path, lines, fields,
    title: (/^>\s*原标题：\s*方案\s*\d+\s*[｜|]\s*(.+)$/m.exec(full) || [])[1] || '',
    meta: {
      struct: (/结构类型\*\*[：:]\s*([^｜|]+)/.exec(full) || [])[1] || '',
      threshold: (/认知门槛\*\*[：:]\s*([^｜|]+)/.exec(full) || [])[1] || '',
      tone: (/调性\*\*[：:]\s*([^｜|]+)/.exec(full) || [])[1] || '',
    },
    fieldKeys: Object.keys(fields),
  };
}

/* ────────────────────────── CSS :root ──────────────────────────
 * 独立实现：剥注释后取 `:root { ... }` 里的 `--name: value;`，并**保留同行注释**
 * （注释是 clean-dna 判主色的判据来源，必须留着才能复现它的结论）。
 * 另外记录 @media 内的 :root（作用域问题：全量 vars 会被媒体查询覆盖）。
 */
export function readRoot(id) {
  const dir = DIR_OF[id];
  if (!dir) return { declarations: [], hasRoot: false };
  const css = readFileSync(join(PROTO, dir, 'style.css'), 'utf8');
  const lines = css.split(/\r?\n/);
  const out = [];
  const mediaStack = [];
  let depth = 0, inRoot = false, rootDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (/@media[^{]*\{/.test(L)) mediaStack.push(L.trim().slice(0, 80));
    const opens = (L.match(/\{/g) || []).length;
    const closes = (L.match(/\}/g) || []).length;
    if (/^\s*:root\s*\{/.test(L)) { inRoot = true; rootDepth = depth + opens; }
    if (inRoot) {
      const m = /(--[\w-]+)\s*:\s*([^;]+);/.exec(L);
      if (m) {
        out.push({
          name: m[1],
          value: m[2].trim(),
          line: i + 1,
          note: (/\/\*(.*?)\*\//.exec(L) || [, ''])[1].trim(),
          media: mediaStack.length ? mediaStack[mediaStack.length - 1] : '',
        });
      }
      if (closes && depth + opens - closes < rootDepth) { inRoot = false; }
    }
    depth += opens - closes;
    if (closes && mediaStack.length && depth <= 0) mediaStack.length = 0;
  }
  return { declarations: out, hasRoot: out.length > 0, css };
}

export function hexOf(v) {
  const m = /#([0-9A-Fa-f]{6})\b/.exec(v || '');
  return m ? ('#' + m[1]).toUpperCase() : null;
}

/* ────────────────────────── 归一化 ──────────────────────────
 * 同一个字段在四层的**形状**不同，比较前必须落到同一个规范形。
 * 规范形一律是「数组/字符串的一种」，并在结果里注明原形，避免把形状差异误当值差异。
 */
export function paletteOfData(v) {
  return (v || []).map((h) => String(h).trim().toUpperCase()).filter((h) => /^#[0-9A-F]{6}$/.test(h));
}
export function paletteOfPrompts(v) {
  // prompts.js 里是 "#EFE7D7（paper）、#C1121F（red）…" 一个长串
  return String(v || '').split('、').map((s) => (/#[0-9A-Fa-f]{6}/.exec(s) || [])[0]).filter(Boolean).map((h) => h.toUpperCase());
}
export function paletteOfDna(v) {
  // dna-clean.json 里是 ["#EFE7D7 paper", ...]
  return (v || []).map((s) => (/#[0-9A-Fa-f]{6}/.exec(String(s)) || [])[0]).filter(Boolean).map((h) => h.toUpperCase());
}

/* 文案段的剥离（口径取上游 collect-schemes.mjs:614-631 的 cleanScenes，**独立重写**但同一判据）。
 *
 * 为什么必须有这一步：文案段在规格里**没有字段编号**，两种书写惯例各漏一次，方向还相反：
 *   路径 A（S11–S20）`**可直接上线的文案**：…` 独占一行，被并进**上一个**字段（字段 10 适用场景）的尾巴；
 *   路径 B（S21–S30）`上站文案三处：…` 与字段 10 正文**同一行**，也被并进字段 10。
 * 也就是说：**规格原文里字段 10 与「文案」在同一段，是上游切分器的边界问题**，
 * 不是作者把文案写进了「适用场景」。测绘必须把两者分开，否则会把上游的切分缺陷
 * 记成两层之间的「值不一致」——那就成了用错误口径去指控数据。
 *
 * 实测（本文件 C6 交叉校验）：不剥时 20/30 案在第 157/120/… 字符处开始分叉，
 * 分叉点全部落在「文案」标签上；剥离后 30/30 逐字相等（S13 的 audit 除外，那是上游**刻意**切的）。
 */
const COPY_LABEL = /(?:真实上站文案|可直接上线的文案|上站文案三处)[\s\p{P}“”"」]*[：:]/u;
export function stripCopyTail(s, opts = {}) {
  const t = String(s || '');
  const m = COPY_LABEL.exec(t);
  if (!m) return t.trim();
  const head = t.slice(0, m.index);
  const after = t.slice(m.index + m[0].length);
  const n = after.indexOf('不适合：');   // 路径 B：否定句被文案夹在中间，要接回来
  /* 收尾剥什么，取决于上游对**这个字段**做了什么，否则会凭空多/少一个字：
   *   · 适用场景：上游先 dec() 再 cleanScenes()，连句号一起剥 → 剥 `。`；
   *   · 设计师签名式怪癖：上游根本没跑 cleanScenes（它按 tailRe 在更早处截断，那个句号留着）→ 不剥 `。`。
   * 第一版对两者一律剥 `。`，结果 S01–S10 的 quirk 各少 1 字（97 vs 98），
   * 看起来像"我的切段漏了一个句号"，其实是**应用范围**不同，不是数据差异。 */
  const tail = opts.keepSentenceEnd ? /[\s；;，、*`]+$/ : /[\s；;。，、*`]+$/;
  return (head + (n >= 0 ? after.slice(n) : '')).replace(tail, '').trim();
}

export const toSet = (a) => new Set(a);export const sameSet = (a, b) => a.length === b.length && new Set(a).size === new Set(b).size && a.every((x) => b.includes(x));
export const sameSeq = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
export const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const uni = new Set([...A, ...B]).size;
  return uni ? inter / uni : 1;
};

export function writeJson(name, obj) {
  const p = join(FACTS, name);
  writeFileSync(p, JSON.stringify(obj, null, 1), 'utf8');
  return p;
}

/* 简易表格打印（报告与终端共用一套口径） */
export function mdTable(headers, rows) {
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return ['| ' + headers.join(' | ') + ' |',
    '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...rows.map((r) => '| ' + r.map(esc).join(' | ') + ' |')].join('\n');
}
