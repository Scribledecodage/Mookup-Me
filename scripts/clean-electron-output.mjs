import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
for (const directory of ['dist', '.electron-app']) {
  const target = path.join(root, directory);
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Nettoyage Electron: ${directory}`);
}
