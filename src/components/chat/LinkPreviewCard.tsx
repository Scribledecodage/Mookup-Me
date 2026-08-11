'use client';

import React, { useState, useEffect } from 'react';
import { Play, SpeakerHigh } from '@phosphor-icons/react';

interface LinkPreviewData {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName?: string;
  favicon?: string;
  author?: string;
  authorUrl?: string;
  thumbnail?: string;
  embedUrl?: string;
  type?: string;
  audioUrl?: string;
}

export default function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          setPreview(data);
        }
      } catch (err) {
        console.error('Failed to fetch preview', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [url]);

  if (loading) return <div className="mt-2 h-20 w-full bg-gray-50 animate-pulse rounded-lg border border-gray-100" />;
  if (!preview) return null;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    window.open(url, '_blank');
  };
  const favicon = preview.favicon || null;
  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  })();

  return (
    <div
      data-link-preview="true"
      onClick={handleClick}
      className="mt-2 w-full max-w-[320px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:border-gray-200 transition-all"
    >
      {/* Thumbnail or Video Player */}
      {isPlaying && preview.embedUrl ? (
        <div 
          className={`relative bg-black flex items-center justify-center overflow-hidden ${
            preview.type === 'tiktok' ? 'h-[500px]' : 'aspect-video'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <iframe
            src={preview.embedUrl}
            className="w-full h-full border-none"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (preview.thumbnail || preview.image) && (
        <div className="relative aspect-video bg-gray-100 overflow-hidden group">
          <img 
            src={preview.thumbnail || preview.image} 
            alt={preview.title} 
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          {(preview.type === 'youtube' || preview.type === 'tiktok') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-all">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(true);
                }}
                className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-500"
              >
                <Play size={22} weight="regular" />
              </div>
            </div>
          )}
          {preview.type === 'myinstants' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/10 transition-all">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg text-white">
                <SpeakerHigh size={24} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        {favicon && (
          <div className="mb-1 flex min-w-0 items-center gap-1.5">
            <img src={favicon} alt="" className="h-4 w-4 flex-shrink-0 rounded-sm object-contain" />
            <p className="truncate text-[10px] font-semibold text-gray-900">
              {preview.siteName || hostname}
            </p>
          </div>
        )}
        <p className="mb-1 truncate text-[11px] text-gray-400">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">
          {preview.title}
        </h3>
        {preview.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
        {preview.author && (
          <p className="mt-1 text-[11px] font-medium text-gray-900">
            Par {preview.author}
          </p>
        )}
        
        {preview.audioUrl && (
          <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-center">
            <audio controls src={preview.audioUrl} className="w-full h-8 scale-90" />
          </div>
        )}
      </div>
    </div>
  );
}
