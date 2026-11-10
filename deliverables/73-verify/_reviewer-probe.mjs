/* 锐评 Agent 独立探针：不复用交付方的 hay 构造与字体名正则。
 * 目的：① 逐字节核对 data.js 是纯改名；② 独立模拟 app.js:239 的 hay；
 *       ③ 攻击 `|| r.fonts` 兜底；④ 找出所有仍读 r.fonts 的消费者。
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = 'D:/Web/style';
const SEL = ROOT + '/prototypes/_selection';
const parse = (src) => JSON.parse(src.match(/window\.SCHEMES\s*=\s*(\[[\s\S]*\])\s*;/)[1]);

const now = parse(readFileSync(SEL + '/data.js', 'utf8'));
const head = parse(execSync('git show HEAD:prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }));

console.log('═══ A) 键集合对比（HEAD vs NOW）═══');
const keysOf = (arr) => [...new Set(arr.flatMap((r) => Object.keys(r)))].sort();
const hk = keysOf(head), nk = keysOf(now);
console.log('  HEAD 键数', hk.length, '| NOW 键数', nk.length);
console.log('  只在 HEAD：', hk.filter((k) => !nk.includes(k)).join(',') || '（无）');
console.log('  只在 NOW ：', nk.filter((k) => !hk.includes(k)).join(',') || '（无）');
console.log("  'fonts' in r 计数 NOW :", now.filter((r) => 'fonts' in r).length, '/30');
console.log("  'fontsSpec' in r NOW  :", now.filter((r) => 'fontsSpec' in r).length, '/30');
/* 除 fonts 外，逐案逐键深比较，找出改名以外的任何变化 */
const deepDiff = [];
for (const r of now) {
  const h = head.find((x) => x.id === r.id);
  if (!h) { deepDiff.push(r.id + ':HEAD 缺'); continue; }
  const ks = new Set([...Object.keys(h), ...Object.keys(r)]);
  for (const k of ks) {
    if (k === 'fonts' || k === 'fontsSpec') continue;
    const a = JSON.stringify(h[k]), b = JSON.stringify(r[k]);
    if (a !== b) deepDiff.push(`${r.id}.${k}: HEAD=${String(a).slice(0, 40)} NOW=${String(b).slice(0, 40)}`);
  }
}
console.log('  非改名键的差异条数:', deepDiff.length);
deepDiff.slice(0, 10).forEach((d) => console.log('    ', d));

console.log('\n═══ B) 独立模拟 app.js:239 的 hay（逐字段按源码重建）═══');
/* 严格照 app.js:239-243 的字段清单，一处不多一处不少 */
const buildHay = (r) => {
  const ax = r.axes || {};
  return [r.id, r.cn, r.en, r.family, r.fontsSpec || r.fonts, r.def, r.tone, r.structure,
    r.errorCode, r.threshold, r.layout, r.visuals, r.quirk, r.scenesYes,
    ax.ground, ax.band, ax.load, ax.loud, (r.palette || []).join(' ')].join(' ').toLowerCase();
};
let inHay = 0; const notIn = [];
for (const r of now) {
  const hay = buildHay(r);
  const spec = String(r.fontsSpec || '');
  /* 判据：fontsSpec 的整串（去空白、小写）必须完整出现在 hay 里。
     这是比"第一个字体名"强得多的判据——任何一个字符丢了都会失败。 */
  if (spec && hay.includes(spec.toLowerCase())) inHay++;
  else notIn.push(r.id);
}
console.log(`  fontsSpec 整串完整落入 hay: ${inHay}/30`);
if (notIn.length) console.log('    失败:', notIn.join(' '));

console.log('\n  ── 用「只在该案 fontsSpec 里出现」的片段反查（排除被别的字段兜住的假阳性）──');
let uniqOk = 0; const uniqFail = [], uniqMasked = [];
for (const r of now) {
  const spec = String(r.fontsSpec || '');
  /* 取 fontsSpec 里 24 字的窗口，要求它在该案其他字段里 0 次出现，且在全批其他案 0 次出现 */
  let probe = null;
  for (let i = 0; i + 24 <= spec.length; i += 3) {
    const w = spec.slice(i, i + 24);
    const others = [r.id, r.cn, r.en, r.family, r.def, r.tone, r.structure, r.errorCode,
      r.threshold, r.layout, r.visuals, r.quirk, r.scenesYes, (r.palette || []).join(' ')].join(' ').toLowerCase();
    const otherCasesHit = now.filter((x) => x.id !== r.id && String(x.fontsSpec || '').toLowerCase().includes(w.toLowerCase())).length;
    if (!others.includes(w.toLowerCase()) && otherCasesHit === 0) { probe = w; break; }
  }
  if (!probe) { uniqMasked.push(r.id); continue; }
  if (buildHay(r).includes(probe.toLowerCase())) uniqOk++;
  else uniqFail.push(r.id + '/' + probe);
}
console.log(`    唯一片段命中: ${uniqOk}/30，未命中 ${uniqFail.length}，找不到唯一片段 ${uniqMasked.length}`);
if (uniqFail.length) console.log('    未命中:', uniqFail.join(' '));
if (uniqMasked.length) console.log('    无唯一片段:', uniqMasked.join(' '));

console.log('\n═══ C) 攻击 `|| r.fonts` 兜底 ═══');
/* 情形 1：fontsSpec 为空串（真实空值缺陷） */
for (const val of ['', undefined, null]) {
  const fake = { fontsSpec: val, fonts: undefined };
  const got = fake.fontsSpec || fake.fonts;
  console.log(`  fontsSpec=${JSON.stringify(val)} → 表达式得到 ${JSON.stringify(got)}（falsy=${!got}）`);
}
/* 情形 2：模拟"改了生成器、data.js 没重跑"——data.js 仍是旧键名 */
console.log('  旧 data.js（只有 fonts）→ 兜底读到:', ({ fontsSpec: undefined, fonts: '旧字符串' }).fontsSpec || '旧字符串');
console.log('  ⇒ 兜底救得了「生成器改了没重跑」，但代价见下：');
/* 情形 3：data.js 里 fonts 与 fontsSpec 同时存在且内容不同 → 兜底会选 fontsSpec，静默吞掉不一致 */
const both = { fontsSpec: '新', fonts: '旧但仍在' };
console.log('  两键并存时读到的:', both.fontsSpec || both.fonts, '（另一份被静默忽略，无任何告警）');

console.log('\n═══ D) data.js 的 diff 逐行归类（是否纯改名）═══');
const ud = execSync('git diff -U0 -- prototypes/_selection/data.js', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
const minus = ud.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---'));
const plus = ud.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
console.log(`  删除行 ${minus.length} / 新增行 ${plus.length}`);
const isFont = (l) => /^\-\s+"fonts":/.test(l);
const isSpec = (l) => /^\+\s+"fontsSpec":/.test(l);
const isAt = (l) => /^\+\s+"at":/.test(l);
console.log('  删除行=("fonts":)', minus.filter(isFont).length);
console.log('  新增行=("fontsSpec":)', plus.filter(isSpec).length);
console.log('  新增行=("at":) —— 非改名的时间戳副作用:', plus.filter(isAt).length);
console.log('  删除行中 "at" :', minus.filter((l) => /^\-\s+"at":/.test(l)).length);
const otherPlus = plus.filter((l) => !isSpec(l) && !isAt(l));
const otherMinus = minus.filter((l) => !isFont(l) && !/^\-\s+"at":/.test(l));
console.log('  其余新增行:', otherPlus.length, otherPlus.map((l) => l.slice(0, 70)).join(' | ') || '（无）');
console.log('  其余删除行:', otherMinus.length, otherMinus.map((l) => l.slice(0, 70)).join(' | ') || '（无）');
/* 内容逐字符：每个 fonts 行去掉键名后应与对应 fontsSpec 行完全一致 */
const mNorm = (l) => l.slice(1).replace(/^\s+"fonts(Spec)?":/, '"K":');
const mMinus = minus.filter(isFont).map(mNorm);
const mPlus = plus.filter(isSpec).map(mNorm);
console.log('  30 对「去键名后逐字符相同」:', mMinus.filter((m, i) => m === mPlus[i]).length, '/', mMinus.length);
