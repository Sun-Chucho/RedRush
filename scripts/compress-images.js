const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '../assets/images');
const files = fs.readdirSync(imagesDir).filter(file => 
  /\.(png|jpg|jpeg|webp)$/i.test(file)
);

console.log(`Found ${files.length} images to compress...\n`);

let totalOriginal = 0;
let totalCompressed = 0;

(async () => {
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    totalOriginal += originalSize;

    try {
      // For PNG files
      if (file.toLowerCase().endsWith('.png')) {
        await sharp(filePath)
          .png({ quality: 80, compression: 9 })
          .toFile(filePath + '.tmp');
      } 
      // For JPG files
      else if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')) {
        await sharp(filePath)
          .jpeg({ quality: 80, progressive: true })
          .toFile(filePath + '.tmp');
      }

      const compressedStat = fs.statSync(filePath + '.tmp');
      const compressedSize = compressedStat.size;
      const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

      // Replace original with compressed
      fs.unlinkSync(filePath);
      fs.renameSync(filePath + '.tmp', filePath);
      totalCompressed += compressedSize;

      console.log(`✓ ${file}`);
      console.log(`  Original: ${(originalSize / 1024).toFixed(2)} KB → Compressed: ${(compressedSize / 1024).toFixed(2)} KB (${reduction}% smaller)\n`);
    } catch (err) {
      console.error(`✗ Error compressing ${file}:`, err.message);
    }
  }

  console.log('='.repeat(50));
  console.log(`Total original size: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total compressed size: ${(totalCompressed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total reduction: ${((totalOriginal - totalCompressed) / totalOriginal * 100).toFixed(2)}%`);
  console.log('='.repeat(50));
})();
