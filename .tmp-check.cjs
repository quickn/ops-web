const fs = require("fs");
const ts = require("typescript");
const path = process.argv[2];
const s = fs.readFileSync(path, "utf8");
const m = s.match(/<script setup lang="ts">([\s\S]*?)<\/script>/);
if (!m) { console.log("NO SCRIPT"); process.exit(1); }
const sf = ts.createSourceFile("x.ts", m[1], ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS);
const diags = sf.parseDiagnostics;
if (diags.length) {
  diags.forEach(d => {
    const pos = sf.getLineAndCharacterOfPosition(d.getStart());
    console.log(d.messageText + " @ line " + (pos.line + 1));
  });
  process.exit(1);
}
console.log("NO SYNTAX ERRORS");