import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const ch = (s) => String(s || '').replace(/\s/g, '').length;

/* 手工改写（方案乙/丁 的"契约三条"形态）：每案只留 3 条，每条一个可核实的否证句。
 * 写法规约：
 *   1. 不出现 C-/R-/P 编号，不出现"文件 01"
 *   2. 不出现"跳脱之处"
 *   3. 每条必须能被读者当场反驳（打开原型数一数就知真假）
 *   4. 保留具体值（hex / px / 个数）
 */
const HAND = {
  S15: [
    '全站只有一个页面底色 #E7EBE9，没有任何一段换底色——分区靠三层硫酸纸交叠出的明暗。',
    '没有一个圆角、没有一处投影：深度只由三层 0 / 3 / 7px 的错位产生。',
    '平面图 14 个热区面积按舱室真实面积等比，大小不等、间距不等。',
  ],
  S18: [
    '没有 hero：正文是一条连续走纸，版心偏左 12%，右侧专留空挂纸牌。',
    '全部元素直角，立体感只来自边孔阴影与折页压痕，不用任何投影。',
    '只有一种暗底 #0A0D0A；分区靠折页线与边孔，不换底色。',
  ],
  S22: [
    '底色自始至终没变过，分区靠折痕、页码与三档透光差，没有一段换底色。',
    '没有吸顶导航、没有背景模糊；分区手段是"光"，不是"模糊"。',
    '全部直角，容器只用折痕的单向暗带与纸纤维边，页面里没有一片浮起的卡片。',
  ],
  S30: [
    '全部直角；贴纸厚度只用 1px 深边加 0.5px 亮边表达，没有一处柔和投影。',
    '版面被一条对角线撕痕切开，标题压在撕痕一侧且不居中，首屏没有三等宽卡片。',
    '离型纸是 #EDEDED（R=G=B=237、饱和度 0%）而不是纯白，墨是脏黑 #141414；荧光绿是丝网专色，只出现在贴纸本体内，从不铺成背景。',
  ],
  S13: [
    '全站圆角为 0、零柔和投影；唯一阴影来自常驻 135° 的单向硬光源，按下时翻到 315°。',
    '立体感一律给成三个数：压深 0.4mm、亮度差 3%、边缘对比度 14%。',
    '只有一种底 #F4E3BE；条款条目是 7 条与 4 条两段，不是 3 / 6 / 9。',
  ],
  S08: [
    '导航不固定、没有任何背景模糊；分区靠六块实体板的层叠深度与侧壁面。',
    '容器没有 16–32px 圆角，板角只有 2mm 的 45° 倒角；投影是按光源方向偏移 3px 的硬阴影，不是柔影。',
    '底色是 #120C08 而不是 #000000，文字是 #E8DCC8 而不是 #FFFFFF。',
  ],
};
let A = 0, B = 0, n = 0;
console.log('=== 手工改写样例（原文 → 改写后）字数 ===');
for (const [id, lines] of Object.entries(HAND)) {
  const orig = D.find((r) => r.id === id).audit;
  const after = lines.join('');
  A += ch(orig); B += ch(after); n++;
  console.log(id + ': ' + ch(orig) + ' → ' + ch(after) + ' 字（' + (ch(after) / ch(orig) * 100).toFixed(0) + '%，' + lines.length + ' 条）');
  lines.forEach((l, i) => console.log('   ' + (i + 1) + '. ' + l));
  console.log('');
}
console.log('六案合计 ' + A + ' → ' + B + ' 字，平均压到 ' + (B / A * 100).toFixed(0) + '%');
console.log('\n=== 检查改写后是否还含内部术语 ===');
for (const [id, lines] of Object.entries(HAND)) {
  const t = lines.join('');
  const bad = [/C-\d/, /R-\d/, /P\d/, /跳脱之处/, /01-research-brief/, /文件\s*01/, /V-11/].filter((re) => re.test(t));
  console.log('  ' + id + ': ' + (bad.length ? '含 ' + bad.join(' ') : '干净'));
}
