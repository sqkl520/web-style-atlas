import { readFileSync } from 'node:fs';

/* 手工复现 check-contract.mjs 的 C4 全流程，对 R2-3 逐关打印 */
const CON = 'D:/Web/style/prototypes/_CONTRACT.md';
const con = readFileSync(CON, 'utf8');
const S = '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。';
const text = con.replace('## 10 ', S + '\n\n## 10 ');

const src = readFileSync('D:/Web/style/prototypes/_build/check-contract.mjs', 'utf8');

/* 取正则 */
const iRe = src.indexOf('const CLAIM_RE = ');
const jRe = src.indexOf('/g;', iRe);
const CLAIM_RE = eval(src.slice(iRe + 'const CLAIM_RE = '.length, jRe + 2));

/* 实测 FAIL：S13 的 findings */
const rep = JSON.parse(readFileSync('D:/Web/style/prototypes/S13-blind-debossed-dispatch/.inspect/report.json', 'utf8'));
const realSet = new Set(rep.findings.filter((f) => f.level === 'FAIL').map((f) => f.id));
console.log('S13 的 FAIL 规则:', [...realSet].join(', ') || '(无)');
console.log('realSet.has("shadow"):', realSet.has('shadow'));
console.log('');

/* C4 doc 列表里哪个是 _CONTRACT.md */
console.log('=== 逐 match 过闸 ===');
let n = 0;
for (const m of text.matchAll(CLAIM_RE)) {
  n++;
  const id = m[1];
  const claimedN = parseInt(m[2] ?? m[5], 10);
  const rule = m[3] ?? m[4];
  const win = text.slice(Math.max(0, m.index - 150), m.index + 260);
  console.log(`\n--- match ${n}: id=${id} n=${claimedN} rule=${rule} ---`);

  const isClaimOpen = /真未修|未修|未清|genuinely unresolved|no exemption|不在.*允许表/.test(win);
  const isRetracted = /是\*\*错的\*\*|是错的|已清账|已清|早就清|早已清|已修|was \*\*wrong\*\*|was wrong|cleared|no longer|不再欠/.test(win);
  console.log(`  isClaimOpen = ${isClaimOpen}`);
  console.log(`  isRetracted = ${isRetracted}`);
  if (isRetracted) {
    const mm = win.match(/是\*\*错的\*\*|是错的|已清账|已清|早就清|早已清|已修|was \*\*wrong\*\*|was wrong|cleared|no longer|不再欠/);
    console.log(`     撤回词: 「${mm[0]}」`);
    const pos = win.indexOf(mm[0]);
    console.log(`     撤回词在窗口内的位置: ${pos} / 窗口长 ${win.length}`);
    console.log(`     窗口片段: …${win.slice(Math.max(0, pos - 60), pos + 60).replace(/\n/g, ' ')}…`);
  }

  const sentences = win.split(/[。！？\n]/).filter((x) => x.trim());
  const CLAIM_CORE = /真未修|未修|未清|genuinely unresolved|还欠|仍欠/;
  const isMeta = sentences.some((x) => {
    const hasSubject = /本闸门|这条断言|检查器|check-contract|check-twolines|C[1-6]\b|该规则|这个工具/.test(x);
    const hasAction = /抓到|报出|检测到|发现|上线当天|会红|报\s*WARN|拦下|据此/.test(x);
    const negatedAction = /没有?发现|未发现|没报出|未报出|从未.{0,12}(检测|发现|报|清)|不报|只会据此放行|未被.{0,6}检测/.test(x);
    const meta = hasSubject && hasAction && !CLAIM_CORE.test(x) && !negatedAction;
    if (meta) console.log(`  [isMeta] 句子「${x.trim().slice(0, 50)}」→ 视为元描述，放过`);
    return meta;
  });
  console.log(`  isMeta = ${isMeta}`);
  console.log(`  → 结论: ${!isClaimOpen || isRetracted || isMeta ? '跳过（不计入 c4Checked）' : '**计入并判定**'}`);
}
console.log(`\n总匹配 ${n} 条`);
