import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const dirs=readdirSync(ROOT,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^S\d{2}-/.test(d.name)).map(d=>d.name);
const byId=new Map(dirs.map(d=>[d.slice(0,3),d]));
const get=id=>readFileSync(`${ROOT}/${byId.get(id)}/index.html`,'utf8');
const css=id=>readFileSync(`${ROOT}/${byId.get(id)}/style.css`,'utf8');

const probes={
 S21:()=>{const h=get('S21');return {locks:(h.match(/data-lock/g)||[]).length, lockItems:[...h.matchAll(/data-lock="([^"]*)"/g)].map(m=>m[1]).slice(0,20)};},
 S12:()=>{const h=get('S21');return {};},
 S19:()=>{const h=get('S19');return {dw:(h.match(/class="dw[^"]*"/g)||[]).length, rowwrap:(h.match(/class="rowwrap"/g)||[]).length, svals:[...new Set([...h.matchAll(/--s:(\d)/g)].map(m=>m[1]))]};},
 S23:()=>{const h=get('S23');return {opening:(h.match(/class="[^"]*open/g)||[]).length};},
 S14:()=>{const h=get('S14');const c=css('S14');return {cards:(h.match(/class="[^"]*(card|blk|panel|node)/g)||[]).length, n: (h.match(/<li/g)||[]).length};},
 S05:()=>{const h=get('S05');return {zones:(h.match(/class="[^"]*zone/g)||[]).length, cells:(h.match(/class="[^"]*cell/g)||[]).length, lis:(h.match(/<li/g)||[]).length};},
 S28:()=>{const h=get('S28');return {plates:(h.match(/class="[^"]*plate/g)||[]).length, lis:(h.match(/<li/g)||[]).length};},
 S04:()=>{const c=css('S04');return {spans:[...new Set([...c.matchAll(/grid-(?:column|row)\s*:\s*(?:span\s+)?([\d]+)/g)].map(m=>m[1]))]};},
 S02:()=>{const h=get('S02');const c=css('S02');return {levels:(h.match(/class="[^"]*lv/g)||[]).length, lv:[...new Set([...h.matchAll(/data-(?:lv|level)="([^"]*)"/g)].map(m=>m[1]))], cssLv:[...new Set([...c.matchAll(/--(?:lv|level)[\w-]*\s*:\s*([^;]+)/g)].map(m=>m[1].trim()))]};},
};
for(const [k,fn] of Object.entries(probes)){
  if(k==='S12'){ // S12 knock holes
    const h=get('S12'); const c=css('S12');
    console.log('S12', JSON.stringify({knock:(h.match(/class="[^"]*knock/g)||[]).length, lis:(h.match(/<li/g)||[]).length, gaps:[...new Set([...c.matchAll(/--g[123]\s*:\s*([^;]+)/g)].map(m=>m[1].trim()))]}));
    continue;
  }
  try{ console.log(k, JSON.stringify(fn())); }catch(e){ console.log(k,'ERR',e.message); }
}
