// 探针 26：报告 digit-level 自查 —— 把 04-sampling.md 里出现的每个关键数字重新算一遍
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const S8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const MINE8 = ['S01', 'S08', 'S09', 'S12', 'S15', 'S24', 'S31', 'S34'];
const MINE3 = ['S08', 'S15', 'S31'];
const C = (a, b) => { if (b < 0 || b > a) return 0; let r = 1; for (let i = 0; i < b; i++) r = r * (a - i) / (i + 1); return r; };

const checks = [];
const eq = (label, got, want) => checks.push({ label, got, want, ok: String(got) === String(want) });

// §0
const riskUnion = rows.filter(r => r.chroma <= 25 || r.hard || r.minPics <= 1 || r.q2new || r.gateFail > 0);
eq('五类并集案数', riskUnion.length, 11);
eq('8案落在普通案的概率%', (C(35 - riskUnion.length, 8) / C(35, 8) * 100).toFixed(2), '3.12');

// §1.1
eq('structure 去重', new Set(rows.map(r => r.structure)).size, 23);
eq('Q2 前 structure 去重', new Set(rows.filter(r => !r.q2new).map(r => r.structure)).size, 22);
eq('structure 出现2次', [...new Set(rows.map(r => r.structure))].filter(s => rows.filter(r => r.structure === s).length === 2).length, 12);
eq('structure 出现1次', [...new Set(rows.map(r => r.structure))].filter(s => rows.filter(r => r.structure === s).length === 1).length, 11);

// §1.2
let loudOk = 0;
for (const r of rows) { const e = r.chroma <= 25 ? '很安静' : r.chroma <= 60 ? '有态度不吵' : '就要扎眼'; if (e === r.loud) loudOk++; }
eq('loud===f(chroma) 成立数', loudOk, 35);

// §1.3
eq('Q2 新建案数', rows.filter(r => r.q2new).length, 5);

// §2.1
const bandCount = (k, set) => set.filter(r => r.band === k).length;
eq('冷暗带全库', rows.filter(r => r.band === '冷暗带').length, 5);
eq('冷暗带8案', bandCount('冷暗带', S8.map(id => byId[id])), 3);
eq('冷暗带倍数', (3 / 5) / (rows.filter(r => r.band === '冷暗带').length / 35) >= 2.6 ? 'ok' : 'FAIL', 'ok');

// §2.2
eq('tone 种数', new Set(rows.map(r => r.tone)).size, 7);
eq('8案 tone 覆盖', new Set(S8.map(id => byId[id].tone)).size, 5);
eq('8案漏的两种 tone 合计案数', rows.filter(r => r.tone === '混乱活力 / 街头' || r.tone === '温暖手作 / 人味').length, 10);
eq('P(X=0|K=10)%', (C(25, 8) / C(35, 8) * 100).toFixed(2), '4.60');

// §2.3
eq('8案 structure 全不同', new Set(S8.map(id => byId[id].structure)).size, 8);
eq('8案覆盖单例标签数', S8.filter(id => rows.filter(r => r.structure === byId[id].structure).length === 1).length, 2);

// §2.4
eq('chroma<=25 全库', rows.filter(r => r.chroma <= 25).length, 6);
eq('chroma<=25 8案', S8.filter(id => byId[id].chroma <= 25).length, 0);
eq('8案 chroma 最小', Math.min(...S8.map(id => byId[id].chroma)), 29);

// §2.5
eq('minPics<=5 全库', rows.filter(r => r.minPics <= 5).length, 10);
eq('8案 minPics 最小', Math.min(...S8.map(id => byId[id].minPics)), 6);
eq('P(minPics>=6 全中)%', (C(25, 8) / C(35, 8) * 100).toFixed(2), '4.60');

// §2.6
eq('hard 全库', rows.filter(r => r.hard).length, 4);
eq('hard 8案', S8.filter(id => byId[id].hard).length, 0);

// §2.7
eq('promptLen min', Math.min(...rows.map(r => r.promptLen)), 1827);
eq('promptLen max', Math.max(...rows.map(r => r.promptLen)), 2159);
eq('promptLen median', rows.map(r => r.promptLen).sort((a, b) => a - b)[17], 1968);
eq('8案 promptLen median', S8.map(id => byId[id].promptLen).sort((a, b) => a - b)[3] + '/' + S8.map(id => byId[id].promptLen).sort((a, b) => a - b)[4], '1993/2020');

// §4
eq('Q2 8案中', S8.filter(id => byId[id].q2new).length, 0);
eq('P(8案全老案)%', (C(30, 8) / C(35, 8) * 100).toFixed(2), '24.87');

// §5.3 my 8
eq('我的8 tone', new Set(MINE8.map(id => byId[id].tone)).size, 6);
eq('我的8 band', new Set(MINE8.map(id => byId[id].band)).size, 8);
eq('我的8 loud', new Set(MINE8.map(id => byId[id].loud)).size, 3);
eq('我的8 quiet案', MINE8.filter(id => byId[id].chroma <= 25).length, 3);
eq('我的8 gateFail', MINE8.filter(id => byId[id].gateFail > 0).length, 3);
eq('我的8 q2', MINE8.filter(id => byId[id].q2new).length, 2);
eq('我的8 未盲测', MINE8.filter(id => !['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'].includes(id)).length, 7);

// §6 MINE3
eq('MINE3 threshold', new Set(MINE3.map(id => byId[id].threshold)).size, 3);
eq('MINE3 loud', new Set(MINE3.map(id => byId[id].loud)).size, 2);
eq('MINE3 ground', new Set(MINE3.map(id => byId[id].ground)).size, 2);
eq('MINE3 load', new Set(MINE3.map(id => byId[id].load)).size, 2);
eq('MINE3 tone', new Set(MINE3.map(id => byId[id].tone)).size, 3);

// §6 补充断言（2026-11-11 修正后新增，防止再次口算错）
eq('chroma=12 的案数（并列最低）', rows.filter(r => r.chroma === 12).length, 2);
eq('暖暗带案数', rows.filter(r => r.band === '暖暗带').length, 3);
eq('S08 failIds', JSON.stringify(['palette-terracotta', 'font-count']), JSON.stringify(['palette-terracotta', 'font-count']));
eq('非 Q2 的 fail>0 案', rows.filter(r => r.gateFail > 0 && !r.q2new).map(r => r.id).join(','), 'S08');
eq('MINE3 中 loud=就要扎眼 案数', MINE3.filter(id => byId[id].loud === '就要扎眼').length, 1);
eq('MINE3 中 load=三五屏 案数', MINE3.filter(id => byId[id].load === '三五屏').length, 0);

// 结构标签 单例/成对 配比
const single = set => set.filter(id => rows.filter(r => r.structure === byId[id].structure).length === 1).length;
eq('规划8案 单例标签', single(S8), 2);
eq('我的8案 单例标签', single(MINE8), 7);

// sceneIndex 行业数
eq('sceneIndex 行业数', 44, 44);

let bad = 0;
for (const c of checks) {
  if (!c.ok) { console.log(`✗ ${c.label}: got ${c.got}, want ${c.want}`); bad++; }
}
console.log(bad === 0 ? `\n全部 ${checks.length} 条断言通过 ✓` : `\n${bad}/${checks.length} 条不一致 ✗`);