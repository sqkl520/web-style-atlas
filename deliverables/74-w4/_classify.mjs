// 只读诊断：把 _mech.mjs 报出的 11 个 miss 逐个定性（真错 / 误报 / 漏报）。
import { readFileSync } from 'node:fs';
const root = 'D:/Web/style/prototypes/';
const sb = { window: {} };
new Function('window', readFileSync(root + '_selection/prompts.js', 'utf8'))(sb.window);
const P = sb.window.STYLE_PROMPTS;

const CASES = {
  'S07:14%':  { id: 'S07', probe: [/\.14\b/g, /opacity\s*:\s*\.14/g, /14%/g] },
  'S07:0.5px':{ id: 'S07', probe: [/\.5px/g, /0\.5px/g] },
  'S07:5栏':  { id: 'S07', probe: [/grid-template-columns\s*:\s*5fr/g, /column-count\s*:\s*5\b/g, /repeat\(\s*5\b/g, /5\s*栏/g] },
  'S07:7栏':  { id: 'S07', probe: [/column-count\s*:\s*7\b/g, /repeat\(\s*7\b/g, /7\s*栏/g] },
  'S09:3.5px':{ id: 'S09', probe: [/stroke-width:\s*3\.5(?![0-9])/g, /3\.5px/g] },
  'S09:5%':   { id: 'S09', probe: [/5%/g, /缺口[^。]*5\b/g] },
  'S09:10%':  { id: 'S09', probe: [/10%/g, /缺口[^。]*10\b/g] },
  'S13:3%':   { id: 'S13', probe: [/3\.1%/g, /(?<![\d.])3%/g] },
  'S13:14%':  { id: 'S13', probe: [/14\.1%/g, /(?<![\d.])14%/g] },
  'S17:1.2px':{ id: 'S17', probe: [/r\s*=\s*["']1\.2["']/g, /1\.2px/g] },
  'S17:96px': { id: 'S17', probe: [/96px/g, /(?<![\d.])96(?![0-9.])/g] },
  'S10:1px':  { id: 'S10', probe: [/1px/g, /(?<![\d.])1px/g, /--misreg\s*:\s*1px/g, /--misreg\s*:\s*1\.5px/g] },
};

for (const [label, cfg] of Object.entries(CASES)) {
  const s = P.schemes.find((x) => x.id === cfg.id);
  let raw = '';
  try { raw += readFileSync(root + s.dir + '/style.css', 'utf8'); } catch {}
  try { raw += readFileSync(root + s.dir + '/index.html', 'utf8'); } catch {}
  const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  console.log('\n== ' + label);
  for (const p of cfg.probe) {
    const inClean = [...clean.matchAll(p)].length;
    const inRaw = [...raw.matchAll(p)].length;
    console.log(`   /${p.source}/  含注释=${inRaw}  剥注释=${inClean}`);
  }
}
