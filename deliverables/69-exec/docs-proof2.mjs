/* 用 check-docs 自己的方式（vm 执行 data.js）来数，而不是正则凑。
 * 目标：给出「现在」与「重新生成之后」两套 gateFailZero 与 gateFailIds，
 * 并指出 README 里哪些句子会因此变红。
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const TMP = 'D:/Web/style/deliverables/69-exec/_docsim';
mkdirSync(TMP, { recursive: true });

const load = (js) => {
  const win = {};
  const sandbox = { window: win };
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox, { filename: 'data.js' });
  return win.SCHEMES;
};

const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const SCHEMES = load(src);
const zero = (S) => S.filter((s) => !s.gate || !(s.gate.fail > 0));
const bad = (S) => S.filter((s) => s.gate && s.gate.fail > 0);

console.log('--- data.js 快照（当前仓库里那份）---');
console.log(`  30 案中 FAIL=0：${zero(SCHEMES).length}`);
console.log(`  有 FAIL：${bad(SCHEMES).map((s) => `${s.id}(${s.gate.fail}:${(s.gate.failIds || []).join('/')})`).join(' ') || '（无）'}`);

// 模拟重新生成：把这些案的 gate 覆盖成当前 report.json 的真实值
import { readdirSync } from 'node:fs';
const live = {};
for (const d of readdirSync('D:/Web/style/prototypes').filter((x) => /^S\d{2}-/.test(x))) {
  const j = JSON.parse(readFileSync(`D:/Web/style/prototypes/${d}/.inspect/report.json`, 'utf8').replace(/^\uFEFF/, ''));
  const f = (j.findings || []).filter((x) => x.level === 'FAIL');
  const w = (j.findings || []).filter((x) => x.level === 'WARN');
  live[d.slice(0, 3)] = { fail: f.length, warn: w.length, failIds: [...new Set(f.map((x) => x.id))], warnIds: [...new Set(w.map((x) => x.id))], at: j.at };
}
const SIM = SCHEMES.map((s) => (live[s.id] ? { ...s, gate: { ...(s.gate || {}), ...live[s.id] } } : s));
console.log('\n--- 模拟「重新生成 data.js 之后」（gate 取当前 report.json）---');
console.log(`  30 案中 FAIL=0：${zero(SIM).length}`);
console.log(`  有 FAIL：${bad(SIM).map((s) => `${s.id}(${s.gate.fail}:${(s.gate.failIds || []).join('/')})`).join(' ') || '（无）'}`);
console.log(`  相对快照变化的案：${SCHEMES.filter((s) => JSON.stringify(s.gate) !== JSON.stringify((SIM.find((x) => x.id === s.id) || {}).gate)).map((s) => s.id).join(' ')}`);

console.log('\n--- README 里的硬编码断言（会被 29 打破的）---');
const files = ['README.md', 'README-EN.md'];
const pats = [
  [/[\d]+\s*个闸门 FAIL=0/g, '中文·达标案数'],
  [/[\d]+\s*案 FAIL=0/g, '中文·达标案数'],
  [/[\d]+\s*prototypes? pass the gate with FAIL\s*=?\s*0/gi, '英文·达标案数'],
  [/[\d]+\s*个原型机械闸门 FAIL=0/g, '中文·机械闸门'],
];
for (const f of files) {
  const t = readFileSync('D:/Web/style/' + f, 'utf8');
  const lines = t.split('\n');
  for (const [re, label] of pats) {
    lines.forEach((l, i) => {
      if (re.test(l)) { console.log(`  ${f}:${i + 1}  [${label}]  ${l.trim().slice(0, 110)}`); }
      re.lastIndex = 0;
    });
  }
}

// 写一份模拟 data.js，供人工复核（不落进仓库路径）
writeFileSync(`${TMP}/data.sim.js`, 'window.SCHEMES = ' + JSON.stringify(SIM, null, 1) + ';\n', 'utf8');
console.log(`\n模拟文件：${TMP}/data.sim.js（仓库内文件未改动）`);
