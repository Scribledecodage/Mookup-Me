'use client';

import { auth } from '@/lib/firebase';

export type ClientShopEvent = 'open' | 'install' | 'use' | 'feedback';

export async function recordBotShopEvent(botId: string, type: ClientShopEvent, decisionId?: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !botId) return false;

  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/shop/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ botId, type, decisionId }),
      keepalive: true,
    });
    return response.ok;
  } catch (error) {
    console.warn('Événement Shop non envoyé:', error);
    return false;
  }
}
