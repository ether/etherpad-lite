import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const scriptToInsert = '<script type="module" src="/src/pad/main.js"></script></body>'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const padHtml = fs.readFileSync(path.join(__dirname, "..", "src", "templates", "pad_template.html"), 'utf8');
let fileContent = padHtml.replaceAll(/<%[\s\S]*?%>/g, '');
fileContent = fileContent.replaceAll("<%=encodeURI(settings.skinName)%>", "colibris");

fileContent = fileContent.replace("PLACEHOLDER_FOR_PAD_JS", "");


const result = fileContent.split("</body>")
result[1] = scriptToInsert + result[1]

fileContent = result.join("")

fs.writeFileSync("pad.html", fileContent);


