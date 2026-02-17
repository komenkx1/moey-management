import fs from "fs";
import path from "path";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

const templatePath = path.join("public", "sw.template.js");
const outputPath = path.join("public", "sw.js");

let sw = fs.readFileSync(templatePath, "utf-8");

sw = sw.replace(/APP_VERSION/g, pkg.version);

fs.writeFileSync(outputPath, sw);

console.log("Generated sw.js with version:", pkg.version);
