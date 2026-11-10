// Lead 核实 5：prompts.js 补的那 52 个色，在 CSS 里是「必需派生」还是「装饰扩张」？
// 判据：看 :root 声明行上的注释说了什么角色
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const dM = new Map((sbD.window.SCHEMES || []).map((s) => [s.id, s]));

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

const dirFor = (id) => readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith(id + '-')).map((d) => d.name)[0];

// :root 里每个 hex 的变量名与注释
function rootRoles(dir) {
  const css = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const m = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!m) return new Map();
  const out = new Map();
  for (const line of m[1].split(/\r?\n/)) {
    const d = line.match(/(--[\w-]+)\s*:\s*([^;]+);(.*)$/);
    if (!d) continue;
    const hex = (d[2].match(/#[0-9A-Fa-f]{6}/) || [])[0];
    if (!hex) continue;
    const comment = (d[3] || '').replace(/^[\s]*\/\*|\*\/[\s]*$/g, '').trim();
    out.set(hex.toUpperCase(), { name: d[1], comment, line: line.trim() });
  }
  return out;
}

// 角色分类
const CATEGORY = [
  { re: /字色|文字|正文|次级|批注|标注|小字|副标|字号|readme/i, cat: '文字色系' },
  { re: /悬停|hover|按下|press|激活|active|焦点|focus/i, cat: '状态色' },
  { re: /暗侧|暗部|阴影|深处|背光|凹陷|槽|groove|shade|shadow|deep/i, cat: '暗部/阴影' },
  { re: /亮|lit|高光|受光|浅|light|pale|hi\b/i, cat: '亮部/高光' },
  { re: /规则线|结构线|边框|分隔|rule|border|line/i, cat: '结构线' },
  { re: /底色|背景|ground|bg|base|paper|纸/i, cat: '底/纸色' },
  { re: /主色|强调|accent|primary|绿|红|金|紫|青/i, cat: '主/强调色' },
];

console.log('=== prompts.js 补的色，在 :root 里的角色 ===\n');
const stats = {};
const details = [];
for (const id of [...dM.keys()].sort()) {
  const d = hx((dM.get(id).palette || []).join(' '));
  const r = pM.get(id)?.dna?.palette;
  const p = hx(Array.isArray(r) ? r.join(' ') : String(r || ''));
  const extra = p.filter((h) => !d.includes(h));
  if (!extra.length) continue;
  const dir = dirFor(id);
  const roles = rootRoles(dir);
  console.log(`\n${id}`);
  for (const h of extra) {
    const role = roles.get(h);
    let cat = '未分类';
    if (role) {
      const hay = role.name + ' ' + role.comment;
      for (const c of CATEGORY) { if (c.re.test(hay)) { cat = c.cat; break; } }
    }
    stats[cat] = (stats[cat] || 0) + 1;
    details.push({ id, hex: h, cat, name: role?.name || '(不在:root)', comment: role?.comment || '' });
    console.log(`  ${h}  ${cat.padEnd(10)} ${role ? role.name : '(不在:root)'}  ${(role?.comment || '').slice(0, 60)}`);
  }
}

console.log('\n\n=== 分类汇总 ===');
console.log('分类           数量  占比');
console.log('-'.repeat(40));
const total = details.length;
for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`${k.padEnd(14)} ${String(v).padStart(3)}   ${(v / total * 100).toFixed(0)}%`);
}
console.log('-'.repeat(40));
console.log(`${'合计'.padEnd(14)} ${String(total).padStart(3)}`);

console.log('\n=== 判定 ===');
const essential = ['文字色系', '状态色', '暗部/阴影', '亮部/高光', '结构线', '底/纸色'];
const essN = details.filter((x) => essential.includes(x.cat)).length;
const decoN = details.filter((x) => x.cat === '主/强调色' || x.cat === '未分类').length;
console.log(`必需派生（文字/状态/暗部/高光/结构线/底色）: ${essN}/${total} = ${(essN / total * 100).toFixed(0)}%`);
console.log(`可能是装饰扩张（主色/未分类）:              ${decoN}/${total} = ${(decoN / total * 100).toFixed(0)}%`);

if (decoN > 0) {
  console.log('\n=== 需要人工判断的（可能是装饰扩张）===');
  for (const x of details.filter((y) => y.cat === '主/强调色' || y.cat === '未分类')) {
    console.log(`  ${x.id}  ${x.hex}  ${x.name}  ${x.comment.slice(0, 70)}`);
  }
}
