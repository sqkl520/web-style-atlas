import {readFileSync} from 'node:fs';
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
let withCol=0, outsideMech=0, outsideLines=[];
for(const s of SP.schemes){
  const t=build(s.id)||'';
  const mech='这个风格的签名动作：'+s.dna.mechanism;
  const rest=t.replace(mech,'');
  const mechHas=/栏|列|fr/.test(s.dna.mechanism)?1:0;
  withCol+=mechHas;
  const lines=rest.split('\n').filter(l=>/栏|列|fr/.test(l));
  if(lines.length){ outsideMech++; outsideLines.push(`${s.id}:${lines.length} ${lines[0].slice(0,40)}`); }
}
console.log('mechanisms carrying a column/grid token:',withCol,'/30');
console.log('prompts mentioning 栏/列/fr OUTSIDE the mechanism:',outsideMech,'/30');
for(const l of outsideLines.slice(0,10)) console.log('  ',l);
