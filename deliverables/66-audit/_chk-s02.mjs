import { readFileSync } from "node:fs";
const t = readFileSync("prototypes/S02-gilded-symmetry-salon/index.html","utf8");
console.log("li.step total:", (t.match(/<li class="step"/g)||[]).length);
console.log("is-vacant:", (t.match(/is-vacant/g)||[]).length);
const i = t.indexOf("is-vacant");
console.log(JSON.stringify(t.slice(i-260, i+160)));
