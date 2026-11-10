// 路线 B-3：30 个方案逐个打开详情，验「复制 AI 提示词」按钮 + 提示语是否都出现、是否矛盾
import { writeFileSync } from "node:fs";
import { Browser } from "../../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs";

const URL = "http://127.0.0.1:9583/prototypes/_selection/index.html";
const OUT = "D:/Web/style/deliverables/62-verify/r2";
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(URL, { settleMs: 1600 });

// 找行元素与打开方式
const rowInfo = await p.eval(() => {
  const rows = [...document.querySelectorAll("#ledger > li")];
  if (!rows.length) return { ok: false };
  const r = rows[0];
  return {
    ok: true,
    tag: r.tagName,
    cls: r.className,
    attrs: [...r.attributes].map((a) => a.name + "=" + a.value).slice(0, 12),
    firstBtn: r.querySelector("button") ? r.querySelector("button").className : null,
    html0: r.outerHTML.slice(0, 400),
  };
});
console.log("row:", JSON.stringify(rowInfo, null, 1));

const out = [];
for (let i = 0; i < 30; i++) {
  // 通过 hash 深链打开：app.js 支持 #S07，但详情是点击行展开，这里直接点第一格
  const opened = await p.eval((idx) => {
    const rows = [...document.querySelectorAll("#ledger > li")];
    if (!rows[idx]) return { ok: false, why: "no row " + idx };
    const r = rows[idx];
    const target = r.querySelector("button, [role=button], .row-main, h3, a") || r;
    target.click();
    return { ok: true, id: r.dataset.id || null };
  }, i);
  await new Promise((r) => setTimeout(r, 260));

  const d = await p.eval(() => {
    const det = document.getElementById("detail");
    const host = document.getElementById("d-body");
    const btn = host.querySelector(".prompt-copy");
    const hint = host.querySelector(".prompt-cta span");
    const text = host.textContent;
    // 「不适合」在哪一段
    const segs = [...host.querySelectorAll("*")].filter((el) => /不适合/.test(el.textContent) && el.children.length === 0);
    return {
      detailHidden: det.hidden,
      no: (document.getElementById("d-no") || {}).textContent,
      cn: (document.getElementById("d-cn") || {}).textContent,
      hasCopyBtn: !!btn,
      copyText: btn ? btn.textContent.trim() : null,
      hasHint: !!hint,
      hint: hint ? hint.textContent.trim() : null,
      // 提示语位置（是否是 #d-body 的第一个元素之前插入）
      ctaIsFirst: host.firstElementChild && host.firstElementChild.classList.contains("prompt-cta"),
      ctaIndex: [...host.children].indexOf(host.querySelector(".prompt-cta")),
      hasBuheshi: /不适合/.test(text),
      // 找包含「不适合」的最小元素及其前面最近的标题
      buheSnippet: segs.length ? segs[0].textContent.trim().slice(0, 160) : null,
      // 该段属于哪个字段块
      fieldTitles: [...host.querySelectorAll("dt,h3,h4,strong")].map((e) => e.textContent.trim()).slice(0, 30),
      scrollHeight: host.scrollHeight,
      clientHeight: host.clientHeight,
    };
  }, null);
  out.push({ idx: i, ...opened, ...d });
  // 收起
  await p.eval(() => document.getElementById("d-close").click());
  await new Promise((r) => setTimeout(r, 150));
}

writeFileSync(OUT + "/b3-details.json", JSON.stringify(out, null, 1), "utf8");

const bad = out.filter((x) => !x.hasCopyBtn || !x.hasHint);
console.log("\n总打开:", out.length);
console.log("缺按钮或缺提示语:", bad.length, bad.map((x) => x.no + "/" + x.cn).join(" | "));
console.log("\n=== 每案提示语 ===");
for (const x of out) console.log(`${(x.no || "").padEnd(4)} ${String(x.cn).slice(0, 12).padEnd(14)} btn=${x.hasCopyBtn ? "Y" : "N"} first=${x.ctaIsFirst ? "Y" : "N"} hint=${x.hint}`);
console.log("\n=== 提示语里出现「不适合」指向 / 都行 ===");
for (const x of out) {
  if (!x.hint) continue;
  const saysOk = /粘给.*都行/.test(x.hint);
  const saysWarn = /⚠/.test(x.hint);
  if (saysOk) console.log(`  ${x.no} 说"都行"`);
}
await p.close();
await b.close();
