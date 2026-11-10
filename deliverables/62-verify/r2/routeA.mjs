// 路线 A：机械筛查 + 抽出每条的关键行，供逐条阅读
import fs from "node:fs";
import path from "node:path";

const DIR = "D:/Web/style/deliverables/62-verify/r2/prompts";
const files = fs.readdirSync(DIR).filter((f) => /^S\d\d\.txt$/.test(f)).sort();

const MONO_RE = /(mono|code|typewriter|VT323|Overprint|Fragment|Space Mono|Martian|JetBrains|DM Mono|Sometype|Departure)/i;
const CJK_RE = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans|KaiTi|STKaiti|SimSun|YaHei|Cascadia|Consolas)/i;
// 纯 CJK 判定（不含 Cascadia/Consolas 这类拉丁等宽）
const CJK_ONLY_RE = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans|KaiTi|STKaiti|SimSun|YaHei)/i;

const report = [];
for (const f of files) {
  const id = f.replace(".txt", "");
  const txt = fs.readFileSync(path.join(DIR, f), "utf8");
  const lines = txt.split("\n");
  /* 抽出结构相关行 */
  const fontLine = lines.find((l) => l.startsWith("2. 字体：")) || "";
  const structLines = lines.filter((l) => /^[1-4]\. (我实际有|这个版式的单元位置|这个版式是自动流|版式里要留|首屏不要轮播)/.test(l));
  const mechLine = lines.find((l) => l.startsWith("这个风格的签名动作")) || "";
  const countLine = lines.find((l) => /^1\. 我实际有/.test(l)) || "";
  const m = countLine.match(/我实际有 (\d+) 个/);
  const count = m ? +m[1] : null;

  const titleChain = (fontLine.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1];
  const bodyChain = (fontLine.match(/正文同理，按序取：([^。]+)/) || [])[1];
  const titleSingle = (fontLine.match(/标题用 ([^。]+)。/) || [])[1];
  const bodySingle = (fontLine.match(/正文用 ([^。]+)。/) || [])[1];
  const titleStr = titleChain || titleSingle || "";
  const bodyStr = bodyChain || bodySingle || "";

  report.push({
    id,
    count,
    titleStr: titleStr.trim(),
    bodyStr: bodyStr.trim(),
    titleIsChain: !!titleChain,
    bodyIsChain: !!bodyChain,
    titleHasCJK: CJK_ONLY_RE.test(titleStr),
    bodyHasCJK: CJK_ONLY_RE.test(bodyStr),
    strictNoFallbackClause: /也不要跳过上面这条链直接回退成系统默认无衬线/.test(txt),
    permissiveClause: /中文没有指定字族时，回退到一款中文衬线/.test(txt),
    hasPxInChain: /\b\d+px\b/.test(titleChain || "") || /\b\d+px\b/.test(bodyChain || ""),
    mechLen: mechLine.length,
    struct: structLines.map((s) => s.slice(0, 40)),
    // 疑似内部术语
    jargon: ["dna", "DNA", "minItems", "degrades", "SCHEMES", "prompts.js", "style.css", "inspect", "report.json", "本案", "缺失", "未声明", "占位符"].filter((j) => txt.includes(j)),
    // 编号连续性
    numbering: lines.filter((l) => /^\d+\. /.test(l)).map((l) => l.split(".")[0]),
  });
}
fs.writeFileSync("D:/Web/style/deliverables/62-verify/r2/routeA.json", JSON.stringify(report, null, 1), "utf8");

console.log('=== 标题链没有中文族（会被强制回退却说不要回退） ===');
for (const r of report) {
  if (r.strictNoFallbackClause && !r.titleHasCJK) console.log(`${r.id}  标题=${r.titleStr}  | 正文=${r.bodyStr}`);
}
console.log("\n=== 字体链里混入 px 值 ===");
for (const r of report) if (r.hasPxInChain) console.log(`${r.id} 标题=${r.titleStr} 正文=${r.bodyStr}`);
console.log("\n=== 两种口径并存（严格句 + 宽松句） ===");
for (const r of report) if (r.strictNoFallbackClause && r.permissiveClause) console.log(r.id);
console.log("\n=== 无严格句也无宽松句（字体兜底整段缺失） ===");
for (const r of report) if (!r.strictNoFallbackClause && !r.permissiveClause) console.log(r.id);
console.log("\n=== 内部术语命中 ===");
for (const r of report) if (r.jargon.length) console.log(`${r.id}: ${r.jargon.join(",")}`);
console.log("\n=== 编号序列 ===");
for (const r of report) console.log(`${r.id}: ${r.numbering.join(" ")}`);
