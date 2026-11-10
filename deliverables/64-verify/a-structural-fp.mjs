// 系统化：哪些 palette 项只靠"结构判据"（ROLE_NAME_BEFORE/AFTER）被收进来
// 目的是看 #FFFFFF 是孤例还是这一类问题
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SPEC = ROOT + '/prototypes/_specs/';
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES;

const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const ROLE = /(主色|背景色?|底色|地面色?|正文色?|正文|强调色?|辅助色?|次要色?|结构线|批注|脏色|纸色)/;
const ROLE_NAME_AFTER = /^\s*[\u4e00-\u9fa5A-Za-z0-9]{1,12}\s*[＝=]/;
const ROLE_NAME_BEFORE = /[\u4e00-\u9fa5]{2,8}\s*$/;
const NEG = /(反的是|反对|反这|反「|反"|反`|反\s*#|不是|而非|既不|也不|不采用|不选|不取|不用|不使用|不要|不得|禁止|排除|避免|规避|拒绝|剔除|禁用|离开|远离)/;

function field3(id) {
  const t = readFileSync(SPEC + id + '.md', 'utf8');
  const i0 = t.indexOf('配色系统');
  if (i0 < 0) return '';
  const rest = t.slice(i0);
  const i1 = rest.indexOf('字体策略');
  return dec(rest.slice(0, i1 > 0 ? i1 : 1200));
}
const clauseBefore = (p3, i) => {
  const w = p3.slice(Math.max(0, i - 40), i);
  const cut = Math.max(w.lastIndexOf('。'), w.lastIndexOf('；'), w.lastIndexOf('，'), w.lastIndexOf('、'), w.lastIndexOf('！'), w.lastIndexOf('？'), w.lastIndexOf('\n'));
  return cut >= 0 ? w.slice(cut + 1) : w;
};
const clauseAfter = (p3, j) => {
  const w = p3.slice(j, j + 34);
  const cut = w.search(/[。；！？\n]/);
  return cut >= 0 ? w.slice(0, cut) : w;
};

let structuralOnly = [];
for (const s of S) {
  const p3 = field3(s.id);
  for (const h of s.palette) {
    if (h === s.bg || h === s.primary) continue;
    const re = new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let byRole = false, byStruct = false, ctxText = '';
    for (const m of p3.matchAll(re)) {
      const before = clauseBefore(p3, m.index);
      const after = clauseAfter(p3, m.index + h.length);
      if (NEG.test(before) || NEG.test(after)) continue;
      if (ROLE.test(after) || ROLE.test(before)) { byRole = true; ctxText = (before + h + after).trim(); }
      if (ROLE_NAME_AFTER.test(after) || ROLE_NAME_BEFORE.test(before)) { byStruct = true; if (!ctxText) ctxText = (before + h + after).trim(); }
    }
    if (byStruct && !byRole) structuralOnly.push({ id: s.id, hex: h, ctx: ctxText.slice(0, 120) });
  }
}
console.log('只靠结构判据被收进 palette 的项:', structuralOnly.length);
for (const x of structuralOnly) console.log(`  ${x.id} ${x.hex}\n      ${x.ctx}`);
