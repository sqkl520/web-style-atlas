// 探针 24：判据的**判别力校准** —— 一个"总是 PASS"的检查器等于没检查。
//   ① 用 S16 的**原型本身**当"页面"跑一遍：它应当也全 PASS（提示词就是从这里抽的）→ 说明判据承认正确答案
//   ② 三份人为破坏版：改色 / 加圆角+柔和阴影 / 换掉标题字体 → 应当分别 FAIL
//   ③ 由此算出：在"13 项判据"里，破坏必须被抓住几项才算可用
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const NODE = process.execPath;
const src = readFileSync(join(HERE, 'pilot-S16/index.html'), 'utf8');
const mk = join(HERE, 'pilot-S16');   // 必须放在 pilot 目录里：破坏版要能按相对路径找到 images/ 与字体 css
mkdirSync(mk, { recursive: true });

const variants = {
  'A-palette': src.replace(/--red:#C52C0F;/, '--red:#C52C0F;\n  --extra:#2F7D4F;')
    .replace('.masthead{', '.masthead{background:var(--extra);'),
  'B-radius-shadow': src.replace('filter:drop-shadow(6px 6px 0 var(--ink));', 'filter:drop-shadow(6px 6px 0 var(--ink));box-shadow:0 8px 24px rgba(0,0,0,.25);border-radius:14px;'),
  'C-font': src.replace(/font-family:'LXGW Marker Gothic','Noto Serif SC',serif;/g, "font-family:'Noto Serif SC',serif;"),
  'D-widths': src.replace('border-bottom:2px solid var(--red)', 'border-bottom:1px solid var(--red)'),
};
for (const [k, v] of Object.entries(variants)) {
  writeFileSync(join(mk, 'sabotage-' + k + '.html'), v, 'utf8');
  console.log('wrote', k, v === src ? '(NO CHANGE!)' : '');
}

const run = (label, page) => {
  let out = '';
  try {
    out = execFileSync(NODE, [join(HERE, 'verify-style.mjs'), '--prompt', 'S16', '--page', page, '--out', join(HERE, 'verify-out')],
      { encoding: 'utf8', maxBuffer: 8 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) { out = String(e.stdout || ''); }
  const fails = [...out.matchAll(/\[FAIL\]\s+(\S+)/g)].map((m) => m[1]);
  const line = (out.match(/判定：PASS \d+ \/ FAIL \d+ \/ WARN \d+ \/ NA \d+/) || [''])[0];
  console.log(`${label.padEnd(20)} ${line}   FAIL项=${fails.join(',') || '无'}`);
  return { label, fails, line };
};

console.log('\n=== ① 正确页面（原型 S16 自己）===');
const base = run('prototype-S16', join(ROOT, 'prototypes/S16-velocity-slant-manifesto/index.html'));
console.log('\n=== ② 试点复刻（只看提示词做的）===');
const pilot = run('pilot-S16', join(HERE, 'pilot-S16/index.html'));
console.log('\n=== ③ 四份人为破坏 ===');
const results = Object.keys(variants).map((k) => run('sabotage/' + k, join(mk, 'sabotage-' + k + '.html')));

console.log('\n=== 判别力汇总 ===');
for (const r of results) {
  console.log(`  ${r.label.padEnd(20)} 抓到 ${r.fails.length} 项：${r.fails.join(', ') || '⚠️ 一项都没抓到'}`);
}
const allCaught = results.every((r) => r.fails.length > 0);
console.log(`\n  破坏全部被至少一项判据抓到 = ${allCaught}`);
writeFileSync(join(HERE, 'p9-calibration.json'), JSON.stringify({ base, pilot, results }, null, 1), 'utf8');

