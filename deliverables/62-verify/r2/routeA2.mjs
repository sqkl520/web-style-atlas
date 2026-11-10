// 路线 A 深查：字体链的「中文可画性」与自救条款是否一致
import fs from "node:fs";
import path from "node:path";

const DIR = "D:/Web/style/deliverables/62-verify/r2/prompts";
const files = fs.readdirSync(DIR).filter((f) => /^S\d\d\.txt$/.test(f)).sort();

// 与 prompt-copy.js 完全一致的两条正则（照抄，不改）
const MONO_RE = /(mono|code|typewriter|VT323|Overprint|Fragment|Space Mono|Martian|JetBrains|DM Mono|Sometype|Departure)/i;
const CJK_RE = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans)/i;

const dna = JSON.parse(fs.readFileSync("D:/Web/style/prototypes/_prompts/dna-clean.json", "utf8"));
const dnaById = Object.fromEntries(dna.map((x) => [x.id, x]));

const out = [];
for (const f of files) {
  const id = f.replace(".txt", "");
  const txt = fs.readFileSync(path.join(DIR, f), "utf8");
  const fontLine = txt.split("\n").find((l) => l.startsWith("2. 字体：")) || "";
  const titleChain = (fontLine.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1];
  const bodyChain = (fontLine.match(/正文同理，按序取：([^。]+)/) || [])[1];
  const titleSingle = (fontLine.match(/标题用 ([^。]+)。/) || [])[1];
  const bodySingle = (fontLine.match(/正文用 ([^。]+)。/) || [])[1];
  const tArr = titleChain ? titleChain.split(" → ") : titleSingle ? [titleSingle] : [];
  const bArr = bodyChain ? bodyChain.split(" → ") : bodySingle ? [bodySingle] : [];
  const tCJK = tArr.filter((x) => CJK_RE.test(x));
  const bCJK = bArr.filter((x) => CJK_RE.test(x));
  const strict = /也不要跳过上面这条链直接回退成系统默认无衬线/.test(txt);
  const lax = /中文没有指定字族时，回退到一款中文衬线/.test(txt);
  out.push({
    id,
    titleArr: tArr,
    bodyArr: bArr,
    tCJK,
    bCJK,
    tpx: tArr.some((x) => /^\d+px$/.test(x.trim())),
    bpx: bArr.some((x) => /^\d+px$/.test(x.trim())),
    strict,
    lax,
    // 判据：标题侧没有任何中文族 → 中文标题必然回退
    titleFallbackForced: tCJK.length === 0,
    clauseContradiction: strict && tCJK.length === 0,
    rawStack: dnaById[id] && dnaById[id].fonts,
  });
}

console.log("id   标题链(→)                                      正文链里有中文? 严格句 标题中文? 判");
for (const r of out) {
  console.log(
    `${r.id} | ${r.titleArr.join(" > ").padEnd(48)} | bodyCJK=${r.bCJK.length ? "Y" : "N"} | strict=${r.strict ? "Y" : "N"} | tCJK=${r.tCJK.length ? "Y" : "N"} | ${r.clauseContradiction ? "⚠ 禁令必被违反" : "ok"}`
  );
}
console.log("\n=== 标题链里出现 px 值（数据坏，只是恰好被 length>1 挡住） ===");
for (const r of out) if (r.tpx || r.bpx) console.log(`${r.id} title=${JSON.stringify(r.titleArr)} body=${JSON.stringify(r.bodyArr)} dnaStack=${JSON.stringify(r.rawStack)}`);
console.log("\n=== 标题侧无中文族（中文标题必然回退） ===");
for (const r of out) if (r.titleFallbackForced) console.log(`${r.id} ${r.titleArr.join(" → ")}`);
fs.writeFileSync("D:/Web/style/deliverables/62-verify/r2/routeA-fonts.json", JSON.stringify(out, null, 1), "utf8");
