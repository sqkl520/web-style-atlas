// V1 完整复验（修正版：page.eval 只接受单个参数，必须打包成对象）
// 覆盖：未填 / 已填(44字) / 只填 biz / 只填 action，取全文验首行，并与 UI hint 交叉验证
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

// 任务书里 Agent 声称的口径：输入总长 44 字 → 净增 +49（偏离恒 +5）
const BIZ44 = '一家只做手冲的咖啡店，五个产区的豆子';      // 19
const ACT44 = '看完想直接加微信问价或者到店里坐下来喝一杯'; // 21
// 19+21 = 40；再补 4 字凑到 44
const BIZ = '一家只做手冲的咖啡店，五个产区的单一豆子';      // 20
const ACT = '看完想直接加微信问价，或者到店里坐下来喝一杯手冲'; // 24
// 20+24 = 44

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(PAGE, { settleMs: 1200 });

const probe = await page.eval(() => ({ build: typeof window.buildStylePrompt, n: window.SCHEMES.length }));
console.log(`buildStylePrompt=${probe.build} schemes=${probe.n}`);
console.log(`输入长度：biz=${BIZ.length} act=${ACT.length} 合计=${BIZ.length + ACT.length}\n`);

const scenarios = {
  empty: {},
  both44: { biz: BIZ, action: ACT },
  onlyBiz: { biz: BIZ },
  onlyAct: { action: ACT },
};

const data = {};
for (const [k, opts] of Object.entries(scenarios)) {
  data[k] = await page.eval((o) => window.SCHEMES.map((s) => {
    const t = window.buildStylePrompt(s.id, o.opts);
    return { id: s.id, len: t.length, first: t.split('\n')[0], head: t.slice(0, 300) };
  }), { opts });
}

// UI 交叉验证：点行卡 → 读 hint → 真实键入（用 CDP Input 插字更真实）→ 读 hint
const ui = [];
for (const s of data.empty) {
  const r = await page.eval((o) => {
    const row = document.querySelector('.row[data-id="' + o.id + '"]');
    if (row) row.click();
    const h = document.querySelector('.prompt-hint');
    const bi = document.querySelector('[data-prompt-field="biz"]');
    const ai = document.querySelector('[data-prompt-field="action"]');
    const before = h ? h.textContent.trim() : null;
    bi.value = o.biz; ai.value = o.act;
    bi.dispatchEvent(new Event('input', { bubbles: true }));
    const after = h ? h.textContent.trim() : null;
    // 手工兜底 textarea 路径：让它走手动复制，从 textarea 取全文
    return { id: o.id, before, after };
  }, { id: s.id, biz: BIZ, act: ACT });
  ui.push(r);
}

const numOf = (s) => { const m = String(s || '').match(/(\d+)\s*字/); return m ? +m[1] : null; };
const FAKE = ['一家小店', '有一些内容和图片', '让访客看懂我在做什么', '让访客看懂我在做'];
const rep = (k) => {
  const rows = data[k];
  const lens = rows.map((r) => r.len).sort((a, b) => a - b);
  const fake = rows.filter((r) => FAKE.some((f) => r.first.includes(f)));
  return { lens, min: lens[0], max: lens[lens.length - 1], med: lens[15], fake: fake.length, rows };
};

const E = rep('empty'), B = rep('both44'), OB = rep('onlyBiz'), OA = rep('onlyAct');
const deltas = B.rows.map((r) => r.len - E.rows.find((x) => x.id === r.id).len);
const uniq = [...new Set(deltas)];

console.log('=== 长度 ===');
console.log(`未填   : ${E.min}–${E.max} 中位 ${E.med}`);
console.log(`双填44 : ${B.min}–${B.max} 中位 ${B.med}   净增量集合 ${JSON.stringify(uniq)}`);
console.log(`仅biz  : ${OB.min}–${OB.max} 净增量集合 ${JSON.stringify([...new Set(OB.rows.map((r) => r.len - E.rows.find((x) => x.id === r.id).len))])}`);
console.log(`仅act  : ${OA.min}–${OA.max} 净增量集合 ${JSON.stringify([...new Set(OA.rows.map((r) => r.len - E.rows.find((x) => x.id === r.id).len))])}`);

console.log('\n=== 首行 ===');
console.log(`未填首行含假模板(一家小店等)的案数: ${E.fake}/30`);
const uniqFirst = [...new Set(E.rows.map((r) => r.first))];
console.log(`未填首行去重后种类数: ${uniqFirst.length}`);
uniqFirst.forEach((f) => console.log(`   「${f}」`));
const filledFirst = B.rows.filter((r) => r.first.includes(BIZ));
console.log(`已填首行含用户原文的案数: ${filledFirst.length}/30`);
console.log(`已填首行样本: 「${B.rows[0].first}」`);
console.log(`仅填biz 首行样本: 「${OB.rows[0].first}」`);
console.log(`仅填act 首行样本: 「${OA.rows[0].first}」`);
const slotMissing = OB.rows.filter((r) => r.head.includes('＿＿＿＿')).length;
console.log(`仅填 biz 时仍留空槽的案数: ${slotMissing}/30`);

console.log('\n=== UI hint 与 buildStylePrompt 交叉 ===');
const mismatch = ui.filter((u) => numOf(u.before) !== E.rows.find((x) => x.id === u.id).len || numOf(u.after) !== B.rows.find((x) => x.id === u.id).len);
console.log(`hint 与真值一致的案数: ${30 - mismatch.length}/30`);
if (mismatch.length) mismatch.slice(0, 5).forEach((m) => {
  const e = E.rows.find((x) => x.id === m.id).len, b = B.rows.find((x) => x.id === m.id).len;
  console.log(`   ${m.id}: hint ${numOf(m.before)}/${numOf(m.after)} vs real ${e}/${b}  「${m.after}」`);
});
console.log(`hint 原文 S01 未填: 「${ui[0].before}」`);
console.log(`hint 原文 S01 已填: 「${ui[0].after}」`);

writeFileSync(join(HERE, 'v1-prompts.json'), JSON.stringify({ input: { biz: BIZ, act: ACT, len: BIZ.length + ACT.length }, data, ui }, null, 2), 'utf8');
await browser.close();
