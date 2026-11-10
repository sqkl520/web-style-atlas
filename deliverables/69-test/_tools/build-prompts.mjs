// 在 Node 里跑线上 prompt-copy.js 的 buildStylePrompt(id)，把 30 案提示词导成文件。
// 只读 prototypes/_selection/{data,prompts,prompt-copy}.js；不读任何原型。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');
const OUT = join(ROOT, 'deliverables/69-test/_staging');
mkdirSync(OUT, { recursive: true });

const sandbox = {
  console,
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    createElement: () => ({ style: {}, appendChild(){}, remove(){}, addEventListener(){} }),
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    body: { appendChild(){} },
  },
  navigator: { clipboard: null },
};
sandbox.window.document = sandbox.document;
sandbox.window.console = console;
sandbox.window.addEventListener = () => {};
sandbox.self = sandbox.window;
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);

for (const f of ['data.js', 'prompts.js', 'prompt-copy.js']) {
  const code = readFileSync(join(SEL, f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
}
const W = sandbox.window;
if (typeof W.buildStylePrompt !== 'function') throw new Error('buildStylePrompt 未挂上');
if (!W.STYLE_PROMPTS) throw new Error('STYLE_PROMPTS 缺失');
if (!W.SCHEMES) throw new Error('SCHEMES 缺失');

const rows = [];
for (const s of W.STYLE_PROMPTS.schemes) {
  const p = W.buildStylePrompt(s.id);
  writeFileSync(join(OUT, `prompt-${s.id}.txt`), p, 'utf8');
  const sc = W.SCHEMES.find((x) => x.id === s.id) || {};
  rows.push({
    id: s.id,
    len: [...p].length,
    lines: p.split('\n').length,
    minItems: s.minItems,
    minPics: s.minPics,
    degrades: s.dna.degrades,
    radiusBare: !!s.dna.radiusBare,
    lineWidths: s.dna.lineWidths,
    shadow: s.dna.shadow,
    palette: s.dna.palette,
    tone: sc.tone || '',
    plain: s.plain,
  });
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(rows, null, 2), 'utf8');
for (const r of rows) {
  console.log(
    [r.id, r.len + '字', r.lines + '行', 'N=' + r.minItems, 'pics=' + r.minPics,
     r.degrades ? 'degrades' : 'autoflow', r.radiusBare ? 'R0' : 'R?',
     'port=' + String(r.palette).split(',').length].join('\t')
  );
}
console.log('\n写到', OUT);
