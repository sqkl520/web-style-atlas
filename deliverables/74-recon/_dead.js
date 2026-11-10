const fs = require("fs");
const jobs = [
  ["app.js", ["axColor", "clearQueryAxis", "dropParked", "restoreQuery", "plainOf", "countPoints", "runLength", "scrollTo", "isNarrow", "uniq", "foldSum", "auditText", "stateKey", "gateKey", "sorted", "shotFig", "gateTags", "capacityHTML", "observeRows", "syncCurrent", "focusBackToRow", "parkQuery", "syncParked", "field", "auditFold", "chips", "match", "rowHTML", "paletteLine"]],
  ["prompt-copy.js", ["cleanField", "openerBiz", "tplById", "currentTerm", "drawStripSummary", "benchTemplateHits", "execCopySync", "showManual", "copyPrompt", "trimStack", "fire", "makeField", "readFields", "refresh"]]
];
for (const [f, names] of jobs) {
  const src = fs.readFileSync("D:/Web/style/prototypes/_selection/" + f, "utf8");
  const js = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const n of names) {
    const c = (js.match(new RegExp("\\b" + n + "\\b", "g")) || []).length;
    console.log((c <= 1 ? "DEAD? " : "ok    ") + f + " " + n + " " + c);
  }
}
