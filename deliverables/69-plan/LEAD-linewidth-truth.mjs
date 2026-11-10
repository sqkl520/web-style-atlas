import { readFileSync, readdirSync } from 'node:fs';

for (const id of ['S25', 'S09', 'S10', 'S27']) {
  const p = readFileSync(`deliverables/69-plan/dump/${id}.txt`, 'utf8');
  const i = p.indexOf('线宽');
  console.log(`\n=== ${id} 提示词线宽句 ===`);
  console.log('  ' + (i >= 0 ? p.slice(i, i + 150).replace(/\n/g, ' ') : '(未找到「线宽」)'));

  const dirs = readdirSync('prototypes').filter(d => d.startsWith(id + '-'));
  if (!dirs.length) { console.log('  找不到目录'); continue; }
  const css = readFileSync(`prototypes/${dirs[0]}/style.css`, 'utf8');
  const nc = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const bw = [...nc.matchAll(/border(?:-(?:top|right|bottom|left))?(?:-width)?\s*:\s*([0-9.]+)px/g)].map(m => m[1]);
  const sw = [...nc.matchAll(/stroke-width\s*:\s*([0-9.]+)/g)].map(m => m[1]);
  const h = readFileSync(`prototypes/${dirs[0]}/index.html`, 'utf8');
  const hsw = [...h.matchAll(/stroke-width\s*=\s*["']?([0-9.]+)/g)].map(m => m[1]);
  const hbw = [...h.matchAll(/border(?:-(?:top|right|bottom|left))?(?:-width)?\s*:\s*([0-9.]+)px/g)].map(m => m[1]);
  console.log(`  CSS border-width: ${JSON.stringify([...new Set(bw)].sort())}`);
  console.log(`  CSS stroke-width: ${JSON.stringify([...new Set(sw)].sort())}`);
  console.log(`  HTML stroke-width: ${JSON.stringify([...new Set(hsw)].sort())}`);
  if (hbw.length) console.log(`  HTML border-width: ${JSON.stringify([...new Set(hbw)].sort())}`);
}
