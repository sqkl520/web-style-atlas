// mk-frozen.mjs — 生成只读的冻结快照，供跨轮可比测量。
// 为什么需要：审计期间另一个 Agent 改了 prototypes/_selection/{app.js,style.css}（2026-10-28 01:16/01:17），
// 直接量工作区会让「改动前 / 改动后」混在一组数字里。
// 做法：从 git HEAD 取出 5 个源文件，拷进 deliverables/67-audit/frozen/，
// 并把相对路径改成绝对 file:// URL（字体、截图、原型跳转），这样它是自包含且只读的。
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './lib-measure.mjs';

const OUT = join(HERE, 'frozen');
mkdirSync(OUT, { recursive: true });
const FILES = ['index.html', 'style.css', 'app.js', 'data.js', 'prompts.js', 'prompt-copy.js'];

const toUrl = (p) => 'file:///' + join(ROOT, 'prototypes', p).replace(/\\/g, '/');

for (const f of FILES) {
  let src = execFileSync('git', ['show', `HEAD:prototypes/_selection/${f}`], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
  if (f === 'index.html') {
    // 字体与样式：绝对化
    src = src.replace('../_fonts/', toUrl('_fonts') + '/');
    // 脚本：指向本目录（同目录，无需改）—— 但必须显式去掉对 style.css 的相对引用歧义
  }
  if (f === 'data.js') {
    // 截图路径 "../S01-xxx/.inspect/a.jpg" → 绝对
    src = src.replace(/"\.\.\/(S\d{2}-[^/"]+)\//g, (m0, dir) => `"${toUrl(dir)}/`);
  }
  if (f === 'app.js') {
    // 打开原型用 '../' + r.dir + '/index.html'
    src = src.replace(/'\.\.\/' \+ esc\(r\.dir\)/, `'${toUrl('')}/' + esc(r.dir)`);
  }
  if (f === 'prompt-copy.js') {
    src = src.replace(/\.\.\/(S\d{2}-[^/'"`]+)\//g, (m0, dir) => `${toUrl(dir)}/`);
  }
  writeFileSync(join(OUT, f), src, 'utf8');
}

// index.html 里 style.css / *.js 都是同目录相对引用，拷过来即可用。
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
writeFileSync(join(OUT, 'FROZEN.json'), JSON.stringify({
  from: 'git HEAD prototypes/_selection',
  head,
  at: new Date().toISOString(),
  files: FILES,
  url: 'file:///' + join(OUT, 'index.html').replace(/\\/g, '/'),
  note: '只读快照。相对路径已绝对化为 file:// URL。用于跨轮可比测量，不是交付物的一部分。'
}, null, 2), 'utf8');
console.log('frozen at', join(OUT, 'index.html'));
console.log('HEAD', head);
