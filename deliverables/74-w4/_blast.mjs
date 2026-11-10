// 只读模拟：在内存里改写 dna.mechanism，看 prompt 长度如何漂移，以及 check-docs 的
// nums/prompt-len 断言会落到 PASS / WARN / FAIL 哪一档。不写任何仓库文件。
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SEL = 'D:/Web/style/prototypes/_selection/';

function lengths(mutator) {
  const win = {};
  const sandbox = { window: win };
  vm.createContext(sandbox);
  sandbox.document = {
    readyState: 'complete', addEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
    vm.runInContext(readFileSync(SEL + f, 'utf8'), sandbox, { filename: f });
  }
  const P = win.STYLE_PROMPTS;
  if (mutator) mutator(P);
  const build = win.buildStylePrompt;
  const lens = P.schemes.map((s) => build(s.id).length).sort((a, b) => a - b);
  return { min: lens[0], max: lens[lens.length - 1], median: lens[Math.floor(lens.length / 2)], all: lens };
}

function judge(doc, actual, label) {
  const DRIFT = 0.03;
  if (doc === actual) return `${label} PASS`;
  const near = actual > 0 && Math.abs(doc - actual) / actual <= DRIFT;
  return `${label} ${near ? 'WARN(drift)' : 'FAIL'}  doc=${doc} actual=${actual} dev=${((Math.abs(doc - actual) / actual) * 100).toFixed(2)}%`;
}

const base = lengths(null);
console.log('BASELINE  min/med/max =', base.min, base.median, base.max);

// README 当前写的是 1814–2138，中位 1988
const DOC = { min: 1814, max: 2138, median: 1988 };

const scenarios = {
  'S03 9栏→12栏(右9)': (P) => {
    const s = P.schemes.find((x) => x.id === 'S03');
    s.dna.mechanism = s.dna.mechanism.replace('右侧 9 栏', '右侧 12 栏中的 9 栏');
  },
  'S07 5栏/7栏→5fr/7fr': (P) => {
    const s = P.schemes.find((x) => x.id === 'S07');
    s.dna.mechanism = s.dna.mechanism.replace('正面 5 栏对背面 7 栏', '正面 5fr 对背面 7fr（column-count 2/3）');
  },
  'S17 96px→88px': (P) => {
    const s = P.schemes.find((x) => x.id === 'S17');
    s.dna.mechanism = s.dna.mechanism.replace('96px', '88px');
  },
  'S23 mech 加 91 字': (P) => {
    const s = P.schemes.find((x) => x.id === 'S23');
    s.dna.mechanism = s.dna.mechanism + '增'.repeat(91);
  },
  'S09 mech 减 60 字': (P) => {
    const s = P.schemes.find((x) => x.id === 'S09');
    s.dna.mechanism = s.dna.mechanism.slice(0, 30);
  },
  '全部 30 条 mech 各 +20 字': (P) => {
    for (const s of P.schemes) s.dna.mechanism = (s.dna.mechanism || '') + '增'.repeat(20);
  },
};

console.log('\nREADME 文档值: min 1814 / median 1988 / max 2138；容差 3%\n');
for (const [name, fn] of Object.entries(scenarios)) {
  const r = lengths(fn);
  console.log(`== ${name}`);
  console.log(`   实测 min/med/max = ${r.min} / ${r.median} / ${r.max}`);
  console.log('   ' + judge(DOC.min, r.min, '下限'));
  console.log('   ' + judge(DOC.median, r.median, '中位'));
  console.log('   ' + judge(DOC.max, r.max, '上限'));
  console.log('');
}
