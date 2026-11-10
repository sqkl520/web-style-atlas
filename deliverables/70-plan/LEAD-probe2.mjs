import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
let src = readFileSync(ROOT + '/prototypes/_build/check-stale.mjs', 'utf8');
// 只保留到 findStale 定义结束，去掉 CLI
const cut = src.indexOf('const stale = findStale();');
src = src.slice(0, cut);
src = src.replace(/from ['"]\.\/_entries\.mjs['"]/, `from 'file:///D:/Web/style/prototypes/_build/_entries.mjs'`);
// 在 findStale 内部插入调试：打印 P 与每个 link 的结果
src = src.replace(
  'const CHAIN = [',
  `console.error('[debug] P =', P);\n  console.error('[debug] caseDirs(P).length =', caseDirs(P).length);\n  const CHAIN = [`
);
src = src.replace(
  'if (gapMin > 1) {',
  `console.error('[debug] link=' + link.label + ' prodM=' + prodM + ' newest=' + newest + ' gapMin=' + gapMin.toFixed(2) + ' which=' + which);\n    if (gapMin > 1) {`
);
const tmp = ROOT + '/deliverables/70-plan/_probe2.mjs';
writeFileSync(tmp, src, 'utf8');
const mod = await import('file:///' + tmp.replace(/\\/g, '/') + '?t=' + Date.now());
console.log('\n=== findStale() ===');
console.log(JSON.stringify(mod.findStale(), null, 1));
