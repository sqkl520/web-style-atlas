// 探针（v2，修掉 v1 的口径污染）：Q2 逐案 30/30 三方集合比对
//
// v1 的错：把规格字段 3 里所有 hex 都当成"声明色"，于是 #6366F1 / #8B5CF6 / #22D3EE
// 这些**被反对的颜色**（"这套配色反的是 #6366F1 靛蓝"）被算成"规格有但提示词漏"，
// 得出"30/30 案提示词都漏色"的假结论。剔除后完全不是那样。
//
// v2 判据：一个 hex 若出现在「反/禁/不要/不用/避免/替换/旧」等否定词的**同一分句**里，
// 归为 ANTI（被反对色），不计入声明色集合。
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

function field3(md) {
  const out = [];
  let on = false;
  for (const l of md.split(/\r?\n/)) {
    const s = l.trim().replace(/\*\*/g, '');
    if (!on && /^3[.．]\s*配色系统/.test(s)) { on = true; out.push(s); continue; }
    if (on) { if (/^\d+[.．]\s*\S/.test(s)) break; out.push(l); }
  }
  return out.join('\n');
}

// 否定词：只要 hex 所在的**分句**（按 ；。，, 切）里出现这些词，就判 ANTI
const NEG = /反的是|反 |反对|禁|不要|不用|避免|不得|旧值|旧 |替换|不再|不准|别用|不是/;
function splitDeclaredAnti(f3) {
  const declared = [], anti = [];
  // 按分句切，句号/分号/逗号/换行都算边界
  const clauses = f3.split(/[；;。\n]/);
  for (const c of clauses) {
    const hs = hexes(c);
    if (!hs.length) continue;
    // ⚠️ v2 的第一个假阳性：S02 的 #111111 出现在
    // 「暗金填充上的文字必须用深色 #111111（实测 5.80:1，达 AA），不得用白字」——
    // 分句里含「不得」，于是整句被判成"被反对色"，可实际它是**规定要用来画字的**。
    // 判据收窄：只有当否定词出现在 hex **之前**、且是"反/禁/不要/旧值"这类
    // 「不要这个色」的语义时才算 ANTI；「必须用它」不算。
    const idx = c.search(/#[0-9a-fA-F]{6}/);
    const before = c.slice(0, idx);
    const MUST = /必须用|一律用|就用|务必用|要用/;
    const isAnti = NEG.test(before) && !MUST.test(before);
    for (const h of hs) (isAnti ? anti : declared).push(h);
  }
  return { declared, anti };
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
  const f3 = field3(readFileSync(join(P0, '_specs', id + '.md'), 'utf8'));
  const { declared, anti } = splitDeclaredAnti(f3);
  const S = [...new Set(declared)];
  const e = dnaById.get(id) || {};
  const Pm = hexes((e.palette || []).join(' '));
  const C = hexes(readFileSync(join(P0, dir, 'style.css'), 'utf8'));

  const Pset = new Set(Pm), Sset = new Set(S), Aset = new Set(anti);
  // 只把「声明色」里提示词没给的算漏；被反对色不算
  const dropped = S.filter((h) => !Pset.has(h));
  const invented = Pm.filter((h) => !Sset.has(h));
  // 页面把"被反对色"画出来了吗？（这是真正的违规）
  const paintedAnti = C.filter((h) => Aset.has(h) && !Sset.has(h));

  const refs = [...new Set([...S, ...Pm])].map((h) => ({ hex: h, ...hsl(h) }));
  const paintExtra = C.filter((h) => !Sset.has(h) && !Pset.has(h));
  const newHue = [], derived = [];
  for (const h of paintExtra) {
    const x = hsl(h);
    (refs.some((r) => gap(x.h, r.h) <= 12 && Math.abs(x.l - r.l) <= 22) ? derived : newHue).push(h);
  }

  rows.push({ id, S: S.length, anti: anti.length, Pm: Pm.length, C: C.length, dropped, invented, paintedAnti, paintExtra, derived, newHue });
  console.log(
    `${id}  声明${String(S.length).padStart(2)}(反对${String(anti.length).padStart(2)}) 提示词${String(Pm.length).padStart(2)} 页面${String(C.length).padStart(2)}` +
    `  漏${String(dropped.length).padStart(2)} 发明${String(invented.length).padStart(2)} 画出反对色${paintedAnti.length}  派生${String(derived.length).padStart(2)} 新色相${String(newHue.length).padStart(2)}`
  );
  if (dropped.length) console.log(`     ① 声明有·提示词漏: ${dropped.join(' ')}`);
  if (invented.length) console.log(`     ② 提示词有·规格无: ${invented.join(' ')}`);
  if (paintedAnti.length) console.log(`     ✗ 画了被反对色: ${paintedAnti.join(' ')}`);
  if (newHue.length) console.log(`     ③ 页面新色相: ${newHue.join(' ')}`);
}

const n = (k) => rows.filter((r) => r[k].length).length;
const sum = (k) => rows.reduce((a, r) => a + r[k].length, 0);
console.log(`\n=== 30/30 汇总（v2，已剔除被反对色）===`);
console.log(`① 规格声明了但提示词漏掉：${n('dropped')} 案 / ${sum('dropped')} 个色值`);
console.log(`② 提示词里有但规格没声明：${n('invented')} 案 / ${sum('invented')} 个色值`);
console.log(`✗ 页面画出被反对色：${n('paintedAnti')} 案 / ${sum('paintedAnti')} 个色值`);
console.log(`③ 页面超出两者：${n('paintExtra')} 案 / ${sum('paintExtra')} 个，其中派生 ${sum('derived')}、新色相 ${sum('newHue')}`);
console.log(`\n关键口径变化：v1 说「30/30 提示词漏色」，剔除被反对色后是 ${n('dropped')}/30。`);
