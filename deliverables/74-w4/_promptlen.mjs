import {readFileSync} from 'node:fs';
const ROOT='D:/Web/style';
const dataSrc=readFileSync(ROOT+'/prototypes/_selection/data.js','utf8');
const copySrc=readFileSync(ROOT+'/prototypes/_selection/prompt-copy.js','utf8');
const pSrc=readFileSync(ROOT+'/prototypes/_selection/prompts.js','utf8');
const w={window:{}};new Function('window',pSrc)(w.window);
const STYLE_PROMPTS=w.window.STYLE_PROMPTS;
const env={STYLE_PROMPTS,console:{warn(){},log(){}}};env.window=env;
new Function('window',dataSrc)(env);
const stubEl=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},appendChild(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],innerHTML:'',textContent:'',insertBefore(){},removeChild(){},remove(){},focus(){},cloneNode(){return stubEl();}});
env.document={
  createElement:stubEl, getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
  body:stubEl(), documentElement:stubEl(), addEventListener(){}
};
env.navigator={clipboard:{writeText:async()=>{}}};env.setTimeout=()=>{};env.clearTimeout=()=>{};
try{ new Function('window','document','navigator','setTimeout','clearTimeout',copySrc)(env,env.document,env.navigator,env.setTimeout,env.clearTimeout); }catch(e){ console.error('mount err',e.message); }
const build=env.buildStylePrompt;
const rows=[];
for(const s of STYLE_PROMPTS.schemes){
  const t=build(s.id)||'';
  const mechLine='这个风格的签名动作：'+s.dna.mechanism;
  const idx=t.indexOf(mechLine);
  const nonEmpty=t.split('\n').filter(l=>l.trim());
  rows.push({id:s.id,len:t.length,mechLen:mechLine.length,pct:(mechLine.length/t.length*100),found:idx>=0,lines:nonEmpty.length});
}
for(const r of rows) console.log(`${r.id} len=${r.len} mech=${r.mechLen} ${r.pct.toFixed(2)}% found=${r.found} lines=${r.lines}`);
const lens=rows.map(r=>r.len).sort((a,b)=>a-b);
console.log('min',lens[0],'max',lens[lens.length-1],'median',lens[Math.floor(lens.length/2)],'mean',(lens.reduce((a,b)=>a+b,0)/lens.length).toFixed(0));
const pcts=rows.map(r=>r.pct);
console.log('mech share median %',pcts.slice().sort((a,b)=>a-b)[15].toFixed(2));
console.log('notFound:',rows.filter(r=>!r.found).map(r=>r.id).join(',')||'(none)');
