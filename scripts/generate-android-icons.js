const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const svg = fs.readFileSync("icon.svg");
const densities = { mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 };
const foregroundSizes = { mdpi:108, hdpi:162, xhdpi:216, xxhdpi:324, xxxhdpi:432 };

(async () => {
  for (const [density,size] of Object.entries(densities)) {
    const dir = path.join("android/app/src/main/res", "mipmap-" + density);
    fs.mkdirSync(dir,{recursive:true});
    await sharp(svg).resize(size,size).png().toFile(path.join(dir,"ic_launcher.png"));
    await sharp(svg).resize(size,size).png().toFile(path.join(dir,"ic_launcher_round.png"));
    const fgSize = foregroundSizes[density];
    const artwork = await sharp(svg).resize(Math.round(fgSize*.78),Math.round(fgSize*.78),{fit:"contain"}).png().toBuffer();
    await sharp({create:{width:fgSize,height:fgSize,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
      .composite([{input:artwork,gravity:"centre"}]).png()
      .toFile(path.join(dir,"ic_launcher_foreground.png"));
  }
  const anydpi = path.join("android/app/src/main/res","mipmap-anydpi-v26");
  fs.mkdirSync(anydpi,{recursive:true});
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  fs.writeFileSync(path.join(anydpi,"ic_launcher.xml"),adaptive);
  fs.writeFileSync(path.join(anydpi,"ic_launcher_round.xml"),adaptive);
  const values = path.join("android/app/src/main/res","values");
  fs.mkdirSync(values,{recursive:true});
  fs.writeFileSync(path.join(values,"ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#07102F</color></resources>`);
  console.log("Generated matching legacy and adaptive Takeaways Tonight launcher icons.");
})().catch(error => { console.error(error); process.exit(1); });
