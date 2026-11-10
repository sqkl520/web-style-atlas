/* 证明「我对 prompt-copy.js 的改动不碰提示词文本」——不是靠读注释，是靠逐字节比对。
 *
 * 为什么需要这一条：验收 4 要求 check-docs 0 FAIL / 0 WARN，而此刻它有一条
 * nums/prompt-len 的 WARN（文档写 1632–1920 / 中位 1822，实测 1652–1946 / 中位 1842）。
 * 那个漂移来自**另一个 Agent 正在改的提示词正文**（数量三条重编号），不是我。
 * 「不是我」这句话必须能被复算，否则下一个人只能信我的嘴。
 *
 * 做法：把当前文件里的那一行 cssText 字符串换回改前的值（我的改动**只**是这一行
 * 加一段注释，两者都不参与 buildPrompt），再跑 30 案提示词，逐字节比。
 * 若 30/30 相同 ⇒ 我的改动对提示词长度贡献 0 字节。
 *
 * 跑：node deliverables/66-exec/_prompt-identity.mjs
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SEL = 'D:/Web/style/prototypes/_selection/';
const NOW = readFileSync(SEL + 'prompt-copy.js', 'utf8');
/* 改前那一行的原文（含 12px / .72 / none 三个样式）。只替换字符串内容，
 * 不动我的注释 —— 注释在函数体外，vm 里根本不会被执行到这段。 */
const BEFORE_CSS = '"margin-top:8px;font-size:12px;opacity:.72;display:none"';
const AFTER_CSS = '"margin-top:8px"';
if (!NOW.includes(AFTER_CSS)) {
  console.log('  ✗ 找不到改后的 cssText，脚本要跟着代码更新：' + AFTER_CSS);
  process.exit(2);
}
const OLD = NOW.replace(AFTER_CSS, BEFORE_CSS);

function run(src, label) {
  const win = {};
  const doc = {
    readyState: 'complete',
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
  };
  const sandbox = { window: win, document: doc };
  vm.createContext(sandbox);
  sandbox.document = doc;
  for (const f of ['data.js', 'prompts.js']) vm.runInContext(readFileSync(SEL + f, 'utf8'), sandbox, { filename: f });
  vm.runInContext(src, sandbox, { filename: label });
  const build = win.buildStylePrompt;
  if (typeof build !== 'function') throw new Error('buildStylePrompt 没装载上');
  return win.STYLE_PROMPTS.schemes.map((s) => ({ id: s.id, text: build(s.id) }));
}

const a = run(OLD, 'prompt-copy.OLD.js');
const b = run(NOW, 'prompt-copy.NOW.js');
const diff = a.filter((x, i) => x.text !== b[i].text).map((x) => x.id);
const lens = b.map((x) => x.text.length).sort((x, y) => x - y);

console.log('== 我的改动对提示词的贡献 ==');
if (diff.length) {
  console.log('  ✗ ' + diff.length + ' 案文本不同：' + diff.join(' '));
  process.exit(1);
}
console.log('  ✓ 30/30 案提示词逐字节相同（改前 cssText ↔ 改后 cssText）');
console.log('    实测长度 min ' + lens[0] + ' / median ' + ((lens[14] + lens[15]) / 2) + ' / max ' + lens[29]);
console.log('    ↑ 这组数与 check-docs 的 nums/prompt-len WARN 是同一组口径，说明漂移来自本文件之外');
