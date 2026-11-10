/* 66-audit 只读探针：数「AI 必须同时记住的**独立**约束条数」。
 *
 * ── 判据（我自己定的，先写判据再数，避免事后凑数）─────────────────────
 * 一条「独立约束」必须同时满足三条：
 *   (1) 可单独违反：存在一份 HTML，它满足提示词里其余全部要求，只违反这一条。
 *       —— 用来排除「同义重复」：例如「配色只用这几个值」与「不新增更多彩色」，
 *          违反后者必然违反前者，只算 1 条。
 *   (2) 可从产物判定：看最终 HTML/CSS 就能判真假，不需要问作者意图、不需要外部资料。
 *       —— 用来排除「验收三问」这种自检指令，以及「请先告诉我」这种对话要求。
 *   (3) 不是另一条的逻辑推论：若 A 成立则 B 必然成立，B 不计。
 *       —— 例如已限定「线宽只用 1px、2px」，「不要自创第三级」是同一句的复述。
 *
 * 计数单位（粒度声明）：
 *   · 一个**封闭取值集合**算 1 条（配色 7 个 HEX 算 1 条，不是 7 条）；
 *     但「必须出现 N 个不同图片位」里的 N 算 1 条，不与具体张数拆分。
 *   · 一条句子里的**每个可独立违反的数值规格**各算 1 条：
 *     S07 机制句「8% 至 14% 不透明度 / 偏移 1px / 正面 5 栏对背面 7 栏 / 栏线 0.5px /
 *     页码 28px 行高」= 5 条，因为可以只把「栏线 0.5px」改成 1px 而其余全对。
 *   · 「防退化 ①–⑧」每条算 1 条（8 条禁令互不蕴含：可以只犯 emoji 不犯渐变）。
 *   · 「risk」段按**可独立违反的规避动作**计数：编号项（①/（1）/一是）按项数，
 *     无编号时按分句里的数值/禁令计。
 *   · 不计：开头两行（用户自填，不是对 AI 的约束）、验收三问（自检流程）、
 *     「请先告诉我」（对话要求）、「不要解释、只给代码」（输出格式，单独计入格式组）。
 *
 * 输出：constraints.json ＋ 控制台分布表
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const files = readdirSync(join(HERE, "prompts")).filter((f) => f.endsWith(".txt")).sort();

/* 机制句里的「可独立违反的数值规格」：抓 数字+单位、比例 a:b、a/b 栏、百分比 */
function mechSpecs(line) {
  const specs = [];
  // 百分比区间或单值：8% 至 14%、46%、4%
  for (const m of line.matchAll(/\d+(?:\.\d+)?%\s*(?:至|-|–|~)?\s*\d*(?:\.\d+)?%?/g)) specs.push(m[0]);
  // px/pt/deg/° 数值
  for (const m of line.matchAll(/\d+(?:\.\d+)?(?:px|pt|deg|°|s|ms|em|rem)\b/g)) specs.push(m[0]);
  // 比例 a:b(:c)
  for (const m of line.matchAll(/\d+\s*:\s*\d+(?:\s*:\s*\d+)?/g)) specs.push(m[0]);
  // 「N 栏」「N 块」「N 层」「N 行」这类结构量
  for (const m of line.matchAll(/\d+\s*(?:栏|块|层|行|枚|条|种|档|级|处|个)/g)) specs.push(m[0]);
  // 去重（同一数值重复出现只算一次）
  const uniq = [...new Set(specs.map((s) => s.replace(/\s+/g, "")))];
  return uniq;
}

/* 防退化：①–⑧。按「行首是圈号」逐行数，不用整段正则 —— 段尾与下一段的分隔
 * 在 30 份提示词里既有空行也有单换行（第 5 条存在时被 filter 掉空串），
 * 用 `[\s\S]*?` 配分隔符会在某些案上切多切少。 */
function degradeCount(text) {
  const idx = text.indexOf("防退化（出现任何一条就重做）：");
  if (idx < 0) return { n: 0, items: [] };
  const tail = text.slice(idx).split("\n").slice(1);
  const items = [];
  for (const line of tail) {
    const t = line.trim();
    if (/^[①②③④⑤⑥⑦⑧⑨]/.test(t)) { items.push(t); continue; }
    if (!t) continue;
    break; // 圈号列表结束
  }
  return { n: items.length, items };
}

/* risk 段：数「可独立违反的规避动作」 */
function riskCount(text) {
  const m = text.match(/这一案最容易做成的错误样子（作者原话，务必避开）：([^\n]*)/);
  if (!m) return { n: 0, items: [], truncated: false };
  const body = m[1];
  const truncated = body.endsWith("…");
  // 编号形式：①…②… / （1）…（2）… / 一是…二是…三是…
  const circled = (body.match(/[①②③④⑤⑥⑦⑧]/g) || []).length;
  const paren = (body.match(/（[1-9]）/g) || []).length;
  const cn = (body.match(/[一二三四五]是/g) || []).length;
  const n = Math.max(circled, paren, cn);
  // 开头那句「最容易滑向 X」本身也是一条可违反的禁令（不要做成 X）
  return { n: n > 0 ? n + 1 : 1, items: [], truncated, raw: n };
}

const res = [];
for (const f of files) {
  const id = f.slice(0, 3);
  const text = readFileSync(join(HERE, "prompts", f), "utf8");
  const L = text.split("\n");

  const groups = [];
  const add = (g, n, why) => { if (n > 0) groups.push({ g, n, why }); };

  // ── 全局风格 / 调性 ──
  add("风格总目标", 1, "「请把整页做成这个风格：X」——1 条（可单独违反：整页不做成 X）");
  if (/这个案子的调性是/.test(text)) add("调性", 1, "「照这个调性写文案」——1 条");

  // ── 机制句 ──
  const mechLine = (text.match(/这个风格的签名动作：([^\n]*)/) || [])[1] || "";
  const specs = mechSpecs(mechLine);
  add("签名机制", Math.max(1, specs.length), `机制句里 ${specs.length} 个可独立违反的数值规格：${specs.join(" / ")}`);

  // ── 视觉硬约束 1–5 ──
  add("配色集合", 1, "封闭取值集合算 1 条");
  const fontLine = (text.match(/\n2\. 字体：([^\n]*(?:\n[^\n]*)*?)\n3\./) || [])[1] || "";
  let fontN = 0; const fontWhy = [];
  if (/标题/.test(fontLine)) { fontN++; fontWhy.push("标题链"); }
  if (/正文/.test(fontLine)) { fontN++; fontWhy.push("正文链"); }
  if (/等宽/.test(fontLine)) { fontN++; fontWhy.push("等宽数字"); }
  if (/不要用 Playfair/.test(fontLine)) { fontN++; fontWhy.push("禁用三款通用字体"); }
  if (/回退/.test(fontLine)) { fontN++; fontWhy.push("回退禁令"); }
  add("字体", fontN, fontWhy.join("／"));
  add("圆角", 1, "1 条封闭规格");
  add("阴影", 1, "1 条封闭规格（含「不许柔和外投影」= 同句复述，不另计）");
  add("线宽", 1, "1 条封闭取值集合");

  // ── 结构约束 ──
  /* 结构约束段：从「结构约束：」到「防退化（」之间。**不能假设中间有空行** ——
   * 实测 S19/S26 的第 5 条与「防退化」只有单个换行，用 `\n\n防退化` 会把整段抓成空。 */
  const struct = (text.match(/结构约束：\n([\s\S]*?)\n防退化（/) || [])[1] || "";
  const structLines = struct.split("\n").filter((l) => /^\s*\d\./.test(l));
  const structWhy = [];
  let structN = 0;
  for (const l of structLines) {
    if (/^1\./.test(l.trim())) {
      structN += 1; structWhy.push("条目数 N");
      // 第二行「不凑整、不留空位、不留占位符、编号连续不跳号」= 编号连续 1 条（其余被 N 蕴含）
      structN += 1; structWhy.push("编号连续");
    } else if (/^2\./.test(l.trim())) {
      const branch = /手工排定/.test(l) ? "degrades=yes 收敛/整块重排" : "degrades=no 按真实数量";
      structN += 1; structWhy.push(branch);
    } else if (/^3\./.test(l.trim())) {
      structN += 1; structWhy.push("图片位 N 个不同");
    } else if (/^4\./.test(l.trim())) {
      structN += 1; structWhy.push("首屏无轮播");
    } else if (/^5\./.test(l.trim())) {
      structN += 1; structWhy.push("硬前提（作者原话）");
    }
  }
  add("结构约束", structN, structWhy.join("／"));

  // ── 防退化 ──
  const dg = degradeCount(text);
  add("防退化", dg.n, `①–⑧ 共 ${dg.n} 条互不蕴含的禁令`);

  // ── risk ──
  const rk = riskCount(text);
  add("本案专属禁令", rk.n, `作者原话里的 ${rk.n} 条规避动作${rk.truncated ? "（**已被截断**）" : ""}`);

  // ── 输出要求（格式组）──
  let outN = 0; const outWhy = [];
  if (/只给一个完整单文件 HTML/.test(text)) { outN++; outWhy.push("单文件 HTML"); }
  if (/不引 React/.test(text)) { outN++; outWhy.push("不引框架"); }
  if (/images\/占位-N\.jpg/.test(text)) { outN++; outWhy.push("图片占位路径+宽高"); }
  if (/移动端单列/.test(text)) { outN++; outWhy.push("移动端单列"); }
  if (/不要解释/.test(text)) { outN++; outWhy.push("只给代码"); }
  add("输出格式", outN, outWhy.join("／"));

  const total = groups.reduce((a, b) => a + b.n, 0);
  res.push({ id, chars: text.length, total, groups, mechSpecs: specs, riskTruncated: rk.truncated, hasClause5: /^5\. 这个版式的硬前提/m.test(text) });
}

writeFileSync(join(HERE, "constraints.json"), JSON.stringify(res, null, 1), "utf8");

console.log("id   总约束  机制 字体 结构 防退化 专属禁令 格式   字数");
for (const r of res.sort((a, b) => b.total - a.total)) {
  const g = Object.fromEntries(r.groups.map((x) => [x.g, x.n]));
  console.log(
    r.id + " " + String(r.total).padStart(6) + " " +
    String(g["签名机制"] || 0).padStart(5) +
    String(g["字体"] || 0).padStart(5) +
    String(g["结构约束"] || 0).padStart(5) +
    String(g["防退化"] || 0).padStart(7) +
    String(g["本案专属禁令"] || 0).padStart(9) +
    String(g["输出格式"] || 0).padStart(5) + "  " + r.chars
  );
}
const totals = res.map((r) => r.total).sort((a, b) => a - b);
console.log("\n分布：min=" + totals[0] + " 中位=" + totals[15] + " max=" + totals[29] +
  " 均=" + (totals.reduce((a, b) => a + b, 0) / 30).toFixed(1));
console.log(">20 条的案：" + res.filter((r) => r.total > 20).length + "/30 → " +
  res.filter((r) => r.total > 20).sort((a,b)=>b.total-a.total).map((r) => r.id + "(" + r.total + ")").join(" "));
console.log("≤20 条的案：" + res.filter((r) => r.total <= 20).map((r) => r.id + "(" + r.total + ")").join(" "));
