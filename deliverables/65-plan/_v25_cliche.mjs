// 裁决 1 收尾：所谓「提示词缺的 53 个参数」里，多少是「AI 陈辞本身」而非设计参数？
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const t = readFileSync(resolve('prototypes/_selection/data.js'), 'utf8');
const rows = JSON.parse(t.slice(t.indexOf('= ') + 2).replace(/;\s*$/, ''));
const PL = JSON.parse(readFileSync(resolve('deliverables/65-plan/_v_out/promptlen.json'), 'utf8'));

const params = (s) => [...String(s).matchAll(/(\d+(?:\.\d+)?)\s*(px|°|%|mm|ms|em|栏|级)/g)].map((m) => (m[1] + m[2]).replace(/\s+/g, ''));

// 对每个缺失参数，打印它出现的上下文窗口，判断是「命名陈辞」还是「本案设计值」
console.log('=== 缺失参数的上下文（判断是陈辞还是设计值）===');
const CLICHE = /C-\d|P\d|反\s*C|通病|陈辞|套路|不该|不要|禁止|不得|AI/;
let clicheNum = 0, designNum = 0;
const detailRows = [];
for (const r of rows) {
  const p = PL.prompts[r.id];
  const audit = String(r.audit || '');
  for (const m of audit.matchAll(/(\d+(?:\.\d+)?)\s*(px|°|%|mm|ms|em|栏|级)/g)) {
    const key = (m[1] + m[2]).replace(/\s+/g, '');
    if (p.includes(key)) continue;
    const i = m.index;
    const ctx = audit.slice(Math.max(0, i - 40), i + 26);
    // 判定：该数值所在分句里有没有 C-/P 编号或「不得/不要」等否定语
    const clause = audit.slice(Math.max(0, audit.lastIndexOf('；', i) + 1), audit.indexOf('。', i) < 0 ? audit.length : audit.indexOf('。', i));
    const isCliche = CLICHE.test(clause) || /不(?:得|要|应|许)|禁止|反/.test(clause.slice(0, 60));
    if (isCliche) clicheNum++; else designNum++;
    detailRows.push({ id: r.id, key, isCliche, ctx: ctx.replace(/\s+/g, ' '), clause: clause.slice(0, 70) });
  }
}
console.log(`缺失参数出现次数（含重复）：陈辞语境 ${clicheNum} ｜设计值语境 ${designNum}`);
console.log('\n=== 「设计值语境」的逐条（这些才是真新增信息）===');
for (const x of detailRows.filter((y) => !y.isCliche)) {
  console.log(`  ${x.id} [${x.key}] …${x.ctx}…`);
}
