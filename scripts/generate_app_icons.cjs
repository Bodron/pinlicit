// Rebuild launcher assets from the original vector symbol, without the wordmark.
// Run: node scripts/generate_app_icons.cjs (requires backend/npm ci for sharp).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../backend/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/branding/pinbind_icon.svg'), 'utf8');
const paths = [...source.matchAll(/<path\s+d="([^"]+)"\s*\/?\s*>/g)].map(match => match[1]);
if (paths.length !== 3) throw Error('Expected the three original Pinbind symbol paths.');
const color = source.match(/<g[^>]+fill="(#[a-fA-F0-9]{6})"/)?.[1];
if (!color) throw Error('Missing original symbol color.');
const geometry = paths.map(d => `<path d="${d}"/>`).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#FFFFFF"/>
  <g fill="${color}" transform="translate(160 160) scale(17.6) translate(0 -0.889954)">
${geometry}
  </g>
</svg>\n`;
let written = 0;
function write(file, data) {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data);
  written++;
}
async function png(size, input = svg) {
  return sharp(Buffer.from(input)).resize(size, size).flatten({ background: '#FFFFFF' }).removeAlpha().png().toBuffer();
}
async function main() {
  write('assets/branding/pinbind_app_icon.svg', svg);
  write('assets/branding/pinbind_app_icon.png', await png(1024));
  for (const directory of ['ios/Runner/Assets.xcassets/AppIcon.appiconset', 'macos/Runner/Assets.xcassets/AppIcon.appiconset']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, directory, 'Contents.json'), 'utf8'));
    for (const entry of manifest.images) {
      if (!entry.filename) continue;
      const size = Math.round(parseFloat(entry.size) * parseFloat(entry.scale));
      write(`${directory}/${entry.filename}`, await png(size));
    }
  }
  for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
    write(`android/app/src/main/res/mipmap-${density}/ic_launcher.png`, await png(size));
  }
  // Foreground stays within the adaptive icon's central safe circle. Android
  // supplies the final circle/squircle; the white background is a separate layer.
  write('android/app/src/main/res/drawable/pinbind_icon_foreground.xml',
    `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <group android:translateX="31" android:translateY="29.9765529" android:scaleX="1.15" android:scaleY="1.15">
${paths.map(d => `    <path android:fillColor="${color}" android:pathData="${d}"/>`).join('\n')}
  </group>
</vector>\n`);
  write('android/app/src/main/res/values/pinbind_icon_colors.xml', '<resources><color name="pinbind_icon_background">#FFFFFF</color></resources>\n');
  write('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/pinbind_icon_background"/>\n  <foreground android:drawable="@drawable/pinbind_icon_foreground"/>\n</adaptive-icon>\n');
  write('web/favicon.png', await png(32));
  for (const size of [192, 512]) {
    write(`web/icons/Icon-${size}.png`, await png(size));
    // A square symbol must fit entirely within the PWA's central safe circle.
    const maskable = svg.replace('translate(160 160) scale(17.6)', 'translate(232 232) scale(14)');
    write(`web/icons/Icon-maskable-${size}.png`, await png(size, maskable));
  }
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(sizes.map(size => png(size)));
  const header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  buffers.forEach((buffer, index) => {
    const entry = 6 + index * 16;
    header[entry] = header[entry + 1] = sizes[index] === 256 ? 0 : sizes[index];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });
  write('windows/runner/resources/app_icon.ico', Buffer.concat([header, ...buffers]));
  console.log(`Generated ${written} launcher assets from the original SVG symbol.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
