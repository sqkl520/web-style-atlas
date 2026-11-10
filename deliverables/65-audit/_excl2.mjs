import { readFileSync, readdirSync, existsSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const PROTO = 'D:/Web/style/prototypes';

function surface(dir) {
  let s = '';
  const base = PROTO + '/' + dir;
  for (const f of readdirSync(base)) if (/\.(html|css)$/.test(f)) s += readFileSync(base + '/' + f, 'utf8') + '\n';
  return s;
}
function norm(v) {
  let x = String(v).trim().toUpperCase();
  const m3 = /^#([0-9A-F])([0-9A-F])([0-9A-F])$/.exec(x);
  if (m3) x = '#' + m3[1] + m3[1] + m3[2] + m3[2] + m3[3] + m3[3];
  return x;
}
/* 收集 :root 变量 + 直接色值 */
function vars(css) {
  const map = new Map();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\))/g)) map.set(m[1], norm(m[2]));
  return map;
}
function resolve(val, vmap, depth = 0) {
  if (depth > 5) return val;
  const v = /var\(\s*(--[\w-]+)\s*\)/.exec(val);
  if (v && vmap.has(v[1])) return resolve(vmap.get(v[1]), vmap, depth + 1);
  return val;
}
function bgColors(css) {
  const vmap = vars(css);
  const set = new Set();
  for (const m of css.matchAll(/background(?:-color)?\s*:\s*([^;}]+)/gi)) {
    const decl = m[1];
    if (/^(transparent|none|inherit|currentcolor)$/i.test(decl.trim())) continue;
    if (/url\(/.test(decl) && !/#|rgb/.test(decl)) continue;   // 纯纹理层不算底色
    for (const h of decl.matchAll(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)|var\(\s*--[\w-]+\s*\)/g)) {
      let v = resolve(h[0], vmap);
      if (!/^#|^rgb/i.test(v)) continue;
      v = norm(v);
      if (/^RGBA?\(/i.test(v)) {
        const p = v.match(/[\d.]+/g).map(Number);
        if (p.length > 3 && p[3] === 0) continue;
        v = 'RGB(' + p[0] + ',' + p[1] + ',' + p[2] + ')';
      }
      set.add(v);
    }
  }
  return set;
}
const CASES = [
  ['S11', '全站只用 #DCDDD2 一种底', '#DCDDD2'],
  ['S12', '全站只有 #1E2A2E 一种底', '#1E2A2E'],
  ['S13', '全站只用 #F4E3BE 一种底', '#F4E3BE'],
  ['S15', '全站只用 #E7EBE9', '#E7EBE9'],
  ['S16', '全站只用 #F7EBCF 一种底', '#F7EBCF'],
  ['S17', '全站只用 #E1D6BD 一种底', '#E1D6BD'],
  ['S19', '全站只用 #E4DECD 一种底', '#E4DECD'],
  ['S21', '全站只用 #E4DCC9 一种底', '#E4DCC9'],
  ['S23', '全站只用 #DCDCC8 一种底', '#DCDCC8'],
  ['S27', '全站单一黄纸底 #E8D7B5', '#E8D7B5'],
  ['S18', '全站只有一种暗底 #0A0D0A', '#0A0D0A'],
];
console.log('id\t断言\tbackground 色值数\t主底在场\t判定');
let ok = 0, over = 0, missing = 0;
for (const [id, claim, hex] of CASES) {
  const d = D.find((x) => x.id === id);
  const set = bgColors(surface(d.dir));
  const has = [...set].some((v) => v === hex.toUpperCase());
  const verdict = has ? (set.size <= 1 ? '严格成立' : '成立但有 ' + (set.size - 1) + ' 个第二层色') : '主底不在 background 里';
  if (has) ok++; else missing++;
  if (set.size > 1) over++;
  console.log([id, claim, set.size, has ? 'YES' : 'NO', verdict].join('\t'));
}
console.log('\n主底确实出现在 background 声明里的：' + ok + '/' + CASES.length + '；其余 ' + missing + ' 案的主底可能只作 color 或经渐变/伪元素');
console.log('background 出现 >1 种色值的：' + over + '/' + CASES.length + '（"全站只用一种底"要成立，这些第二层色必须都是纹理/伪元素层）');
