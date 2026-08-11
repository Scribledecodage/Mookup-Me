// ─── Color extraction & mesh gradient utilities ───────────────────────────────
// Partagé entre ContactPanel et MembersPanel

export type RGB = [number, number, number];

export function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function luminance([r, g, b]: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function saturate([r, g, b]: RGB): number {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/** Convertit RGB → HSL */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

/** Convertit HSL → RGB */
export function hslToRgb(h: number, s: number, l: number): RGB {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/** Booste la saturation d'une couleur RGB à 75% min, luminosité entre 35% et 62% */
export function vibrify(c: RGB): RGB {
  const [h, s, l] = rgbToHsl(c);
  const newS = Math.max(s, 0.75);
  const newL = Math.min(Math.max(l, 0.35), 0.62);
  return hslToRgb(h, newS, newL);
}

/** k-means clustering — retourne les k couleurs les plus représentatives */
export function kMeans(pixels: RGB[], k: number, iterations = 8): RGB[] {
  if (pixels.length === 0) return Array(k).fill([128, 128, 128] as RGB);

  let centers: RGB[] = Array.from({ length: k }, (_, i) =>
    pixels[Math.floor((i / k) * pixels.length)]
  );

  for (let iter = 0; iter < iterations; iter++) {
    const buckets: RGB[][] = Array.from({ length: k }, () => []);
    for (const px of pixels) {
      let best = 0, bestDist = Infinity;
      for (let ci = 0; ci < k; ci++) {
        const dr = px[0] - centers[ci][0];
        const dg = px[1] - centers[ci][1];
        const db = px[2] - centers[ci][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; best = ci; }
      }
      buckets[best].push(px);
    }
    centers = buckets.map((bucket, ci) => {
      if (bucket.length === 0) return centers[ci];
      const r = Math.round(bucket.reduce((s, p) => s + p[0], 0) / bucket.length);
      const g = Math.round(bucket.reduce((s, p) => s + p[1], 0) / bucket.length);
      const b = Math.round(bucket.reduce((s, p) => s + p[2], 0) / bucket.length);
      return [r, g, b] as RGB;
    });
  }
  return centers;
}

/** Charge une image via le proxy, sample les pixels, retourne la palette */
export async function extractColors(originalSrc: string): Promise<RGB[]> {
  return new Promise((resolve) => {
    const proxiedSrc = originalSrc.startsWith('/') || originalSrc.startsWith('data:') || originalSrc.startsWith('blob:')
      ? originalSrc
      : `/api/image-proxy?url=${encodeURIComponent(originalSrc)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const SIZE = 80;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        const pixels: RGB[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const lum = luminance([r, g, b]);
          if (lum < 20 || lum > 235) continue;
          pixels.push([r, g, b]);
        }

        if (pixels.length === 0) { resolve([]); return; }

        const sampled = pixels.length > 2000
          ? pixels.filter((_, i) => i % Math.floor(pixels.length / 2000) === 0)
          : pixels;

        const clusters = kMeans(sampled, 6, 10);
        clusters.sort((a, b) => saturate(b) - saturate(a));
        resolve(clusters.map(vibrify));
      } catch {
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = proxiedSrc;
  });
}

/** Génère un mesh gradient flou multi-radial à partir des couleurs extraites */
export function buildMeshGradient(colors: RGB[]): string {
  if (colors.length === 0) {
    return 'linear-gradient(135deg, #d1d5db, #9ca3af)';
  }

  while (colors.length < 4) colors.push(colors[colors.length - 1]);

  const [c0, c1, c2, c3, c4] = colors;
  const h = (c: RGB) => toHex(c);

  return [
    `radial-gradient(ellipse at 20% 90%, ${h(c0)}ff 0%, transparent 70%)`,
    `radial-gradient(ellipse at 80% 10%, ${h(c1)}ee 0%, transparent 70%)`,
    `radial-gradient(ellipse at 60% 55%, ${h(c2)}cc 0%, transparent 65%)`,
    `radial-gradient(ellipse at 5%  10%, ${h(c3)}bb 0%, transparent 60%)`,
    ...(c4 ? [`radial-gradient(ellipse at 95% 95%, ${h(c4)}bb 0%, transparent 60%)`] : []),
    `linear-gradient(145deg, ${h(c0)}, ${h(c1)})`,
  ].join(', ');
}

/** Génère un mesh gradient à partir d'une couleur hex simple (pour les fallbacks sans photo) */
export function buildMeshGradientFromColor(hex: string): string {
  // Convertit le hex en RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const base: RGB = [r, g, b];
  // Génère 4 variantes légèrement différentes pour donner de la profondeur
  const lighter = hslToRgb(...(([h, s, l]) => [h, s, Math.min(l + 0.15, 0.85)] as [number, number, number])(rgbToHsl(base)));
  const darker  = hslToRgb(...(([h, s, l]) => [h, s, Math.max(l - 0.1, 0.2)] as [number, number, number])(rgbToHsl(base)));
  const shifted = hslToRgb(...(([h, s, l]) => [(h + 0.05) % 1, s, l] as [number, number, number])(rgbToHsl(base)));
  return buildMeshGradient([vibrify(base), vibrify(lighter), vibrify(shifted), vibrify(darker)]);
}

/**
 * Dégradé subtil pour le fond du pseudo dans la liste des membres.
 * Couleur principale de l'avatar à gauche (faible opacité) → blanc transparent à droite.
 */
export function buildBannerGradient(colors: RGB[], _angle = 270): string {
  if (colors.length === 0) {
    return 'linear-gradient(to right, rgba(229,231,235,0.55), rgba(255,255,255,0))';
  }
  const [r, g, b] = colors[0];
  // Couleur à 30% d'opacité à gauche, totalement transparente à droite
  return `linear-gradient(to right, rgba(${r},${g},${b},0.28), rgba(255,255,255,0))`;
}
