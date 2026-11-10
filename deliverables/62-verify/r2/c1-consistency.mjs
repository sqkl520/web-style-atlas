// 路线 C-1：prompts.js 与 dna-clean.json 的逐字段比对（生成链一致性）
import fs from "node:fs";

globalThis.window = globalThis;
(0, eval)(fs.readFileSync("D:/Web/style/prototypes/_selection/prompts.js", "utf8"));
const P = window.STYLE_PROMPTS;
const dna = JSON.parse(fs.readFileSync("D:/Web/style/prototypes/_prompts/dna-clean.json", "utf8"));
const dnaById = Object.fromEntries(dna.map((x) => [x.id, x]));

const diffs = [];
for (const s of P.schemes) {
  const d = dnaById[s.id];
  if (!d) { diffs.push([s.id, "missing-in-dna-clean"]); continue; }
  const pairs = [
    ["fonts.display", s.dna.fonts.display, d.fonts.display],
    ["fonts.body", s.dna.fonts.body, d.fonts.body],
    ["fonts.mono", s.dna.fonts.mono, d.fonts.mono],
    ["fonts.displayStack", JSON.stringify(s.dna.fonts.displayStack || []), JSON.stringify(d.fonts.displayStack || [])],
    ["fonts.bodyStack", JSON.stringify(s.dna.fonts.bodyStack || []), JSON.stringify(d.fonts.bodyStack || [])],
    ["radius", s.dna.radius, d.radius],
    ["radiusBare", s.dna.radiusBare, d.radiusBare],
    ["shadow", s.dna.shadow, d.shadow],
    ["lineWidths", s.dna.lineWidths, d.lineWidths],
    ["degrades", s.dna.degrades, d.degrades],
    ["mechanism", s.dna.mechanism, d.mechanism],
  ];
  for (const [k, a, b] of pairs) if (String(a) !== String(b)) diffs.push([s.id, k, a, b]);
}
console.log("dna-clean.json 有而 prompts.js 没有的字段不一致条数:", diffs.length);
for (const d of diffs) console.log("  ", d.join("  |  "));

// palette 比对（dna-clean 是数组，prompts.js 是带标注的字符串）
console.log("\n=== palette 色值集合比对（只比 hex，忽略标注） ===");
for (const s of P.schemes) {
  const d = dnaById[s.id];
  const fromP = (s.dna.palette.match(/#[0-9A-Fa-f]{3,8}/g) || []).map((x) => x.toUpperCase()).sort();
  const fromD = (d.palette || []).map((x) => (x.match(/#[0-9A-Fa-f]{3,8}/) || [""])[0].toUpperCase()).filter(Boolean).sort();
  if (fromP.join(",") !== fromD.join(",")) console.log(` ${s.id}\n   P: ${fromP.join(" ")}\n   D: ${fromD.join(" ")}`);
}
