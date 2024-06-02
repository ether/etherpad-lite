import {fileURLToPath} from "url";
import {dirname} from "path";
import fs from "node:fs";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let padHtml = fs.readFileSync(path.join(__dirname, "..", "src", "templates", "pad_template.html"), 'utf8');
const OUTPUT_PATH = path.join(__dirname, "..", "src", "templates", "pad.html");
// Walk directory and find pad js file
let padJsFile = "";
const walkSync = (dir) => {
  fs.readdirSync(dir).forEach(file => {
    if (file.startsWith("pad-")) {
      padJsFile = file;
    }
  })}
walkSync(path.join(__dirname, "..", "src", "static", "oidc", "assets"))
console.log(padJsFile)
padHtml = padHtml.replace("PLACEHOLDER_FOR_PAD_JS", `../../views/assets/${padJsFile}?callback=require.define`);
fs.writeFileSync(OUTPUT_PATH, padHtml);
