/* 生成负对照 S99 的任务书。
 *
 * 为什么要「注入一个假案子再调产品函数」，而不是手抄一份 S31 的 task.txt 改字段：
 *   手抄会漏。这一轮的红队缺口正是「任务书与产品提示词不同构」——
 *   上一版盲测提示词比产品少了一半约束（40 行 vs 21 行）。
 *   负对照的全部价值在于「除了风格本身，别的都一样」，所以格式必须**由同一个函数产出**，
 *   不是照着抄。这里把 S99 像真案子一样塞进 window.SCHEMES / window.STYLE_PROMPTS，
 *   再调 window.buildStylePrompt('S99') —— 输出与 S31 的 task.txt 逐节同构，
 *   连「6. 这个版式的硬前提」这一条在不在，都由 reuse 字段有没有值自动决定。
 *
 * 用法：node deliverables/78-northstar/_probe/_make-S99-task.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'deliverables/78-northstar/blind/S99/task.txt');

/* ── S99 的 DNA ────────────────────────────────────────────────────────────
 *
 * 色值 5/5 未被任何原型使用（_s99-design.mjs 实测，并已对 style.css 原文复验）。
 * 字体：Karla 0 案使用；Newsreader 只在 2 案的 bodyStack 里当兜底、没当过主字体。
 * ⚠️ 设计稿建议的「Spectral 换 Besley」是错的 —— Besley 已被 S25 用作 display
 *    （prototypes/S25-spotcolor-contents-zine/style.css）。所以正文换成 Newsreader。
 *
 * 数字都刻意选了库里没有的：h1 93px（现有 35 案为 56/68/72/74.9/76/77.8/79.9/80/80.6/
 * 86/86.4/88/92/95/96/96.5/100/104/106/106.6/108），字号比 6.2（现有 3.7–6.7 里没有 6.2），
 * 线宽 1px、2px（S31 只有 1px）。占比 6/1 与 S31 相同 —— 这是**故意**的：
 * 条目规模与图片位是控制变量，负对照只应该改「风格」一个变量。 */
const S99 = {
  id: 'S99',
  dir: 'S99-dimension-chain-margin',
  plain: '左边挂一条尺寸链，先读行数再读内容',
  scenes: ['结构设计工作室', '工程顾问'],
  minItems: 6,
  minPics: 1,
  hard: false,
  capacity: { id: 'S99', minItems: 6, degrades: 'no', minPics: 1 },
  dna: {
    palette: '#E8E3D9（paper）、#1F2A2E（ink）、#7A8C8E（ink-soft）、#3C4A4D（paper-deep）、#C9A227（accent）',
    fonts: {
      display: 'Karla',
      body: 'Newsreader',
      mono: '',
      displayStack: ['Karla', 'Noto Sans SC'],
      bodyStack: ['Newsreader', 'Noto Serif SC', 'Songti SC'],
    },
    radius: '全直角 0',
    radiusBare: true,
    shadow: '无阴影',
    lineWidths: '1px、2px',
    h1Size: 'clamp(44px, 6.5vw, 93px)',
    bodySize: '15px',
    h1SizeAt1440: 93,
    mechanism:
      '整页的骨架是一条贴在左侧 132px 空白里的尺寸链：每块内容的上下沿各横向引出一条 6px 延长线，' +
      '两条延长线之间是一条 1px 尺寸线，尺寸线两端各一枚 1×9px 的端点短线，正中留 12px 断口、' +
      '断口里竖排这一块的行数（正文 24px 一行）；总尺寸记在最外侧，分段尺寸按 18px 逐级内移——' +
      '读序是先读最外侧的总行数、再逐级读分段、最后才读块里的字。',
    degrades: false,
    risk:
      '规避动作三条：一是尺寸链只量内容块的真实高度，读数必须等于该块实际占的行数，链条不能变成装饰刻度；' +
      '二是三个可测值——132px 尺寸链栏宽、1×9px 端点短线、12px 断口——必须同时出现在 style.css 与页面上，' +
      '少一个就退化成普通的左侧竖线；三是零圆角零投影，任何“浮起”只允许来自 1px 与 2px 的线宽差。' +
      '另有一条反向风险：行数读数容易被写成装饰数字——每一块的读数都必须是它自己的行数，六块的行数不许相同。',
    reuse:
      '最难被复用到别的品牌之处：尺寸链量的是这一页自己的行数——换一套内容，链上的数字全变，而链的位置不动。',
  },
};

/* ── 与 blind-run.mjs 同一套 DOM stub / 加载顺序 ───────────────────────────
 * 直接复用它的做法，免得两个脚本的 stub 分叉成两份真源。 */
function loadBuildPrompt() {
  const stubEl = () => ({
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, appendChild() {}, addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], innerHTML: '', textContent: '',
    insertBefore() {}, removeChild() {}, remove() {}, focus() {}, cloneNode() { return stubEl(); },
  });
  const w = {};
  w.window = w;
  w.document = {
    readyState: 'complete',
    getElementById: () => stubEl(),
    createElement: stubEl, querySelector: () => null, querySelectorAll: () => [],
    body: stubEl(), documentElement: stubEl(), addEventListener() {},
  };
  w.navigator = { clipboard: { writeText: async () => {} } };
  w.setTimeout = () => {}; w.clearTimeout = () => {};
  w.console = { warn() {}, log() {}, error() {} };
  const ctx = vm.createContext(w);
  for (const f of ['prototypes/_selection/data.js', 'prototypes/_selection/prompts.js']) {
    vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  /* S99 作为「第 36 个案」注入两条数据链：
   *   window.SCHEMES  —— buildPrompt 从它取 tone，以及 hasVoid 检测会扫它的字符串字段
   *   STYLE_PROMPTS   —— buildPrompt 从它取 plain / minItems / minPics / dna
   * 注入必须发生在 prompt-copy.js 加载**之前**吗？不需要：pick() 每次调用都现场遍历
   * P.schemes，tone 也是现场遍历 SCHEMES。两处都是晚绑定，所以放这里也行。
   * 但 prompt-copy.js 顶部 `var P = window.STYLE_PROMPTS` 是早绑定，所以必须先加载
   * prompts.js —— 上面已经加载了。 */
  w.SCHEMES.push({ id: 'S99', cn: '尺寸链页边', en: 'Dimension Chain Margin', tone: '机能冷峻 / 工业' });
  w.STYLE_PROMPTS.schemes.push(S99);
  try {
    vm.runInContext(readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'), ctx,
      { filename: 'prototypes/_selection/prompt-copy.js' });
  } catch (e) {
    if (!/Cannot read properties of undefined|is not a function/.test(e.message)) throw e;
  }
  if (typeof w.buildStylePrompt !== 'function') throw new Error('buildStylePrompt 不存在');
  return w.buildStylePrompt;
}

const build = loadBuildPrompt();
const text = build('S99');
if (!text) throw new Error('S99 提示词为空');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, text);
const lines = text.split('\n');
console.log(`写入 ${OUT}`);
console.log(`  ${lines.length} 行 / ${Buffer.byteLength(text)} 字节`);
console.log('  （S31 task.txt = 40 行 / 5025 字节；行数一致才说明格式同构）');
