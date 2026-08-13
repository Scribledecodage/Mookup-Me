import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPOSITORY = 'Scribledecodage/Mookup-Me';
const RELEASE_METADATA_URL = `https://github.com/${REPOSITORY}/releases/latest/download/latest.yml`;
const GITHUB_HEADERS = {
  'User-Agent': 'Mookup-Website',
};

type WindowsReleaseAsset = {
  version: string;
  name: string;
  size?: number;
  url: string;
};

function parseLatestWindowsMetadata(metadata: string): WindowsReleaseAsset {
  const version = metadata.match(/^version:\s*([^\s]+)\s*$/m)?.[1];
  const name = metadata.match(/^\s+-\s+url:\s*([^\s]+)\s*$/m)?.[1];
  const sizeValue = metadata.match(/^\s+size:\s*(\d+)\s*$/m)?.[1];

  if (!version || !name || !/^Mookup-Setup-.+\.exe$/i.test(name)) {
    throw new Error('Le latest.yml ne contient aucun installeur Windows valide.');
  }

  return {
    version,
    name,
    size: sizeValue ? Number(sizeValue) : undefined,
    url: `https://github.com/${REPOSITORY}/releases/latest/download/${encodeURIComponent(name)}`,
  };
}

async function getLatestWindowsAsset(): Promise<WindowsReleaseAsset> {
  // Le fichier latest.yml est public et évite la limite de l’API GitHub
  // lorsqu’aucun token serveur n’est configuré sur le déploiement web.
  const metadataResponse = await fetch(RELEASE_METADATA_URL, {
    headers: GITHUB_HEADERS,
    cache: 'no-store',
  });

  if (!metadataResponse.ok) {
    throw new Error(`Métadonnées Windows indisponibles (${metadataResponse.status})`);
  }

  return parseLatestWindowsMetadata(await metadataResponse.text());
}

export async function GET(request: Request) {
  try {
    const asset = await getLatestWindowsAsset();
    const requestUrl = new URL(request.url);

    if (requestUrl.searchParams.get('info') === '1') {
      return NextResponse.json({
        version: asset.version,
        filename: asset.name,
        size: asset.size,
      }, {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      });
    }

    // Le serveur suit la redirection GitHub en interne : le navigateur reste
    // sur le site et reçoit directement un fichier à télécharger.
    const installerResponse = await fetch(asset.url, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': GITHUB_HEADERS['User-Agent'],
      },
    });

    if (!installerResponse.ok || !installerResponse.body) {
      throw new Error(`Téléchargement Windows indisponible (${installerResponse.status})`);
    }

    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asset.name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (asset.size) headers.set('Content-Length', String(asset.size));

    return new Response(installerResponse.body, { status: 200, headers });
  } catch (error) {
    console.error('[Windows download]', error);
    return NextResponse.json({
      error: 'La dernière version Windows est momentanément indisponible.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
