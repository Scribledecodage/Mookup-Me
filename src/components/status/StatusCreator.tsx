'use client';

import React, { useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { MagnifyingGlass, Palette, X, Check, ArrowUp } from '@phosphor-icons/react';

/* ─────────────────────────────────────────────────────────────────────────────
   MESH GRADIENTS — tous en style "taches de couleur fondues" comme l'aperçu.
   Technique : plusieurs radial-gradient superposés sur un fond de base.
   Résultat : effet organique, doux, photographique — comme Instagram / iOS 17+
───────────────────────────────────────────────────────────────────────────── */
const STATUS_FONT_SIZES = {
  small: 'clamp(1.1rem, 3vw, 1.6rem)',
  normal: 'clamp(1.35rem, 4vw, 2.25rem)',
  large: 'clamp(1.8rem, 6vw, 3.5rem)',
} as const;

type StatusTextStyle = {
  fontFamily: string;
  fontSize: keyof typeof STATUS_FONT_SIZES;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  backgroundColor: string;
  align: 'left' | 'center' | 'right';
};

const FALLBACK_FONTS = [
  'DM Sans', 'Arial', 'Georgia', 'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS',
  'Times New Roman', 'Impact', 'Comic Sans MS', 'Roboto', 'Open Sans', 'Lato',
  'Montserrat', 'Poppins', 'Raleway', 'Oswald', 'Playfair Display', 'Merriweather',
];

const loadGoogleFont = (family: string) => {
  if (typeof document === 'undefined' || FALLBACK_FONTS.slice(0, 7).includes(family)) return;
  const id = `status-font-${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

const MESHES = [
  // ── ROSES / PÊCHES ──
  {
    label: 'Pêche Dorée',
    value: 'radial-gradient(ellipse at 15% 25%, #ffb3ba 0%, transparent 55%), radial-gradient(ellipse at 85% 70%, #ffcc70 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, #ff8fab 0%, transparent 50%), #f9c784',
  },
  {
    label: 'Rose Soleil',
    value: 'radial-gradient(ellipse at 20% 20%, #ffd6e7 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #ffb347 0%, transparent 55%), radial-gradient(ellipse at 60% 40%, #ff8fa3 0%, transparent 50%), #f4a261',
  },
  {
    label: 'Abricot Doux',
    value: 'radial-gradient(ellipse at 70% 20%, #ffc8a0 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, #ffadb5 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #ffd6a5 0%, transparent 60%), #f8c291',
  },
  {
    label: 'Corail Pâle',
    value: 'radial-gradient(ellipse at 30% 30%, #ffb3ba 0%, transparent 55%), radial-gradient(ellipse at 80% 60%, #ffd6a5 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, #ff8fab 0%, transparent 45%), #ffc5b0',
  },

  // ── VIOLETS / LILAS ──
  {
    label: 'Lilas Rosé',
    value: 'radial-gradient(ellipse at 20% 30%, #e8b4ff 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #ffc0d4 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #c9b4ff 0%, transparent 50%), #dcb8f5',
  },
  {
    label: 'Mauve Brume',
    value: 'radial-gradient(ellipse at 75% 25%, #d4b4fe 0%, transparent 55%), radial-gradient(ellipse at 25% 75%, #f0abfc 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #c084fc 0%, transparent 50%), #c9a0f0',
  },
  {
    label: 'Lavande Dorée',
    value: 'radial-gradient(ellipse at 20% 20%, #c8b4ff 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #ffd6a5 0%, transparent 55%), radial-gradient(ellipse at 55% 45%, #e8b4ff 0%, transparent 50%), #d8bff5',
  },
  {
    label: 'Violet Bleu',
    value: 'radial-gradient(ellipse at 15% 60%, #b4c8ff 0%, transparent 55%), radial-gradient(ellipse at 85% 25%, #d4b4fe 0%, transparent 55%), radial-gradient(ellipse at 50% 85%, #c084fc 0%, transparent 50%), #a78bfa',
  },

  // ── BLEUS / CYAN ──
  {
    label: 'Ciel Nuageux',
    value: 'radial-gradient(ellipse at 20% 30%, #bae6fd 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #a5f3fc 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #c7d2fe 0%, transparent 50%), #b0d4f5',
  },
  {
    label: 'Océan Doux',
    value: 'radial-gradient(ellipse at 70% 20%, #7dd3fc 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, #a5f3fc 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #bae6fd 0%, transparent 60%), #93c5f5',
  },
  {
    label: 'Bleu Aqua',
    value: 'radial-gradient(ellipse at 25% 25%, #67e8f9 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, #7dd3fc 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, #a5f3fc 0%, transparent 50%), #6ec6f0',
  },
  {
    label: 'Glacier',
    value: 'radial-gradient(ellipse at 30% 30%, #e0f2fe 0%, transparent 55%), radial-gradient(ellipse at 80% 60%, #bae6fd 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, #c7d2fe 0%, transparent 45%), #cde8fa',
  },

  // ── VERTS / MENTHE ──
  {
    label: 'Menthe Fraîche',
    value: 'radial-gradient(ellipse at 20% 30%, #a7f3d0 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #6ee7b7 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #bbf7d0 0%, transparent 50%), #86e8c0',
  },
  {
    label: 'Jade Pastel',
    value: 'radial-gradient(ellipse at 70% 25%, #6ee7b7 0%, transparent 55%), radial-gradient(ellipse at 20% 75%, #a7f3d0 0%, transparent 55%), radial-gradient(ellipse at 50% 55%, #34d399 0%, transparent 50%), #7ddfc0',
  },
  {
    label: 'Pistache',
    value: 'radial-gradient(ellipse at 25% 20%, #d9f99d 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, #a7f3d0 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #bbf7d0 0%, transparent 60%), #c0f0b8',
  },
  {
    label: 'Vert Tendre',
    value: 'radial-gradient(ellipse at 20% 60%, #bbf7d0 0%, transparent 55%), radial-gradient(ellipse at 80% 25%, #a7f3d0 0%, transparent 55%), radial-gradient(ellipse at 50% 85%, #6ee7b7 0%, transparent 50%), #9de8c5',
  },

  // ── JAUNES / DORÉS ──
  {
    label: 'Miel Soleil',
    value: 'radial-gradient(ellipse at 20% 25%, #fde68a 0%, transparent 55%), radial-gradient(ellipse at 80% 75%, #fed7aa 0%, transparent 55%), radial-gradient(ellipse at 55% 45%, #fef08a 0%, transparent 50%), #fdd87a',
  },
  {
    label: 'Citron Doux',
    value: 'radial-gradient(ellipse at 75% 20%, #fef08a 0%, transparent 55%), radial-gradient(ellipse at 20% 75%, #d9f99d 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #fde68a 0%, transparent 55%), #ecf585',
  },
  {
    label: 'Soleil Pâle',
    value: 'radial-gradient(ellipse at 30% 30%, #fef3c7 0%, transparent 55%), radial-gradient(ellipse at 80% 65%, #fde68a 0%, transparent 55%), radial-gradient(ellipse at 10% 80%, #fed7aa 0%, transparent 45%), #fceac0',
  },
  {
    label: 'Or Rose',
    value: 'radial-gradient(ellipse at 20% 30%, #fde68a 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #fecdd3 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #fed7aa 0%, transparent 50%), #f8d5a8',
  },

  // ── CHAUDS INTENSES ──
  {
    label: 'Coucher Orange',
    value: 'radial-gradient(ellipse at 20% 40%, #fb923c 0%, transparent 50%), radial-gradient(ellipse at 80% 30%, #f472b6 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, #fbbf24 0%, transparent 55%), #f59d5a',
  },
  {
    label: 'Flamant Rose',
    value: 'radial-gradient(ellipse at 25% 25%, #f9a8d4 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #fb923c 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #fda4af 0%, transparent 50%), #f8a0b8',
  },
  {
    label: 'Crépuscule',
    value: 'radial-gradient(ellipse at 15% 70%, #f97316 0%, transparent 50%), radial-gradient(ellipse at 85% 20%, #ec4899 0%, transparent 50%), radial-gradient(ellipse at 50% 40%, #fb923c 0%, transparent 55%), #f08060',
  },
  {
    label: 'Mangue',
    value: 'radial-gradient(ellipse at 70% 20%, #fbbf24 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, #fb923c 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #fed7aa 0%, transparent 60%), #fca855',
  },

  // ── NEUTRES ──
  {
    label: 'Blanc',
    value: 'radial-gradient(ellipse at 15% 20%, #ffffff 0%, transparent 55%), radial-gradient(ellipse at 85% 72%, #dfe7f2 0%, transparent 58%), radial-gradient(ellipse at 50% 42%, #f6e7ef 0%, transparent 55%), linear-gradient(145deg, #f8fafc, #e5e7eb)',
  },
  {
    label: 'Noir Profond',
    value: 'radial-gradient(ellipse at 25% 25%, #2a2a2e 0%, transparent 58%), radial-gradient(ellipse at 75% 75%, #1a1a1d 0%, transparent 62%), linear-gradient(145deg, #101012, #000000)',
  },
  {
    label: 'Gris',
    value: 'radial-gradient(ellipse at 18% 22%, #f1f5f9 0%, transparent 52%), radial-gradient(ellipse at 82% 75%, #94a3b8 0%, transparent 58%), radial-gradient(ellipse at 52% 45%, #c4b5fd 0%, transparent 48%), linear-gradient(145deg, #cbd5e1, #64748b)',
  },
  {
    label: 'Sable Rose',
    value: 'radial-gradient(ellipse at 20% 30%, #fecdd3 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #fed7aa 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #fde8d8 0%, transparent 50%), #f9d0c0',
  },
  {
    label: 'Brume Chaude',
    value: 'radial-gradient(ellipse at 75% 25%, #fde8d8 0%, transparent 55%), radial-gradient(ellipse at 25% 75%, #fecdd3 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #fed7aa 0%, transparent 50%), #fdd8c5',
  },
  {
    label: 'Ivoire',
    value: 'radial-gradient(ellipse at 20% 20%, #fef9c3 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, #fde8d8 0%, transparent 55%), radial-gradient(ellipse at 55% 45%, #fef3c7 0%, transparent 50%), #fdf0d8',
  },

  // ── FRAIS / AQUATIQUES ──
  {
    label: 'Aqua Rose',
    value: 'radial-gradient(ellipse at 20% 30%, #a5f3fc 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #fecdd3 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #c7d2fe 0%, transparent 50%), #c8e8f5',
  },
  {
    label: 'Turquoise Lilas',
    value: 'radial-gradient(ellipse at 15% 60%, #67e8f9 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, #d4b4fe 0%, transparent 55%), radial-gradient(ellipse at 50% 85%, #a5f3fc 0%, transparent 50%), #95d8f0',
  },
  {
    label: 'Ciel Lavande',
    value: 'radial-gradient(ellipse at 25% 25%, #bae6fd 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, #e9d5ff 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #c7d2fe 0%, transparent 60%), #c5d8f5',
  },

  // ── SOMBRES DOUX ──
  {
    label: 'Nuit Rosée',
    value: 'radial-gradient(ellipse at 20% 30%, #6b21a8 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #be185d 0%, transparent 55%), radial-gradient(ellipse at 50% 10%, #4c1d95 0%, transparent 50%), #7c2d60',
  },
  {
    label: 'Bleu Nuit',
    value: 'radial-gradient(ellipse at 20% 22%, #3b4a7a 0%, transparent 55%), radial-gradient(ellipse at 80% 76%, #232c52 0%, transparent 60%), radial-gradient(ellipse at 55% 45%, #101a3a 0%, transparent 58%), linear-gradient(145deg, #1b2350, #0b1030)',
  },
  {
    label: 'Vert Forêt',
    value: 'radial-gradient(ellipse at 20% 22%, #23493b 0%, transparent 55%), radial-gradient(ellipse at 80% 76%, #143127 0%, transparent 60%), radial-gradient(ellipse at 55% 45%, #0b241b 0%, transparent 58%), linear-gradient(145deg, #123526, #06180f)',
  },
];

export default function StatusCreator({
  user,
  type,
  initialFile,
  onClose,
}: {
  user: any;
  type: 'text' | 'media';
  initialFile?: File | null;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [bg, setBg] = useState(MESHES[0].value);
  const [mediaFile, setMediaFile] = useState<File | null>(initialFile || null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(
    initialFile ? URL.createObjectURL(initialFile) : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [colorSearch, setColorSearch] = useState('');
  const [showFormatting, setShowFormatting] = useState(false);
  const [fontCatalog, setFontCatalog] = useState(FALLBACK_FONTS);
  const [fontSearch, setFontSearch] = useState('');
  const [textStyle, setTextStyle] = useState<StatusTextStyle>({
    fontFamily: 'DM Sans',
    fontSize: 'normal',
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    color: 'auto',
    backgroundColor: 'transparent',
    align: 'center',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadGoogleFont(textStyle.fontFamily);
  }, [textStyle.fontFamily]);

  React.useEffect(() => {
    if (!showFormatting || fontCatalog.length > FALLBACK_FONTS.length) return;
    let cancelled = false;
    fetch('https://fonts.google.com/metadata/fonts')
      .then(response => response.text())
      .then(raw => {
        if (cancelled) return;
        const metadata = raw.startsWith(")]}'") ? raw.slice(raw.indexOf('\n') + 1) : raw;
        const payload = JSON.parse(metadata) as { familyMetadataList?: { family?: string }[] };
        const remoteFonts = (payload.familyMetadataList || [])
          .map(font => font.family)
          .filter((family): family is string => Boolean(family));
        setFontCatalog(Array.from(new Set([...FALLBACK_FONTS, ...remoteFonts])));
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [showFormatting, fontCatalog.length]);

  const filteredFonts = fontCatalog
    .filter(font => font.toLocaleLowerCase().includes(fontSearch.trim().toLocaleLowerCase()))
    .slice(0, 80);
  const filteredMeshes = MESHES.filter(mesh => mesh.label.toLocaleLowerCase().includes(colorSearch.trim().toLocaleLowerCase()));

  React.useEffect(() => {
    if (type === 'media' && !initialFile && !mediaPreview) {
      fileInputRef.current?.click();
    }
  }, [type, initialFile, mediaPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    } else {
      onClose();
    }
    if (e.target) e.target.value = '';
  };

  const handlePublish = async () => {
    if (!user) return;
    if (type === 'text' && !text.trim()) return;
    if (type === 'media' && !mediaFile) return;

    setIsUploading(true);
    try {
      let content = text;
      let mediaType = 'text';

      if (type === 'media' && mediaFile) {
        const fileExt = mediaFile.name.split('.').pop()?.toLowerCase();
        mediaType = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt || '') ? 'video' : 'image';

        const fileName = `status-${user.uid}-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from('chat-files')
          .upload(`statuses/${fileName}`, mediaFile);
        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('chat-files')
          .getPublicUrl(`statuses/${fileName}`);
        content = urlData.publicUrl;
      }

      const statusItem: any = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        type: mediaType,
        content,
        createdAt: new Date(),
      };

      if (type === 'media' && text.trim()) statusItem.caption = text;
      if (type === 'text') {
        statusItem.bgColor = bg;
        statusItem.textStyle = textStyle;
      }

      const statusRef = doc(db, 'statuses', user.uid);
      const docSnap = await getDoc(statusRef);

      if (docSnap.exists()) {
        await setDoc(
          statusRef,
          {
            items: arrayUnion(statusItem),
            updatedAt: serverTimestamp(),
            displayName: user.displayName || 'Utilisateur',
            photoURL: user.photoURL || '',
          },
          { merge: true }
        );
      } else {
        await setDoc(statusRef, {
          uid: user.uid,
          displayName: user.displayName || 'Utilisateur',
          photoURL: user.photoURL || '',
          items: [statusItem],
          updatedAt: serverTimestamp(),
        });
      }

      onClose();
    } catch (err) {
      console.error('Error publishing status:', err);
      alert('Erreur lors de la publication du statut');
    } finally {
      setIsUploading(false);
    }
  };

  if (type === 'media' && !mediaPreview) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </div>
    );
  }

  /* ─── Fond de l'écran ──────────────────────────────────────────────────── */
  const bgStyle =
    type === 'text'
      ? { background: bg }
      : { backgroundColor: '#000' };

  /* ─── Détection clair / sombre du fond ─────────────────────────────────
     On extrait la dernière valeur du mesh (la couleur de base hex #rrggbb)
     et on calcule la luminance relative pour choisir la couleur des icônes.
  ──────────────────────────────────────────────────────────────────────── */
  function hexLuminance(hex: string): number {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  // Extrait le dernier token hex du gradient (couleur de base du mesh)
  const baseHex = (bg.match(/#[0-9a-fA-F]{6}/g) || []).slice(-1)[0] ?? '#888888';
  const isLight = type === 'text' ? hexLuminance(baseHex) > 0.25 : false;

  // Couleurs adaptatives
  const iconColor      = isLight ? 'rgba(0,0,0,0.65)'   : 'rgba(255,255,255,0.90)';
  const btnBg          = isLight ? 'rgba(0,0,0,0.18)'   : 'rgba(255,255,255,0.20)';
  const btnBorder      = isLight ? 'rgba(0,0,0,0.12)'   : 'rgba(255,255,255,0.30)';
  const textColor      = isLight ? 'rgba(0,0,0,0.70)'   : 'rgba(255,255,255,0.90)';
  const placeholderCss = isLight ? 'rgba(0,0,0,0.35)'   : 'rgba(255,255,255,0.50)';

  return (
    <div className="fixed inset-0 z-[100] flex min-h-0 flex-col overflow-hidden" style={bgStyle}>

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: btnBg, backdropFilter: 'blur(8px)', border: `1px solid ${btnBorder}` }}
            aria-label="Fermer l’éditeur"
          >
            <X size={20} weight="bold" style={{ color: iconColor }} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold" style={{ color: iconColor }}>Créer un statut</p>
            <p className="truncate text-[12px]" style={{ color: textColor }}>{type === 'text' ? 'Écris quelque chose à partager' : 'Prépare ta publication'}</p>
          </div>
        </div>

        {type === 'text' && (
          <div className="flex flex-row-reverse items-center gap-2">
            <button
              onClick={() => setShowPicker(v => !v)}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-all"
              style={{
                background: showPicker ? (isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.30)') : btnBg,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${btnBorder}`,
              }}
              title="Changer la couleur"
              aria-label="Changer la couleur du statut"
              aria-pressed={showPicker}
            >
              <Palette size={20} style={{ color: iconColor }} />
            </button>
            <button
              onClick={() => setShowFormatting(v => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold transition-all"
              style={{
                background: showFormatting ? (isLight ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.30)') : btnBg,
                backdropFilter: 'blur(8px)',
                border: `1px solid ${btnBorder}`,
                color: iconColor,
              }}
              title="Modifier le texte"
              aria-label="Afficher les options de texte"
              aria-pressed={showFormatting}
            >
              Aa
            </button>
          </div>
        )}
      </div>

      {type === 'text' && showFormatting && (
        <div
          className="absolute left-3 right-3 top-[66px] z-40 flex max-h-[calc(100dvh-7rem)] flex-wrap items-center gap-2 overflow-y-auto rounded-xl p-2.5 shadow-lg sm:left-auto sm:right-6 sm:top-[76px] sm:max-h-[calc(100dvh-7rem)]"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: `1px solid ${btnBorder}`,
          }}
        >
          <span className="material-symbols-outlined shrink-0 text-[18px] text-gray-600" title="Police">text_fields</span>
          <select
            value={textStyle.fontFamily}
            onChange={event => setTextStyle(previous => ({ ...previous, fontFamily: event.target.value }))}
            className="h-9 min-w-[120px] flex-1 rounded-lg border border-black/10 bg-white/60 px-2 text-[12px] outline-none sm:flex-none"
            aria-label="Police du statut"
          >
            <option value="DM Sans">DM Sans</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
          </select>
          <span className="h-6 w-px bg-black/15" aria-hidden="true" />
          <span className="material-symbols-outlined shrink-0 text-[18px] text-gray-600" title="Taille">format_size</span>
          <select
            value={textStyle.fontSize}
            onChange={event => setTextStyle(previous => ({ ...previous, fontSize: event.target.value as StatusTextStyle['fontSize'] }))}
            className="h-9 rounded-lg border border-black/10 bg-white/60 px-2 text-[12px] outline-none"
            aria-label="Taille du texte"
          >
            <option value="small">Petit</option>
            <option value="normal">Normal</option>
            <option value="large">Grand</option>
          </select>
          <span className="h-6 w-px bg-black/15" aria-hidden="true" />
          {([
            ['bold', 'format_bold', 'Gras'],
            ['italic', 'format_italic', 'Italique'],
            ['underline', 'format_underlined', 'Souligné'],
            ['strike', 'format_strikethrough', 'Barré'],
          ] as const).map(([key, label, title]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTextStyle(previous => ({ ...previous, [key]: !previous[key] }))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[14px] transition-colors"
              style={{
                background: textStyle[key] ? 'rgba(59,130,246,0.18)' : 'rgba(0,0,0,0.06)',
                color: '#172033',
                fontWeight: key === 'bold' ? 700 : 500,
                fontStyle: key === 'italic' ? 'italic' : 'normal',
                textDecoration: key === 'underline' ? 'underline' : key === 'strike' ? 'line-through' : 'none',
              }}
              title={title}
              aria-label={title}
              aria-pressed={textStyle[key]}
            >
              <span className="material-symbols-outlined text-[18px]">{label}</span>
            </button>
          ))}
          <div className="basis-full border-t border-black/10 pt-2">
            <label className="flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white/60 px-2">
              <span className="material-symbols-outlined text-[17px] text-gray-600">search</span>
              <input
                type="search"
                value={fontSearch}
                onChange={event => setFontSearch(event.target.value)}
                placeholder={`Rechercher une police (${fontCatalog.length.toLocaleString('fr-FR')} disponibles)`}
                aria-label="Rechercher une police"
                className="h-full min-w-0 flex-1 bg-transparent px-1 text-[12px] outline-none placeholder:text-gray-500"
              />
            </label>
            <div className="mt-2 grid max-h-36 grid-cols-2 gap-1 overflow-y-auto pr-1 sm:grid-cols-3">
              {filteredFonts.map(font => (
                <button
                  key={font}
                  type="button"
                  onClick={() => { setTextStyle(previous => ({ ...previous, fontFamily: font })); loadGoogleFont(font); }}
                  className="truncate rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-blue-50"
                  style={{
                    background: textStyle.fontFamily === font ? 'rgba(59,130,246,0.16)' : 'rgba(0,0,0,0.04)',
                    fontFamily: font,
                    color: '#172033',
                  }}
                  title={font}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>
          <div className="flex basis-full flex-wrap items-center gap-2 border-t border-black/10 pt-2">
            <span className="material-symbols-outlined shrink-0 text-[18px] text-gray-600" title="Couleurs">palette</span>
            <label className="flex h-9 items-center gap-1.5 rounded-lg bg-black/5 px-2 text-[11px] text-gray-700">
              <span className="material-symbols-outlined text-[16px]">format_color_text</span>
              <input
                type="color"
                value={textStyle.color === 'auto' ? (isLight ? '#000000' : '#ffffff') : textStyle.color}
                onChange={event => setTextStyle(previous => ({ ...previous, color: event.target.value }))}
                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Couleur du texte"
              />
            </label>
            <label className="flex h-9 items-center gap-1.5 rounded-lg bg-black/5 px-2 text-[11px] text-gray-700">
              <span className="material-symbols-outlined text-[16px]">format_color_fill</span>
              <input
                type="color"
                value={textStyle.backgroundColor === 'transparent' ? '#ffffff' : textStyle.backgroundColor}
                onChange={event => setTextStyle(previous => ({ ...previous, backgroundColor: event.target.value }))}
                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Couleur du fond du texte"
              />
            </label>
            <button
              type="button"
              onClick={() => setTextStyle(previous => ({ ...previous, backgroundColor: 'transparent' }))}
              className="h-9 rounded-lg bg-black/5 px-2 text-[11px] text-gray-700 hover:bg-black/10"
            >
              Sans fond
            </button>
            <span className="h-6 w-px bg-black/15" aria-hidden="true" />
            <div className="flex h-9 overflow-hidden rounded-lg bg-black/5">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  type="button"
                  onClick={() => setTextStyle(previous => ({ ...previous, align }))}
                  className="w-8 text-[12px] font-semibold hover:bg-blue-50"
                  style={{ background: textStyle.align === align ? 'rgba(59,130,246,0.18)' : 'transparent' }}
                  aria-label={`Alignement ${align}`}
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {align === 'left' ? 'format_align_left' : align === 'center' ? 'format_align_center' : 'format_align_right'}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTextStyle(previous => ({ ...previous, color: 'auto', backgroundColor: 'transparent', align: 'center', bold: false, italic: false, underline: false, strike: false, fontSize: 'normal', fontFamily: 'DM Sans' }))}
              className="ml-auto h-9 rounded-lg bg-black/5 px-2 text-[11px] text-gray-700 hover:bg-black/10"
            >
              <span className="material-symbols-outlined mr-1 text-[15px]">restart_alt</span>
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {/* ─── Popup sélecteur — overlay centré ────────────────────────────── */}
      {type === 'text' && showPicker && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowPicker(false)} />

          <div className="fixed inset-2 z-40 flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(82dvh,760px)] sm:w-[min(92vw,760px)] sm:-translate-x-1/2 sm:-translate-y-1/2">
            <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-5 py-4 sm:px-7 sm:py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-gray-900">
                  <Palette size={21} weight="duotone" className="text-blue-600" />
                  <h2 className="text-[18px] font-semibold">Choisir le fond</h2>
                </div>
                <p className="mt-1 text-[12px] text-gray-500">Sélectionne une ambiance pour ton statut.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
                title="Fermer"
                aria-label="Fermer le choix de fond"
              >
                <X size={19} weight="bold" />
              </button>
            </div>

            <div className="shrink-0 px-5 py-3 sm:px-7">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-gray-500 focus-within:border-blue-500 focus-within:bg-white">
                <MagnifyingGlass size={18} />
                <input
                  type="text"
                  value={colorSearch}
                  onChange={event => setColorSearch(event.target.value)}
                  placeholder={`Rechercher un fond parmi ${MESHES.length} styles`}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
                  aria-label="Rechercher un fond"
                />
                {colorSearch && (
                  <button
                    type="button"
                    onClick={() => setColorSearch('')}
                    className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-200"
                    aria-label="Effacer la recherche"
                  >
                    <X size={13} />
                  </button>
                )}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7 sm:pb-7">
              {filteredMeshes.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4 lg:grid-cols-7">
                  {filteredMeshes.map(g => {
                    const isSelected = bg === g.value;
                    return (
                      <button
                        key={g.label}
                        type="button"
                        title={g.label}
                        onClick={() => setBg(g.value)}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                        style={{ background: g.value }}
                      >
                        <span className="absolute inset-x-1 bottom-1 truncate rounded-md bg-black/35 px-1.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm sm:text-[11px]">
                          {g.label}
                        </span>
                        {isSelected && (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-blue-600 shadow-md">
                            <Check size={14} weight="bold" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-32 items-center justify-center text-center text-sm text-gray-500">
                  Aucun fond ne correspond à « {colorSearch} ».
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Corps ───────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {type === 'media' && mediaPreview ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              {mediaFile?.type.startsWith('video') ? (
                <video
                  src={mediaPreview}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                />
              ) : (
                <img src={mediaPreview} className="w-full h-full object-contain" alt="Preview" />
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 via-black/35 to-transparent p-4 pt-12 sm:p-8 sm:pt-16">
              <div className="mx-auto max-w-2xl">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">Légende</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Ajouter une légende..."
                  className="w-full resize-none rounded-xl border border-white/20 bg-black/35 p-3 text-center text-[15px] text-white outline-none backdrop-blur-md placeholder:text-white/55 focus:border-white/45 sm:text-[16px]"
                  rows={2}
                />
                <div className="mt-1 text-right text-[11px] text-white/65">{text.length} caractère{text.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex min-h-0 items-center justify-center overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
            <div className="flex w-full max-w-3xl flex-col justify-center">
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Tapez un statut"
                className="status-textarea min-h-[180px] w-full resize-none bg-transparent text-center leading-[1.1] outline-none"
                style={{
                  color: textStyle.color === 'auto' ? textColor : textStyle.color,
                  caretColor: iconColor,
                  backgroundColor: textStyle.backgroundColor,
                  textAlign: textStyle.align,
                  fontFamily: textStyle.fontFamily,
                  fontSize: STATUS_FONT_SIZES[textStyle.fontSize],
                  fontWeight: textStyle.bold ? 700 : 400,
                  fontStyle: textStyle.italic ? 'italic' : 'normal',
                  textDecoration: `${textStyle.underline ? 'underline ' : ''}${textStyle.strike ? 'line-through' : ''}`.trim() || 'none',
                  // placeholder via CSS var trick — on injecte un style global inline
                }}
                rows={4}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-5 pb-5 pt-2 sm:px-8 sm:pb-7 sm:pt-3">
        {/* Style tag inline pour la couleur du placeholder (impossible en style prop) */}
        <style>{`
          .status-textarea::placeholder { color: ${placeholderCss}; }
        `}</style>
        <p className="min-w-0 truncate text-[12px]" style={{ color: textColor }}>
          {type === 'text' ? `${text.length} caractère${text.length > 1 ? 's' : ''}` : text.trim() ? 'Légende ajoutée' : 'Ajoute une légende si tu veux'}
        </p>
        <button
          onClick={handlePublish}
          disabled={isUploading || (type === 'text' && !text.trim())}
          className="flex h-11 flex-shrink-0 items-center gap-2 rounded-full px-5 text-[14px] font-semibold transition-all hover:scale-[1.03] disabled:scale-100 disabled:opacity-40"
          style={{
            background: btnBg,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1.5px solid ${btnBorder}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            color: iconColor,
          }}
        >
          {isUploading ? (
            <div className="h-5 w-5 animate-spin rounded-full"
              style={{ border: `2px solid ${iconColor}`, borderTopColor: 'transparent' }} />
          ) : (
            <>
              Publier
              <ArrowUp size={18} weight="bold" style={{ color: iconColor }} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
