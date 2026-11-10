/* 66-audit 只读探针 v4：**树内**定位主重复单元（同父级、同 tag、class 族相同），
 * 不用正则数 class 属性 —— 正则会把 `plate` 与 `plate-face` 混算（S08 因此虚报 54），
 * 也会漏掉 `br br--w` 这类带修饰符的写法（S24 因此虚报 0）。
 *
 * MAIN 表逐案指定「父级选择器 + 子级 class 族」，父级用 tag + id/class 任一匹配。
 * 输出每案的：声称 minItems / DOM 实测 / 页面自报 / 首末行号 / 差额。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);

function parse(html) {
  const root = { tag: "#root", cls: [], id: "", children: [], parent: null, start: 0, end: 0 };
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
    const body = raw.replace(closing ? /^\/+/ : /^$/, "").replace(/\/$/, "").trim();
    const m = /^([A-Za-z][\w:-]*)/.exec(body);
    if (!m) { i = gt + 1; continue; }
    const tag = m[1];
    const lower = tag.toLowerCase();
    if (closing) {
      if (cur && cur.tag.toLowerCase() === lower && cur.parent) { cur.end = gt + 1; cur = cur.parent; }
      i = gt + 1;
      continue;
    }
    const attrText = body.slice(m[0].length);
    const clsM = /\bclass\s*=\s*"([^"]*)"/i.exec(attrText) || /\bclass\s*=\s*'([^']*)'/i.exec(attrText);
    const idM = /\bid\s*=\s*"([^"]*)"/i.exec(attrText);
    const node = { tag, lower, cls: clsM ? clsM[1].trim().split(/\s+/).filter(Boolean) : [], id: idM ? idM[1] : "", children: [], parent: cur, start: lt, end: gt + 1 };
    cur.children.push(node);
    if (lower === "script" || lower === "style") {
      const close = html.toLowerCase().indexOf("</" + lower, gt);
      const closeGt = close < 0 ? n : html.indexOf(">", close) + 1;
      node.end = closeGt;
      i = closeGt;
      continue;
    }
    if (!VOID.has(lower) && !selfClose) cur = node;
    i = gt + 1;
  }
  return root;
}

function fam(node) {
  if (!node.cls.length) return "";
  return node.cls[0].replace(/^is-/, "").replace(/^has-/, "").split("--")[0];
}

function walk(node, fn) {
  fn(node);
  for (const c of node.children) walk(c, fn);
}

function lineOf(text, idx) {
  let n = 1;
  for (let i = 0; i < idx; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

/* 选择器：{ tag, id?, cls? } —— 三者都给的必须全匹配；只给 tag 就按 tag 匹配 */
function sel(node, s) {
  if (s.tag && node.lower !== s.tag) return false;
  if (s.id && node.id !== s.id) return false;
  if (s.cls && !node.cls.includes(s.cls)) return false;
  return true;
}

const MAIN = {
  S01: { dir: "S01-red-wedge-broadsheet", parent: { tag: "div", cls: "plate-grid" }, child: "plate", tag: "figure", note: "figure.plate（.plate-grid 直接子项）" },
  S02: { dir: "S02-gilded-symmetry-salon", parent: { tag: "ol", cls: "ladder" }, child: "step", tag: "li", note: "li.step 左右两梯合计（含 1 个 is-vacant 空位）", all: true },
  S03: { dir: "S03-long-exposure-observatory", parent: { tag: "div", cls: "stream" }, child: "band", tag: "figure", note: "figure.band（.stream 直接子项）" },
  S04: { dir: "S04-mango-collage-wall", parent: { tag: "div", cls: "wall__grid" }, child: "slip", tag: "figure", note: "figure.slip（3 个 .wall__grid 各 3 张）", all: true },
  S05: { dir: "S05-pixel-cold-storage-console", parent: { tag: "div", cls: "console-grid" }, child: "panel", tag: "article", note: "article.panel（.console-grid 直接子项）" },
  S06: { dir: "S06-showa-kissaten-ledger", parent: { tag: "div", cls: "river" }, child: "card", tag: "article", note: "article.card（.river 直接子项）" },
  S07: { dir: "S07-slate-ink-contents", parent: { tag: "ol" }, child: "", tag: "li", note: "ol#toc-list 18 + ol.toc 28（纸背），li 无 class", all: true, liNoClass: true },
  S08: { dir: "S08-amber-overprint-lightbox", parent: { tag: "div", id: "plane" }, child: "plate", tag: "div", note: "div.plate（#plane 直接子项）" },
  S09: { dir: "S09-batik-price-board", parent: { tag: "ul", id: "rows" }, child: "row", tag: "li", note: "li.row（ul#rows 直接子项）" },
  S10: { dir: "S10-grid-versus-sheet", parent: { tag: "tbody" }, child: "", tag: "tr", note: "tbody 内数据行（另有 3 行 .row-gap 空档）", all: true, excludeCls: "row-gap" },
  S11: { dir: "S11-samizdat-typewriter", parent: { tag: "main", id: "manual" }, child: "chapter", tag: "section", note: "section.chapter（main#manual 直接子项）" },
  S12: { dir: "S12-lime-knockout-wall", parent: { tag: "div", cls: "wall" }, child: "opening", tag: "article", note: "article.opening（.wall 直接子项）" },
  S13: { dir: "S13-blind-debossed-dispatch", parent: { tag: "article", id: "clauses" }, child: "clause", tag: "section", note: "section.clause（article#clauses 直接子项）" },
  S14: { dir: "S14-zero-g-launch-sequence", parent: { tag: "div", id: "field" }, child: "tag", tag: "article", note: "article.tag（#field 直接子项）" },
  S15: { dir: "S15-fishery-floor-ledger", parent: { tag: "g", cls: "zones" }, child: "hot", tag: "a", note: "a.hot（g.zones 内热区，SVG 手绘矩形）" },
  S16: { dir: "S16-velocity-slant-manifesto", parent: { tag: "main", id: "track" }, child: "slab", tag: "section", note: "section.slab（main#track 直接子项）" },
  S17: { dir: "S17-revenue-stamp-stub", parent: { tag: "tbody", id: "ledger-body" }, child: "", tag: "tr", note: "tbody#ledger-body 数据行（编号连号）", all: true },
  S18: { dir: "S18-phosphor-service-deck", parent: { tag: "pre", cls: "lines" }, child: "ln", tag: "span", note: "span.ln（3 段 pre.lines 各 20 行）", all: true },
  S19: { dir: "S19-copperplate-herbarium-cabinet", parent: { tag: "ul", cls: "row" }, child: "dw", tag: "li", note: "li.dw（5 个 .rowwrap 各 4 屉）", all: true },
  S20: { dir: "S20-plotter-soundfield", parent: { tag: "ul", cls: "plates" }, child: "plate", tag: "li", note: "li.plate（ul.plates 直接子项）" },
  S21: { dir: "S21-interlocking-release-book", parent: { tag: "ol", id: "rail" }, child: "lockbar", tag: "li", note: "li.lockbar（ol#rail 直接子项）" },
  S22: { dir: "S22-paper-screen-folded-sheet", parent: { tag: "ul", cls: "plates" }, child: "plate", tag: "li", note: "li.plate--a…f（ul.plates 直接子项）" },
  S23: { dir: "S23-exposed-plaster-chronology-wall", parent: { tag: "div", cls: "wall" }, child: "flake", tag: "article", note: "article.flake（.wall 直接子项）" },
  S24: { dir: "S24-cyanotype-rainforest-path", parent: { tag: "div", cls: "lv" }, child: "br", tag: "article", note: "article.br（4 个 .lv 内，br--w/br--n 两支）", all: true },
  S25: { dir: "S25-spotcolor-contents-zine", parent: { tag: "ol", cls: "entries" }, child: "entry", tag: "li", note: "li.entry（ol.entries 直接子项）" },
  S26: { dir: "S26-geometric-collision-columns", parent: { tag: "main" }, child: "sec", tag: "section", note: "section.sec（main 直接子项）" },
  S27: { dir: "S27-hand-painted-bill-dispatch", parent: { tag: "div", cls: "wrap" }, child: "act", tag: "article", note: "article.act（.wrap 直接子项）" },
  S28: { dir: "S28-jazz-intaglio-wall", parent: { tag: "div", cls: "row" }, child: "blk", tag: "article", note: "article.blk（4 个 .row 各 3 块）", all: true },
  S29: { dir: "S29-wire-bound-safety-manual", parent: { tag: "svg", cls: "diag" }, child: "pt", tag: "g", note: "g.pt（svg.diag 内零件；另有 23 行零件表）" },
  S30: { dir: "S30-skate-sticker-split", parent: { tag: "div" }, child: "cut__col", tag: "div", note: "两列 .cut__col 内的 article.sticker", all: true, grandchild: { tag: "article", cls: "sticker" } },
};

const cap = Object.fromEntries(
  JSON.parse(readFileSync(join(ROOT, "prototypes/_prompts/minitems-parsed.json"), "utf8").replace(/^\uFEFF/, "")).map((x) => [x.id, x])
);

const rows = [];
for (const id of Object.keys(MAIN).sort()) {
  const spec = MAIN[id];
  const full = join(ROOT, "prototypes", spec.dir, "index.html");
  const html = readFileSync(full, "utf8");
  const tree = parse(html);

  // 收集所有匹配的父级节点
  const parents = [];
  walk(tree, (nd) => { if (sel(nd, spec.parent)) parents.push(nd); });

  let nodes = [];
  for (const p of parents) {
    if (spec.grandchild) {
      for (const c of p.children) {
        if (!sel(c, spec.grandchild)) continue;
        nodes.push(c);
      }
    } else {
      for (const c of p.children) {
        if (c.lower !== spec.tag) continue;
        if (spec.child) {
          if (fam(c) !== spec.child && !c.cls.includes(spec.child)) continue;
        }
        if (spec.excludeCls && c.cls.includes(spec.excludeCls)) continue;
        nodes.push(c);
      }
    }
  }

  const c = cap[id] || {};
  const lines = nodes.map((nd) => lineOf(html, nd.start));
  rows.push({
    id,
    note: spec.note,
    claim: c.minItems,
    dom: nodes.length,
    delta: nodes.length - c.minItems,
    degrades: c.degrades,
    parentCount: parents.length,
    firstLine: lines.length ? Math.min(...lines) : null,
    lastLine: lines.length ? Math.max(...lines) : null,
  });
}

writeFileSync(join(HERE, "main-units.json"), JSON.stringify(rows, null, 1), "utf8");

console.log("id  声称 实测  Δ   degrades  父级数  行号");
for (const r of rows) {
  const d = r.delta === 0 ? "0" : (r.delta > 0 ? "+" + r.delta : String(r.delta));
  console.log(
    r.id + " " + String(r.claim).padStart(4) + " " + String(r.dom).padStart(5) + " " + d.padStart(3) +
    "   " + String(r.degrades).padEnd(4) + " " + String(r.parentCount).padStart(4) + "   " +
    r.firstLine + "-" + r.lastLine + "  " + r.note
  );
}

const mis = rows.filter((r) => r.delta !== 0);
console.log("\n>>> 声称≠实测：" + mis.length + "/30 → " + (mis.map((r) => `${r.id}(${r.claim}→${r.dom})`).join(" ") || "无"));
const vals = rows.map((r) => r.claim).sort((a, b) => a - b);
console.log(">>> minItems 分布：min=" + vals[0] + " 中位=" + vals[14] + "/" + vals[15] + " max=" + vals[29] +
  " 均=" + (vals.reduce((a, b) => a + b, 0) / 30).toFixed(1));
console.log(">>> >15 的案：" + rows.filter((r) => r.claim > 15).map((r) => r.id + "(" + r.claim + "," + r.degrades + ")").join(" "));
console.log(">>> degrades=yes：" + rows.filter((r) => r.degrades === "yes").map((r) => r.id).join(" ") + " 共 " + rows.filter((r) => r.degrades === "yes").length);
