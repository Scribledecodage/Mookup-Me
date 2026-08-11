export interface MediaTabOptions {
  type?: 'image' | 'video';
  caption?: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: unknown;
}

const scriptValue = (value: string) => JSON.stringify(value).replace(/[<>&]/g, character => ({
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
}[character] || character));

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] || character));

const getNameFromUrl = (mediaUrl: string) => {
  try {
    const pathname = new URL(mediaUrl, window.location.origin).pathname;
    const name = decodeURIComponent(pathname.split('/').pop() || '').trim();
    return name || 'media';
  } catch {
    return 'media';
  }
};

const formatCreatedAt = (value: unknown) => {
  if (!value) return 'Information indisponible';
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (typeof value === 'object' && value !== null && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const converted = (value as { toDate: () => unknown }).toDate();
    if (converted instanceof Date) date = converted;
  } else if (typeof value === 'string' || typeof value === 'number') {
    const converted = new Date(value);
    if (!Number.isNaN(converted.getTime())) date = converted;
  }
  return date ? date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'medium' }) : 'Information indisponible';
};

const icons = {
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v6M12 7.2v.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8.7 11 6.6-3.8m-6.6 5.8 6.6 3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="6.5" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

export function openMediaInTab(mediaUrl: string, fileName?: string, options: MediaTabOptions = {}) {
  const type = options.type || 'image';
  const title = fileName?.trim() || getNameFromUrl(mediaUrl);
  const fileFormat = title.includes('.') ? title.split('.').pop()?.toUpperCase() || 'Inconnu' : type === 'video' ? 'VIDÉO' : 'IMAGE';
  const displayName = options.displayName?.trim() || 'Utilisateur';
  const safeTitle = escapeHtml(title);
  const safeFileFormat = escapeHtml(fileFormat);
  const safeUrl = escapeHtml(mediaUrl);
  const safeFaviconUrl = escapeHtml(new URL('/Logo.png', window.location.origin).href);
  const safeCaption = escapeHtml(options.caption || '');
  const safeDisplayName = escapeHtml(displayName);
  const safePhotoURL = options.photoURL ? escapeHtml(options.photoURL) : '';
  const safeCreatedAt = escapeHtml(formatCreatedAt(options.createdAt));
  const mediaElement = type === 'video'
    ? `<video id="media" src="${safeUrl}" controls autoplay playsinline></video>`
    : `<img id="media" src="${safeUrl}" alt="${safeTitle}">`;
  const authorAvatar = safePhotoURL
    ? `<img class="author-avatar" src="${safePhotoURL}" alt="Photo de profil de ${safeDisplayName}">`
    : `<div class="author-avatar author-fallback">${escapeHtml(displayName.charAt(0).toUpperCase())}</div>`;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap">
  <title>${safeTitle}</title>
  <link rel="icon" type="image/png" href="${safeFaviconUrl}">
  <link rel="shortcut icon" type="image/png" href="${safeFaviconUrl}">
  <style>
    :root { color-scheme: light; font-family: "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: #000; }
    body { color: #1f2937; }
    button { border: 0; cursor: pointer; font: inherit; }
    .viewer { width: 100%; height: 100dvh; display: flex; flex-direction: column; background: #000; }
    .stage { position: relative; min-height: 0; flex: 1; display: flex; align-items: center; justify-content: center; background: #000; }
    .stage img, .stage video { display: block; width: 100%; height: 100%; object-fit: contain; }
    .controls { position: absolute; top: 16px; right: 16px; display: flex; gap: 14px; padding: 0; color: #fff; }
    .control-button { width: 30px; height: 40px; display: grid; place-items: center; border-radius: 0; color: #fff; background: transparent; transition: opacity .15s ease; }
    .control-button:hover { background: transparent; opacity: .72; }
    .control-button svg { width: 21px; height: 21px; }
    .metadata { flex: 0 0 auto; max-height: 150px; overflow: auto; padding: 13px 18px; background: #fff; }
    .media-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: clamp(18px, 2vw, 22px); font-weight: 500; }
    .caption { margin-top: 5px; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #6b7280; font-size: 13px; }
    .author { display: flex; align-items: center; gap: 9px; margin-top: 9px; color: #6b7280; font-size: 13px; }
    .author strong { color: #2563eb; font-weight: 500; }
    .author-avatar { width: 27px; height: 27px; flex: 0 0 27px; border-radius: 50%; object-fit: cover; }
    .author-fallback { display: grid; place-items: center; color: #fff; background: #5865f2; font-weight: 600; }
    .details-backdrop { position: absolute; inset: 0; z-index: 5; display: none; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,.72); backdrop-filter: blur(8px); }
    .details-backdrop.is-open { display: flex; }
    .details-card { width: min(520px, 100%); max-height: 88dvh; overflow: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; box-shadow: 0 22px 60px rgba(0,0,0,.28); }
    .details-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid #eceef1; }
    .eyebrow { color: #6b7280; font-size: 10px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
    .details-title { margin: 6px 0 0; overflow-wrap: anywhere; color: #172033; font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; font-size: 24px; font-weight: 300; letter-spacing: -.02em; line-height: 1.2; }
    .close-details { padding: 7px 10px; border: 1px solid #dfe3e8; border-radius: 6px; color: #374151; background: #fff; font-size: 12px; font-weight: 600; }
    .close-details:hover { background: #f7f8fa; }
    .author-card { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 11px 12px; border: 1px solid #eceef1; border-radius: 8px; background: #fafbfc; }
    .author-card .author-avatar { width: 38px; height: 38px; flex-basis: 38px; }
    .author-card p { margin: 0; }
    .author-card .muted { margin-top: 3px; color: #7b8491; font-size: 12px; }
    .details-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .detail-box { padding: 11px 12px; border: 1px solid #eceef1; border-radius: 6px; background: #fff; font-size: 13px; }
    .detail-label { display: block; color: #7b8491; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    .detail-value { display: block; margin-top: 5px; overflow-wrap: anywhere; color: #172033; font-size: 14px; }
    .detail-value.file-name { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; font-size: 15px; }
    .toast { position: fixed; bottom: 18px; left: 50%; z-index: 10; display: none; transform: translateX(-50%); padding: 9px 13px; border-radius: 10px; color: #fff; background: rgba(0,0,0,.78); font-size: 13px; }
    .toast.is-visible { display: block; }
    @media (max-width: 600px) {
      .controls { top: 10px; right: 10px; gap: 10px; }
      .control-button { width: 28px; height: 38px; }
      .metadata { max-height: 145px; padding: 11px 14px; }
      .details-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main class="viewer" id="viewer">
    <section class="stage" id="stage">
      ${mediaElement}
      <div class="controls" aria-label="Actions du média">
        <button class="control-button" id="details-button" type="button" title="Plus de détails" aria-label="Afficher les détails">${icons.info}</button>
        <button class="control-button" id="fullscreen-button" type="button" title="Plein écran" aria-label="Mettre en plein écran">${icons.fullscreen}</button>
        <button class="control-button" id="download-button" type="button" title="Télécharger" aria-label="Télécharger">${icons.download}</button>
        <button class="control-button" id="share-button" type="button" title="Partager" aria-label="Partager">${icons.share}</button>
      </div>
    </section>
    <section class="metadata">
      <div class="media-title" title="${safeTitle}">${safeTitle}</div>
      ${safeCaption ? `<div class="caption">${safeCaption}</div>` : ''}
      <div class="author">${authorAvatar}<span><strong>${safeDisplayName}</strong> · ${safeCreatedAt}</span></div>
    </section>
    <section class="details-backdrop" id="details-backdrop" aria-label="Détails du média">
      <div class="details-card" role="dialog" aria-modal="true">
        <div class="details-header"><div><div class="eyebrow">Détails du média</div><h2 class="details-title">${safeTitle}</h2></div><button class="close-details" id="close-details" type="button">Fermer</button></div>
        <div class="author-card">${authorAvatar}<div><p><strong>${safeDisplayName}</strong></p><p class="muted">Auteur du message</p></div></div>
        <div class="details-grid">
          <div class="detail-box"><span class="detail-label">Nom du fichier</span><span class="detail-value file-name">${safeTitle}</span></div>
          <div class="detail-box"><span class="detail-label">Format</span><span class="detail-value">${safeFileFormat}</span></div>
          <div class="detail-box"><span class="detail-label">Type</span><span class="detail-value">${type === 'video' ? 'Vidéo' : 'Image'}</span></div>
          <div class="detail-box"><span class="detail-label">Date d’envoi</span><span class="detail-value">${safeCreatedAt}</span></div>
          <div class="detail-box"><span class="detail-label">Dimensions</span><span class="detail-value" id="dimensions">Chargement…</span></div>
          ${type === 'video' ? '<div class="detail-box"><span class="detail-label">Durée</span><span class="detail-value" id="duration">Chargement…</span></div>' : ''}
        </div>
      </div>
    </section>
    <div class="toast" id="toast" role="status"></div>
  </main>
  <script>
    const viewer = document.getElementById('viewer');
    const media = document.getElementById('media');
    const detailsBackdrop = document.getElementById('details-backdrop');
    const toast = document.getElementById('toast');
    const showToast = (message) => { toast.textContent = message; toast.classList.add('is-visible'); setTimeout(() => toast.classList.remove('is-visible'), 1800); };
    const dimensions = document.getElementById('dimensions');
    const duration = document.getElementById('duration');
    const updateMediaInfo = () => { dimensions.textContent = media.videoWidth ? media.videoWidth + ' × ' + media.videoHeight + ' px' : media.naturalWidth ? media.naturalWidth + ' × ' + media.naturalHeight + ' px' : 'Indisponible'; if (duration && media.duration && Number.isFinite(media.duration)) duration.textContent = Math.floor(media.duration / 60) + ' min ' + Math.round(media.duration % 60) + ' s'; };
    media.addEventListener('load', updateMediaInfo);
    media.addEventListener('loadedmetadata', updateMediaInfo);
    updateMediaInfo();
    document.getElementById('details-button').addEventListener('click', () => detailsBackdrop.classList.add('is-open'));
    document.getElementById('close-details').addEventListener('click', () => detailsBackdrop.classList.remove('is-open'));
    detailsBackdrop.addEventListener('click', (event) => { if (event.target === detailsBackdrop) detailsBackdrop.classList.remove('is-open'); });
    document.getElementById('fullscreen-button').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewer.requestFullscreen(); } catch (_) { showToast('Le plein écran est indisponible'); } });
    document.getElementById('download-button').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const response = await fetch(${scriptValue(mediaUrl)});
        if (!response.ok) throw new Error('download-failed');
        const blobUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = ${scriptValue(title)};
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        showToast('Téléchargement terminé');
      } catch (_) {
        const link = document.createElement('a');
        link.href = ${scriptValue(mediaUrl)};
        link.download = ${scriptValue(title)};
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Téléchargement lancé');
      } finally {
        button.disabled = false;
      }
    });
    document.getElementById('share-button').addEventListener('click', async () => { try { if (navigator.share) await navigator.share({ title: ${scriptValue(title)}, text: ${scriptValue(options.caption || title)}, url: ${scriptValue(mediaUrl)} }); else { await navigator.clipboard.writeText(${scriptValue(mediaUrl)}); showToast('Lien copié'); } } catch (_) {} });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (detailsBackdrop.classList.contains('is-open')) detailsBackdrop.classList.remove('is-open'); else window.close(); } });
  </script>
</body>
</html>`;
  // Le HTML est conservé localement et l’URL ne contient qu’une courte clé.
  // Cela évite les erreurs HTTP 431 avec les longues URLs et survit à l’actualisation.
  const viewerKey = `mookup-media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    window.localStorage.setItem(viewerKey, html);
  } catch {
    return;
  }

  const viewerUrl = new URL('/media-viewer.html', window.location.origin);
  viewerUrl.searchParams.set('key', viewerKey);
  const mediaTab = window.open(viewerUrl.href, '_blank');
  if (!mediaTab) window.localStorage.removeItem(viewerKey);
}

export function openImageInTab(imageUrl: string, fileName?: string, options: Omit<MediaTabOptions, 'type'> = {}) {
  openMediaInTab(imageUrl, fileName, { ...options, type: 'image' });
}
