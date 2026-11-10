import fs from 'node:fs';
const src = fs.readFileSync('prototypes/_selection/data.js','utf8');
// find how data.js is emitted
console.log(src.slice(0,600));
