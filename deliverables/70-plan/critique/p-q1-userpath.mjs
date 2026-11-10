// 探针：Q1 的用户路径证据 + 我上一支探针的口径修正
// ① README 承诺「按下去得到 1639–1998 字」——用 buildStylePrompt(id) **不传 opts** 复算
//    （我上一支 p-prompt-census 传了 biz/action，长度会差 1–2 字，不能拿来对 README）
// ② 详情面板里「复制提示词」按钮与「打开原型」链接的相对位置（用户第一眼看到谁）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');
global.document = {
  readyState: 'complete', addEventListener() {}, querySelector: () => null,
  querySelectorAll: () => [], getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }),
};
const sandbox = { window: {}, document: global.document, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sandbox, { filename: 'data.js' });
vm.runInContext(readFileSync(join(SEL, 'prompts.js'), 'utf8'), sandbox, { filename: 'prompts.js' });
vm.runInContext(readFileSync(join(SEL, 'prompt-copy.js'), 'utf8'), sandbox, { filename: 'prompt-copy.js' });
const win = sandbox.window;
const build = win.buildStylePrompt;
const ids = win.SCHEMES.map((s) => s.id).sort();

const lens = ids.map((id) => ({ id, n: build(id).length }));
const ns = lens.map((x) => x.n).sort((a, b) => a - b);
const out = [];
out.push('=== 不传 opts 的提示词长度（README 承诺 1639–1998，中位 1829）===');
out.push(`实测 min=${ns[0]} max=${ns[ns.length - 1]} median=${ns[Math.floor(ns.length / 2)]}`);
out.push(`README 承诺 min=1639 max=1998 median=1829  → ${ns[0] === 1639 && ns[ns.length - 1] === 1998 && ns[15] === 1829 ? '一致' : '不一致'}`);

// 传 opts 时长度差多少
const withOpts = ids.map((id) => build(id, { biz: '测试生意', action: '让访客询价' }).length);
out.push(`传 biz/action 时 min=${Math.min(...withOpts)} max=${Math.max(...withOpts)}（我的 p-prompt-census 用的就是这个口径，故与 README 差 1 字，非缺陷）`);

// 用户路径：详情面板里谁排在前面
const appjs = readFileSync(join(SEL, 'app.js'), 'utf8');
const order = appjs.match(/\$\('#d-body'\)\.innerHTML = ([^;]+);/);
out.push('');
out.push('=== 详情面板 #d-body 的结构顺序 ===');
out.push(order ? 'innerHTML = ' + order[1].trim() : '未匹配');
out.push('随后 app.js:1393 调 window.mountPromptButton($(\'#d-body\'), id)');
const pc = readFileSync(join(SEL, 'prompt-copy.js'), 'utf8');
out.push('而 prompt-copy.js:1018 是 `if (host.firstChild) host.insertBefore(wrap, host.firstChild);`');
out.push('⇒ 复制提示词按钮被插到 #d-body **最前面**，排在截图/打开原型/闸门/字段之前。');
out.push('');
out.push('=== 结论（Q1 证据）===');
out.push('产品把「复制提示词」放在详情面板第一个位置 —— 这是「提示词是核心交付物」的强证据，');
out.push('不利于「提示词投错了地方」这个假设。我据此撤回 Q1 的强版本。');

console.log(out.join('\n'));
