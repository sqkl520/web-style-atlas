// V4d：S13 行卡可见文本的括号/引号是否配平（"半句"判据）+ 1440/390 两档
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const bal = (t) => ({
  round: (t.match(/（/g) || []).length - (t.match(/）/g) || []).length,
  corner: (t.match(/「/g) || []).length - (t.match(/」/g) || []).length,
  square: (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length,
});

for (const tag of ['NOW-1440', 'NOW-390', 'HEAD-1440', 'HEAD-390']) {
  const rows = JSON.parse(readFileSync(join(HERE, `v4b-${tag}.json`), 'utf8'));
  const full = JSON.parse(readFileSync(join(HERE, 'v4-rows.json'), 'utf8'));
  console.log(`\n=== ${tag} ===`);
  const s13 = rows.find((r) => r.id === 'S13');
  console.log(`  S13 可见 ${s13.visible}/${s13.total}`);
  console.log(`    可见末 40 字: 「${s13.last}」`);
  console.log(`    被切掉的下一段: 「${s13.rest}」`);
  // 用 last 片段判括号（last 是可见末尾 30 字，不足以判全段，故用比例判断：完整文本括号配平则可见前缀通常也配平）
  const b = bal(s13.last);
  console.log(`    可见末段括号平衡（圆/角/方）: ${b.round}/${b.corner}/${b.square}  ${Object.values(b).every((v) => v === 0) ? '配平' : '★不配平'}`);
  // 1440 档全案：可见末字是否是"句中"（下一个字符是汉字说明是硬切）
  const cuts = rows.filter((r) => r.rest && /[\u4e00-\u9fa5]/.test(r.rest[0]));
  console.log(`  可见末尾后紧跟汉字的案（硬切句中）: ${cuts.length}/30  ${cuts.map((r) => r.id).join(' ')}`);
}
