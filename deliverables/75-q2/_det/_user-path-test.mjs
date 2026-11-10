import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES, P = ctx.window.STYLE_PROMPTS;

// 复刻 app.js:222-245 的搜索索引口径（scenes 的负向段要剥掉）
const scenesOf = (r) => {
  const s = r.scenes || '';
  const i = s.indexOf('不适合');
  return i > 0 ? s.slice(0, i) : s;
};
const idx = S.map((r) => ({
  id: r.id,
  hay: [r.cn, r.en, r.structure, r.tone, r.def, r.family, r.layout, r.visuals, r.motion,
    r.quirk, r.fontsSpec, r.risk, scenesOf(r), r.axes ? Object.values(r.axes).join(' ') : ''].join(' ').toLowerCase(),
}));

const probe = (term) => {
  const t = term.toLowerCase();
  const inFree = idx.filter((x) => x.hay.includes(t)).map((x) => x.id);
  const chip = P.sceneIndex[term];
  const chipDirect = chip ? chip.direct : null;
  const unsup = P.unsupported.includes(term);
  return { term, inFree, chipDirect, unsup };
};

console.log('=== 用户搜一个词，会走到哪条路径 ===');
console.log('词        芯片命中(direct)   自由文本搜索命中              词在 unsupported');
for (const t of ['咖啡店', '咖啡馆', '茶饮', '餐厅', '烘焙', '书店', '花店', '民宿', '摄影', '健身',
  '宠物', '诊所', '律师', '会计', '招聘', '非营利', '设计工作室', '作品集', '内容媒体', '博客',
  '播客', '独立杂志', '出版', '展览', '戏剧', '影展', '文化节', '游戏', '潮牌', '快闪',
  '音乐产品', '音频设备', '工业设备', '说明书', '开发者工具', '运维', '数据看板', '档案', '科普',
  '教育', '修鞋理发', '小吃店', '市集']) {
  const r = probe(t);
  const d = r.chipDirect === null ? '（不在芯片词表）' : (r.chipDirect.length ? r.chipDirect.join(',') : '（词表里但 0 直连）');
  console.log(t.padEnd(9), ' ', d.padEnd(20), (r.inFree.join(',') || '（0 行）').padEnd(28), r.unsup ? '  ✗ 在' : '');
}

console.log('\n=== 关键：同一行业，两种叫法结果差多少 ===');
const pairs = [['咖啡店', '咖啡馆'], ['独立杂志', '杂志'], ['设计工作室', '工作室'], ['展览', '展览导览'],
  ['出版', '出版书系'], ['游戏', '游戏官网'], ['潮牌', '潮牌快闪'], ['烘焙', '面包店'], ['书店', '书系'], ['教育', '科普']];
for (const [a, b] of pairs) {
  const ra = probe(a), rb = probe(b);
  console.log(a.padEnd(8), '芯片', (ra.chipDirect || []).join(',') || '无', '| 搜索', ra.inFree.join(',') || '无');
  console.log(b.padEnd(8), '芯片', (rb.chipDirect || []).join(',') || '无', '| 搜索', rb.inFree.join(',') || '无');
  const diff = JSON.stringify(ra.inFree) !== JSON.stringify(rb.inFree);
  console.log('  → ' + (diff ? '两个叫法命中不同的案 ← 用户不知道哪个才是"正确"叫法' : '一致'));
}
