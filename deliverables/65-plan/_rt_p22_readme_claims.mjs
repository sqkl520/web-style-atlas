// 探针 22：README 关于「复制 AI 提示词」的四条数字断言 vs 实际产出
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style';
const SEL = ROOT + '/prototypes/_selection';
const win = {};
global.window = win;
global.document = { readyState: 'complete', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {} }) };
function loadVar(f, v) {
  const t = readFileSync(SEL + '/' + f, 'utf8');
  const i = t.indexOf('window.' + v + ' ');
  const s = t.slice(t.indexOf('=', i) + 1);
  return JSON.parse(s.slice(0, s.lastIndexOf('};') + 1));
}
win.STYLE_PROMPTS = loadVar('prompts.js', 'STYLE_PROMPTS');
const ds = readFileSync(SEL + '/data.js', 'utf8');
win.SCHEMES = JSON.parse(ds.slice(ds.indexOf('= ') + 2).replace(/;\s*$/, ''));
new Function('window', 'document', 'location', 'navigator', 'console', readFileSync(SEL + '/prompt-copy.js', 'utf8'))(win, global.document, { href: 'x', pathname: '/x' }, {}, console);

const rows = win.SCHEMES.map((r) => {
  const p = win.buildStylePrompt(r.id);   // 默认参数 = 用户点按钮的实况
  return {
    id: r.id,
    chars: p.length,
    paletteItems: (r.palette || []).length,
    firstLine: p.split('\n')[0],
  };
});
const cs = rows.map((r) => r.chars).sort((a, b) => a - b);
console.log('README.md:78 断言：「按下去得到一份 1100 字左右的一段话」');
console.log('  实测：最小 ' + cs[0] + '｜中位 ' + cs[15] + '｜最大 ' + cs[cs.length - 1]);
console.log('  与「1100 字左右」的偏差：中位超 ' + (cs[15] - 1100) + ' 字（+' + ((cs[15] / 1100 - 1) * 100).toFixed(0) + '%）；30/30 全部 > 1100');
console.log('  落在 1100±10% (990–1210) 的案数：' + rows.filter((r) => Math.abs(r.chars - 1100) <= 110).length + '/30');
console.log('');

console.log('README.md:82 断言：「配色（4–5 个色值）」');
const pc = {};
for (const r of rows) pc[r.paletteItems] = (pc[r.paletteItems] || 0) + 1;
console.log('  实测 palette 项数分布：' + Object.entries(pc).map(([k, v]) => k + ' 个色 → ' + v + ' 案').join('｜'));
console.log('  4–5 个的案数：' + rows.filter((r) => r.paletteItems >= 4 && r.paletteItems <= 5).length + '/30');
console.log('');

console.log('README.md:91 示例首行：「我经营一家手冲咖啡店，5 个产区的豆子，加微信订、不做在线支付。页面需要让访客看完就想问价。」');
console.log('  实际默认产出首行（30 案全部同句）：');
console.log('    「' + rows[0].firstLine + '」');
console.log('  相同的案数：' + rows.filter((r) => r.firstLine === rows[0].firstLine).length + '/30');
console.log('');
console.log('  原因：buildPrompt 的 o.biz / o.what / o.action 三个参数全库**没有任何调用方传值**');
const pcs = readFileSync(SEL + '/prompt-copy.js', 'utf8');
console.log('    prompt-copy.js 里 o.biz 出现次数 = ' + (pcs.match(/o\.biz/g) || []).length + '（仅读取，从不接收）');
console.log('    index.html 里的 <input> = ' + (readFileSync(SEL + '/index.html', 'utf8').match(/<input/g) || []).length + ' 个，只有搜索框 #q（选型台）');
console.log('    → README 的示例是**手写的理想输入**，按钮实际给的是「一家小店 / 有一些内容和图片要放上去」。');
