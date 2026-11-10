import { readFileSync } from "node:fs";
const probes = [
 ["S02","S02-gilded-symmetry-salon",/<li class="step[^"]*"/g],
 ["S06","S06-showa-kissaten-ledger",/<article class="card[^"]*"/g],
 ["S19","S19-copperplate-herbarium-cabinet",/<li class="dw[^"]*"/g],
 ["S05","S05-pixel-cold-storage-console",/<article class="panel[^"]*"/g],
 ["S23","S23-exposed-plaster-chronology-wall",/<article class="flake[^"]*"/g],
 ["S29","S29-wire-bound-safety-manual",/<g class="pt[^"]*"/g],
];
for (const [id,d,re] of probes) {
  const t=readFileSync(`prototypes/${d}/index.html`,"utf8");
  const m=[...t.matchAll(re)].map(x=>x[0]);
  const hist={}; for(const a of m) hist[a]=(hist[a]||0)+1;
  const blank = m.filter(a=>/vacant|blank|fault|void|gap|empty|placeholder|missing|dead|off/i.test(a));
  console.log(`${id} 总=${m.length}  空/作废=${blank.length}  ` + JSON.stringify(hist));
}
