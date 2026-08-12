'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowBendUpLeft,
  ArrowBendUpRight,
  ArrowRight,
  Brain,
  Copy,
  DotsThree,
  Flag,
  MagnifyingGlass,
  PencilSimple,
  Pause,
  Play,
  SealCheck,
  ShieldCheck,
  ShieldWarning,
  SpeakerHigh,
  Trash,
  X,
} from '@phosphor-icons/react';
import { addDoc, collection, deleteField, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BotMessage from '../BotMessage';
import LinkPreviewCard from './LinkPreviewCard';
import { openImageInTab } from '@/lib/openImageInTab';
import CodeBlock from './CodeBlock';
import UserAvatar from '@/components/ui/UserAvatar';
import { speakLocalSpeech, splitSpeechSentences } from '@/lib/localSpeech';
import SpeechHighlightedText from '@/components/SpeechHighlightedText';
import { extractColors, toHex } from '@/lib/colorUtils';
import { Message } from './types';

type ReportStep = 'categories' | 'summary' | 'sent';

const reportCategories = [
  'Je n’aime pas ça',
  'Spam',
  'Insultes ou harcèlement',
  'Informations mensongères ou glorification de la violence',
  'Divulgation d’informations privées permettant d’identifier une personne',
  'Autre chose',
  'Signaler du contenu illégal dans le cadre de la législation sur les services numériques',
];

function ReportMessagePreview({ text }: { text: string }) {
  return (
    <div className="report-message-markdown break-words text-[15px] leading-6 text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="m-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del>{children}</del>,
          code: ({ children }) => <code className="rounded bg-gray-200 px-1 text-[13px]">{children}</code>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function BddBotVerifiedBadge() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(previous => !previous);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#00a884] transition-colors hover:bg-[#00a884]/10 focus:outline-none focus:ring-2 focus:ring-[#00a884]/25"
        aria-label="Informations sur le badge de BDD Bot"
        aria-expanded={isOpen}
      >
        <SealCheck size={14} weight="fill" />
      </button>
      {isOpen && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
        >
          <span className="block text-[13px] font-semibold text-gray-900">BDD Bot officiel</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">Assistant IA officiel développé par l’équipe Mookup.</span>
        </span>
      )}
    </span>
  );
}

function CommunityBotBadge() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(previous => !previous);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-900 transition-colors hover:bg-violet-100 hover:text-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-300"
        aria-label="Informations sur le bot communautaire"
        aria-expanded={isOpen}
      >
        <ShieldWarning size={14} weight="regular" />
      </button>
      {isOpen && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
        >
          <span className="block text-[13px] font-semibold text-gray-900">Bot communautaire</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-gray-500">Ce bot a été créé par un membre de la communauté. Il n’est pas un bot officiel de Mookup.</span>
        </span>
      )}
    </span>
  );
}

const formatAudioTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, '0')}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
};

function VoiceMessagePlayer({ src, initialDuration, waveform, displayName }: { src: string; initialDuration?: number; waveform?: number[]; displayName: string }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const animationFrameRef = React.useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(initialDuration || 0);

  React.useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      return;
    }

    const updateProgress = () => {
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };
    animationFrameRef.current = requestAnimationFrame(updateProgress);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [isPlaying]);

  React.useEffect(() => () => {
    audioRef.current?.pause();
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const targetTime = ratio * (duration || audio.duration || 0);
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const waveformBars = waveform?.length
    ? waveform
    : Array.from({ length: 48 }, () => 0.12);

  return (
    <div className="mb-2 mt-1 flex w-full max-w-[330px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-2 shadow-[0_1px_5px_rgba(15,23,42,0.05)]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const mediaDuration = event.currentTarget.duration;
          if (Number.isFinite(mediaDuration) && mediaDuration > 0) setDuration(mediaDuration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        className="hidden"
        aria-label={`Message vocal de ${displayName}`}
      />
      <button
        type="button"
        onClick={() => void togglePlayback()}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors duration-150 hover:bg-blue-700 active:bg-blue-800"
        aria-label={isPlaying ? 'Mettre le message vocal en pause' : 'Lire le message vocal'}
      >
        {isPlaying ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Progression du message vocal"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={seek}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            const audio = audioRef.current;
            if (!audio) return;
            const nextTime = Math.max(0, Math.min(duration || audio.duration || 0, audio.currentTime + (event.key === 'ArrowRight' ? 5 : -5)));
            audio.currentTime = nextTime;
            setCurrentTime(nextTime);
          }}
          className="group flex h-7 cursor-pointer items-center outline-none"
        >
          <div className="flex h-full w-full items-center justify-between gap-[2px] overflow-hidden">
            {waveformBars.map((level, index) => {
              const isActive = (index / waveformBars.length) * 100 <= progress;
              return (
                <span
                  key={index}
                  className={`min-w-[2px] flex-1 rounded-full transition-[height,background-color] duration-100 ease-linear ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}
                  style={{ height: `${Math.max(3, Math.round(level * 22))}px` }}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-medium leading-none text-gray-400">
          <span>{formatAudioTime(currentTime)}</span>
          <span>{formatAudioTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

interface ForwardTarget {
  id: string;
  uid?: string;
  name: string;
  subtitle: string;
  photoURL?: string;
  kind: 'user' | 'group';
}

interface MessageItemProps {
  msg: Message;
  user: any;
  accentColor: string;
  livePhotoURL?: string;
  onStartPrivateChat?: (user: { uid: string, displayName: string, photoURL?: string }) => void;
  onReply?: (message: Message) => void;
  groupId: string | null;
  dateStr: string;
}

export default function MessageItem({
  msg,
  user,
  accentColor,
  livePhotoURL,
  onStartPrivateChat,
  onReply,
  groupId,
  dateStr
}: MessageItemProps) {
  const isMe = msg.uid === user?.uid;
  const isBotMessage = msg.uid === 'bddbot' || msg.uid === 'mistral-ai' || msg.uid === 'ai-bot' || msg.uid?.startsWith('ai-') || msg.uid?.startsWith('bot-');
  const isCommunityBotMessage = Boolean(msg.uid?.startsWith('bot-') && !groupId?.startsWith('botchat_'));
  const isTeamMookupMessage = groupId === 'snapchat';
  const isGiphyMedia = Boolean(msg.imageUrl?.includes('giphy.com'));
  // Team Mookup est toujours affiché avec son identité officielle, même si le message a été publié par le compte admin.
  // Pour les autres conversations, on utilise la photo live du profil quand elle existe.
  const displayPhotoURL = isTeamMookupMessage
    ? '/Logo.png'
    : isBotMessage
      ? msg.photoURL
      : isMe
        ? (user?.photoURL || msg.photoURL)
        : (livePhotoURL !== undefined ? livePhotoURL : msg.photoURL);
  const renderedDisplayName = isTeamMookupMessage
    ? 'Team Mookup'
    : isMe
      ? (user?.displayName || 'Moi')
      : msg.displayName;
  const [botAvatarColor, setBotAvatarColor] = React.useState<string | null>(null);
  const messageNameColor = isTeamMookupMessage
    ? '#7c3aed'
    : isBotMessage
      ? (displayPhotoURL ? botAvatarColor || accentColor : undefined)
      : accentColor;
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [isQuickActionsVisible, setIsQuickActionsVisible] = React.useState(false);
  const [isQuickActionsDismissed, setIsQuickActionsDismissed] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(msg.text);
  const [isForwardOpen, setIsForwardOpen] = React.useState(false);
  const [forwardTargets, setForwardTargets] = React.useState<ForwardTarget[]>([]);
  const [selectedForwardTargets, setSelectedForwardTargets] = React.useState<string[]>([]);
  const [forwardSearch, setForwardSearch] = React.useState('');
  const [isForwardLoading, setIsForwardLoading] = React.useState(false);
  const [isForwarding, setIsForwarding] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [reportStep, setReportStep] = React.useState<ReportStep | null>(null);
  const [reportCategory, setReportCategory] = React.useState<string | null>(null);
  const [isReporting, setIsReporting] = React.useState(false);
  const [readingSentenceIndex, setReadingSentenceIndex] = React.useState<number | null>(null);
  const [readingWord, setReadingWord] = React.useState<string | null>(null);
  const [readingWordIndex, setReadingWordIndex] = React.useState<number | null>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const optionsRef = React.useRef<HTMLDivElement>(null);
  const moreOptionsRef = React.useRef<HTMLButtonElement>(null);
  const editInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isBotMessage || !displayPhotoURL) return;

    let cancelled = false;
    void extractColors(displayPhotoURL).then(colors => {
      if (cancelled) return;
      setBotAvatarColor(colors[0] ? toHex(colors[0]) : accentColor);
    });

    return () => {
      cancelled = true;
    };
  }, [accentColor, displayPhotoURL, isBotMessage]);

  React.useLayoutEffect(() => {
    if (!isOptionsOpen) return;

    const updateMenuPosition = () => {
      const trigger = moreOptionsRef.current;
      const options = optionsRef.current;
      if (!trigger || !options) return;

      const triggerRect = trigger.getBoundingClientRect();
      const margin = 8;
      const gap = 8;
      const desiredWidth = 250;
      const leftSpace = Math.max(0, triggerRect.left - gap - margin);
      const rightSpace = Math.max(0, window.innerWidth - triggerRect.right - gap - margin);
      const placeOnLeft = leftSpace >= desiredWidth || leftSpace >= rightSpace;
      const availableWidth = placeOnLeft ? leftSpace : rightSpace;
      const menuWidth = Math.max(1, Math.min(desiredWidth, availableWidth));
      const menuHeight = Math.min(options.offsetHeight, window.innerHeight - margin * 2);
      const left = placeOnLeft
        ? triggerRect.left - gap - menuWidth
        : triggerRect.right + gap;
      const spaceAbove = triggerRect.top - gap - margin;
      const spaceBelow = window.innerHeight - triggerRect.bottom - gap - margin;
      const top = spaceAbove >= menuHeight || spaceAbove >= spaceBelow
        ? Math.max(margin, triggerRect.top - menuHeight - gap)
        : Math.min(window.innerHeight - menuHeight - margin, triggerRect.bottom + gap);

      setMenuPosition(previous => (
        previous?.top === top && previous.left === left && previous.width === menuWidth
          ? previous
          : { top, left, width: menuWidth }
      ));
    };

    // Le menu est rendu dans body : il ne peut donc plus être coupé par le fil de discussion.
    updateMenuPosition();
    const resizeObserver = typeof ResizeObserver !== 'undefined' && optionsRef.current
      ? new ResizeObserver(updateMenuPosition)
      : null;
    if (resizeObserver && optionsRef.current) resizeObserver.observe(optionsRef.current);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOptionsOpen]);

  React.useEffect(() => {
    const closeOtherMessageActions = (event: Event) => {
      const openedMessageId = (event as CustomEvent<string>).detail;
      if (openedMessageId !== msg.id) {
        setIsQuickActionsVisible(false);
        setIsOptionsOpen(false);
      }
    };

    window.addEventListener('message-actions-open', closeOtherMessageActions);
    return () => window.removeEventListener('message-actions-open', closeOtherMessageActions);
  }, [msg.id]);

  React.useEffect(() => {
    if (!isQuickActionsVisible || typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const handleMobileOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const messageElement = document.getElementById(`message-${msg.id}`);
      if (
        messageElement && !messageElement.contains(target) &&
        (!optionsRef.current || !optionsRef.current.contains(target))
      ) {
        setIsQuickActionsVisible(false);
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener('click', handleMobileOutsideClick);
    return () => document.removeEventListener('click', handleMobileOutsideClick);
  }, [isQuickActionsVisible, msg.id]);

  React.useEffect(() => {
    if (!isOptionsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        optionsRef.current && !optionsRef.current.contains(target) &&
        moreOptionsRef.current && !moreOptionsRef.current.contains(target)
      ) {
        setIsOptionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOptionsOpen]);

  React.useEffect(() => {
    if (!isForwardOpen || !user?.uid) return;

    let cancelled = false;
    setIsForwardLoading(true);

    Promise.all([
      getDocs(collection(db, 'users')).catch(() => null),
      getDocs(collection(db, 'groups')).catch(() => null),
    ]).then(([usersSnapshot, groupsSnapshot]) => {
      if (cancelled) return;

      const builtInTargets: ForwardTarget[] = [
        { id: 'general', name: 'Groupe Général', subtitle: 'Conversation générale', kind: 'group' },
        { id: `ai-${user.uid}`, name: 'BDD Bot', subtitle: 'Assistant', photoURL: '/BDDBOT.png', kind: 'group' },
      ];
      const groupTargets: ForwardTarget[] = groupsSnapshot?.docs
        .map(groupDoc => {
          const data = groupDoc.data();
          return {
            id: groupDoc.id,
            name: data.name || 'Groupe sans nom',
            subtitle: 'Groupe',
            photoURL: data.photoURL || undefined,
            kind: 'group' as const,
          };
        })
        .filter(target => target.id !== groupId) || [];
      const userTargets: ForwardTarget[] = usersSnapshot?.docs
        .map(userDoc => {
          const data = userDoc.data();
          const uid = data.uid || userDoc.id;
          return {
            id: `private_${[user.uid, uid].sort().join('_')}`,
            uid,
            name: data.displayName || data.nickname || 'Utilisateur',
            subtitle: data.email || 'Conversation privée',
            photoURL: data.photoURL || undefined,
            kind: 'user' as const,
          };
        })
        .filter(target => target.uid !== user.uid && target.id !== groupId && target.id !== `private_${user.uid}`) || [];

      const uniqueTargets = new Map<string, ForwardTarget>();
      [...builtInTargets, ...groupTargets, ...userTargets].forEach(target => {
        if (!uniqueTargets.has(target.id)) uniqueTargets.set(target.id, target);
      });
      setForwardTargets([...uniqueTargets.values()]);
    }).finally(() => {
      if (!cancelled) setIsForwardLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isForwardOpen, user?.uid, groupId]);

  const closeOptions = () => setIsOptionsOpen(false);

  const dismissQuickActions = () => {
    setIsQuickActionsVisible(false);
    setIsQuickActionsDismissed(true);
  };

  const startEditing = () => {
    setEditText(msg.text);
    setIsEditing(true);
    closeOptions();
    dismissQuickActions();
  };

  React.useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const cancelEditing = () => {
    setEditText(msg.text);
    setIsEditing(false);
  };

  const saveEditing = async () => {
    if (editText === msg.text) {
      setIsEditing(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        text: editText,
        edited: true,
        editedAt: serverTimestamp(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la modification du message:', error);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!user?.uid || !msg.id) return;
    try {
      const currentReaction = msg.reactions?.[user.uid];
      await updateDoc(doc(db, 'messages', msg.id), {
        [`reactions.${user.uid}`]: currentReaction === emoji ? deleteField() : emoji,
      });
    } catch (error) {
      console.error('Erreur lors de l’ajout de la réaction:', error);
    } finally {
      closeOptions();
      dismissQuickActions();
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
    } catch (error) {
      console.error('Erreur lors de la copie du message:', error);
    }
    closeOptions();
    dismissQuickActions();
  };

  const speechSentences = React.useMemo(() => splitSpeechSentences(msg.text), [msg.text]);
  const activeSpeechSentence = readingSentenceIndex === null ? null : speechSentences[readingSentenceIndex] || null;

  const handleReadMessage = () => {
    void speakLocalSpeech(msg.text, {
      onSentenceChange: index => {
        setReadingSentenceIndex(index);
        setReadingWord(null);
        setReadingWordIndex(null);
      },
      onWordChange: (_index, word, wordIndex) => {
        setReadingWord(word);
        setReadingWordIndex(wordIndex);
      },
      onComplete: () => {
        setReadingSentenceIndex(null);
        setReadingWord(null);
        setReadingWordIndex(null);
      },
    });
    closeOptions();
  };

  const openDeleteConfirmation = () => {
    if (!isMe) return;
    setIsDeleteOpen(true);
    closeOptions();
    dismissQuickActions();
  };

  const handleDeleteMessage = async () => {
    if (!isMe || isDeleting) return;
    setIsDeleting(true);

    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        text: '',
        isDeleted: true,
        edited: false,
        imageUrl: deleteField(),
        videoUrl: deleteField(),
        audioUrl: deleteField(),
        audioDuration: deleteField(),
        reactions: deleteField(),
        audioName: deleteField(),
        audioMimeType: deleteField(),
        audioWaveform: deleteField(),
        forwardedFrom: deleteField(),
      });

      try {
        const repliesSnapshot = await getDocs(query(
          collection(db, 'messages'),
          where('replyTo.id', '==', msg.id)
        ));
        await Promise.all(
          repliesSnapshot.docs.map(replyDoc =>
            updateDoc(replyDoc.ref, { 'replyTo.deleted': true })
          )
        );
      } catch (replyError) {
        console.error('Erreur lors de la mise à jour des réponses:', replyError);
      }

      setIsDeleteOpen(false);
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openReportFlow = () => {
    if (isMe) return;
    setReportCategory(null);
    setReportStep('categories');
    closeOptions();
    dismissQuickActions();
  };

  const selectReportCategory = (category: string) => {
    setReportCategory(category);
    setReportStep('summary');
  };

  const submitReport = async () => {
    if (!user?.uid || !reportCategory || isReporting) return;
    setIsReporting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        messageId: msg.id,
        messageText: msg.text,
        messageUid: msg.uid,
        messageDisplayName: msg.displayName,
        messagePhotoURL: msg.photoURL || '',
        groupId,
        category: reportCategory,
        reportedBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setReportStep('sent');
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
    } finally {
      setIsReporting(false);
    }
  };

  const reactionGroups = Object.entries(msg.reactions ?? {}).reduce<Record<string, number>>((groups, [, emoji]) => {
    groups[emoji] = (groups[emoji] || 0) + 1;
    return groups;
  }, {});

  const openForwardPicker = () => {
    setForwardSearch('');
    setSelectedForwardTargets([]);
    setIsForwardOpen(true);
    closeOptions();
    dismissQuickActions();
  };

  const toggleForwardTarget = (targetId: string) => {
    setSelectedForwardTargets(previous => previous.includes(targetId)
      ? previous.filter(id => id !== targetId)
      : [...previous, targetId]
    );
  };

  const handleForward = async () => {
    if (!user?.uid || selectedForwardTargets.length === 0 || isForwarding) return;
    const targets = forwardTargets.filter(target => selectedForwardTargets.includes(target.id));
    if (targets.length === 0) return;

    setIsForwarding(true);
    try {
      const forwardedFrom = msg.forwardedFrom || {
        id: msg.id,
        displayName: msg.displayName,
        photoURL: msg.photoURL || undefined,
        ...(msg.createdAt ? { createdAt: msg.createdAt } : {}),
      };
      const previewText = msg.text || (msg.audioUrl ? '🎙️ Message vocal' : msg.imageUrl ? 'Image' : msg.videoUrl ? 'Vidéo' : 'Message');

      for (const target of targets) {
        const forwardedData: any = {
          text: msg.text,
          uid: user.uid,
          displayName: user.displayName || 'Utilisateur',
          photoURL: user.photoURL || '',
          groupId: target.id,
          createdAt: serverTimestamp(),
          forwardedFrom,
          readBy: { [user.uid]: user.displayName || 'Utilisateur' },
        };
        if (msg.imageUrl) {
          forwardedData.imageUrl = msg.imageUrl;
          if (msg.imageName) forwardedData.imageName = msg.imageName;
        }
        if (msg.videoUrl) forwardedData.videoUrl = msg.videoUrl;
        if (msg.audioUrl) {
          forwardedData.audioUrl = msg.audioUrl;
          forwardedData.audioDuration = msg.audioDuration || 0;
          forwardedData.audioName = msg.audioName || 'Message vocal';
          if (msg.audioMimeType) forwardedData.audioMimeType = msg.audioMimeType;
          if (msg.audioWaveform?.length) forwardedData.audioWaveform = msg.audioWaveform;
        }
        await addDoc(collection(db, 'messages'), forwardedData);

        if (target.kind === 'user') {
          await setDoc(doc(db, 'private_chats', target.id), {
            updatedAt: serverTimestamp(),
            lastMessage: `↪ ${previewText}`,
            deletedBy: [],
          }, { merge: true });
        } else if (!['general', 'snapchat'].includes(target.id)) {
          await setDoc(doc(db, 'groups', target.id), {
            updatedAt: serverTimestamp(),
            lastMessage: `↪ ${previewText}`,
          }, { merge: true });
        }
      }

      setIsForwardOpen(false);
      setSelectedForwardTargets([]);
    } catch (error) {
      console.error('Erreur lors du transfert du message:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  if (msg.isSystemMessage) {
    return (
      <div className="flex items-center justify-start gap-2 px-4 py-3 text-[13px] text-gray-500">
        <ArrowRight size={20} weight="bold" className="flex-shrink-0 text-emerald-500" aria-hidden="true" />
        <span>{msg.text}</span>
        {dateStr && <span className="text-[11px] text-gray-400">{dateStr}</span>}
      </div>
    );
  }

  return (
    <div
      id={`message-${msg.id}`}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('message-actions-open', { detail: msg.id }));
        // Sur ordinateur, le survol suffit et le clic ne doit pas bloquer la barre.
        // Sur mobile, un simple tap doit la laisser visible pour pouvoir toucher ⋯.
        const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
        if (isTouchDevice) {
          setIsQuickActionsDismissed(false);
          setIsQuickActionsVisible(true);
        }
      }}
      onMouseEnter={() => {
        if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) {
          setIsQuickActionsDismissed(false);
        }
      }}
      className={`message-row group relative flex min-w-0 max-w-full items-start gap-3 px-4 py-2 hover:bg-gray-50/50 transition-colors ${
        isBotMessage ? 'ai-message-row' : ''
      }`}
    >
      {/* Actions rapides au survol */}
      <div
        className={`${msg.isDeleted ? 'hidden' : isQuickActionsDismissed && !isOptionsOpen ? 'pointer-events-none hidden opacity-0' : isOptionsOpen || isQuickActionsVisible ? 'pointer-events-auto flex opacity-100' : 'pointer-events-none hidden opacity-0 group-hover:pointer-events-auto group-hover:flex group-hover:opacity-100'} absolute right-4 top-1 z-30 -translate-y-1/2 items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-[0_4px_14px_rgba(0,0,0,0.14)] transition-opacity duration-150`}
      >
        {[
          { emoji: '😂', label: 'Rire' },
          { emoji: '❤️', label: 'J’aime' },
          { emoji: '👋', label: 'Saluer' },
        ].map(({ emoji, label }) => (
          <button
            key={emoji}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleReaction(emoji);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[19px] transition-colors hover:bg-gray-100"
            title={label}
            aria-label={`Réagir avec ${label}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReply?.(msg);
            dismissQuickActions();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          title="Répondre"
          aria-label="Répondre au message"
        >
          <ArrowBendUpLeft size={19} />
        </button>
        {isMe && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              startEditing();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            title="Modifier le message"
            aria-label="Modifier le message"
          >
            <PencilSimple size={18} />
          </button>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openForwardPicker();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          title="Transférer le message"
          aria-label="Transférer le message"
        >
          <ArrowBendUpRight size={19} />
        </button>
        <button
          ref={moreOptionsRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsOptionsOpen(prev => !prev);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 ${isOptionsOpen ? 'bg-gray-100' : ''}`}
          title="Plus d’options"
          aria-label="Plus d’options"
          aria-expanded={isOptionsOpen}
          aria-haspopup="menu"
        >
          <DotsThree size={20} weight="bold" />
        </button>

        {isOptionsOpen && typeof document !== 'undefined' && createPortal(
          <div
            ref={optionsRef}
            role="menu"
            aria-label={`Actions du message de ${isMe ? 'moi' : msg.displayName}`}
            style={{
              top: menuPosition?.top ?? 8,
              left: menuPosition?.left ?? 8,
              width: menuPosition?.width ?? 250,
              visibility: menuPosition ? 'visible' : 'hidden',
            }}
            className="fixed z-[100] w-[250px] max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
          >
            <div className="grid grid-cols-4 gap-1.5 border-b border-gray-200 px-1 pb-1.5">
              {[
                { emoji: '😂', label: 'Rire' },
                { emoji: '❤️', label: 'J’aime' },
                { emoji: '👋', label: 'Saluer' },
                { emoji: '✅', label: 'Valider' },
              ].map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  role="menuitem"
                  onClick={() => handleReaction(emoji)}
                  className="flex h-10 items-center justify-center rounded-lg bg-[#f1f2f4] text-[21px] transition-colors hover:bg-[#e6e7e9]"
                  title={label}
                  aria-label={`Réagir avec ${label}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="border-b border-gray-200 py-0.5">
              {isMe && (
                <button type="button" role="menuitem" onClick={startEditing} className="message-menu-item">
                  <span>Modifier le message</span><PencilSimple size={22} />
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onReply?.(msg);
                  closeOptions();
                }}
                className="message-menu-item"
              >
                <span>Répondre</span><ArrowBendUpLeft size={22} />
              </button>
              <button type="button" role="menuitem" onClick={openForwardPicker} className="message-menu-item">
                <span>Transférer</span><ArrowBendUpRight size={22} />
              </button>
            </div>

            <div className="border-b border-gray-200 py-0.5">
              <button type="button" role="menuitem" onClick={handleCopyText} className="message-menu-item">
                <span>Copier le texte</span><Copy size={22} />
              </button>
              <button type="button" role="menuitem" onClick={handleReadMessage} className="message-menu-item">
                <span>Écouter le message</span><SpeakerHigh size={22} />
              </button>
            </div>

            <div className="pt-0.5">
              {isMe && (
                <button type="button" role="menuitem" onClick={openDeleteConfirmation} className="message-menu-item text-red-600 hover:bg-red-50">
                  <span>Supprimer ton message</span><Trash size={22} weight="fill" />
                </button>
              )}
              {!isMe && (
                <button type="button" role="menuitem" onClick={openReportFlow} className="message-menu-item text-red-600 hover:bg-red-50">
                  <span>Signaler ce message</span><Flag size={22} weight="fill" />
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {isForwardOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/30 sm:items-center sm:p-4"
          onClick={() => setIsForwardOpen(false)}
        >
          <div
            className="flex h-[min(90vh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 pb-4 pt-6">
              <div>
                <h2 className="text-[23px] font-bold text-gray-800">Transférer à</h2>
                <p className="mt-1 text-[16px] text-gray-500">Sélectionne où tu veux partager ce message.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsForwardOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100"
                title="Fermer"
                aria-label="Fermer le transfert"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4">
              <label className="flex items-center gap-3 rounded-xl border border-gray-300 px-4 py-2.5 text-gray-500 focus-within:border-blue-500">
                <MagnifyingGlass size={21} />
                <input
                  type="search"
                  value={forwardSearch}
                  onChange={(event) => setForwardSearch(event.target.value)}
                  placeholder="Rechercher"
                  className="min-w-0 flex-1 bg-transparent text-[16px] text-gray-800 outline-none placeholder:text-gray-400"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-3">
              {isForwardLoading ? (
                <p className="px-2 py-6 text-center text-sm text-gray-500">Chargement des conversations…</p>
              ) : (
                forwardTargets
                  .filter(target => `${target.name} ${target.subtitle}`.toLowerCase().includes(forwardSearch.toLowerCase()))
                  .map(target => {
                    const isSelected = selectedForwardTargets.includes(target.id);
                    return (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => toggleForwardTarget(target.id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        {target.photoURL ? (
                          <img src={target.photoURL} alt="" className="h-11 w-11 flex-shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[18px] font-semibold ${target.kind === 'group' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                            {target.kind === 'group' ? '#' : target.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-semibold text-gray-800">{target.name}</span>
                          <span className="block truncate text-[13px] text-gray-500">{target.subtitle}</span>
                        </span>
                        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border text-sm ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 text-transparent'}`} aria-hidden="true">✓</span>
                      </button>
                    );
                  })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              <span className="text-sm text-gray-500">
                {selectedForwardTargets.length > 0 ? `${selectedForwardTargets.length} destination${selectedForwardTargets.length > 1 ? 's' : ''}` : 'Choisis une destination'}
              </span>
              <button
                type="button"
                onClick={() => void handleForward()}
                disabled={selectedForwardTargets.length === 0 || isForwarding}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isForwarding ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isDeleteOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-2 sm:p-4"
          onClick={() => !isDeleting && setIsDeleteOpen(false)}
        >
          <div
            className="w-full max-w-[600px] rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[23px] font-bold text-gray-800">Supprimer ton message</h2>
                <p className="mt-2 text-[16px] text-gray-500">Tu es sûr(e) de vouloir supprimer ton message ?</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
                title="Fermer"
                aria-label="Fermer la confirmation"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                {displayPhotoURL ? (
                  <img src={displayPhotoURL} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: accentColor }}>
                    <svg viewBox="0 0 80 80" width="48" height="48" aria-hidden="true">
                      <circle cx="40" cy="28" r="14" fill="white" fillOpacity="0.9" />
                      <ellipse cx="40" cy="66" rx="22" ry="16" fill="white" fillOpacity="0.9" />
                    </svg>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-semibold text-gray-800">{renderedDisplayName}</span>
                    <span className="text-[12px] text-gray-400">{dateStr}</span>
                  </div>
                  <p className="mt-1 break-words text-[15px] text-gray-700">
                    {msg.text || (msg.audioUrl ? '🎙️ Message vocal' : msg.imageUrl ? 'Image' : msg.videoUrl ? 'Vidéo' : 'Message')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-[16px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteMessage()}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {reportStep && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => !isReporting && setReportStep(null)}
        >
          <div
            className="flex h-[min(92vh,720px)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between px-7 pb-2 pt-7">
              <div>
                <h2 className="text-[23px] font-bold text-gray-800">
                  {reportStep === 'categories' && 'Signaler ce message'}
                  {reportStep === 'summary' && 'Résumé du signalement'}
                  {reportStep === 'sent' && 'Signalement envoyé'}
                </h2>
                {reportStep === 'categories' && (
                  <p className="mt-2 text-[16px] text-gray-500">Sélectionne l’option qui décrit le mieux le problème.</p>
                )}
                {reportStep === 'summary' && (
                  <p className="mt-2 text-[16px] text-gray-500">Relis ton signalement avant de le soumettre.</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => !isReporting && setReportStep(null)}
                disabled={isReporting}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                title="Fermer"
                aria-label="Fermer le signalement"
              >
                <X size={24} />
              </button>
            </div>

            {reportStep === 'categories' && (
              <>
                <div className="px-7 pt-4">
                  <p className="mb-3 text-[14px] font-semibold text-gray-700">Message sélectionné</p>
                  <div className="flex max-h-32 items-start gap-3 overflow-hidden rounded-xl border border-gray-200 p-4">
                    {displayPhotoURL ? (
                      <img src={displayPhotoURL} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
                    ) : (
                      <UserAvatar uid={msg.uid} photoURL={null} displayName={renderedDisplayName} size={48} />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-gray-800">{msg.displayName}</span>
                        <span className="text-[12px] text-gray-400">{dateStr}</span>
                      </div>
                      <div className="mt-1 line-clamp-3">
                        <ReportMessagePreview text={msg.text || (msg.imageUrl ? 'Image' : msg.videoUrl ? 'Vidéo' : 'Message')} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-7 flex-1 overflow-y-auto px-7 pb-6">
                  <div className="overflow-hidden rounded-xl bg-gray-100">
                    {reportCategories.map((category, index) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => selectReportCategory(category)}
                        className={`flex w-full items-center justify-between gap-4 border-gray-200 px-5 py-4 text-left text-[16px] text-gray-700 transition-colors hover:bg-gray-200 ${index > 0 ? 'border-t' : ''}`}
                      >
                        <span>{category}</span>
                        <span className="flex-shrink-0 text-2xl leading-none text-gray-500">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {reportStep === 'summary' && (
              <div className="flex-1 overflow-y-auto px-7 pb-6">
                <p className="text-[15px] leading-6 text-gray-700">En soumettant ce signalement, tu confirmes qu’il est sincère et de bonne foi. Nous te demandons de suivre la Charte d’utilisation de la Communauté et de ne pas soumettre de faux signalements.</p>
                <p className="mt-6 text-[14px] font-semibold text-gray-700">Message sélectionné</p>
                <div className="mt-3 flex max-h-32 items-start gap-3 overflow-hidden rounded-xl border border-gray-200 p-4">
                  {displayPhotoURL ? <img src={displayPhotoURL} alt="" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" /> : <UserAvatar uid={msg.uid} photoURL={null} displayName={renderedDisplayName} size={48} />}
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2"><span className="font-semibold text-gray-800">{msg.displayName}</span><span className="text-[12px] text-gray-400">{dateStr}</span></div>
                    <div className="mt-1 line-clamp-3">
                      <ReportMessagePreview text={msg.text || (msg.imageUrl ? 'Image' : msg.videoUrl ? 'Vidéo' : 'Message')} />
                    </div>
                  </div>
                </div>
                <p className="mt-7 text-[14px] font-semibold text-gray-700">Signaler la catégorie</p>
                <p className="mt-2 flex items-start gap-2 text-[16px] text-gray-700"><span className="text-blue-500">•</span>{reportCategory}</p>
                <div className="mt-8 flex flex-col gap-3">
                  <button type="button" onClick={() => setReportStep('categories')} className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-[16px] font-semibold text-gray-700 hover:bg-gray-100">Retour</button>
                  <button type="button" onClick={() => void submitReport()} disabled={isReporting} className="rounded-xl bg-red-600 px-4 py-3 text-[16px] font-semibold text-white hover:bg-red-700 disabled:opacity-60">{isReporting ? 'Envoi…' : 'Envoyer un signalement'}</button>
                </div>
              </div>
            )}

            {reportStep === 'sent' && (
              <div className="flex flex-1 flex-col items-center overflow-y-auto px-7 pb-7 pt-3 text-center">
                <ShieldCheck size={150} weight="fill" className="mt-3 text-indigo-500" />
                <p className="mt-3 text-[17px] text-gray-600">Merci de nous avoir aidés à rendre la communauté plus sûre.</p>
                <div className="mt-8 w-full text-left">
                  <p className="mb-3 text-[15px] font-semibold text-gray-800">Davantage de choses que tu peux faire</p>
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3 pb-4">
                      <div><p className="font-semibold text-gray-800">Ignorer {msg.displayName}</p><p className="text-[13px] text-gray-500">Tu ne verras plus ses messages</p></div>
                      <button type="button" onClick={() => setReportStep(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Ignorer</button>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
                      <div><p className="font-semibold text-gray-800">Bloquer {msg.displayName} ?</p><p className="text-[13px] text-gray-500">Tu ne verras plus ses messages</p></div>
                      <button type="button" onClick={() => setReportStep(null)} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Bloquer</button>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setReportStep(null)} className="mt-auto w-full rounded-xl bg-indigo-500 px-4 py-3 text-[16px] font-semibold text-white hover:bg-indigo-600">Terminé</button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Avatar */}
      <div className={`flex-shrink-0 ${msg.replyTo ? 'mt-6' : 'mt-0.5'}`}>
        {displayPhotoURL ? (
          <img
            src={displayPhotoURL}
            alt={renderedDisplayName}
            className="w-10 h-10 rounded-full object-cover shadow-sm select-none"
          />
        ) : isBotMessage ? (
          <div
            className="bot-avatar-fallback flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-500 shadow-sm select-none"
            aria-label={`Avatar de ${renderedDisplayName}`}
          >
            <Brain size={22} weight="duotone" aria-hidden="true" />
          </div>
        ) : (
          <div
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full shadow-sm select-none"
          >
            <UserAvatar uid={msg.uid} photoURL={null} displayName={renderedDisplayName} size={40} />
          </div>
        )}
      </div>

      {/* Contenu du message */}
      <div className="flex min-w-0 w-0 max-w-full flex-1 flex-col">
        {msg.replyTo && (
          msg.replyTo.deleted ? (
            <div className="relative mb-1 flex h-6 min-w-0 items-center gap-1 text-[13px] italic leading-5 text-gray-500">
              <span className="absolute -left-8 top-1/2 h-3 w-6 rounded-tl-lg border-l-2 border-t-2 border-gray-300" aria-hidden="true" />
              <ArrowBendUpLeft size={16} aria-hidden="true" />
              <span>Le message original a été supprimé</span>
            </div>
          ) : (
            <div className="relative mb-1 flex h-6 min-w-0 items-center gap-2 text-[13px] leading-5 text-gray-500">
              <span className="absolute -left-8 top-1/2 h-3 w-6 rounded-tl-lg border-l-2 border-t-2 border-gray-300" aria-hidden="true" />
              {msg.replyTo.photoURL ? (
                <img
                  src={msg.replyTo.photoURL}
                  alt=""
                  className="h-5 w-5 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <UserAvatar uid={msg.replyTo.uid} photoURL={null} displayName={msg.replyTo.displayName} size={20} />
              )}
              <div className="flex min-w-0 items-center truncate leading-5">
                <span className="font-medium text-gray-600">@{msg.replyTo.displayName}</span>
                <span className="ml-1 truncate">{msg.replyTo.text || (msg.replyTo.audioUrl ? '🎙️ Message vocal' : 'Message partagé')}</span>
              </div>
            </div>
          )
        )}

        {/* Ligne nom + timestamp */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span
            onClick={() => {
              if (!isTeamMookupMessage && !isMe && onStartPrivateChat && !isBotMessage) {
                onStartPrivateChat({ uid: msg.uid, displayName: msg.displayName });
              }
            }}
            className={`text-[15px] font-semibold leading-none flex items-center gap-1 ${!isTeamMookupMessage && !isMe && !isBotMessage ? 'cursor-pointer hover:underline' : ''} ${isBotMessage && !displayPhotoURL ? 'bot-message-name text-gray-900' : ''}`}
            style={messageNameColor ? { color: messageNameColor } : undefined}
          >
            {renderedDisplayName}
            {!isTeamMookupMessage && !isMe && isCommunityBotMessage && (
              <CommunityBotBadge />
            )}
            {!isTeamMookupMessage && !isMe && (msg.uid === 'bddbot' || msg.uid === 'mistral-ai' || msg.uid?.startsWith('ai-')) && !groupId?.startsWith('ai-') && (
              <BddBotVerifiedBadge />
            )}
          </span>
          <span className="text-[12px] text-gray-400 font-normal leading-none">{dateStr}</span>
        </div>

        {/* Corps du message */}
        {isEditing && (
          <div className="w-full">
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelEditing();
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  void saveEditing();
                }
              }}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-[16px] text-gray-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Modifier le message"
            />
            <div className="mt-1 text-[12px] text-gray-500">
              Échap pour{' '}
              <button type="button" onClick={cancelEditing} className="text-blue-600 hover:underline">
                annuler
              </button>
              {' '}• entrée pour{' '}
              <button type="button" onClick={() => void saveEditing()} className="text-blue-600 hover:underline">
                enregistrer
              </button>
            </div>
          </div>
        )}
        <div className={`${isEditing ? 'hidden' : isBotMessage ? 'block' : 'flex'} min-w-0 max-w-full flex-col ${isBotMessage ? 'w-full overflow-x-hidden' : 'overflow-x-auto'}`}>
          {msg.isDeleted && (
            <div className="text-[15px] italic text-gray-500">Ce message a été supprimé</div>
          )}
          {msg.forwardedFrom && (
            <div className="mb-2 border-l-4 border-gray-300 pl-3 text-[14px] text-gray-600">
              <div className="flex items-center gap-1 font-medium italic text-gray-500">
                <ArrowBendUpRight size={16} aria-hidden="true" /> Transféré
              </div>
              <div className="mt-1 text-[15px] text-gray-700">{msg.text || (msg.audioUrl ? '🎙️ Message vocal' : msg.imageUrl ? 'Image' : msg.videoUrl ? 'Vidéo' : 'Message')}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-gray-500">
                {msg.forwardedFrom.photoURL ? (
                  <img src={msg.forwardedFrom.photoURL} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold">
                    {msg.forwardedFrom.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{msg.forwardedFrom.displayName} <span className="text-gray-400">• Message original</span></span>
              </div>
            </div>
          )}
          {msg.imageUrl && (
            <div className="mb-2 mt-1 rounded-lg overflow-hidden border border-gray-100 shadow-sm max-w-[280px]">
              <img 
                src={msg.imageUrl} 
                alt="Image partagée" 
                className="w-full h-auto object-cover cursor-pointer hover:scale-[1.02] transition-transform"
                onClick={(event) => {
                  event.stopPropagation();
                  openImageInTab(msg.imageUrl!, msg.imageName, {
                    caption: msg.text,
                    displayName: msg.displayName,
                    photoURL: displayPhotoURL || undefined,
                    createdAt: msg.createdAt,
                  });
                }}
              />
              {isGiphyMedia && (
                <a
                  href="https://giphy.com"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="block bg-white px-2 py-1 text-[10px] font-semibold text-gray-500 hover:text-gray-800"
                >
                  Powered by GIPHY
                </a>
              )}
            </div>
          )}
          {msg.videoUrl && (
            <div className="mb-2 mt-1 rounded-lg overflow-hidden border border-gray-100 shadow-sm max-w-[280px] bg-black">
              <video 
                src={`${msg.videoUrl}#t=1`} 
                controls
                preload="metadata"
                className="w-full h-auto max-h-[400px]"
              />
            </div>
          )}
          {msg.audioUrl && (
            <VoiceMessagePlayer src={msg.audioUrl} initialDuration={msg.audioDuration} waveform={msg.audioWaveform} displayName={renderedDisplayName} />
          )}
          <div className={`${msg.forwardedFrom ? 'hidden' : isBotMessage ? 'block' : 'flex'} message-content min-w-0 max-w-full text-[15px] text-[#2e3338] font-normal leading-relaxed break-words markdown-content ${isBotMessage ? 'w-full overflow-x-hidden' : 'overflow-x-auto'} [overflow-wrap:anywhere] [word-break:break-word]`}>

            {(msg.uid === 'bddbot' || msg.uid === 'mistral-ai' || msg.uid?.startsWith('ai-')) ? (
              <BotMessage text={msg.text} activeSpeechSentence={activeSpeechSentence} activeSpeechWord={readingWord} activeSpeechWordIndex={readingWordIndex} />
            ) : (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({children}) => {
                  if (typeof children === 'string' && /@bddbot\b/i.test(children)) {
                    const parts = children.split(/(@bddbot\b)/gi);
                    return (
                      <p className={msg.edited ? 'inline mb-1 last:mb-0' : 'mb-1 last:mb-0'}>
                        {parts.map((part, i) =>
                          /^@bddbot$/i.test(part)
                            ? <span key={i} className="font-medium text-blue-500">{part}</span>
                            : part
                        )}
                      </p>
                    );
                  }
                  return (
                    <p className={msg.edited ? 'inline mb-1 last:mb-0' : 'mb-1 last:mb-0'}>
                      <SpeechHighlightedText activeSentence={activeSpeechSentence} activeWord={readingWord} activeWordIndex={readingWordIndex}>{children}</SpeechHighlightedText>
                    </p>
                  );
                },
                code: CodeBlock,
                table: ({children}) => (
                  <div className="overflow-x-auto my-4 rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">{children}</table>
                  </div>
                ),
                thead: ({children}) => <thead className="bg-gray-50">{children}</thead>,
                th: ({children}) => <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{children}</th>,
                td: ({children}) => <td className="px-4 py-2 text-sm text-gray-600 border-t border-gray-100">{children}</td>,
                ul: ({children}) => <ul className="list-disc ml-5 mb-2 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal ml-5 mb-2 space-y-1">{children}</ol>,
                li: ({children}) => <li className="mb-0.5">{children}</li>,
                strong: ({children}) => <strong className="font-bold text-[#060607]">{children}</strong>,
                a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">{children}</a>,
              }}
            >
              {msg.text}
            </ReactMarkdown>
            )}
            {msg.edited && <span className="ml-1 text-[11px] text-gray-400">(modifié)</span>}
          </div>
          
          {/* Link Previews */}
          {(() => {
            const urlRegex = /(?:https?:\/\/|www\.)[^\s]+/g;
            const match = msg.text.match(urlRegex);
            if (match) {
              const previewUrl = /^www\./i.test(match[0]) ? `https://${match[0]}` : match[0];
              return <LinkPreviewCard url={previewUrl} />;
            }
            return null;
          })()}

          {Object.entries(reactionGroups).length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {Object.entries(reactionGroups).map(([emoji, count]) => {
                const isSelected = msg.reactions?.[user?.uid] === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleReaction(emoji);
                    }}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[15px] transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    title={isSelected ? 'Retirer ma réaction' : 'Réagir avec cette réaction'}
                    aria-label={`${emoji}, ${count} réaction${count > 1 ? 's' : ''}${isSelected ? ' — retirer ma réaction' : ''}`}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <span className="text-[13px] font-medium">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
