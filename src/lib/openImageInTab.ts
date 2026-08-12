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
  bot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m-6 3.5A2.5 2.5 0 0 1 8.5 7h7A2.5 2.5 0 0 1 18 9.5v6A2.5 2.5 0 0 1 15.5 18h-7A2.5 2.5 0 0 1 6 15.5v-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9.5" cy="12" r="1" fill="currentColor"/><circle cx="14.5" cy="12" r="1" fill="currentColor"/><path d="M9 15h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3.5 11.5v2m17-2v2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  bddbot: '<img src="/BDDBOT.png" alt="" aria-hidden="true">',
  send: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M230.5,113.88,42.27,24.54A16,16,0,0,0,19.6,41.26L36,103.6a8,8,0,0,0,6.3,5.85l92.27,17.2-92.27,17.2A8,8,0,0,0,36,149.7l-16.4,62.34a16,16,0,0,0,22.67,16.72l188.23-89.34a16,16,0,0,0,0-25.54ZM43.31,212,54.64,169,145,152.17a16,16,0,0,0,0-31.34L54.64,104,43.31,61,215.5,142Z" fill="currentColor"/></svg>',
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
    .analyze-button { position: absolute; top: 50%; right: 18px; z-index: 2; display: inline-flex; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #5865f2; box-shadow: none; transform: translateY(-50%); transition: none; }
    .analyze-button:hover, .analyze-button:focus-visible { background: #5865f2; box-shadow: none; transform: translateY(-50%); outline: 2px solid #d1d5db; outline-offset: 2px; }
    .analyze-button img { width: 30px; height: 30px; object-fit: contain; }
    .analysis-backdrop { position: absolute; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; padding: 22px; background: rgba(10,17,30,.52); backdrop-filter: blur(6px); opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .22s ease, visibility 0s linear .22s; }
    .analysis-backdrop.is-open { opacity: 1; visibility: visible; pointer-events: auto; transition-delay: 0s; }
    .analysis-card { width: min(620px, 100%); max-height: min(90dvh, 760px); overflow: hidden auto; scrollbar-width: none; padding: 0; border: 1px solid #e4e7ec; border-radius: 6px; background: #fff; box-shadow: 0 24px 70px rgba(15,23,42,.26); transform: translateY(12px); transition: transform .28s cubic-bezier(.22,1,.36,1); }
    .analysis-backdrop.is-open .analysis-card { transform: translateY(0); }
    .analysis-card::-webkit-scrollbar { width: 0; height: 0; display: none; }
    .analysis-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin: 0; padding: 27px 28px 22px; border-bottom: 1px solid #edf0f4; }
    .analysis-brand { display: flex; align-items: center; gap: 14px; }
    .analysis-brand-icon { display: grid; width: 44px; height: 44px; flex-shrink: 0; place-items: center; border-radius: 12px; color: #fff; background: #5865f2; box-shadow: none; }
    .analysis-brand-icon img { width: 32px; height: 32px; object-fit: contain; }
    .analysis-title { margin: 5px 0 0; color: #172033; font-size: 23px; font-weight: 650; letter-spacing: -.02em; }
    .analysis-subtitle { margin: 7px 0 0; color: #6b7280; font-size: 13px; line-height: 1.55; }
    .analysis-card .close-details { flex-shrink: 0; padding: 8px 11px; border-radius: 5px; color: #526071; background: #fff; }
    .analysis-card .close-details:hover { border-color: #cbd2dc; color: #172033; background: #f8fafc; }
    .analysis-preview { display: block; width: calc(100% - 56px); height: 176px; margin: 24px 28px 22px; border: 1px solid #e9edf2; border-radius: 5px; background: #f6f7fb; object-fit: contain; }
    .analysis-label { display: block; margin: 0 28px 10px; color: #374151; font-size: 13px; font-weight: 600; }
    .suggested-questions { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 28px 24px; }
    .suggested-question { padding: 10px 13px; border: 1px solid #e1e5eb; border-radius: 5px; color: #374151; background: #f8fafc; font-size: 12px; text-align: left; transition: border-color .15s ease, background-color .15s ease, color .15s ease; }
    .suggested-question:hover { border-color: #9ca3af; color: #111827; background: #f3f4f6; }
    .analysis-form { display: flex; align-items: flex-end; gap: 10px; margin: 0 28px 28px; padding: 6px; border: 1px solid #d7dde5; border-radius: 7px; background: #fff; box-shadow: 0 4px 14px rgba(15,23,42,.05); }
    .analysis-input { min-height: 48px; max-height: 120px; flex: 1; resize: vertical; padding: 11px 14px; border: 0; border-radius: 4px; outline: none; color: #172033; background: transparent; font: inherit; font-size: 13px; line-height: 1.5; }
    .analysis-input:focus { border: 0; box-shadow: none; }
    .analysis-submit { display: inline-flex; height: 44px; align-items: center; gap: 7px; padding: 0 15px; border: 1px solid #dfe3e8; border-radius: 5px; color: #374151; background: #fff; font-size: 13px; font-weight: 600; transition: background-color .15s ease, border-color .15s ease; }
    .analysis-submit svg { width: 19px; height: 19px; color: #5865f2; }
    .analysis-submit:hover { border-color: #cbd2dc; background: #f8fafc; }
    .analysis-submit:disabled { cursor: wait; opacity: .6; }
    .analysis-result { display: none; align-items: flex-start; gap: 12px; margin: 0 28px 28px; padding-top: 20px; border-top: 1px solid #eef0f3; }
    .analysis-result.is-visible { display: flex; }
    .analysis-result-avatar { display: grid; width: 40px; height: 40px; flex-shrink: 0; place-items: center; border-radius: 10px; color: #fff; background: #6366f1; }
    .analysis-result-avatar img { width: 30px; height: 30px; object-fit: contain; }
    .analysis-result-body { min-width: 0; flex: 1; }
    .analysis-result-name { color: #172033; font-size: 14px; font-weight: 600; }
    .analysis-result-label { margin-left: 6px; color: #9ca3af; font-size: 11px; }
    .analysis-result-text { margin-top: 7px; color: #374151; font-size: 15px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
    .analysis-result.is-error .analysis-result-text { color: #b42318; }
    .metadata { position: relative; flex: 0 0 auto; min-height: 76px; max-height: 150px; overflow: auto; padding: 13px 82px 13px 18px; background: #fff; }
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
    .close-details { padding: 8px 12px; border: 1px solid #e1e5eb; border-radius: 8px; color: #4b5563; background: #fff; font-size: 12px; font-weight: 600; }
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
    .toast.is-visible { display: block; }      @media (max-width: 600px) {
      .controls { top: 10px; right: 10px; gap: 10px; }
      .control-button { width: 28px; height: 38px; }
      .metadata { max-height: 145px; padding: 11px 70px 11px 14px; }
      .analyze-button { right: 12px; }
      .details-grid { grid-template-columns: 1fr; }
      .analysis-card { border-radius: 5px; }
      .analysis-header { gap: 12px; padding: 21px 18px 18px; }
      .analysis-brand { gap: 11px; }
      .analysis-brand-icon { width: 40px; height: 40px; border-radius: 10px; }
      .analysis-brand-icon img { width: 29px; height: 29px; }
      .analysis-title { font-size: 21px; }
      .analysis-preview { width: calc(100% - 36px); height: 142px; margin: 18px 18px 20px; }
      .analysis-label { margin-left: 18px; margin-right: 18px; }
      .suggested-questions { margin-left: 18px; margin-right: 18px; }
      .analysis-form { margin: 0 18px 22px; }
      .analysis-result { margin-left: 18px; margin-right: 18px; margin-bottom: 22px; }
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
      ${type === 'image' ? `<button class="analyze-button" id="analyze-button" type="button" title="Analyser cette image avec BDD Bot" aria-label="Analyser cette image avec BDD Bot">${icons.bddbot}</button>` : ''}
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
    ${type === 'image' ? `<section class="analysis-backdrop" id="analysis-backdrop" aria-label="Analyse de l’image avec BDD Bot">
      <div class="analysis-card" role="dialog" aria-modal="true" aria-labelledby="analysis-title">
        <div class="analysis-header"><div class="analysis-brand"><span class="analysis-brand-icon">${icons.bddbot}</span><div><div class="eyebrow">Assistant</div><h2 class="analysis-title" id="analysis-title">BDD Bot</h2><p class="analysis-subtitle">Analyse cette image et réponds à tes questions.</p></div></div><button class="close-details" id="close-analysis" type="button">Fermer</button></div>
        <img class="analysis-preview" src="${safeUrl}" alt="Aperçu de l’image à analyser">
        <label class="analysis-label" for="analysis-input">Suggestions</label>
        <div class="suggested-questions">
          <button class="suggested-question" type="button" data-question="Que contient cette image ?">Que contient cette image ?</button>
          <button class="suggested-question" type="button" data-question="Peux-tu lire et expliquer le texte présent sur cette image ?">Lire le texte présent</button>
          <button class="suggested-question" type="button" data-question="Analyse cette image et donne-moi les éléments importants à retenir.">Donner les éléments importants</button>
        </div>
        <form class="analysis-form" id="analysis-form"><textarea class="analysis-input" id="analysis-input" rows="2" placeholder="Pose ta question à BDD Bot…"></textarea><button class="analysis-submit" id="analysis-submit" type="submit">${icons.send}<span>Analyser</span></button></form>
        <div class="analysis-result" id="analysis-result" role="status"><span class="analysis-result-avatar">${icons.bddbot}</span><div class="analysis-result-body"><span class="analysis-result-name">BDD Bot</span><span class="analysis-result-label">Assistant</span><div class="analysis-result-text" id="analysis-result-text"></div></div></div>
      </div>
    </section>` : ''}
    <div class="toast" id="toast" role="status"></div>
  </main>
  <script>
    const viewer = document.getElementById('viewer');
    const media = document.getElementById('media');
    const detailsBackdrop = document.getElementById('details-backdrop');
    const analysisBackdrop = document.getElementById('analysis-backdrop');
    const toast = document.getElementById('toast');
    const analysisInput = document.getElementById('analysis-input');
    const analysisResult = document.getElementById('analysis-result');
    const analysisResultText = document.getElementById('analysis-result-text');
    const analysisSubmit = document.getElementById('analysis-submit');
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
    const closeAnalysis = () => analysisBackdrop?.classList.remove('is-open');
    document.getElementById('analyze-button')?.addEventListener('click', () => analysisBackdrop?.classList.add('is-open'));
    document.getElementById('close-analysis')?.addEventListener('click', closeAnalysis);
    analysisBackdrop?.addEventListener('click', (event) => { if (event.target === analysisBackdrop) closeAnalysis(); });
    document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => { analysisInput.value = button.dataset.question || ''; analysisInput.focus(); }));
    document.getElementById('analysis-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const question = analysisInput.value.trim();
      if (!question || !analysisSubmit || !analysisResult || !analysisResultText) return;
      analysisSubmit.disabled = true;
      analysisResult.classList.remove('is-error');
      analysisResult.classList.add('is-visible');
      analysisResultText.textContent = 'BDD Bot analyse l’image…';
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question, imageUrl: ${scriptValue(mediaUrl)}, imageAnalysis: true, model: 'mistral-large-latest' }),
        });
        const data = await response.json();
        if (!response.ok || !data.response) throw new Error(data.error || 'Réponse indisponible');
        analysisResultText.textContent = data.response;
      } catch (error) {
        analysisResult.classList.add('is-error');
        analysisResultText.textContent = error instanceof Error ? error.message : 'Impossible d’analyser cette image pour le moment.';
      } finally {
        analysisSubmit.disabled = false;
      }
    });
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
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (analysisBackdrop?.classList.contains('is-open')) closeAnalysis(); else if (detailsBackdrop.classList.contains('is-open')) detailsBackdrop.classList.remove('is-open'); else window.close(); } });
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
