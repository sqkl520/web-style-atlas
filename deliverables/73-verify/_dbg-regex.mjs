const S = '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。';
console.log('原句:', S);
console.log('');

/* 第一部分：`?(S\d{2})`?(?:'s)? */
const p1 = /\*{0,2}`?(S\d{2})`?/.exec(S);
console.log('1) 匹配 S13:', p1 ? JSON.stringify(p1[0]) + ' @' + p1.index : '失败');

/* 中间部分：[^。.\n]{0,26}?  然后 (?:(\d+)\s*(?:处|条|个) */
const p2 = /`?(S\d{2})`?(?:'s)?[^。.\n]{0,40}?(\d+)\s*(?:处|条|个)/.exec(S);
console.log('2) 到「17 处」:', p2 ? JSON.stringify(p2[0]) : '失败');

/* 加上规则名 */
const p3 = /`?(S\d{2})`?(?:'s)?[^。.\n]{0,40}?(\d+)\s*(?:处|条|个)[^。.\n]{0,20}?`?(shadow|button-fx)`?/.exec(S);
console.log('3) 到 shadow:', p3 ? JSON.stringify(p3[0]) : '失败');
if (p3) console.log('   groups:', p3.slice(1));

/* 问题可能在：中间 [^。.\n]{0,40}? 非贪婪，会优先尝试最短；但它需要跨过「的 」
 * 而「的」不是 . 、。 或换行，所以应该能通过。
 * 试手动定位 */
console.log('');
console.log('逐字符看 S13 到 17 之间的字符:');
const i13 = S.indexOf('S13');
const i17 = S.indexOf('17');
console.log('  S13 @', i13, ' 17 @', i17);
console.log('  中间片段:', JSON.stringify(S.slice(i13 + 3, i17)));
console.log('  长度:', i17 - (i13 + 3));

console.log('');
console.log('17 到 shadow 之间:');
const ish = S.indexOf('shadow');
console.log('  片段:', JSON.stringify(S.slice(i17 + 2, ish)));
console.log('  长度:', ish - (i17 + 2));
