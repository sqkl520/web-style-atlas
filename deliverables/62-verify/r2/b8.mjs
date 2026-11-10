// B-8：用户自然会打的「半截词」是否也能触发模板/芯片口径（咖啡 vs 咖啡店）
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto("http://127.0.0.1:9583/prototypes/_selection/index.html", { settleMs: 1500 });

const terms = ["咖啡", "咖啡店", "咖啡馆", "餐厅", "饭店", "餐馆", "烘焙", "面包", "蛋糕", "甜品",
  "理发", "理发店", "花店", "鲜花", "民宿", "律师", "律所", "摄影", "摄影师", "作品集",
  "设计工作室", "工作室", "企业站", "个人网站"];

const out = [];
for (const t of terms) {
  await p.eval(() => { const q = document.getElementById("q"); q.value = ""; q.dispatchEvent(new Event("input", { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 120));
  await p.eval((term) => { const q = document.getElementById("q"); q.value = term; q.dispatchEvent(new Event("input", { bubbles: true })); }, t);
  await new Promise((r) => setTimeout(r, 300));
  const s = await p.eval((term) => {
    const hit = window.benchTemplateHits(term);
    const idx = window.STYLE_PROMPTS.sceneIndex[term];
    return {
      term,
      rows: document.querySelectorAll("#ledger > li").length,
      stripHidden: document.getElementById("tpl-strip").hidden,
      stripCards: [...document.querySelectorAll("#tpl-cards .tpl-card")].map((c) => c.dataset.tpl),
      emptyTplCards: [...document.querySelectorAll("#empty-tpl .tpl-card")].map((c) => c.dataset.tpl),
      tplExact: hit.exact, tplAdj: hit.adjacent,
      inSceneIndex: !!idx,
      direct: idx ? idx.direct : [],
      near: idx ? idx.near : [],
    };
  }, t);
  out.push(s);
  console.log(`${t.padEnd(12)} rows=${String(s.rows).padEnd(2)} 模板=${String(s.stripCards.concat(s.emptyTplCards)).padEnd(8)} exact=${String(s.tplExact)} adj=${String(s.tplAdj)} sceneIndex=${s.inSceneIndex ? "有" : "无"} direct=${JSON.stringify(s.direct)}`);
}
await p.close(); await b.close();
