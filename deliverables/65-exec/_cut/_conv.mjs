import fs from "node:fs";
const conv = (p) => {
  const b = fs.readFileSync(p);
  if (b[0] === 0xFF && b[1] === 0xFE) {
    const t = b.slice(2).toString("utf16le").replace(/\r\n/g, "\n");
    fs.writeFileSync(p, t, "utf8");
    console.log("converted UTF-16LE -> UTF-8: " + p + " (" + b.length + " B)");
  } else {
    console.log("already utf8: " + p);
  }
};
for (const p of ["deliverables/65-exec/_cut/regex-probe.txt","deliverables/65-exec/_cut/regex-fragility.txt","deliverables/65-exec/_cut/compare.txt","deliverables/65-exec/_cut/scan-marker.txt","deliverables/65-exec/_cut/build-prompts.after.txt","deliverables/65-exec/_cut/s13.after.txt"]) {
  try { conv(p); } catch (e) { console.log("skip " + p + ": " + e.code); }
}
