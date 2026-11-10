// 逐字核对 TEMPLATES 的 scenes / colors / desc 与 templates/ 下真实文件。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const pc = readFileSync(`${ROOT}/prototypes/_selection/prompt-copy.js`, 'utf8');
const a = pc.indexOf('var TEMPLATES = [');
const b = pc.indexOf('/* 索引词 → README 词');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(pc.slice(a, b) + '\nthis.T=TEMPLATES;', ctx);
const TEMPLATES = ctx.T;

const readmeOf = (dir) => readFileSync(`${ROOT}/templates/${dir}/README.md`, 'utf8');
const cssOf = (dir) => readFileSync(`${ROOT}/templates/${dir}/style.css`, 'utf8');

const DIRS = { M01: 'M01-clean-corporate', M02: 'M02-warm-local', M03: 'M03-bold-creator' };
console.log('TEMPLATES 收录:', TEMPLATES.map((t) => t.id).join(', '));
const onDisk = readdirSync(`${ROOT}/templates`, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
console.log('templates/ 实际目录:', onDisk.join(', '));
console.log('未被 TEMPLATES 收录的目录:', onDisk.filter((d) => !Object.values(DIRS).includes(d)));

for (const t of TEMPLATES) {
  const dir = DIRS[t.id];
  const readme = readmeOf(dir);
  const css = cssOf(dir);
  const root = (css.match(/:root\s*\{[\s\S]*?\n\}/) || [''])[0];

  console.log(`\n=== ${t.id} ${t.title} ===`);
  // scenes 逐词出现在 README？
  for (const s of t.scenes) {
    const lines = readme.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => l.includes(s));
    console.log(`  scene「${s}」in README:`, lines.length ? lines.map(([n]) => 'L' + n).join(',') : '❌ 未出现');
  }
  // colors 逐个出现在 :root？
  for (const c of t.colors) {
    const inRoot = new RegExp(c.replace('#', '#'), 'i').test(root);
    const anywhere = new RegExp(c, 'i').test(css);
    console.log(`  color ${c} 在 :root:`, inRoot ? '✓' : '❌', '| 在 style.css 任意处:', anywhere ? '✓' : '❌');
  }
  // :root 里主色变量名
  const vars = [...root.matchAll(/(--[a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)].map((m) => `${m[1]}=${m[2]}`);
  console.log('  :root 变量:', vars.join(' '));
  console.log('  desc:', t.desc);
}
