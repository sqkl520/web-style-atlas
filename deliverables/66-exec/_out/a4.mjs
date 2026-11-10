import { readFileSync, readdirSync } from 'node:fs';
const d='D:/Web/style/deliverables/66-exec/_out/after';
const L=readdirSync(d).filter(f=>f.endsWith('.txt')).map(f=>[f.slice(0,3), readFileSync(d+'/'+f,'utf8').length]);
L.sort((a,b)=>a[0].localeCompare(b[0]));
const lens=L.map(x=>x[1]).sort((a,b)=>a-b);
console.log('min='+lens[0]+'  median='+lens[Math.floor(lens.length/2)]+'  max='+lens[lens.length-1]);
console.log('all in 1550-2050: '+lens.every(n=>n>=1550&&n<=2050));
console.log('count='+lens.length);
