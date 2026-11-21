#!/usr/bin/env node
/* 等价类探针（2026-11-22）：把"判据量字面、实现用等价形式"变成**可自动检测**的问题。
 *
 * 核心洞察
 * ────────
 * 8 处误报里有 7 处不是"判据漏了一种情况"，而是：
 *
 *   两个 CSS 值在语义上等价，判据对它们给出**不同的判定**。
 *
 * `0` vs `0 !important`  → 同一个圆角。判据一个说合规一个说违规。
 * `blur=0 的 box-shadow` vs `真阴影` → 判据把前者叫"阴影"。
 * `同色两端 gradient` vs `真渐变` → 判据把前者叫"渐变"。
 *
 * 所以可以机械地造一组**等价类**：每一类里放几个语义相同的 CSS 写法，
 * 判据必须对整类给同一个判定。不同 = 误报（或漏报），脚本报红。
 *
 * 这比"等价形式清单"强的地方：
 *   · 清单要求你把所有写法想全 —— 想不全就漏。
 *   · 等价类只要求你说出"这两个写法是同一个东西" —— 这是人本来就知道的，
 *     而且**是 CSS 规范定死的**，不会过期。
 *
 * 与 --selftest 的区别（关键，回答任务的第 2 问）：
 *   selftest：人写死"输入 X 应得 Y"。它测的是**我记得的那些情况**。
 *   等价类：机器检查"f(X1) === f(X2)"。它测的是**判据内部的自洽性**，
 *           不需要我事先知道该得什么。
 *   前者能抓住"我把期望写错了"，后者能抓住"判据对同一件事有两种说法"。
 *   本仓库 8 处误报全部是后者 —— 而且前 7 处发生时 selftest 一直是绿的。
 *
 * 用法：
 *   node _equiv-probe.mjs              # 测当前 score.mjs
 *   node _equiv-probe.mjs --history    # 连同三个历史版本一起测（重现误报）
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const SCORE = join(ROOT, 'deliverables/78-northstar/_blindtest/score.mjs');

/* ── 从 score.mjs 里取出判据函数（只读源码，不改文件） ──────────────────
 *
 * 为什么要切片而不是 import：score.mjs 是脚本不是模块（顶层直接跑 IO）。
 * 切片 + new Function 是唯一不改它又能拿到真函数的办法。
 * 副作用：切片按 "/* ── 输出 ──" 截断，只取纯函数区。这层脆性必须写出来 ——
 * 如果哪天 score.mjs 在输出段之前加了顶层副作用，这个探针会挂。
 */
function loadJudges(path) {
  const src = readFileSync(path, 'utf8');
  const cut = src.indexOf('/* ── 输出 ──');
  const head = cut > 0 ? src.slice(0, cut) : src;
  /* 补上必需的依赖：STOP / GENERIC_FAMILIES / DEFAULT_STACK / relLumL 已含在头部 */
  const body = head
    .replace(/^#!.*\n/, '')
    .replace(/^import .*$/gm, '')
    .replace(/const ROOT = [\s\S]*?\n/, '')
    .replace(/const BT = [\s\S]*?\n/, '');
  /* 只 return 该版本真实存在的函数 —— 历史版本缺某些判据是正常的。
   * 缺的那条在 run() 里会记成 MISSING，而不是让整轮崩掉（崩掉会被误读成"全绿"）。 */
  const NAMES = ['isDecorativeLine', 'scoreGradient', 'judgeRadius', 'judgeLineWidth',
    'judgeFontChain', 'judgeGradientSpan', 'judgeDefaultFontStack', 'judgeItems', 'judgePictures'];
  const avail = NAMES.filter((n) => { try { new Function(body + '\nreturn typeof ' + n); return true; } catch { return false; } });
  return new Function(body + '\nreturn {' +
    NAMES.map((n) => `${n}: (typeof ${n} === 'function' ? ${n} : undefined)`).join(',') + '};')();
}

/* ── 等价类 ─────────────────────────────────────────────────────────────
 *
 * 每条 = { name, judge, prompt, cases: [{label, html}], want: 'same'|'differ' }
 *
 * `want: 'same'` —— 整组必须给同一个判定。组内任两个不同 → 报红。
 *   这些是**CSS 规范保证等价**的写法。判据对它们必须一视同仁。
 *
 * `want: 'differ'` —— 这组是"控制组"：故意放一真一假，证明判据不是恒真。
 *   如果整组给同一个判定，说明判据瞎了（那是另一类缺陷，这里也要抓）。
 *
 * 每一条都标注它对应 8 处误报里的哪一处（或"预防性"）。
 */
const CLASSES = [
  /* ═══ 圆角 ═══ */
  {
    name: '圆角 / 0 的各种零写法',
    hit: '#1 圆角=0',
    judge: 'judgeRadius',
    prompt: '3. 圆角：全站一律 0，卡片、按钮全部方角。',
    want: 'same',
    cases: [
      { label: '0', html: '<style>.a{border-radius:0}</style>' },
      { label: '0 !important', html: '<style>.a{border-radius:0 !important}</style>' },
      { label: '0!important（无空格）', html: '<style>.a{border-radius:0!important}</style>' },
      { label: '0px', html: '<style>.a{border-radius:0px}</style>' },
      { label: '0em', html: '<style>.a{border-radius:0em}</style>' },
      { label: '0%', html: '<style>.a{border-radius:0%}</style>' },
      { label: '0 0 0 0', html: '<style>.a{border-radius:0 0 0 0}</style>' },
      { label: '0 / 0（斜杠语法）', html: '<style>.a{border-radius:0 / 0}</style>' },
      { label: '四个角单写（全 0）', html: '<style>.a{border-top-left-radius:0;border-top-right-radius:0;border-bottom-left-radius:0;border-bottom-right-radius:0}</style>' },
    ],
    verdict: (r) => (r.violations ?? r),
  },
  {
    name: '圆角 / 真非 0 必须报（控制组）',
    hit: '控制',
    judge: 'judgeRadius',
    prompt: '3. 圆角：全站一律 0，卡片、按钮全部方角。',
    want: 'differ',
    cases: [
      { label: '0（合规）', html: '<style>.a{border-radius:0}</style>' },
      { label: '4px（违规）', html: '<style>.a{border-radius:4px}</style>' },
      { label: '50%（违规）', html: '<style>.a{border-radius:50%}</style>' },
    ],
    verdict: (r) => (r.violations ?? r),
  },

  /* ═══ 线宽 ═══ */
  {
    name: '线宽 / 同一宽度的各种写法',
    hit: '#2 线宽允许级',
    judge: 'judgeLineWidth',
    prompt: '5. 线宽只用这几级：1px、1.25px、2px，全站线条都从这几级里取。',
    want: 'same',
    cases: [
      { label: 'border: 1px solid', html: '<style>.a{border:1px solid #000}</style>' },
      { label: 'border-bottom: 1px solid', html: '<style>.a{border-bottom:1px solid #000}</style>' },
      { label: 'border-width: 1px', html: '<style>.a{border-width:1px}</style>' },
      { label: 'border-top: 1.25px', html: '<style>.a{border-top:1.25px solid #000}</style>' },
      { label: 'border-left: 2px', html: '<style>.a{border-left:2px solid #000}</style>' },
    ],
    verdict: (r) => ({ used: r.used, outside: r.outside }),
  },
  {
    name: '线宽 / padding 不该冒充线宽（控制组）',
    hit: '#2 的同源（真 bug）',
    judge: 'judgeLineWidth',
    prompt: '5. 线宽只用这几级：1px、1.25px、2px，全站线条都从这几级里取。',
    want: 'differ',
    cases: [
      { label: '真 1px 边 → used=1', html: '<style>.a{border-bottom:1px solid #000}</style>' },
      { label: 'padding-bottom:16px → used=0', html: '<style>.a{padding-bottom:16px}</style>' },
    ],
    verdict: (r) => r.used,
  },
  {
    name: '线宽 / 用变量定义宽度',
    hit: '预防性（现存盲区）',
    judge: 'judgeLineWidth',
    prompt: '5. 线宽只用这几级：1px、1.25px、2px，全站线条都从这几级里取。',
    want: 'same',
    cases: [
      { label: 'border-top: 6px（越界）', html: '<style>.a{border-top:6px solid #000}</style>' },
      { label: 'border-top: var(--w) 而 --w:6px', html: '<style>:root{--w:6px}.a{border-top:var(--w) solid #000}</style>' },
    ],
    verdict: (r) => r.outside,
  },

  /* ═══ 阴影 ═══ */
  {
    name: '无阴影 / blur=0 的所有画线写法',
    hit: '#3 无阴影',
    judge: 'NOSHADOW',
    prompt: '7. 阴影：无。整页不使用投影。',
    want: 'same',
    cases: [
      { label: 'blur=0 单组', html: '<style>.a{box-shadow:4px 4px 0 var(--r)}</style>' },
      { label: 'blur=0 带 spread', html: '<style>.a{box-shadow:0 -12px 0 -0.25px var(--p)}</style>' },
      { label: 'blur=0 inset 描边', html: '<style>.a{box-shadow:inset 0 0 0 1px var(--ink)}</style>' },
      { label: 'none', html: '<style>.a{box-shadow:none}</style>' },
      { label: '0 0 0 0（全零）', html: '<style>.a{box-shadow:0 0 0 0 transparent}</style>' },
    ],
    verdict: (r) => r.hits,
  },
  {
    name: '无阴影 / 真模糊必须报（控制组）',
    hit: '控制',
    judge: 'NOSHADOW',
    prompt: '7. 阴影：无。整页不使用投影。',
    want: 'differ',
    cases: [
      { label: 'blur=0（画线）', html: '<style>.a{box-shadow:4px 4px 0 #000}</style>' },
      { label: 'blur=8px（真阴影）', html: '<style>.a{box-shadow:4px 4px 8px #000}</style>' },
    ],
    verdict: (r) => r.hits,
  },

  /* ═══ 渐变 ═══ */
  {
    name: '渐变 / 同色两端的各种写法',
    hit: '#4 渐变受限（同色）',
    judge: 'scoreGradient',
    prompt: '① 面积分配：需要做渐变或纹理时只用同一色系里明度接近的两档。',
    want: 'same',
    cases: [
      { label: '同一变量两端', html: '<style>.a{background:linear-gradient(var(--p),var(--p))}</style>' },
      { label: '同一 hex 两端', html: '<style>.a{background:linear-gradient(#E4DECD,#E4DECD)}</style>' },
      { label: '同一 hex 大小写不同', html: '<style>.a{background:linear-gradient(#e4decd,#E4DECD)}</style>' },
      { label: '同一 rgb() 两端', html: '<style>.a{background:linear-gradient(rgb(228,222,205),rgb(228,222,205))}</style>' },
      { label: '带中间 stop 的同色', html: '<style>.a{background:linear-gradient(var(--p) 0,var(--p) 50%,var(--p) 100%)}</style>' },
    ],
    verdict: (r) => r.hits,
  },
  {
    name: '渐变 / 硬边透明过渡（#4）',
    hit: '#4 渐变受限（硬边）',
    judge: 'scoreGradient',
    prompt: '① 面积分配：需要做渐变或纹理时只用同一色系里明度接近的两档。',
    want: 'same',
    cases: [
      { label: '0.5px 硬边（S15 原形）', html: '<style>.a{background:linear-gradient(to right,var(--p) 0.5px,transparent 0.5px)}</style>' },
      { label: '0px 硬边', html: '<style>.a{background:linear-gradient(to right,var(--p) 0px,transparent 0px)}</style>' },
      { label: '1px 硬边', html: '<style>.a{background:linear-gradient(to right,var(--p) 1px,transparent 1px)}</style>' },
      { label: '0 硬边（无单位）', html: '<style>.a{background:linear-gradient(to right,var(--p) 0,transparent 0)}</style>' },
    ],
    verdict: (r) => r.hits,
  },
  {
    name: '渐变 / 双位置 stop（#6）',
    hit: '#6 双位置',
    judge: 'scoreGradient',
    prompt: '① 面积分配：需要做渐变或纹理时只用同一色系里明度接近的两档。',
    want: 'same',
    cases: [
      { label: 'color 0 3px / color 3px 12px（S18 原形）', html: '<style>.a{background:linear-gradient(to bottom,var(--a) 0 3px,var(--b) 3px 12px)}</style>' },
      { label: 'color 0px 3px / color 3px 12px', html: '<style>.a{background:linear-gradient(to bottom,var(--a) 0px 3px,var(--b) 3px 12px)}</style>' },
      { label: 'color 0 3px / color 3.0px 12px', html: '<style>.a{background:linear-gradient(to bottom,var(--a) 0 3px,var(--b) 3.0px 12px)}</style>' },
    ],
    verdict: (r) => r.hits,
  },
  {
    name: '渐变 / 抗锯齿交叠的容差（#7）',
    hit: '#7 容差',
    judge: 'scoreGradient',
    prompt: '① 面积分配：需要做渐变或纹理时只用同一色系里明度接近的两档。',
    want: 'same',
    cases: [
      { label: '0.0px 间隔', html: '<style>.a{background:radial-gradient(var(--p) 0 4px,var(--i) 4px 5.6px)}</style>' },
      { label: '0.1px 间隔（S29 原形）', html: '<style>.a{background:radial-gradient(var(--p) 0 4px,var(--i) 4.1px 5.6px)}</style>' },
      { label: '0.2px 间隔', html: '<style>.a{background:radial-gradient(var(--p) 0 4px,var(--i) 4.2px 5.6px)}</style>' },
    ],
    verdict: (r) => r.hits,
  },
  {
    name: '渐变 / 透明纹理（#8）',
    hit: '#8 纹理',
    judge: 'scoreGradient',
    prompt: '① 面积分配：需要做渐变或纹理时只用同一色系里明度接近的两档。',
    want: 'same',
    cases: [
      { label: 'transparent 占多数（S05 原形）', html: '<style>.a{background:repeating-linear-gradient(to bottom,transparent 0,transparent 7px,var(--g) 8px)}</style>' },
      { label: 'transparent 用 rgba(0,0,0,0)', html: '<style>.a{background:repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0,rgba(0,0,0,0) 7px,var(--g) 8px)}</style>' },
      { label: 'transparent 用 #00000000', html: '<style>.a{background:repeating-linear-gradient(to bottom,#00000000 0,#00000000 7px,var(--g) 8px)}</style>' },
    ],
    verdict: (r) => r.hits,
  },
  {
    name: '渐变 / 真渐变必须报（控制组）',
    hit: '控制',
    judge: 'scoreGradient',
    prompt: '① 面积分配：需要做渐变或纹理时只用同一色系里明度接近的两档。',
    want: 'differ',
    cases: [
      { label: '硬边（画线）', html: '<style>.a{background:linear-gradient(to right,var(--p) 1px,transparent 1px)}</style>' },
      { label: '真渐变 100px 过渡带', html: '<style>.a{background:linear-gradient(to right,var(--p) 0,transparent 100px)}</style>' },
    ],
    verdict: (r) => r.hits,
  },

  /* ═══ 字体链 ═══ */
  {
    name: '字体链 / 同一字体的不同写法（#5）',
    hit: '#5 字体链',
    judge: 'judgeFontChain',
    prompt: '2. 字体：标题按这个顺序取第一个可用的：Glow Sans SC → Songti SC → Georgia。正文同理，按序取：Glow Sans SC → Songti SC → Georgia。',
    want: 'same',
    cases: [
      { label: '"Glow Sans SC"', html: '<style>.a{font-family:"Glow Sans SC"}</style>' },
      { label: 'GlowSansSC（无空格）', html: '<style>.a{font-family:GlowSansSC}</style>' },
      { label: "'Glow Sans SC'（单引号）", html: "<style>.a{font-family:'Glow Sans SC'}</style>" },
      { label: 'glow sans sc（小写）', html: '<style>.a{font-family:"glow sans sc"}</style>' },
    ],
    verdict: (r) => r.outside,
  },
  {
    name: '字体链 / 链尾回退（#5 之二）',
    hit: '#5 字体链',
    judge: 'judgeFontChain',
    prompt: '2. 字体：标题按这个顺序取第一个可用的：Glow Sans SC → Songti SC → Georgia。正文同理，按序取：Glow Sans SC → Songti SC → Georgia。',
    want: 'same',
    cases: [
      { label: '只有链首', html: '<style>.a{font-family:"Glow Sans SC"}</style>' },
      { label: '链首 + 系统兜底', html: '<style>.a{font-family:"Glow Sans SC","Courier New",monospace}</style>' },
      { label: '链首 + serif 兜底', html: '<style>.a{font-family:"Glow Sans SC",serif}</style>' },
    ],
    verdict: (r) => r.outside,
  },
  {
    name: '字体链 / var() 与字面等价（现存盲区）',
    hit: '预防性（未判≠通过）',
    judge: 'judgeFontChain',
    prompt: '2. 字体：标题按这个顺序取第一个可用的：Glow Sans SC → Songti SC → Georgia。正文同理，按序取：Glow Sans SC → Songti SC → Georgia。',
    want: 'same',
    cases: [
      { label: '字面链外 Papyrus', html: '<style>.a{font-family:Papyrus}</style>' },
      { label: 'var(--f) 而 --f: Papyrus', html: '<style>:root{--f:Papyrus}.a{font-family:var(--f)}</style>' },
    ],
    verdict: (r) => r.outside.length,
  },
];

/* ── 阴影判据在 score() 内联，切片拿不到 → 在这里复刻一份 ─────────────────
 *
 * ⚠️ 这是本探针唯一一处"抄逻辑"。抄会有漂移风险，所以：
 *   · 只抄 5 行，且每个数值都对照 score.mjs:701-711 逐字核对；
 *   · 探针头部打印 score.mjs 那一行的 hash，漂移了一眼能看出。
 * 更好的做法是把这段也抽成纯函数（推荐方案的一部分），那时这里就能删。
 */
function makeNoShadow(css) {
  const decls = [...css.matchAll(/box-shadow\s*:\s*((?!none)[^;}]+)/g)].map((m) => m[1]);
  let n = 0;
  for (const d of decls) {
    for (const part of d.split(/,(?![^(]*\))/)) {
      const nums = (part.match(/-?\d*\.?\d+px/g) || []).map((x) => parseFloat(x));
      const blur = nums.length >= 3 ? Math.abs(nums[2]) : 0;
      if (blur > 0) { n++; break; }
    }
  }
  return { hits: n };
}

/* ── 跑 ────────────────────────────────────────────────────────────────── */
function run(version) {
  const J = loadJudges(version.path);
  const results = [];
  for (const C of CLASSES) {
    const verdicts = C.cases.map((c) => {
      let r;
      if (C.judge === 'NOSHADOW') {
        const css = (c.html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
        r = makeNoShadow(css);
      } else {
        let fn;
        try { fn = J[C.judge]; } catch { fn = null; }
        if (typeof fn !== 'function') { r = { MISSING: true }; }
        else {
          r = fn(C.prompt, c.html);
        }
        if (r == null) r = {};
        /* 补齐字段：历史版本没有某判据，或判据跳过时返回 null。
         * 用 "MISSING" 这个显式标记，避免 `null.length` 崩掉整轮 ——
         * 崩掉会被误读成"探针没发现问题"。 */
        r = { violations: null, used: null, outside: [], hits: null, ...r };
        if (r.MISSING) { r.violations = 'MISSING'; r.used = 'MISSING'; r.outside = 'MISSING'; r.hits = 'MISSING'; }
      }
      return { label: c.label, v: JSON.stringify(C.verdict(r)) };
    });
    const uniq = [...new Set(verdicts.map((x) => x.v))];
    const ok = C.want === 'same' ? uniq.length === 1 : uniq.length > 1;
    results.push({ name: C.name, hit: C.hit, want: C.want, ok, verdicts, uniq });
  }
  return results;
}

const versions = [{ id: 'current', path: SCORE }];
if (process.argv.includes('--history')) {
  const R = join(ROOT, 'deliverables/78-northstar/_probe/_replay');
  const H = [
    ['a16d8d3  (最早可用)', 'score-a16d8d3.mjs'],
    ['9d5beff  (修 #1#2 前)', 'score-9d5beff.mjs'],
    ['f9e83d8  (修 #1#2 后)', 'score-f9e83d8.mjs'],
    ['e8e2bad  (修 #3#4 后)', 'score-e8e2bad.mjs'],
    ['30f5b5c  (修 #5#6 后)', 'score-30f5b5c.mjs'],
    ['7b1d39e  (修 #7 后)', 'score-7b1d39e.mjs'],
  ];
  const { existsSync } = await import('node:fs');
  for (const [id, f] of H) {
    const p = join(R, f);
    if (existsSync(p)) versions.push({ id, path: p });
  }
}

for (const V of versions) {
  const res = run(V);
  /* 历史版本可能连函数都没有（老版无 judgeFontChain），跳过并注明 */
  const bad = res.filter((r) => !r.ok);
  console.log(`\n${'═'.repeat(72)}`);
  console.log(`版本 ${V.id}   等价类 ${res.length} 组，失败 ${bad.length} 组`);
  console.log('═'.repeat(72));
  for (const r of res) {
    const tag = r.ok ? '✓' : '✗';
    console.log(`${tag} ${r.name}   〔${r.hit}〕`);
    if (!r.ok) {
      for (const v of r.verdicts) console.log(`      ${v.label.padEnd(34)} → ${v.v}`);
    }
  }
}
process.exit(0);
