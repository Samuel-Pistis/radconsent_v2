const { Jimp } = require('jimp');

async function removeCheckerboard(inputPath, outputPath) {
  try {
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    image.scan(0, 0, width, height, function (x, y, idx) {
      const pR = this.bitmap.data[idx];
      const pG = this.bitmap.data[idx + 1];
      const pB = this.bitmap.data[idx + 2];

      // Since the logo itself is a darker blue, any light gray/white pixel is part of the checkerboard. 
      // Let's make everything that is relatively light transparent.
      // E.g., if R, G, B are all > 150, or if it's very close to gray (where R, G, B are similar and high).
      const avg = (pR + pG + pB) / 3;
      const diffR = Math.abs(pR - avg);
      const diffG = Math.abs(pG - avg);
      const diffB = Math.abs(pB - avg);
      
      const isGrayScale = diffR < 20 && diffG < 20 && diffB < 20;

      if (isGrayScale && avg > 150) {
          // This is a light gray or white square of the checkerboard.
          // Fully transparent
          this.bitmap.data[idx + 3] = 0;
      } else if (isGrayScale && avg > 120) {
          // Semi-transparent for edges
          const alpha = Math.max(0, Math.min(255, (200 - avg) * 2));
          this.bitmap.data[idx + 3] = alpha;
      }
    });

    await image.write(outputPath);
    console.log('Successfully removed checkerboard and saved to', outputPath);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

removeCheckerboard('frontend-dist/logo.png', 'frontend-dist/logo-transparent.png');
