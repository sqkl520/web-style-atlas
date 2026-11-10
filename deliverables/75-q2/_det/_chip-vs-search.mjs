import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(readFileSync('prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('prototypes/_selection/prompts.js', 'utf8'), ctx);
const S = ctx.window.SCHEMES, P = ctx.window.STYLE_PROMPTS;
const byId = Object.fromEntries(S.map((r) => [r.id, r]));
const scenesOf = (r) => { const s = r.scenes || ''; const i = s.indexOf('不适合'); return i > 0 ? s.slice(0, i) : s; };
const hay = (r) => [r.cn, r.en, r.structure, r.tone, r.def, r.family, r.layout, r.visuals, r.motion, r.quirk,
  r.fontsSpec, r.risk, scenesOf(r), r.axes ? Object.values(r.axes).join(' ') : ''].join(' ').toLowerCase();

console.log('=== 芯片能点出结果，但手动搜同一个词是 0 行 ===');
console.log('词        芯片 direct   自由搜索命中   问题');
let dead = 0;
for (const [term, v] of Object.entries(P.sceneIndex)) {
  const hits = S.filter((r) => hay(r).includes(term.toLowerCase())).map((r) => r.id);
  if ((v.direct || []).length && hits.length === 0) {
    dead++;
    console.log(term.padEnd(9), ' ', v.direct.join(',').padEnd(12), '（0 行）'.padEnd(12),
      '案里写的是别的说法：', v.direct.map((id) => byId[id].cn + '「' + (scenesOf(byId[id]).slice(0, 40)) + '…」').join(' '));
  }
}
console.log('\n此类词数:', dead);

console.log('\n=== 反向：搜索能命中，但芯片说「没有直连方案」 ===');
let blind = 0;
for (const [term, v] of Object.entries(P.sceneIndex)) {
  const hits = S.filter((r) => hay(r).includes(term.toLowerCase())).map((r) => r.id);
  if (!(v.direct || []).length && hits.length > 0) {
    blind++;
    console.log(term.padEnd(9), '芯片说 0 直连，但搜索命中', hits.join(','));
  }
}
console.log('\n此类词数:', blind, '（这些词用户打字能搜到案，但站点告诉他"没有为这行做的方案"）');

console.log('\n=== 既在 unsupported（说撑不起来）又能在正文搜到的词 ===');
for (const t of P.unsupported) {
  const hits = S.filter((r) => hay(r).includes(t.toLowerCase())).map((r) => r.id);
  if (hits.length) console.log('  ' + t.padEnd(9), '→ unsupported 说"撑不起来"，但搜索能命中', hits.join(','));
}
