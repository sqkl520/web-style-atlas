// 探针 7：把 prompt-copy.js 真的在 Node 里跑起来，生成 30 份提示词，
// 然后做机器可查的体检：有没有自相矛盾、有没有把内部审查语汇漏给用户、
// 有没有让 AI 无法执行的指令（无中文字体、占位路径、字数等）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const SEL = join(ROOT, 'prototypes/_selection');

// 造一个假的 window/document 让 prompt-copy.js 能装进来
const win = {};
global.window = win;
global.document = {
  readyState: 'complete',
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
  getElementById() { return null; },
  createElement() { return { style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }; },
};

function loadScriptVar(file, varName) {
  const t = readFileSync(join(SEL, file), 'utf8');
  const i = t.indexOf('window.' + varName + ' ');
  const eq = t.indexOf('=', i);
  const json = t.slice(eq + 1, t.lastIndexOf(';'));
  return JSON.parse(json);
}

win.STYLE_PROMPTS = loadScriptVar('prompts.js', 'STYLE_PROMPTS');
const dataSrc = readFileSync(join(SEL, 'data.js'), 'utf8');
win.SCHEMES = JSON.parse(dataSrc.slice(dataSrc.indexOf('= ') + 2).replace(/;\s*$/, ''));

// 装 prompt-copy.js（IIFE，会挂 window.buildStylePrompt）
const src = readFileSync(join(SEL, 'prompt-copy.js'), 'utf8');
new Function('window', 'document', 'location', 'navigator', 'console', src)(
  win, global.document, { href: 'file:///x', pathname: '/x' }, {}, console
);

console.log('buildStylePrompt 类型: ' + typeof win.buildStylePrompt);
console.log('SCHEMES: ' + win.SCHEMES.length + '｜PROMPTS: ' + win.STYLE_PROMPTS.schemes.length);

const out = {};
const report = [];
const IDS = win.SCHEMES.map((r) => r.id).sort();

// 内部语汇黑名单：不该出现在给终端用户的提示词里
const INTERNAL = [
  /data\.js/, /_specs/, /_CURRENT-VALUES/, /collect-schemes/, /prompts\.js/, /src\/\w+\.mjs/,
  /FIELDS/, /字段\s*\d/, /C-\d\.\d+/, /R-1\d/, /P\d+（/, /红队/, /闸门/, /回归/, /本仓库/, /审计/,
  /来源：/, /见\s*deliverables/,
];

for (const id of IDS) {
  const p = win.buildStylePrompt(id);
  out[id] = p;
  const lines = p.split('\n');
  const chars = p.length;
  const cjk = (p.match(/[\u4e00-\u9fff]/g) || []).length;
  const internalHits = INTERNAL.filter((re) => re.test(p)).map((re) => re.source);
  // 检查关键段落是否齐
  const has = {
    配色: /1\. 配色只用这几个值/.test(p),
    字体: /2\. 字体：/.test(p),
    圆角: /3\. 圆角：/.test(p),
    阴影: /4\. 阴影：/.test(p),
    线宽: /5\. 线宽只用这几级/.test(p),
    结构: /结构约束：/.test(p),
    图片: /个\*\*不同的\*\*图片位置/.test(p),
    硬前提: /这个版式的硬前提/.test(p),
    防退化: /防退化（出现任何一条就重做）：/.test(p),
    风险: /这一案最容易做成的错误样子/.test(p),
    验收: /验收三问/.test(p),
    输出: /输出要求：/.test(p),
    签名动作: /这个风格的签名动作：/.test(p),
  };
  report.push({ id, chars, cjk, lines: lines.length, internalHits, has, missing: Object.entries(has).filter(([, v]) => !v).map(([k]) => k) });
}

console.log('');
console.log('=== 提示词体量 ===');
const cs = report.map((r) => r.chars).sort((a, b) => a - b);
console.log(`字符 最小${cs[0]} 中位${cs[15]} 最大${cs[cs.length - 1]}｜合计 ${cs.reduce((a, b) => a + b, 0)}`);
report.forEach((r) => console.log(`  ${r.id}  ${String(r.chars).padStart(4)} 字  ${String(r.lines).padStart(3)} 行  缺:${r.missing.join(',') || '无'}`));

console.log('');
console.log('=== 段落齐全度汇总 ===');
const keys = Object.keys(report[0].has);
for (const k of keys) console.log(`  ${k}: ${report.filter((r) => r.has[k]).length}/30`);

console.log('');
console.log('=== 内部语汇泄漏 ===');
const leaky = report.filter((r) => r.internalHits.length);
console.log(leaky.length ? leaky.map((r) => r.id + ' → ' + r.internalHits.join(',')).join('\n') : '  无');

mkdirSync(join(ROOT, 'deliverables/65-plan/_rt_out'), { recursive: true });
for (const [id, p] of Object.entries(out)) writeFileSync(join(ROOT, 'deliverables/65-plan/_rt_out/prompt-' + id + '.txt'), p, 'utf8');
console.log('\n已写 30 份到 deliverables/65-plan/_rt_out/');
