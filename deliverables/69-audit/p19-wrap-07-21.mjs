// 把 S07 / S21 的等宽数值包进 <code>（+ code{font-family:inherit}），看闸门是否掉、像素是否变。
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, appendFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const BASE = resolve('D:/Web/style/deliverables/69-audit/exp3');
rmSync(BASE, { recursive: true, force: true });
mkdirSync(BASE, { recursive: true });
cpSync('D:/Web/style/prototypes/_fonts', join(BASE, '_fonts'), { recursive: true });

const CASES = [
  ['S07', 'S07-slate-ink-contents', [
    [/<span class="(p|k)">([^<]*)<\/span>/g, (m, c, inner) => `<code class="C">${inner}</code>`],
    [/<dd>([\d\-]+)<\/dd>/g, (m, inner) => `<dd><code></code></dd>`],
    [/<div class="folio"([^>]*)><\/div>/g, (m) => m],
    [/(<span>第 \d+ 页<\/span>)/g, (m, inner) => `<code class="C"></code>`],
  ]],
  ['S21', 'S21-interlocking-release-book', [
    [/<span([^>]*class="[^"]*face-data[^"]*"[^>]*)>([^<]*)<\/span>/g, (m, attrs, inner) => `<code${attrs}>${inner}</code>`],
    [/<td([^>]*class="[^"]*face-data[^"]*"[^>]*)>([^<]*)<\/td>/g, (m, attrs, inner) => `<td${attrs}><code>${inner}</code></td>`],
    [/<dd([^>]*class="[^"]*face-data[^"]*"[^>]*)>([^<]*)<\/dd>/g, (m, attrs, inner) => `<dd${attrs}><code>${inner}</code></dd>`],
    [/<th([^>]*class="[^"]*face-data[^"]*"[^>]*)>([^<]*)<\/th>/g, (m, attrs, inner) => `<th${attrs}><code>${inner}</code></th>`],
  ]],
];

for (const [id, dir, rules] of CASES) {
  const ORIG = join(BASE, `${id}-orig`);
  const WRAP = join(BASE, `${id}-wrapped`);
  cpSync(`D:/Web/style/prototypes/${dir}`, ORIG, { recursive: true });
  cpSync(`D:/Web/style/prototypes/${dir}`, WRAP, { recursive: true });
  let html = readFileSync(join(WRAP, 'index.html'), 'utf8');
  let n = 0;
  for (const [re, fn] of rules) html = html.replace(re, (...a) => { n++; return fn(...a).replace('class="C"', `class="${a[1]}"`); });
  writeFileSync(join(WRAP, 'index.html'), html);
  appendFileSync(join(WRAP, 'style.css'), `\ncode { font-family: inherit; }\n`);
  console.log(`\n${id}: 包了 ${n} 处`);

  const r = spawnSync(process.execPath, [
    'D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/inspect.mjs',
    join(WRAP, 'index.html'), '--out', join(BASE, `${id}-inspect`), '--widths', '1440',
  ], { encoding: 'utf8', cwd: 'D:/Web/style' });
  const out = (r.stdout || '') + (r.stderr || '');
  const fails = out.split('\n').filter((l) => /^\s*\[.*\] @/.test(l) && /mono|font-count/.test(l));
  console.log(`  闸门: ${out.split('\n').find((l) => /RESULT/.test(l)) || 'no result'}`);
  for (const f of fails) console.log('   ' + f.trim());
}
