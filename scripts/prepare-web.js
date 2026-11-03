const fs = require("fs");
const path = require("path");
const files = ["index.html","config.js","manifest.webmanifest","logo.svg","icon.svg","privacy.html","terms.html"];
fs.mkdirSync("www",{recursive:true});
for (const file of files) {
  if (fs.existsSync(file)) fs.copyFileSync(file,path.join("www",file));
}
console.log("Prepared bundled Takeaways Tonight? web app.");
