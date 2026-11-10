/* 本轮缺陷的验收脚本：30 案 × （未填 / 已填）两种状态，逐案导出提示词并断言 5 条。
 *
 * 为什么用 Node + vm 而不是 CDP 跑 60 次页面：
 *  这里验的是**文本**（首行、长度、是否含用户原文），一次 DOM 无关的纯函数调用就够。
 *  浏览器那一半（输入框可见、可点、不撑破）另有 shot-opener.mjs 用真实鼠标事件测，
 *  两件事分开测才不会互相掩盖 —— 上一轮「复制按钮存在但写不进剪贴板」就是因为
 *  只测了 DOM 存在性。
 *
 * 对照组从 git 取（_orig/prompt-copy.js），不是我抄的数字：
 *  「现状 1617–1905」必须在本进程里重算一遍，否则我改完之后没法证明它是基准。
 *
 * 跑：node deliverables/65-exec/verify-opener.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadPromptCopy } from './_harness.mjs';

const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'deliverables/65-exec');
mkdirSync(join(OUT, '_out'), { recursive: true });

/* 固定的一份用户输入，两个字段都填。
 * 内容照 README L78 那个手写例子的口径写，但**不是**抄它：
 * 用它只是为了让"已填"这一档有真实形状（有行业、有细节、有动作），
 * 断言只看「用户输入原文是否出现」，与这句话写得好不好无关。 */
const BIZ = '一家只做手冲的咖啡店，5 个产区的豆子，加微信订、不做在线支付';
const ACTION = '看完就想问价，能直接加微信';

let pass = 0, fail = 0;
const rows = [];
function ok(cond, label, detail) {
  if (cond) { pass++; rows.push({ ok: true, label, detail }); }
  else { fail++; rows.push({ ok: false, label, detail }); }
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (detail ? '  ' + detail : ''));
}

const OLD = loadPromptCopy('deliverables/65-exec/_orig/prompt-copy.js');
const NEW = loadPromptCopy();
const ids = OLD.schemes;

console.log('== 0. 对照组 ==');
ok(ids.length === 30, '案数 30', String(ids.length));
ok(JSON.stringify(ids) === JSON.stringify(NEW.schemes), '新旧两版读到同一批案号');

const oldText = {}, emptyText = {}, filledText = {};
for (const id of ids) {
  oldText[id] = OLD.build(id);
  emptyText[id] = NEW.build(id);
  filledText[id] = NEW.build(id, { biz: BIZ, action: ACTION });
}

/* ── 先复现缺陷本身：证明我没有修一个不存在的问题 ────────────────────── */
console.log('\n== 0b. 缺陷复现（改动前那份代码）==');
const oldFirst = ids.map((id) => oldText[id].split('\n')[0]);
const uniqOld = [...new Set(oldFirst)];
ok(uniqOld.length === 1, '改动前 30 案首行只有 1 种写法', '种数=' + uniqOld.length);
console.log('     改动前首行原文：' + uniqOld[0]);
console.log('     第二行原文：  ' + oldText[ids[0]].split('\n')[1]);
const oldLens = ids.map((id) => oldText[id].length);
console.log('     改动前长度：' + Math.min(...oldLens) + '–' + Math.max(...oldLens));

/* ── 断言 1：未填时 30/30 首行不含假信息 ───────────────────────────── */
console.log('\n== 1. 未填：首行不含「一家小店」「有一些内容和图片」==');
const BANNED = ['一家小店', '有一些内容和图片', '让访客看懂我在做什么'];
const bad1 = ids.filter((id) => {
  const f = emptyText[id].split('\n')[0];
  return BANNED.some((b) => f.indexOf(b) >= 0);
});
ok(bad1.length === 0, '30/30 首行干净', bad1.length ? '命中：' + bad1.join(' ') : '命中 0 案');

/* 加固：整份提示词里也不该再有这两句 —— 只查首行会漏掉"挪到第二行"这种假修法。 */
const badWhole = ids.filter((id) => BANNED.some((b) => emptyText[id].indexOf(b) >= 0));
ok(badWhole.length === 0, '30/30 全文不含假信息', badWhole.length ? '命中：' + badWhole.join(' ') : '命中 0 案');

/* 未填时必须**明说自己不知道**，否则"不说假话"就退化成"什么都不说"，用户照样卡住。 */
const noSelfRef = ids.filter((id) => emptyText[id].indexOf('我不知道你做什么生意') < 0);
ok(noSelfRef.length === 0, '30/30 未填时都带自指提示', noSelfRef.length ? '缺：' + noSelfRef.join(' ') : '30/30 有');
const noSlot = ids.filter((id) => emptyText[id].split('\n').slice(1, 3).join('\n').indexOf('＿＿＿＿') < 0);
ok(noSlot.length === 0, '30/30 未填时留了 ＿＿ 待填横线', noSlot.length ? '缺：' + noSlot.join(' ') : '30/30 有');

/* ── 断言 2：已填时 30/30 首行含用户输入原文 ───────────────────────── */
console.log('\n== 2. 已填：首行含用户输入原文 ==');
const missBiz = ids.filter((id) => filledText[id].split('\n')[0].indexOf(BIZ) < 0);
const missAct = ids.filter((id) => filledText[id].split('\n')[1].indexOf(ACTION) < 0);
ok(missBiz.length === 0, '30/30 首行含 biz 原文', missBiz.length ? '缺：' + missBiz.join(' ') : '30/30 有');
ok(missAct.length === 0, '30/30 第二行含 action 原文', missAct.length ? '缺：' + missAct.join(' ') : '30/30 有');
const stillSlot = ids.filter((id) => filledText[id].indexOf('＿＿＿＿') >= 0);
ok(stillSlot.length === 0, '30/30 已填时不留空槽', stillSlot.length ? '残留：' + stillSlot.join(' ') : '无残留');

/* ── 断言 3：未填状态的长度不得比现状长超过 50 字 ─────────────────── */
console.log('\n== 3. 未填：长度 ≤ 现状 + 50 ==');
let worstGrow = -Infinity, worstId = '';
const over3 = [];
for (const id of ids) {
  const grow = emptyText[id].length - oldText[id].length;
  if (grow > worstGrow) { worstGrow = grow; worstId = id; }
  if (grow > 50) over3.push(id + '(+' + grow + ')');
}
ok(over3.length === 0, '30/30 未填长度未超现状 +50',
  over3.length ? '超：' + over3.join(' ') : '最大增幅 ' + worstId + ' +' + worstGrow);
const emptyLens = ids.map((id) => emptyText[id].length);
console.log('     未填长度区间：' + Math.min(...emptyLens) + '–' + Math.max(...emptyLens) +
  '（现状 ' + Math.min(...oldLens) + '–' + Math.max(...oldLens) + '）');

/* ── 断言 4：已填状态的长度 = 现状 + 用户输入长度 ±10 ─────────────── */
console.log('\n== 4. 已填：长度 = 现状 + 输入长度 ±10 ==');
const userLen = BIZ.length + ACTION.length;
console.log('     用户输入：biz ' + BIZ.length + ' 字 + action ' + ACTION.length + ' 字 = ' + userLen + ' 字');
const over4 = [];
/* 用 null 起始而不是 -Infinity：Math.abs(-Infinity) 是 Infinity，
 * 一旦用它做「谁的偏离更大」的初值，任何有限值都比不过，最后打印出一个假的 -Infinity。
 * 这个坑我在第一次跑的时候就踩到了 —— 断言全绿、汇总数字却是荒谬值，
 * 说明"断言通过"和"报告可信"是两件事，两个都得检查。 */
let worstDelta = null, worstDeltaId = '';
for (const id of ids) {
  const delta = filledText[id].length - oldText[id].length;     // 实际净增
  const err = delta - userLen;                                   // 与理想的偏离
  if (worstDelta === null || Math.abs(err) > Math.abs(worstDelta)) { worstDelta = err; worstDeltaId = id; }
  if (Math.abs(err) > 10) over4.push(id + '(净增' + delta + ' 偏离' + err + ')');
}
ok(over4.length === 0, '30/30 偏离在 ±10 内',
  over4.length ? '超出：' + over4.join(' ') : '最大偏离 ' + worstDeltaId + ' ' + (worstDelta >= 0 ? '+' : '') + worstDelta);
const filledLens = ids.map((id) => filledText[id].length);
console.log('     已填长度区间：' + Math.min(...filledLens) + '–' + Math.max(...filledLens));

/* ── 断言 5：单填一处时，另一处必须留槽并点名 ─────────────────────── */
console.log('\n== 5. 只填一处：另一处留槽 + 点名缺什么 ==');
const onlyBiz = ids.map((id) => NEW.build(id, { biz: BIZ }));
const onlyAct = ids.map((id) => NEW.build(id, { action: ACTION }));
ok(onlyBiz.every((t) => t.indexOf('我经营' + BIZ) >= 0 && t.indexOf('页面需要让访客＿＿＿＿') >= 0),
  '只填 biz：首行用 biz，动作留槽');
ok(onlyBiz.every((t) => t.split('\n')[0].indexOf('访客要做的动作') >= 0),
  '只填 biz：第一行点名缺的是「访客要做的动作」');
ok(onlyAct.every((t) => t.indexOf('我经营＿＿＿＿') >= 0 && t.indexOf('页面需要让访客' + ACTION) >= 0),
  '只填 action：动作用 action，经营留槽');
ok(onlyAct.every((t) => t.split('\n')[0].indexOf('你经营什么') >= 0),
  '只填 action：第一行点名缺的是「你经营什么」');

/* ── 断言 6：输入清洗（换行 / 超长）不能让提示词结构崩掉 ──────────── */
console.log('\n== 6. 输入清洗 ==');
const nl = NEW.build('S01', { biz: '咖啡店\n第二行', action: 'x' });
ok(nl.split('\n')[0].indexOf('\n') < 0 && nl.indexOf('咖啡店 第二行') >= 0,
  '输入里的换行被压成空格，不会多出一行');
const long = '甲'.repeat(200);
const longT = NEW.build('S01', { biz: long, action: 'x' });
ok(longT.indexOf('甲'.repeat(80)) >= 0 && longT.indexOf('甲'.repeat(81)) < 0,
  '超长输入截到 80 字');

/* ── 断言 7：老 opts 形状 { biz, what } 不能被静默吞掉 ──────────────── */
console.log('\n== 7. 老 opts 形状兼容（window.buildStylePrompt 是对外接口）==');
const legacy = NEW.build('S01', { biz: '咖啡店', what: '5 个产区的豆子', action: '看完想问价' });
ok(legacy.indexOf('我经营咖啡店，5 个产区的豆子。') >= 0,
  '按老签名传 { biz, what } 仍拼成「我经营{biz}，{what}。」', legacy.split('\n')[0]);
const legacyNoWhat = NEW.build('S01', { biz: '咖啡店', action: '看完想问价' });
ok(legacyNoWhat.indexOf('我经营咖啡店。') >= 0, '只传 biz 时不出多余的逗号', legacyNoWhat.split('\n')[0]);
const legacyWhatOnly = NEW.build('S01', { what: '5 个产区的豆子', action: '看完想问价' });
ok(legacyWhatOnly.indexOf('我经营5 个产区的豆子。') >= 0, '只传 what 时也不吞', legacyWhatOnly.split('\n')[0]);

/* ── 落盘：逐案三态全文，交付物里要贴的对比就取这里 ───────────────── */
const dump = {};
for (const id of ids) {
  dump[id] = {
    oldFirst: oldText[id].split('\n')[0],
    oldLen: oldText[id].length,
    emptyFirst: emptyText[id].split('\n')[0],
    emptyLen: emptyText[id].length,
    filledFirst: filledText[id].split('\n')[0],
    filledSecond: filledText[id].split('\n')[1],
    filledLen: filledText[id].length,
  };
}
writeFileSync(join(OUT, '_out', 'opener-cases.json'), JSON.stringify(dump, null, 1), 'utf8');
writeFileSync(join(OUT, '_out', 'sample-S01-empty.txt'), emptyText.S01, 'utf8');
writeFileSync(join(OUT, '_out', 'sample-S01-filled.txt'), filledText.S01, 'utf8');
writeFileSync(join(OUT, '_out', 'sample-S16-empty.txt'), emptyText.S16, 'utf8');
writeFileSync(join(OUT, '_out', 'sample-S30-filled.txt'), filledText.S30, 'utf8');

/* ── 逐案表格（终端里直接看差异）──────────────────────────────────── */
console.log('\n== 逐案：长度 现状 → 未填 / 已填 ==');
console.log('案号  现状   未填   Δ未填   已填   Δ已填');
for (const id of ids) {
  const h = (n) => String(n).padStart(5);
  console.log(id + h(oldText[id].length) + h(emptyText[id].length) +
    h(emptyText[id].length - oldText[id].length) +
    h(filledText[id].length) + h(filledText[id].length - oldText[id].length));
}

console.log('\n== 汇总 ==');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
process.exit(fail ? 1 : 0);
