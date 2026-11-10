import { readFileSync } from "node:fs";
const probes = [
 ["S08","S08-amber-overprint-lightbox","plate"],
 ["S19","S19-copperplate-herbarium-cabinet","dw"],
 ["S21","S21-interlocking-release-book","lockbar"],
 ["S24","S24-cyanotype-rainforest-path","br"],
 ["S25","S25-spotcolor-contents-zine","entry"],
 ["S30","S30-skate-sticker-split","sticker"],
 ["S18","S18-phosphor-service-deck","ln"],
 ["S09","S09-batik-price-board","row"],
];
for (const [id,dir,cls] of probes) {
  const t = readFileSync(`prototypes/${dir}/index.html`,"utf8");
  const attrs = [...t.matchAll(/class="([^"]*\b(?:plate|dw|lockbar|br|entry|sticker|ln|row)\b[^"]*)"/g)].map(m=>m[1]);
  const hist = {};
  for (const a of attrs) hist[a]=(hist[a]||0)+1;
  console.log(id, JSON.stringify(hist));
}
