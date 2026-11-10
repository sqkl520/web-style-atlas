import fs from 'node:fs'; import path from 'node:path';
const ROOT='D:/Web/style/prototypes';
const dirs=fs.readdirSync(ROOT).filter(d=>/^S\d\d-/.test(d)).sort();
for(const d of dirs){
  const ad=path.join(ROOT,d,'assets');
  const files=fs.existsSync(ad)?fs.readdirSync(ad,{recursive:true}):[];
  const byExt={};
  let bytes=0;
  for(const f of files){const p=path.join(ad,f);if(!fs.statSync(p).isFile())continue;const e=(path.extname(f)||'noext').toLowerCase();byExt[e]=(byExt[e]||0)+1;bytes+=fs.statSync(p).size;}
  const credits=files.filter(f=>/CREDITS|credits/i.test(f));
  const cj=files.filter(f=>/credits\.json$/i.test(f));
  let credLines=0, credBytes=0;
  for(const c of credits){const p=path.join(ad,c);if(fs.statSync(p).isFile()){const t=fs.readFileSync(p,'utf8');credLines+=t.split('\n').length;credBytes+=Buffer.byteLength(t);}}
  // license keywords in CREDITS
  let lic={cc0:0,ccbysa:0,ccby:0,pd:0,unknown:0,ofl:0};
  for(const c of credits){const p=path.join(ad,c);if(!fs.statSync(p).isFile())continue;const t=fs.readFileSync(p,'utf8');
    lic.cc0+=(t.match(/CC0|CC 0/gi)||[]).length; lic.ccbysa+=(t.match(/CC[ -]?BY[ -]?SA/gi)||[]).length;
    lic.ccby+=(t.match(/CC[ -]?BY(?![- ]?SA)/gi)||[]).length; lic.pd+=(t.match(/公有领域|public domain/gi)||[]).length;
    lic.ofl+=(t.match(/OFL|SIL Open Font/gi)||[]).length;}
  console.log(`${d}\n  assets=${files.length} files, ${(bytes/1024).toFixed(0)}KB, ext=${JSON.stringify(byExt)}\n  CREDITS=${credits.join(',')||'**NONE**'} lines=${credLines} bytes=${credBytes} ${cj.length?'credits.json=Y':'credits.json=N'} lic=${JSON.stringify(lic)}`);
}
