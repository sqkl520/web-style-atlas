// 从冻结快照 dump 30 条提示词（与浏览器同一条 buildPrompt 路径）
import fs from "node:fs";
import path from "node:path";

const SNAP = "D:/Web/style/deliverables/62-verify/r2/snapshot";
const OUT = "D:/Web/style/deliverables/62-verify/r2/prompts2";

globalThis.window = globalThis;
globalThis.document = {
  readyState: "complete",
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
  body: { appendChild() {} },
};
for (const f of ["../../../../prototypes/_selection/data.js"]) {
  /* data.js 在仓库里，不在快照里（本轮没改它） */
}
const load = (p) => (0, eval)(fs.readFileSync(p, "utf8"));
load("D:/Web/style/prototypes/_selection/data.js");
load(path.join(SNAP, "prompts.js"));
load(path.join(SNAP, "prompt-copy.js"));

const P = window.STYLE_PROMPTS;
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const s of P.schemes) {
  const txt = window.buildStylePrompt(s.id);
  fs.writeFileSync(path.join(OUT, s.id + ".txt"), txt, "utf8");
  const fontLine = txt.split("\n").find((l) => l.startsWith("2. 字体：")) || "";
  rows.push({ id: s.id, len: txt.length, fontLine, minItems: s.minItems, minPics: s.minPics, hard: !!s.hard, capDegrades: s.capacity && s.capacity.degrades, dnaDegrades: !!s.dna.degrades });
}
fs.writeFileSync("D:/Web/style/deliverables/62-verify/r2/dump2.json", JSON.stringify(rows, null, 1), "utf8");
console.log("dumped", rows.length);
const lens = rows.map((r) => r.len);
console.log("len min/max/avg:", Math.min(...lens), Math.max(...lens), Math.round(lens.reduce((a, b) => a + b, 0) / lens.length));
console.log("\n=== 字体行 ===");
for (const r of rows) console.log(r.id + " | " + r.fontLine.replace(/\s+/g, " ").slice(0, 150));
