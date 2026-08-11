import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get('term');
  if (!term?.trim()) return NextResponse.json({ items: [] });

  try {
    const upstream = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=french&cc=FR`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 60 } }
    );
    if (!upstream.ok) return NextResponse.json({ items: [] });
    const data = await upstream.json();

    const items = (data.items || []).slice(0, 6).map((item: any) => ({
      id: item.id,
      name: item.name,
      logo: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.id}/capsule_sm_120.jpg`,
    }));

    return NextResponse.json({ items }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
