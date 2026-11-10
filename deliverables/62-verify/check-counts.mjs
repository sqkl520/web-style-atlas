import fs from 'fs';
import vm from 'vm';

const ROOT = 'D:/Web/style';
const s2 = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date, navigator: {} };
s2.global = s2;
s2.document = { addEventListener() {}, getElementById() { return null; }, createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; }, querySelectorAll() { return []; }, body: { appendChild() {}, removeChild() {} } };
vm.createContext(s2);
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), s2, { filename: 'data.js' });
const SC = s2.window.SCHEMES;

// what does data.js's gate.realPictures say vs STYLE_PROMPTS minPics?
const s3 = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
s3.global = s3; vm.createContext(s3);
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), s3, { filename: 'd' });
vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'), s3, { filename: 'p' });
const P = s3.window.STYLE_PROMPTS;

console.log('=== minPics (prompt) vs gate.realPictures (measured in DOM) ===');
let mismatch = [], rows = [];
P.schemes.forEach(s => {
  const rec = SC.find(x => x.id === s.id);
  const real = rec.gate.realPictures;
  rows.push([s.id, s.minPics, real, s.minPics - real]);
  if (s.minPics !== real) mismatch.push(s.id + ' prompt=' + s.minPics + ' measured=' + real);
});
console.log('id  minPics  realPictures  diff');
rows.forEach(r => console.log('  ', r[0], String(r[1]).padStart(3), String(r[2]).padStart(3), String(r[3]).padStart(5)));
console.log('mismatches:', mismatch.length);
mismatch.forEach(m => console.log('  ', m));

// Count actual entries in each prototype's rendered HTML to test minItems
console.log('\n=== minItems (prompt) vs actual rendered entry count ===');
function countEntries(id) {
  const rec = SC.find(x => x.id === id);
  const dir = 'D:/Web/style/prototypes/' + rec.dir + '/index.html';
  if (!fs.existsSync(dir)) return null;
  const html = fs.readFileSync(dir, 'utf8');
  // count list items in the main repeated structure; use <li> and common repeating patterns
  const li = (html.match(/<li[\s>]/g) || []).length;
  const art = (html.match(/<article[\s>]/g) || []).length;
  return { li, art };
}
let diffs = [];
P.schemes.forEach(s => {
  const c = countEntries(s.id);
  if (!c) { diffs.push(s.id + ' NO HTML'); return; }
  console.log('  ', s.id, 'minItems=' + String(s.minItems).padStart(2), 'li=' + String(c.li).padStart(3), 'article=' + String(c.art).padStart(2), 'degrades=' + s.dna.degrades);
});
