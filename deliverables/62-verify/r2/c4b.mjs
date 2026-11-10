// C-4b：用 CDP 实测 S18 页面里真实的 .ln 行数 vs minItems=20
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
for (const [id, dir] of [["S18", "S18-phosphor-service-deck"], ["S30", "S30-skate-sticker-split"], ["S19", "S19-copperplate-herbarium-cabinet"], ["S07", "S07-letterpress-catalogue-spread"]]) {
  try {
    await p.goto(`http://127.0.0.1:9583/prototypes/${dir}/index.html`, { settleMs: 900 });
  } catch (e) { console.log(id, "goto err", e.message); continue; }
  const r = await p.eval(() => {
    const q = (s) => document.querySelectorAll(s).length;
    return {
      ln: q(".ln"), tr: q("tr"), li: q("li"), article: q("article"),
      drawer: q(".dw__card"), chip: q(".chip"),
      sections: q("section"),
      // 绝对定位的重复单元
      absCards: [...document.querySelectorAll("[class]")].filter((e) => getComputedStyle(e).position === "absolute" && /card|panel|block|slot|drawer/i.test(e.className)).length,
      bodyLen: document.body.innerText.length,
    };
  });
  console.log(id, JSON.stringify(r));
}
await p.close(); await b.close();
