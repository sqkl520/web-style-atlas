#!/usr/bin/env node
/* 机制保真度：提示词机制句里的数值，在盲测产物里到底实现了没有？
 *
 * 【为什么需要它】
 *
 * `score.mjs` 的五类判据查配色/字体/几何/结构/禁项 —— **没有一类查机制**。
 * 实测 S13 的两份产物（新线 ACP vs 旧线沙箱）在五类上全过，
 * 但机制层 5/8 vs 8/8：新线丢了 `0.4mm`、`3%`、`14.5px` 三个全是机制量的值。
 * 详见 `_probe/79-measurement-layer-audit.md` §十。
 *
 * 机制句是"这个风格区别于同类"的唯一载体。配色/字体/圆角回答"像不像一个体面的页面"，
 * 机制回答"像不像**这一个**样板"。没有这一层，绿闸门分不出 5/8 和 8/8。
 *
 * 【三态，不是二态】
 *
 * 一个数值在产物里"没出现"有几种不同的含义，不能合并：
 *
 *   hit        —— 出现在会改变渲染的 CSS 声明里                     ✓
 *   script     —— 只出现在 <script> 里（JS 算出来的量，不是声明）    ~
 *   comment    —— 只在注释里（推导值，没有声明佐证）                  ~
 *   absent     —— 哪里都没有                                         ✗
 *
 * 这个分层是照抄 `check-prompts.mjs:1197-1203` 已有的做法 ——
 * 那里对**原型**做同样的事，把 comment / script 降成 WARN 而不是 FAIL。
 * 产物也应该用同一把尺。
 *
 * 【单位换算：只对 mm 做，且只做单向】
 *
 * `0.4mm` 在浏览器里约等于 1.51px（96dpi）。AI 完全可能写成 `1.5px`，
 * 那是**正确实现**而不是缺失。所以 mm → px 要认。
 * 但 deg / fr / % 不做换算 —— 它们没有通用等价，硬换会制造假阳性。
 * 这条限制写在结果里，免得被当成"全都能换"。
 *
 * 用法：
 *   node _mech-fidelity.mjs            # 所有已跑案
 *   node _mech-fidelity.mjs S21        # 单案
 *   node _mech-fidelity.mjs --selftest
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = ROOT + '/deliverables/78-northstar/_blindtest';
const P = {};
new Function('window', readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'))(P);

/* 抓机制句里的数值 token。单位表与 check-prompts 保持一致，另加 deg/fr。
 *
 * ⚠️ 不能用 `\b` 收尾 —— 这是个真踩过的坑。
 * `\b` 在 `%` 与空格之间不成立（`%` 是非词字符，空格也是，两者之间没有边界），
 * 于是 `1%` / `3%` / `5.5%` 全部抓不到。实测 S34 的机制句
 * 「左缩进分 0/3/5.5/2/7/4/1% 七档」只被抓到 `72px` 一个值，
 * 而它真正的核心是那七个百分比。
 *
 * 改成用「前面不是数字或小数点」+「后面不是字母数字」来界定边界，
 * 并且允许 `%` 结尾（它天然不在 `\w` 里）。 */
const NUM_RE = /(?<![\d.])\d+(?:\.\d+)?(?:px|deg|fr|mm|%)(?![\w%])/g;

/* mm → px（96dpi）。只此一种换算，理由见文件头。 */
function equivalents(tok) {
  const out = [tok];
  const m = tok.match(/^(\d+(?:\.\d+)?)mm$/);
  if (m) {
    const px = Number(m[1]) * 96 / 25.4;
    /* 允许 ±0.1px 的写法差异，把 1.51 与 1.5 都列上 */
    for (const v of [px, Math.round(px * 10) / 10, Math.round(px)]) {
      out.push(String(Number(v.toFixed(2))) + 'px');
    }
  }
  return out;
}

/* 把产物切成三段：CSS 声明体 / <script> 体 / 注释。注释要先从 CSS 里剔除，
 * 否则"只在注释里出现"会被误判成"实现了"。 */
function splitArtifact(html) {
  const style = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  const script = (html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n');
  const comments = (html.match(/\/\*[\s\S]*?\*\//g) || []).join('\n');
  /* 声明坐标系：去掉注释与 <script>，剩下的才是"真的在渲染" */
  const decl = style.replace(/\/\*[\s\S]*?\*\//g, ' ') + '\n' +
    (html.match(/style="[^"]*"/g) || []).join('\n');
  return { decl, script, comments };
}

function judge(mechanism, html) {
  const { decl, script, comments } = splitArtifact(html);
  const toks = [...new Set(mechanism.match(NUM_RE) || [])];
  const rows = [];
  for (const tok of toks) {
    const forms = equivalents(tok);
    /* 数值必须作为**完整 token** 出现，不能用子串 ——
     * `60px` 不能命中 `160px`，这是 _discriminator-lib 记过的坑。 */
    const inDecl = forms.some((f) => new RegExp('(?:^|[^\\d.])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\d])').test(decl));
    const inScript = forms.some((f) => new RegExp('(?:^|[^\\d.])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\d])').test(script));
    const inComment = forms.some((f) => comments.includes(f));
    const state = inDecl ? 'hit' : inScript ? 'script' : inComment ? 'comment' : 'absent';
    rows.push({ tok, forms, state });
  }
  const hit = rows.filter((r) => r.state === 'hit').length;
  const soft = rows.filter((r) => r.state === 'script' || r.state === 'comment').length;
  return { rows, hit, soft, absent: rows.filter((r) => r.state === 'absent').length, total: rows.length };
}

function selfTest() {
  const S = [];
  const eq = (n, g, w) => S.push([n, JSON.stringify(g) === JSON.stringify(w), g, w]);
  /* 完整 token 匹配：60px 不能被 160px 命中 */
  const j1 = judge('60px', '<style>.a{border:160px solid}</style>');
  eq('子串不算命中', j1.hit, 0);
  const j2 = judge('60px', '<style>.a{border:60px solid}</style>');
  eq('完整 token 命中', j2.hit, 1);
  /* 只在 script 里 → script 态，不是 hit */
  const j3 = judge('1.5px', '<style>.a{color:red}</style><script>var h=1.5px</script>');
  eq('只在 script 里记 script 态', j3.rows[0].state, 'script');
  /* 只在注释里 → comment 态 */
  const j4 = judge('14px', '<style>/* 14px */ .a{color:red}</style>');
  eq('只在注释里记 comment 态', j4.rows[0].state, 'comment');
  /* mm → px 换算：0.4mm ≈ 1.51px，写成 1.5px 算实现 */
  const j5 = judge('0.4mm', '<style>.a{box-shadow:inset 0 0 0 1.5px #000}</style>');
  eq('mm 换算后命中', j5.hit, 1);
  eq('mm 保留了原 token', j5.rows[0].tok, '0.4mm');
  /* 完全没有 → absent */
  const j6 = judge('7px', '<style>.a{color:red}</style>');
  eq('完全没有记 absent', j6.rows[0].state, 'absent');
  /* 变异：同一个输入两次结果必须一致 */
  eq('幂等', JSON.stringify(judge('12px 34%', '<style>.a{width:12px}</style>')),
    JSON.stringify(judge('12px 34%', '<style>.a{width:12px}</style>')));
  /* ⚠️ 百分比必须能抓到 —— 用 `\b` 收尾时 `34%` 会漏。
   * 实测 S34 的机制句写的是「0/3/5.5/2/7/4/1%」这种**省略写法**：
   * 只有最后一个带单位，前面的裸数字在原句里就是百分比。
   * 那六个裸数字本判据抓不到，是**数据写法**的问题，不是正则的 ——
   * 所以这里的用例只断言"带 % 的能抓到"，不假装能还原省略写法。 */
  eq('带百分号的值能抓到', judge('缩进分 1% 与 7%', '<style></style>').rows.map((r) => r.tok), ['1%', '7%']);
  eq('px 与百分数能共存', judge('72px 与 1%', '<style></style>').rows.length, 2);
  /* 记录这条局限：斜杠省略写法会少算。S34 的七个缩进档只数到 1 个。 */
  eq('斜杠省略写法只抓到带单位的那一个',
    judge('0/3/5.5/2/7/4/1%', '<style></style>').rows.map((r) => r.tok), ['1%']);
  const bad = S.filter(([, ok]) => !ok);
  for (const [n, ok, g, w] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${n}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(g)}，期望 ${JSON.stringify(w)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

if (process.argv.includes('--selftest')) {
  console.log('=== 机制保真度自测 ===');
  process.exit(selfTest() ? 0 : 1);
}

const arg = process.argv[2];
const ids = arg && /^S\d/.test(arg)
  ? [arg]
  : readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d/.test(d.name)).map((d) => d.name).sort();

console.log('机制保真度：提示词机制句里的数值，产物里实现了几个？\n');
let totHit = 0, totSoft = 0, totAbs = 0, totAll = 0;
for (const id of ids) {
  const dir = `${BT}/${id}`;
  const htmlPath = ['index.html', 'out.html'].map((f) => `${dir}/${f}`).find((f) => existsSync(f));
  if (!htmlPath) continue;
  /* S34-r2 这种带后缀的案号，数据要回退到前两位 */
  const base = id.match(/^S\d{2}/)[0];
  const sp = P.STYLE_PROMPTS.schemes.find((x) => x.id === base);
  if (!sp || !sp.dna || !sp.dna.mechanism) continue;
  const r = judge(sp.dna.mechanism, readFileSync(htmlPath, 'utf8'));
  totHit += r.hit; totSoft += r.soft; totAbs += r.absent; totAll += r.total;
  const mark = r.absent === 0 ? '✓' : r.absent <= 1 ? '~' : '✗';
  console.log(`  ${mark} ${id.padEnd(8)} 命中 ${r.hit}/${r.total}　软 ${r.soft}　缺 ${r.absent}`);
  for (const row of r.rows) {
    if (row.state === 'hit') continue;
    const tag = row.state === 'script' ? '（只在 script 里）' : row.state === 'comment' ? '（只在注释里）' : '';
    console.log(`        ${row.tok.padEnd(8)} ${row.state}${tag}`);
  }
}
console.log('');
console.log(`合计：命中 ${totHit}/${totAll}　软 ${totSoft}　缺失 ${totAbs}`);
console.log('');
console.log('说明：');
console.log('  · 「软」= 只在 script 或注释里出现，不是 CSS 声明。原型侧同样的判定');
console.log('    在 check-prompts.mjs:1197-1203 里降成 WARN，这里保持一致。');
console.log('  · mm 做了 → px 换算（0.4mm ≈ 1.51px）；deg / fr / % 不换算 ——');
console.log('    它们没有通用等价，硬换会制造假阳性。');
console.log('  · 这一层 score.mjs 完全没有，所以它报"五类全过"时机制可能是缺的。');
