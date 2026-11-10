global.window = {};
const fs = require("fs");
require("D:/Web/style/prototypes/_selection/data.js");
require("D:/Web/style/prototypes/_selection/prompts.js");
const S = window.SCHEMES, P = window.STYLE_PROMPTS;

// sceneIndex stats
const terms = Object.keys(P.sceneIndex);
const direct = terms.filter(t => (P.sceneIndex[t].direct || []).length);
const nearOnly = terms.filter(t => !(P.sceneIndex[t].direct || []).length);
console.log("sceneIndex terms:", terms.length, "direct:", direct.length, "nearOnly:", nearOnly.length, "unsupported:", P.unsupported.length, "total vocab:", terms.length + P.unsupported.length);

// duplication: risk field
let riskSame = 0, riskChars = 0, riskDiff = [];
for (const s of S) {
  const p = P.schemes.find(x => x.id === s.id);
  if (p && p.dna.risk === s.risk) riskSame++;
  else riskDiff.push(s.id);
  riskChars += (s.risk || "").length;
}
console.log("risk identical in data.js+prompts.js:", riskSame + "/30", "chars:", riskChars, "diff:", riskDiff.join(","));

// dir duplication
console.log("dir identical:", S.filter(s => s.dir === P.schemes.find(x => x.id === s.id).dir).length + "/30");

// palette duplication: data.palette colors all present in dna.palette string?
let palSubset = 0;
for (const s of S) {
  const p = P.schemes.find(x => x.id === s.id);
  const hexes = (p.dna.palette.match(/#[0-9A-Fa-f]{6}/g) || []).map(x => x.toUpperCase());
  if (s.palette.every(h => hexes.includes(h.toUpperCase()))) palSubset++;
}
console.log("data.palette ⊆ dna.palette:", palSubset + "/30");

// scenes duplication: prompts.scenes appears (conceptually) in data.scenesYes?
let sceneTokensInYes = 0;
for (const s of S) {
  const p = P.schemes.find(x => x.id === s.id);
  if (p.scenes.every(t => s.scenesYes.includes(t))) sceneTokensInYes++;
}
console.log("prompts.scenes tokens literally inside data.scenesYes:", sceneTokensInYes + "/30");

// gate totals
const built = S.filter(s => s.built).length;
const clean = S.filter(s => s.gate && s.gate.fail === 0).length;
const shots = S.reduce((a, s) => a + s.shots.desktop.length + s.shots.tablet.length + s.shots.mobile.length, 0);
console.log("built", built, "gate.fail=0", clean, "shots", shots);

// minItems from minitems-parsed vs HUMAN
const MIN = JSON.parse(fs.readFileSync("D:/Web/style/prototypes/_prompts/minitems-parsed.json", "utf8").replace(/^\uFEFF/, ""));
console.log("minitems-parsed entries:", MIN.length, "sample:", JSON.stringify(MIN[0]));
let mismatch = [];
for (const m of MIN) {
  const p = P.schemes.find(x => x.id === m.id);
  if (p && p.minItems !== m.minItems) mismatch.push(m.id + ":" + m.minItems + "→" + p.minItems);
}
console.log("minItems mismatches:", mismatch.join(",") || "none");
console.log("hard:", P.hardIds.join(","), "degrades yes:", P.schemes.filter(s => s.capacity.degrades === "yes").map(s => s.id).join(","));
