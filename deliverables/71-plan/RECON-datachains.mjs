// 侦察：这个仓库到底有几条数据链？它们共享哪些字段？有多少处不一致？
// 假设：70 轮来反复出现「生成物没守卫 → 陈旧 → 谎报」，
// 真正的问题不是某个字段错，而是「同一个人在两条链上各算一遍」。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const HEXT = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const hexes = (s) => [...new Set([...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase()))];

console.log('════ 1. 数据链清单：谁生成谁 ════\n');

// 扫所有 build/*.mjs 里的 writeFileSync 目标
const buildDir = join(P, '_build');
const promDir = join(P, '_prompts');
const writers = [];
for (const dir of [buildDir, promDir]) {
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.mjs')) continue;
    const src = readFileSync(join(dir, f), 'utf8');
    const targets = [...src.matchAll(/writeFileSync\(\s*\n?\s*join\([^,]+,\s*["']([^"']+)["']/g)].map((m) => m[1]);
    const targets2 = [...src.matchAll(/writeFileSync\(\s*join\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ' ').slice(0, 60));
    const reads = [...src.matchAll(/readFileSync\(\s*join\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ' ').slice(0, 60));
    if (targets.length || targets2.length) {
      writers.push({ script: (dir === buildDir ? '_build/' : '_prompts/') + f, writes: [...targets, ...targets2].slice(0, 4), readsN: reads.length });
    }
  }
}
for (const w of writers) console.log(`  ${w.script.padEnd(34)} → ${w.writes.join(' | ').slice(0, 90)}`);

console.log('\n════ 2. 两条链共有的字段：逐字段对账 ════\n');

// data.js 的 SCHEMES
const dataJs = readFileSync(join(P, '_selection/data.js'), 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];

// prompts.js 的 schemes
const promptsJs = readFileSync(join(P, '_selection/prompts.js'), 'utf8');
const sbP = { window: {} };
new Function('window', promptsJs)(sbP.window);
const PSP = sbP.window.STYLE_PROMPTS.schemes || [];

// dna-clean.json
const dna = JSON.parse(readFileSync(join(P, '_prompts/dna-clean.json'), 'utf8'));
const DNA = Array.isArray(dna) ? dna : Object.values(dna);

const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
const dM = byId(SCHEMES), pM = byId(PSP), cM = byId(DNA);

console.log(`data.js SCHEMES: ${SCHEMES.length}   prompts.js schemes: ${PSP.length}   dna-clean: ${DNA.length}`);

// 逐案逐字段比对
const FIELDS = [
  { name: 'palette', get: (s, src) => {
      if (src === 'data') return (s.palette || []).map((h) => String(h).toUpperCase());
      if (src === 'prompts') { const r = s.dna?.palette; return hexes(Array.isArray(r) ? r.join(' ') : String(r || '')); }
      if (src === 'dna') return hexes((s.palette || []).join(' '));
    } },
  { name: 'primary', get: (s, src) => {
      if (src === 'data') return String(s.primary || '').toUpperCase();
      if (src === 'prompts') return String(s.dna?.primary || '').toUpperCase();
      if (src === 'dna') return (s.primary || []).map((x) => String(x).toUpperCase()).join(',');
    } },
  { name: 'bg', get: (s, src) => {
      if (src === 'data') return String(s.bg || '').toUpperCase();
      if (src === 'prompts') return String(s.dna?.bg || '').toUpperCase();
      if (src === 'dna') return '';
    } },
  { name: 'fonts', get: (s, src) => {
      if (src === 'data') return JSON.stringify(s.fonts || '');
      if (src === 'prompts') return JSON.stringify(s.dna?.fonts || {});
      if (src === 'dna') return JSON.stringify(s.fonts || {});
    } },
  { name: 'minItems', get: (s, src) => {
      if (src === 'data') return String(s.minItems ?? '');
      if (src === 'prompts') return String(s.minItems ?? '');
      if (src === 'dna') return String(s.minItems ?? '');
    } },
];

for (const F of FIELDS) {
  const rows = [];
  for (const id of [...dM.keys()]) {
    const d = dM.get(id), p = pM.get(id), c = cM.get(id);
    if (!d) continue;
    const vd = F.get(d, 'data');
    const vp = p ? F.get(p, 'prompts') : undefined;
    const vc = c ? F.get(c, 'dna') : undefined;
    const vs = [vd, vp, vc].filter((v) => v !== undefined && v !== '' && v !== 'null');
    const uniq = new Set(vs.map((v) => String(v)));
    if (uniq.size > 1) rows.push({ id, d: vd, p: vp, c: vc });
  }
  if (rows.length) {
    console.log(`\n  【${F.name}】不一致 ${rows.length}/30 案`);
    for (const r of rows.slice(0, 4)) {
      console.log(`     ${r.id}  data=${String(r.d).slice(0, 50)}`);
      console.log(`           prompts=${String(r.p).slice(0, 50)}`);
      console.log(`           dna=${String(r.c).slice(0, 50)}`);
    }
    if (rows.length > 4) console.log(`     … 其余 ${rows.length - 4} 案`);
  } else {
    console.log(`\n  【${F.name}】✓ 全部一致`);
  }
}

console.log('\n════ 3. 还有哪些「同一件事两处描述」？扫规格 vs 抽取 ════\n');
// 规格字段3 声明的色数 vs dna-clean palette 色数
const SPECS = join(P, '_specs');
let specVsPal = 0;
const spRows = [];
for (const id of [...cM.keys()]) {
  const sp = join(SPECS, id + '.md');
  if (!existsSync(sp)) continue;
  const md = readFileSync(sp, 'utf8');
  const m = md.match(/配色系统[：:]?\s*\*{0,2}([\s\S]{0,1500}?)(?=\n\*\*4|\n4\.)/);
  if (!m) continue;
  const specHex = hexes(m[1]);
  // 去掉负向示例（反的是 X / 修正前）
  const palHex = hexes((cM.get(id)?.palette || []).join(' '));
  const miss = specHex.filter((h) => !palHex.includes(h));
  if (miss.length) { specVsPal++; spRows.push({ id, miss }); }
}
console.log(`规格字段3 有、palette 缺的案: ${specVsPal}/30`);
for (const r of spRows.slice(0, 5)) console.log(`  ${r.id}: ${r.miss.slice(0, 6).join(' ')}`);
