/* 66-audit 只读探针：数「主重复单元里有多少个**不是内容**」。
 *
 * 为什么这一步必要：minItems 的判据是「同父级同 tag 同 class 族的兄弟组规模」，
 * 这个口径**只数 DOM 结构，不看单元里装的是什么**。而作者在若干案里刻意留了
 * 空位 / 空缺 / 作废 / 故障 单元作为版式叙事的一部分：
 *   · S02 第 5 级 `is-vacant`（文案「空缺」，台账写「缺号 1 处」）
 *   · S06 `card--blank` ×3（空卡，只有污渍）
 *   · S29 零件表里有作废行
 * 这些单元在「用户要准备几条内容」这个问题上**不成立**：
 * 用户不需要为「空缺」准备一条内容，但提示词会把 N 一起算进去。
 *
 * 判据：在已确认的主单元集合里，class 命中
 *   is-vacant|is-blank|--blank|is-fault|is-gap|is-void|is-empty|is-placeholder
 * 或文本含 空缺|待补|作废|未登记|占位
 * 的记为「非内容单元」。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const VOID = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
function parse(html) {
  const root = { tag: "#root", cls: [], id: "", children: [], parent: null };
  let cur = root, i = 0;
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
    const lower = m[1].toLowerCase();
    if (closing) { if (cur && cur.tag === lower && cur.parent) cur = cur.parent; i = gt + 1; continue; }
    const attrText = body.slice(m[0].length);
    const clsM = /\bclass\s*=\s*"([^"]*)"/i.exec(attrText) || /\bclass\s*=\s*'([^']*)'/i.exec(attrText);
    const idM = /\bid\s*=\s*"([^"]*)"/i.exec(attrText);
    const node = { tag: lower, cls: clsM ? clsM[1].trim().split(/\s+/).filter(Boolean) : [], id: idM ? idM[1] : "", children: [], parent: cur, start: gt + 1 };
    cur.children.push(node);
    if (lower === "script" || lower === "style") {
      const close = html.toLowerCase().indexOf("</" + lower, gt);
      const cg = close < 0 ? n : html.indexOf(">", close) + 1;
      node.end = cg; i = cg; continue;
    }
    if (!VOID.has(lower) && !selfClose) cur = node;
    i = gt + 1;
  }
  return root;
}
function fam(nd){ if(!nd.cls.length) return ""; return nd.cls[0].replace(/^is-/,"").replace(/^has-/,"").split("--")[0]; }
function walk(nd, fn){ fn(nd); for(const c of nd.children) walk(c, fn); }

const MAIN = {
  S01:{dir:"S01-red-wedge-broadsheet",p:{tag:"div",cls:"plate-grid"},c:"plate",t:"figure"},
  S02:{dir:"S02-gilded-symmetry-salon",p:{tag:"ol",cls:"ladder"},c:"step",t:"li"},
  S03:{dir:"S03-long-exposure-observatory",p:{tag:"div",cls:"stream"},c:"band",t:"figure"},
  S04:{dir:"S04-mango-collage-wall",p:{tag:"div",cls:"wall__grid"},c:"slip",t:"figure"},
  S05:{dir:"S05-pixel-cold-storage-console",p:{tag:"div",cls:"console-grid"},c:"panel",t:"article"},
  S06:{dir:"S06-showa-kissaten-ledger",p:{tag:"div",cls:"river"},c:"card",t:"article"},
  S07:{dir:"S07-slate-ink-contents",p:{tag:"ol"},c:"",t:"li"},
  S08:{dir:"S08-amber-overprint-lightbox",p:{tag:"div",id:"plane"},c:"plate",t:"div"},
  S09:{dir:"S09-batik-price-board",p:{tag:"ul",id:"rows"},c:"row",t:"li"},
  S10:{dir:"S10-grid-versus-sheet",p:{tag:"tbody"},c:"",t:"tr",ex:"row-gap"},
  S11:{dir:"S11-samizdat-typewriter",p:{tag:"main",id:"manual"},c:"chapter",t:"section"},
  S12:{dir:"S12-lime-knockout-wall",p:{tag:"div",cls:"wall"},c:"opening",t:"article"},
  S13:{dir:"S13-blind-debossed-dispatch",p:{tag:"article",id:"clauses"},c:"clause",t:"section"},
  S14:{dir:"S14-zero-g-launch-sequence",p:{tag:"div",id:"field"},c:"tag",t:"article"},
  S15:{dir:"S15-fishery-floor-ledger",p:{tag:"g",cls:"zones"},c:"hot",t:"a"},
  S16:{dir:"S16-velocity-slant-manifesto",p:{tag:"main",id:"track"},c:"slab",t:"section"},
  S17:{dir:"S17-revenue-stamp-stub",p:{tag:"tbody",id:"ledger-body"},c:"",t:"tr"},
  S18:{dir:"S18-phosphor-service-deck",p:{tag:"pre",cls:"lines"},c:"ln",t:"span"},
  S19:{dir:"S19-copperplate-herbarium-cabinet",p:{tag:"ul",cls:"row"},c:"dw",t:"li"},
  S20:{dir:"S20-plotter-soundfield",p:{tag:"ul",cls:"plates"},c:"plate",t:"li"},
  S21:{dir:"S21-interlocking-release-book",p:{tag:"ol",id:"rail"},c:"lockbar",t:"li"},
  S22:{dir:"S22-paper-screen-folded-sheet",p:{tag:"ul",cls:"plates"},c:"plate",t:"li"},
  S23:{dir:"S23-exposed-plaster-chronology-wall",p:{tag:"div",cls:"wall"},c:"flake",t:"article"},
  S24:{dir:"S24-cyanotype-rainforest-path",p:{tag:"div",cls:"lv"},c:"br",t:"article"},
  S25:{dir:"S25-spotcolor-contents-zine",p:{tag:"ol",cls:"entries"},c:"entry",t:"li"},
  S26:{dir:"S26-geometric-collision-columns",p:{tag:"main"},c:"sec",t:"section"},
  S27:{dir:"S27-hand-painted-bill-dispatch",p:{tag:"div",cls:"wrap"},c:"act",t:"article"},
  S28:{dir:"S28-jazz-intaglio-wall",p:{tag:"div",cls:"row"},c:"blk",t:"article"},
  S29:{dir:"S29-wire-bound-safety-manual",p:{tag:"svg",cls:"diag"},c:"pt",t:"g"},
  S30:{dir:"S30-skate-sticker-split",p:{tag:"div",cls:"cut__cols"},c:"",t:"article",ex:"",gc:{tag:"div",cls:"cut__col"},gt:{tag:"article",cls:"sticker"}},
};

const BLANK_CLS = /(^|-)(vacant|blank|fault|gap|void|empty|placeholder|missing)\b|is-(vacant|blank|fault|gap|void|empty|placeholder|missing)/i;
const BLANK_TXT = /空缺|待补|作废|未登记|占位|暂无|此处无/;

const cap = Object.fromEntries(
  JSON.parse(readFileSync(join(ROOT,"prototypes/_prompts/minitems-parsed.json"),"utf8").replace(/^\uFEFF/,"")).map(x=>[x.id,x]));

const rows = [];
for (const id of Object.keys(MAIN).sort()) {
  const sp = MAIN[id];
  const html = readFileSync(join(ROOT,"prototypes",sp.dir,"index.html"),"utf8");
  const tree = parse(html);
  const parents = [];
  walk(tree, nd => {
    if (nd.tag !== sp.p.tag) return;
    if (sp.p.id && nd.id !== sp.p.id) return;
    if (sp.p.cls && !nd.cls.includes(sp.p.cls)) return;
    parents.push(nd);
  });
  let nodes = [];
  for (const p of parents) {
    for (const c of p.children) {
      if (sp.gc) {
        if (c.tag !== sp.gc.tag || !c.cls.includes(sp.gc.cls)) continue;
        for (const g of c.children) if (g.tag === sp.gt.tag && g.cls.includes(sp.gt.cls)) nodes.push(g);
      } else {
        if (c.tag !== sp.t) continue;
        if (sp.c && fam(c) !== sp.c && !c.cls.includes(sp.c)) continue;
        if (sp.ex && c.cls.includes(sp.ex)) continue;
        nodes.push(c);
      }
    }
  }
  const blank = [];
  for (const nd of nodes) {
    const clsHit = nd.cls.some(c => BLANK_CLS.test(c));
    const seg = html.slice(nd.start, Math.min(nd.end || nd.start + 900, nd.start + 900));
    const txt = seg.replace(/<[^>]+>/g, " ");
    const txtHit = BLANK_TXT.test(txt);
    if (clsHit || txtHit) blank.push({ cls: nd.cls.join(".") || "(无class)", hit: [clsHit?"class":"", txtHit?"text":""].filter(Boolean).join("+"), snip: txt.replace(/\s+/g," ").trim().slice(0,50) });
  }
  rows.push({ id, dom: nodes.length, claim: (cap[id]||{}).minItems, blankCount: blank.length, blank });
}

writeFileSync(join(HERE,"blank-units.json"), JSON.stringify(rows,null,1),"utf8");

console.log("id   声称  DOM  非内容单元   说明");
let tot=0, cases=0;
for (const r of rows) {
  if (r.blankCount) {
    cases++; tot += r.blankCount;
    console.log(`${r.id}  ${String(r.claim).padStart(4)} ${String(r.dom).padStart(5)}  ${String(r.blankCount).padStart(6)}     ` +
      r.blank.map(b=>`${b.cls}[${b.hit}] "${b.snip}"`).join(" / "));
  }
}
console.log(`\n>>> ${cases} 案的主重复单元里含 ${tot} 个非内容单元（空位/空缺/作废）`);
console.log(">>> 这些单元被计入 minItems，但用户不需要为它们准备内容");
