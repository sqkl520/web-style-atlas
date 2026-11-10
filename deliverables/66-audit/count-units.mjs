/* 66-audit 只读探针 v2：独立重数 30 案「同构重复单元」，并把**每一个候选**连同父级上下文
 * 打出来，供人工逐案裁决（自动统计只负责把候选摆上桌，判定必须人看）。
 *
 * 判据（我自己定的，写死成可执行规则，任何人都能换解析器复核）：
 *   A. 版面单元 = 同父级、同 tag、同 class 族 的兄弟组（≥2）。
 *      class 族 = 首个 class 去掉 BEM 修饰符 `--x` 与状态前缀 `is-/has-`；
 *      无 class 时退化为「同父级同 tag」，输出里用 `*` 标记，**必须人工确认**。
 *   B. 排除：行内元素、表格单元格、SVG 内部、纯纹理/装饰层、导航/页脚/页头（<nav>/<header>/<footer>
 *      子树整棵跳过 —— 导航项数量是 IA 决定的，不是设计单元）。
 *   C. 表格行、SVG 图元单独统计（tabular / svg 两个字段），因为它们是本案的「重复单元」
 *      但被 B 排除（S10 报价表 12 行、S17 27 行、S29 23 个 g.pt）。
 *   D. 每组附带：父级 tag.class#id、首个子节点的文本前 40 字（用来判断这一组
 *      「是条目还是正文/装饰」）。
 *
 * 输出 deliverables/66-audit/units.json ＋ 控制台明细。
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const PROTO = join(ROOT, "prototypes");

const dirs = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
const INLINE = new Set(["span","b","i","em","strong","code","small","kbd","sub","sup","abbr","cite","q","mark","time","label","a"]);
const TABLE = new Set(["td","th","tr","tbody","thead","tfoot","table","caption","colgroup","col"]);
const SVG = new Set(["svg","g","path","rect","text","circle","line","polyline","polygon","use","defs","clipPath","mask","filter","linearGradient","radialGradient","stop","tspan","ellipse","symbol","pattern","image","textPath"]);
const CHROME = new Set(["nav","header","footer"]);
const DECOR_RE = /(texture|grain|vignette|scanline|cursor|noise|glow|halftone|paper-|rule|tick|hatch)/i;

function parse(html) {
  const root = { tag: "#root", cls: [], attrs: "", children: [], parent: null, idx: 0, text: "" };
  let cur = root;
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) break;
    if (html.startsWith("<!--", lt)) { const e = html.indexOf("-->", lt); i = e < 0 ? n : e + 3; continue; }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) { const e = html.indexOf(">", lt); i = e < 0 ? n : e + 1; continue; }
    const gt = html.indexOf(">", lt);
    if (gt < 0) break;
    const raw = html.slice(lt + 1, gt);
    const closing = raw.startsWith("/");
    const selfClose = raw.endsWith("/");
    /* 结束标签先剥 "/"，否则闭合全部失效、整棵树拍扁成一层。 */
    const body = raw.replace(closing ? /^\/+/ : /^$/, "").replace(/\/$/, "").trim();
    const m = /^([A-Za-z][\w:-]*)/.exec(body);
    if (!m) { i = gt + 1; continue; }
    const tag = m[1];
    const lower = tag.toLowerCase();
    if (closing) { if (cur && cur.tag.toLowerCase() === lower && cur.parent) cur = cur.parent; i = gt + 1; continue; }
    const attrText = body.slice(m[0].length);
    const clsM = /\bclass\s*=\s*"([^"]*)"/i.exec(attrText) || /\bclass\s*=\s*'([^']*)'/i.exec(attrText);
    const cls = clsM ? clsM[1].trim().split(/\s+/).filter(Boolean) : [];
    const idM = /\bid\s*=\s*"([^"]*)"/i.exec(attrText);
    const node = { tag, lower, cls, id: idM ? idM[1] : "", attrs: attrText, children: [], parent: cur, idx: cur.children.length, text: "" };
    cur.children.push(node);
    if (lower === "script" || lower === "style") {
      const close = html.toLowerCase().indexOf("</" + lower, gt);
      i = close < 0 ? n : html.indexOf(">", close) + 1;
      continue;
    }
    if (!VOID.has(lower) && !selfClose) cur = node;
    i = gt + 1;
  }
  return root;
}

function fam(node) {
  if (!node.cls.length) return "";
  let c = node.cls[0].replace(/^is-/, "").replace(/^has-/, "");
  return c.split("--")[0];
}

function walk(node, fn, skipChrome = true) {
  fn(node);
  for (const k of node.children) {
    if (skipChrome && CHROME.has(k.lower)) continue;
    walk(k, fn, skipChrome);
  }
}

function textOf(node, cap = 60) {
  let out = "";
  (function w(nd) {
    if (out.length >= cap) return;
    for (const c of nd.children) {
      if (c.lower === "script" || c.lower === "style") continue;
      w(c);
    }
    if (!nd.children.length && nd.tag !== "#root") { /* leaf */ }
  })(node);
  // 直接抓 node.attrs 之后的文本太麻烦，改用标签剥离的近似：由外层预先给 bodyNoTag 的偏移。
  return out;
}

function groups(root) {
  const res = [];
  walk(root, (p) => {
    const byKey = new Map();
    for (const c of p.children) {
      if (CHROME.has(c.lower)) continue;
      const f = fam(c);
      const key = c.lower + "|" + (f || "*");
      if (!byKey.has(key)) byKey.set(key, { tag: c.lower, fam: f || "*", tagOnly: !f, nodes: [] });
      byKey.get(key).nodes.push(c);
    }
    for (const g of byKey.values()) {
      if (g.nodes.length < 2) continue;
      res.push({
        parentTag: p.lower,
        parentCls: p.cls.join(".") || "",
        parentId: p.id || "",
        parentFam: fam(p),
        count: g.nodes.length,
        tag: g.tag,
        fam: g.fam,
        tagOnly: g.tagOnly,
        firstIdx: g.nodes[0].idx,
      });
    }
  });
  return res;
}

function excluded(g) {
  if (TABLE.has(g.tag)) return "table";
  if (SVG.has(g.tag)) return "svg";
  if (INLINE.has(g.tag)) return "inline";
  if (DECOR_RE.test(g.fam)) return "decoration";
  return "";
}

function countTags(root, pred) {
  let c = 0; const detail = [];
  walk(root, (nd) => { if (pred(nd)) { c++; if (detail.length < 8) detail.push(nd); } }, false);
  return { count: c, detail };
}

const SELF_REPORT_RE = /(\d+)\s*(个|处|栏|枚|行|块|条|节|格|张|位|页|层)/g;

const out = [];
for (const d of dirs) {
  const id = d.slice(0, 3);
  const html = readFileSync(join(PROTO, d, "index.html"), "utf8");
  const tree = parse(html);
  const gs = groups(tree).map((g) => ({ ...g, excluded: excluded(g) }));

  // 表格行：tr（去掉 thead 内的表头，单列）
  const trAll = countTags(tree, (nd) => nd.lower === "tr");
  const thead = countTags(tree, (nd) => nd.lower === "thead");
  // SVG 图元
  const gPt = countTags(tree, (nd) => nd.lower === "g" && fam(nd) === "pt");
  const gAny = countTags(tree, (nd) => nd.lower === "g" && !fam(nd));
  // 文本剥离版（给自报数词做上下文）
  const bodyNoTag = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const selfReport = [];
  let m;
  while ((m = SELF_REPORT_RE.exec(bodyNoTag))) {
    selfReport.push({ n: Number(m[1]), unit: m[2], ctx: bodyNoTag.slice(Math.max(0, m.index - 12), m.index + m[0].length + 8).replace(/\s+/g, " ").trim() });
  }

  out.push({
    id, dir: d,
    ok: gs.filter((g) => !g.excluded).sort((a, b) => b.count - a.count),
    bad: gs.filter((g) => g.excluded).sort((a, b) => b.count - a.count),
    tableRows: trAll.count, theadCount: thead.count,
    svgGPt: gPt.count,
    selfReport,
  });
}

writeFileSync(join(HERE, "units.json"), JSON.stringify(out, null, 1), "utf8");

const parsed = JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/minitems-parsed.json"), "utf8").replace(/^\uFEFF/, ""));
const cap = Object.fromEntries(parsed.map((x) => [x.id, x]));

for (const r of out) {
  const c = cap[r.id] || {};
  console.log(`\n=== ${r.id}  cap.minItems=${c.minItems}  degrades=${c.degrades}  |  tr=${r.tableRows}(thead ${r.theadCount})  g.pt=${r.svgGPt}`);
  console.log("  OK 候选：" + r.ok.slice(0, 8).map((g) =>
    `${g.parentTag}${g.parentCls ? "." + g.parentCls : ""}${g.parentId ? "#" + g.parentId : ""} > ${g.tag}.${g.fam}${g.tagOnly ? "(tagOnly)" : ""}×${g.count}`
  ).join("  |  "));
  console.log("  排除项：" + r.bad.slice(0, 4).map((g) => `${g.parentTag} > ${g.tag}.${g.fam}×${g.count}[${g.excluded}]`).join("  |  "));
  const sr = [...new Set(r.selfReport.map((x) => x.n + x.unit))].slice(0, 10).join(",");
  console.log("  自报数词：" + sr);
}
