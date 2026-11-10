// 路线 A：逐条机械核查（快照版 prompts2）
import fs from "node:fs";
import path from "node:path";

const DIR = "D:/Web/style/deliverables/62-verify/r2/prompts2";
const files = fs.readdirSync(DIR).filter((f) => /^S\d\d\.txt$/.test(f)).sort();

globalThis.window = globalThis;
globalThis.document = { readyState: "complete", getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }), body: { appendChild() {} } };
const SNAP = "D:/Web/style/deliverables/62-verify/r2/snapshot";
(0, eval)(fs.readFileSync("D:/Web/style/prototypes/_selection/data.js", "utf8"));
(0, eval)(fs.readFileSync(path.join(SNAP, "prompts.js"), "utf8"));
const P = window.STYLE_PROMPTS;
const SCHEMES = window.SCHEMES;

const MONO_RE = /(mono|code|typewriter|VT323|Overprint|Fragment|Space Mono|Martian|JetBrains|DM Mono|Sometype|Departure)/i;
const CJK_RE = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans)/i;
const BANNED = ["Playfair Display", "Inter", "Roboto"];

const out = [];
for (const f of files) {
  const id = f.replace(".txt", "");
  const txt = fs.readFileSync(path.join(DIR, f), "utf8");
  const L = txt.split("\n");
  const fontLine = L.find((l) => l.startsWith("2. 字体：")) || "";
  const titleChain = (fontLine.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1];
  const bodyChain = (fontLine.match(/正文同理，按序取：([^。]+)/) || [])[1];
  const titleSingle = (fontLine.match(/标题用 ([^。]+)。/) || [])[1];
  const bodySingle = (fontLine.match(/正文用 ([^。]+)。/) || [])[1];
  const tArr = titleChain ? titleChain.split(" → ") : titleSingle ? [titleSingle] : [];
  const bArr = bodyChain ? bodyChain.split(" → ") : bodySingle ? [bodySingle] : [];
  const s = P.schemes.find((x) => x.id === id);
  const sc = SCHEMES.find((x) => x.id === id);
  const countLine = L.find((l) => /^1\. 我实际有/.test(l)) || "";
  const count = +(countLine.match(/我实际有 (\d+) 个/) || [])[1];
  const struct2 = L.find((l) => /^2\. /.test(l) && (l.includes("版式") || l.includes("单元位置"))) || "";
  out.push({
    id,
    count,
    minItems: s.minItems,
    minPics: s.minPics,
    hard: !!s.hard,
    capDeg: s.capacity && s.capacity.degrades,
    dnaDeg: s.dna && s.dna.degrades,
    tArr, bArr,
    tCJK: tArr.some((x) => CJK_RE.test(x)),
    bCJK: bArr.some((x) => CJK_RE.test(x)),
    bannedInOwn: [...tArr, ...bArr].filter((x) => BANNED.some((b) => x.toLowerCase() === b.toLowerCase())),
    monoEmpty: !/编号\/价格等数字用等宽/.test(txt),
    tone: (txt.match(/这个案子的调性是「([^」]+)」/) || [])[1] || null,
    sceneTone: sc && sc.tone,
    autoFlow: /自动流排版/.test(struct2),
    manual: /手工排定/.test(struct2),
    // 数量口径：句1 断言固定 N，句2 又说按真实数量
    assertsFixedCount: /我实际有 \d+ 个条目，就排 \d+ 个/.test(txt),
    saysUseRealCount: /按你真实的数量排即可|请先用你真实的 条目数去排/.test(txt),
    hasNotEnoughClause: /如果确实不足 \d+ 个/.test(txt),
    doubleSentence: /。。/.test(txt),
    asciiQuote: /'/.test(txt),
  });
}
fs.writeFileSync("D:/Web/style/deliverables/62-verify/r2/routeA2.json", JSON.stringify(out, null, 1), "utf8");

const p = (t) => console.log(t);
p("=== 1. 结构约束两条口径是否并存（断言固定 N + 让你按真实数量） ===");
const both = out.filter((r) => r.assertsFixedCount && r.saysUseRealCount);
p(`${both.length}/30 同时存在：${both.map((r) => r.id).join(" ")}`);

p("\n=== 2. 固定 N 与 degrades 分支是否一致 ===");
p(`degrades=yes(cap): ${out.filter((r) => r.capDeg === "yes").length} 案 → ${out.filter((r) => r.capDeg === "yes").map((r) => r.id).join(" ")}`);
p(`dna.degrades=true: ${out.filter((r) => r.dnaDeg).length} 案 → ${out.filter((r) => r.dnaDeg).map((r) => r.id).join(" ")}`);
p(`capDeg=yes 但 dnaDeg=false: ${out.filter((r) => r.capDeg === "yes" && !r.dnaDeg).map((r) => r.id).join(" ")}`);
p(`capDeg=no 但 dnaDeg=true: ${out.filter((r) => r.capDeg !== "yes" && r.dnaDeg).map((r) => r.id).join(" ")}`);

p("\n=== 3. 字体链无中文族（正文/标题各自） ===");
p(`标题无 CJK: ${out.filter((r) => !r.tCJK).map((r) => r.id + "[" + r.tArr.join(">") + "]").join("  ")}`);
p(`正文无 CJK: ${out.filter((r) => !r.bCJK).map((r) => r.id + "[" + r.bArr.join(">") + "]").join("  ")}`);

p("\n=== 4. 禁令里点名了自己在用的字体 ===");
for (const r of out) if (r.bannedInOwn.length) p(`  ${r.id}: ${r.bannedInOwn.join(",")}`);

p("\n=== 5. 缺「编号/价格等数字用等宽」整句 ===");
p(out.filter((r) => r.monoEmpty).map((r) => r.id).join(" ") || "无");

p("\n=== 6. 调性行 ===");
p(`缺调性行: ${out.filter((r) => !r.tone).map((r) => r.id).join(" ") || "无"}`);
const toneMismatch = out.filter((r) => r.tone && r.sceneTone && r.tone !== r.sceneTone);
p(`调性与 SCHEMES.tone 不一致: ${toneMismatch.map((r) => r.id + " prompt=" + r.tone + " / data=" + r.sceneTone).join(" | ") || "无"}`);

p("\n=== 7. minItems 数量 ===");
p(out.map((r) => `${r.id}:${r.count}${r.count !== r.minItems ? "(≠minItems " + r.minItems + ")" : ""}`).join(" "));

p("\n=== 8. 排版硬伤 ===");
p(`「。。」双句号: ${out.filter((r) => r.doubleSentence).map((r) => r.id).join(" ") || "无"}`);
p(`含 ASCII 单引号: ${out.filter((r) => r.asciiQuote).map((r) => r.id).join(" ") || "无"}`);

p("\n=== 9. 结构约束分支分布 ===");
p(`自动流: ${out.filter((r) => r.autoFlow).map((r) => r.id).join(" ")}`);
p(`手工排定: ${out.filter((r) => r.manual).map((r) => r.id).join(" ")}`);
