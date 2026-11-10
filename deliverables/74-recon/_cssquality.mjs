import fs from 'node:fs';
const ROOT='D:/Web/style/prototypes';
const dirs=['S01-red-wedge-broadsheet','S07-slate-ink-contents','S15-fishery-floor-ledger','S21-interlocking-release-book','S29-wire-bound-safety-manual'];
function spec(sel){
  // rough specificity a,b,c
  let a=0,b=0,c=0;
  const s=sel.replace(/:not\(([^)]*)\)/g,'$1').replace(/::?[a-z-]+(\([^)]*\))?/g,m=>{ if(/^::/.test(m)||/^:(before|after|first-line|first-letter|placeholder|selection|backdrop)/.test(m)){c++;return '';} a++;return ''; });
  a += (s.match(/#[\w-]+/g)||[]).length;
  b += (s.match(/\.[\w-]+/g)||[]).length + (s.match(/\[[^\]]+\]/g)||[]).length;
  c += (s.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g)||[]).length;
  return [a,b,c];
}
for(const d of dirs){
  const css=fs.readFileSync(`${ROOT}/${d}/style.css`,'utf8');
  const nc=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const sels=[...nc.matchAll(/(^|\})([^{}@]+)\{/g)].map(m=>m[2].trim()).filter(s=>s&&!s.startsWith('@'));
  let max=[0,0,0],maxSel='';
  let idChecks=0, important=0, importantSel=[];
  for(const group of sels){
    for(const sel of group.split(',')){
      const sp=spec(sel);
      if(sp[0]>max[0]||(sp[0]===max[0]&&(sp[1]>max[1]||(sp[1]===max[1]&&sp[2]>max[2])))){max=sp;maxSel=sel.trim();}
      if(sp[0]>0) idChecks++;
    }
  }
  // !important
  for(const m of nc.matchAll(/([^{}]+)\{([^}]*!important[^}]*)\}/g)){
    const n=(m[2].match(/!important/g)||[]).length; important+=n;
    importantSel.push(m[1].trim().split('\n').pop().slice(0,60));
  }
  const features={
    grid:(nc.match(/display:\s*grid/g)||[]).length,
    flex:(nc.match(/display:\s*flex/g)||[]).length,
    subgrid:(nc.match(/subgrid/g)||[]).length,
    clamp:(nc.match(/clamp\(/g)||[]).length,
    minmax:(nc.match(/minmax\(/g)||[]).length,
    containerQ:(nc.match(/@container/g)||[]).length,
    logical:(nc.match(/(margin|padding)-(inline|block)/g)||[]).length,
    gap:(nc.match(/[^-]gap:/g)||[]).length,
    clipPath:(nc.match(/clip-path/g)||[]).length,
    customPropsUsed:(nc.match(/var\(--/g)||[]).length,
    boxShadow:(nc.match(/box-shadow/g)||[]).length,
    dropShadow:(nc.match(/drop-shadow/g)||[]).length,
    gradients:(nc.match(/(linear|radial|conic)-gradient/g)||[]).length,
    textWrap:(nc.match(/text-wrap/g)||[]).length,
    fontStretch:(nc.match(/font-stretch|font-variation-settings/g)||[]).length,
    blend:(nc.match(/mix-blend-mode/g)||[]).length,
    maskImage:(nc.match(/mask-image/g)||[]).length,
  };
  console.log(`\n### ${d}`);
  console.log(`  selectors(with groups expanded): ~${sels.join(',').split(',').length}; max specificity ${max.join(',')} on "${maxSel.slice(0,70)}"; #id selectors ${idChecks}`);
  console.log(`  !important total ${important}${important? ' e.g. '+importantSel.slice(0,3).join(' | '):''}`);
  console.log('  features:', JSON.stringify(features));
}
