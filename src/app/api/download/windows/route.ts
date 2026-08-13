import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPOSITORY = 'Scribledecodage/Mookup-Me';
const RELEASES_URL = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=20`;
const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Mookup-Website',
};

type GithubReleaseAsset = {
  name: string;
  size: number;
  browser_download_url: string;
};

type GithubRelease = {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at?: string | null;
  assets: GithubReleaseAsset[];
};

type WindowsReleaseAsset = {
  version: string;
  name: string;
  size?: number;
  url: string;
};

function findLatestWindowsAsset(releases: GithubRelease[]): WindowsReleaseAsset {
  const candidates = releases
    .filter(release => !release.draft && !release.prerelease)
    .sort((left, right) => {
      const leftDate = Date.parse(left.published_at || left.created_at);
      const rightDate = Date.parse(right.published_at || right.created_at);
      return rightDate - leftDate;
    })
    .map(release => {
      const asset = release.assets.find(({ name }) => /^Mookup-Setup-.+\.exe$/i.test(name));
      return asset ? { release, asset } : null;
    })
    .filter((candidate): candidate is { release: GithubRelease; asset: GithubReleaseAsset } => candidate !== null);

  const candidate = candidates[0];
  if (!candidate) {
    throw new Error('Aucun installeur Windows publié dans les releases Mookup.');
  }

  return {
    version: candidate.release.tag_name.replace(/^v/i, ''),
    name: candidate.asset.name,
    size: candidate.asset.size,
    url: candidate.asset.browser_download_url,
  };
}

async function getLatestWindowsAsset(): Promise<WindowsReleaseAsset> {
  const releasesResponse = await fetch(RELEASES_URL, {
    headers: GITHUB_HEADERS,
    cache: 'no-store',
  });

  if (!releasesResponse.ok) {
    throw new Error(`Releases Windows indisponibles (${releasesResponse.status})`);
  }

  return findLatestWindowsAsset(await releasesResponse.json() as GithubRelease[]);
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
