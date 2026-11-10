// P8：仓库里已有的「端到端实测」产物 —— 62 号那三份 AI 按提示词生成的实现，
//     逐份数它到底排了几个条目，与提示词里那句「我实际有 N 个」对照。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const IMPL = join(ROOT, 'deliverables', '62-verify', 'impl');
const PR = join(ROOT, 'deliverables', '62-verify', 'prompts');

const count = (h) => {
  const body = h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const t = {};
  for (const m of body.matchAll(/<([a-z][a-z0-9]*)\b/g)) t[m[1]] = (t[m[1]] || 0) + 1;
  return t;
};

for (const id of ['S07', 'S23', 'S30']) {
  const pf = join(PR, id + '.txt');
  const hf = join(IMPL, id + '.html');
  if (!existsSync(hf)) { console.log(id + '：无 impl'); continue; }
  const prompt = readFileSync(pf, 'utf8');
  const html = readFileSync(hf, 'utf8');
  const m = prompt.match(/我实际有 (\d+) 个条目，就排 (\d+) 个/);
  const N = m ? +m[1] : null;
  const t = count(html);
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // 编号 001..NNN 是否连续出现
  const nums = [...html.matchAll(/\b0(\d{2})\b/g)].map((x) => +x[1]);
  const uniq = [...new Set(nums)].filter((x) => x >= 1 && x <= 60).sort((a, b) => a - b);
  console.log(`\n=== ${id} ===`);
  console.log(`  提示词说「我实际有 ${N} 个条目，就排 ${N} 个」`);
  console.log(`  提示词里还有：` + (prompt.split('\n').filter((l) => /按你真实|收敛|凑数|空位/.test(l)).map((l) => '「' + l.trim().slice(0, 60) + '」').join(' ')));
  console.log(`  AI 实际产出：article=${t.article || 0}  h3=${t.h3 || 0}  li=${t.li || 0}  figure=${t.figure || 0}  p=${t.p || 0}`);
  console.log(`  h1 = 「${h1}」`);
  console.log(`  h1 里出现数字 ${N} 吗：${h1.includes(String(N)) || /四十六|二十三|三十/.test(h1) ? 'YES' : 'no'}`);
  console.log(`  两位编号唯一值个数 = ${uniq.length}；范围 ${uniq[0]}–${uniq[uniq.length - 1]}`);
  console.log(`  图片位 figure=${t.figure || 0} img=${t.img || 0}`);
  const hit = (t.article || 0) === N || (t.li || 0) === N || (t.h3 || 0) === N;
  console.log(`  ⇒ 条目数 == 提示词里的 N ?  ${hit ? 'YES（照 N 排了）' : 'NO'}`);
}
