'use client';

type PiperSession = {
  predict: (text: string) => Promise<Blob>;
};

type WordSpan = {
  start: number;
  end: number;
};

type EdgeWordTiming = {
  text: string;
  startMs: number;
  durationMs: number;
};

type SpeechSentenceRange = {
  start: number;
  end: number;
};

export type LocalSpeechCallbacks = {
  onSentenceChange?: (index: number) => void;
  onWordChange?: (sentenceIndex: number, word: string, wordIndex: number) => void;
  onComplete?: () => void;
};

const DEFAULT_VOICE = 'fr_FR-siwis-medium';
// Piper 1.0.4 pointe par défaut vers cdnjs/ONNX Runtime 1.18.0,
// où le fichier jsep.mjs demandé n’est plus disponible. jsDelivr expose
// les fichiers de la version réellement installée dans l’application.
const ONNX_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
const PIPER_WASM_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';

let piperSessionPromise: Promise<PiperSession> | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioURL: string | null = null;
let activeAudioResolve: ((finished: boolean) => void) | null = null;
let activeSpeechCallbacks: LocalSpeechCallbacks | null = null;
let estimatedWordCleanup: (() => void) | null = null;
let activeEdgeAbortController: AbortController | null = null;
let speechRequestId = 0;

export function splitSpeechSentences(text: string): string[] {
  return (text.match(/[^.!?…]+(?:[.!?…]+|$)/g) || [text])
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function getWordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  const wordPattern = /[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu;
  let match: RegExpExecArray | null;
  while ((match = wordPattern.exec(text)) !== null) {
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

function stopEstimatedWordProgress() {
  estimatedWordCleanup?.();
  estimatedWordCleanup = null;
}

function getSentenceRanges(text: string): SpeechSentenceRange[] {
  const ranges: SpeechSentenceRange[] = [];
  const sentencePattern = /[^.!?…]+(?:[.!?…]+|$)/g;
  let match: RegExpExecArray | null;
  while ((match = sentencePattern.exec(text)) !== null) {
    const value = match[0];
    const leadingWhitespace = value.search(/\S/);
    if (leadingWhitespace < 0) continue;
    const start = match.index + leadingWhitespace;
    ranges.push({ start, end: start + value.trim().length });
  }
  return ranges;
}

function normalizeSpeechWord(value: string) {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function findSentenceForWord(word: WordSpan, ranges: SpeechSentenceRange[]) {
  return ranges.findIndex(range => word.start >= range.start && word.start < range.end);
}

function startTimedWordProgress(
  text: string,
  callbacks: LocalSpeechCallbacks,
  timings: EdgeWordTiming[],
) {
  stopEstimatedWordProgress();
  const sourceWords = getWordSpans(text);
  const sentenceRanges = getSentenceRanges(text);
  if (sourceWords.length === 0 || timings.length === 0 || !callbacks.onWordChange) return () => {};

  const timers: ReturnType<typeof setTimeout>[] = [];
  let cancelled = false;
  let lastSentenceIndex = -1;
  const mappedTimings = timings.map((timing, timingIndex) => {
    let sourceWordIndex = Math.min(timingIndex, sourceWords.length - 1);
    const target = normalizeSpeechWord(timing.text);
    const matchingIndex = sourceWords.findIndex((word, index) => (
      index >= timingIndex && normalizeSpeechWord(text.slice(word.start, word.end)) === target
    ));
    if (matchingIndex >= 0) sourceWordIndex = matchingIndex;
    const sourceWord = sourceWords[sourceWordIndex];
    const sentenceIndex = findSentenceForWord(sourceWord, sentenceRanges);
    const sentenceRange = sentenceRanges[sentenceIndex] || { start: 0, end: text.length };
    const localWords = getWordSpans(text.slice(sentenceRange.start, sentenceRange.end));
    const localWordIndex = localWords.findIndex(word => sentenceRange.start + word.start === sourceWord.start);
    return {
      timing,
      sourceWord,
      sentenceIndex: Math.max(0, sentenceIndex),
      localWordIndex: Math.max(0, localWordIndex),
    };
  });

  mappedTimings.forEach(({ timing, sourceWord, sentenceIndex, localWordIndex }) => {
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (sentenceIndex !== lastSentenceIndex) {
        lastSentenceIndex = sentenceIndex;
        callbacks.onSentenceChange?.(sentenceIndex);
      }
      callbacks.onWordChange?.(
        sentenceIndex,
        text.slice(sourceWord.start, sourceWord.end),
        localWordIndex,
      );
    }, Math.max(0, timing.startMs));
    timers.push(timer);
  });

  const cleanup = () => {
    cancelled = true;
    timers.forEach(timer => clearTimeout(timer));
  };
  estimatedWordCleanup = cleanup;
  return cleanup;
}

/**
 * Firefox, certains WebViews et Piper ne fournissent pas toujours les événements
 * de mot. Cette estimation garde donc la surbrillance utile sans prétendre être
 * un alignement phonétique exact.
 */
function startEstimatedWordProgress(
  sentence: string,
  sentenceIndex: number,
  callbacks: LocalSpeechCallbacks,
  durationMs?: number,
) {
  stopEstimatedWordProgress();
  const words = getWordSpans(sentence);
  if (words.length === 0 || !callbacks.onWordChange) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;
  const estimatedDuration = durationMs ?? Math.max(900, (words.length * 60_000) / 170);
  const interval = Math.max(110, estimatedDuration / words.length);

  const tick = (wordIndex: number) => {
    if (cancelled || wordIndex >= words.length) return;
    const word = words[wordIndex];
    callbacks.onWordChange?.(sentenceIndex, sentence.slice(word.start, word.end), wordIndex);
    timer = setTimeout(() => tick(wordIndex + 1), interval);
  };
  timer = setTimeout(() => tick(0), 80);

  const cleanup = () => {
    cancelled = true;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  estimatedWordCleanup = cleanup;
  return cleanup;
}

async function createSingleThreadedPiperSession(TtsSession: {
  create: (options: {
    voiceId: string;
    wasmPaths?: {
      onnxWasm: string;
      piperData: string;
      piperWasm: string;
    };
  }) => Promise<PiperSession>;
}): Promise<PiperSession> {
  // Piper choisit automatiquement navigator.hardwareConcurrency. Sans COOP/COEP,
  // cela déclenche un warning puis un repli WASM ; on demande directement un seul
  // thread pour garder le même comportement sans modifier les headers de toute l’app.
  const browserNavigator = window.navigator as Navigator & { hardwareConcurrency: number };
  const originalThreadCount = browserNavigator.hardwareConcurrency;
  let canRestore = false;

  try {
    Object.defineProperty(browserNavigator, 'hardwareConcurrency', {
      configurable: true,
      value: 1,
    });
    canRestore = true;
    return await TtsSession.create({
      voiceId: DEFAULT_VOICE,
      wasmPaths: {
        onnxWasm: ONNX_WASM_PATH,
        piperData: `${PIPER_WASM_BASE}.data`,
        piperWasm: `${PIPER_WASM_BASE}.wasm`,
      },
    });
  } finally {
    if (canRestore) {
      try {
        Object.defineProperty(browserNavigator, 'hardwareConcurrency', {
          configurable: true,
          value: originalThreadCount,
        });
      } catch {
        // Certains navigateurs exposent cette propriété comme non configurable.
      }
    }
  }
}

async function getPiperSession(): Promise<PiperSession> {
  if (!piperSessionPromise) {
    piperSessionPromise = import('@mintplex-labs/piper-tts-web')
      .then(({ TtsSession }) => createSingleThreadedPiperSession(TtsSession))
      .catch(error => {
        piperSessionPromise = null;
        throw error;
      });
  }
  return piperSessionPromise;
}

function clearAudio(finished = false) {
  const resolveAudio = activeAudioResolve;
  activeAudioResolve = null;
  stopEstimatedWordProgress();
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  if (activeAudioURL) {
    URL.revokeObjectURL(activeAudioURL);
    activeAudioURL = null;
  }
  resolveAudio?.(finished);
}

export function stopLocalSpeech() {
  speechRequestId += 1;
  activeSpeechCallbacks?.onComplete?.();
  activeSpeechCallbacks = null;
  activeEdgeAbortController?.abort();
  activeEdgeAbortController = null;
  clearAudio();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function chooseFrenchVoice(voices: SpeechSynthesisVoice[]) {
  const frenchVoices = voices.filter(voice => voice.lang.toLowerCase().startsWith('fr'));
  if (frenchVoices.length === 0) return undefined;

  // Les voix locales évitent un aller-retour réseau et sont généralement les plus
  // rapides. La voix exacte reste celle choisie par le système de l'appareil.
  return frenchVoices.find(voice => voice.lang.toLowerCase() === 'fr-fr' && voice.localService)
    || frenchVoices.find(voice => voice.lang.toLowerCase() === 'fr-fr')
    || frenchVoices.find(voice => voice.localService)
    || frenchVoices[0];
}

async function getFrenchVoice(): Promise<SpeechSynthesisVoice | undefined> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  const synthesis = window.speechSynthesis;
  const voices = synthesis.getVoices();
  if (voices.length > 0) return chooseFrenchVoice(voices);

  return new Promise(resolve => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (timeout !== null) clearTimeout(timeout);
      synthesis.removeEventListener('voiceschanged', finish);
      resolve(chooseFrenchVoice(synthesis.getVoices()));
    };
    synthesis.addEventListener('voiceschanged', finish, { once: true });
    timeout = setTimeout(finish, 250);
  });
}

async function speakWithEdgeTts(
  text: string,
  requestId: number,
  callbacks: LocalSpeechCallbacks,
): Promise<boolean> {
  if (typeof window === 'undefined' || requestId !== speechRequestId) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  activeEdgeAbortController = controller;
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok || requestId !== speechRequestId) return false;

    const data = await response.json() as {
      audio?: string;
      mimeType?: string;
      timings?: EdgeWordTiming[];
    };
    if (!data.audio || !data.timings?.length) return false;

    const binary = atob(data.audio);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const audioBlob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
    return await playAudioBlob(audioBlob, text, 0, callbacks, requestId, data.timings);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    if (activeEdgeAbortController === controller) activeEdgeAbortController = null;
  }
}

function speakWithBrowser(
  text: string,
  requestId: number,
  callbacks: LocalSpeechCallbacks,
): Promise<boolean> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve(false);

  return getFrenchVoice().then(voice => new Promise(resolve => {
    const sentences = splitSpeechSentences(text);
    let sentenceIndex = 0;

    const speakNextSentence = () => {
      if (requestId !== speechRequestId || sentenceIndex >= sentences.length) {
        stopEstimatedWordProgress();
        resolve(requestId === speechRequestId);
        return;
      }

      const currentSentenceIndex = sentenceIndex;
      const sentence = sentences[currentSentenceIndex];
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'fr-FR';
      utterance.voice = voice || null;
      utterance.rate = 0.98;
      utterance.pitch = 1;
      let receivedWordBoundary = false;
      const estimateCleanup = startEstimatedWordProgress(sentence, currentSentenceIndex, callbacks);

      callbacks.onSentenceChange?.(currentSentenceIndex);
      utterance.onboundary = event => {
        if (event.name && event.name !== 'word') return;
        const words = getWordSpans(sentence);
        const word = words.find(span => span.end > event.charIndex);
        if (!word) return;
        if (!receivedWordBoundary) {
          receivedWordBoundary = true;
          estimateCleanup();
          if (estimatedWordCleanup === estimateCleanup) estimatedWordCleanup = null;
        }
        callbacks.onWordChange?.(currentSentenceIndex, sentence.slice(word.start, word.end), words.indexOf(word));
      };
      utterance.onend = () => {
        estimateCleanup();
        if (estimatedWordCleanup === estimateCleanup) estimatedWordCleanup = null;
        sentenceIndex += 1;
        speakNextSentence();
      };
      utterance.onerror = () => {
        estimateCleanup();
        if (estimatedWordCleanup === estimateCleanup) estimatedWordCleanup = null;
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNextSentence();
  }));
}

function playAudioBlob(
  blob: Blob,
  sentence: string,
  sentenceIndex: number,
  callbacks: LocalSpeechCallbacks,
  requestId: number,
  timings: EdgeWordTiming[] = [],
): Promise<boolean> {
  if (requestId !== speechRequestId) return Promise.resolve(false);

  return new Promise(resolve => {
    activeAudioURL = URL.createObjectURL(blob);
    const audio = new Audio(activeAudioURL);
    activeAudio = audio;
    activeAudioResolve = resolve;
    let progressCleanup = timings.length
      ? () => {}
      : startEstimatedWordProgress(sentence, sentenceIndex, callbacks);
    audio.onloadedmetadata = () => {
      if (!timings.length && Number.isFinite(audio.duration) && audio.duration > 0) {
        progressCleanup();
        progressCleanup = startEstimatedWordProgress(sentence, sentenceIndex, callbacks, audio.duration * 1000);
      }
    };
    audio.onended = () => {
      progressCleanup();
      clearAudio(true);
    };
    audio.onerror = () => {
      progressCleanup();
      clearAudio(false);
    };
    audio.play().then(() => {
      if (timings.length) {
        progressCleanup();
        progressCleanup = startTimedWordProgress(sentence, callbacks, timings);
      }
    }).catch(() => {
      progressCleanup();
      clearAudio(false);
    });
  });
}

/** Lit un message avec Edge-TTS, puis la voix native et Piper en replis. */
export async function speakLocalSpeech(text: string, callbacks: LocalSpeechCallbacks = {}) {
  const sentences = splitSpeechSentences(text);
  if (sentences.length === 0 || typeof window === 'undefined') return;

  stopLocalSpeech();
  const requestId = speechRequestId;
  activeSpeechCallbacks = callbacks;

  try {
    const edgeSpeechWorked = await speakWithEdgeTts(text, requestId, callbacks);
    if (edgeSpeechWorked || requestId !== speechRequestId) return;

    const browserSpeechWorked = await speakWithBrowser(text, requestId, callbacks);
    if (browserSpeechWorked || requestId !== speechRequestId) return;

    const session = await getPiperSession();
    for (const [index, sentence] of sentences.entries()) {
      if (requestId !== speechRequestId) return;
      callbacks.onSentenceChange?.(index);
      const audioBlob = await session.predict(sentence);
      if (!(await playAudioBlob(audioBlob, sentence, index, callbacks, requestId))) return;
    }
  } catch {
    // Dernier repli pour les WebViews qui n'exposent ni voix native ni Piper.
    for (const [index, sentence] of sentences.entries()) {
      if (requestId !== speechRequestId) return;
      callbacks.onSentenceChange?.(index);
      if (!(await speakWithBrowser(sentence, requestId, callbacks))) return;
    }
  } finally {
    if (requestId === speechRequestId && activeSpeechCallbacks === callbacks) {
      activeSpeechCallbacks = null;
      callbacks.onComplete?.();
    }
  }
}
