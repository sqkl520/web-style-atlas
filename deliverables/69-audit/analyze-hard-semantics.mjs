// 分析 4：hard 案的「模板出口」语义是否成立 —— 逐案比对 scenesYes 与模板 README 的承诺行业。
import fs from 'node:fs';

const srcD = fs.readFileSync('prototypes/_selection/data.js', 'utf8');
const srcP = fs.readFileSync('prototypes/_selection/prompts.js', 'utf8');
global.window = {};
new Function('window', srcD)(global.window);
const S = global.window.SCHEMES;
global.window = {};
new Function('window', srcP)(global.window);
const P = global.window.STYLE_PROMPTS;

const TPL = {
  M01: { scenes: ['律所','咨询','软件服务','设计工作室','代理商'], what: '单页企业站：顶部导航→业务→团队→案例→联系，白底靛蓝' },
  M02: { scenes: ['餐厅','咖啡馆','烘焙','民宿','理发店','花店'], what: '一页式门店官网：主视觉→菜单价目→营业时间地址→环境图→评价→订位' },
  M03: { scenes: ['个人作品集','自由职业者','小型创意工作室','摄影师','设计师','写作者'], what: '个人作品集：大留白大字，作品网格' },
};

const hard = P.schemes.filter(s => s.hard).map(s => s.id);
const deg = P.schemes.filter(s => s.capacity && s.capacity.degrades === 'yes').map(s => s.id);
const nine = ['S03','S05','S10','S14','S15','S18','S20','S21','S29'];

console.log('=== 任务书点名的 9 案：题材 / 有没有语义对得上的模板 ===');
for (const id of nine) {
  const s = S.find(x => x.id === id);
  const pm = P.schemes.find(x => x.id === id);
  const yes = String(s.scenesYes || '');
  const hits = Object.entries(TPL).map(([k, v]) => ({ id: k, hit: v.scenes.filter(t => yes.includes(t)) }))
    .filter(x => x.hit.length);
  console.log(`\n${id} ${s.cn}  hard=${!!pm.hard} deg=${pm.capacity.degrades}`);
  console.log(`  scenesYes: ${yes.slice(0, 150)}`);
  console.log(`  语义对得上的模板: ${hits.length ? hits.map(h => h.id + '(' + h.hit.join('/') + ')').join(' ') : '无'}`);
}

// 全 30 案：有没有模板出口
console.log('\n=== 全 30 案：模板语义匹配统计 ===');
let withTpl = 0, without = [];
for (const s of S) {
  const yes = String(s.scenesYes || '');
  const hit = Object.entries(TPL).filter(([k, v]) => v.scenes.some(t => yes.includes(t))).map(([k]) => k);
  if (hit.length) withTpl++; else without.push(s.id);
}
console.log('至少有一个语义对得上的模板:', withTpl, '/30');
console.log('完全没有模板出口:', without.length, without.join(','));

// hard 4 案里，几个有模板出口
console.log('\nhard 4 案:', hard.join(','));
for (const id of hard) {
  const s = S.find(x => x.id === id);
  const yes = String(s.scenesYes || '');
  const hit = Object.entries(TPL).filter(([k, v]) => v.scenes.some(t => yes.includes(t))).map(([k]) => k);
  console.log(`  ${id} ${s.cn}: ${hit.length ? hit.join(',') : '无模板出口'}`);
}
