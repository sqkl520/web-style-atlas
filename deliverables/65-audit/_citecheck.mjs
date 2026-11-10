import { readFileSync } from 'node:fs';
const src = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const D = JSON.parse(src.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));

/* 法典里的 C 编号定义（11.1 矩阵，逐字抄） */
const DEF = {
  'C-1.1': '禁 AI 味渐变背景与主视觉',
  'C-1.3': '禁居中大标题 + 三等宽卡片 + 底部 CTA',
  'C-1.4': '禁 Emoji 功能图标',
  'C-1.5': '禁抽象 3D 球体代表科技',
  'C-1.6': '禁白 / 灰 section 交替',
  'C-2.10': '禁 mesh / aurora blob / 发光噪点球与五种二元插值',
  'C-2.11': '禁 24px 圆角 + 柔和投影浮起卡片',
  'C-2.13': '禁 3D 机器人 / 宇航员 / 抽象人头 / 流体金属',
  'C-2.14': '禁 3 / 6 / 9 重复 feature grid 主体化',
  'C-2.15': '禁纯白底 + 纯黑字 + 单强调色',
  'C-2.16': '禁占位文案，须有 ≥2 处真实中文文案',
  'C-2.17': '禁渐变文字与毛玻璃吸顶导航堆叠',
  'C-2.18': '禁同骨架换色',
};
/* 每条 f8 里：编号 + 紧随的"我的做法"，人工核对语义是否挂得上。
 * 用关键词共现做机械初筛，再由我逐条判。 */
const KEY = {
  'C-1.1': ['渐变', '色斑', '插值'],
  'C-1.3': ['hero', '大标题', '等宽', '三卡', '居中', 'CTA'],
  'C-1.4': ['emoji', 'Emoji', '图标', '表情'],
  'C-1.5': ['球体', '3D', '流体金属', '机器人', '渲染'],
  'C-1.6': ['交替', '分区', '一种底', '单一', '铺底', '换底色'],
  'C-2.10': ['渐变', '插值', '色斑', '噪点'],
  'C-2.11': ['圆角', '投影', '浮起', '直角', '阴影'],
  'C-2.13': ['机器人', '球体', '流体金属', '3D', '渲染'],
  'C-2.14': ['图标', '三格', '六格', '等量', '3 / 6 / 9', '格子'],
  'C-2.15': ['纯白', '#FFFFFF', '纯黑', '#000000', '底色', '强调色'],
  'C-2.16': ['文案', '占位', '图标罗列'],
  'C-2.17': ['导航', '模糊', '毛玻璃', '吸顶', '渐变文字'],
  'C-2.18': ['骨架', '居中', '五栏', '换色'],
};
console.log('=== 字段8 的 C 编号引用：编号定义 vs 紧随其后的做法，语义是否对得上 ===');
let ok = 0, sus = 0;
const susList = [];
for (const r of D) {
  for (const m of r.audit.matchAll(/(C-\d\.\d+)((?:\s*(?:与|、|和)\s*(?:C-\d\.\d+|R-\d+|P\d+))*)([^①②③④⑤⑥⑦⑧⑨]{0,90})/g)) {
    const code = m[1];
    const tail = m[3];
    const keys = KEY[code];
    if (!keys) continue;
    const hit = keys.some((k) => tail.includes(k));
    // 也看规则名（gloss）
    if (hit) ok++; else { sus++; susList.push(r.id + ' ' + code + '（' + DEF[code] + '）→ ' + tail.replace(/\s+/g, ' ').slice(0, 60)); }
  }
}
console.log('  对得上 ' + ok + ' 处；对不上 ' + sus + ' 处');
console.log('\n--- 疑似引错/引泛的（编号定义与做法关键词不共现）---');
susList.forEach((s) => console.log('  ' + s));
