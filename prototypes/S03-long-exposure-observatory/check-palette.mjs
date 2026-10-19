// 用**工具自己的分类器**（rules.mjs 的 colourFamily）逐个判定本案实际渲染出来的颜色，
// 证明它们全部落在禁区之外。这是"用数值证明自己不在禁区内"的可复现证据。
// 判定函数直接 import 工具的源码，不是我重写的近似版本。
import { colourFamily } from "file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs";

const round = (v) => Math.round(v * 1000) / 1000;
// 与 probe.mjs:17-22 的 rgb2hsl 逐字一致
const hexToHsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2; let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: round(s), l: round(l) };
};

// 本案实际渲染进像素的颜色（来自 measure-area.py 的实测清单）
const COLOURS = {
  "#101A1C": "极夜底（60% 预算）",
  "#0C1417": "区块底（派生暗面）",
  "#162226": "面板 / hover（派生暗面）",
  "#13928E": "冷青主色（24% 预算）",
  "#C9D6CF": "记录纸白（12% 预算）",
  "#B9A98C": "纸带米（4% 预算）",
  "#2A3639": "表格线 / 1px 边（规格指定）",
  "#4A5A5E": "次刻度线",
  "#7C8A8C": "停用态字色",
  "#3B4A4D": "表头线",
};

// 禁区判据原文（rules.mjs:11-13）
const ZONES = [
  ["cream", "h∈[22,62] 且 s≥0.16 且 l≥0.88 且 l<1"],
  ["terracotta", "h∈[6,30] 且 s∈[0.38,0.85] 且 l∈[0.42,0.72]"],
  ["ai-purple", "h∈[244,295] 且 s≥0.42 且 l∈[0.3,0.8]"],
];

const out = [];
out.push("本案实际渲染颜色 × 工具自带分类器 colourFamily() 逐色判定");
out.push("（分类器直接 import 自 tools/taste-skill/.../lib/rules.mjs，未重写）");
out.push("");
out.push("禁区判据（rules.mjs:11-13 原文）");
for (const [n, d] of ZONES) out.push(`  ${n.padEnd(11)} ${d}`);
out.push("");
out.push("色值        RGB              H(°)  S       L       判定        本案角色");
out.push("------------------------------------------------------------------------------");
let hits = 0;
for (const [hex, role] of Object.entries(COLOURS)) {
  const hsl = hexToHsl(hex);
  const fam = colourFamily(hsl);
  if (fam) hits++;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  out.push(
    `${hex}   ${String(r).padStart(3)},${String(g).padStart(3)},${String(b).padStart(3)}` +
    `   ${String(hsl.h).padStart(4)}  ${hsl.s.toFixed(3)}   ${hsl.l.toFixed(3)}` +
    `   ${(fam || "安全（null）").padEnd(11)} ${role}`
  );
}
out.push("");
out.push(`命中禁区的颜色数：${hits} / ${Object.keys(COLOURS).length}`);

// 纸带米为什么逃出 terracotta：把两个失败维度的余量算出来
const tape = hexToHsl("#B9A98C");
out.push("");
out.push("为什么 #B9A98C 既不是 cream 也不是 terracotta（逐条算余量）");
out.push(`  实测 H=${tape.h}°  S=${tape.s}  L=${tape.l}`);
out.push(`  vs cream      : H∈[22,62] → ${tape.h} 落在区间内 ✓；S≥0.16 → ${tape.s} ✓；L≥0.88 → ${tape.l} ✗ 差 ${(0.88 - tape.l).toFixed(3)}`);
out.push(`  vs terracotta : H∈[6,30]  → ${tape.h} ✗ 超出上限 30 达 ${(tape.h - 30)}°（偏黄，不够锈红）；`);
out.push(`                  S∈[0.38,0.85] → ${tape.s} ✗ 差 ${(0.38 - tape.s).toFixed(3)}`);
out.push("  结论：#B9A98C 在 hue 与 saturation 上都不是陶土，在 lightness 上不是奶油。两个家族都进不去。");
out.push("");
out.push("另：palette-claude 这条 FAIL 需要 cream 与 terracotta **同时**出现（rules.mjs:90），");
out.push("    而本案两族命中数都是 0，因此该规则在结构上无法触发。");
out.push("    底色 #101A1C 的 L 远低于 0.88，也不构成黄奶油底。");

console.log(out.join("\n"));
