// 漏项核查：S22/S27/S30 的 #FFFFFF 是这轮新过滤器"误收"进来的
import { readFileSync } from 'node:fs';

const SPEC = 'D:/Web/style/prototypes/_specs/';
const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const ROLE = /(主色|背景色?|底色|地面色?|正文色?|正文|强调色?|辅助色?|次要色?|结构线|批注|脏色|纸色)/;
const ROLE_NAME_BEFORE = /[\u4e00-\u9fa5]{2,8}\s*$/;
const ROLE_NAME_AFTER = /^\s*[\u4e00-\u9fa5A-Za-z0-9]{1,12}\s*[＝=]/;

for (const id of ['S22', 'S27', 'S30']) {
  const t = readFileSync(SPEC + id + '.md', 'utf8');
  const i0 = t.indexOf('配色系统');
  const rest = t.slice(i0);
  const i1 = rest.indexOf('字体策略');
  const p3 = dec(rest.slice(0, i1 > 0 ? i1 : 1200));
  const i = p3.indexOf('#FFFFFF');
  const before = p3.slice(Math.max(0, i - 40), i);
  const cut = Math.max(before.lastIndexOf('。'), before.lastIndexOf('；'), before.lastIndexOf('，'), before.lastIndexOf('、'), before.lastIndexOf('！'), before.lastIndexOf('？'), before.lastIndexOf('\n'));
  const clause = cut >= 0 ? before.slice(cut + 1) : before;
  console.log('===', id);
  console.log('  clauseBefore = [' + clause + ']');
  console.log('  ROLE 词表命中      :', ROLE.test(clause));
  console.log('  ROLE_NAME_BEFORE   :', ROLE_NAME_BEFORE.test(clause), '  <= 只要前面有 2–8 个汉字就成立');
  console.log('  规格明写"只有/恰好三个色":', /(恰好三个色|只有三个色)/.test(p3));
  const cnt = (p3.match(/#[0-9A-Fa-f]{6}/g) || []).length;
  console.log('  字段3 里 hex 出现次数:', cnt);
}
