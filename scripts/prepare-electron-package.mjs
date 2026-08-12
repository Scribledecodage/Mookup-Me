import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const stagingDir = path.join(root, '.electron-app');
const rootPackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const dependencyNames = new Set();

function collectDependencies(packageName) {
  if (dependencyNames.has(packageName)) return;
  dependencyNames.add(packageName);

  const packagePath = path.join(root, 'node_modules', packageName, 'package.json');
  if (!fs.existsSync(packagePath)) {
    throw new Error(`Dépendance Electron introuvable: ${packageName}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  for (const dependency of Object.keys(packageJson.dependencies || {})) {
    collectDependencies(dependency);
  }
}

function copyDependency(packageName) {
  const source = path.join(root, 'node_modules', packageName);
  const destination = path.join(stagingDir, 'node_modules', packageName);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

fs.cpSync(path.join(root, 'electron', 'main.cjs'), path.join(stagingDir, 'main.cjs'));
fs.cpSync(path.join(root, 'electron', 'preload.cjs'), path.join(stagingDir, 'preload.cjs'));
fs.mkdirSync(path.join(stagingDir, 'public'), { recursive: true });
fs.cpSync(path.join(root, 'public', 'Logo.png'), path.join(stagingDir, 'public', 'Logo.png'));

const updater = rootPackage.dependencies['electron-updater'];
if (!updater) throw new Error('electron-updater doit être une dépendance de production.');
collectDependencies('electron-updater');
for (const dependency of dependencyNames) copyDependency(dependency);

fs.writeFileSync(
  path.join(stagingDir, 'package.json'),
  `${JSON.stringify({
    name: 'mookup-electron',
    version: rootPackage.version,
    description: rootPackage.description,
    author: rootPackage.author,
    main: 'main.cjs',
    dependencies: { 'electron-updater': updater },
  }, null, 2)}\n`,
);

console.log(`Electron staging prête: ${dependencyNames.size} dépendances runtime.`);
