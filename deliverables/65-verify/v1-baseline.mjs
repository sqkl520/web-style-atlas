// V1 基线：用 HEAD 版 prompt-copy.js 复算「现状」长度，验证 +15 / +49 的净增量口径
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEL = join(HERE, '..', '..', 'prototypes', '_selection');

function load(copyPath) {
  const sandbox = { window: {} };
  sandbox.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };
  vm.createContext(sandbox);
  for (const f of ['data.js', 'prompts.js']) vm.runInContext(readFileSync(join(SEL, f), 'utf8'), sandbox, { filename: f });
  vm.runInContext(readFileSync(copyPath, 'utf8'), sandbox, { filename: copyPath });
  return sandbox.window.buildStylePrompt;
}

const head = load(join(HERE, 'frozen', 'prompt-copy.HEAD.js'));
const now = load(join(SEL, 'prompt-copy.js'));
const SCHEMES = (() => { const s = { window: {} }; vm.createContext(s); vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), s); return s.window.SCHEMES; })();

const BIZ = '一家只做手冲的咖啡店，五个产区的单一豆子';      // 20
const ACT = '看完想直接加微信问价，或者到店里坐下来喝一杯手冲'; // 24

const rows = SCHEMES.map((s) => ({
  id: s.id,
  headEmpty: head(s.id).length,
  nowEmpty: now(s.id).length,
  nowFilled: now(s.id, { biz: BIZ, action: ACT }).length,
  headFirst: head(s.id).split('\n')[0],
}));

const stat = (a) => { const s = [...a].sort((x, y) => x - y); return { min: s[0], max: s[s.length - 1], med: s[15] }; };
const he = stat(rows.map((r) => r.headEmpty));
const ne = stat(rows.map((r) => r.nowEmpty));
const nf = stat(rows.map((r) => r.nowFilled));
const dEmpty = [...new Set(rows.map((r) => r.nowEmpty - r.headEmpty))];
const dFilledVsHead = [...new Set(rows.map((r) => r.nowFilled - r.headEmpty))];
const dFilledVsNow = [...new Set(rows.map((r) => r.nowFilled - r.nowEmpty))];

console.log('=== V1 净增量口径核算 ===');
console.log(`HEAD 未填      : ${he.min}–${he.max} 中位 ${he.med}   （执行 A 声称 1617–1905）`);
console.log(`现版 未填      : ${ne.min}–${ne.max} 中位 ${ne.med}   （执行 A 声称 1632–1920）`);
console.log(`现版 已填(输入${BIZ.length + ACT.length}) : ${nf.min}–${nf.max} 中位 ${nf.med}`);
console.log(`未填增量 现-HEAD          : ${JSON.stringify(dEmpty)}      （声称 +15）`);
console.log(`已填增量 现已填-HEAD未填  : ${JSON.stringify(dFilledVsHead)}   （声称 输入44 → +49）`);
console.log(`已填增量 现已填-现未填    : ${JSON.stringify(dFilledVsNow)}   （相对本轮新基线的净增）`);
console.log(`\nHEAD 首行去重种类: ${[...new Set(rows.map((r) => r.headFirst))].length}`);
[...new Set(rows.map((r) => r.headFirst))].slice(0, 3).forEach((f) => console.log(`   「${f}」`));
