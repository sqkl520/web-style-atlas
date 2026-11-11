#!/usr/bin/env node
/* s07 —— 以难点为锚的选案。
 *
 * 为什么不能直接用 s06 的"覆盖率最优"：s06 的四级字典序把"覆盖层数"放第一位，
 * 而 29 个层里只有 6 个层是难点案独占的，剩下 23 个层都可以用容易的案凑满。
 * 结果是它挑出 S01 S08 S09 S10 S11 S15 S18 S22 —— 8 案里只有 4 个难点案，
 * 仍会漏掉 S21（hard, chroma 91）与 S29（hard, chroma 96）。
 * 而"上一轮避开了难点"正是这次要纠正的东西，所以难点必须先钉住，再谈覆盖。
 *
 * 本脚本的准则（先声明）：
 *   硬约束：6 个"可测难点案"全部入选（理由见 s05：S31–S35 提示词坏掉，不可测）。
 *   然后在剩下的 24 案里穷举 C(24,2) 补 2 案，按字典序比：
 *     ① 覆盖到的层数（层定义与 s06 相同，含 tone/chroma/pics/ground/load/threshold/hard/gateFail/words）
 *     ② structure 标签去重数
 *     ③ 未在 74-q7 复刻过的案数（信息增益）
 *     ④ tone 的 maximin（最少的那个 tone 有几案）
 *   全部机械比较，无加权。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s01-dataset.json'), 'utf8'));
const audit = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s03-prompt-audit.json'), 'utf8'));
const BROKEN = new Set(audit.bad);
const ALREADY = ['S03', 'S06', 'S07', 'S14', 'S17', 'S19', 'S23', 'S24', 'S26'];
const PREV8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const USED = [...new Set([...ALREADY, ...PREV8])];   // 11 案曾被用过（复刻或抽样）

const clean = rows.filter((r) => !BROKEN.has(r.id));
const byId = Object.fromEntries(clean.map((r) => [r.id, r]));
console.log('s07 —— 以难点为锚的选案');
console.log('='.repeat(78));
console.log(`可测案 ${clean.length}/35（剔除提示词坏掉的 ${[...BROKEN].join(' ')}）`);
console.log(`曾被用过 ${USED.length} 案: ${USED.join(' ')}（其中 74-q7 真复刻过的 9 案: ${ALREADY.join(' ')}）\n`);

/* ---------- 1. 在可测宇宙里重算五类难点 ---------- */
const CL = {
  A: (r) => r.chroma <= 25,
  B: (r) => r.hard,
  C: (r) => r.minPics <= 1,
  D: (r) => Number(r.id.slice(1)) >= 31,
  E: (r) => r.gateFail > 0,
};
console.log('## 1. 五类难点在「可测宇宙」（30 案）里的实际成员');
const members = {};
for (const [k, f] of Object.entries(CL)) {
  members[k] = clean.filter(f).map((r) => r.id);
  console.log(`   ${k}: K=${members[k].length}  ${members[k].join(' ') || '（空 —— 全部落在提示词坏掉的 5 案里）'}`);
}
const UNION = [...new Set(Object.values(members).flat())].sort();
console.log(`\n   并集 K=${UNION.length} / 30: ${UNION.join(' ')}`);
console.log(`   ⇒ C（少图）与 D（Q2 新建）在可测宇宙中为**空集**。这不是抽样失误，是数据缺陷。`);

/* ---------- 2. 措辞检查：Q2 那 5 案到底坏在哪 ---------- */
console.log('\n## 2. 为什么 C/D 两类测不了（一句话证据）');
console.log('   s03 实测：5/5 案的提示词里都出现「请把整页做成这个风格：。」（plain 为空）');
console.log('   且 5/5 案的验收第 1 问出现「是不是「」这一种气质」（同一字段导致的第二处空槽）');
console.log('   S34 另有第二处矛盾：提示词要求 ≥3 个图片位置，而机制句写「全页零位图」');
console.log('   ⇒ 这 5 案的提示词当前产不出可判读的复刻，先修再测');

/* ---------- 3. 穷举补 2 案 ---------- */
const chromaBand = (c) => (c <= 25 ? 'chroma≤25' : c <= 59 ? 'chroma26-59' : 'chroma≥60');
const picBand = (p) => (p <= 1 ? 'pics0-1' : p <= 5 ? 'pics2-5' : p <= 7 ? 'pics6-7' : 'pics8-10');
const wordBand = (w) => (w < 200 ? 'words<200' : w < 500 ? 'words200-499' : w < 800 ? 'words500-799' : 'words≥800');
const STRATA = [
  ['tone', (r) => r.tone], ['chroma', (r) => chromaBand(r.chroma)], ['pics', (r) => picBand(r.minPics)],
  ['ground', (r) => r.ground], ['load', (r) => r.load], ['threshold', (r) => '门槛' + r.threshold],
  ['hard', (r) => (r.hard ? 'hard' : 'notHard')], ['gateFail', (r) => (r.gateFail > 0 ? 'fail>0' : 'fail=0')],
  ['words', (r) => wordBand(r.words)],
];
const keyId = new Map();
const maskOf = (r) => {
  let m = 0n;
  for (const [d, fn] of STRATA) { const k = d + '=' + fn(r); if (!keyId.has(k)) keyId.set(k, BigInt(keyId.size)); m |= 1n << keyId.get(k); }
  return m;
};
const masks = new Map(clean.map((r) => [r.id, maskOf(r)]));
const TOTAL_STRATA = keyId.size;
const pc = (x) => { let c = 0; while (x) { x &= x - 1n; c++; } return c; };

const anchor = UNION;                    // 6 案硬入选
const anchorMask = anchor.reduce((m, id) => m | masks.get(id), 0n);
const anchorStructs = new Set(anchor.map((id) => byId[id].structure));
const rest = clean.filter((r) => !anchor.includes(r.id));

const toneList = [...new Set(clean.map((r) => r.tone))];
function maximin(ids) {
  const c = new Map(toneList.map((t) => [t, 0]));
  for (const id of ids) c.set(byId[id].tone, c.get(byId[id].tone) + 1);
  return Math.min(...c.values());
}

console.log(`\n## 3. 锚定 ${anchor.length} 案（${anchor.join(' ')}）后，在剩 ${rest.length} 案里穷举补 2 案`);
console.log(`   锚点已覆盖 ${pc(anchorMask)}/${TOTAL_STRATA} 层，structure ${anchorStructs.size} 个，tone ${new Set(anchor.map((id) => byId[id].tone)).size}/7`);

const cmpArr = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
let best = [-1, -1, -1, -1], cands = [];
for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
  const ids = [...anchor, rest[i].id, rest[j].id];
  const m = masks.get(rest[i].id) | masks.get(rest[j].id) | anchorMask;
  const st = new Set([...anchorStructs, rest[i].structure, rest[j].structure]);
  const untested = ids.filter((x) => !ALREADY.includes(x)).length;
  const sc = [pc(m), st.size, untested, maximin(ids)];
  const c = cmpArr(sc, best);
  if (c > 0) { best = sc; cands = [[rest[i].id, rest[j].id]]; }
  else if (c === 0) cands.push([rest[i].id, rest[j].id]);
}
console.log(`   最优：层 ${best[0]}/${TOTAL_STRATA}  structure ${best[1]}  未复刻过 ${best[2]}  maximin ${best[3]}`);
console.log(`   并列 ${cands.length} 个: ${cands.map((c) => c.join('+')).join('  ')}`);

/* 并列里取案号字典序最小 */
cands.sort((x, y) => (x.join() < y.join() ? -1 : 1));
const pick = cands[0];
const FINAL = [...anchor, ...pick].sort();
console.log(`\n## 4. 最终方案（${FINAL.length} 案）`);
console.log(`   ${FINAL.join(' ')}`);

/* ---------- 5. 逐案陈列 ---------- */
console.log('\n## 5. 逐案：它替这次盲测回答什么问题');
const why = {
  S08: 'gate.fail=2 的老案（palette-terracotta / font-count），且 minPics 4 是全库第三少；检验闸门红着的案能不能被复刻对',
  S15: '唯一同时是 hard 且 chroma≤25 的案；834 字 + 三层叠纸，认知门槛与安静两头都压满',
  S18: 'hard，1188 字（全库最多）+ 暗底；检验"信息密度极高时提示词还保不保得住版式"',
  S21: 'hard，chroma 91（全库第二高）+ 亮底；与 S18 同为 hard 但方向相反，检验提示词对极值的控制',
  S22: 'chroma 12（全库最低）+ 726 字长文；不 hard 但极安静，是"安静不等于没做完"的对照',
  S29: 'hard，chroma 96（全库第三高）+ 1026 字；四条 hard 里的第四条，凑满 B 类全测',
};
const structWhy = {};
for (const id of FINAL) {
  const r = byId[id];
  structWhy[id] = `${r.tone} | ${r.structure} | chroma ${r.chroma} | pics ${r.minPics} | words ${r.words} | ${r.ground} | ${r.load} | 门槛${r.threshold} | gate.fail ${r.gateFail}${r.hard ? ' | hard' : ''}`;
}
for (const id of FINAL) {
  console.log(`\n   ${id}  ${byId[id].structure}`);
  console.log(`     ${structWhy[id]}`);
  console.log(`     角色：${why[id] || '（覆盖补位）'}`);
}

/* ---------- 6. 覆盖账 ---------- */
const finalMask = FINAL.reduce((m, id) => m | masks.get(id), 0n);
const miss = [...keyId.keys()].filter((k) => !(finalMask & (1n << keyId.get(k))));
console.log(`\n## 6. 覆盖账`);
console.log(`   层: ${pc(finalMask)}/${TOTAL_STRATA}  未覆盖: ${miss.join(' ; ') || '（全覆盖）'}`);
console.log(`   structure: ${new Set(FINAL.map((id) => byId[id].structure)).size}/23 —— ${[...new Set(FINAL.map((id) => byId[id].structure))].join(' ')}`);
const tc = new Map(toneList.map((t) => [t, 0])); for (const id of FINAL) tc.set(byId[id].tone, tc.get(byId[id].tone) + 1);
console.log(`   tone: ${tc.size}/7 —— ${[...tc.entries()].map(([t, n]) => t.split(' / ')[0] + '=' + n).join(' ')}`);
console.log(`   难点: ${FINAL.filter((id) => UNION.includes(id)).join(' ')}  （${FINAL.filter((id) => UNION.includes(id)).length}/6 可测难点案）`);
console.log(`   复用过: ${FINAL.filter((id) => ALREADY.includes(id)).join(' ') || '（无）'}`);

/* ---------- 7. 与 s06 纯覆盖最优对比 ---------- */
const S06 = JSON.parse(readFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s06-final.json'), 'utf8'));
console.log(`\n## 7. 与 s06（纯覆盖最优）对比`);
const s06ids = S06.chosen;
const s06Mask = s06ids.reduce((m, id) => m | masks.get(id), 0n);
console.log(`   s06      : ${s06ids.join(' ')}`);
console.log(`              层 ${pc(s06Mask)}/${TOTAL_STRATA}  structure ${new Set(s06ids.map((id) => byId[id].structure)).size}  难点 ${s06ids.filter((id) => UNION.includes(id)).length}/6  tone ${new Set(s06ids.map((id) => byId[id].tone)).size}/7`);
console.log(`   本方案   : ${FINAL.join(' ')}`);
console.log(`              层 ${pc(finalMask)}/${TOTAL_STRATA}  structure ${new Set(FINAL.map((id) => byId[id].structure)).size}  难点 ${FINAL.filter((id) => UNION.includes(id)).length}/6  tone ${tc.size}/7`);
console.log(`   ⇒ 本方案用 ${pc(s06Mask) - pc(finalMask)} 个层的覆盖，换 ${FINAL.filter((id) => UNION.includes(id)).length - s06ids.filter((id) => UNION.includes(id)).length} 个难点案。`);

writeFileSync(join(ROOT, 'deliverables/78-northstar/_probe/s07-anchored.json'), JSON.stringify({
  final: FINAL, anchor, picks: pick, cover: pc(finalMask), strataTotal: TOTAL_STRATA,
  structs: new Set(FINAL.map((id) => byId[id].structure)).size,
  hard: FINAL.filter((id) => UNION.includes(id)), excluded: [...BROKEN], used: USED,
}, null, 1));
console.log('\n→ s07-anchored.json 已写');
