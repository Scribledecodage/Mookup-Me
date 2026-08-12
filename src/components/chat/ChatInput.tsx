'use client';

import React from 'react';
import { openImageInTab, openMediaInTab } from '@/lib/openImageInTab';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ReplyTo } from './types';
import { GifPicker, type Gif, type GifCategory, type GifProvider } from 'gif-picker-react';

import { 
  Brain,
  Plus, 
  CircleNotch, 
  Microphone,
  StopCircle,
  Sticker, 
  Smiley, 
  PaperPlaneRight, 
  SquaresFour,
  MagnifyingGlass,
  Trash, 
  Eye, 
  PencilSimple,
  Play, 
  FileImage,
  FileVideo,
  FileAudio,
  FilePdf,
  FileDoc,
  FileXls,
  FilePpt,
  FileZip,
  FileCode,
  FileText,
  X,
} from '@phosphor-icons/react';

const BASE_EMOJI_CATEGORY_GROUPS = {
  Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😢', '😭', '😡', '🤔', '😴', '🤗', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '🥱', '😌', '🤓', '🧐', '🤨', '😱', '😨', '😰', '😳', '🤪', '😜', '😝', '🤤', '🤑', '🤠', '😈', '👿', '💀', '☠️', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  Gestes: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '🤞', '✌️', '🤟', '👋', '🫶', '👀', '💅', '🫡', '👌', '🤘', '👊', '✍️', '☝️', '✋', '🤚', '🖐️', '🖖', '🤏', '👈', '👉', '👆', '👇', '☝️', '✊', '🤲', '🙇', '💃', '🕺', '🧘', '🏃', '🚶'],
  Cœurs: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '💯', '💥', '💫', '💦', '💨'],
  Objets: ['🔥', '⭐', '✨', '🎉', '🎊', '🎁', '🎈', '🚀', '💡', '✅', '❌', '⚡', '☀️', '🌈', '🍕', '🍔', '🍟', '🍎', '☕', '🍺', '🍻', '🍷', '🍰', '🎂', '🎵', '🎶', '⚽', '🏀', '🏆', '🎮', '📱', '💻', '📸', '💰', '🎓', '✈️', '🚗', '🏠', '🌍', '🐶', '🐱', '🦊', '🐼', '🦄', '🐸', '🌸', '🌺', '🌻', '🌹', '🌙', '☁️'],
} as const;

const normalizeEmoji = (emoji: string) => emoji.replace(/\uFE0F/g, '');

const createUnicodeEmojiList = () => {
  const emojis: string[] = [];
  const emojiPattern = /\p{Emoji}/u;
  const emojiPresentationPattern = /\p{Emoji_Presentation}/u;

  for (let codePoint = 0x20; codePoint <= 0x1faff; codePoint += 1) {
    const isAsciiSymbol = (codePoint >= 0x30 && codePoint <= 0x39) || codePoint === 0x23 || codePoint === 0x2a;
    const isRegionalIndicator = codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
    const isSkinTone = codePoint >= 0x1f3fb && codePoint <= 0x1f3ff;
    if (isAsciiSymbol || isRegionalIndicator || isSkinTone) continue;

    const emoji = String.fromCodePoint(codePoint);
    if (emojiPattern.test(emoji)) {
      emojis.push(emojiPresentationPattern.test(emoji) ? emoji : `${emoji}\uFE0F`);
    }
  }

  const regionalIndicators = Array.from({ length: 26 }, (_, index) => String.fromCodePoint(0x1f1e6 + index));
  for (const first of regionalIndicators) {
    for (const second of regionalIndicators) emojis.push(`${first}${second}`);
  }

  const skinTones = ['🏻', '🏼', '🏽', '🏾', '🏿'];
  const skinToneBaseRanges: [number, number][] = [
    [0x1f385, 0x1f385], [0x1f3c2, 0x1f3c4], [0x1f3c7, 0x1f3c7], [0x1f3ca, 0x1f3cc],
    [0x1f442, 0x1f443], [0x1f446, 0x1f450], [0x1f466, 0x1f478], [0x1f47c, 0x1f47c],
    [0x1f481, 0x1f483], [0x1f485, 0x1f487], [0x1f48f, 0x1f491], [0x1f4aa, 0x1f4aa],
    [0x1f574, 0x1f575], [0x1f57a, 0x1f57a], [0x1f590, 0x1f590], [0x1f595, 0x1f596],
    [0x1f645, 0x1f647], [0x1f64b, 0x1f64f], [0x1f6a3, 0x1f6a3], [0x1f6b4, 0x1f6b6],
    [0x1f6c0, 0x1f6c0], [0x1f6cc, 0x1f6cc], [0x1f90c, 0x1f90c], [0x1f90f, 0x1f90f],
    [0x1f918, 0x1f91f], [0x1f926, 0x1f926], [0x1f930, 0x1f939], [0x1f93c, 0x1f93e],
    [0x1f977, 0x1f977], [0x1f9b5, 0x1f9b6], [0x1f9b8, 0x1f9b9], [0x1f9bb, 0x1f9bd],
    [0x1f9cd, 0x1f9cf], [0x1f9d1, 0x1f9dd], [0x1fac3, 0x1fac5],
  ];
  for (const [start, end] of skinToneBaseRanges) {
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      const base = String.fromCodePoint(codePoint);
      if (emojiPattern.test(base)) {
        for (const skinTone of skinTones) emojis.push(`${base}${skinTone}`);
      }
    }
  }

  emojis.push(...['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '#️⃣', '*️⃣']);
  return Array.from(new Set(emojis));
};

const UNICODE_EMOJIS = createUnicodeEmojiList();
const CURATED_EMOJIS = new Set<string>(Object.values(BASE_EMOJI_CATEGORY_GROUPS).flat().map(normalizeEmoji));
type GeneratedEmojiGroup =
  | 'Smileys'
  | 'Gestes'
  | 'Cœurs'
  | 'Objets'
  | 'Animaux & nature'
  | 'Nourriture'
  | 'Activités'
  | 'Voyages & lieux'
  | 'Personnes & objets'
  | 'Symboles Unicode'
  | 'Drapeaux'
  | 'Autres reconnus';

const generatedEmojiGroups: Record<GeneratedEmojiGroup, string[]> = {
  Smileys: [],
  Gestes: [],
  'Cœurs': [],
  Objets: [],
  'Animaux & nature': [],
  Nourriture: [],
  Activités: [],
  'Voyages & lieux': [],
  'Personnes & objets': [],
  'Symboles Unicode': [],
  Drapeaux: [],
  'Autres reconnus': [],
};

const classifyUnicodeEmoji = (emoji: string): GeneratedEmojiGroup => {
  const firstCodePoint = emoji.codePointAt(0) || 0;
  const isFlag = emoji.length === 4 && firstCodePoint >= 0x1f1e6 && firstCodePoint <= 0x1f1ff;
  if (isFlag) return 'Drapeaux';
  if (firstCodePoint >= 0x1f600 && firstCodePoint <= 0x1f64f) return 'Smileys';
  if (firstCodePoint >= 0x1f440 && firstCodePoint <= 0x1f46f) return 'Gestes';
  if (firstCodePoint >= 0x1f48b && firstCodePoint <= 0x1f49f) return 'Cœurs';
  if (firstCodePoint >= 0x1f4a0 && firstCodePoint <= 0x1f4ff) return 'Objets';
  if (firstCodePoint >= 0x1f32d && firstCodePoint <= 0x1f37f) return 'Nourriture';
  if (firstCodePoint >= 0x1f380 && firstCodePoint <= 0x1f3ff) return 'Activités';
  if (firstCodePoint >= 0x1f400 && firstCodePoint <= 0x1f43f) return 'Animaux & nature';
  if (firstCodePoint >= 0x1f300 && firstCodePoint <= 0x1f31f) return 'Animaux & nature';
  if (firstCodePoint >= 0x1f680 && firstCodePoint <= 0x1f6ff) return 'Voyages & lieux';
  if (firstCodePoint >= 0x1f500 && firstCodePoint <= 0x1f5ff) return 'Symboles Unicode';
  if (firstCodePoint >= 0x1f440 && firstCodePoint <= 0x1faff) return 'Personnes & objets';
  if (firstCodePoint >= 0x2300 && firstCodePoint <= 0x27ff) return 'Symboles Unicode';
  return 'Autres reconnus';
};

for (const emoji of UNICODE_EMOJIS) {
  if (!CURATED_EMOJIS.has(normalizeEmoji(emoji))) generatedEmojiGroups[classifyUnicodeEmoji(emoji)].push(emoji);
}

const EMOJI_CATEGORY_GROUPS = {
  Smileys: [...BASE_EMOJI_CATEGORY_GROUPS.Smileys, ...generatedEmojiGroups.Smileys],
  Gestes: [...BASE_EMOJI_CATEGORY_GROUPS.Gestes, ...generatedEmojiGroups.Gestes],
  Cœurs: [...BASE_EMOJI_CATEGORY_GROUPS.Cœurs, ...generatedEmojiGroups.Cœurs],
  Objets: [...BASE_EMOJI_CATEGORY_GROUPS.Objets, ...generatedEmojiGroups.Objets],
  'Animaux & nature': generatedEmojiGroups['Animaux & nature'],
  Nourriture: generatedEmojiGroups.Nourriture,
  Activités: generatedEmojiGroups.Activités,
  'Voyages & lieux': generatedEmojiGroups['Voyages & lieux'],
  'Personnes & objets': generatedEmojiGroups['Personnes & objets'],
  'Symboles Unicode': generatedEmojiGroups['Symboles Unicode'],
  Drapeaux: generatedEmojiGroups.Drapeaux,
  'Autres reconnus': generatedEmojiGroups['Autres reconnus'],
} as const;

const EMOJI_CATEGORIES = {
  Tous: Array.from(new Set(Object.values(EMOJI_CATEGORY_GROUPS).flat())),
  ...EMOJI_CATEGORY_GROUPS,
} as const;

type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

type MediaCategory = { name: string; searchTerm: string };

type AttachmentFile = { type: 'image' | 'video' | 'file'; name: string };

const getAttachmentIcon = (file: AttachmentFile) => {
  if (file.type === 'image') return FileImage;
  if (file.type === 'video') return FileVideo;

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension || '')) return FileAudio;
  if (extension === 'pdf') return FilePdf;
  if (['doc', 'docx', 'odt', 'rtf'].includes(extension || '')) return FileDoc;
  if (['xls', 'xlsx', 'ods', 'csv'].includes(extension || '')) return FileXls;
  if (['ppt', 'pptx', 'odp'].includes(extension || '')) return FilePpt;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return FileZip;
  if (['js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'xml', 'py', 'java', 'php'].includes(extension || '')) return FileCode;
  return FileText;
};

const CATEGORY_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3E%3Crect width="120" height="120" rx="24" fill="%23e8ebff"/%3E%3Cpath d="M38 78l17-20 12 13 8-9 17 16H38z" fill="%235866e8"/%3E%3Ccircle cx="47" cy="43" r="8" fill="%235866e8"/%3E%3C/svg%3E';

export type BotDirectoryItem = {
  id?: string;
  slug?: string;
  name: string;
  description: string;
  icon?: string;
  emoji?: string;
  iconClass: string;
};

const BOT_DIRECTORY: BotDirectoryItem[] = [
  {
    name: 'BDD Bot',
    description: 'L’assistant intelligent idéal pour votre serveur. Réactif, il gère vos données.',
    icon: '/BDDBOT.png',
    iconClass: 'bg-[#6366f1]',
  },
];

const PROMOTED_BOTS = [
  { name: 'BDD Bot', description: 'L’assistant intelligent déjà disponible dans tous vos groupes.', icon: '/BDDBOT.png', emoji: '', visual: 'bg-[#6366f1]', iconClass: 'bg-[#6366f1]' },
];

function BotDirectoryIcon({ item }: { item: BotDirectoryItem | (typeof PROMOTED_BOTS)[number] }) {
  if ('icon' in item && item.icon) {
    return <img src={item.icon} alt="" className="h-full w-full rounded-xl object-cover" />;
  }

  if (!item.emoji) {
    return (
      <span className={`flex h-full w-full items-center justify-center rounded-xl ${item.iconClass}`} aria-hidden="true">
        <Brain size={28} weight="duotone" className="text-gray-500" />
      </span>
    );
  }

  return (
    <span className={`flex h-full w-full items-center justify-center rounded-xl ${item.iconClass} text-[26px]`} aria-hidden="true">
      {item.emoji}
    </span>
  );
}

const GIF_CATEGORIES: MediaCategory[] = [
  { name: 'Réactions', searchTerm: 'reaction funny' },
  { name: 'Drôle', searchTerm: 'funny comedy' },
  { name: 'Mèmes', searchTerm: 'meme' },
  { name: 'Amour', searchTerm: 'love romantic' },
  { name: 'Animaux', searchTerm: 'animal cat dog' },
  { name: 'Fêtes', searchTerm: 'party celebration' },
  { name: 'Sport', searchTerm: 'sports football' },
  { name: 'Jeux vidéo', searchTerm: 'gaming videogame' },
  { name: 'Films & séries', searchTerm: 'movie tv' },
  { name: 'Musique', searchTerm: 'music dance' },
  { name: 'Bravo', searchTerm: 'applause congratulations' },
  { name: 'Tristesse', searchTerm: 'sad cry' },
  { name: 'Surprise', searchTerm: 'wow shocked surprise' },
  { name: 'Expressions', searchTerm: 'expression reaction' },
  { name: 'Rire', searchTerm: 'laugh laughing' },
  { name: 'Joie', searchTerm: 'happy joy' },
  { name: 'Colère', searchTerm: 'angry mad' },
  { name: 'Bonjour', searchTerm: 'hello hi wave' },
  { name: 'Au revoir', searchTerm: 'goodbye bye' },
  { name: 'Merci', searchTerm: 'thank you thanks' },
  { name: 'Félicitations', searchTerm: 'congratulations celebrate' },
  { name: 'Anniversaire', searchTerm: 'birthday' },
  { name: 'Noël', searchTerm: 'christmas' },
  { name: 'Halloween', searchTerm: 'halloween spooky' },
  { name: 'Nouvel an', searchTerm: 'new year celebration' },
  { name: 'Danse', searchTerm: 'dance dancing' },
  { name: 'Chiens', searchTerm: 'dog puppy' },
  { name: 'Chats', searchTerm: 'cat kitten' },
  { name: 'Mignon', searchTerm: 'cute adorable' },
  { name: 'Nourriture', searchTerm: 'food cooking' },
  { name: 'Café', searchTerm: 'coffee morning' },
  { name: 'Travail', searchTerm: 'work office' },
  { name: 'École', searchTerm: 'school study' },
  { name: 'Sommeil', searchTerm: 'sleep tired' },
  { name: 'Internet', searchTerm: 'internet viral' },
  { name: 'Tendances', searchTerm: 'trending popular' },
  { name: 'Classique', searchTerm: 'classic reaction' },
  { name: 'Cinéma', searchTerm: 'movie cinema' },
  { name: 'Séries', searchTerm: 'tv show series' },
  { name: 'Basket', searchTerm: 'basketball' },
  { name: 'Football', searchTerm: 'football soccer' },
  { name: 'Formule 1', searchTerm: 'formula one racing' },
  { name: 'Voyage', searchTerm: 'travel vacation' },
];

const STICKER_CATEGORIES: MediaCategory[] = [
  { name: 'Mèmes', searchTerm: 'meme' },
  { name: 'Réactions', searchTerm: 'reaction' },
  { name: 'Animaux', searchTerm: 'animal' },
  { name: 'Amour', searchTerm: 'love' },
  { name: 'Drôle', searchTerm: 'funny' },
  { name: 'Fêtes', searchTerm: 'party celebration' },
  { name: 'Jeux vidéo', searchTerm: 'gaming' },
  { name: 'Films & séries', searchTerm: 'movie tv' },
  { name: 'Sport', searchTerm: 'sports' },
  { name: 'Musique', searchTerm: 'music' },
  { name: 'Personnages', searchTerm: 'character cartoon' },
  { name: 'Humeurs', searchTerm: 'mood feeling' },
  { name: 'Expressions', searchTerm: 'expression reaction' },
  { name: 'Rire', searchTerm: 'laugh laughing' },
  { name: 'Joie', searchTerm: 'happy joy' },
  { name: 'Colère', searchTerm: 'angry mad' },
  { name: 'Tristesse', searchTerm: 'sad cry' },
  { name: 'Bonjour', searchTerm: 'hello hi' },
  { name: 'Au revoir', searchTerm: 'goodbye bye' },
  { name: 'Merci', searchTerm: 'thank you thanks' },
  { name: 'Félicitations', searchTerm: 'congratulations' },
  { name: 'Anniversaire', searchTerm: 'birthday' },
  { name: 'Noël', searchTerm: 'christmas' },
  { name: 'Halloween', searchTerm: 'halloween spooky' },
  { name: 'Nouvel an', searchTerm: 'new year' },
  { name: 'Danse', searchTerm: 'dance dancing' },
  { name: 'Chiens', searchTerm: 'dog puppy' },
  { name: 'Chats', searchTerm: 'cat kitten' },
  { name: 'Mignon', searchTerm: 'cute adorable' },
  { name: 'Nourriture', searchTerm: 'food' },
  { name: 'Café', searchTerm: 'coffee' },
  { name: 'Travail', searchTerm: 'work office' },
  { name: 'École', searchTerm: 'school study' },
  { name: 'Sommeil', searchTerm: 'sleep tired' },
  { name: 'Internet', searchTerm: 'internet viral' },
  { name: 'Tendances', searchTerm: 'trending popular' },
  { name: 'Classique', searchTerm: 'classic reaction' },
  { name: 'Cinéma', searchTerm: 'movie cinema' },
  { name: 'Séries', searchTerm: 'tv show series' },
  { name: 'Basket', searchTerm: 'basketball' },
  { name: 'Football', searchTerm: 'football soccer' },
  { name: 'Voyage', searchTerm: 'travel vacation' },
];

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (val: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
  isUploading: boolean;
  pendingFiles: { id: string, url: string, type: 'image' | 'video' | 'file', name: string }[];
  setPendingFiles: React.Dispatch<React.SetStateAction<{ id: string, url: string, type: 'image' | 'video' | 'file', name: string }[]>>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sendMessage: (e: React.FormEvent) => void;
  sendVoiceMessage: (audio: Blob, duration: number, waveform: number[]) => Promise<void>;
  displayName: string;
  groupId: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  typingUsers?: { uid: string; displayName?: string }[];
  replyingTo?: ReplyTo | null;
  onCancelReply: () => void;
  onInstallBot?: (bot: BotDirectoryItem) => void;
  installedBotIds?: string[];
}

export default function ChatInput({
  newMessage,
  setNewMessage,
  handleInputChange,
  handlePaste,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  isDragging,
  isUploading,
  pendingFiles,
  setPendingFiles,
  handleImageUpload,
  sendMessage,
  sendVoiceMessage,
  displayName,
  groupId,
  fileInputRef,
  typingUsers = [],
  replyingTo,
  onCancelReply,
  onInstallBot,
  installedBotIds = [],
}: ChatInputProps) {
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [emojiCategory, setEmojiCategory] = React.useState<EmojiCategory>('Tous');
  const [emojiActiveCategory, setEmojiActiveCategory] = React.useState<EmojiCategory>('Tous');
  const [emojiSearch, setEmojiSearch] = React.useState('');
  const [showGifPicker, setShowGifPicker] = React.useState(false);
  const [showStickerPicker, setShowStickerPicker] = React.useState(false);
  const [showBotsPicker, setShowBotsPicker] = React.useState(false);
  const [botSearch, setBotSearch] = React.useState('');
  const [customBots, setCustomBots] = React.useState<BotDirectoryItem[]>([]);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const botsPickerRef = React.useRef<HTMLDivElement>(null);
  const emojiGridRef = React.useRef<HTMLDivElement>(null);
  const emojiSectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const gifPickerRef = React.useRef<HTMLDivElement>(null);
  const stickerPickerRef = React.useRef<HTMLDivElement>(null);
  const [gifPickerVersion, setGifPickerVersion] = React.useState(0);
  const [stickerPickerVersion, setStickerPickerVersion] = React.useState(0);
  const [isVoiceMode, setIsVoiceMode] = React.useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = React.useState(false);
  const [recordedVoice, setRecordedVoice] = React.useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = React.useState(0);
  const [voiceWaveform, setVoiceWaveform] = React.useState<number[]>([]);
  const voiceRecorderRef = React.useRef<MediaRecorder | null>(null);
  const voiceStreamRef = React.useRef<MediaStream | null>(null);
  const voiceChunksRef = React.useRef<Blob[]>([]);
  const voiceStartedAtRef = React.useRef(0);
  const voiceTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceWaveformRef = React.useRef<number[]>([]);
  const voiceLastSampleAtRef = React.useRef(0);
  const voiceSmoothedLevelRef = React.useRef(0.08);
  const voiceAudioContextRef = React.useRef<AudioContext | null>(null);
  const voiceAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const voiceMeterFrameRef = React.useRef<number | null>(null);
  const [gifInitialSearchTerm, setGifInitialSearchTerm] = React.useState('');
  const [stickerInitialSearchTerm, setStickerInitialSearchTerm] = React.useState('');
  const gifSearchTermRef = React.useRef('');
  const stickerSearchTermRef = React.useRef('');
  const gifLoadingMoreRef = React.useRef(false);
  const stickerLoadingMoreRef = React.useRef(false);
  const gifResultsCache = React.useRef(new Map<string, { items: Gif[]; nextPage: number; hasNext: boolean }>());
  const stickerResultsCache = React.useRef(new Map<string, { items: Gif[]; nextPage: number; hasNext: boolean }>());
  const availableBots = [BOT_DIRECTORY[0], ...customBots];
  const getBotMention = (item: BotDirectoryItem) => item.slug || item.name.toLowerCase().replace(/\s+/g, '');
  const selectBot = (item: BotDirectoryItem) => {
    if (item.id && !installedBotIds.includes(item.id)) {
      onInstallBot?.(item);
      setShowBotsPicker(false);
      return;
    }
    setNewMessage(`@${getBotMention(item)} `);
    setShowBotsPicker(false);
  };

  React.useEffect(() => {
    const botsQuery = query(collection(db, 'bots'), where('isPublic', '==', true));
    return onSnapshot(botsQuery, snapshot => {
      setCustomBots(snapshot.docs.map(botDocument => {
        const bot = botDocument.data();
        return {
          id: botDocument.id,
          name: typeof bot.name === 'string' ? bot.name : 'Bot personnalisé',
          description: typeof bot.description === 'string' ? bot.description : 'Bot personnalisé Mookup.',
          icon: typeof bot.photoURL === 'string' && bot.photoURL !== '/Logo.png' ? bot.photoURL : '',
          iconClass: 'bg-gray-100',
          emoji: '',
          slug: typeof bot.slug === 'string' ? bot.slug : '',
        } as BotDirectoryItem;
      }));
    }, error => {
      console.warn('Bots personnalisés indisponibles dans le sélecteur:', error);
      setCustomBots([]);
    });
  }, []);

  React.useEffect(() => {
    if (!showEmojiPicker && !showGifPicker && !showStickerPicker && !showBotsPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
      if (showGifPicker && gifPickerRef.current && !gifPickerRef.current.contains(target)) {
        setShowGifPicker(false);
      }
      if (showStickerPicker && stickerPickerRef.current && !stickerPickerRef.current.contains(target)) {
        setShowStickerPicker(false);
      }
      if (showBotsPicker && botsPickerRef.current && !botsPickerRef.current.contains(target)) {
        setShowBotsPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker, showGifPicker, showStickerPicker, showBotsPicker]);

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(`${newMessage}${emoji}`);
  };

  const normalizedEmojiSearch = emojiSearch.trim().toLocaleLowerCase();
  const visibleEmojis = (emojiSearch.trim()
    ? Object.entries(EMOJI_CATEGORY_GROUPS).flatMap(([category, emojis]) => emojis.map(emoji => ({ emoji, category })))
    : EMOJI_CATEGORIES[emojiCategory].map(emoji => ({ emoji, category: emojiCategory }))
  ).filter(({ emoji, category }) => (
    normalizedEmojiSearch === '' ||
    emoji.includes(emojiSearch.trim()) ||
    category.toLocaleLowerCase().includes(normalizedEmojiSearch)
  ));

  const handleEmojiCategoryClick = (category: EmojiCategory) => {
    setEmojiCategory(category);
    setEmojiActiveCategory(category);
    if (category === 'Tous') {
      requestAnimationFrame(() => emojiGridRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  };

  const handleEmojiGridScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (emojiCategory !== 'Tous' || emojiSearch.trim()) return;
    const grid = event.currentTarget;
    if (grid.scrollTop < 12) {
      setEmojiActiveCategory('Tous');
      return;
    }

    const threshold = grid.scrollTop + 24;
    let activeCategory: EmojiCategory = 'Tous';
    (Object.keys(EMOJI_CATEGORY_GROUPS) as Exclude<EmojiCategory, 'Tous'>[]).forEach(category => {
      const section = emojiSectionRefs.current[category];
      if (section && section.offsetTop <= threshold) activeCategory = category;
    });
    setEmojiActiveCategory(activeCategory);
  };

  const renderEmojiButton = (emoji: string, category: string, index: number) => (
    <button
      key={`${emoji}-${category}-${index}`}
      type="button"
      onClick={() => handleEmojiSelect(emoji)}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-[24px] transition-colors hover:bg-gray-100 sm:h-10 sm:w-10 sm:text-[26px]"
      aria-label={`Ajouter ${emoji}`}
    >
      {emoji}
    </button>
  );

  const fetchGifPage = React.useCallback(async (query: string, page = 1, limit = 24): Promise<{ items: Gif[]; hasNext: boolean }> => {
    const response = await fetch(`/api/gifs?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error('La recherche GIF est indisponible.');

    const payloadRecord = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const provider = typeof payloadRecord.provider === 'string' ? payloadRecord.provider : 'openverse';
    const results = Array.isArray(payloadRecord.results) ? payloadRecord.results : [];
    const items = results.flatMap((result, index) => {
      if (!result || typeof result !== 'object') return [];
      const item = result as Record<string, unknown>;
      const imageUrl = typeof item.url === 'string' ? item.url : '';
      if (!imageUrl) return [];
      const previewUrl = typeof item.previewUrl === 'string' ? item.previewUrl : imageUrl;
      const title = typeof item.title === 'string' ? item.title : 'GIF';
      return [{
        id: `${provider}-${page}-${index}-${imageUrl}`,
        imageUrl,
        height: 200,
        width: 200,
        description: title,
        preview: { imageUrl: previewUrl, height: 120, width: 120 },
        provider,
        raw: item,
      }];
    });

    return { items, hasNext: payloadRecord.hasNext !== false && items.length > 0 };
  }, []);

  const getGifResults = React.useCallback(async (query: string, page = 1, limit = 24) => {
    const cacheKey = query || '__trending__';
    const cached = gifResultsCache.current.get(cacheKey);
    if (cached && page < cached.nextPage) return cached.items;

    const { items, hasNext } = await fetchGifPage(query, page, limit);
    const mergedItems = page === 1 ? items : [...(cached?.items || []), ...items];
    gifResultsCache.current.set(cacheKey, { items: mergedItems, nextPage: page + 1, hasNext });
    return mergedItems;
  }, [fetchGifPage]);

  const loadMoreGifs = React.useCallback(async () => {
    if (gifLoadingMoreRef.current) return;
    const query = gifSearchTermRef.current;
    const cacheKey = query || '__trending__';
    const cached = gifResultsCache.current.get(cacheKey);
    if (cached?.hasNext === false) return;

    gifLoadingMoreRef.current = true;
    try {
      await getGifResults(query, cached?.nextPage || 1);
      setGifPickerVersion(version => version + 1);
    } finally {
      gifLoadingMoreRef.current = false;
    }
  }, [getGifResults]);

  const gifCategoriesCache = React.useRef<GifCategory[] | null>(null);
  const hydrateGifCategoryImages = React.useCallback(async (categories: GifCategory[]) => {
    for (let offset = 0; offset < categories.length; offset += 3) {
      const batch = categories.slice(offset, offset + 3);
      const images = await Promise.all(batch.map(async category => {
        try {
          const [firstGif] = await getGifResults(category.searchTerm || category.name);
          return firstGif?.preview?.imageUrl || firstGif?.imageUrl || null;
        } catch {
          return null;
        }
      }));
      if (!gifCategoriesCache.current) return;
      gifCategoriesCache.current = gifCategoriesCache.current.map((category, index) => {
        const imageUrl = images[index - offset];
        return imageUrl ? { ...category, imageUrl } : category;
      });
      setGifPickerVersion(version => version + 1);
    }
  }, [getGifResults]);

  const gifProvider = React.useMemo<GifProvider>(() => ({
    getTrending: () => {
      gifSearchTermRef.current = '';
      return getGifResults('');
    },
    search: (term: string) => {
      gifSearchTermRef.current = term;
      setGifInitialSearchTerm(term);
      return getGifResults(term);
    },
    getCategories: async () => {
      if (gifCategoriesCache.current) return gifCategoriesCache.current;
      const featuredGifs = await getGifResults('');
      const imagePool = featuredGifs.map(gif => gif.preview?.imageUrl || gif.imageUrl).filter(Boolean);
      const categories = GIF_CATEGORIES.map((category, index) => ({
        ...category,
        imageUrl: imagePool[index % imagePool.length] || CATEGORY_PLACEHOLDER,
      }));
      gifCategoriesCache.current = categories;
      void hydrateGifCategoryImages(categories);
      return categories;
    },
    getAttribution: () => ({ searchPlaceholder: 'Rechercher un GIF' }),
  }), [getGifResults, hydrateGifCategoryImages]);

  const handleGifSelect = (gif: Gif) => {
    setPendingFiles(previous => [...previous, {
      id: Math.random().toString(36).slice(2),
      url: gif.imageUrl,
      type: 'image',
      name: `${gif.description || 'GIF'}.gif`,
    }]);
    setShowGifPicker(false);
  };

  const fetchStickerPage = React.useCallback(async (query: string, page = 1, limit = 24): Promise<{ items: Gif[]; hasNext: boolean }> => {
    const response = await fetch(`/api/stickers?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
    const payload: unknown = await response.json();
    if (!response.ok) throw new Error('La recherche de stickers est indisponible.');

    const payloadRecord = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const provider = typeof payloadRecord.provider === 'string' ? payloadRecord.provider : 'giphy-stickers';
    const results = Array.isArray(payloadRecord.results) ? payloadRecord.results : [];
    const items = results.flatMap((result, index) => {
      if (!result || typeof result !== 'object') return [];
      const item = result as Record<string, unknown>;
      const imageUrl = typeof item.url === 'string' ? item.url : '';
      if (!imageUrl) return [];
      const previewUrl = typeof item.previewUrl === 'string' ? item.previewUrl : imageUrl;
      const title = typeof item.title === 'string' ? item.title : 'Sticker';
      return [{
        id: `${provider}-${page}-${index}-${imageUrl}`,
        imageUrl,
        height: 200,
        width: 200,
        description: title,
        preview: { imageUrl: previewUrl, height: 120, width: 120 },
        provider,
        raw: item,
      }];
    });

    return { items, hasNext: payloadRecord.hasNext !== false && items.length > 0 };
  }, []);

  const getStickerResults = React.useCallback(async (query: string, page = 1, limit = 24) => {
    const cacheKey = query || '__trending__';
    const cached = stickerResultsCache.current.get(cacheKey);
    if (cached && page < cached.nextPage && cached.items.length >= limit) return cached.items;

    const { items, hasNext } = await fetchStickerPage(query, page, limit);
    const mergedItems = page === 1 ? items : [...(cached?.items || []), ...items];
    stickerResultsCache.current.set(cacheKey, { items: mergedItems, nextPage: page + 1, hasNext });
    return mergedItems;
  }, [fetchStickerPage]);

  const loadMoreStickers = React.useCallback(async () => {
    if (stickerLoadingMoreRef.current) return;
    const query = stickerSearchTermRef.current;
    const cacheKey = query || '__trending__';
    const cached = stickerResultsCache.current.get(cacheKey);
    if (cached?.hasNext === false) return;

    stickerLoadingMoreRef.current = true;
    try {
      await getStickerResults(query, cached?.nextPage || 1);
      setStickerPickerVersion(version => version + 1);
    } finally {
      stickerLoadingMoreRef.current = false;
    }
  }, [getStickerResults]);

  const stickerCategoriesCache = React.useRef<GifCategory[] | null>(null);
  const hydrateStickerCategoryImages = React.useCallback(async (categories: GifCategory[]) => {
    for (let offset = 0; offset < categories.length; offset += 3) {
      const batch = categories.slice(offset, offset + 3);
      const images = await Promise.all(batch.map(async category => {
        try {
          const [firstSticker] = await getStickerResults(category.searchTerm || category.name);
          return firstSticker?.preview?.imageUrl || firstSticker?.imageUrl || null;
        } catch {
          return null;
        }
      }));
      if (!stickerCategoriesCache.current) return;
      stickerCategoriesCache.current = stickerCategoriesCache.current.map((category, index) => {
        const imageUrl = images[index - offset];
        return imageUrl ? { ...category, imageUrl } : category;
      });
      setStickerPickerVersion(version => version + 1);
    }
  }, [getStickerResults]);

  const stickerProvider = React.useMemo<GifProvider>(() => ({
    getTrending: () => {
      stickerSearchTermRef.current = '';
      return getStickerResults('');
    },
    search: (term: string) => {
      stickerSearchTermRef.current = term;
      setStickerInitialSearchTerm(term);
      return getStickerResults(term);
    },
    getCategories: async () => {
      if (stickerCategoriesCache.current) return stickerCategoriesCache.current;
      const featuredStickers = await getStickerResults('');
      const imagePool = featuredStickers.map(sticker => sticker.preview?.imageUrl || sticker.imageUrl).filter(Boolean);
      const categories = STICKER_CATEGORIES.map((category, index) => ({
        ...category,
        imageUrl: imagePool[index % imagePool.length] || CATEGORY_PLACEHOLDER,
      }));
      stickerCategoriesCache.current = categories;
      void hydrateStickerCategoryImages(categories);
      return categories;
    },
    getAttribution: () => ({ searchPlaceholder: 'Rechercher un sticker' }),
  }), [getStickerResults, hydrateStickerCategoryImages]);

  const handleStickerSelect = (sticker: Gif) => {
    setPendingFiles(previous => [...previous, {
      id: Math.random().toString(36).slice(2),
      url: sticker.imageUrl,
      type: 'image',
      name: 'Sticker.gif',
    }]);
    setShowStickerPicker(false);
  };

  const handleGifPickerScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList?.contains('gpr-body')) return;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 180) {
      void loadMoreGifs();
    }
  }, [loadMoreGifs]);

  const handleStickerPickerScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.classList?.contains('gpr-body')) return;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 180) {
      void loadMoreStickers();
    }
  }, [loadMoreStickers]);

  const stopVoiceTimer = React.useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  const stopVoiceMeter = React.useCallback(() => {
    if (voiceMeterFrameRef.current !== null) {
      cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    voiceAnalyserRef.current?.disconnect();
    voiceAnalyserRef.current = null;
    const context = voiceAudioContextRef.current;
    voiceAudioContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  const resetVoiceRecording = React.useCallback(() => {
    stopVoiceTimer();
    stopVoiceMeter();
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    voiceRecorderRef.current = null;
    voiceStreamRef.current?.getTracks().forEach(track => track.stop());
    voiceStreamRef.current = null;
    voiceChunksRef.current = [];
    setIsRecordingVoice(false);
    setRecordedVoice(null);
    setVoiceDuration(0);
    voiceWaveformRef.current = [];
    voiceLastSampleAtRef.current = 0;
    voiceSmoothedLevelRef.current = 0.08;
    setVoiceWaveform([]);
    setIsVoiceMode(false);
  }, [stopVoiceMeter, stopVoiceTimer]);

  const finishVoiceRecording = React.useCallback(() => {
    const recorder = voiceRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    stopVoiceTimer();
    recorder.stop();
  }, [stopVoiceTimer]);

  const startVoiceRecording = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('L’enregistrement vocal n’est pas disponible sur cet appareil.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceStreamRef.current = stream;
      voiceRecorderRef.current = recorder;
      voiceChunksRef.current = [];
      voiceStartedAtRef.current = Date.now();
      voiceWaveformRef.current = Array.from({ length: 48 }, () => 0.08);
      voiceLastSampleAtRef.current = Date.now();
      voiceSmoothedLevelRef.current = 0.08;
      setVoiceWaveform(voiceWaveformRef.current);
      setIsVoiceMode(true);
      setIsRecordingVoice(true);
      setRecordedVoice(null);
      setVoiceDuration(0);

      try {
        const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextConstructor) {
          const audioContext = new AudioContextConstructor();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          voiceAudioContextRef.current = audioContext;
          voiceAnalyserRef.current = analyser;
          const frequencyData = new Uint8Array(analyser.frequencyBinCount);
          const updateVoiceMeter = () => {
            analyser.getByteFrequencyData(frequencyData);
            const average = frequencyData.reduce((total, value) => total + value, 0) / frequencyData.length;
            const rawLevel = Math.pow(average / 255, 0.68);
            voiceSmoothedLevelRef.current = Math.max(0.08, Math.min(1, voiceSmoothedLevelRef.current * 0.72 + rawLevel * 0.28));
            const now = Date.now();
            if (now - voiceLastSampleAtRef.current >= 90) {
              voiceWaveformRef.current = [...voiceWaveformRef.current.slice(1), voiceSmoothedLevelRef.current];
              voiceLastSampleAtRef.current = now;
              setVoiceWaveform([...voiceWaveformRef.current]);
            }
            voiceMeterFrameRef.current = requestAnimationFrame(updateVoiceMeter);
          };
          voiceMeterFrameRef.current = requestAnimationFrame(updateVoiceMeter);
        }
      } catch (meterError) {
        console.warn('Analyse du microphone indisponible:', meterError);
      }

      recorder.ondataavailable = event => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopVoiceMeter();
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        voiceStreamRef.current?.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
        setIsRecordingVoice(false);
        setRecordedVoice(blob.size > 0 ? blob : null);
        setVoiceDuration(Math.max(1, Math.round((Date.now() - voiceStartedAtRef.current) / 1000)));
        voiceChunksRef.current = [];
      };
      recorder.start();
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration(Math.floor((Date.now() - voiceStartedAtRef.current) / 1000));
      }, 250);
    } catch (error) {
      console.error('Impossible d’accéder au microphone:', error);
      resetVoiceRecording();
      alert('Autorise l’accès au microphone pour enregistrer un message vocal.');
    }
  }, [resetVoiceRecording, stopVoiceMeter]);

  const handleVoiceButton = () => {
    if (isVoiceMode) {
      resetVoiceRecording();
      return;
    }
    void startVoiceRecording();
  };

  const sendRecordedVoice = async () => {
    if (!recordedVoice) return;
    const audio = recordedVoice;
    const duration = voiceDuration;
    const waveform = [...voiceWaveformRef.current];
    resetVoiceRecording();
    await sendVoiceMessage(audio, duration, waveform);
  };

  React.useEffect(() => () => {
    if (voiceRecorderRef.current?.state !== 'inactive') voiceRecorderRef.current?.stop();
    voiceStreamRef.current?.getTracks().forEach(track => track.stop());
    stopVoiceTimer();
    stopVoiceMeter();
  }, [stopVoiceMeter, stopVoiceTimer]);

  return (
    <footer
      onDragOver={groupId === 'snapchat' ? undefined : handleDragOver}
      onDragLeave={groupId === 'snapchat' ? undefined : handleDragLeave}
      onDrop={groupId === 'snapchat' ? undefined : handleDrop}
      className={`px-4 md:px-6 py-4 z-10 transition-colors ${
        isDragging ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      {/* Indicateur de frappe au-dessus de la barre */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-1.5 px-1 pb-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
          {/* Points animés */}
          <div className="flex gap-[3px] items-center">
            <span className="typing-dot w-[5px] h-[5px] bg-gray-400 rounded-full" />
            <span className="typing-dot w-[5px] h-[5px] bg-gray-400 rounded-full" />
            <span className="typing-dot w-[5px] h-[5px] bg-gray-400 rounded-full" />
          </div>
          <span className="text-[12px] text-gray-500 italic truncate">
            {groupId?.startsWith('private_')
              ? 'est en train d\'écrire...'
              : `${typingUsers.map(u => u.displayName || 'Quelqu\'un').join(', ')} ${typingUsers.length > 1 ? 'écrivent' : 'écrit'}...`
            }
          </span>
        </div>
      )}
      {groupId === 'snapchat' ? (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
          <img src="/Logo.png" alt="Logo Mookup" className="h-10 w-10 flex-shrink-0 rounded-xl object-contain" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-gray-800">Bienvenue sur Team Mookup</p>
            <p className="mt-0.5 text-[12px] leading-5 text-gray-500">Cet espace est réservé aux annonces et aux informations de Mookup. L’envoi de messages est désactivé.</p>
          </div>
        </div>
      ) : (
        <div className={`flex flex-col rounded-2xl transition-all duration-200 ${showEmojiPicker || showGifPicker || showStickerPicker || showBotsPicker ? 'overflow-visible' : 'overflow-hidden'} ${
          isDragging ? 'bg-blue-100 border border-blue-300' : 'bg-[#f2f3f5] border border-transparent'
        }`}>
        {replyingTo && (
          <div className="flex items-center justify-between border-b border-gray-200/70 bg-white px-4 py-2.5">
            <div className="min-w-0 text-[14px] text-gray-500">
              Répondre à <strong className="font-semibold text-gray-800">{replyingTo.displayName}</strong>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <span className="text-[13px] font-semibold text-blue-600">@ ACTIVÉ</span>
              <button
                type="button"
                onClick={onCancelReply}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-500 text-white transition-colors hover:bg-gray-700"
                title="Annuler la réponse"
                aria-label="Annuler la réponse"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          </div>
        )}
        
        {/* Aperçu des fichiers attachés */}
        {pendingFiles.length > 0 && (
          <div className="flex w-full max-w-full gap-3 overflow-x-auto border-b border-gray-200/60 p-3 scrollbar-hide">
            {pendingFiles.map((file) => {
              const isVideo = file.type === 'video';
              const AttachmentIcon = getAttachmentIcon(file);
              return (
                <div
                  key={file.id}
                  className="group relative h-[272px] w-[272px] flex-shrink-0 rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative h-[218px] w-full overflow-hidden rounded-xl bg-gray-100">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : isVideo ? (
                      <video
                        src={`${file.url}#t=1`}
                        muted
                        playsInline
                        preload="metadata"
                        aria-label={file.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-50 text-blue-600">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50">
                          <AttachmentIcon size={42} weight="duotone" />
                        </div>
                        <span className="max-w-[220px] truncate px-3 text-[13px] font-semibold text-gray-700">{file.name}</span>
                      </div>
                    )}

                    {isVideo && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-blue-600 shadow-lg">
                          <Play size={23} weight="fill" className="ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex h-[42px] items-center gap-2 px-1">
                    <AttachmentIcon size={16} className="flex-shrink-0 text-blue-500" />
                    <p className="truncate text-[14px] text-gray-700" title={file.name}>{file.name}</p>
                  </div>

                  <div className="absolute -right-1 -top-1 z-20 flex items-center overflow-visible rounded-lg border border-gray-200 bg-white shadow-md">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        if (file.type === 'image') openImageInTab(file.url, file.name);
                        else if (file.type === 'video') openMediaInTab(file.url, file.name, { type: 'video' });
                        else window.open(file.url, '_blank');
                      }}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600"
                      title="Voir"
                      aria-label={`Voir ${file.name}`}
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => event.preventDefault()}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-l border-gray-100 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Modifier"
                      aria-label={`Modifier ${file.name}`}
                    >
                      <PencilSimple size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setPendingFiles(previous => previous.filter(item => item.id !== file.id));
                      }}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-l border-gray-100 text-red-500 transition-colors hover:bg-gray-100 hover:text-red-600"
                      title="Supprimer"
                      aria-label={`Supprimer ${file.name}`}
                    >
                      <Trash size={20} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Zone de saisie */}
        <div className="flex items-center gap-1 px-3 py-1">
          {/* Bouton + */}
          <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          <label
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full text-[#6d6f78] hover:text-[#060607] hover:bg-[#e3e5e8] transition-colors cursor-pointer"
            title="Joindre un fichier"
          >
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleImageUpload} />
            {isUploading ? (
              <CircleNotch size={20} className="animate-spin" />
            ) : (
              <Plus size={20} weight="bold" />
            )}
          </label>

          {/* Champ de saisie + boutons dans un seul form */}
          <form onSubmit={sendMessage} className="flex-1 min-w-0 flex items-center gap-0.5">
            <div className="flex-1 min-w-0 relative py-1">
              {isVoiceMode ? (
                <div className="relative flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-xl bg-white/70 px-2" aria-label="Forme d’onde de l’enregistrement vocal">
                  <div className="absolute inset-x-2 inset-y-1 flex items-center justify-between gap-[2px]">
                    {voiceWaveform.map((level, index) => (
                      <span
                        key={index}
                        className={`min-w-[2px] flex-1 rounded-full transition-[height,background-color] duration-100 ease-out ${isRecordingVoice ? 'bg-red-400' : 'bg-blue-400'}`}
                        style={{ height: `${Math.max(3, Math.round(level * 25))}px` }}
                      />
                    ))}
                  </div>
                  <div className="relative z-10 flex w-full items-center justify-between gap-2 text-[11px] font-medium text-gray-600">
                    <span className="rounded-md bg-white/85 px-1.5 py-0.5 backdrop-blur-sm">{isRecordingVoice ? 'Enregistrement…' : 'Vocal prêt'}</span>
                    <span className="rounded-md bg-white/85 px-1.5 py-0.5 font-mono backdrop-blur-sm">{Math.floor(voiceDuration / 60).toString().padStart(2, '0')}:{(voiceDuration % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              ) : (
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onPaste={handlePaste}
                placeholder={`Envoyer un message dans # | ${displayName}`}
                className={`w-full py-2 bg-transparent border-none outline-none text-[15px] placeholder-[#87888c] caret-[#060607] ${
                  /^@bddbot\b/i.test(newMessage) ? 'text-transparent' : 'text-[#060607]'
                }`}
              />
              )}
              {/* Seul @bddbot est bleu ; le reste du message garde son style normal. */}
              {!isVoiceMode && /^@bddbot\b/i.test(newMessage) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none text-[15px]">
                  <span className="font-medium text-blue-600">{newMessage.slice(0, 7)}</span>
                  <span className="text-[#060607]">{newMessage.substring(7)}</span>
                </div>
              )}
            </div>

            {/* Icônes droite — dans le form pour que le bouton Send soit type="submit" */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleVoiceButton}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isVoiceMode ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-[#6d6f78] hover:text-[#060607] hover:bg-[#e3e5e8]'}`}
                title={isVoiceMode ? 'Annuler le message vocal' : 'Message vocal'}
                aria-label={isVoiceMode ? 'Fermer le message vocal' : 'Enregistrer un message vocal'}
              >
                <Microphone size={20} />
              </button>
              {isVoiceMode && isRecordingVoice && (
                <button
                  type="button"
                  onClick={finishVoiceRecording}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-red-600 transition-colors hover:bg-red-100"
                  title="Arrêter l’enregistrement"
                  aria-label="Arrêter l’enregistrement vocal"
                >
                  <StopCircle size={21} weight="fill" />
                </button>
              )}

              <div ref={gifPickerRef} className="relative hidden md:block" onScrollCapture={handleGifPickerScroll}>
                {showGifPicker && (
                  <div className="fixed inset-x-2 bottom-20 z-50 mx-auto w-auto max-w-[360px] overflow-hidden rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:bottom-[calc(100%+0.5rem)] sm:right-0 sm:w-[360px]">
                    <GifPicker
                      key={gifPickerVersion}
                      provider={gifProvider}
                      onGifClick={handleGifSelect}
                      initialSearchTerm={gifInitialSearchTerm}
                      width="100%"
                      height="min(430px, calc(100dvh - 7rem))"
                      categoryHeight="clamp(56px, 16vw, 82px)"
                      autoFocusSearch={false}
                    />
                    <a
                      href="https://giphy.com"
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-white px-3 py-1.5 text-center text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                    >
                      Powered by GIPHY
                    </a>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowGifPicker(previous => !previous);
                    setShowEmojiPicker(false);
                    setShowStickerPicker(false);
                    setShowBotsPicker(false);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${showGifPicker ? 'bg-blue-100 text-blue-600' : 'text-[#6d6f78] hover:bg-[#e3e5e8] hover:text-[#060607]'}`}
                  title="GIFs"
                  aria-label="Ouvrir le sélecteur de GIFs"
                  aria-expanded={showGifPicker}
                >
                  GIF
                </button>
              </div>

              <div ref={stickerPickerRef} className="relative hidden md:block" onScrollCapture={handleStickerPickerScroll}>
                {showStickerPicker && (
                  <div className="fixed inset-x-2 bottom-20 z-50 mx-auto w-auto max-w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:bottom-[calc(100%+0.5rem)] sm:right-0 sm:w-[360px]">
                    <GifPicker
                      key={stickerPickerVersion}
                      provider={stickerProvider}
                      onGifClick={handleStickerSelect}
                      initialSearchTerm={stickerInitialSearchTerm}
                      width="100%"
                      height="min(430px, calc(100dvh - 7rem))"
                      categoryHeight="clamp(56px, 16vw, 82px)"
                      autoFocusSearch={false}
                    />
                    <a
                      href="https://giphy.com"
                      target="_blank"
                      rel="noreferrer"
                      className="block bg-white px-3 py-1.5 text-center text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                    >
                      Powered by GIPHY
                    </a>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowStickerPicker(previous => !previous);
                    setShowEmojiPicker(false);
                    setShowGifPicker(false);
                    setShowBotsPicker(false);
                  }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${showStickerPicker ? 'bg-blue-100 text-blue-600' : 'text-[#6d6f78] hover:text-[#060607] hover:bg-[#e3e5e8]'}`}
                  title="Stickers"
                  aria-label="Ouvrir le sélecteur de stickers"
                  aria-expanded={showStickerPicker}
                >
                  <Sticker size={20} />
                </button>
              </div>

              <div ref={emojiPickerRef} className="relative">
                {showEmojiPicker && (
                  <div className="fixed inset-x-2 top-2 bottom-20 z-50 flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:top-auto sm:bottom-[calc(100%+0.5rem)] sm:right-0 sm:h-auto sm:max-h-none sm:w-[min(520px,calc(100vw-2rem))] sm:rounded-2xl sm:p-4">
                    <div className="mb-2 flex shrink-0 items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-[14px] font-semibold text-gray-700">Emojis</span>
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
                        title="Fermer"
                        aria-label="Fermer le sélecteur d’emojis"
                      >
                        <X size={17} weight="bold" />
                      </button>
                    </div>
                    <input
                      type="search"
                      value={emojiSearch}
                      onChange={(event) => setEmojiSearch(event.target.value)}
                      placeholder="Rechercher un emoji"
                      className="mb-2 w-full shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] outline-none focus:border-blue-500"
                      aria-label="Rechercher un emoji"
                    />
                    <div className="mb-2 max-h-20 shrink-0 overflow-y-auto border-b border-gray-100 pb-2 sm:max-h-none"> 
                      <div className="flex flex-wrap gap-1">
                      {(Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]).map(category => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handleEmojiCategoryClick(category)}
                          className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${emojiActiveCategory === category ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          {category}
                        </button>
                      ))}
                      </div>
                    </div>
                    <div
                      ref={emojiGridRef}
                      onScroll={handleEmojiGridScroll}
                      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-80 sm:flex-none"
                    >
                      {emojiCategory === 'Tous' && !emojiSearch.trim() ? (
                        (Object.entries(EMOJI_CATEGORY_GROUPS) as [Exclude<EmojiCategory, 'Tous'>, readonly string[]][]).map(([category, emojis]) => (
                          <section
                            key={category}
                            ref={section => { emojiSectionRefs.current[category] = section; }}
                            className="mb-3 last:mb-0"
                          >
                            <h3 className="sticky top-0 z-10 mb-1 bg-white/95 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              {category}
                            </h3>
                            <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                              {emojis.map((emoji, index) => renderEmojiButton(emoji, category, index))}
                            </div>
                          </section>
                        ))
                      ) : visibleEmojis.length > 0 ? (
                        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                          {visibleEmojis.map(({ emoji, category }, index) => renderEmojiButton(emoji, category, index))}
                        </div>
                      ) : (
                        <p className="py-5 text-center text-xs text-gray-500">Aucun emoji trouvé</p>
                      )}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(previous => !previous);
                    setShowGifPicker(false);
                    setShowStickerPicker(false);
                    setShowBotsPicker(false);
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${showEmojiPicker ? 'bg-blue-100 text-blue-600' : 'text-[#6d6f78] hover:text-[#060607] hover:bg-[#e3e5e8]'}`}
                  title="Emojis"
                  aria-label="Ouvrir le sélecteur d’emojis"
                  aria-expanded={showEmojiPicker}
                >
                  <Smiley size={20} />
                </button>
              </div>

              {/* Envoyer (submit) ou Apps */}
              {isVoiceMode ? (
                recordedVoice ? (
                  <button
                    type="button"
                    onClick={() => void sendRecordedVoice()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-blue-500 transition-colors hover:bg-[#e3e5e8] hover:text-blue-600"
                    title="Envoyer le message vocal"
                    aria-label="Envoyer le message vocal"
                  >
                    <PaperPlaneRight size={20} />
                  </button>
                ) : null
              ) : newMessage.trim() || pendingFiles.length > 0 ? (
                <button
                  type="submit"
                  className="w-10 h-10 flex items-center justify-center rounded-full text-blue-500 hover:text-blue-600 hover:bg-[#e3e5e8] transition-colors"
                  title="Envoyer"
                >
                  <PaperPlaneRight size={20} />
                </button>
              ) : (groupId === 'general' || groupId?.startsWith('ai-') || groupId?.startsWith('botchat_')) ? null : (
                <div ref={botsPickerRef} className="relative hidden md:block">
                  {showBotsPicker && (
                    <div className="fixed inset-x-2 top-2 bottom-20 z-50 flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.18)] sm:absolute sm:inset-x-auto sm:top-auto sm:bottom-[calc(100%+0.5rem)] sm:right-0 sm:h-[min(520px,calc(100dvh-6rem))] sm:w-[min(520px,calc(100vw-2rem))] sm:rounded-2xl sm:p-4">
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        <label className="mx-2 flex h-[42px] items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 transition-colors focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]">
                          <MagnifyingGlass size={19} className="flex-shrink-0 text-gray-800" />
                          <input
                            type="search"
                            value={botSearch}
                            onChange={event => setBotSearch(event.target.value)}
                            placeholder="Rechercher des applications et des commandes"
                            className="min-w-0 flex-1 bg-transparent text-[14px] text-gray-800 outline-none placeholder:text-gray-500"
                            aria-label="Rechercher des applications et des commandes"
                          />
                        </label>

                        {!botSearch.trim() && (
                          <section className="mt-7">
                            <h3 className="mb-3 text-[18px] font-medium text-gray-900">Récentes</h3>
                            <div className="flex items-center gap-3">
                              {availableBots.map(item => (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => selectBot(item)}
                                  className="h-14 w-14 flex-shrink-0 rounded-2xl p-0.5 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  title={item.name}
                                >
                                  <BotDirectoryIcon item={item} />
                                </button>
                              ))}
                            </div>
                          </section>
                        )}

                        <section className="mt-10">
                          <h3 className="mb-3 text-[18px] font-medium text-gray-900">Applications sur ce serveur</h3>
                          <div className="overflow-hidden rounded-2xl bg-gray-50/70">
                            {availableBots.filter(item => {
                              const query = botSearch.trim().toLocaleLowerCase();
                              return !query || `${item.name} ${item.description}`.toLocaleLowerCase().includes(query);
                            }).slice(0, 2).map(item => (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => selectBot(item)}
                                className="flex w-full items-center gap-4 border-b border-gray-200/80 bg-white px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-gray-50"
                              >
                                <span className="h-12 w-12 flex-shrink-0 rounded-xl p-0.5">
                                  <BotDirectoryIcon item={item} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[16px] font-semibold text-gray-900">{item.name}</span>
                                  <span className="block truncate text-[14px] text-gray-500">{item.description}</span>
                                </span>
                                {item.id && <span className={`flex-shrink-0 text-[12px] font-semibold ${installedBotIds.includes(item.id) ? 'text-emerald-600' : 'text-indigo-600'}`}>{installedBotIds.includes(item.id) ? 'Utiliser' : 'Installer'}</span>}
                              </button>
                            ))}
                          </div>
                        </section>

                        <section className="mt-12">
                          <h3 className="mb-3 text-[18px] font-medium text-gray-900">Promotions</h3>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {PROMOTED_BOTS.filter(item => {
                              const query = botSearch.trim().toLocaleLowerCase();
                              return !query || `${item.name} ${item.description}`.toLocaleLowerCase().includes(query);
                            }).map(item => (
                              <button
                                key={item.name}
                                type="button"
                                onClick={() => selectBot(item)}
                                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
                              >
                                <div className={`flex h-[158px] items-center justify-center overflow-hidden ${item.visual}`}>
                                  {item.icon ? (
                                    <img src={item.icon} alt="" className="h-28 w-28 object-contain" />
                                  ) : (
                                    <span className="text-7xl font-black tracking-tight text-gray-950 drop-shadow-sm">{item.emoji}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 px-3 py-3">
                                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl ${item.iconClass}`}>
                                    <BotDirectoryIcon item={item} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-semibold text-gray-900">{item.name}</span>
                                    <span className="block truncate text-[13px] text-gray-500">{item.description}</span>
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </section>
                      </div>
                      <div className="shrink-0 bg-white px-4 py-2.5 text-center text-[11px] text-gray-500 sm:px-5">
                        BDD Bot est déjà disponible par défaut dans tous les groupes.
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setBotSearch('');
                      setShowBotsPicker(previous => !previous);
                      setShowEmojiPicker(false);
                      setShowGifPicker(false);
                      setShowStickerPicker(false);
                    }}
                    className={`hidden h-10 w-10 items-center justify-center rounded-full transition-colors md:flex ${showBotsPicker ? 'bg-blue-100 text-blue-600' : 'text-[#6d6f78] hover:bg-[#e3e5e8] hover:text-[#060607]'}`}
                    title="Installer un bot"
                    aria-label="Ouvrir les bots disponibles"
                    aria-expanded={showBotsPicker}
                  >
                    <SquaresFour size={20} />
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
        </div>
      )}
    </footer>
  );
}
