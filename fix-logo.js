const { Jimp } = require('jimp');

async function processLogo(inputPath, outputPath) {
  try {
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Get background color from top-left pixel (0,0)
    const bgColor = image.getPixelColor(0, 0);
    const bgR = (bgColor >> 24) & 255;
    const bgG = (bgColor >> 16) & 255;
    const bgB = (bgColor >> 8) & 255;

    // Target color for white text: #0B2545
    const tR = 11;
    const tG = 37;
    const tB = 69;

    const tolerance = 60; 

    image.scan(0, 0, width, height, function (x, y, idx) {
      const pR = this.bitmap.data[idx];
      const pG = this.bitmap.data[idx + 1];
      const pB = this.bitmap.data[idx + 2];

      const diff = Math.abs(pR - bgR) + Math.abs(pG - bgG) + Math.abs(pB - bgB);

      if (diff < tolerance) {
        // Background
        this.bitmap.data[idx + 3] = 0; 
      } else {
        // Foreground
        let alpha = 255;
        if (diff < tolerance + 50) {
          alpha = Math.floor(((diff - tolerance) / 50) * 255);
        }
        this.bitmap.data[idx + 3] = alpha;

        // Determine if it's the white text (high R, G, B)
        // White has roughly equal, high RGB. Cyan has high G, B but lower R.
        const maxVal = Math.max(pR, pG, pB);
        const minVal = Math.min(pR, pG, pB);
        const sat = maxVal === 0 ? 0 : (maxVal - minVal) / maxVal;

        if (sat < 0.3 && (pR + pG + pB) > 300) {
          // It's white or light gray text. Recolour to dark blue.
          // Increase contrast so edges look sharp
          this.bitmap.data[idx] = tR;
          this.bitmap.data[idx + 1] = tG;
          this.bitmap.data[idx + 2] = tB;
        } else if (pG > pR && pB > pR) {
          // It's cyan. Darken slightly to improve contrast on light background.
          this.bitmap.data[idx] = Math.min(255, pR * 0.75);
          this.bitmap.data[idx + 1] = Math.min(255, pG * 0.75);
          this.bitmap.data[idx + 2] = Math.min(255, pB * 0.75);
        } else {
          // Other anti-aliased edge pixels, tint them to dark blue to avoid ugly white fringes
          if (maxVal > 150) {
              this.bitmap.data[idx] = tR;
              this.bitmap.data[idx + 1] = tG;
              this.bitmap.data[idx + 2] = tB;
          }
        }
      }
    });

    await image.write(outputPath);
    console.log('Successfully processed logo and saved to', outputPath);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processLogo('frontend-dist/logo.png', 'frontend-dist/logo-transparent.png');
