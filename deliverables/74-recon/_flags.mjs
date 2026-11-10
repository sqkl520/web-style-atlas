import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('census.json','utf8'));
const hdr=['scheme','indexB','cssB','inlineStyle','<script>','lang','h1','img','imgNoAlt','labels','inputs','@media','mobileBP','reducedMotion','focusRules','remoteURL'];
console.log('| '+hdr.join(' | ')+' |');
console.log('|'+hdr.map(()=>'---').join('|')+'|');
for(const r of rows){
  const b=v=>v===true?'YES':v===false?'NO':String(v);
  console.log('| '+[r.scheme,r.indexBytes,r.cssBytes,r.inlineStyle,r.scripts,(r.lang||'**MISSING**'),r.h1,r.imgs,r.imgNoAlt,r.labels,r.inputs,r.media,r.mobile,r.rm?'yes':'**NO**',r.focus,r.remoteUrl?'**YES**':'no'].join(' | ')+' |');
}
console.log('\n== OUTLIERS ==');
const KB=1024;
for(const r of rows){
  const o=[];
  if(r.cssBytes>31*KB) o.push(`css ${(r.cssBytes/KB).toFixed(1)}KB>31`);
  if(r.indexBytes<18*KB) o.push(`index ${(r.indexBytes/KB).toFixed(1)}KB<18`);
  if(r.indexBytes>27*KB) o.push(`index ${(r.indexBytes/KB).toFixed(1)}KB>27`);
  if(r.inlineStyle>0) o.push(`${r.inlineStyle} inline style=`);
  if(r.scripts>0) o.push(`${r.scripts} script`);
  if(!r.lang) o.push('no lang');
  if(r.h1!==1) o.push(`h1x${r.h1}`);
  if(r.imgNoAlt>0) o.push(`${r.imgNoAlt} img w/o alt`);
  if(r.media>0&&r.mobile===0) o.push('media but no width bp');
  if(r.remoteUrl) o.push('REMOTE URL');
  if(!r.rm) o.push('no reduced-motion');
  if(r.focus===0) o.push('no :focus*');
  if(o.length) console.log(`${r.scheme}: ${o.join('; ')}`);
}
