/**
 * 08 · 规格点名的「标题字体」 vs CSS 实际用的标题字体 —— 设计意图是否落地。
 *
 * 为什么单独做这一步：07 的"点名族人命中率"混进了太多噪声
 * （跨案引用、被替换的旧字体、可变轴参数如 opsz/SOFT/WONK）。
 * 真正决定 Q3 结论的是**一个**问题：
 *   规格说标题用 X，CSS 实际用 Y，X 和 Y 是同一个吗？
 *
 * 取法（刻意保守，只要能确定的）：
 *   规格侧：字段 4 里紧跟在「标题」之后第一对被反引号包住的英文字体名
 *           （S01–S17 多为「标题用 `X`」，S21–S30 多为「标题与表头用 `X`」）
 *   CSS 侧：:root 的 --display / --f-display / --f-disp 等语义变量展开后的**第一个**族名；
 *           没有语义变量时，回落到 h1 规则的 font-family 第一个族名
 *
 * 运行：node deliverables/71-plan/facts/08-font-intent-vs-css.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IDS, PROTO, DIR_OF, loadDnaClean, parseSpec, readRoot, writeJson, mdTable,
} from './lib.mjs';

const C = Object.fromEntries(loadDnaClean().rows.map((r) => [r.id, r]));

const NOT_A_FONT = /^(size-adjust|font-display|font-weight|font-size|letter-spacing|line-height|swap|optional|block|auto|latin|latin-ext|opsz|SOFT|WONK|wght.*|OFL.*)$/i;

const rows = [];
for (const id of IDS) {
  const p4 = (parseSpec(id).fields['字体策略'] || {}).text || '';
  const dir = DIR_OF[id];
  const cssRaw = readFileSync(join(PROTO, dir, 'style.css'), 'utf8');
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  const root = readRoot(id);
  const varsMap = {};
  for (const d of root.declarations) varsMap[d.name] = d.value;
  const expand = (v) => String(v).replace(/var\(\s*(--[\w-]+)\s*(?:,([^)]*))?\)/g, (_, n, fb) => varsMap[n] || (fb || ''));
  const firstFamily = (v) => {
    for (const part of expand(v).split(',')) {
      const s = part.trim().replace(/^["']|["']$/g, '').trim();
      if (!s) continue;
      if (/^(serif|sans-serif|monospace|system-ui|ui-[\w-]+|cursive|fantasy|inherit|initial|unset)$/i.test(s)) continue;
      if (/^var\(/.test(s)) continue;
      return s;
    }
    return null;
  };

  /* ── 规格侧：标题字体 ──
   * 字段 4 有**两种写法**，都要认（第一版只认反引号，于是 12 案抽不出标题字体，
   * 「一致 13/30」这个数是口径残缺造成的，不是数据结论）：
   *   A 反引号式：`标题用 \`Anton\`（SIL OFL 1.1…）`        —— S21–S30 为主
   *   B 裸名式：  `标题＝Archivo Black 与同超家族的 Archivo`  —— S01 这类，**没有反引号**
   */
  let specTitle = null, specCtx = '', specForm = null;
  const ti = p4.search(/标题/);
  if (ti >= 0) {
    const win = p4.slice(ti, ti + 48);
    specCtx = win.replace(/\s+/g, ' ');
    const bt = win.match(/`([^`]{2,44})`/);
    if (bt && /^[A-Za-z][A-Za-z0-9 .\-–]*$/.test(bt[1].trim()) && !NOT_A_FONT.test(bt[1].trim())) {
      specTitle = bt[1].trim(); specForm = '反引号';
    } else {
      /* 裸名式：取「标题」之后紧跟的「＝/用/为/：」再取一串拉丁字母（允许空格与大写），
       * 到中文/括号/逗号为止。例：`标题＝Archivo Black 与同超家族…` → Archivo Black */
      const m = /标题\s*[＝=用是为：:]\s*([A-Za-z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*)/.exec(win);
      if (m) {
        let cand = m[1].trim();
        /* 截掉被中文粘连的尾巴：只保留首字母大写的词序列，遇到全小写连接词（与/和/of）就停。
         * `Archivo Black 与…` 已由正则的中文边界挡住；这里再挡 `Fraunces` 后接小写词的情况。 */
        specTitle = cand; specForm = '裸名';
      }
    }
  }

  /* ── CSS 侧：标题实际字体（三层回落） ── */
  const displayVarNames = ['--display', '--f-display', '--f-disp', '--font-display', '--disp', '--f-title', '--title', '--head'];
  let cssTitle = null, cssSource = null;
  for (const n of displayVarNames) {
    if (varsMap[n]) { const f = firstFamily(varsMap[n]); if (f) { cssTitle = f; cssSource = n; break; } }
  }
  if (!cssTitle) {
    /* h1 规则的 font-family。
     * 但 S01 这类案里裸 `h1` 规则**没有** font-family（只设字号/字重），
     * 真正画字的是 `.masthead h1` 继承 body 的 --f-text，而拉丁标题走 `h1 .latin` 的 --f-latin。
     * 所以要按「选择器含 h1」的**所有**规则找，并优先取带 font-family 的那条。 */
    const h1Rules = [];
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sel = m[1].trim();
      if (!/(^|[\s,>+~])h1\b|\bh1\s*[.,:>+~]/.test(sel)) continue;
      const fm = /font-family\s*:\s*([^;}]+)/.exec(m[2]);
      if (fm) h1Rules.push({ sel, fam: firstFamily(fm[1]) });
    }
    if (h1Rules.length) {
      // 优先取选择器最"具体"的那条（含 class 的优先于裸 h1）
      h1Rules.sort((a, b) => b.sel.length - a.sel.length);
      cssTitle = h1Rules[0].fam; cssSource = 'h1 系规则 ' + h1Rules[0].sel.replace(/\s+/g, ' ').slice(0, 40);
    }
  }
  if (!cssTitle) {
    // 任意带 display 语义的变量兜底
    for (const d of root.declarations) {
      if (/display|disp/i.test(d.name)) { const f = firstFamily(d.value); if (f) { cssTitle = f; cssSource = d.name + '(兜底)'; break; } }
    }
  }

  /* DNA 侧（clean-dna 自己算出来的 display）*/
  const dnaDisplay = C[id].fonts ? C[id].fonts.display : null;
  const dnaStack = C[id].fonts ? (C[id].fonts.displayStack || []) : [];

  const norm = (s) => String(s || '').toLowerCase().replace(/[\s'"-]/g, '');
  const same = !!(specTitle && cssTitle && (norm(specTitle).includes(norm(cssTitle)) || norm(cssTitle).includes(norm(specTitle))));
  const sameDna = !!(specTitle && dnaDisplay && (norm(specTitle).includes(norm(dnaDisplay)) || norm(dnaDisplay).includes(norm(specTitle))));
  // dna 的完整栈里有没有规格点名的那款
  const inStack = !!(specTitle && dnaStack.some((f) => norm(f).includes(norm(specTitle)) || norm(specTitle).includes(norm(f))));

  rows.push({
    id, specTitle, cssTitle, cssSource, dnaDisplay, dnaStack,
    same, sameDna, inStack,
    specCtx,
  });
}

const sum = {
  n: rows.length,
  specTitleFound: rows.filter((r) => r.specTitle).length,
  cssTitleFound: rows.filter((r) => r.cssTitle).length,
  same: rows.filter((r) => r.same).length,
  same_ids: rows.filter((r) => r.same).map((r) => r.id),
  diff: rows.filter((r) => r.specTitle && r.cssTitle && !r.same).map((r) => ({
    id: r.id, spec: r.specTitle, css: r.cssTitle, source: r.cssSource, dna: r.dnaDisplay, inStack: r.inStack,
  })),
  dnaEqCss: rows.filter((r) => r.dnaDisplay && r.cssTitle && normEq(r.dnaDisplay, r.cssTitle)).length,
  specInDnaStack: rows.filter((r) => r.inStack).length,
};
function normEq(a, b) {
  const n = (s) => String(s || '').toLowerCase().replace(/[\s'"-]/g, '');
  return n(a).includes(n(b)) || n(b).includes(n(a));
}
writeJson('08-font-intent-vs-css.json', { at: new Date().toISOString(), summary: sum, rows });

console.log('=== 08 规格的标题字体 vs CSS 的标题字体 ===');
console.log('规格侧能抽出标题字体：' + sum.specTitleFound + '/30 · CSS 侧能抽出：' + sum.cssTitleFound + '/30');
console.log('两者一致：' + sum.same + '/30');
console.log('DNA 的 display === CSS 的标题字体：' + sum.dnaEqCss + '/30');
console.log('规格点名的字体出现在 DNA 的 displayStack 里：' + sum.specInDnaStack + '/30');
console.log('');
console.log('不一致的 ' + sum.diff.length + ' 案：');
for (const d of sum.diff) console.log('  ' + d.id + '  规格「' + d.spec + '」 vs CSS「' + d.css + '」(' + d.source + ')  DNA display「' + d.dna + '」 栈内含规格字体:' + (d.inStack ? '是' : '否'));
console.log('');
console.log(mdTable(['案', '规格标题字体', 'CSS 标题字体', 'CSS 来源', 'DNA display', '一致'],
  rows.map((r) => [r.id, r.specTitle || '—', r.cssTitle || '—', r.cssSource || '—', r.dnaDisplay || '—', r.same ? '✓' : '✗'])));
console.log('');
console.log('→ deliverables/71-plan/facts/08-font-intent-vs-css.json');
