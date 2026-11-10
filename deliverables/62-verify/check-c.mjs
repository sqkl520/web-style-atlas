import fs from 'fs';
import vm from 'vm';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const frozenCopy = fs.readFileSync(ROOT + '/deliverables/62-verify/frozen-prompt-copy.js', 'utf8');

function loadPromptsSource(src, label) {
  // fresh sandbox per load
  const sb = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date, document: null, navigator: {} };
  sb.global = sb;
  sb.document = {
    addEventListener() {}, getElementById() { return null; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; },
    querySelectorAll() { return []; },
    body: { appendChild() {}, removeChild() {} },
  };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), sb, { filename: 'data.js' });
  vm.runInContext(src, sb, { filename: label });
  vm.runInContext(frozenCopy, sb, { filename: 'prompt-copy.js' });
  return sb.window;
}

// ---- C1: rollback test — HEAD prompts.js (old data) + new prompt-copy.js ----
const oldPrompts = execSync('git show HEAD:prototypes/_selection/prompts.js', { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
console.log('=== C1 rollback: HEAD prompts.js + current prompt-copy.js ===');
try {
  const w = loadPromptsSource(oldPrompts, 'old-prompts.js');
  let n = 0, emptyFallback = [], errs = [];
  for (const s of w.STYLE_PROMPTS.schemes) {
    try {
      const t = w.buildStylePrompt(s.id);
      if (!t || !t.length) errs.push(s.id + ':empty');
      if (t.includes('有刻印感的衬线')) emptyFallback.push(s.id);
      if (t.includes('undefined') || t.includes('[object')) errs.push(s.id + ':undef');
      n++;
    } catch (e) { errs.push(s.id + ':throw ' + e.message); }
  }
  console.log('built', n, '/', w.STYLE_PROMPTS.schemes.length);
  console.log('placeholder "有刻印感的衬线" hits:', emptyFallback.length, emptyFallback.join(','));
  console.log('errors:', errs.length, errs.join(' | '));
  const sample = w.buildStylePrompt('S07').split('\n').filter(l => l.includes('字体'));
  console.log('old-data S07 font line:', sample.join(' || ').slice(0, 400));
} catch (e) {
  console.log('ROLLBACK LOAD FAILED:', e.message);
}

// ---- C3: risk field coverage in current prompts ----
console.log('\n=== C3 risk field ===');
{
  const sb = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
  sb.global = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), sb, { filename: 'data.js' });
  const SC = sb.window.SCHEMES;
  let total = 0;
  SC.forEach(s => total += (s.risk || '').length);
  console.log('total risk chars across 30:', total);
  console.log('cases with risk:', SC.filter(s => (s.risk || '').trim()).length);
}
{
  const w = loadPromptsSource(fs.readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'), 'prompts.js');
  const SCsb = { window: {}, console, Math, JSON, Set, Map, Object, Array, Number, String, isNaN, parseInt, parseFloat, RegExp, Date };
  SCsb.global = SCsb; vm.createContext(SCsb);
  vm.runInContext(fs.readFileSync(ROOT + '/prototypes/_selection/data.js', 'utf8'), SCsb, { filename: 'data.js' });
  const SC = SCsb.window.SCHEMES;
  let present = 0; const missing = [];
  for (const s of w.STYLE_PROMPTS.schemes) {
    const rec = SC.find(x => x.id === s.id);
    const r = (rec && rec.risk || '').replace(/\s+/g, '');
    if (!r) { missing.push(s.id + '(no risk)'); continue; }
    const prompt = w.buildStylePrompt(s.id).replace(/\s+/g, '');
    // probe 3 windows
    const probes = [r.slice(0, 14), r.slice(Math.floor(r.length / 2), Math.floor(r.length / 2) + 14), r.slice(-14)];
    if (probes.some(p => p && p.length > 5 && prompt.includes(p))) present++;
    else missing.push(s.id);
  }
  console.log('risk text found inside prompt:', present, '/30');
  console.log('missing:', missing.join(','));
}

// ---- C4: minPics vs declared image count consistency in prompt ----
console.log('\n=== C4 minPics vs minItems in prompt ===');
{
  const w = loadPromptsSource(fs.readFileSync(ROOT + '/prototypes/_selection/prompts.js', 'utf8'), 'prompts.js');
  const rows = [];
  for (const s of w.STYLE_PROMPTS.schemes) {
    const t = w.buildStylePrompt(s.id);
    const itemM = t.match(/我实际有 (\d+) 个/);
    const picM = t.match(/留 (\d+) 个图片位/);
    rows.push({ id: s.id, minItems: s.minItems, minPics: s.minPics, promptItems: itemM ? +itemM[1] : null, promptPics: picM ? +picM[1] : null, degrades: s.dna.degrades });
  }
  const mismatch = rows.filter(r => r.promptItems !== r.minItems || r.promptPics !== r.minPics);
  console.log('prompt number != data number:', mismatch.length);
  mismatch.forEach(r => console.log('  ', JSON.stringify(r)));
  console.log('caption: id minItems minPics items pics degrades');
  rows.forEach(r => console.log('  ', r.id, r.minItems, r.minPics, r.promptItems, r.promptPics, r.degrades));
}
