import fs from 'node:fs'; import path from 'node:path';
const ROOT='D:/Web/style/prototypes';
const dirs=fs.readdirSync(ROOT).filter(d=>/^S\d\d-/.test(d)).sort();
for(const d of dirs){
  const css=fs.readFileSync(path.join(ROOT,d,'style.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const hits=[];
  for(const m of css.matchAll(/(^|\})([^{}@]+)\{([^}]*)\}/g)){
    const sel=m[2].trim().replace(/\s+/g,' '), body=m[3];
    for(const f of body.matchAll(/font-size\s*:\s*([^;}]+)/g)){
      const v=f[1].trim();
      const px=v.match(/^(\d+(?:\.\d+)?)px$/);
      if(px && parseFloat(px[1])<15) hits.push(`${parseFloat(px[1])}px  ${sel.slice(0,64)}`);
      const clampm=v.match(/clamp\(\s*(\d+(?:\.\d+)?)px/);
      if(clampm && parseFloat(clampm[1])<15) hits.push(`clamp-min ${clampm[1]}px  ${sel.slice(0,64)}`);
    }
  }
  console.log(`${d}  <15px decls=${hits.length}`);
  if(hits.length) console.log('   '+hits.slice(0,5).join('\n   '));
}
