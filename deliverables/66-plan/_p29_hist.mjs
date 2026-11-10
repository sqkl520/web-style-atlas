import { execFileSync } from "node:child_process";
const ROOT = "D:/Web/style";
const commits = execFileSync("D:\\Git\\cmd\\git.exe", ["log", "--format=%h", "-12"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n");
for (const c of commits) {
  let t = "";
  try {
    t = execFileSync("D:\\Git\\cmd\\git.exe", ["show", `${c}:prototypes/_selection/prompt-copy.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 25 });
  } catch { console.log(c, "(no prompt-copy.js)"); continue; }
  const lines = t.split("\n");
  const code = lines.filter((l) => /^\s*"/.test(l));
  const subj = execFileSync("D:\\Git\\cmd\\git.exe", ["log", "-1", "--format=%s", c], { cwd: ROOT, encoding: "utf8" }).trim();
  console.log(
    c,
    "| 凑到 代码行=" + code.filter((l) => l.includes("凑到")).length,
    "全部=" + (t.match(/凑到/g) || []).length,
    "| 我实际有=" + (t.match(/我实际有/g) || []).length,
    "| 按你真实=" + (t.match(/按你真实/g) || []).length,
    "|", subj.slice(0, 40)
  );
}
