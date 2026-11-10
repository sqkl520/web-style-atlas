// V1 验证：提示词首行是否还说假话 + 长度增量
// 路径：CDP 打开 file:// 选型台 → window.buildStylePrompt(id) 直接取全文（它在 prompt-copy.js:713 对外暴露）
//      + 交叉验证 UI 上 hint 的字数是否与之一致
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');

const FAKE = ['一家小店', '有一些内容和图片', '让访客看懂我在做什么'];

const browser = await Browser.launch({ width: 1440, height: 900 });
const page = await browser.newPage({ width: 1440, height: 900, dsf: 1 });
await page.goto(PAGE, { settleMs: 1200 });

// 暴露情况自检
const probe = await page.eval(() => ({
  hasBuild: typeof window.buildStylePrompt,
  hasMount: typeof window.mountPromptButton,
  schemes: window.SCHEMES ? window.SCHEMES.length : -1,
  ids: window.SCHEMES ? window.SCHEMES.map((s) => s.id) : [],
}));
console.log(`buildStylePrompt = ${probe.hasBuild} / mountPromptButton = ${probe.hasMount} / schemes = ${probe.schemes}`);
if (probe.hasBuild !== 'function') { console.error('!! buildStylePrompt 未暴露，改用 UI 路径'); }

const empty = await page.eval(() =>
  window.SCHEMES.map((s) => {
    const t = window.buildStylePrompt(s.id);
    return { id: s.id, len: t.length, first: t.split('\n')[0], head: t.slice(0, 260) };
  }));

const INPUT_BIZ = '只做手冲的咖啡店';
const INPUT_ACT = '加微信订豆子';
const filled = await page.eval(([biz, act]) =>
  window.SCHEMES.map((s) => {
    const t = window.buildStylePrompt(s.id, { biz, action: act });
    return { id: s.id, len: t.length, first: t.split('\n')[0], head: t.slice(0, 260) };
  }), [INPUT_BIZ, INPUT_ACT]);

// UI 交叉验证：真实路径（打开详情 → 读 hint → 填 input → 再读 hint）
const ui = await page.eval(([biz, act]) => {
  const out = [];
  for (const s of window.SCHEMES) {
    if (location.hash !== '#' + s.id) location.hash = '#' + s.id;
    document.dispatchEvent(new HashChangeEvent('hashchange'));
    const h = document.querySelector('.prompt-hint');
    const before = h ? h.textContent : null;
    const bi = document.querySelector('[data-prompt-field="biz"]');
    const ai = document.querySelector('[data-prompt-field="action"]');
    let after = null;
    if (bi && ai) {
      bi.value = biz; ai.value = act;
      bi.dispatchEvent(new Event('input', { bubbles: true }));
      after = h ? h.textContent : null;
    }
    out.push({ id: s.id, before, after, hasFields: !!(bi && ai) });
  }
  return out;
}, [INPUT_BIZ, INPUT_ACT]);

const numOf = (s) => { const m = String(s || '').match(/(\d+)\s*字/); return m ? +m[1] : null; };
const row = [];
for (const e of empty) {
  const f = filled.find((x) => x.id === e.id);
  const u = ui.find((x) => x.id === e.id);
  row.push({
    id: e.id,
    lenEmpty: e.len, lenFilled: f.len, delta: f.len - e.len,
    uiBefore: numOf(u.before), uiAfter: numOf(u.after),
    firstEmpty: e.first, firstFilled: f.first,
  });
}

const fakeHits = row.filter((r) => FAKE.some((k) => r.firstEmpty.includes(k)));
const userInFirst = row.filter((r) => r.firstFilled.includes(INPUT_BIZ));
const deltas = [...new Set(row.map((r) => r.delta))];
const lenE = row.map((r) => r.lenEmpty).sort((a, b) => a - b);
const lenF = row.map((r) => r.lenFilled).sort((a, b) => a - b);
const uiMismatch = row.filter((r) => r.uiBefore !== r.lenEmpty || r.uiAfter !== r.lenFilled);

console.log('\n=== V1 汇总 ===');
console.log(`未填：${lenE[0]}–${lenE[lenE.length - 1]}（中位 ${lenE[15]}）`);
console.log(`已填：${lenF[0]}–${lenF[lenF.length - 1]}（中位 ${lenF[15]}），输入长度 biz=${INPUT_BIZ.length} act=${INPUT_ACT.length} 共 ${INPUT_BIZ.length + INPUT_ACT.length}`);
console.log(`净增量取值集合：${JSON.stringify(deltas)}`);
console.log(`首行含假模板的案数：${fakeHits.length} / 30  ${fakeHits.map((h) => h.id).join(' ')}`);
console.log(`已填首行含用户原文的案数：${userInFirst.length} / 30`);
console.log(`UI hint 与 buildStylePrompt 字数不一致的案：${uiMismatch.length}  ${uiMismatch.map((m) => `${m.id}(hint ${m.uiBefore}/${m.uiAfter} vs real ${m.lenEmpty}/${m.lenFilled})`).join(' ')}`);
console.log(`全部 30 案 UI 上都有两个输入框：${ui.every((u) => u.hasFields)}`);

console.log('\n=== 首行样本（未填 / 已填）===');
for (const id of ['S01', 'S13', 'S30']) {
  const r = row.find((x) => x.id === id);
  console.log(`  ${id} 未填首行: ${r.firstEmpty}`);
  console.log(`  ${id} 已填首行: ${r.firstFilled}`);
}

writeFileSync(join(HERE, 'v1-prompts.json'), JSON.stringify({ input: { biz: INPUT_BIZ, act: INPUT_ACT }, rows: row, empty, filled }, null, 2), 'utf8');
// 存全文以便逐字核对首行
writeFileSync(join(HERE, 'v1-fulltext.txt'), empty.map((e) => `----- ${e.id} 未填 ${e.len} -----\n${e.head}`).join('\n\n'), 'utf8');

await browser.close();
