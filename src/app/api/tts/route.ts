import { NextResponse } from 'next/server';
import { EdgeTTS } from 'edge-tts-universal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_VOICE = 'fr-FR-DeniseNeural';
const MAX_TEXT_LENGTH = 6_000;

function getClientAddress(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

// Limite simple par instance pour éviter qu’une route gratuite soit transformée
// en proxy TTS public. Une limite plus complète doit être placée au niveau du fournisseur.
const recentRequests = new Map<string, number[]>();
function isRateLimited(address: string) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const requests = (recentRequests.get(address) || []).filter(timestamp => timestamp > windowStart);
  if (requests.length >= 20) {
    recentRequests.set(address, requests);
    return true;
  }
  requests.push(now);
  recentRequests.set(address, requests);
  return false;
}

export async function POST(request: Request) {
  const address = getClientAddress(request);
  if (isRateLimited(address)) {
    return NextResponse.json({ error: 'Trop de demandes vocales, réessaie dans un instant.' }, { status: 429 });
  }

  try {
    const body = await request.json() as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return NextResponse.json({ error: 'Le texte est vide.' }, { status: 400 });
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: `Le texte ne peut pas dépasser ${MAX_TEXT_LENGTH} caractères.` }, { status: 413 });
    }

    const voice = process.env.EDGE_TTS_VOICE || DEFAULT_VOICE;
    const tts = new EdgeTTS(text, voice, {
      rate: process.env.EDGE_TTS_RATE || '+0%',
      volume: '+0%',
      pitch: '+0Hz',
    });
    const result = await tts.synthesize();
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

    return NextResponse.json({
      audio: audioBuffer.toString('base64'),
      mimeType: 'audio/mpeg',
      timings: result.subtitle.map(word => ({
        text: word.text,
        startMs: word.offset / 10_000,
        durationMs: word.duration / 10_000,
      })),
    });
  } catch (error) {
    console.error('Edge-TTS error:', error);
    return NextResponse.json({ error: 'Le service vocal est momentanément indisponible.' }, { status: 502 });
  }
}
