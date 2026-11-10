// 探针：Q2 的判定核心 —— 逐案 30/30 比对三个集合
//   S = 规格字段 3（配色系统）里声明的 hex         ← 设计意图的权威文本
//   P = 提示词实际发出的 hex（dna-clean.json palette）← 用户复制到的东西
//   C = 页面 style.css 里出现的全部 hex             ← 实际画出来的
// 判定规则（写明，可被推翻）：
//   ① S 有、P 无  → 提示词抽取漏了（提示词是 bug，页面可能是对的）
//   ② P 有、S 无  → 提示词发明了规格没声明的色（提示词越权）
//   ③ C 有、S∪P 无 → 页面超纲（页面是 bug）——但需再分「派生色 / 新色相」
// 只读。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const P0 = join(ROOT, 'prototypes');
const dna = JSON.parse(readFileSync(join(P0, '_prompts/dna-clean.json'), 'utf8'));
const dnaById = new Map(dna.map((e) => [e.id, e]));

const DIRS = readdirSync(P0, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const hexes = (s) => [...new Set([...String(s).matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => '#' + m[1].toUpperCase()))];

// 三种写法都归一：先剥掉全部 **，再按裸标题判
function field3(md) {
  const out = [];
  let on = false;
  for (const l of md.split(/\r?\n/)) {
    const s = l.trim().replace(/\*\*/g, '');
    if (!on && /^3[.．]\s*配色系统/.test(s)) { on = true; out.push(s); continue; }
    if (on) {
      if (/^\d+[.．]\s*\S/.test(s)) break;
      out.push(l);
    }
  }
  return out.join('\n');
}

function hsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0;
  if (mx !== mn) {
    const d = mx - mn;
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, l: l * 100 };
}
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const rows = [];
for (const dir of DIRS) {
  const id = dir.slice(0, 3);
  const spec = readFileSync(join(P0, '_specs', id + '.md'), 'utf8');
  const S = hexes(field3(spec));
  const e = dnaById.get(id) || {};
  const Pm = hexes((e.palette || []).join(' '));
  const C = hexes(readFileSync(join(P0, dir, 'style.css'), 'utf8'));

  const Sset = new Set(S), Pset = new Set(Pm), Cset = new Set(C);
  const dropped = S.filter((h) => !Pset.has(h));          // ① 规格有、提示词无
  const invented = Pm.filter((h) => !Sset.has(h));         // ② 提示词有、规格无
  const paintExtra = C.filter((h) => !Sset.has(h) && !Pset.has(h));  // ③ 页面超出两者

  // ③ 再分：派生（对 S∪P 任一同色相且明度近）vs 新色相
  const refs = [...new Set([...S, ...Pm])].map((h) => ({ hex: h, ...hsl(h) }));
  const newHue = [], derived = [];
  for (const h of paintExtra) {
    const x = hsl(h);
    (refs.some((r) => gap(x.h, r.h) <= 12 && Math.abs(x.l - r.l) <= 22) ? derived : newHue).push(h);
  }

  rows.push({ id, S: S.length, Pm: Pm.length, C: C.length, dropped, invented, paintExtra, derived, newHue });
  const flag = dropped.length || invented.length || newHue.length ? ' ⚠' : '';
  console.log(
    `${id}  规格${String(S.length).padStart(2)} 提示词${String(Pm.length).padStart(2)} 页面${String(C.length).padStart(2)}` +
    `  漏${String(dropped.length).padStart(2)} 发明${String(invented.length).padStart(2)}` +
    `  超纲{派生${String(derived.length).padStart(2)} 新色相${String(newHue.length).padStart(2)}}${flag}`
  );
  if (dropped.length) console.log(`      ① 规格有·提示词漏: ${dropped.join(' ')}`);
  if (invented.length) console.log(`      ② 提示词有·规格无: ${invented.join(' ')}`);
  if (newHue.length) console.log(`      ③ 页面新色相: ${newHue.join(' ')}`);
}

const n = (k) => rows.filter((r) => r[k].length).length;
const sum = (k) => rows.reduce((a, r) => a + r[k].length, 0);
console.log(`\n=== 30/30 汇总 ===`);
console.log(`① 提示词漏掉规格声明的色：${n('dropped')} 案 / ${sum('dropped')} 个色值`);
console.log(`② 提示词含规格未声明的色：${n('invented')} 案 / ${sum('invented')} 个色值`);
console.log(`③ 页面出现两者都没有的色：${n('paintExtra')} 案 / ${sum('paintExtra')} 个色值`);
console.log(`   其中「同色相派生」：${sum('derived')} 个（不算新色相）`);
console.log(`   其中「新色相」：${sum('newHue')} 个，分布 ${rows.filter(r => r.newHue.length).map((r) => `${r.id}(${r.newHue.length})`).join(' ')}`);
console.log(`\n结论方向：`);
console.log(`  「提示词是 bug」的证据强度 = ① 的案数 ${n('dropped')}/30`);
console.log(`  「页面是 bug」的证据强度 = ③ 新色相 > 0 的案数 ${n('newHue')}/30`);
