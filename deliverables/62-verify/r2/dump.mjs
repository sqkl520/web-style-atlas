// 路线 A 数据准备：用 node 把 30 条提示词按 UI 同一条路径 dump 出来
// 不引浏览器：给 prompt-copy.js 一个最小 document 桩，只走 buildPrompt。
import fs from "node:fs";
import path from "node:path";

const ROOT = "D:/Web/style/prototypes/_selection";
const OUT = "D:/Web/style/deliverables/62-verify/r2/prompts";

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

const load = (f) => {
  const code = fs.readFileSync(path.join(ROOT, f), "utf8");
  // 直接 eval 到全局，避免 require 的模块作用域把 window.X 藏起来
  (0, eval)(code);
};
load("data.js");
load("prompts.js");
load("prompt-copy.js");

const P = window.STYLE_PROMPTS;
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const s of P.schemes) {
  const txt = window.buildStylePrompt(s.id);
  fs.writeFileSync(path.join(OUT, s.id + ".txt"), txt, "utf8");
  rows.push({
    id: s.id,
    len: txt.length,
    lines: txt.split("\n").length,
    minItems: s.minItems,
    minPics: s.minPics,
    hard: !!s.hard,
    degrades: s.capacity ? s.capacity.degrades : null,
    dnaDegrades: !!s.dna.degrades,
    display: s.dna.fonts && s.dna.fonts.display,
    displayStack: s.dna.fonts && s.dna.fonts.displayStack,
    hasWenJinText: /WenJin|文津/.test(txt),
    hasZhuque: /Zhuque|朱雀/.test(txt),
    placeholderHit: /有刻印感的衬线/.test(txt),
  });
}
fs.writeFileSync("D:/Web/style/deliverables/62-verify/r2/dump-index.json", JSON.stringify(rows, null, 1), "utf8");
console.log("dumped", rows.length);
console.log(rows.map((r) => `${r.id} len=${r.len} min=${r.minItems} pics=${r.minPics} hard=${r.hard} cap=${r.degrades} dnaDeg=${r.dnaDegrades} disp=${r.display} stack=${(r.displayStack || []).join(">")}`).join("\n"));
