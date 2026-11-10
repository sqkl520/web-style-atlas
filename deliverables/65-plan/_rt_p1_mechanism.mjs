// 探针 1：specs 里的「机制」段 vs _prompts/mechanisms.mjs 的 MECHANISMS
// 目标：判断 collect-schemes.mjs 的 FIELDS 里那项「机制」到底是不是"孤儿"。
import { splitSpec, rawSpec, ids } from './_rt_lib.mjs';
import { MECHANISMS } from '../../prototypes/_prompts/mechanisms.mjs';

const IDS = ids();
console.log('方案数：' + IDS.length + '｜MECHANISMS 条数：' + Object.keys(MECHANISMS).length);
console.log('');

const rows = [];
for (const id of IDS) {
  const text = rawSpec(id);
  const { fields, marks } = splitSpec(text);
  // 抓所有含"机制"字样的字段 key
  const mechKeys = Object.keys(fields).filter((k) => k.includes('机制'));
  const hasAtt = mechKeys.some((k) => k.startsWith('附:'));
  const attKey = mechKeys.find((k) => k.startsWith('附:'));
  const plainKey = mechKeys.find((k) => !k.startsWith('附:'));
  const attText = attKey ? fields[attKey].text : '';
  const plainText = plainKey ? fields[plainKey].text : '';
  // 宽松兜底：全文找 "…的机制）：" 这种行
  const loose = /^(\d{1,2})-附[（(][^）)]*机制[）)][：:]\s*([\s\S]*?)$/m.exec(text);
  const looseText = loose ? loose[2].replace(/\s+/g, ' ').trim() : '';
  const M = MECHANISMS[id];
  rows.push({
    id,
    specHasMechField: mechKeys.length > 0,
    mechKeys: mechKeys.join('|'),
    specAttLen: attText.length,
    specAttHead: attText.slice(0, 40),
    looseLen: looseText.length,
    mechLen: M ? M.text.length : 0,
    same: !!(M && attText && attText.replace(/\s/g, '') === M.text.replace(/\s/g, '')),
    prefix20Same: !!(M && attText && attText.slice(0, 20) === M.text.slice(0, 20)),
  });
}

console.log('id | 有机制字段 | 字段key | 规格机制段字数 | loose字数 | mechanisms字数 | 完全一致 | 前20字一致');
for (const r of rows) {
  console.log([r.id, r.specHasMechField, r.mechKeys || '—', r.specAttLen, r.looseLen, r.mechLen, r.same, r.prefix20Same].join(' | '));
}

console.log('');
console.log('=== 汇总 ===');
console.log('规格里有「机制」字段的：' + rows.filter((r) => r.specHasMechField).length + '/30 → ' + rows.filter((r) => r.specHasMechField).map((r) => r.id).join(' '));
console.log('规格里没有「机制」字段的：' + rows.filter((r) => !r.specHasMechField).length + '/30 → ' + rows.filter((r) => !r.specHasMechField).map((r) => r.id).join(' '));
console.log('规格机制段与 mechanisms.mjs 完全一致的：' + rows.filter((r) => r.same).length);
console.log('规格机制段与 mechanisms.mjs 前20字一致的：' + rows.filter((r) => r.prefix20Same).length);

console.log('');
console.log('=== 逐案并置（前 120 字） ===');
for (const r of rows) {
  const M = MECHANISMS[r.id];
  console.log('### ' + r.id);
  console.log('  SPEC(' + r.specAttLen + '字): ' + (r.specAttHead ? r.specAttHead : '（无）'));
  console.log('  MECH(' + r.mechLen + '字): ' + (M ? M.text.slice(0, 60) : '（无）'));
  if (M) console.log('  MECH source: ' + M.source);
}
