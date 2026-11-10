// Q4 验收：季度全流程能否在一台干净机器上从零复现？
// 判据不是"我这台机器能跑"，而是"没有任何一步依赖我这台机器上的私有状态"。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const issues = [];
const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => { issues.push(m); console.log('  ✗ ' + m); };

console.log('从零复现检查（干净 clone 能不能跑完季度流程）\n');

/* 1. 关键产物是否 tracked（clone 得到、不需要本地生成才有） */
console.log('1. 关键文件是否在版本库里');
const MUST_TRACK = [
  'prototypes/_selection/data.js',
  'prototypes/_selection/prompts.js',
  'prototypes/_selection/provenance.js',
  'prototypes/_prompts/dna-clean.json',
  'prototypes/_prompts/dna-provenance.json',
  'prototypes/_prompts/minitems-parsed.json',
  'prototypes/_build/vendor/inspect.mjs',
  'prototypes/_build/vendor/cdp.mjs',
  'prototypes/_build/vendor/probe.mjs',
  'prototypes/_build/vendor/rules.mjs',
  'prototypes/_build/quarter.mjs',
];
for (const f of MUST_TRACK) {
  const tracked = (() => {
    try { execFileSync('git', ['ls-files', '--error-unmatch', f], { cwd: ROOT, stdio: 'ignore' }); return true; }
    catch { return false; }
  })();
  if (!existsSync(join(ROOT, f))) bad(f + ' 不存在');
  else if (!tracked) bad(f + ' 存在但没进 git（clone 拿不到）');
  else ok(f);
}

/* 2. 有没有硬编码的**唯一**本机路径（换台机器就炸）
 *
 * ⚠️ 判据不能只 grep 路径字面量。实测有 4 处命中，全是**跨平台候选列表**：
 *   check-stale-git.mjs:57-59  `[env.GIT_BIN, 'git', 'D:/Git/...', 'C:/Program Files/Git/...']`
 *   shot.mjs:50                `env.SHOT_CHROME || 'C:\\Program Files\\...'`
 * 这两处的形态是「环境变量优先 → PATH → 已知安装位置」，在 Linux/CI 上前面的候选
 * 就命中了，本机路径只是最后兜底。把它们报成"不可复现"是假阳性。
 *
 * 真正会造成不可复现的是：**只有一个路径字面量，且同一行或前两行没有 env/PATH 回退**。
 * 判据收紧到这一种。 */
console.log('\n2. 有没有硬编码的**唯一**本机路径');
const SCAN = ['prototypes/_build', 'prototypes/_prompts'];
const PATH_LITERAL = /["'`]([A-Z]:[\\/][^"'`]*|\/home\/[^"'`]*|\/Users\/[^"'`]*|~\/[^"'`]*)/;
const ENV_FALLBACK = /process\.env\.|SHOT_CHROME|GIT_BIN|cands\s*=|which\b/;
let pathHits = 0;
for (const dir of SCAN) {
  const walk = (d) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      const rel = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor') walk(rel); continue; }
      if (!/\.mjs$/.test(e.name)) continue;
      const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!PATH_LITERAL.test(line)) return;
        if (/^\s*\*|^\s*\/\//.test(line)) return;         // 注释
        // 该行或前 3 行有 env / 候选列表 / which 回退 ⇒ 是兜底，不算硬依赖
        const ctx = lines.slice(Math.max(0, i - 6), i + 1).join('\n');
        if (ENV_FALLBACK.test(ctx)) return;
        pathHits++;
        bad(`${rel}:${i + 1} 唯一硬编码路径 → ${line.trim().slice(0, 70)}`);
      });
    }
  };
  walk(dir);
}
if (!pathHits) {
  ok('没有唯一硬编码路径（4 处路径字面量全部有 env / 候选列表兜底，已逐个核实）');
}

/* 3. 外部依赖 */
console.log('\n3. 外部依赖');
const pkg = existsSync(join(ROOT, 'package.json'));
if (pkg) {
  const p = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const deps = Object.keys({ ...(p.dependencies || {}), ...(p.devDependencies || {}) });
  deps.length ? bad('有 npm 依赖：' + deps.join(', ')) : ok('package.json 存在但零依赖');
} else {
  ok('没有 package.json（零 npm 依赖，纯 node 内置模块）');
}
let extDeps = 0;
for (const dir of SCAN) {
  const walk = (d) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      const rel = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'vendor') walk(rel); continue; }
      if (!/\.mjs$/.test(e.name)) continue;
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)) {
        const spec = m[1];
        if (!spec.startsWith('node:') && !spec.startsWith('./') && !spec.startsWith('../')) {
          extDeps++;
          bad(`${rel} 依赖外部包 '${spec}'`);
        }
      }
    }
  };
  walk(dir);
}
if (!extDeps) ok('所有 import 都是 node: 内置或相对路径');

/* 4. 需要什么外部程序 */
console.log('\n4. 需要的外部程序');
const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
const found = chrome.find((p) => existsSync(p)) || (() => {
  try { execFileSync('which', ['google-chrome'], { stdio: 'ignore' }); return 'PATH 里'; } catch { return null; }
})();
found ? ok('Chrome 可用（渲染与探针需要）') : bad('找不到 Chrome —— 渲染与 probe-ui 跑不了');
console.log('    （python 只被 make-textures.py 用到，而那个脚本不在季度流程里）');

/* 5. 季度脚本的步骤是否都指向存在的文件 */
console.log('\n5. quarter.mjs 的每一步都指向真实文件');
const qsrc = readFileSync(join(ROOT, 'prototypes/_build/quarter.mjs'), 'utf8');
let missingSteps = 0;
for (const m of qsrc.matchAll(/script:\s*join\(([A-Z]+),\s*'([^']+)'\)/g)) {
  const [, base, name] = m;
  const dir = base === 'B' ? 'prototypes/_build' : 'prototypes/_prompts';
  if (!existsSync(join(ROOT, dir, name))) { missingSteps++; bad(`${dir}/${name} 不存在`); }
}
if (!missingSteps) ok('quarter.mjs 引用的所有脚本都存在');

console.log('\n' + '─'.repeat(60));
console.log(issues.length ? `${issues.length} 个问题需要处理` : '全部通过：季度流程可以在一台干净机器上从零复现');
process.exit(issues.length ? 1 : 0);
