This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Geist.

## Windows desktop app (Electron)

The Electron shell opens the deployed Mookup site and keeps desktop integration isolated from the web page. Game detection, overlays, and screen sharing are intentionally not included yet.

```bash
# Démarre automatiquement Next.js puis Electron en local
npm run electron

# Alternative équivalente
npm run electron:dev
```

Le lanceur réutilise un serveur déjà disponible sur `http://localhost:3000` et l’arrête automatiquement s’il l’a démarré lui-même. Pour ouvrir le site déployé dans Electron, utilisez `MOOKUP_ELECTRON_URL=https://mookup-me.vercel.app npm run electron:dev` ou construisez l’application avec `npm run electron:dist`.

The shell uses a secure preload bridge with `contextIsolation`, sandboxing, and no Node.js integration in the page. The URL can be overridden with `MOOKUP_ELECTRON_URL` (test/local) or `MOOKUP_APP_URL` (deployment active, for example `https://your-project.vercel.app`).

> L’adresse stable de production est `https://mookup-me.vercel.app`. Si l’adresse Vercel change un jour, définissez `MOOKUP_APP_URL` avec la nouvelle URL avant de reconstruire les applications desktop.

### Auto-update du binaire Electron

L’application empaquetée utilise `electron-updater` et GitHub Releases :

1. elle vérifie une release toutes les 30 minutes et 8 secondes après le démarrage ;
2. elle télécharge la nouvelle version en arrière-plan ;
3. elle affiche la progression dans le titre de la fenêtre ;
4. elle installe la version puis redémarre automatiquement après le téléchargement.
5. elle écrit chaque étape dans les DevTools et dans le journal local `updater.log`.

Dans Electron, les messages sont visibles avec `Ctrl+Shift+I` ou dans `Help → Ouvrir le journal des mises à jour`. Le journal permet de vérifier si `update-downloaded`, `installer-launch-requested`, `before-quit` et `application-restarted-after-update` ont bien été exécutés.

Important : l’installeur NSIS est un processus Windows séparé et ne possède pas de DevTools Chromium. Le dernier message est donc écrit avant la fermeture, puis le démarrage réussi est enregistré dans le journal après le redémarrage.

En développement, l’auto-update est désactivé (`npm run electron:dev`). Le binaire doit être construit avec `electron-builder` :

```bash
npm run electron:dist       # construit l’installeur localement
npm run electron:pack       # vérifie seulement le contenu empaqueté
npm run electron:publish    # publie sur GitHub Releases
```

La release automatique multi-plateforme est définie dans `.github/workflows/release.yml`. Pour publier une version depuis un dépôt propre :

```bash
# modifier la version dans package.json, puis commiter les changements
npm run release
```

Le script crée et pousse le tag `vX.Y.Z`. GitHub Actions construit alors les installeurs Windows, macOS et Linux et les publie dans la release GitHub. Le dépôt configuré est `Scribledecodage/Mookup-Me`.

### Signature automatique Windows

Le workflow accepte désormais la signature automatique sans mettre de certificat dans le dépôt :

1. obtenir un certificat Windows OV/EV au format `.pfx`/`.p12` ou activer Azure Trusted Signing ;
2. convertir le fichier en base64 ;
3. créer dans GitHub `Settings → Secrets and variables → Actions` :
   - `WIN_CSC_LINK` : contenu base64 du certificat ;
   - `WIN_CSC_KEY_PASSWORD` : mot de passe du certificat ;
4. relancer une release avec un nouveau tag.

Le workflow reste compatible avec les builds non signés tant que ces secrets ne sont pas configurés. Pour une vraie confiance Windows, un certificat public est nécessaire : `publisherName` seul ne signe pas l’application.

Pour macOS, configurez la signature Apple (`CSC_LINK`, `CSC_KEY_PASSWORD`, notarisation) avant une distribution publique. Sans signature, macOS peut bloquer l’installeur.

Variables utiles :

- `MOOKUP_APP_URL` : URL distante chargée par Electron en production ;
- `MOOKUP_ELECTRON_URL` : URL locale ou de test ;
- `MOOKUP_DISABLE_AUTO_UPDATE=1` : désactive l’updater pour un test ;
- `MOOKUP_ALLOW_PRERELEASE=1` : autorise les releases GitHub préliminaires.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
