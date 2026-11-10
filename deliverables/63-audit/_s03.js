const fs = require('fs');
const R = 'D:/Web/style/prototypes/';
const html = fs.readFileSync(R + 'S03-long-exposure-observatory/index.html', 'utf8');
const hs = [...html.matchAll(/class="band" style="--h:(\d+)px"/g)].map(m => +m[1]);
console.log('S03 band heights:', hs.join(','), 'sum=', hs.reduce((a, b) => a + b, 0));
console.log('with 8 x 4px gaps =', hs.reduce((a, b) => a + b, 0) + 8 * 4);
const css = fs.readFileSync(R + 'S03-long-exposure-observatory/style.css', 'utf8');
const axis = css.match(/\.axis\s*\{[^}]*height:\s*(\d+)px/);
console.log('axis height:', axis && axis[1]);
const bandsMax = hs.reduce((a, b) => a + b, 0) + 8 * 4;
console.log('fill ratio at design scale:', (bandsMax / +axis[1] * 100).toFixed(1) + '%');
console.log('empty px at design scale:', +axis[1] - bandsMax);
// smallest 3 bands
const sorted = [...hs].sort((a, b) => a - b);
console.log('cut to 3 bands:', sorted.slice(0, 3).reduce((a, b) => a + b, 0) + 12, 'px');
