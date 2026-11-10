const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/Web/style/deliverables/63-audit/_field11.json', 'utf8'));
const hard = ['S03', 'S05', 'S10', 'S14', 'S15', 'S18', 'S20', 'S21', 'S29'];
const withF = data.filter(d => d.has);
const cat = { rewrite: [], semanticGap: [], mechanismBound: [] };
for (const d of withF) {
  const t = d.text;
  if (/必须重写|就得重写|必须换数据集|等于重排|等于重编|必须重排|要重新决定|得重新撕|必须重换|换品牌必须|换一个品牌必须/.test(t)) cat.rewrite.push(d.id);
  if (/没有「|任何没有|没有真实编号体系|没有存根联需求|没有「多版本信息」|没有真实的两组/.test(t)) cat.semanticGap.push(d.id);
  if (/仍然只属于|仍然只对应|仍然只适用于|无法只换 logo/.test(t)) cat.mechanismBound.push(d.id);
}
console.log('有句 (21):', withF.map(d => d.id).join(' '));
for (const k of Object.keys(cat)) console.log(k + ' (' + cat[k].length + '): ' + cat[k].join(' ') + '  | hard∩ = ' + cat[k].filter(x => hard.includes(x)).join(' '));
const inter = withF.map(d => d.id).filter(x => hard.includes(x));
console.log('\nfield11 ∩ HARD = ' + inter.length + ' : ' + inter.join(' '));
console.log('HARD 无 field11 = ' + hard.filter(x => !withF.some(d => d.id === x)).join(' '));
console.log('field11 非 HARD = ' + withF.map(d => d.id).filter(x => !hard.includes(x)).join(' '));
console.log('\nJaccard(HARD, field11) = ' + (inter.length / (new Set([...hard, ...withF.map(d => d.id)]).size)).toFixed(3));
