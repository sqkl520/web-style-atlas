/* 复核 minItems 到底是什么：逐案数一遍 HTML 里**同构重复单元的兄弟组**。
 *
 * 只读 prototypes/，不写任何原型文件。判据照 60-minitems-degrade-audit.md §判定口径 1：
 * 同父级、同 tag、同 class（或 class 族前缀）的兄弟组。
 * 这里不用通用解析器，而是**按案给一条显式定位规则**，因为本轮只需要抽查 5+ 案，
 * 而通用解析器（99-scratch/minitems/parse.mjs）算出来的东西已经被审计文档裁定过一轮。
 * 显式规则的好处是：报告里可以直接抄「文件:行 + 数到了几个」，别人能一眼复核。
 *
 * 跑：node deliverables/66-exec/_count-units.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = 'D:/Web/style/prototypes/';
const dirs = readdirSync(ROOT).filter((d) => /^S\d\d-/.test(d));
const dirOf = (id) => {
  const d = dirs.find((x) => x.startsWith(id));
  if (!d) throw new Error('no dir for ' + id);
  return d;
};
const read = (id, f) => readFileSync(ROOT + dirOf(id) + '/' + f, 'utf8');

/* 每案：一条「怎么数」的规则 + 一个为什么会数成这个数的说明。
 * kind: 'single'  一个父级下的一个兄弟组
 *       'split'   两个兄弟组相加（编号连续，跨栏/跨页，S07 就是这种）
 *       'pergroup' 每段各自 N 个，minItems 取单段 N（S18 是这种）
 *
 * ⚠️ 2026-10-27 修：`<span class="ln">` 这个正则**漏了带修饰类的行**。
 * S18 的 60 行里有一批是 `class="ln ln--out"`（挂牌/回执那几行，带一个光标块），
 * 只匹配完全等于 `"ln"` 的写法会数出 47 行 / 3 段 = 15.67，看起来像数据的错。
 * 实测正确的数是每段 20 行（`aria-label` 也写着「行 1 至 20」/「21 至 40」/「41 至 60」）。
 * 教训：审计文档说 20 就该先怀疑自己的正则，而不是先怀疑数据。
 */
const RULES = {
  S01: { kind: 'single', re: /<figure class="plate\b/g, sel: '.plate-grid > figure.plate' },
  S07: { kind: 'split', re: /<ol class="toc"[\s\S]*?<\/ol>/g },
  S15: { kind: 'single', re: /<a class="hot"/g, sel: 'g.zones > a.hot' },
  S17: { kind: 'pergroup', re: /<tr style="--row-index:\d+">/g, sel: 'tbody#ledger-body > tr' },
  S23: { kind: 'single', re: /<article class="flake\b/g, sel: 'wall > article.flake' },
  S29: { kind: 'single', re: /<g class="pt"/g, sel: 'svg.diag > g.pt' },
  S03: { kind: 'single', re: /<figure class="band"/g, sel: '.stream > figure.band' },
  S19: { kind: 'single', re: /<li class="dw\b/g, sel: '.rowwrap > li.dw' },
  S18: { kind: 'pergroup', re: /<span class="ln(?:"|\s)/g, sel: 'pre.lines > span.ln' },
  S20: { kind: 'single', re: /<li class="plate"/g, sel: 'ul.plates > li.plate' },
  S02: { kind: 'split', re: /<li class="step\b/g, sel: 'ol.ladder-left + ol.ladder-right > li.step' },
  S06: { kind: 'single', re: /<article class="card\b/g, sel: '.river > article.card' },
};

const MIN = JSON.parse(readFileSync('D:/Web/style/prototypes/_prompts/minitems-parsed.json', 'utf8')
  .replace(/^\uFEFF/, ''));
const byId = Object.fromEntries(MIN.map((x) => [x.id, x]));

const out = [];
for (const [id, r] of Object.entries(RULES)) {
  const html = read(id, 'index.html');
  let n = 0;
  const detail = [];
  if (r.kind === 'split') {
    const groups = [...html.matchAll(r.re)];
    for (const g of groups) {
      const c = (g[0].match(/<li[ >]/g) || []).length;
      n += c;
      const start = /start="(\d+)"/.exec(g[0]);
      detail.push(c + (start ? '(start=' + start[1] + ')' : ''));
    }
  } else if (r.kind === 'pergroup') {
    const all = (html.match(r.re) || []).length;
    // 单段 N：用 S18 的 <pre class="lines"> 分段数，S17 直接整表
    const segs = (html.match(/<pre class="lines"/g) || []).length;
    n = segs > 1 ? all / segs : all;
    detail.push('total=' + all + (segs > 1 ? ' / ' + segs + '段' : ''));
  } else {
    n = (html.match(r.re) || []).length;
  }
  const meta = byId[id];
  out.push({
    id, counted: n, minItems: meta.minItems, degrades: meta.degrades,
    match: n === meta.minItems, detail: detail.join(' + '), sel: r.sel || '',
  });
}
console.log('案号  数到的单元  minItems  degrades  一致?  拆分明细');
for (const r of out) {
  console.log(
    r.id.padEnd(5) + String(r.counted).padStart(8) + String(r.minItems).padStart(10) +
    String(r.degrades).padStart(10) + (r.match ? '   ✓  ' : '   ✗  ') + r.detail
  );
}
console.log('\n不一致的：' + (out.filter((r) => !r.match).map((r) => r.id).join(' ') || '(无)'));
