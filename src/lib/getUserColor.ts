// 28 couleurs distinctes — jamais deux fois la même pour des UIDs proches
const COLORS = [
  '#5865f2', // indigo discord
  '#3ba55c', // vert
  '#f2994a', // orange
  '#9b51e0', // violet
  '#00b0f4', // bleu ciel
  '#faa61a', // jaune doré
  '#eb459e', // rose
  '#1abc9c', // turquoise
  '#e67e22', // orange foncé
  '#2ecc71', // vert émeraude
  '#3498db', // bleu
  '#e74c3c', // rouge
  '#16a085', // vert sapin
  '#8e44ad', // violet foncé
  '#27ae60', // vert forêt
  '#2980b9', // bleu acier
  '#d35400', // rouille
  '#c0392b', // rouge foncé
  '#1e8bc3', // bleu cerulean
  '#6c3483', // aubergine
  '#117a65', // vert jungle
  '#b7950b', // ocre
  '#784212', // brun
  '#1a5276', // bleu nuit
  '#922b21', // rouge bordeaux
  '#0e6655', // vert forêt foncé
  '#6e2f8c', // violet profond
  '#b03a2e', // terracotta
];

export function getUserColor(uid: string): string {
  if (!uid) return '#5865f2';
  if (uid === 'bddbot') return '#5865f2';
  if (uid === 'mistral-ai' || uid.startsWith('ai-')) return '#ed4245';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // 32-bit int
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
