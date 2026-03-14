const { Jimp } = require('jimp');

async function removeBackground(inputPath, outputPath) {
  try {
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Get background color from top-left pixel (0,0)
    const bgColor = image.getPixelColor(0, 0);
    const bgR = (bgColor >> 24) & 255;
    const bgG = (bgColor >> 16) & 255;
    const bgB = (bgColor >> 8) & 255;

    const tolerance = 40; 

    image.scan(0, 0, width, height, function (x, y, idx) {
      const pR = this.bitmap.data[idx];
      const pG = this.bitmap.data[idx + 1];
      const pB = this.bitmap.data[idx + 2];

      const diff = Math.abs(pR - bgR) + Math.abs(pG - bgG) + Math.abs(pB - bgB);

      if (diff < tolerance) {
        this.bitmap.data[idx + 3] = 0; // Alpha channel
      } else if (diff < tolerance + 40) {
        const alphaRange = 40;
        const distanceAboveTol = diff - tolerance;
        const alpha = Math.floor(distanceAboveTol / alphaRange * 255);
        this.bitmap.data[idx + 3] = alpha;
      }
    });

    await image.write(outputPath);
    console.log('Successfully removed background and saved to', outputPath);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

removeBackground('frontend-dist/logo.png', 'frontend-dist/logo-transparent.png');
