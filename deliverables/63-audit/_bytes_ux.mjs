import fs from 'fs';
const base = 'D:/Web/style/prototypes/_selection/';
const fonts = 'D:/Web/style/prototypes/_fonts/css/';
const files = [
  ['index.html', base + 'index.html'],
  ['style.css', base + 'style.css'],
  ['data.js', base + 'data.js'],
  ['prompts.js', base + 'prompts.js'],
  ['prompt-copy.js', base + 'prompt-copy.js'],
  ['self-gate.js', base + 'self-gate.js'],
  ['app.js', base + 'app.js'],
  ['font css archivo', fonts + 'archivo-vf__wdth-wght.css'],
  ['font css noto-sc', fonts + 'noto-sans-sc__100..900.css'],
  ['font css plex-mono', fonts + 'ibm-plex-mono__400-500.css'],
];
let total = 0;
for (const [n, p] of files) {
  const s = fs.statSync(p).size;
  if (!n.startsWith('font css')) total += s;
  console.log(String(s).padStart(8), (s / 1024).toFixed(1).padStart(7) + ' KB  ' + n);
}
console.log('---');
console.log('scripts+styles+html (no font CSS):', total, 'bytes =', (total / 1024).toFixed(1), 'KB');
const scriptsOnly = ['data.js', 'prompts.js', 'prompt-copy.js', 'self-gate.js', 'app.js']
  .reduce((a, n) => a + fs.statSync(base + n).size, 0);
console.log('scriptsonly:', (scriptsOnly / 1024).toFixed(1), 'KB');
console.log('wizard first load: html+wizard.js+wizard.css+style.css+data.js =',
  ((fs.statSync(base + 'wizard.html').size + fs.statSync(base + 'wizard.js').size +
    fs.statSync(base + 'wizard.css').size + fs.statSync(base + 'style.css').size +
    fs.statSync(base + 'data.js').size) / 1024).toFixed(1), 'KB');
// count screenshots on first load (30 rows x 1 visible img after CSS hides 2,3)
console.log('--- gzip estimate of data.js (rough) ---');
import zlib from 'zlib';
for (const n of ['data.js', 'prompts.js', 'prompt-copy.js', 'app.js', 'style.css']) {
  const b = fs.readFileSync(base + n);
  console.log(n, 'raw', (b.length / 1024).toFixed(1), 'KB  gzip', (zlib.gzipSync(b).length / 1024).toFixed(1), 'KB');
}
