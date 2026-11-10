const fs = require('fs');
const src = fs.readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8');
const jsonText = src.slice(src.indexOf('window.STYLE_PROMPTS = ') + 'window.STYLE_PROMPTS = '.length).replace(/;\s*$/, '');
const P = JSON.parse(jsonText);
console.log('hardIds =', JSON.stringify(P.hardIds));
console.log('id  hard  degrades  minItems  minPics');
const rows = [];
for (const s of P.schemes) {
  const deg = s.capacity ? s.capacity.degrades : 'NONE';
  rows.push({ id: s.id, hard: s.hard, deg: deg, min: s.capacity && s.capacity.minItems });
  console.log([s.id, String(s.hard).padEnd(5), String(deg).padEnd(9), String(s.capacity && s.capacity.minItems).padEnd(9), String(s.capacity && s.capacity.minPics)].join('  '));
}
const hard = rows.filter(r => r.hard).map(r => r.id);
const deg = rows.filter(r => r.deg === 'yes').map(r => r.id);
console.log('\nhard(' + hard.length + ') =', hard.join(' '));
console.log('degrades=yes(' + deg.length + ') =', deg.join(' '));
console.log('both =', hard.filter(x => deg.includes(x)).join(' '));
console.log('hard only =', hard.filter(x => !deg.includes(x)).join(' '));
console.log('deg only =', deg.filter(x => !hard.includes(x)).join(' '));
const none = rows.filter(r => !r.hard && r.deg !== 'yes').map(r => r.id);
console.log('neither =', none.join(' '));
