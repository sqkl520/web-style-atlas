// V7：并发覆盖扫描 + 声称存在性核查
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SEL = join(ROOT, 'prototypes', '_selection');

const css = readFileSync(join(SEL, 'style.css'), 'utf8');
const app = readFileSync(join(SEL, 'app.js'), 'utf8');
const pc = readFileSync(join(SEL, 'prompt-copy.js'), 'utf8');
const cssLines = css.split('\n');

const findRule = (sel) => {
  const out = [];
  cssLines.forEach((l, i) => { if (l.includes(sel) && l.includes('{')) out.push({ line: i + 1, text: l.trim().slice(0, 90) }); });
  return out;
};

console.log('=== V7 并发覆盖：同一选择器是否被重复定义 ===');
for (const sel of ['.prompt-cta', '.prompt-hint', '.prompt-fill', '.row-family', '.fold', '.field-fold', '.swatches']) {
  const r = findRule(sel);
  console.log(`  ${sel.padEnd(16)} 定义 ${r.length} 处  ${r.map((x) => 'L' + x.line).join(' ')}`);
  r.forEach((x) => console.log(`      L${x.line}: ${x.text}`));
}

console.log('\n=== 括号/花括号配平（CSS 被并发写坏的常见症状）===');
const open = (css.match(/\{/g) || []).length, close = (css.match(/\}/g) || []).length;
console.log(`  style.css { = ${open}, } = ${close}  ${open === close ? '配平' : '★不配平'}`);
for (const [n, s] of [['app.js', app], ['prompt-copy.js', pc]]) {
  const o = (s.match(/\{/g) || []).length, c = (s.match(/\}/g) || []).length;
  console.log(`  ${n} { = ${o}, } = ${c}  ${o === c ? '配平' : '★不配平'}`);
}
// 重复的 CSS 声明块（同一 rule 完整重复）
const blocks = css.match(/^[^{}\n]+\{[^{}]*\}/gm) || [];
const seen = new Map();
blocks.forEach((b) => { const k = b.replace(/\s+/g, ' ').trim(); seen.set(k, (seen.get(k) || 0) + 1); });
const dup = [...seen.entries()].filter(([, n]) => n > 1);
console.log(`  完整重复的 CSS 规则块: ${dup.length}`);
dup.slice(0, 5).forEach(([k, n]) => console.log(`     ×${n} ${k.slice(0, 80)}`));

console.log('\n=== 声称存在性核查 ===');
const checks = [
  ['执行 C: auditFold 进详情面板', /auditFold\(r\)/.test(app)],
  ['执行 C: S13 切点白名单存在', /AUDIT_CUT_AT\s*=\s*\{\s*S13:/.test(app)],
  ['执行 C: 配色「主色」标签', /主色/.test(app)],
  ['执行 A: 空槽 SLOT 全角下划线', /var SLOT = "＿＿＿＿"/.test(pc)],
  ['执行 A: 不再有「一家小店」兜底', !/一家小店/.test(pc.replace(/\/\*[\s\S]*?\*\//g, ''))],
  ['执行 A: 不再有「有一些内容和图片」兜底', !/有一些内容和图片/.test(pc.replace(/\/\*[\s\S]*?\*\//g, ''))],
  ['执行 A: FRAME_EMPTY 存在', /FRAME_EMPTY/.test(pc)],
  ['执行 C: row-family 改 CSS 折两行', /\.row-family[\s\S]{0,300}-webkit-line-clamp:\s*2/.test(css)],
  ['执行 B: 字段分组折叠', /field-fold|group-fold|fold\(/.test(app)],
  ['执行 B: 压前导', /lead|compact|tight/i.test(css)],
];
for (const [k, ok] of checks) console.log(`  ${ok ? '✓' : '★✗'} ${k}`);

// 注释里是否还残留「一家小店」的旧文案（说明用了但没删）
const liveCode = pc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
console.log(`\n  非注释代码里出现「一家小店」次数: ${(liveCode.match(/一家小店/g) || []).length}`);

console.log('\n=== data.js layout 复算 ===');
const sb = { window: {} };
vm.createContext(sb);
vm.runInContext(readFileSync(join(SEL, 'data.js'), 'utf8'), sb, { filename: 'data.js' });
const S = sb.window.SCHEMES;
const lens = S.map((s) => (s.layout || '').length);
console.log(`  layout 有值的案: ${S.filter((s) => (s.layout || '').trim()).length}/30`);
console.log(`  S12=${S.find((s) => s.id === 'S12').layout.length} S15=${S.find((s) => s.id === 'S15').layout.length} S19=${S.find((s) => s.id === 'S19').layout.length}`);
console.log(`  layout 长度 min ${Math.min(...lens)} / median ${[...lens].sort((a, b) => a - b)[15]} / max ${Math.max(...lens)}`);
const audits = S.map((s) => (s.audit || '').length);
console.log(`  audit 有值的案: ${S.filter((s) => (s.audit || '').trim()).length}/30，总字 ${audits.reduce((a, b) => a + b, 0)}，min ${Math.min(...audits)} / median ${[...audits].sort((a, b) => a - b)[15]} / max ${Math.max(...audits)}`);
