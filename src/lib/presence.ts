import { db, auth } from './firebase';
import { 
  doc,
  getDoc,
  setDoc, 
  serverTimestamp, 
  onSnapshot,
  collection,
  Timestamp
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

// Heartbeat interval in milliseconds (20 seconds)
const HEARTBEAT_INTERVAL = 20000;
// Max age of a heartbeat to consider a user online (45 seconds)
const ONLINE_THRESHOLD = 45000;

export interface OnlineUser {
  uid: string;
  isTyping?: boolean;
  typingIn?: string | null;
  displayName?: string;
  device?: 'phone' | 'desktop';
}

export function usePresence(uid: string | undefined, displayName?: string | null) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, 'status', uid);
    let activityPrivacy = { showOnlineStatus: true, showLastActivity: true };

    // Function to update presence and heartbeat
    const updateHeartbeat = async (isTypingStatus?: boolean, typingInGroupId?: string | null) => {
      const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceType = isMobile ? 'phone' : 'desktop';

      await setDoc(userRef, {
        state: 'online',
        displayName: displayName || null,
        lastSeen: serverTimestamp(),
        isTyping: isTypingStatus ?? false,
        typingIn: typingInGroupId ?? null,
        device: deviceType,
        visible: activityPrivacy.showOnlineStatus,
        showLastActivity: activityPrivacy.showLastActivity,
      }, { merge: true });
    };

    // Charger les préférences avant de publier la présence.
    getDoc(doc(db, 'users', uid)).then((snapshot) => {
      const savedPrivacy = snapshot.data()?.activityPrivacy || {};
      activityPrivacy = {
        showOnlineStatus: savedPrivacy.showOnlineStatus !== false,
        showLastActivity: savedPrivacy.showLastActivity !== false,
      };
      return updateHeartbeat();
    }).catch(() => updateHeartbeat());

    // Start heartbeat interval
    const interval = setInterval(() => {
      // On met à jour le heartbeat sans toucher au statut isTyping
      setDoc(userRef, {
        lastSeen: serverTimestamp(),
        visible: activityPrivacy.showOnlineStatus,
        showLastActivity: activityPrivacy.showLastActivity,
      }, { merge: true });
    }, HEARTBEAT_INTERVAL);

    // Listen to all statuses with heartbeat validation
    const q = collection(db, 'status');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const online = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          if (data.state !== 'online' || data.visible === false) return false;
          
          // Check if heartbeat is still fresh
          const lastSeen = data.lastSeen as Timestamp;
          if (!lastSeen) return false;
          
          return (now - lastSeen.toDate().getTime()) < ONLINE_THRESHOLD;
        })
        .map(doc => ({
          uid: doc.id,
          isTyping: doc.data().isTyping,
          typingIn: doc.data().typingIn || null,
          displayName: doc.data().displayName,
          device: doc.data().device as 'phone' | 'desktop' | undefined
        }));
      setOnlineUsers(online);
    });

    // Cleanup interval on unmount
    return () => {
      clearInterval(interval);
      unsubscribe();
      setDoc(userRef, { state: 'offline', lastSeen: serverTimestamp(), isTyping: false, typingIn: null }, { merge: true });
    };
  }, [uid, displayName]);

  const setTyping = async (isTyping: boolean, groupId: string | null = null) => {
    if (!uid) return;
    const userRef = doc(db, 'status', uid);
    await setDoc(userRef, { isTyping, typingIn: isTyping ? groupId : null, lastSeen: serverTimestamp() }, { merge: true });
  };

  return { onlineUsers, setTyping };
}
