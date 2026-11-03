const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const svg = fs.readFileSync("icon.svg");
const sizes = { mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 };
(async () => {
  for (const [density,size] of Object.entries(sizes)) {
    const dir = path.join("android/app/src/main/res", "mipmap-"+density);
    fs.mkdirSync(dir,{recursive:true});
    await sharp(svg).resize(size,size).png().toFile(path.join(dir,"ic_launcher.png"));
    await sharp(svg).resize(size,size).png().toFile(path.join(dir,"ic_launcher_round.png"));
  }
  console.log("Generated custom Takeaways Tonight Android launcher icons.");
})().catch(error => { console.error(error); process.exit(1); });
