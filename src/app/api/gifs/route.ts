import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

type JsonRecord = Record<string, unknown>;

type GifResult = {
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

function normalizeOpenverseResults(payload: unknown): GifResult[] {
  const payloadRecord = asRecord(payload);
  const items = Array.isArray(payloadRecord.results) ? payloadRecord.results : [];
  return items
    .map(rawItem => {
      const item = asRecord(rawItem);
      return {
        url: asString(item.url, ''),
        previewUrl: asString(item.thumbnail, asString(item.url, '')),
        title: asString(item.title, 'GIF libre'),
      };
    })
    .filter(item => item.url);
}

function normalizeKlipyResults(payload: unknown): GifResult[] {
  const payloadRecord = asRecord(payload);
  const dataRecord = asRecord(payloadRecord.data);
  const rawItems = dataRecord.data ?? payloadRecord.data;
  const items = Array.isArray(rawItems) ? rawItems : [];

  return items
    .map(rawItem => {
      const item = asRecord(rawItem);
      const files = asRecord(item.files);
      const fileCandidates = Object.values(files).map(asRecord);
      const preferredFile = [
        asRecord(files.gif),
        asRecord(files.mediumgif),
        asRecord(files.hd),
        asRecord(files.webp),
        ...fileCandidates,
      ].find(file => typeof file.url === 'string');

      return {
        url: asString(preferredFile?.url, asString(item.url, '')),
        title: asString(item.title, asString(item.slug, 'GIF')),
      };
    })
    .filter(item => item.url);
}

function normalizeGiphyResults(payload: unknown): GifResult[] {
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
        title: asString(item.title, 'GIF'),
      };
    })
    .filter(item => item.url);
}

async function getKlipyApiKey(): Promise<string | undefined> {
  if (process.env.KLIPY_API_KEY) return process.env.KLIPY_API_KEY;

  try {
    const localConfig = await readFile(path.join(process.cwd(), '.env.gifs.local'), 'utf8');
    const keyLine = localConfig.split(/\r?\n/).find(line => line.startsWith('KLIPY_API_KEY='));
    return keyLine?.slice('KLIPY_API_KEY='.length).trim() || undefined;
  } catch {
    return undefined;
  }
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

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q')?.trim() || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const perPage = Math.min(50, Math.max(8, Number(searchParams.get('limit') || '24')));
  const klipyKey = await getKlipyApiKey();
  const giphyKey = await getGiphyApiKey();

  try {
    // GIPHY est utilisé en priorité maintenant que sa clé beta est configurée.
    if (giphyKey) {
      const params = new URLSearchParams({
        api_key: giphyKey,
        limit: String(perPage),
        offset: String((page - 1) * perPage),
        rating: 'pg-13',
        lang: 'fr',
      });
      const endpoint = search ? 'search' : 'trending';
      if (search) params.set('q', search);

      const response = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'User-Agent': 'Mookup-GIF-Search/1.0' },
      });
      if (response.ok) {
        const payload: unknown = await response.json();
        const payloadRecord = asRecord(payload);
        const pagination = asRecord(payloadRecord.pagination);
        const total = Number(pagination.total_count || 0);
        const offset = Number(pagination.offset || 0);
        const count = Number(pagination.count || 0);
        return NextResponse.json({
          results: normalizeGiphyResults(payload),
          hasNext: offset + count < total,
          provider: 'giphy',
          configured: true,
        });
      }
    }
    // Openverse est libre, sans clé API, et ne renvoie que des GIFs sous licence ouverte.
    const openverseParams = new URLSearchParams({
      q: search || 'gif',
      page: String(page),
      page_size: String(perPage),
      mature: 'false',
      extension: 'gif',
    });
    const openverseResponse = await fetch(`https://api.openverse.org/v1/images/?${openverseParams}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': 'Mookup-GIF-Search/1.0' },
    });
    if (openverseResponse.ok) {
      const payload: unknown = await openverseResponse.json();
      const results = normalizeOpenverseResults(payload);
      const payloadRecord = asRecord(payload);
      const pageCount = Number(payloadRecord.page_count || 0);
      if (results.length > 0) {
        return NextResponse.json({
          results,
          hasNext: page < pageCount,
          provider: 'openverse',
          configured: true,
        });
      }
    }

    if (klipyKey) {
      const endpoint = search ? 'gifs/search' : 'gifs/trending';
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        locale: 'fr_FR',
        client_key: process.env.KLIPY_CLIENT_KEY || 'Mookupkey',
      });
      if (search) params.set('q', search);

      const response = await fetch(`https://api.klipy.com/api/v1/${encodeURIComponent(klipyKey)}/${endpoint}?${params}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json', 'User-Agent': 'Mookup-GIF-Search/1.0' },
      });
      if (response.ok) {
        const payload: unknown = await response.json();
        const data = asRecord(asRecord(payload).data);
        return NextResponse.json({
          results: normalizeKlipyResults(payload),
          hasNext: Boolean(data.has_next),
          provider: 'klipy',
          configured: true,
        });
      }
      console.warn(`KLIPY returned ${response.status}; returning an empty GIF result.`);
    }

    return NextResponse.json({ results: [], hasNext: false, configured: true, provider: 'openverse' });
  } catch (error) {
    console.error('GIF API error:', error);
    return NextResponse.json({ results: [], hasNext: false, configured: true }, { status: 502 });
  }
}
