/* 规则干跑：R1b/R1c 只删前缀，逐案看剩下什么 —— 证明"机械能做到哪一步" */
import fs from 'fs';
const win={}; new Function('window', fs.readFileSync('prototypes/_selection/data.js','utf8'))(win);
const S=win.SCHEMES;
const get=id=>S.find(s=>s.id===id).audit;

function stripHeadB(a){ return a.replace(/第([一二三四五])，反\s*[^：]*：/g,'第$1，'); }
function stripHeadC(a){ return a.replace(/（(\d)）反\s*[^（]*（[^）]*）\s*[:：]/g,'（$1）'); }
function stripHeadD(a){ return a.replace(/（(\d)）它故意反的是[^→]*→\s*/g,'（$1）'); }

for(const [id,fn,label] of [['S11',stripHeadB,'B'],['S31',stripHeadB,'B'],['S21',stripHeadC,'C'],['S23',stripHeadC,'C'],['S26',stripHeadD,'D'],['S30',stripHeadD,'D']]){
  const a=get(id), out=fn(a);
  console.log(`===== ${id} 族${label}  前缀删除后 =====`);
  console.log(out);
  console.log('  ⚠️ 剩余条款编号:', (out.match(/C-\d(?:\.\d+|\s*第\s*\d+\s*条)?|R-\d+|P\d+|0\d-[a-z-]+\.md|\d{1,2}\s*号/g)||[]).length);
  const neg=(out.match(/不存在|没有任何|没有一处|不是[^，；。]{2,}|而非/g)||[]);
  console.log('  ⚠️ 剩余否定结构:', neg.length? neg.join(' | '):'无');
  console.log('');
}
