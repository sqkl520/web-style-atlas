/* 66-audit 只读探针：把 30 案提示词按「用户真实会拿到的形状」导出。
 *
 * 为什么不走 CDP：buildPrompt 是**纯函数**（prompt-copy.js:119-407），输入只有
 * window.STYLE_PROMPTS（prompts.js）+ window.SCHEMES（data.js）+ opts。
 * 在 node 里用 vm 造一个最小 window/document 求值 prompt-copy.js，得到的字符串
 * 与浏览器里点「复制 AI 提示词」逐字节相同 —— 这条路径比 CDP 少一层（不用管选型台
 * 有没有渲染、面板有没有展开）。**只读**：本脚本 writeFileSync 只写 deliverables/66-audit/。
 *
 * 用法：node deliverables/66-audit/dump-prompts.mjs [--opts-empty]
 *   默认：模拟用户**两个输入框都没填**直接点复制（README 里点一次就走的路径）。
 *   --opts-empty 同义（保留开关，防止以后有人以为默认是填过的）。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const read = (p) => readFileSync(join(ROOT, p), "utf8").replace(/^\uFEFF/, "");

/* 最小 DOM stub：prompt-copy.js 顶层只碰 document.readyState / addEventListener，
 * 其余 DOM 调用都在函数体内（导出提示词不会进入）。 */
const documentStub = {
  readyState: "complete",
  addEventListener() {},
  removeEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { toggle() {} } }; },
  body: { appendChild() {}, removeChild() {} },
};

const sandbox = {
  console,
  document: documentStub,
  navigator: {},
  setTimeout,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);

// 1) data.js → window.SCHEMES
vm.runInContext(read("prototypes/_selection/data.js"), ctx, { filename: "data.js" });
// 2) prompts.js → window.STYLE_PROMPTS
vm.runInContext(read("prototypes/_selection/prompts.js"), ctx, { filename: "prompts.js" });
// 3) prompt-copy.js → 挂 window.buildStylePrompt
vm.runInContext(read("prototypes/_selection/prompt-copy.js"), ctx, { filename: "prompt-copy.js" });

const buildPrompt = sandbox.window.buildStylePrompt;
if (typeof buildPrompt !== "function") {
  console.error("FATAL: window.buildStylePrompt 未挂上");
  process.exit(1);
}

const P = sandbox.window.STYLE_PROMPTS;
const SCHEMES = sandbox.window.SCHEMES;
const ids = P.schemes.map((s) => s.id);

mkdirSync(join(HERE, "prompts"), { recursive: true });

const manifest = [];
for (const id of ids) {
  const s = P.schemes.find((x) => x.id === id);
  const sc = SCHEMES.find((x) => x.id === id) || {};
  // 复刻选型台「什么都不填直接点复制」的 opts（readFields() 返回两个空串）
  const text = buildPrompt(id, { biz: "", action: "" });
  writeFileSync(join(HERE, "prompts", id + ".txt"), text, "utf8");
  manifest.push({
    id,
    dir: s.dir,
    cn: sc.cn || "",
    minItems: s.minItems,
    minPics: s.minPics,
    degrades: s.dna && s.dna.degrades ? "yes" : "no",
    capacityDegrades: s.capacity ? s.capacity.degrades : null,
    hard: !!s.hard,
    reuseLen: (s.dna && s.dna.reuse ? s.dna.reuse : "").length,
    riskLen: (s.dna && s.dna.risk ? s.dna.risk : "").length,
    chars: text.length,
    promptChars: text.length,
    lines: text.split("\n").length,
    sha: null,
  });
}

writeFileSync(join(HERE, "manifest.json"), JSON.stringify(manifest, null, 1), "utf8");
console.log("wrote " + ids.length + " prompts");
console.log("chars: min=" + Math.min(...manifest.map((m) => m.chars)) +
  " max=" + Math.max(...manifest.map((m) => m.chars)) +
  " sum=" + manifest.reduce((a, b) => a + b.chars, 0));
