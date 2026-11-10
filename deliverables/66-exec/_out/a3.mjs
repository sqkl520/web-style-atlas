import { readFileSync } from 'node:fs';
const OUT='D:/Web/style/deliverables/66-exec/_out/after';
const yes=['S02','S04','S05','S08','S12','S14','S15','S18','S19','S20','S22','S23','S29'];
const no=['S01','S03','S06','S07','S09','S10','S11','S13','S16','S17','S21','S24','S25','S26','S27','S28','S30'];
const check=(id,list)=>{const t=readFileSync(OUT+'/'+id+'.txt','utf8');
  const slot=t.includes('不要留空槽'), reflow=t.includes('整块重排'), auto=t.includes('自动流排版');
  const good = list==='yes' ? (slot&&reflow&&!auto) : (!slot&&auto);
  console.log(id+'  ['+(list==='yes'?'yes':'no ')+']  不要留空槽='+(slot?'Y':'n')+'  整块重排='+(reflow?'Y':'n')+'  自动流='+(auto?'Y':'n')+'  => '+(good?'OK':'FAIL'));};
yes.forEach(id=>check(id,'yes')); no.forEach(id=>check(id,'no'));
