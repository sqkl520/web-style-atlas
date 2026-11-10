// P21：README L78 那组数字（44 / 16 / 28 / 29）自洽吗
import { loadPrompts } from './_lib.mjs';

const P = loadPrompts();
const terms = Object.keys(P.sceneIndex);
const direct = terms.filter((t) => (P.sceneIndex[t].direct || []).length);
const near = terms.filter((t) => !(P.sceneIndex[t].direct || []).length);
console.log('sceneIndex 词数            = %d', terms.length);
console.log('  有直连 direct             = %d  → %s', direct.length, direct.join(' '));
console.log('  只有近似 near（含 0 近似） = %d', near.length);
console.log('unsupported 数组长度        = %d  → %s', (P.unsupported || []).length, (P.unsupported || []).join(' '));
console.log('\nREADME L78 原文：「44 个行业词…（16 个有直连方案，28 个只有近似，29 个如实标为"没有"，收在「还有 28 个只有近似的 →」里）」');
console.log('算术检查：16 + 28 = %d  与 44 %s', 16 + 28, 16 + 28 === 44 ? '一致' : '不一致');
console.log('但「29 个标为没有」是第三个集合：16 + 28 = 44 已经用完，29 无处安放 ⇒ 三个数不可能同时成立');
console.log('\n实测：unsupported(%d) 与 near(%d) 是否同一集合？%s', (P.unsupported || []).length, near.length,
  (P.unsupported || []).length === near.length ? '数量相同' : '数量不同');
const uns = new Set(P.unsupported || []);
const over = near.filter((t) => uns.has(t)), onlyNear = near.filter((t) => !uns.has(t)), onlyUns = [...uns].filter((t) => !near.includes(t));
console.log('  两边都有：%d  %s', over.length, over.join(' '));
console.log('  只在 near、不在 unsupported：%d  %s', onlyNear.length, onlyNear.join(' '));
console.log('  只在 unsupported、不在 near：%d  %s', onlyUns.length, onlyUns.join(' '));
console.log('\n⇒ 界面上的「还有 28 个只有近似的 →」按钮数：%d（由 near.length 现算）', near.length);
console.log('  而 P.unsupported 那 29 个词里，有 %d 个根本不在 sceneIndex（不在任何芯片里）', onlyUns.length);
