// 任务 1 探针 F：`rootVars()` 的媒体查询泄漏（本轮新发现，任务书没提）。
//
// clean-dna.mjs 的 rootVars() 把**所有** `:root{...}` 块合并成一个字典，
// 不区分它是否在 @media 里、也不区分顺序之外的作用域。
// S27 是最硬的例子：
//   L27  :root { --mis: 1.8px }          ← 桌面真相
//   L521 :root { ... --mis: 1.2px }      ← 在 <820px 媒体查询里，是**窄屏**值
// 合并后 --mis 被 L521 覆盖 → 提示词说「线宽只用 1.2px、2.4px、3px」，
// 而在 1440px 审查视口下，原型真实是 1.8px 与 3.6px。
// 结论：不是「提示词编了不存在的值」，而是「提示词说了另一台设备的值」。
//
// 本探针统计 30 案里有多少个 :root 落在 @media 内，以及有多少变量被媒体查询覆盖。
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const dirs = readdirSync(P).filter((d) => /^S\d\d-/.test(d)).sort();

// 找出每个 :root 块是否位于某个 @media 内。
// 正确做法：单趟扫描，维护「{ 的栈」，每个 { 入栈时记录它前面那段选择器文本。
// （上一版我用 lastIndexOf('{', openAt) 求选择器起点，它返回 openAt 自己 → 选择器恒为空，
//   于是 30/30 都判成"不在 @media 内"。这是我自己的 bug，已修。）
function rootsWithContext(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (s) => ' '.repeat(s.length)); // 保行号
  const out = [];
  const stack = [];       // { sel, at }
  let segStart = 0;       // 当前选择器文本的起点
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') {
      const sel = stripped.slice(segStart, i).trim().replace(/\s+/g, ' ');
      stack.push({ sel, at: i });
      segStart = i + 1;
    } else if (ch === '}') {
      stack.pop();
      segStart = i + 1;
    } else if (ch === ';' && stack.length === 0) {
      segStart = i + 1;
    }
  }
  // 第二趟：定位 :root 块，回看它入栈时的上下文
  const opens = [];
  {
    const st = [];
    let seg = 0;
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i];
      if (ch === '{') {
        const sel = stripped.slice(seg, i).trim().replace(/\s+/g, ' ');
        st.push({ sel, at: i });
        seg = i + 1;
        if (/^:root\b/.test(sel)) opens.push({ line: stripped.slice(0, i).split('\n').length, stack: st.slice(0, -1).map((x) => x.sel) });
      } else if (ch === '}') { st.pop(); seg = i + 1; }
      else if (ch === ';' && st.length === 0) { seg = i + 1; }
    }
  }
  for (const o of opens) {
    const media = o.stack.filter((s) => /^@media/.test(s));
    const mIdx = stripped.split('\n').slice(0, o.line - 1).join('\n').length;
    const body = stripped.slice(mIdx, stripped.indexOf('}', mIdx) + 1).replace(/\s+/g, ' ');
    out.push({ line: o.line, inMedia: media.length ? media[media.length - 1] : null, body: body.slice(0, 100) });
  }
  return out;
}

const report = {};
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const css = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const roots = rootsWithContext(css);
  // 变量名 -> [{inMedia, value}]
  const byVar = {};
  for (const r of roots) {
    for (const d of r.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      (byVar[d[1]] = byVar[d[1]] || []).push({ inMedia: r.inMedia, v: d[2].trim(), line: r.line });
    }
  }
  const leaked = [];
  for (const [k, arr] of Object.entries(byVar)) {
    const desktop = arr.filter((x) => !x.inMedia);
    const mobile = arr.filter((x) => x.inMedia);
    if (desktop.length && mobile.length) {
      const dLast = desktop[desktop.length - 1].v;
      const mLast = mobile[mobile.length - 1].v;
      if (dLast !== mLast && /[0-9.]+px/.test(dLast + mLast)) {
        leaked.push({ var: k, desktop: dLast, mobile: mLast, mobileAt: mobile[mobile.length - 1].line });
      }
    }
  }
  report[id] = { nRoots: roots.length, nInMedia: roots.filter((r) => r.inMedia).length, leaked };
}

writeFileSync(join(OUT, 't1-media-leak.json'), JSON.stringify(report, null, 1), 'utf8');
let nCases = 0, nVars = 0;
console.log('id    :root 数  在@media内  被媒体查询覆盖的 px 变量');
for (const [id, r] of Object.entries(report)) {
  if (r.leaked.length) nCases++;
  nVars += r.leaked.length;
  console.log(id.padEnd(5), String(r.nRoots).padEnd(9), String(r.nInMedia).padEnd(11),
    r.leaked.map((x) => x.var + ': 桌面' + x.desktop + ' → 窄屏' + x.mobile + '(L' + x.mobileAt + ')').join(' ; ') || '—');
}
console.log('\n受影响案数:', nCases, '/30   受影响变量数:', nVars);
