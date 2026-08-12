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
type ActivityPromptListener = (activity: UserActivity | null) => void;
type DesktopActivityPromptConsent = 'unset' | 'enabled' | 'disabled';

type PresenceStore = {
  uid: string;
  displayName?: string | null;
  listeners: Set<PresenceListener>;
  activityPromptListeners: Set<ActivityPromptListener>;
  onlineUsers: OnlineUser[];
  pendingActivity: UserActivity | null;
  updateHeartbeat: (isTypingStatus?: boolean, typingInGroupId?: string | null) => Promise<void>;
  acceptActivity: (appId: string) => void;
  dismissActivity: (appId: string) => void;
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

function normalizeSystemActivity(activity: ElectronSystemActivity | null): UserActivity | null {
  if (!activity?.appName) return null;

  const normalized: UserActivity = {
    appId: activity.appId || 'desktop-app',
    appName: activity.appName,
  };

  if (typeof activity.details === 'string' && activity.details.trim()) normalized.details = activity.details;
  if (typeof activity.state === 'string' && activity.state.trim()) normalized.state = activity.state;
  if (typeof activity.logoUrl === 'string' && activity.logoUrl.trim()) normalized.logoUrl = activity.logoUrl;

  return normalized;
}

function createPresenceStore(uid: string, displayName?: string | null): PresenceStore {
  const listeners = new Set<PresenceListener>();
  const activityPromptListeners = new Set<ActivityPromptListener>();
  const presenceEntries = new Map<string, PresenceEntry>();
  const dismissedActivityIds = new Set<string>();
  let activityPrivacy: {
    showOnlineStatus: boolean;
    showLastActivity: boolean;
    showActivity: boolean;
    desktopPromptConsent: DesktopActivityPromptConsent;
  } = { showOnlineStatus: true, showLastActivity: true, showActivity: true, desktopPromptConsent: 'unset' };
  let isActive = true;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribeStatuses: (() => void) | null = null;
  let unsubscribePrivacy: (() => void) | null = null;
  let unsubscribeSystemActivity: (() => void) | null = null;
  let unsubscribeSystemActivityApproved: (() => void) | null = null;
  let unsubscribeSystemActivityDismissed: (() => void) | null = null;
  let systemActivity: UserActivity | null = null;
  let pendingActivity: UserActivity | null = null;
  let lastDetectedActivityId: string | null = null;
  let currentTyping = { isTyping: false, typingIn: null as string | null };

  const notifyActivityPrompt = () => {
    store.pendingActivity = pendingActivity;
    activityPromptListeners.forEach(listener => listener(pendingActivity));
  };

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
      ? systemActivity
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

  const acceptActivity = (appId: string) => {
    if (!pendingActivity || pendingActivity.appId !== appId) return;
    systemActivity = pendingActivity;
    pendingActivity = null;
    dismissedActivityIds.delete(appId);
    notifyActivityPrompt();
    void writePresence();
  };

  const dismissActivity = (appId: string) => {
    if (!pendingActivity || pendingActivity.appId !== appId) return;
    dismissedActivityIds.add(appId);
    pendingActivity = null;
    systemActivity = null;
    notifyActivityPrompt();
    void writePresence();
  };

  const store: PresenceStore = {
    uid,
    displayName,
    listeners,
    activityPromptListeners,
    onlineUsers: [],
    pendingActivity: null,
    updateHeartbeat: writePresence,
    acceptActivity,
    dismissActivity,
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
      unsubscribeSystemActivityApproved?.();
      unsubscribeSystemActivityApproved = null;
      unsubscribeSystemActivityDismissed?.();
      unsubscribeSystemActivityDismissed = null;
      listeners.clear();
      activityPromptListeners.clear();
      presenceEntries.clear();
      pendingActivity = null;
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

  const handleSystemActivity = (rawActivity: ElectronSystemActivity | null) => {
    console.info('[System activity][renderer-received]', rawActivity);
    const activity = normalizeSystemActivity(rawActivity);
    const appId = activity?.appId || null;

    if (appId !== lastDetectedActivityId) {
      if (lastDetectedActivityId) dismissedActivityIds.delete(lastDetectedActivityId);
      lastDetectedActivityId = appId;
      if (!appId || appId === 'mookup') dismissedActivityIds.clear();
    }

    if (!activity) {
      systemActivity = null;
      pendingActivity = null;
      notifyActivityPrompt();
      void writePresence();
      return;
    }

    if (activity.appId === 'mookup') {
      systemActivity = null;
      pendingActivity = null;
      notifyActivityPrompt();
      void writePresence();
      return;
    }

    if (activity.appId === systemActivity?.appId) {
      systemActivity = activity;
      pendingActivity = null;
      notifyActivityPrompt();
      void writePresence();
      return;
    }

    if (dismissedActivityIds.has(activity.appId)) {
      pendingActivity = null;
      notifyActivityPrompt();
      return;
    }

    pendingActivity = activity;
    notifyActivityPrompt();
  };

  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    unsubscribeSystemActivity = window.electronAPI.onSystemActivity?.(handleSystemActivity) || null;
    unsubscribeSystemActivityApproved = window.electronAPI.onSystemActivityApproved?.((rawActivity) => {
      console.info('[System activity][renderer-approved-event]', rawActivity);
      const activity = normalizeSystemActivity(rawActivity);
      if (!activity) return;
      if (pendingActivity?.appId === activity.appId) {
        acceptActivity(activity.appId);
        return;
      }
      systemActivity = activity;
      pendingActivity = null;
      notifyActivityPrompt();
      void writePresence();
    }) || null;
    unsubscribeSystemActivityDismissed = window.electronAPI.onSystemActivityDismissed?.(({ appId }) => {
      console.info('[System activity][renderer-dismissed-event]', { appId });
      if (pendingActivity?.appId === appId) {
        dismissActivity(appId);
        return;
      }
      pendingActivity = null;
      systemActivity = null;
      notifyActivityPrompt();
      void writePresence();
    }) || null;
    const initialActivityPromise = window.electronAPI.getSystemActivity?.();
    if (initialActivityPromise) {
      void initialActivityPromise.then(activity => handleSystemActivity(activity || null)).catch(() => {});
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
      const desktopPromptConsent: DesktopActivityPromptConsent = savedPrivacy.desktopPromptConsent === 'enabled'
        ? 'enabled'
        : savedPrivacy.desktopPromptConsent === 'disabled' ? 'disabled' : 'unset';
      activityPrivacy = {
        showOnlineStatus: savedPrivacy.showOnlineStatus !== false,
        showLastActivity: savedPrivacy.showLastActivity !== false,
        showActivity: savedPrivacy.showActivity !== false,
        desktopPromptConsent,
      };
      const promptEnabled = desktopPromptConsent === 'enabled' && activityPrivacy.showActivity;
      console.info('[System activity][privacy-loaded]', {
        desktopPromptConsent,
        showActivity: activityPrivacy.showActivity,
        promptEnabled,
      });
      window.electronAPI?.setSystemActivityPromptEnabled?.(promptEnabled);
      if (desktopPromptConsent !== 'enabled') {
        systemActivity = null;
        pendingActivity = null;
        notifyActivityPrompt();
      }
      void writePresence();
    }, error => {
      console.warn('[System activity][privacy-error] Impossible de charger les préférences d’activité.', error);
      window.electronAPI?.setSystemActivityPromptEnabled?.(false);
      void writePresence();
    });
  }

  heartbeat = setInterval(() => {
    void writePresence();
  }, HEARTBEAT_INTERVAL);

  return store;
}

export function useDesktopActivityPrompt(uid: string | undefined, displayName?: string | null) {
  const [pendingActivity, setPendingActivity] = useState<UserActivity | null>(null);
  const storeRef = useRef<PresenceStore | null>(null);

  useEffect(() => {
    if (!uid || typeof window === 'undefined' || !window.electronAPI?.isElectron) return;

    const store = presenceStores.get(uid) || createPresenceStore(uid, displayName);
    store.displayName = displayName;
    storeRef.current = store;
    store.activityPromptListeners.add(setPendingActivity);
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setPendingActivity(store.pendingActivity);
    });

    return () => {
      mounted = false;
      store.activityPromptListeners.delete(setPendingActivity);
      storeRef.current = null;
      if (store.listeners.size === 0 && store.activityPromptListeners.size === 0) {
        store.stop();
        presenceStores.delete(uid);
      }
    };
  }, [uid, displayName]);

  const acceptActivity = useCallback((appId: string) => {
    storeRef.current?.acceptActivity(appId);
  }, []);

  const dismissActivity = useCallback((appId: string) => {
    storeRef.current?.dismissActivity(appId);
  }, []);

  return { pendingActivity, acceptActivity, dismissActivity };
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
      if (store.listeners.size === 0 && store.activityPromptListeners.size === 0) {
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
