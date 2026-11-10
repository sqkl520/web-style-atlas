/* 证伪测试：交付方 6 项里的第 4 项（"用每案 fontsSpec 里第一个字体名反查搜索 30/30"）
 * 能不能在"fontsSpec 根本没进 hay"的情况下**照样全绿**？
 * 如果能，那这个测试就不是证据 —— 它没有负控。
 *
 * 做法：用交付方脚本里逐字相同的正则取字体名，但把 hay 里的 fontsSpec 换成 ''，
 * 看命中数还剩下多少。
 */
import { readFileSync } from 'node:fs';

const ROOT = 'D:/Web/style/prototypes/_selection';
const data = JSON.parse(readFileSync(ROOT + '/data.js', 'utf8').match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);

/* 交付方 verify-p2-fonts.mjs:36 的正则，逐字照抄 */
const famOf = (spec) => (spec.match(/[（(]?(?:用|＝|=)?\s*([A-Z][A-Za-z0-9 ]{2,24}?)(?=[（(，,、。]|$)/) || [])[1];

const run = (label, includeSpec) => {
  let hit = 0; const miss = [];
  for (const r of data) {
    const spec = String(r.fontsSpec || '');
    const fam = famOf(spec);
    if (!fam) continue;
    /* 与交付方 :38-40 相同的字段表，只是 fontsSpec 一栏可开关 */
    const hay = [r.id, r.cn, r.en, r.family, includeSpec ? r.fontsSpec : '', r.def, r.tone, r.structure,
      r.errorCode, r.threshold, r.layout, r.visuals, r.quirk, r.scenesYes,
      (r.palette || []).join(' ')].join(' ').toLowerCase();
    if (hay.includes(fam.trim().toLowerCase())) hit++;
    else miss.push(`${r.id}"${fam.trim()}"`);
  }
  console.log(`  ${label}: 命中 ${hit}，未命中 ${miss.length}  ${miss.length ? '例:' + miss.slice(0, 4).join(' ') : ''}`);
  return hit;
};

console.log('═══ 交付方第 4 项的负控测试 ═══');
const a = run('fontsSpec 在 hay 里（= 交付方的真实条件）', true);
const b = run('fontsSpec 不在 hay 里（= 应当全灭的负控）  ', false);
console.log(`\n  差异: ${a} vs ${b}`);
console.log(b === 0
  ? '  ⇒ 负控全灭（30 → 0）：这条测试**有区分力**，我试图证伪它，失败。\n' +
    '     交付方"字体名反查 30/0"这个结果是可信的证据，不是自证。\n' +
    '     前提是 family 字段里没有重复点名这些字体名 —— 实测确实没有。'
  : `  ⇒ 负控仍有 ${b} 案命中：这条测试偏弱，命中可能来自 family 等其他字段的巧合。`);
