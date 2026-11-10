const fs = require('fs');
const dir = 'D:/Web/style/prototypes/_specs';
const out = [];
for (let i = 1; i <= 30; i++) {
  const id = 'S' + String(i).padStart(2, '0');
  const lines = fs.readFileSync(dir + '/' + id + '.md', 'utf8').split(/\r?\n/);
  let found = null;
  lines.forEach((L, j) => {
    if (/最[难易]被复用/.test(L)) found = { line: j + 1, text: L };
  });
  out.push({ id, has: !!found, line: found ? found.line : 0, text: found ? (found.text.match(/最[难易]被复用[\s\S]*$/) || [''])[0] : '' });
}
const hard = ['S03','S05','S10','S14','S15','S18','S20','S21','S29'];
console.log('id has line | inHard');
for (const o of out) console.log(o.id + ' ' + (o.has ? 'Y' : '-') + ' ' + String(o.line).padEnd(3) + ' | ' + (hard.includes(o.id) ? 'HARD' : ''));
const withF = out.filter(o => o.has).map(o => o.id);
const noF = out.filter(o => !o.has).map(o => o.id);
console.log('\n有字段11可移植句: ' + withF.length + ' -> ' + withF.join(' '));
console.log('无: ' + noF.length + ' -> ' + noF.join(' '));
const inter = withF.filter(x => hard.includes(x));
console.log('交集: ' + inter.length + ' -> ' + inter.join(' '));
console.log('HARD 无句: ' + hard.filter(x => !withF.includes(x)).join(' '));
console.log('有句非HARD: ' + withF.filter(x => !hard.includes(x)).join(' '));
fs.writeFileSync('D:/Web/style/deliverables/63-audit/_field11.json', JSON.stringify(out, null, 1), 'utf8');
for (const o of out) if (o.has) console.log('\n' + o.id + ' L' + o.line + ': ' + o.text);
