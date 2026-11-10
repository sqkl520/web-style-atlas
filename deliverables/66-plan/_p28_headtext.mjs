import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const ROOT = "D:/Web/style";
const t = execFileSync("D:\\Git\\cmd\\git.exe", ["show", "HEAD:prototypes/_selection/prompt-copy.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 25 });
console.log("字符数 =", t.length);
console.log("「凑到」出现 =", (t.match(/凑到/g) || []).length);
console.log("「先把数量凑到」出现 =", (t.match(/先把数量凑到/g) || []).length);
console.log("「我实际有」出现 =", (t.match(/我实际有/g) || []).length);
const lines = t.split("\n");
lines.forEach((l, i) => { if (l.includes("凑到")) console.log("  line", i + 1, "|", l.trim().slice(0, 140)); });
writeFileSync(ROOT + "/deliverables/66-plan/_out/head-pc.txt", t, "utf8");
// 只看代码行（不是注释块）
const codeLines = lines.filter((l) => /^\s*"/.test(l));
console.log("字符串字面量行数 =", codeLines.length);
console.log("字符串字面量里「凑到」=", codeLines.filter((l) => l.includes("凑到")).length);
