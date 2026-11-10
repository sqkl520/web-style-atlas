/* plan-probe-fields.mjs — 只读：P2 的改动面实测（用 git ls-files 的受跟踪清单，
 * 不扫 deliverables/，避免被几十万行历史脚本淹没）。
 *
 * 问三件事：
 *   ① 受跟踪文件里，谁读 `SCHEMES[*].fonts`（字符串字段）？
 *   ② 谁读 `dna.fonts`（对象字段）？
 *   ③ 把 data.js 的 `fonts` 改名为 `fontsSpec` 之后，哪些行会静默失效（不报错、只是变空）？
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean)
  .filter((f) => /\.(mjs|js|html|css|md)$/.test(f))
  .filter((f) => !/^deliverables\//.test(f) && !/^(README|LICENSE)/.test(f));

const hits = { stringField: [], objField: [], both: [] };

for (const f of tracked) {
  const lines = readFileSync(join(ROOT, f), 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (/document\.fonts/.test(L)) continue;          // 浏览器 API，无关
    const isObj = /\bd\.fonts\b|\bdna\.fonts\b|\.fonts\.(display|body|mono|displayStack|bodyStack)\b/.test(L);
    const isStr = /\br\.fonts\b|\brec\.fonts\b|\bs\.fonts\b|\bsc\.fonts\b|\bfonts:\s*spec|\bfonts:\s*''|"fonts":\s*"/.test(L)
      || /\(r\)\s*=>\s*r\.fonts/.test(L);
    if (!isObj && !isStr) continue;
    const rec = { file: f, line: i + 1, text: L.trim().slice(0, 130) };
    if (isObj && isStr) hits.both.push(rec);
    else if (isObj) hits.objField.push(rec);
    else hits.stringField.push(rec);
  }
}

const dump = (title, arr, note) => {
  console.log(`\n═══ ${title}（${arr.length} 处）═══`);
  if (note) console.log('  ' + note);
  for (const h of arr) console.log(`  ${h.file.replace(/\\/g, '/')}:${h.line}  ${h.text}`);
};

console.log('═══ P2 · 受跟踪文件里的 fonts 字段消费点 ═══');
console.log(`  扫描范围：git ls-files 中 ${tracked.length} 个 .mjs/.js/.html/.css/.md（排除 deliverables/ 与 README*）`);
dump('A 读 data.js 的字符串字段（改名会打断）', hits.stringField,
  '这些位置读的是 `SCHEMES[i].fonts`（规格原文，200–520 字）');
dump('B 读 prompts.js 的对象字段（不受影响）', hits.objField,
  '这些写的是 `dna.fonts`，来自 prompts.js，与 data.js 无关');
dump('C 两者都碰（需逐个判断）', hits.both, '');

/* 生成侧 */
console.log('\n═══ 生成侧：collect-schemes.mjs 里 fonts 的三处 ═══');
for (const f of tracked.filter((x) => /collect-schemes/.test(x))) {
  const lines = readFileSync(join(ROOT, f), 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) if (/\bfonts\b/.test(lines[i]) && !/document\.fonts/.test(lines[i])) {
    console.log(`  ${f.replace(/\\/g, '/')}:${i + 1}  ${lines[i].trim().slice(0, 130)}`);
  }
}

/* 30 案的字段长度 */
console.log('\n═══ data.js 里 "fonts" 的值长度（改名后这些字节原样搬家）═══');
const dj = readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8');
const m = [...dj.matchAll(/\n(\s*)"fonts":\s*"((?:[^"\\]|\\.)*)"/g)];
const lens = m.map((x) => x[2].length);
console.log(`  ${m.length} 处；字符数 min=${Math.min(...lens)} max=${Math.max(...lens)} 合计 ${lens.reduce((a, b) => a + b, 0)}`);

/* 谁在 UI 上显示这个字段 */
console.log('\n═══ UI 上的两个消费点（改名必须同步的两行）═══');
const app = readFileSync(join(ROOT, 'prototypes/_selection/app.js'), 'utf8').split(/\r?\n/);
for (let i = 0; i < app.length; i++) {
  if (/\br\.fonts\b/.test(app[i])) {
    console.log(`  app.js:${i + 1}`);
    for (let k = Math.max(0, i - 3); k <= Math.min(app.length - 1, i + 2); k++) {
      console.log(`      ${String(k + 1).padStart(4)}| ${app[k]}`);
    }
  }
}
