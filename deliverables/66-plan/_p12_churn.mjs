// P12：边际收益测度 —— 后一轮改动里，有多少行是在改前几轮刚写下的行（返工率）
// 口径：对每个 commit，取出它新增的行（以文件+内容近似判断），看后续 commit 是否把同一文件的
//       相近区域再改一次；同时算「同文件重复触碰」与「同一功能文件集合的重复率」。
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE } from './_lib.mjs';

const sh = (c) => execSync(c, { cwd: 'D:/Web/style', encoding: 'utf8', maxBuffer: 1 << 28 });
const COMMITS = ['eec843f', 'cea8436', '87a0235', 'd669ddb', 'e08ba2d', 'a56426e', 'a0c0d54'];

const meta = {};
for (const c of COMMITS) {
  const out = sh(`git show --numstat --format="" ${c}`);
  const files = {};
  let add = 0, del = 0;
  for (const line of out.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [a, d, ...rest] = line.split('\t');
    const f = rest.join('\t');
    files[f] = { add: +a || 0, del: +d || 0 };
    add += +a || 0; del += +d || 0;
  }
  const body = sh(`git log -1 --format=%B ${c}`);
  meta[c] = { files, add, del, body };
}

console.log('== 7 个 commit 的规模 ==');
for (const c of COMMITS) {
  const m = meta[c];
  const code = Object.keys(m.files).filter((f) => /^(prototypes|templates)\//.test(f) && /\.(js|mjs|css|html|md)$/.test(f));
  console.log(`  ${c}  +${m.add}/-${m.del}  文件 ${Object.keys(m.files).length}（其中源码 ${code.length}）  ${m.body.split('\n')[0].slice(0, 40)}`);
}

// 返工：commit N 新增的代码行，被后续某个 commit 在同一文件里删除/改写的比例
console.log('\n== 返工：本轮新增的可执行源码行，被后续轮次再次改动 ==');
const CODE = /\.(js|mjs|css|html)$/;
let totalAdd = 0, totalRework = 0;
for (let i = 0; i < COMMITS.length; i++) {
  const c = COMMITS[i];
  const codeFiles = Object.keys(meta[c].files).filter((f) => CODE.test(f) && /^(prototypes|templates)\//.test(f));
  let add = 0, touched = 0;
  for (const f of codeFiles) {
    add += meta[c].files[f].add;
    // 后续每个 commit 对这个文件动了多少行（删+改）
    let laterDel = 0;
    for (let j = i + 1; j < COMMITS.length; j++) {
      const m2 = meta[COMMITS[j]].files[f];
      if (m2) laterDel += m2.del;
    }
    touched += Math.min(laterDel, meta[c].files[f].add);
  }
  totalAdd += add; totalRework += touched;
  console.log(`  ${c}: 新增源码行 ${String(add).padStart(5)}；其中被后续轮次删改 ${String(touched).padStart(5)}  → 返工 ${(add ? Math.round((touched / add) * 100) : 0)}%   [${codeFiles.map((f) => f.split('/').pop()).join(' ')}]`);
}
console.log(`\n合计：新增源码行 ${totalAdd}，被后续轮次删改 ${totalRework} → 返工率 ${Math.round((totalRework / totalAdd) * 100)}%`);

// 同文件被连续 3 轮以上触碰
console.log('\n== 同一文件被这 7 轮里 ≥4 次触碰 ==');
const freq = {};
for (const c of COMMITS) for (const f of Object.keys(meta[c].files)) freq[f] = (freq[f] || 0) + 1;
Object.entries(freq).filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1])
  .forEach(([f, n]) => console.log(`  ${n}× ${f}`));

// commit body 里自认的"上一轮遗留/我修过又错"
console.log('\n== commit body 里自认的返工/自我纠正 ==');
const SELF = /上一轮|上轮|我上次|我上条|返工|回滚|纠正我|我算错|假陈述|不完整|未跟上|落空/;
for (const c of COMMITS) {
  const hits = meta[c].body.split('\n').filter((l) => SELF.test(l));
  if (hits.length) { console.log(`  ${c}:`); hits.slice(0, 6).forEach((l) => console.log('     ' + l.trim().slice(0, 150))); }
}
writeFileSync(join(HERE, 'p12-churn.json'), JSON.stringify({ meta: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, { add: v.add, del: v.del, files: v.files, body: v.body }])) }, null, 1), 'utf8');
