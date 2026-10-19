#!/usr/bin/env node
// 为选型台收集 30 个方案的展示数据。
//
// 数据来源刻意分三层，优先级从高到低：
//   1. prototypes/_specs/_CURRENT-VALUES.md —— **当前有效**的背景/主色/按钮字色/错误码（权威）
//   2. prototypes/_specs/Sxx.md —— 12 字段正文（是修正前原文，只用于取描述性文字）
//   3. prototypes/<dir>/.inspect/report.json —— 闸门结果、屏数、真实图片数、截图清单
// 为什么不只读 _specs：字段 3 的配色是修正前的；S04 的旧主色 #E8871E 就是被终局轮改掉的。
//
//   node collect-schemes.mjs          # 写 prototypes/_selection/data.js
//   node collect-schemes.mjs --check  # 只看解析结果，不写盘
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const SPECS = join(PROTO, '_specs');
const OUTDIR = join(PROTO, '_selection');
const check = process.argv.includes('--check');

const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const hexes = (s) => [...new Set([...String(s).matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase()))];

// ---- 1 解析 _CURRENT-VALUES.md 的逐案表 ----
const cur = {};
{
  const t = readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8');
  for (const line of t.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(S\d{2})\*\*\s*([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|/.exec(line);
    if (!m) continue;
    const [, id, cn, bgCell, primaryCell, , btnCell, errCell] = m;
    const bg = hexes(bgCell)[0] || null;
    const primary = hexes(primaryCell)[0] || null;
    let buttonText = null;
    if (/白字/i.test(btnCell)) buttonText = '#FFFFFF';
    else buttonText = hexes(btnCell)[0] || null;
    const codeM = /([A-Z][A-Z0-9]{1,12}-\d{1,4})/.exec(errCell) || /([A-Z][A-Z0-9]{1,12}-\d{1,4})/.exec(m[4]) || null;
    cur[id] = { cn: dec(cn), bg, primary, buttonText, errorCode: codeM ? codeM[1] : null };
  }
}
console.log(`_CURRENT-VALUES.md 解析出 ${Object.keys(cur).length} 案`);

// ---- 1b 解析 §4 的 Lead 补入错误码表（S21–S30 的源文件里没有，见该节说明）----
const leadCodes = {};
{
  const t = readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8');
  const sec = t.split(/^## 4 /m)[1] || '';
  for (const line of sec.split(/\r?\n/)) {
    const m = /^\|\s*(S\d{2})[^|]*\|[^|]*`([A-Z][A-Z0-9]{0,12}-[A-Z]{0,2}\d{1,4})`/.exec(line);
    if (m) leadCodes[m[1]] = m[2];
  }
}
console.log(`§4 Lead 补入错误码 ${Object.keys(leadCodes).length} 条（${Object.keys(leadCodes).join(' ')}）`);

// ---- 2 解析每个单案规格 ----
const FIELDS = ['一句话视觉定义', '机制', '美学家族与参考', '配色系统', '字体策略', '布局与网格', '关键视觉元素', '动效与交互', '去 AI 味审查点', '反 AI 味风险与规避', '适用场景', '可落地要点', '设计师签名式怪癖'];
function parseSpec(id) {
  const p = join(SPECS, id + '.md');
  if (!existsSync(p)) return null;
  const text = readFileSync(p, 'utf8');
  // 标题在 `> 原标题：方案 N｜中文名（English Name）` 里（块引用），不是 ### 标题
  const titleM = /^>\s*原标题：\s*方案\s*\d+\s*[｜|]\s*(.+)$/m.exec(text)
    || /^###\s*方案\s*\d+\s*[｜|]\s*(.+)$/m.exec(text);
  let cn = '', en = '';
  if (titleM) {
    const t = titleM[1].replace(/\[高危改造\]/g, '').trim();
    const em = /^(.*?)（([^）]+)）\s*$/.exec(t);
    if (em) { cn = em[1].trim(); en = em[2].trim(); } else cn = t;
  }
  const metaM = /\*\*结构类型\*\*：\s*([^\n｜|]+)[｜|]\s*\*\*认知门槛\*\*：\s*([^\n｜|]+)[｜|]\s*\*\*调性\*\*：\s*([^\n]+)/.exec(text);
  let fr = '', structure = '', threshold = '', tone = '';
  if (metaM) {
    const s = metaM[1].trim();
    fr = /^R/.test(s) ? 'R' : /^F/.test(s) ? 'F' : '';
    structure = (/[（(]([^）)]+)[）)]/.exec(s) || [, s])[1].trim();
    threshold = metaM[2].trim();
    tone = metaM[3].replace(/[｜|].*$/, '').trim();
  }

  // 字段标题有**三种书写惯例**，都要认：
  //   A（S01–S10）  1. 一句话视觉定义：正文（同一行）
  //   B（S11–S20）  **1. 一句话视觉定义**\n正文（标题整行加粗独占一行）
  //   C（S21–S30）  1. **一句话视觉定义**：正文（字段名加粗、冒号在其后）
  const starts = [];
  // 末尾的 [.．] 必须是**可选**的：`1-附（去掉名字之后的机制）：` 在 1 后面没有点，
  // 原先把点写成必需，于是"1-附"没被认成字段起点，它的正文被并进了字段 1，
  // 结果选型台里"一句话视觉定义"带着一串"1-附（…）：一块实色多边形…"。
  // 加 `[^\n：*\d]` 开头保护：否则 "2026 年 3 月：" 这类行会被误认成字段 "20"。
  const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '：', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  for (const m of text.matchAll(new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  for (const m of text.matchAll(new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'))) {
    starts.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  }
  starts.sort((a, b) => a.i - b.i);
  // 字段区之后的收尾段落，任何一个出现都表示字段区结束
  const tailRe = /^\s*(?:\*\*)?(?:真实上站文案|自评|版本|校验|审查)(?:\*\*)?\s*[：:]/m;
  const tailM = tailRe.exec(text.slice(starts.length ? starts[0].i : 0));
  const tailAbs = tailM && starts.length ? starts[0].i + tailM.index : text.length;
  const fields = {};
  for (let i = 0; i < starts.length; i++) {
    const key = starts[i].key.replace(/（[^）]*）/g, '').trim();
    let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
    if (to > tailAbs) to = tailAbs;
    const seg = text.slice(starts[i].end, to);
    if (key && !fields[key]) fields[key] = dec(seg);
  }
  // 文案的标签有**三种**，且 S21–S30 把它折进了字段 10 里（"上站文案三处：主张句…按钮…空状态…"）：
  //   S01–S10  真实上站文案：主张句"…"；按钮"…"；空状态"…"；错误状态"…"
  //   S11–S20  **可直接上线的文案**：主张句「…」；按钮「…」；空状态「…」；错误状态「…（错误码 X）」
  //   S21–S30  字段 10 里的"上站文案三处：主张句"…"按钮"…"空状态"…"——**没有错误状态那一条**
  const copyM = /(?:真实上站文案|可直接上线的文案|上站文案三处)\*{0,2}\s*[：:]\s*([\s\S]*?)(?=(?:\n\s*(?:\*\*)?(?:自评|版本|校验|审查))|不适合|\n---|$)/m.exec(text);
  const copy = copyM ? dec(copyM[1]) : '';
  // 把文案拆成四段，便于选型台逐条展示。"错误状态"在 S21–S30 里根本不存在，会留空。
  const part = (label) => {
    const re = new RegExp(label + '\\s*[：:]?\\s*[「"\']([^」"\']+)[」"\']');
    const m = re.exec(copy);
    return m ? m[1].trim() : '';
  };
  const copyParts = {
    claim: part('主张句'),
    button: part('按钮'),
    empty: part('空状态'),
    error: part('错误状态'),
  };
  // 错误码形状不止一种：P-03 / E-114 / BOOK-409 / SCAN-E114 / IMG-12-3。
  // 注意 [A-Z][A-Z0-9]{1,12} 会漏掉单字母前缀（P-03），必须用 {0,12}。
  const CODE = '([A-Z][A-Z0-9]{0,12}-[A-Z]{0,2}\\d{1,4}(?:-\\d{1,3})?)';
  const errFromCopy = new RegExp('错误码[\\s：:]*' + CODE).exec(copy)
    || new RegExp('错误码[\\s：:]*' + CODE).exec(text);
  // 主色兜底：_CURRENT-VALUES.md 有 17 案写的是"见 _specs/Sxx.md"，
  // 那些案必须回字段 3 去认。字段 3 里"主色"可能写在 HEX 前也可能写在 HEX 后。
  const p3raw = fields['配色系统'] || '';
  const primM = /主色[^#\n]{0,24}(#[0-9A-Fa-f]{6})/.exec(p3raw)
    || /(#[0-9A-Fa-f]{6})[^#\n]{0,24}主色/.exec(p3raw)
    || /主色[\s\S]{0,40}?(#[0-9A-Fa-f]{6})/.exec(p3raw);
  const primaryFromSpec = primM ? primM[1].toUpperCase() : null;
  // 按钮字色兜底：字段 3 里明写"白字／#FFFFFF 作按钮底"的，取之
  const btnM = /按钮[\s\S]{0,40}?(?:白字|#FFFFFF)/.exec(p3raw);
  const buttonFromSpec = btnM ? '#FFFFFF' : null;
  return { cn, en, fr, structure, threshold, tone, fields, copy, copyParts, errorFromCopy: errFromCopy ? errFromCopy[1] : null, primaryFromSpec, buttonFromSpec };
}

// ---- 3 扫原型目录 ----
const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const byId = new Map(dirs.map((d) => [d.slice(0, 3), d]));

const out = [];
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const dir = byId.get(id) || null;
  const spec = parseSpec(id);
  const c = cur[id] || {};
  const rec = {
    id, dir,
    cn: spec ? spec.cn : (c.cn || ''),
    en: spec ? spec.en : '',
    fr: spec ? spec.fr : '', structure: spec ? spec.structure : '',
    threshold: spec ? spec.threshold : '', tone: spec ? spec.tone : '',
    def: spec && spec.fields['一句话视觉定义'] ? spec.fields['一句话视觉定义'] : '',
    family: spec && spec.fields['美学家族与参考'] ? spec.fields['美学家族与参考'] : '',
    fonts: spec && spec.fields['字体策略'] ? spec.fields['字体策略'] : '',
    layout: spec && spec.fields['布局与网格'] ? spec.fields['布局与网格'] : '',
    visuals: spec && spec.fields['关键视觉元素'] ? spec.fields['关键视觉元素'] : '',
    motion: spec && spec.fields['动效与交互'] ? spec.fields['动效与交互'] : '',
    risk: spec && spec.fields['反 AI 味风险与规避'] ? spec.fields['反 AI 味风险与规避'] : '',
    scenes: spec && spec.fields['适用场景'] ? spec.fields['适用场景'] : '',
    quirk: spec && spec.fields['设计师签名式怪癖'] ? spec.fields['设计师签名式怪癖'] : '',
    copy: spec ? spec.copy : '',
    copyParts: spec ? spec.copyParts : { claim: '', button: '', empty: '', error: '' },
    bg: c.bg || null,
    primary: c.primary || (spec ? spec.primaryFromSpec : null) || null,
    buttonText: c.buttonText || (spec ? spec.buttonFromSpec : null) || null,
    errorCode: c.errorCode || (spec ? spec.errorFromCopy : null) || leadCodes[id] || null,
    errorCodeSource: c.errorCode ? '规格文案' : (spec && spec.errorFromCopy ? '规格文案' : (leadCodes[id] ? 'Lead 补入（源文件缺，见 _CURRENT-VALUES.md §4）' : null)),
    palette: [],
    built: false, gate: null, shots: { desktop: [], tablet: [], mobile: [] },
  };
  // 配色：当前值优先，其余从字段 3 取（字段 3 的顺序＝角色顺序）
  const p3 = spec && spec.fields['配色系统'] ? spec.fields['配色系统'] : '';
  const fromSpec = hexes(p3);
  const pal = [];
  if (rec.bg) pal.push(rec.bg);
  if (rec.primary && !pal.includes(rec.primary)) pal.push(rec.primary);
  for (const h of fromSpec) { if (pal.length >= 4) break; if (!pal.includes(h)) pal.push(h); }
  rec.palette = pal;

  if (dir) {
    const rep = join(PROTO, dir, '.inspect', 'report.json');
    rec.built = existsSync(join(PROTO, dir, 'index.html'));
    if (existsSync(rep)) {
      try {
        const j = JSON.parse(readFileSync(rep, 'utf8'));
        const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
        const warns = (j.findings || []).filter((f) => f.level === 'WARN');
        const d = (j.viewports || []).find((v) => v.width === 1440);
        rec.gate = {
          fail: fails.length, warn: warns.length,
          failIds: [...new Set(fails.map((f) => f.id))],
          warnIds: [...new Set(warns.map((f) => f.id))],
          at: j.at,
          screens: d ? d.screens : null,
          realPictures: d ? d.metrics.page.realPictures : null,
          overflow: d ? d.metrics.page.horizontalOverflow : null,
          words: d ? d.metrics.page.words : null,
        };
        for (const im of j.images || []) {
          const nm = im.width >= 1100 ? 'desktop' : im.width >= 600 ? 'tablet' : 'mobile';
          if (im.fold) rec.shots[nm].push(`../${dir}/.inspect/${im.fold.split(/[\\/]/).pop()}`);
          for (const pg of im.pages || []) rec.shots[nm].push(`../${dir}/.inspect/${pg.split(/[\\/]/).pop()}`);
        }
      } catch { /* 报告坏了就当没有 */ }
    }
  }
  out.push(rec);
}

const built = out.filter((r) => r.built && r.shots.desktop.length).length;
const clean = out.filter((r) => r.gate && r.gate.fail === 0).length;
console.log(`30 案：有页面 ${out.filter((r) => r.built).length}｜有截图 ${built}｜FAIL=0 ${clean}`);
const noDef = out.filter((r) => !r.def).map((r) => r.id);
const noPal = out.filter((r) => r.palette.length < 2).map((r) => r.id);
if (noDef.length) console.log('⚠ 没解析出一句话定义的：' + noDef.join(' '));
if (noPal.length) console.log('⚠ 配色不足 2 个的：' + noPal.join(' '));

if (!check) {
  mkdirSync(OUTDIR, { recursive: true });
  const js = '/* 由 prototypes/_build/collect-schemes.mjs 生成，勿手改。\n   数据来源优先级：_CURRENT-VALUES.md（当前有效色值） > _specs/Sxx.md（12 字段） > .inspect/report.json（闸门与截图） */\nwindow.SCHEMES = ' + JSON.stringify(out, null, 1) + ';\n';
  writeFileSync(join(OUTDIR, 'data.js'), js, 'utf8');
  console.log(`已写 prototypes/_selection/data.js（${(js.length / 1024).toFixed(1)} KB）`);
} else {
  // 直接打印自检表：不要用 pwsh 的 > 去接，那会写成 UTF-16 变成"二进制文件"
  console.log('\n方案 中文名                     F/R 结构         门槛 背景      主色      按钮      错误码        配色数 页面 闸门');
  for (const r of out) {
    const g = r.gate ? `FAIL=${r.gate.fail} WARN=${r.gate.warn}` : '—';
    console.log(
      r.id + ' ' + String(r.cn).padEnd(20) + ' ' + (r.fr || '?') + '   ' + String(r.structure).padEnd(12) + ' ' +
      String(r.threshold).padEnd(4) + ' ' + String(r.bg || '—').padEnd(9) + ' ' + String(r.primary || '—').padEnd(9) + ' ' +
      String(r.buttonText || '—').padEnd(9) + ' ' + String(r.errorCode || '—').padEnd(12) + ' ' +
      String(r.palette.length).padStart(2) + '   ' + (r.built ? '✓' : '✗') + '    ' + g +
      (r.def ? '' : '   ⚠无定义')
    );
  }
  const miss = (f) => out.filter((r) => !f(r)).map((r) => r.id);
  console.log('\n缺 一句话视觉定义：' + (miss((r) => r.def).join(' ') || '无'));
  console.log('缺 美学家族：      ' + (miss((r) => r.family).join(' ') || '无'));
  console.log('缺 字体策略：      ' + (miss((r) => r.fonts).join(' ') || '无'));
  console.log('缺 布局与网格：    ' + (miss((r) => r.layout).join(' ') || '无'));
  console.log('缺 真实上站文案：  ' + (miss((r) => r.copy).join(' ') || '无'));
  console.log('缺 背景或主色：    ' + (miss((r) => r.bg && r.primary).join(' ') || '无'));
  console.log('缺 错误码：        ' + (miss((r) => r.errorCode).join(' ') || '无'));
  console.log('配色 < 3 个：      ' + (miss((r) => r.palette.length >= 3).join(' ') || '无'));
}
