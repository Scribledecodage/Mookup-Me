import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type JsonRecord = Record<string, unknown>;

type StickerResult = {
  url: string;
  previewUrl?: string;
  title: string;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeResults(payload: unknown): StickerResult[] {
  const payloadRecord = asRecord(payload);
  const items = Array.isArray(payloadRecord.data) ? payloadRecord.data : [];

  return items
    .map(rawItem => {
      const item = asRecord(rawItem);
      const images = asRecord(item.images);
      const original = asRecord(images.original);
      const fixedHeight = asRecord(images.fixed_height);
      return {
        url: asString(original.url, asString(fixedHeight.url, '')),
        previewUrl: asString(fixedHeight.url, asString(original.url, '')),
        title: asString(item.title, 'Sticker'),
      };
    })
    .filter(item => item.url);
}

async function getGiphyApiKey(): Promise<string | undefined> {
  if (process.env.GIPHY_API_KEY) return process.env.GIPHY_API_KEY;

  try {
    const localConfig = await readFile(path.join(process.cwd(), '.env.gifs.local'), 'utf8');
    const keyLine = localConfig.split(/\r?\n/).find(line => line.startsWith('GIPHY_API_KEY='));
    return keyLine?.slice('GIPHY_API_KEY='.length).trim() || undefined;
  } catch {
    return undefined;
  }
}

async function getGifFallback(request: Request, search: string, page: number, limit: number) {
  try {
    const fallbackUrl = new URL('/api/gifs', request.url);
    if (search) fallbackUrl.searchParams.set('q', search);
    fallbackUrl.searchParams.set('page', String(page));
    fallbackUrl.searchParams.set('limit', String(limit));

    const response = await fetch(fallbackUrl, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const payloadRecord = asRecord(payload);
    return {
      results: Array.isArray(payloadRecord.results) ? payloadRecord.results : [],
      hasNext: Boolean(payloadRecord.hasNext),
      provider: typeof payloadRecord.provider === 'string' ? payloadRecord.provider : 'gif-fallback',
      configured: true,
    };
  } catch (error) {
    console.warn('Sticker fallback unavailable:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q')?.trim() || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(8, Number(searchParams.get('limit') || '24')));
  const apiKey = await getGiphyApiKey();

  if (!apiKey) {
    const fallback = await getGifFallback(request, search, page, limit);
    return NextResponse.json(fallback || {
      results: [],
      hasNext: false,
      configured: false,
      provider: 'gif-fallback',
    });
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      limit: String(limit),
      offset: String((page - 1) * limit),
      rating: 'pg-13',
      lang: 'fr',
    });
    const endpoint = search ? 'search' : 'trending';
    if (search) params.set('q', search);

    const response = await fetch(`https://api.giphy.com/v1/stickers/${endpoint}?${params}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': 'Mookup-Sticker-Search/1.0' },
    });
    if (!response.ok) {
      console.warn(`GIPHY stickers returned ${response.status}; using GIF fallback.`);
      const fallback = await getGifFallback(request, search, page, limit);
      return NextResponse.json(fallback || {
        results: [],
        hasNext: false,
        configured: true,
        provider: 'gif-fallback',
      });
    }

    const payload: unknown = await response.json();
    const pagination = asRecord(asRecord(payload).pagination);
    const total = Number(pagination.total_count || 0);
    const offset = Number(pagination.offset || 0);
    const count = Number(pagination.count || 0);

    return NextResponse.json({
      results: normalizeResults(payload),
      hasNext: offset + count < total,
      provider: 'giphy',
      configured: true,
    });
  } catch (error) {
    console.warn('Sticker API error; using GIF fallback:', error);
    const fallback = await getGifFallback(request, search, page, limit);
    return NextResponse.json(fallback || {
      results: [],
      hasNext: false,
      configured: true,
      provider: 'gif-fallback',
    });
  }
}
