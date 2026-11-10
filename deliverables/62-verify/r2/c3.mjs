// C-3 关键：slice(0,3) 截断把中文兜底切掉——数据有、提示词没有
import fs from "node:fs";
const w = {};
new Function("window", fs.readFileSync("D:/Web/style/prototypes/_selection/prompts.js", "utf8"))(w);
const P = w.STYLE_PROMPTS;

const CJK = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans|KaiTi|STKaiti|SimSun|YaHei|Kaiti)/i;

console.log("=== 数据里中文族在第 4 位（会被 slice(0,3) 切掉）===");
let cut = [];
for (const s of P.schemes) {
  for (const key of ["displayStack", "bodyStack"]) {
    const st = (s.dna.fonts && s.dna.fonts[key]) || [];
    const firstCJK = st.findIndex((x) => CJK.test(x));
    const rendered = st.slice(0, 3);
    const renderedHasCJK = rendered.some((x) => CJK.test(x));
    if (firstCJK >= 3 && !renderedHasCJK) {
      cut.push({ id: s.id, key, full: st, firstCJK, rendered });
      console.log(`  ${s.id} ${key}: 完整=${JSON.stringify(st)} → 提示词只给=${JSON.stringify(rendered)}（第 ${firstCJK + 1} 位的中文族被切掉）`);
    }
  }
}
console.log("\n受影响条数:", cut.length);

console.log("\n=== 数据里中文族存在但提示词链里没有中文族（全量对照）===");
for (const s of P.schemes) {
  for (const key of ["displayStack", "bodyStack"]) {
    const st = (s.dna.fonts && s.dna.fonts[key]) || [];
    const fullCJK = st.some((x) => CJK.test(x));
    const r = st.slice(0, 3);
    const rCJK = r.some((x) => CJK.test(x));
    if (fullCJK && !rCJK) console.log(`  ⚠ ${s.id} ${key}: 数据有中文族，提示词丢了 —— 完整 ${JSON.stringify(st)} / 提示词 ${JSON.stringify(r)}`);
  }
}

console.log("\n=== 长栈分布（>3 项被截断的案）===");
for (const s of P.schemes) {
  const d = (s.dna.fonts.displayStack || []).length, b = (s.dna.fonts.bodyStack || []).length;
  if (d > 3 || b > 3) console.log(`  ${s.id}: displayStack=${d} bodyStack=${b}`);
}
