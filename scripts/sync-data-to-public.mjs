import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'data');
const targetDir = path.join(rootDir, 'public', 'data');

const filesToCopy = [
  'apartments-db.json',
  'archived-apartments.json',
  'latest-prices.json'
];

if (!fs.existsSync(sourceDir)) {
  console.warn('No data directory found. Skipping static data sync.');
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const fileName of filesToCopy) {
  const sourcePath = path.join(sourceDir, fileName);
  const targetPath = path.join(targetDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`Missing source file: ${fileName}. Skipping.`);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Synced ${fileName} -> public/data/${fileName}`);
}
