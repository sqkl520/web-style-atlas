import { readFileSync } from "node:fs";
for (const [id,dir,pat] of [["S24","S24-cyanotype-rainforest-path","article class=\"br"],["S28","S28-jazz-intaglio-wall","article class=\"blk"],["S30","S30-skate-sticker-split","article class=\"sticker"]]) {
  const t = readFileSync(`prototypes/${dir}/index.html`,"utf8");
  const re = new RegExp(pat.replace(/[[\]]/g,"\\$&"),"g");
  const n = (t.match(new RegExp(pat.replace(/[[\]]/g,"\\$&"),"g"))||[]).length;
  console.log(id, "units:", n);
  const idx = t.indexOf(pat);
  console.log("  sample:", JSON.stringify(t.slice(idx-120, idx+200)));
}
