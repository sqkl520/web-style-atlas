/* 66-audit 只读探针 v2：机制句 vs 线宽白名单的**精确**比对。
 *
 * v1 用 14 字窗口 + 宽泛关键词，把位置/尺寸类的 px（宽 88px、行高 56px、半径 48px、
 * 倾角对应的 96px）都当成线宽抓了进来，报出 17/30「冲突」——那是假阳性。
 *
 * v2 判据收紧为：只认 px 值**紧邻**（前 6 字内）出现下列线宽名词之一的：
 *   「线」「描边」「stroke」「边框」「栏线」「压叠」「齿孔」「孔距」「环线」「折痕」「缝」
 * 并排除位置词：宽/高/长/径/距/沉/降/移/偏/缩/起/落/间。
 * 仍然逐条打印上下文，任何一条都能人工复核。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(join(HERE, "prompts")).filter((f) => f.endsWith(".txt")).sort();

const LINE_NOUN = /(线|描边|stroke|边框|压叠|齿孔|孔距|环线|折痕|斜痕|缝宽|条宽|带宽)/;
const SIZE_WORD = /(宽|高|长|径|距|沉|降|移|偏|缩|起|落|间|格|半径|视口|画布|栏)/;

const rows = [];
for (const f of files) {
  const id = f.slice(0, 3);
  const text = readFileSync(join(HERE, "prompts", f), "utf8");
  const mech = (text.match(/这个风格的签名动作：([^\n]*)/) || [])[1] || "";
  const lw = (text.match(/5\. 线宽只用这几级：([^，]*)，/) || [])[1] || "";
  const allowed = [...new Set((lw.match(/\d+(?:\.\d+)?px/g) || []).map((s) => parseFloat(s)))].sort((a, b) => a - b);

  const cand = [];
  for (const m of mech.matchAll(/(\d+(?:\.\d+)?)\s*px/g)) {
    const v = parseFloat(m[1]);
    const win = mech.slice(Math.max(0, m.index - 8), m.index);
    const isLine = LINE_NOUN.test(win) && !SIZE_WORD.test(win.slice(-4));
    cand.push({ v, win: win.trim(), isLine, raw: m[0] });
  }
  const lineVals = [...new Set(cand.filter((c) => c.isLine).map((c) => c.v))];
  const bad = lineVals.filter((v) => !allowed.includes(v));
  rows.push({ id, allowed, lineVals, bad, cand, lw, mech });
}

let n = 0;
for (const r of rows) {
  if (!r.bad.length) continue;
  n++;
  console.log(`\n${r.id}  ⚠ 机制句线宽 ${r.bad.map((v) => v + "px").join("/")} 不在白名单 [${r.allowed.join("、")}px]`);
  console.log("   机制句：" + r.mech.slice(0, 150));
  for (const c of r.cand.filter((x) => x.isLine)) {
    console.log(`     · ${c.raw}  ← 前文「…${c.win}」 ${r.allowed.includes(c.v) ? "OK" : "✗ 冲突"}`);
  }
}
console.log(`\n>>> 精确判定：${n}/30 案的机制句要求一个不在第 5 条白名单里的线宽`);
console.log(">>> 无冲突的案：" + rows.filter((r) => !r.bad.length).map((r) => r.id).join(" "));

/* 「不要自创第三级」的字面矛盾 */
console.log("\n>>> 第 5 条句尾恒为「不要自创第三级」，但级数分布：");
const hist = {};
for (const r of rows) hist[r.allowed.length] = (hist[r.allowed.length] || 0) + 1;
for (const k of Object.keys(hist).sort((a, b) => a - b)) {
  console.log(`  ${k} 级 × ${hist[k]} 案   ` + (k === 2 ? "" : "← 句子里的「第三级」与实有级数不符"));
}
