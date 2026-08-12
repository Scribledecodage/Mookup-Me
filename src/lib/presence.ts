import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';

// Présence conservée dans Firestore, mais avec un seul heartbeat et un seul listener partagé.
const HEARTBEAT_INTERVAL = 30000;
const ONLINE_THRESHOLD = 75000;

export interface UserActivity {
  appId: string;
  appName: string;
  details?: string;
  state?: string;
  logoUrl?: string;
}

export interface OnlineUser {
  uid: string;
  isTyping?: boolean;
  typingIn?: string | null;
  displayName?: string;
  device?: 'phone' | 'desktop';
  clientType?: 'web' | 'electron' | 'mobile-app';
  installedApp?: boolean;
  activity?: UserActivity | null;
  lastSeen?: number;
}

type PresenceEntry = {
  uid: string;
  state?: string;
  displayName?: string | null;
  isTyping?: boolean;
  typingIn?: string | null;
  device?: 'phone' | 'desktop';
  clientType?: 'web' | 'electron' | 'mobile-app';
  installedApp?: boolean;
  activity?: UserActivity | null;
  visible?: boolean;
  showLastActivity?: boolean;
  showActivity?: boolean;
  lastSeen?: number;
};

type PresenceListener = (users: OnlineUser[]) => void;

type PresenceStore = {
  uid: string;
  displayName?: string | null;
  listeners: Set<PresenceListener>;
  onlineUsers: OnlineUser[];
  updateHeartbeat: (isTypingStatus?: boolean, typingInGroupId?: string | null) => Promise<void>;
  stop: () => void;
};

const presenceStores = new Map<string, PresenceStore>();

function toMillis(value: unknown): number | undefined {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number') return value;
  return undefined;
}

function getMookupActivity(): UserActivity {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  let details = 'Utilise Mookup';

  if (pathname.startsWith('/discussions') || pathname.startsWith('/accueil')) details = 'Discute avec sa communauté';
  else if (pathname.startsWith('/statuts')) details = 'Consulte les statuts';
  else if (pathname.startsWith('/bots')) details = 'Explore les bots';
  else if (pathname.startsWith('/profil')) details = 'Consulte son profil';
  else if (pathname.startsWith('/appels')) details = 'Gère ses appels';

  return {
    appId: 'mookup',
    appName: 'Mookup',
    details,
    logoUrl: '/Logo.png',
  };
}

function normalizeSystemActivity(activity: ElectronSystemActivity | null): UserActivity | null {
  if (!activity?.appName) return null;
  return {
    appId: activity.appId || 'desktop-app',
    appName: activity.appName,
    details: activity.details,
    state: activity.state,
    logoUrl: activity.logoUrl || undefined,
  };
}

function createPresenceStore(uid: string, displayName?: string | null): PresenceStore {
  const listeners = new Set<PresenceListener>();
  const presenceEntries = new Map<string, PresenceEntry>();
  let activityPrivacy = { showOnlineStatus: true, showLastActivity: true, showActivity: true };
  let isActive = true;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribeStatuses: (() => void) | null = null;
  let unsubscribePrivacy: (() => void) | null = null;
  let unsubscribeSystemActivity: (() => void) | null = null;
  let systemActivity: UserActivity | null = null;
  let currentTyping = { isTyping: false, typingIn: null as string | null };

  const notify = () => {
    const now = Date.now();
    const online = Array.from(presenceEntries.values())
      .filter(entry => {
        const lastSeen = entry.lastSeen;
        return entry.state === 'online'
          && entry.visible !== false
          && typeof lastSeen === 'number'
          && now - lastSeen < ONLINE_THRESHOLD;
      })
      .map(entry => ({
        uid: entry.uid,
        isTyping: entry.isTyping === true,
        typingIn: entry.typingIn || null,
        displayName: entry.displayName || undefined,
        device: entry.device,
        clientType: entry.clientType,
        installedApp: entry.installedApp === true,
        activity: entry.showLastActivity !== false && entry.showActivity !== false ? entry.activity || null : null,
        lastSeen: entry.lastSeen,
      }));

    store.onlineUsers = online;
    listeners.forEach(listener => listener(online));
  };

  const writePresence = async (isTypingStatus?: boolean, typingInGroupId?: string | null) => {
    if (!isActive) return;
    if (typeof isTypingStatus === 'boolean') {
      currentTyping = {
        isTyping: isTypingStatus,
        typingIn: isTypingStatus ? typingInGroupId ?? null : null,
      };
    }

    const isMobile = typeof navigator !== 'undefined'
      && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isElectronApp = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;
    const isNativeApp = Capacitor.isNativePlatform();
    const installedApp = isElectronApp || isNativeApp;
    const clientType: PresenceEntry['clientType'] = isElectronApp ? 'electron' : isNativeApp ? 'mobile-app' : 'web';
    const activity = installedApp && activityPrivacy.showActivity
      ? systemActivity?.appId === 'mookup'
        ? getMookupActivity()
        : systemActivity
      : null;
    const lastSeen = Date.now();
    const localEntry: PresenceEntry = {
      uid,
      state: 'online',
      displayName: store.displayName,
      isTyping: currentTyping.isTyping,
      typingIn: currentTyping.typingIn,
      device: isMobile ? 'phone' : 'desktop',
      clientType,
      installedApp,
      activity,
      visible: activityPrivacy.showOnlineStatus,
      showLastActivity: activityPrivacy.showLastActivity,
      lastSeen,
    };
    presenceEntries.set(uid, localEntry);
    notify();

    await setDoc(doc(db, 'status', uid), {
      state: 'online',
      displayName: store.displayName || null,
      lastSeen: serverTimestamp(),
      isTyping: currentTyping.isTyping,
      typingIn: currentTyping.typingIn,
      device: localEntry.device,
      clientType,
      ...(installedApp ? { installedApp: true } : {}),
      activity,
      visible: activityPrivacy.showOnlineStatus,
      showLastActivity: activityPrivacy.showLastActivity,
      showActivity: activityPrivacy.showActivity,
    }, { merge: true });
  };

  const store: PresenceStore = {
    uid,
    displayName,
    listeners,
    onlineUsers: [],
    updateHeartbeat: writePresence,
    stop: () => {
      if (!isActive) return;
      isActive = false;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribeStatuses?.();
      unsubscribeStatuses = null;
      unsubscribePrivacy?.();
      unsubscribePrivacy = null;
      unsubscribeSystemActivity?.();
      unsubscribeSystemActivity = null;
      listeners.clear();
      presenceEntries.clear();
      void setDoc(doc(db, 'status', uid), {
        state: 'offline',
        isTyping: false,
        typingIn: null,
        activity: null,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    },
  };

  presenceStores.set(uid, store);

  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    unsubscribeSystemActivity = window.electronAPI.onSystemActivity?.((activity) => {
      systemActivity = normalizeSystemActivity(activity);
      void writePresence();
    }) || null;
    const initialActivityPromise = window.electronAPI.getSystemActivity?.();
    if (initialActivityPromise) {
      void initialActivityPromise.then((activity) => {
        systemActivity = normalizeSystemActivity(activity || null);
        void writePresence();
      }).catch(() => {});
    }
  }

  unsubscribeStatuses = onSnapshot(collection(db, 'status'), snapshot => {
    if (!isActive) return;
    snapshot.docs.forEach(statusDoc => {
      const data = statusDoc.data();
      const lastSeen = toMillis(data.lastSeen);
      presenceEntries.set(statusDoc.id, {
        uid: statusDoc.id,
        state: data.state,
        displayName: data.displayName,
        isTyping: data.isTyping,
        typingIn: data.typingIn || null,
        device: data.device,
        clientType: data.clientType,
        installedApp: data.installedApp === true,
        activity: data.activity || null,
        visible: data.visible,
        showLastActivity: data.showLastActivity,
        showActivity: data.showActivity,
        lastSeen,
      });
    });
    notify();
  }, error => {
    console.warn('Présence Firestore indisponible:', error);
  });

  channelPrivacyAndStart();

  function channelPrivacyAndStart() {
    unsubscribePrivacy = onSnapshot(doc(db, 'users', uid), snapshot => {
      if (!isActive) return;
      const savedPrivacy = snapshot.data()?.activityPrivacy || {};
      activityPrivacy = {
        showOnlineStatus: savedPrivacy.showOnlineStatus !== false,
        showLastActivity: savedPrivacy.showLastActivity !== false,
        showActivity: savedPrivacy.showActivity !== false,
      };
      void writePresence();
    }, () => {
      void writePresence();
    });
  }

  heartbeat = setInterval(() => {
    void writePresence();
  }, HEARTBEAT_INTERVAL);

  return store;
}

export function usePresence(uid: string | undefined, displayName?: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const storeRef = useRef<PresenceStore | null>(null);

  useEffect(() => {
    if (!uid) return;

    const store = presenceStores.get(uid) || createPresenceStore(uid, displayName);
    store.displayName = displayName;
    storeRef.current = store;
    store.listeners.add(setOnlineUsers);

    return () => {
      store.listeners.delete(setOnlineUsers);
      storeRef.current = null;
      if (store.listeners.size === 0) {
        store.stop();
        presenceStores.delete(uid);
      }
    };
  }, [uid, displayName]);

  const setTyping = useCallback(async (isTyping: boolean, groupId: string | null = null) => {
    const store = storeRef.current;
    if (!store || !uid) return;
    try {
      await store.updateHeartbeat(isTyping, isTyping ? groupId : null);
    } catch (error) {
      console.warn('Impossible de mettre à jour la présence :', error);
    }
  }, [uid]);

  return { onlineUsers, setTyping };
}
