'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayRemove, Timestamp } from 'firebase/firestore';
import UserAvatar from '@/components/ui/UserAvatar';
import LinkPreviewCard from '@/components/chat/LinkPreviewCard';
import { ArrowsIn, ArrowsOut, CaretLeft, Eye, EyeSlash, Pause, Play, Trash } from '@phosphor-icons/react';

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

function extractLinks(text: string): string[] {
  const links = text.match(URL_REGEX) || [];
  return links.map(link =>
    /^www\./i.test(link) ? `https://${link}` : link
  );
}

function renderTextWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(URL_REGEX);
  return parts.map((part, index) =>
    /^((https?:\/\/|www\.)[^\s<>"']+)/i.test(part) ? (
      <a
        key={index}
        href={/^www\./i.test(part) ? `https://${part}` : part}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-blue-400 underline decoration-blue-400/60 underline-offset-2 hover:text-blue-300"
        onClick={event => event.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
}

const STATUS_FONT_SIZES = {
  small: 'clamp(1.1rem, 3vw, 1.6rem)',
  normal: 'clamp(1.35rem, 4vw, 2.25rem)',
  large: 'clamp(1.8rem, 6vw, 3.5rem)',
} as const;

type StatusTextStyle = {
  fontFamily?: string;
  fontSize?: keyof typeof STATUS_FONT_SIZES;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
};

interface StatusItem {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  bgColor?: string;
  caption?: string;
  textStyle?: StatusTextStyle;
  createdAt: Timestamp;
}

interface UserStatus {
  uid: string;
  displayName: string;
  photoURL: string;
  items: StatusItem[];
}

export default function StatusViewer({ userStatus, currentUserId, onClose }: { userStatus: UserStatus, currentUserId: string, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // L’interface du statut reste toujours pleine page, même hors du plein écran navigateur.
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackFeedback, setPlaybackFeedback] = useState<'pause' | 'play' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const progressRef = useRef(0);
  const pendingVideoSeekRef = useRef<{ index: number; progress: number } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items: StatusItem[] = userStatus.items || [];
  const currentItem = items[currentIndex];
  const isMe = userStatus.uid === currentUserId;
  const currentTextStyle = currentItem?.textStyle || {};

  const STATUS_DURATION = 10000; // 10 seconds

  // Utiliser une ref pour la fonction onClose pour éviter les problèmes de fermeture (stale closure)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleNext = React.useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < items.length - 1) {
        progressRef.current = 0;
        setProgress(0);
        setShowControls(true);
        setIsPaused(false);
        return prev + 1;
      }
      return prev;
    });
  }, [items.length]);

  // Keep track of when we need to close
  useEffect(() => {
    if (progress >= 100) {
      if (currentIndex >= items.length - 1) {
        onCloseRef.current();
      } else {
        handleNext();
      }
    }
  }, [progress, currentIndex, items.length, handleNext]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Une animation basée sur le temps réel garde la barre parfaitement fluide.
  useEffect(() => {
    if (!currentItem || currentItem.type === 'video' || isPaused) return;

    let frameId = 0;
    const startedAt = performance.now() - (progressRef.current / 100) * STATUS_DURATION;
    const animate = (now: number) => {
      const nextProgress = Math.min(100, ((now - startedAt) / STATUS_DURATION) * 100);
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (nextProgress < 100) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [currentIndex, currentItem, isPaused]);

  // La vidéo est également suivie image par image pour éviter les sauts de la barre.
  useEffect(() => {
    if (!currentItem || currentItem.type !== 'video' || isPaused) return;

    let frameId = 0;
    const animateVideo = () => {
      const video = videoRef.current;
      if (video?.duration && Number.isFinite(video.duration)) {
        const nextProgress = Math.min(100, (video.currentTime / video.duration) * 100);
        progressRef.current = nextProgress;
        setProgress(nextProgress);
      }
      frameId = requestAnimationFrame(animateVideo);
    };

    frameId = requestAnimationFrame(animateVideo);
    return () => cancelAnimationFrame(frameId);
  }, [currentIndex, currentItem, isPaused]);

  const handlePrev = () => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        progressRef.current = 0;
        setProgress(0);
        setShowControls(true);
        setIsPaused(false);
        return prev - 1;
      }
      progressRef.current = 0;
      setProgress(0);
      setShowControls(true);
      setIsPaused(false);
      return prev;
    });
  };

  const toggleFullScreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await viewerRef.current?.requestFullscreen();
      }
    } catch {
      // Le plein écran du navigateur peut être refusé sur certains mobiles.
    }
  };

  const togglePlayback = () => {
    const nextIsPaused = !isPaused;
    setIsPaused(nextIsPaused);
    setPlaybackFeedback(nextIsPaused ? 'pause' : 'play');

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setPlaybackFeedback(null), 850);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentItem?.type !== 'video' || !videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [currentItem, isPaused]);

  const updateProgressFromPointer = (clientX: number) => {
    const track = progressTrackRef.current;
    if (!track || items.length === 0) return;

    const bounds = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.999999, (clientX - bounds.left) / bounds.width));
    const segmentPosition = ratio * items.length;
    const targetIndex = Math.min(items.length - 1, Math.floor(segmentPosition));
    const targetProgress = (segmentPosition - targetIndex) * 100;

    if (targetIndex !== currentIndex) {
      setCurrentIndex(targetIndex);
      pendingVideoSeekRef.current = { index: targetIndex, progress: targetProgress };
    } else if (currentItem.type === 'video' && videoRef.current?.duration) {
      videoRef.current.currentTime = (targetProgress / 100) * videoRef.current.duration;
    }

    progressRef.current = targetProgress;
    setProgress(targetProgress);
  };

  const handleProgressPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    isScrubbingRef.current = true;
    setIsPaused(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateProgressFromPointer(event.clientX);
  };

  const handleProgressPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    event.preventDefault();
    updateProgressFromPointer(event.clientX);
  };

  const handleProgressPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    isScrubbingRef.current = false;
    setIsPaused(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const pendingSeek = pendingVideoSeekRef.current;
    if (!pendingSeek || pendingSeek.index !== currentIndex || currentItem.type !== 'video') return;

    const video = videoRef.current;
    if (!video) return;

    const seekVideo = () => {
      if (video.duration) {
        video.currentTime = (pendingSeek.progress / 100) * video.duration;
        pendingVideoSeekRef.current = null;
      }
    };

    if (video.readyState >= 1) {
      seekVideo();
    } else {
      video.addEventListener('loadedmetadata', seekVideo, { once: true });
      return () => video.removeEventListener('loadedmetadata', seekVideo);
    }
  }, [currentIndex, currentItem]);

  const handleDelete = async () => {
    if (!isMe || !window.confirm('Supprimer ce statut ?')) return;
    
    try {
      const statusRef = doc(db, 'statuses', currentUserId);
      await updateDoc(statusRef, {
        items: arrayRemove(currentItem)
      });
      
      if (items.length <= 1) {
        onClose();
      } else {
        // Le composant parent va se mettre à jour via onSnapshot, 
        // mais pour l'UI locale on peut juste faire next ou prev
        if (currentIndex === items.length - 1) {
          handlePrev();
        } else {
          // Reste sur le même index (le prochain élément prendra cette place)
          progressRef.current = 0;
          setProgress(0);
        }
      }
    } catch (err) {
      console.error('Erreur suppression statut:', err);
    }
  };

  if (!currentItem) return null;

  const viewerBackground = currentItem.type === 'text'
    ? { background: currentItem.bgColor || '#5865f2' }
    : { backgroundColor: '#000' };

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        ref={viewerRef}
        className="relative flex h-[100dvh] w-[100dvw] min-h-0 flex-col select-none overflow-hidden"
        style={viewerBackground}
      >
      {/* ── Couche 1 (z-10) : contenu média ── */}
      <div className="absolute inset-0 z-10">
        <div key={currentIndex} className="status-item-transition absolute inset-0 flex items-center justify-center overflow-x-hidden">
          {currentItem.type === 'text' ? (
            null // rendu dans la couche z-30 pour être au-dessus des zones de tap
          ) : currentItem.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentItem.content}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              playsInline
              onEnded={handleNext}
            />
          ) : (
            <img
              src={currentItem.content}
              alt="Status"
              className="absolute inset-0 h-full w-full object-contain"
            />
          )}
        </div>
      </div>

      {/* ── Couche 2 (z-20) : zones de tap navigation/playback ── */}
      <div className="absolute inset-0 z-20 flex">
        {/* Tiers gauche → précédent */}
        <div
          className="h-full w-1/3 cursor-pointer"
          onClick={() => { if (!showControls) setShowControls(true); else handlePrev(); }}
        />
        {/* Tiers central → pause/play */}
        <div
          className="h-full w-1/3 cursor-pointer"
          onClick={() => { if (!showControls) setShowControls(true); else togglePlayback(); }}
        />
        {/* Tiers droit → suivant */}
        <div
          className="h-full w-1/3 cursor-pointer"
          onClick={() => { if (!showControls) setShowControls(true); else handleNext(); }}
        />
      </div>

      {/* ── Couche 3 (z-30) : texte statut + caption avec liens ── */}
      {currentItem.type === 'text' && (
        <div
          key={currentIndex}
          className="status-item-transition absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
        >
          <div
            className="flex max-h-full min-w-0 w-full flex-col items-center overflow-x-hidden overflow-y-auto px-6 text-center pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            <p
              className="whitespace-pre-wrap break-words text-white"
              style={{
                color: currentTextStyle.color || '#ffffff',
                textAlign: currentTextStyle.align || 'center',
                fontFamily: currentTextStyle.fontFamily || 'DM Sans, sans-serif',
                fontSize: STATUS_FONT_SIZES[currentTextStyle.fontSize || 'normal'],
                fontWeight: currentTextStyle.bold ? 700 : 400,
                fontStyle: currentTextStyle.italic ? 'italic' : 'normal',
                textDecoration: `${currentTextStyle.underline ? 'underline ' : ''}${currentTextStyle.strike ? 'line-through' : ''}`.trim() || 'none',
              }}
            >
              <span
                style={{
                  backgroundColor: currentTextStyle.backgroundColor || 'transparent',
                  borderRadius: currentTextStyle.backgroundColor && currentTextStyle.backgroundColor !== 'transparent' ? '0.35em' : undefined,
                  boxDecorationBreak: 'clone',
                  WebkitBoxDecorationBreak: 'clone',
                  padding: currentTextStyle.backgroundColor && currentTextStyle.backgroundColor !== 'transparent' ? '0.08em 0.2em' : undefined,
                }}
              >
                {renderTextWithLinks(currentItem.content)}
              </span>
            </p>
            {extractLinks(currentItem.content).map(link => (                <div key={link} className="flex min-w-0 w-full max-w-full justify-center overflow-x-hidden">
                <LinkPreviewCard url={link} />
              </div>
            ))}
          </div>
        </div>
      )}
      {currentItem.caption && currentItem.type !== 'text' && (
        <div className="absolute bottom-10 z-30 w-full px-4 text-center pointer-events-none">
          <span
            className="pointer-events-auto inline-block max-w-full break-words rounded-xl bg-black/50 px-4 py-2 text-[clamp(0.9rem,3vw,1.125rem)] text-white backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            {renderTextWithLinks(currentItem.caption)}
          </span>
          {extractLinks(currentItem.caption).map(link => (
            <div
              key={link}
              className="pointer-events-auto mt-2 flex min-w-0 w-full max-w-full justify-center overflow-x-hidden"
              onClick={e => e.stopPropagation()}
            >
              <LinkPreviewCard url={link} />
            </div>
          ))}
        </div>
      )}

      {/* ── Couche 4 (z-40) : feedback pause/play ── */}
      {playbackFeedback && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="status-playback-feedback flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] backdrop-blur-md">
            {playbackFeedback === 'pause' ? <Pause size={30} weight="fill" /> : <Play size={30} weight="fill" />}
          </div>
        </div>
      )}

      {/* ── Couche 5 (z-50) : contrôles UI (progress bar, header, boutons) ── */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-50 transition-opacity duration-300 ease-out ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bars */}
        <div
          ref={progressTrackRef}
          className="pointer-events-auto absolute top-0 z-50 flex w-full touch-none cursor-pointer gap-1 p-2 pt-4"
          role="slider"
          aria-label="Progression du statut"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={handleProgressPointerUp}
        >
          {items.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-none will-change-[width]"
                style={{
                  width: `${idx < currentIndex ? 100 : idx === currentIndex ? progress : 0}%`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="pointer-events-auto absolute top-6 z-50 flex w-full items-center justify-between p-4 text-white">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/20">
              <CaretLeft size={24} />
            </button>
            <UserAvatar
              uid={userStatus.uid}
              photoURL={userStatus.photoURL}
              displayName={userStatus.displayName}
              size={40}
            />
            <div>
              <h2 className="font-medium text-[15px]">{isMe ? 'Mon statut' : userStatus.displayName}</h2>
              <p className="text-[12px] text-white/80">
                {currentItem.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => void toggleFullScreen()}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              title={isFullScreen ? 'Revenir à la vue normale' : 'Mettre le statut en plein écran'}
              aria-label={isFullScreen ? 'Revenir à la vue normale' : 'Mettre le statut en plein écran'}
              aria-pressed={isFullScreen}
            >
              {isFullScreen ? <ArrowsIn size={20} /> : <ArrowsOut size={20} />}
            </button>
            <button
              onClick={() => setShowControls(visible => !visible)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20"
              title={showControls ? 'Masquer les contrôles' : 'Afficher les contrôles'}
              aria-label={showControls ? 'Masquer les contrôles' : 'Afficher les contrôles'}
              aria-pressed={!showControls}
            >
              {showControls ? <Eye size={20} /> : <EyeSlash size={20} />}
            </button>
            {isMe && (
              <button onClick={handleDelete} className="hidden h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 md:flex" title="Supprimer le statut" aria-label="Supprimer le statut">
                <Trash size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bouton supprimer mobile (toujours visible si isMe) */}
      {isMe && (
        <button
          onClick={handleDelete}
          className="absolute bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/20 md:hidden"
          title="Supprimer le statut"
          aria-label="Supprimer le statut"
        >
          <Trash size={20} />
        </button>
      )}
      </div>
    </div>
  );
}
