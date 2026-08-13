import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APK_URL = 'https://github.com/Scribledecodage/Mookup-Me/releases/download/v0.0.1/Mookup-Messagerie.apk';
const APK_FILENAME = 'Mookup-Messagerie.apk';

export async function GET() {
  try {
    const apkResponse = await fetch(APK_URL, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mookup-Website',
      },
    });

    if (!apkResponse.ok || !apkResponse.body) {
      throw new Error(`Téléchargement APK indisponible (${apkResponse.status})`);
    }

    const headers = new Headers({
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${APK_FILENAME}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    const contentLength = apkResponse.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new Response(apkResponse.body, { status: 200, headers });
  } catch (error) {
    console.error('[Android download]', error);
    return NextResponse.json({
      error: 'L’APK Android est momentanément indisponible.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
