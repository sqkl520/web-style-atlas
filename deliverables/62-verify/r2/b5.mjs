// 路线 B-5：向导全量 162 组合——「对上你要的」是否真对上 + 闸门标注是否正确
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const BASE = "http://127.0.0.1:9583/prototypes/_selection/wizard.html";
const OUT = "D:/Web/style/deliverables/62-verify/r2";

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });

const ORDER = ["load", "img", "loud", "guide", "fear"];
const NQ = { load: 3, img: 3, loud: 3, guide: 2, fear: 3 };

const rows = [];
let n = 0;
const combos = [];
for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) for (let e = 0; e < 2; e++) for (let f = 0; f < 3; f++) combos.push({ load: a, img: c, loud: d, guide: e, fear: f });

for (const cmb of combos) {
  const qs = `?load=${cmb.load}&img=${cmb.img}&loud=${cmb.loud}&guide=${cmb.guide}&fear=${cmb.fear}`;
  await p.goto(BASE + qs, { settleMs: 420 });
  const r = await p.eval(() => {
    const pick = [...document.querySelectorAll("#wz-pick .wz-card")].map((c) => ({
      id: c.querySelector(".no") ? c.querySelector(".no").textContent.trim() : null,
      why: c.querySelector(".wz-why") ? c.querySelector(".wz-why").textContent.trim() : "",
      gate: c.querySelector(".wz-gate") ? c.querySelector(".wz-gate").textContent.trim() : null,
    }));
    const avoid = [...document.querySelectorAll("#wz-avoid .wz-card")].map((c) => ({
      id: c.querySelector(".no") ? c.querySelector(".no").textContent.trim() : null,
      why: c.querySelector(".wz-why") ? c.querySelector(".wz-why").textContent.trim() : "",
      gate: c.querySelector(".wz-gate") ? c.querySelector(".wz-gate").textContent.trim() : null,
    }));
    const method = document.getElementById("wz-method").textContent.trim();
    return { pick, avoid, method };
  });
  rows.push({ cmb, ...r });
  n++;
  if (n % 30 === 0) console.log("done", n);
}

/* 独立复算：用页面里的同一套数据判「对上你要的」是否属实 */
const recompute = await (async () => {
  await p.goto(BASE, { settleMs: 400 });
  return p.eval(() => {
    const ALL = (window.SCHEMES || []).filter((r) => r.gate);
    function satOf(hex) {
      if (!hex) return 0;
      const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
      if (!m) return 0;
      const n = parseInt(m[1], 16);
      const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx === mn) return 0;
      const l = (mx + mn) / 2;
      return l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn);
    }
    const loudnessOf = (pal) => (pal || []).reduce((m, h) => Math.max(m, satOf(h)), 0);
    const TONE_BOLD = { "混乱活力 / 街头": 2, "荒诞幽默 / 玩心": 2, "奢华暗黑 / 高定": 1.5, "温暖手作 / 人味": 1, "机能冷峻 / 工业": 1, "冷静克制 / 工程感": 0.5, "学术档案 / 严肃出版": 0.5 };
    const words = ALL.map((r) => r.gate.words || 0);
    const pics = ALL.map((r) => r.gate.realPictures || 0);
    const louds = ALL.map((r) => loudnessOf(r.palette));
    const stretch = (arr, v) => { const mn = Math.min(...arr), mx = Math.max(...arr); return mx === mn ? 1 : (v - mn) / (mx - mn) * 2; };
    const THR = { 低: 0, 中: 1, 高: 2 };
    const V = ALL.map((r) => {
      const loud = stretch(louds, loudnessOf(r.palette));
      const toneBold = TONE_BOLD[r.tone] === undefined ? 1 : TONE_BOLD[r.tone];
      return { r, load: stretch(words, r.gate.words || 0), img: stretch(pics, r.gate.realPictures || 0), loud, guide: THR[r.threshold] === undefined ? 1 : THR[r.threshold], fear: Math.min(2, loud * 0.6 + toneBold * 0.4) };
    });
    return V.map((v) => ({ id: v.r.id, load: v.load, img: v.img, loud: v.loud, guide: v.guide, fear: v.fear, words: v.r.gate.words, pics: v.r.gate.realPictures, fail: v.r.gate.fail, tone: v.r.tone }));
  });
})();

/* 逐条核对每个「对上你要的」是否真的档位相同 */
const toSlot = (v, nn) => Math.max(0, Math.min(nn - 1, Math.round(v * (nn - 1))));
const KCN = { load: "内容量", img: "图片", loud: "安静度", guide: "首屏引导", fear: "记忆点" };
const LABELPAT = /（对上你要的「([^」]+)」）/g;

let totalClaims = 0, falseClaims = 0;
const falseDetail = [];
for (const row of rows) {
  for (const card of row.pick) {
    const v = recompute.find((x) => x.id === card.id);
    if (!v) continue;
    // 解析 why 里的每一条「X 值（对上你要的「Y」）」
    const parts = card.why.split("　·　");
    for (const part of parts) {
      const m = /（对上你要的「([^」]+)」）/.exec(part);
      if (!m) continue;
      const asked = m[1];
      // 找出是哪一维：用 ASK 文案反查
      let dim = null, wantVal = null;
      const ASKMAP = {
        load: ["一屏说清", "三五屏", "很多栏目"],
        img: ["基本不用图", "几张就够", "图是主角"],
        loud: ["很安静", "有态度不吵", "要扎眼"],
        guide: ["三秒知道点哪", "愿意读进去"],
        fear: ["怕做错", "两头都不偏", "怕没记忆点"],
      };
      for (const k of ORDER) { const i = ASKMAP[k].indexOf(asked); if (i >= 0) { dim = k; wantVal = i; } }
      if (!dim) { totalClaims++; falseClaims++; falseDetail.push({ combo: row.cmb, id: card.id, why: part, reason: "无法识别的问法「" + asked + "」" }); continue; }
      const userAns = row.cmb[dim];
      const slot = toSlot(v[dim], NQ[dim]);
      totalClaims++;
      if (slot !== userAns || wantVal !== userAns) {
        falseClaims++;
        falseDetail.push({ combo: row.cmb, id: card.id, dim, part, slot, userAns, wantVal, raw: v[dim] });
      }
    }
  }
}

/* 闸门标注核对 */
let recWithFail = 0, recWithFailMissingNote = 0, noteMismatch = 0;
const gateIssues = [];
for (const row of rows) {
  for (const card of row.pick) {
    const v = recompute.find((x) => x.id === card.id);
    if (!v) continue;
    if (v.fail > 0) {
      recWithFail++;
      if (!card.gate) { recWithFailMissingNote++; gateIssues.push({ combo: row.cmb, id: card.id, fail: v.fail, note: null }); }
      else {
        const m = /(\d+) 项不达标/.exec(card.gate);
        if (!m || +m[1] !== v.fail) { noteMismatch++; gateIssues.push({ combo: row.cmb, id: card.id, fail: v.fail, note: card.gate }); }
      }
    } else if (card.gate) {
      noteMismatch++;
      gateIssues.push({ combo: row.cmb, id: card.id, fail: 0, note: card.gate, why: "FAIL=0 却有闸门警告" });
    }
  }
}

writeFileSync(OUT + "/b5-wizard.json", JSON.stringify({ comboCount: rows.length, totalClaims, falseClaims, falseDetail: falseDetail.slice(0, 60), recWithFail, recWithFailMissingNote, noteMismatch, gateIssues: gateIssues.slice(0, 40), sample: rows.slice(0, 3) }, null, 1), "utf8");

console.log("组合数:", rows.length);
console.log("「对上你要的」断言总数:", totalClaims, " 事实错误:", falseClaims, "=", (falseClaims / totalClaims * 100).toFixed(1) + "%");
console.log("推荐卡里 FAIL>0 的次数:", recWithFail, " 缺闸门标注:", recWithFailMissingNote, " 标注数不符/多余:", noteMismatch);
console.log("\n=== 前 10 条假断言 ===");
for (const d of falseDetail.slice(0, 10)) console.log(`  ${JSON.stringify(d.combo)} ${d.id} ${d.dim || ""} slot=${d.slot} want=${d.userAns} :: ${(d.part || d.why).slice(0, 100)}`);
console.log("\n=== 闸门问题前 10 条 ===");
for (const g of gateIssues.slice(0, 10)) console.log("  " + JSON.stringify(g));

await p.close();
await b.close();
