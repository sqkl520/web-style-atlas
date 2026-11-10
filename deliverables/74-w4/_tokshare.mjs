import {readFileSync,readdirSync} from 'node:fs';
const ROOT='D:/Web/style';
const dataSrc=readFileSync(ROOT+'/prototypes/_selection/data.js','utf8');
const copySrc=readFileSync(ROOT+'/prototypes/_selection/prompt-copy.js','utf8');
const pSrc=readFileSync(ROOT+'/prototypes/_selection/prompts.js','utf8');
const w={window:{}};new Function('window',pSrc)(w.window);
const SP=w.window.STYLE_PROMPTS;
const env={STYLE_PROMPTS:SP,console:{warn(){},log(){}}};env.window=env;
new Function('window',dataSrc)(env);
const stubEl=()=>({style:{},classList:{add(){},remove(){},toggle(){},contains:()=>false},setAttribute(){},appendChild(){},addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],innerHTML:'',textContent:'',insertBefore(){},removeChild(){},remove(){},focus(){},cloneNode(){return stubEl();}});
env.document={createElement:stubEl,getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],body:stubEl(),documentElement:stubEl(),addEventListener(){}};
env.navigator={clipboard:{writeText:async()=>{}}};env.setTimeout=()=>{};env.clearTimeout=()=>{};
try{new Function('window','document','navigator','setTimeout','clearTimeout',copySrc)(env,env.document,env.navigator,env.setTimeout,env.clearTimeout);}catch(e){}
const build=env.buildStylePrompt;
const RE=/-?\d*\.?\d+\s*(?:px|fr|mm|ms|em|%|°|deg)/g;
let totAll=0, totMech=0;
for(const s of SP.schemes){
  const t=build(s.id)||'';
  const mech='这个风格的签名动作：'+s.dna.mechanism;
  const all=(t.match(RE)||[]).length;
  const mm=(mech.match(RE)||[]).length;
  totAll+=all; totMech+=mm;
  console.log(`${s.id} prompt unit-tokens=${all} mech=${mm} share=${(mm/all*100).toFixed(1)}%`);
}
console.log(`TOTAL ${totAll} / mech ${totMech} = ${(totMech/totAll*100).toFixed(1)}%`);
