// Generates clearly-labeled placeholder JPGs in /public/images/alamod/.
// Real photos with the same names simply replace these files.
// Usage: npm run placeholders   (add --force to overwrite existing files)
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "public/images/alamod");
mkdirSync(outDir, { recursive: true });
const force = process.argv.includes("--force");

const W = 2000;
const H = 1333;

const shots = [
  ["alamod-hero", "Wide room + lit ALAMOD MUSIC sign", 0.62, 0.25],
  ["studio-wide", "Wide: PDP kit, congas, wedges, mixer", 0.45, 0.6],
  ["equipment", "Sign + Ampeg B4R / Hartke heads", 0.7, 0.3],
  ["band-area", "Drummer view: cymbals, JBL PA, red sofa", 0.5, 0.75],
];

for (const [name, desc, lx, ly] of shots) {
  const file = path.join(outDir, `${name}.jpg`);
  if (existsSync(file) && !force) {
    console.log(`skip ${name}.jpg (exists)`);
    continue;
  }
  // Tiled labels so every crop on the site still shows which file to replace.
  let tiles = "";
  for (let y = 120; y < H; y += 220) {
    for (let x = (y / 220) % 2 ? 0 : -260; x < W; x += 620) {
      tiles += `<text x="${x}" y="${y}" font-family="monospace" font-size="22" letter-spacing="4" fill="#ffffff" fill-opacity="0.16">PLACEHOLDER · ${name}.jpg</text>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="l" cx="${lx}" cy="${ly}" r="0.75">
      <stop offset="0" stop-color="#F5363C" stop-opacity="0.38"/>
      <stop offset="0.45" stop-color="#1b2f6e" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#001235" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a1f5c"/>
      <stop offset="0.5" stop-color="#021436"/>
      <stop offset="1" stop-color="#3a0710"/>
    </linearGradient>
    <pattern id="g" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0V80" fill="none" stroke="#ffffff" stroke-opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#b)"/>
  <rect width="100%" height="100%" fill="url(#l)"/>
  <rect width="100%" height="100%" fill="url(#g)"/>
  ${tiles}
  <g font-family="monospace" fill="#ffffff" text-anchor="middle">
    <text x="${W / 2}" y="${H / 2 - 20}" font-size="54" font-weight="700" letter-spacing="6">REPLACE WITH REAL PHOTO</text>
    <text x="${W / 2}" y="${H / 2 + 40}" font-size="32" fill-opacity="0.8">/public/images/alamod/${name}.jpg</text>
    <text x="${W / 2}" y="${H / 2 + 90}" font-size="26" fill-opacity="0.6">${desc}</text>
  </g>
</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 78, mozjpeg: true }).toFile(file);
  console.log(`wrote ${name}.jpg`);
}

// Open Graph image (1200x630), regenerated from the hero if it is a real photo.
const og = path.join(root, "public/og-image.jpg");
const hero = path.join(outDir, "alamod-hero.jpg");
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#001235" stop-opacity="0.92"/><stop offset="0.7" stop-color="#001235" stop-opacity="0.2"/>
  </linearGradient></defs>
  <rect width="1200" height="630" fill="url(#s)"/>
  <rect x="64" y="70" width="56" height="6" fill="#F5363C"/>
  <g font-family="Arial Black, Arial, sans-serif" font-weight="900" fill="#fff">
    <text x="64" y="200" font-size="84">YOUR SOUND.</text>
    <text x="64" y="290" font-size="84">YOUR SPACE.</text>
    <text x="64" y="380" font-size="84" fill="#F5363C">YOUR SESSION.</text>
  </g>
  <text x="64" y="540" font-family="monospace" font-size="26" letter-spacing="4" fill="#fff">ALAMOD STUDIO · MIAMI REHEARSAL SPACE</text>
</svg>`;
await sharp(hero)
  .resize(1200, 630, { fit: "cover", position: "attention" })
  .composite([{ input: Buffer.from(overlay) }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(og);
console.log("wrote og-image.jpg");
