import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPOSITORY = 'Scribledecodage/Mookup-Me';
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Mookup-Website',
};

type GithubAsset = {
  name?: string;
  size?: number;
  browser_download_url?: string;
};

type GithubRelease = {
  tag_name?: string;
  name?: string;
  assets?: GithubAsset[];
};

async function getLatestWindowsAsset() {
  const releaseResponse = await fetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, {
    headers: GITHUB_HEADERS,
    cache: 'no-store',
  });

  if (!releaseResponse.ok) {
    throw new Error(`GitHub release indisponible (${releaseResponse.status})`);
  }

  const release = (await releaseResponse.json()) as GithubRelease;
  const asset = release.assets?.find((candidate) => (
    typeof candidate.name === 'string'
    && /^Mookup-Setup-.+\.exe$/i.test(candidate.name)
    && typeof candidate.browser_download_url === 'string'
  ));

  if (!asset?.name || !asset.browser_download_url) {
    throw new Error('Aucun installeur Windows n’est disponible dans la dernière release.');
  }

  return {
    version: release.tag_name || release.name || 'latest',
    name: asset.name,
    size: asset.size,
    url: asset.browser_download_url,
  };
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
