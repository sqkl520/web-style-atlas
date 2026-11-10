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
// find lines that are unique to a case (appear in <=1 prompt) among lines mentioning 栏/列/fr/格
const all=SP.schemes.map(s=>build(s.id).split('\n'));
const freq=new Map();
for(const lines of all) for(const l of new Set(lines)) freq.set(l,(freq.get(l)||0)+1);
let casesWithUniqueColLine=0;
const per=[];
for(let i=0;i<all.length;i++){
  const id=SP.schemes[i].id;
  const uniq=all[i].filter(l=>/[栏列]|fr/.test(l) && (freq.get(l)||0)<=2 && !l.startsWith('这个风格的签名动作'));
  per.push(`${id}:${uniq.length}`);
  if(uniq.length) casesWithUniqueColLine++;
}
console.log('prompts with a case-unique column line OUTSIDE mechanism:',casesWithUniqueColLine,'/30');
console.log(per.join(' '));
