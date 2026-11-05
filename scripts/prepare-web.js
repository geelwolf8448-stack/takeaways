const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const files = ["index.html","config.js","manifest.webmanifest","logo.svg","icon.svg","hero-art.svg","splash.svg","privacy.html","terms.html","service-worker.js","admin.html","reset-password.html","account.html","restaurant-portal.html","native-auth.js","native-push.js","push-tap-handler.js"];
fs.mkdirSync("www",{recursive:true});
for (const file of files) {
  if (fs.existsSync(file)) fs.copyFileSync(file,path.join("www",file));
}
(async()=>{
  for(const size of [192,512]){
    await sharp("icon.svg").resize(size,size).png().toFile(path.join("www",`icon-${size}.png`));
  }
  console.log("Prepared branded web app and installable PNG icons.");
})().catch(error=>{console.error(error);process.exit(1);});
