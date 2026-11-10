// 鐢熸垚浠诲姟 1 鐨勫畬鏁?44 璇嶈〃锛圡arkdown锛夛紝鏁板瓧鍏ㄩ儴鏉ヨ嚜瀹炴祴 JSON锛屼笉鎵嬫妱銆?import fs from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const raw44 = JSON.parse(fs.readFileSync(OUT + '/probe-44-raw.json', 'utf8'));
const raw29 = JSON.parse(fs.readFileSync(OUT + '/probe-29-raw.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync(OUT + '/sceneIndex.json', 'utf8'));
const chips = JSON.parse(fs.readFileSync(OUT + '/probe-chips-all.json', 'utf8'));

const chipMap = Object.fromEntries(chips.map(c => [c.term, c]));

// 绌虹姸鎬佹枃妗堝綊绫?function emptyKind(r) {
  if (r.rows > 0) return '鈥?;
  const t = r.emptyText || '';
  if (/鎸夋枃瀛楁悳涓嶅埌/.test(t)) return 'E1 鎼滀笉鍒颁絾鏈夌洿杩烇紙寮曞鐐硅姱鐗囷級';
  if (/姝ｅ睘浜庢病鏈夌洿杩炴柟妗堢殑閭ｄ竴绫?.test(t)) return 'E2 鎵胯鏃犵洿杩烇紙寮曞鐐硅姱鐗囷級';
  if (/涓嶅湪杩?44 涓涓氳瘝閲?.test(t)) return 'E3 鎵胯璇嶄笉鍦ㄧ储寮曢噷';
  return 'E4 鍏朵粬';
}
function tplCell(r) {
  if (r.etplCards && r.etplCards.length) return r.etplCards.join('+') + '锛堝崱锛?;
  if (r.etplVisible) return '鏃狅紙鍒椾簡妯℃澘灞?3 涓?README 鐨勬壙璇鸿涓氾級';
  if (r.stripCards && r.stripCards.length) return r.stripCards.join('+') + '锛堝甫锛?;
  return '鏃?;
}

const rows = [];
for (const r of raw44) {
  const v = idx[r.term] || { direct: [], near: [] };
  const d = (v.direct || []), n = (v.near || []);
  const status = d.length ? (n.length ? '鐩磋繛+杩戜技' : '浠呯洿杩?) : (n.length ? '浠呰繎浼? : '鏃?);
  const chip = chipMap[r.term];
  const seen = r.rows > 0
    ? `鍒楀嚭 ${r.rows} / 30 琛?{r.stripVisible ? '锛屾竻鍗曚笂鏂规湁妯℃澘甯?[' + r.stripCards.join(',') + ']' : '锛屾棤妯℃澘甯?}`
    : `鍒楀嚭 0 / 30锛涚┖鐘舵€?${emptyKind(r)}锛涙ā鏉垮潡 ${tplCell(r)}`;
  rows.push({
    term: r.term, direct: d.join(' ') || '鈥?, near: n.join(' ') || '鈥?, status,
    rows: r.rows, chipRows: chip ? chip.rows : null, chipTpl: chip ? chip.stripCards.join(',') || '鈥? : '鈥?,
    seen,
  });
}

let md = '| 琛屼笟璇?| direct锛堢洿杩烇級 | near锛堣繎浼硷級 | 绱㈠紩鐘舵€?| 鎼滅储琛屾暟 | 瀹為檯鐪嬪埌浠€涔?| 鐐瑰悓鍚嶈姱鐗囧悗 |\n';
md += '| --- | --- | --- | --- | --- | --- | --- |\n';
for (const r of rows) md += `| ${r.term} | ${r.direct} | ${r.near} | ${r.status} | ${r.rows} | ${r.seen} | ${r.chipRows} 琛?/ 妯℃澘甯?${r.chipTpl} |\n`;
fs.writeFileSync(OUT + '/table-44.md', md);

// 29 璇嶈〃
const rows29 = raw29.map(r => ({
  term: r.term, rows: r.rows, tpl: tplCell(r), kind: emptyKind(r),
}));
let md29 = '| 璇?| 鎼滅储琛屾暟 | 绌虹姸鎬佸垎绫?| 妯℃澘鍧?|\n| --- | --- | --- | --- |\n';
for (const r of rows29) md29 += `| ${r.term} | ${r.rows} | ${r.kind} | ${r.tpl} |\n`;
fs.writeFileSync(OUT + '/table-29.md', md29);

// 缁熻
const zero44 = raw44.filter(r => r.rows === 0);
const zero29 = raw29.filter(r => r.rows === 0);
console.log('44 璇嶏細闆惰', zero44.length, '/', raw44.length, `(${(zero44.length/44*100).toFixed(1)}%)`);
console.log('29 璇嶏細闆惰', zero29.length, '/', raw29.length);
console.log('鍚堣闆惰', zero44.length + zero29.length, '/', raw44.length + raw29.length);
console.log('44 璇嶆湁妯℃澘鍗★紙绌虹姸鎬侊級:', raw44.filter(r => r.etplCards.length).map(r => r.term + '鈫? + r.etplCards).join(', '));
console.log('44 璇嶆湁妯℃澘甯︼紙鏈夎锛?', raw44.filter(r => r.stripVisible).map(r => r.term + '鈫? + r.stripCards).join(', '));
console.log('29 璇嶆湁妯℃澘鍗?', raw29.filter(r => r.etplCards.length).map(r => r.term + '鈫? + r.etplCards).join(', '));
console.log('\n绌虹姸鎬佸垎绫诲垎甯冿紙44 璇嶏級:');
const dist = {};
for (const r of zero44) dist[emptyKind(r)] = (dist[emptyKind(r)] || 0) + 1;
console.log(dist);
console.log('\n琛ㄥ凡鍐欏叆 table-44.md / table-29.md');

