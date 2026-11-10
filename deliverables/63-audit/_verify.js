const fs = require('fs');
const R = 'D:/Web/style/prototypes/';
function show(p, lines) {
  const t = fs.readFileSync(R + p, 'utf8').split(/\r?\n/);
  for (const n of lines) console.log(p.split('/')[0] + ':' + n + ': ' + (t[n - 1] || '').trim().slice(0, 190));
}
show('S18-phosphor-service-deck/index.html', [172, 179, 186, 193, 197]);
show('S21-interlocking-release-book/index.html', [230, 446, 447, 448, 449, 450, 452, 453, 454, 455]);
const pc = fs.readFileSync('D:/Web/style/prototypes/_selection/prompt-copy.js', 'utf8').split(/\r?\n/);
[471, 472, 473, 475, 476, 477].forEach(n => console.log('prompt-copy.js:' + n + ': ' + pc[n - 1].trim().slice(0, 190)));
