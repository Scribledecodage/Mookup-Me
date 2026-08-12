'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion, serverTimestamp, or, and } from 'firebase/firestore';
import { Check, X } from '@phosphor-icons/react';
import UserAvatar from '@/components/ui/UserAvatar';

type CallUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  getIdToken: () => Promise<string>;
};

type CallRecord = {
  id: string;
  roomName?: string;
  type?: 'audio' | 'video';
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar?: string;
  participants: string[];
  status: 'calling' | 'ongoing' | 'ended';
  acceptedBy?: string[];
  declinedBy?: string[];
  groupName?: string;
};

interface CallHandlerProps {
  user?: CallUser | null;
}

export default function CallHandler({ user }: CallHandlerProps) {
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);
  const [activeCall, setActiveCall] = useState<CallRecord | null>(null);
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [isIncomingCallClosing, setIsIncomingCallClosing] = useState(false);
  const activeCallRef = React.useRef<CallRecord | null>(null);
  const mirotalkLoadedRef = React.useRef(false);

  React.useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  React.useEffect(() => {
    mirotalkLoadedRef.current = false;
  }, [activeCall?.id]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setCallsEnabled(snapshot.data()?.notificationPreferences?.calls !== false);
    });
  }, [user]);

  // Listen to incoming calls
  useEffect(() => {
    if (!user) return;

    // Listen to calls where user is a participant, or if it's a general call
    const q = query(
      collection(db, 'calls'),
      and(
        or(
          where('participants', 'array-contains', user.uid),
          where('participants', 'array-contains', 'general_call')
        ),
        where('status', 'in', ['calling', 'ongoing'])
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!callsEnabled) {
        setIncomingCall(null);
        return;
      }

      let foundIncoming = null;
      let foundActive = null;
      const currentActiveCall = activeCallRef.current;

      snapshot.docs.forEach(docSnap => {
        const call = { id: docSnap.id, ...docSnap.data() } as CallRecord;
        
        // Skip if ended
        if (call.status === 'ended') return;

        // Skip if I declined
        if (call.declinedBy?.includes(user.uid)) return;

        // If I am already in a call, keep it active
        if (currentActiveCall && call.id === currentActiveCall.id) {
          foundActive = call;
          return;
        }

        // If I already accepted, it's an active call
        if (call.acceptedBy?.includes(user.uid) || call.initiatorId === user.uid) {
          foundActive = call;
        } else {
          // Otherwise it's an incoming call (only if not already active in another call)
          if (!currentActiveCall) {
            foundIncoming = call;
          }
        }
      });

      // Pendant la fermeture, on laisse l'animation sortir avant de laisser
      // Firestore retirer définitivement la popup du DOM.
      if (isIncomingCallClosing) return;

      // Update states
      if (foundActive) {
        setActiveCall(foundActive);
        setIncomingCall(null);
      } else {
        // If active call ended
        setActiveCall(null);
        setIncomingCall(foundIncoming);
      }
    });

    return () => unsubscribe();
  }, [user, callsEnabled, isIncomingCallClosing]);

  const animateIncomingCallClose = React.useCallback((callId: string, afterClose?: () => void) => {
    setIsIncomingCallClosing(true);
    window.setTimeout(() => {
      setIncomingCall((currentCall) => currentCall?.id === callId ? null : currentCall);
      setIsIncomingCallClosing(false);
      afterClose?.();
    }, 260);
  }, []);

  const handleAccept = async () => {
    if (!incomingCall || !user || isIncomingCallClosing) return;
    const callToAccept = incomingCall;
    setIsIncomingCallClosing(true);
    try {
      await updateDoc(doc(db, 'calls', callToAccept.id), {
        acceptedBy: arrayUnion(user.uid),
        status: 'ongoing'
      });
      animateIncomingCallClose(callToAccept.id, () => setActiveCall(callToAccept));
    } catch (err) {
      setIsIncomingCallClosing(false);
      console.error("Erreur lors de l'acceptation:", err);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall || !user || isIncomingCallClosing) return;
    const callToDecline = incomingCall;
    setIsIncomingCallClosing(true);
    try {
      await updateDoc(doc(db, 'calls', callToDecline.id), {
        declinedBy: arrayUnion(user.uid)
      });
      
      // If it's a 1-to-1 call and declined, end it for the other person too
      if (callToDecline.participants.length <= 2 && !callToDecline.participants.includes('general_call')) {
        await updateDoc(doc(db, 'calls', callToDecline.id), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      }
      animateIncomingCallClose(callToDecline.id);
    } catch (err) {
      setIsIncomingCallClosing(false);
      console.error("Erreur lors du refus:", err);
    }
  };

  const handleEndCall = React.useCallback(async () => {
    if (!activeCall || !user) return;
    try {
      if (activeCall.initiatorId === user.uid || (activeCall.participants.length <= 2 && !activeCall.participants.includes('general_call'))) {
        await updateDoc(doc(db, 'calls', activeCall.id), {
          status: 'ended',
          endedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Erreur lors de la fin de l'appel:", error);
    } finally {
      setActiveCall(null);
    }
  }, [activeCall, user]);

  const handleMiroTalkLoad = () => {
    if (!mirotalkLoadedRef.current) {
      mirotalkLoadedRef.current = true;
      return;
    }
    // Après le bouton "Quitter" de MiroTalk, l’iframe revient sur sa landing page.
    // On ferme alors automatiquement la couche d’appel pour revenir à Mookup.
    void handleEndCall();
  };

  if (!user) return null;

  const isMobileBrowser = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const mirotalkUrl = activeCall?.roomName
    ? `https://sfu.mirotalk.com/join?${new URLSearchParams({
        room: activeCall.roomName,
        name: user.displayName || 'Utilisateur',
        avatar: user.photoURL || '0',
        audio: '1',
        video: activeCall.type === 'audio' ? '0' : '1',
        // Le partage d’écran dans un iframe reste limité sur iOS et certains Android.
        // On le conserve sur ordinateur et on évite un bouton instable sur mobile.
        screen: isMobileBrowser ? '0' : '1',
        chat: '1',
        notify: '0',
        duration: 'unlimited',
      }).toString()}`
    : '';

  return (
    <>
      {/* Incoming Call Popup */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-x-0 top-4 z-[100] flex justify-center px-4 pointer-events-none sm:top-6">
          <div
            role="dialog"
            aria-label="Appel entrant"
            className={`incoming-call-popup pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-lg border border-blue-100 bg-white p-4 text-slate-900 sm:p-5 ${isIncomingCallClosing ? 'incoming-call-popup-exit' : 'incoming-call-popup-enter'}`}
          >
            <button
              type="button"
              onClick={handleDecline}
              disabled={isIncomingCallClosing}
              aria-label="Fermer la popup d'appel"
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={17} weight="bold" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                <UserAvatar
                  uid={incomingCall.initiatorId || ''}
                  photoURL={incomingCall.initiatorAvatar || null}
                  displayName={incomingCall.initiatorName}                    size={56}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-slate-900">
                  {incomingCall.initiatorName}
                </h3>
                <p className="mt-0.5 truncate text-[13px] text-slate-500">
                  Appel {incomingCall.type === 'video' ? 'vidéo' : 'vocal'}
                  {incomingCall.groupName ? ` · ${incomingCall.groupName}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDecline}
                disabled={isIncomingCallClosing}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-red-50 px-4 text-[14px] font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X size={19} weight="bold" />
                Refuser
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={isIncomingCallClosing}
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-100 px-4 text-[14px] font-semibold text-blue-700 transition-all duration-200 hover:bg-blue-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check size={19} weight="bold" />
                Répondre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Window (MiroTalk SFU) */}
      {activeCall && mirotalkUrl && (
        <div className="fixed inset-0 z-[200] bg-[#101114]">
          <iframe
            src={mirotalkUrl}
            title="Appel vidéo MiroTalk SFU"
            allow="camera; microphone; speaker-selection; display-capture; fullscreen; clipboard-read; clipboard-write; web-share; autoplay; picture-in-picture"
            allowFullScreen
            onLoad={handleMiroTalkLoad}
            className="h-full w-full border-0"
          />
        </div>
      )}
    </>
  );
}
