import { readFileSync, existsSync } from 'node:fs';

// 核实：26/35 个缺口词是否「连 near 数据都没有」
// 以及补 3 个新方案能覆盖多少
const prompts = readFileSync('prototypes/_selection/prompts.js', 'utf8');

// 解析 sceneIndex
const m = /sceneIndex\s*[:=]\s*(\{[\s\S]*?\n\s*\})\s*[,;]?\s*\n/.exec(prompts);
let sceneIndex = null;
if (m) { try { sceneIndex = JSON.parse(m[1]); } catch (e) { console.log('sceneIndex 解析失败:', e.message); } }

if (!sceneIndex) {
  // 换一种：找 "direct" 和 "near" 的结构
  const i = prompts.indexOf('"sceneIndex"') >= 0 ? prompts.indexOf('"sceneIndex"') : prompts.indexOf('sceneIndex');
  console.log('sceneIndex 位置:', i);
  const seg = prompts.slice(i, i + 3000);
  console.log(seg.slice(0, 1200));
} else {
  const terms = Object.keys(sceneIndex);
  console.log(`sceneIndex 共 ${terms.length} 个词`);
  const direct = terms.filter(t => (sceneIndex[t].direct || []).length > 0);
  const nearOnly = terms.filter(t => (sceneIndex[t].direct || []).length === 0 && (sceneIndex[t].near || []).length > 0);
  const empty = terms.filter(t => (sceneIndex[t].direct || []).length === 0 && (sceneIndex[t].near || []).length === 0);
  console.log(`  direct 有: ${direct.length}`);
  console.log(`  只有 near: ${nearOnly.length}`);
  console.log(`  两者皆空（真零命中）: ${empty.length}`);
  console.log(`\n真零命中的词（${empty.length} 个）: ${empty.join('、')}`);

  // unsupported 列表
  const um = /UNSUPPORTED\s*=\s*\[([\s\S]*?)\]/.exec(prompts);
  if (um) {
    const unsup = [...um[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    console.log(`\nUNSUPPORTED 列表: ${unsup.length} 个词`);
    console.log(`  ${unsup.join('、')}`);
    const inIndex = unsup.filter(t => terms.includes(t));
    console.log(`  其中在 sceneIndex 里的: ${inIndex.length}`);
    const notInIndex = unsup.filter(t => !terms.includes(t));
    console.log(`  不在 sceneIndex 里的: ${notInIndex.length}（这些词的搜索结果完全由 unsupported 文案覆盖）`);
    // 这些不在索引里的词，用户搜了会怎样？
    console.log(`\n⚠️ 关键：${notInIndex.length} 个词不在 sceneIndex 里，用户搜索时是「整串子串匹配」`);
    console.log(`   若这些词没出现在任何案子的文本里 → 0 行`);
  }

  // 冲突检查：direct 非空的词，是否也在 unsupported 里
  if (um) {
    const unsup = [...um[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    const conflict = unsup.filter(t => sceneIndex[t] && (sceneIndex[t].direct || []).length > 0);
    console.log(`\n⚠️ 矛盾：同时在 UNSUPPORTED 和 direct 非空的词: ${conflict.length} ${conflict.join('、') || '(无)'}`);
  }
}
