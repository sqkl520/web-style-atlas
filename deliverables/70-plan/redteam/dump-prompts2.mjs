// dump-prompts2.mjs —— 从 **HEAD 的 blob** 装载 30 条提示词，而不是工作区文件。
//
// 为什么必须这样：本轮有并发写者（另一个 Agent 正在改 clean-dna.mjs 并重生成
// prompts.js）。工作区里的 prompts.js 在我开工 40 分钟内变了两次 hash。
// 任何「提示词有多少字 / 有没有字号」的结论，如果读工作区，就可能指向一个
// 已经不存在的版本 —— 这正是 61-plan 记录过的教训（"独立验证在被测对象
// 持续变动时进行"）。
//
// 所以本探针先把 HEAD 的三个 blob 解到 %TEMP%，在 vm 里按
// data.js → prompts.js → prompt-copy.js 的顺序装载，再逐案 buildStylePrompt。
//
// 跑法：node deliverables/70-plan/redteam/dump-prompts2.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const TMP = join(tmpdir(), 'rt-head');
mkdirSync(join(TMP, 'prototypes/_selection'), { recursive: true });

const FILES = ['prototypes/_selection/data.js', 'prototypes/_selection/prompts.js', 'prototypes/_selection/prompt-copy.js'];
for (const f of FILES) {
  const dest = join(TMP, f);
  if (existsSync(dest)) continue;
  const sha = execFileSync('git', ['rev-parse', `HEAD:${f}`], { cwd: ROOT, encoding: 'utf8' }).trim();
  const buf = execFileSync('git', ['cat-file', 'blob', sha], { cwd: ROOT, maxBuffer: 1 << 28 });
  writeFileSync(dest, buf);
}
const hashOf = (rel) => execFileSync('git', ['hash-object', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
const headOf = (rel) => execFileSync('git', ['rev-parse', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8' }).trim();

const read = (p) => readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
const doc = {
  readyState: 'complete',
  addEventListener() {}, removeEventListener() {},
  getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
  createElement() {
    return {
      style: { cssText: '', setProperty() {} }, dataset: {},
      setAttribute() {}, getAttribute() { return null; }, appendChild() {}, addEventListener() {}, remove() {},
      classList: { toggle() {}, add() {}, remove() {} }, focus() {}, select() {}, setSelectionRange() {},
    };
  },
  body: { appendChild() {}, removeChild() {} },
};
const sandbox = { console: { log() {}, warn() {} }, document: doc, navigator: {}, setTimeout, clearTimeout, matchMedia: () => ({ matches: false, addEventListener() {} }) };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
for (const f of FILES) vm.runInContext(read(join(TMP, f)), ctx, { filename: f.split('/').pop() });

const P = sandbox.window.STYLE_PROMPTS;
const out = [];
for (const s of P.schemes) {
  const prompt = sandbox.window.buildStylePrompt(s.id);
  out.push({
    id: s.id, plain: s.plain, minItems: s.minItems, minPics: s.minPics, hard: !!s.hard,
    dna: s.dna, palette: s.dna.palette, lineWidths: s.dna.lineWidths, h1Size: s.dna.h1Size,
    radius: s.dna.radius, shadow: s.dna.shadow, fonts: s.dna.fonts, mechanism: s.dna.mechanism,
    reuse: s.dna.reuse, risk: s.dna.risk, capacity: s.capacity,
    len: prompt.length, prompt,
  });
}
const meta = {
  source: 'HEAD blobs',
  head: {
    'prototypes/_selection/data.js': headOf('prototypes/_selection/data.js'),
    'prototypes/_selection/prompts.js': headOf('prototypes/_selection/prompts.js'),
    'prototypes/_selection/prompt-copy.js': headOf('prototypes/_selection/prompt-copy.js'),
  },
  worktree: {
    'prototypes/_selection/data.js': hashOf('prototypes/_selection/data.js'),
    'prototypes/_selection/prompts.js': hashOf('prototypes/_selection/prompts.js'),
    'prototypes/_selection/prompt-copy.js': hashOf('prototypes/_selection/prompt-copy.js'),
  },
  repoHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
  lens: { min: Math.min(...out.map((x) => x.len)), max: Math.max(...out.map((x) => x.len)), median: [...out].sort((a, b) => a.len - b.len)[15].len },
  builtAt: new Date().toISOString(),
};
writeFileSync(join(ROOT, 'deliverables/70-plan/redteam/prompts30.json'), JSON.stringify(out, null, 1), 'utf8');
writeFileSync(join(ROOT, 'deliverables/70-plan/redteam/prompts30-meta.json'), JSON.stringify(meta, null, 1), 'utf8');
console.log('来源 = HEAD blobs；repo HEAD = ' + meta.repoHead.slice(0, 7));
console.log('工作区 prompts.js 是否等于 HEAD: ' + (meta.head['prototypes/_selection/prompts.js'] === meta.worktree['prototypes/_selection/prompts.js']));
console.log('提示词长度: ' + meta.lens.min + '–' + meta.lens.max + '，中位 ' + meta.lens.median + '（n=' + out.length + '）');
for (const r of out) console.log(r.id + ' | ' + r.len + ' | ' + r.palette);
