// 路线 A 深挖：per-chain CJK 反噬 + S25 mono 缺失 + S14 palette 无角色名
import fs from "node:fs";
const R = "D:/Web/style/deliverables/62-verify/r2/prompts2";
const ids = fs.readdirSync(R).filter((f) => /^S\d\d\.txt$/.test(f)).sort().map((f) => f.replace(".txt", ""));
const CJK = /(Noto (Serif|Sans) (SC|TC|JP)|LXGW|WenKai|WenJin|文津|Zhuque|Fangsong|思源|宋体|黑体|Songti|Glow Sans|KaiTi|STKaiti|SimSun|YaHei|Kaiti)/i;

console.log("=== per-chain 判定：整条链里有没有中文族 ===");
const badTitle = [], badBody = [];
for (const id of ids) {
  const txt = fs.readFileSync(R + "/" + id + ".txt", "utf8");
  const fl = txt.split("\n").find((l) => l.startsWith("2. 字体：")) || "";
  const t = (fl.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1];
  const b = (fl.match(/正文同理，按序取：([^。]+)/) || [])[1];
  const ts = t ? t.trim() : (fl.match(/标题用 ([^。]+)。/) || [])[1];
  const bs = b ? b.trim() : (fl.match(/正文用 ([^。]+)。/) || [])[1];
  const tOK = CJK.test(ts || ""), bOK = CJK.test(bs || "");
  const strict = /也不要跳过上面这条链直接回退成系统默认无衬线/.test(txt);
  const lax = /中文没有指定字族时，回退到一款中文衬线/.test(txt);
  if (!tOK) badTitle.push({ id, chain: ts, strict, lax });
  if (!bOK) badBody.push({ id, chain: bs, strict, lax });
}
console.log("标题链无中文族:");
for (const x of badTitle) console.log(`  ${x.id} [${x.chain}] strict=${x.strict} → 中文标题必然回退，却写着禁令`);
console.log("正文链无中文族:");
for (const x of badBody) console.log(`  ${x.id} [${x.chain}] strict=${x.strict} → 中文正文必然回退，却写着禁令`);

console.log("\n=== 保险句方向是否与事实一致（有中文族却给宽松句 / 无中文族却给严格句） ===");
for (const id of ids) {
  const txt = fs.readFileSync(R + "/" + id + ".txt", "utf8");
  const fl = txt.split("\n").find((l) => l.startsWith("2. 字体：")) || "";
  const t = (fl.match(/标题按这个顺序取第一个可用的：([^（]+)/) || [])[1] || (fl.match(/标题用 ([^。]+)。/) || [])[1] || "";
  const b = (fl.match(/正文同理，按序取：([^。]+)/) || [])[1] || (fl.match(/正文用 ([^。]+)。/) || [])[1] || "";
  const bothOK = CJK.test(t) && CJK.test(b);
  const strict = /也不要跳过上面这条链直接回退成系统默认无衬线/.test(txt);
  if (!bothOK && strict) console.log(`  ⚠ ${id}: 链条缺中文族，但用了严格禁令（AI 只能违反）标题=[${t}] 正文=[${b}]`);
}
