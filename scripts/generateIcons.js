/**
 * Generate app icons from the St. Aloysius College logo.
 * Creates icon.png (1024x1024), adaptive-icon.png (1024x1024), and splash.png (1284x2778).
 */
const sharp = require('sharp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'college_logo_original.png');

async function generate() {
  // 1. Generate icon.png – 1024x1024, logo centered on a solid #1E40AF background
  await sharp(SOURCE)
    .resize(700, 700, { fit: 'contain', background: { r: 30, g: 64, b: 175, alpha: 1 } })
    .flatten({ background: { r: 30, g: 64, b: 175 } })
    .extend({
      top: 162, bottom: 162, left: 162, right: 162,
      background: { r: 30, g: 64, b: 175, alpha: 1 },
    })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));
  console.log('✓ icon.png (1024x1024)');

  // 2. Generate adaptive-icon.png – 1024x1024, foreground, more padding for safe zone
  await sharp(SOURCE)
    .resize(600, 600, { fit: 'contain', background: { r: 30, g: 64, b: 175, alpha: 0 } })
    .extend({
      top: 212, bottom: 212, left: 212, right: 212,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024x1024)');

  // 3. Generate splash.png – 1284x2778, logo centered on branded background
  await sharp(SOURCE)
    .resize(400, 400, { fit: 'contain', background: { r: 30, g: 64, b: 175, alpha: 1 } })
    .flatten({ background: { r: 30, g: 64, b: 175 } })
    .extend({
      top: 1189, bottom: 1189, left: 442, right: 442,
      background: { r: 30, g: 64, b: 175, alpha: 1 },
    })
    .resize(1284, 2778)
    .png()
    .toFile(path.join(ASSETS, 'splash.png'));
  console.log('✓ splash.png (1284x2778)');

  // 4. Generate favicon.png – 48x48
  await sharp(SOURCE)
    .resize(48, 48, { fit: 'contain', background: { r: 30, g: 64, b: 175, alpha: 1 } })
    .flatten({ background: { r: 30, g: 64, b: 175 } })
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));
  console.log('✓ favicon.png (48x48)');

  console.log('\nAll icons generated successfully!');
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
