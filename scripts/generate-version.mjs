import fs from 'fs';

// Version Web (basée sur le timestamp pour forcer le rafraîchissement)
const webVersion = Date.now().toString();

// Version Native (basée sur le package.json)
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const nativeVersion = packageJson.version;

const versionData = {
  version: webVersion, // Pour la mise à jour Service Worker (UI/Design)
  nativeVersion: nativeVersion, // Version Electron / desktop
  androidVersion: '0.0.1',
  apkUrl: "https://github.com/Scribledecodage/Mookup-Me/releases/download/v0.0.1/Mookup-Messagerie.apk"
};

fs.writeFileSync('./public/version.json', JSON.stringify(versionData, null, 2));
console.log('Version generated:', versionData);
