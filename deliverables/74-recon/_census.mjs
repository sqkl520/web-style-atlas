import fs from 'node:fs';
import path from 'node:path';
const ROOT='D:/Web/style/prototypes';
const dirs=fs.readdirSync(ROOT).filter(d=>/^S\d\d-/.test(d)).sort();
const rows=[];
const stripComments = c => c.replace(/\/\*[\s\S]*?\*\//g,'');
for(const d of dirs){
  const p=path.join(ROOT,d);
  const html=fs.existsSync(path.join(p,'index.html'))?fs.readFileSync(path.join(p,'index.html'),'utf8'):'';
  const css=fs.existsSync(path.join(p,'style.css'))?fs.readFileSync(path.join(p,'style.css'),'utf8'):'';
  const cssNC=stripComments(css);
  // rule count: count selectors blocks = declarations blocks; count '{' minus at-rule blocks
  const totalBraces=(cssNC.match(/\{/g)||[]).length;
  const atRules=(cssNC.match(/@(media|supports|font-face|keyframes|layer|container|page)\b[^{]*\{/g)||[]).length;
  const keyframeInner=0;
  const ruleCount=totalBraces-atRules;
  // :root custom props (parse all :root blocks)
  let rootC=0;
  const rootBlocks=[...cssNC.matchAll(/:root[^{]*\{([\s\S]*?)\}/g)];
  for(const b of rootBlocks){ rootC += (b[1].match(/(^|;|\s)--[A-Za-z0-9_-]+\s*:/g)||[]).length; }
  const media=(cssNC.match(/@media\b/g)||[]).length;
  const mobile=(cssNC.match(/@media[^{]*(max-width|min-width)[^{]*\{/g)||[]).length;
  const extHtml=/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html);
  const extCss=/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(css);
  const extAny=extHtml||extCss;
  const selfHost=/url\((["']?)(\.\.\/)?_fonts\/|\.woff2?/i.test(css) || /_fonts\//i.test(html);
  const remoteUrl=/(https?:)?\/\/[^"'\s)]+\.(jpg|jpeg|png|webp|gif|svg|woff2?|css)/i.test(html+css);
  const inlineStyle=(html.match(/\sstyle\s*=\s*["']/gi)||[]).length;
  const scripts=(html.match(/<script\b/gi)||[]).length;
  const lang=(html.match(/<html[^>]*\blang\s*=\s*["']([^"']*)["']/i)||[])[1]||'';
  const h1=(html.match(/<h1\b/gi)||[]).length;
  const imgs=(html.match(/<img\b/gi)||[]).length;
  const imgNoAlt=(html.match(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi)||[]).length;
  const assetsDir=path.join(p,'assets');
  const assetFiles=fs.existsSync(assetsDir)?fs.readdirSync(assetsDir,{recursive:true}).filter(f=>fs.statSync(path.join(assetsDir,f)).isFile()):[];
  const creditsFiles=assetFiles.filter(f=>/CREDITS|credits/i.test(f));
  const realImgs=assetFiles.filter(f=>/\.(jpg|jpeg|png|webp)$/i.test(f));
  const inspectDir=path.join(p,'.inspect');
  let shots=0, reportAt=null, fail=null, warn=null, rep=null;
  if(fs.existsSync(inspectDir)){
    const files=fs.readdirSync(inspectDir,{recursive:true}).filter(f=>/\.(jpg|jpeg|png|webp)$/i.test(f));
    shots=files.length;
    const rp=path.join(inspectDir,'report.json');
    if(fs.existsSync(rp)){ try{ rep=JSON.parse(fs.readFileSync(rp,'utf8').replace(/^\uFEFF/,'')); reportAt=rep.at; }catch(e){ reportAt='PARSE_ERR'; } }
  }
  // heading sequence
  const heads=[...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map(m=>'h'+m[1]);
  const landmarks={header:/<header\b/i.test(html),nav:/<nav\b/i.test(html),main:/<main\b/i.test(html),footer:/<footer\b/i.test(html),article:/<article\b/i.test(html),section:(html.match(/<section\b/gi)||[]).length,aside:/<aside\b/i.test(html)};
  const labels=(html.match(/<label\b/gi)||[]).length;
  const inputs=(html.match(/<(input|select|textarea)\b/gi)||[]).length;
  const rm=/prefers-reduced-motion/i.test(css);
  const focus=(cssNC.match(/:focus(-visible)?/g)||[]).length;
  rows.push({scheme:d,indexBytes:Buffer.byteLength(html),cssBytes:Buffer.byteLength(css),ruleCount,rootC,media,mobile,
    extAny,selfHost,remoteUrl,inlineStyle,scripts,lang,h1,imgs,imgNoAlt,assetFiles:assetFiles.length,realImgs:realImgs.length,
    creditsFiles:creditsFiles.length,shots,reportAt,focus,rm,landmarks,heads,labels,inputs,
    htmlMtime:fs.statSync(path.join(p,'index.html')).mtime.toISOString(),
    cssMtime:fs.statSync(path.join(p,'style.css')).mtime.toISOString()});
}
fs.writeFileSync('D:/Web/style/deliverables/74-recon/census.json',JSON.stringify(rows,null,1));
// print markdown table
const cols=['scheme','indexBytes','cssBytes','ruleCount','rootC','media','mobile','extAny','selfHost','assetFiles','realImgs','shots','reportAt'];
console.log('| '+['scheme','index.html B','style.css B','CSS rules',':root props','@media','mobile bp','ext font','self-host','assets files','real imgs','.inspect shots','report.at'].join(' | ')+' |');
console.log('|'+cols.map(()=>'---').join('|')+'|');
for(const r of rows){
  const f=v=>v===true?'YES':v===false?'no':String(v);
  console.log('| '+cols.map(c=>c==='reportAt'?(r[c]?String(r[c]).slice(0,16).replace('T',' '):'MISSING'):f(r[c])).join(' | ')+' |');
}
console.log('\nTOTALS: index bytes sum',rows.reduce((a,r)=>a+r.indexBytes,0),'css sum',rows.reduce((a,r)=>a+r.cssBytes,0));
