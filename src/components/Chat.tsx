'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { recordBotShopEvent } from '@/lib/shopEvents';
import { supabase } from '@/lib/supabase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy,
  limit,
  limitToLast,
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  doc,
  where,
  setDoc,
  getDoc,
  getDocs,
  arrayRemove,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  CaretLeft, 
  SealCheck, 
  SignOut, 
  PencilSimple, 
  ShieldSlash, 
  ShieldPlus, 
  Trash, 
  User, 
  UserMinus, 
  UserPlus, 
  X, 
  PhoneCall, 
  VideoCamera, 
  ChatCircle, 
  Info, 
  CalendarBlank, 
  Globe, 
  Users 
} from '@phosphor-icons/react';
import { extractColors, buildMeshGradient, buildMeshGradientFromColor } from '@/lib/colorUtils';
import { getUserColor } from '@/lib/getUserColor';

type CustomBot = {
  id: string;
  name: string;
  slug?: string;
  prompt?: string;
  model?: string;
  description?: string;
  photoURL?: string;
  bannerURL?: string;
  bannerColor?: string;
  category?: string;
  commands?: string;
  welcomeMessage?: string;
  createdBy?: string;
  createdByName?: string;
  createdByPhotoURL?: string;
  createdAt?: any;
};

const escapeRegExp = (value: string) => value;

import AddMembersModal from './sidebar/AddMembersModal';
import CreateGroupModal from './sidebar/CreateGroupModal';
import StatusViewer from './status/StatusViewer';
import GroupAvatar from './ui/GroupAvatar';
import UserAvatar from './ui/UserAvatar';

import { Message, ReplyTo } from './chat/types';
import ChatHeader from './chat/ChatHeader';
import ChatInput from './chat/ChatInput';
import MessageList from './chat/MessageList';
import MembersPanel from './chat/MembersPanel';
import ContactPanel from './chat/ContactPanel';
import ContactProfile from './chat/ContactProfile';
import GroupProfile from './chat/GroupProfile';
import BotProfile from './chat/BotProfile';
import BotInstallModal, { type BotInstallGroup, type BotInstallable } from './bots/BotInstallModal';

import { usePresence } from '@/lib/presence';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { App } from '@capacitor/app';

export default function Chat({ 
  groupId = 'snapchat',
  groupName = 'Team Mookup',
  groupAvatar,
  onBack,
  onStartPrivateChat,
  onNavigate,
  onOpenBotChat,
}: { 
  groupId?: string | null,
  groupName?: string,
  groupAvatar?: string,
  onBack?: () => void,
  onStartPrivateChat?: (user: { uid: string, displayName: string, photoURL?: string }) => void,
  onNavigate?: (tab: string) => void,
  onOpenBotChat?: (chatId: string, data: { name: string; avatar?: string }) => void,
}) {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [customBots, setCustomBots] = useState<CustomBot[]>([]);
  const [botChatConfig, setBotChatConfig] = useState<CustomBot | null>(null);
  const [botToInstall, setBotToInstall] = useState<BotInstallable | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState({ messagesGroups: true, calls: true, sounds: true, browser: true });
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [appState, setAppState] = useState('active');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showOtherUserProfile, setShowOtherUserProfile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ id: string, url: string, type: 'image' | 'video' | 'file', name: string }[]>([]);
  const [userPhotosCache, setUserPhotosCache] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingActiveRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notificationAudioUrlRef = useRef<string | null>(null);
  const notificationPreferencesRef = useRef(notificationPreferences);
  const appStateRef = useRef(appState);
  
  const { onlineUsers, setTyping } = usePresence(user?.uid, user?.displayName);
  const [otherUserRealtimeData, setOtherUserRealtimeData] = useState<{ uid?: string, displayName?: string, photoURL?: string } | null>(null);

  useEffect(() => {
    const botsQuery = query(collection(db, 'bots'), where('isPublic', '==', true));
    return onSnapshot(botsQuery, snapshot => {
      setCustomBots(snapshot.docs.map(botDocument => ({ id: botDocument.id, ...botDocument.data() })) as CustomBot[]);
    }, error => {
      console.warn('Bots personnalisés indisponibles:', error);
      setCustomBots([]);
    });
  }, []);

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      setNotificationPreferences({ messagesGroups: true, calls: true, sounds: true, browser: true, ...(snapshot.data()?.notificationPreferences || {}) });
    });
  }, [user]);
  const [allGroupUsers, setAllGroupUsers] = useState<any[]>([]);
  const [customGroupData, setCustomGroupData] = useState<any | null>(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const [otherUserStatus, setOtherUserStatus] = useState<any | null>(null);
  const [viewingOtherUserStatus, setViewingOtherUserStatus] = useState(false);
  const [clearedAtTime, setClearedAtTime] = useState<number>(0);
  const [contactFullData, setContactFullData] = useState<any | null>(null);
  const [contactProfileTab, setContactProfileTab] = useState<'tableau' | 'activite'>('tableau');
  const [contactBanner, setContactBanner] = useState<string>('');
  const [friendsSince, setFriendsSince] = useState<Date | null>(null);

  const isCustomGroup = !!(groupId && !groupId.startsWith('private_') && !groupId.startsWith('ai-') && !groupId.startsWith('botchat_') && groupId !== 'general' && groupId !== 'snapchat');

  // Ferme les panels quand on change de groupe
  const prevGroupIdRef = useRef(groupId);
  useEffect(() => {
    if (prevGroupIdRef.current !== groupId) {
      setShowMembersPanel(false);
      setShowContactPanel(false);
      setAllGroupUsers([]);
      setCustomGroupData(null);
      setShowOtherUserProfile(false);
      setViewingOtherUserStatus(false);
      setOtherUserRealtimeData(null);
      setContactFullData(null);
      setContactBanner('');
      setFriendsSince(null);
      setOtherUserStatus(null);
      setReplyingTo(null);
      typingActiveRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      prevGroupIdRef.current = groupId;
    }
  }, [groupId]);

  // Pousse un état historique quand une sous-page s'ouvre (pour le bouton retour physique)
  useEffect(() => {
    if (showOtherUserProfile || showMembersPanel || showContactPanel || viewingOtherUserStatus) {
      window.history.pushState({ appSubPage: true }, '');
    }
  }, [showOtherUserProfile, showMembersPanel, showContactPanel, viewingOtherUserStatus]);

  // Intercepte le retour physique pour fermer les sous-pages dans l'ordre
  useEffect(() => {
    const handleAppBack = () => {
      if (viewingOtherUserStatus) {
        setViewingOtherUserStatus(false);
        window._appBackHandled = true;
      } else if (showOtherUserProfile) {
        setShowOtherUserProfile(false);
        window._appBackHandled = true;
      } else if (showMembersPanel) {
        setShowMembersPanel(false);
        window._appBackHandled = true;
      } else if (showContactPanel) {
        setShowContactPanel(false);
        window._appBackHandled = true;
      }
    };
    window.addEventListener('app_back', handleAppBack);
    return () => window.removeEventListener('app_back', handleAppBack);
  }, [viewingOtherUserStatus, showOtherUserProfile, showMembersPanel, showContactPanel]);

  // --- Handlers & Logic ---
  
  const handleHeaderClick = () => {
    setShowOtherUserProfile(true);
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!user || !groupId) return;
    if (groupId.startsWith('ai-') || groupId === 'snapchat') return;

    const roomId = `MookupRoom${Date.now()}${Math.random().toString(36).substr(2, 6)}`.replace(/[^a-zA-Z0-9]/g, '');
    
    try {
      let participants = [user.uid];
      let finalGroupName = groupName;
      
      if (groupId.startsWith('private_')) {
        const uids = groupId.replace('private_', '').split('_');
        participants = uids;
        finalGroupName = '';
      } else if (isCustomGroup && customGroupData) {
        participants = customGroupData.members || [user.uid];
      } else if (groupId === 'general') {
        participants = ['general_call']; 
        finalGroupName = 'Groupe Général';
      }

      await addDoc(collection(db, 'calls'), {
        roomName: roomId,
        type,
        initiatorId: user.uid,
        initiatorName: user.displayName || 'Anonyme',
        initiatorAvatar: user.photoURL || '',
        participants: participants,
        groupId: groupId,
        groupName: finalGroupName,
        status: 'calling',
        startedAt: serverTimestamp(),
        acceptedBy: [],
        declinedBy: []
      });
      
      setShowOtherUserProfile(false);
    } catch (err) {
      console.error("Erreur création appel:", err);
    }
  };

  const saveGroupName = async () => {
    if (!groupId || !editedGroupName.trim() || !user) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        name: editedGroupName.trim(),
        updatedAt: serverTimestamp()
      });
      setIsEditingGroupName(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom:", error);
    }
  };

  const handleGroupImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId || !user) return;
    
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `group-${groupId}-${Date.now()}.${fileExt}`;
      const filePath = `group-images/${fileName}`;

      const { error } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, { photoURL: publicUrl, updatedAt: serverTimestamp() });
    } catch (error: any) {
      console.error('Erreur update image:', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMember = async (e: React.MouseEvent, memberId: string, memberName: string) => {
    e.stopPropagation();
    if (!groupId || !user || !isCustomGroup) return;
    
    const isCreator = customGroupData?.createdBy === user.uid;
    const isAdmin = isCreator || customGroupData?.admins?.includes(user.uid);

    if (!isAdmin) { alert("Seul un administrateur peut retirer des membres."); return; }
    if (memberId === customGroupData?.createdBy) { alert("Impossible de retirer le créateur."); return; }

    if (window.confirm(`Retirer ${memberName} ?`)) {
      try {
        const groupRef = doc(db, 'groups', groupId);
        await updateDoc(groupRef, { members: arrayRemove(memberId), admins: arrayRemove(memberId), updatedAt: serverTimestamp() });
      } catch (error) { console.error("Erreur exclusion:", error); }
    }
  };

  const handleToggleAdmin = async (e: React.MouseEvent, memberId: string, isCurrentlyAdmin: boolean) => {
    e.stopPropagation();
    if (!groupId || !user || !isCustomGroup) return;

    const isCreator = customGroupData?.createdBy === user.uid;
    if (!isCreator) { alert("Seul le créateur peut modifier les admins."); return; }
    if (memberId === user.uid) return;

    try {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        admins: isCurrentlyAdmin ? arrayRemove(memberId) : arrayUnion(memberId),
        updatedAt: serverTimestamp()
      });
    } catch (error) { console.error("Erreur admin rights:", error); }
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !user || !window.confirm("Quitter ce groupe ?")) return;
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) return;
      const groupData = groupSnap.data();
      
      let newCreatedBy = groupData.createdBy;
      let newAdmins = groupData.admins || [];
      const remainingMembers = (groupData.members || []).filter((id: string) => id !== user.uid);
      
      if (groupData.createdBy === user.uid) {
        if (remainingMembers.length > 0) {
          const remainingAdmins = newAdmins.filter((id: string) => id !== user.uid);
          newCreatedBy = remainingAdmins.length > 0 ? remainingAdmins[0] : remainingMembers[0];
          if (remainingAdmins.length === 0) newAdmins.push(newCreatedBy);
        } else {
          newCreatedBy = null;
        }
      }

      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid),
        createdBy: newCreatedBy,
        updatedAt: serverTimestamp()
      });
      if (onBack) onBack();
    } catch (error) { console.error("Erreur sortie groupe:", error); }
  };

  const handleDeleteGroup = async () => {
    if (!groupId || !user || !window.confirm("Supprimer le groupe pour tous ?")) return;
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      if (onBack) onBack();
    } catch (error) { console.error("Erreur suppression groupe:", error); }
  };

  const sendDirectMessage = async (
    text: string,
    imageUrl?: string,
    videoUrl?: string,
    replyTo?: ReplyTo | null,
    imageName?: string,
    audioUrl?: string,
    audioDuration?: number,
    audioMimeType?: string,
    audioWaveform?: number[],
  ): Promise<ReplyTo | null> => {
    if ((!text.trim() && !imageUrl && !videoUrl && !audioUrl) || !user) return null;
    try {
      const msgData: any = {
        text, uid: user.uid, displayName: user.displayName || 'Utilisateur',
        photoURL: user.photoURL || '', groupId, createdAt: serverTimestamp(),
        readBy: { [user.uid]: user.displayName || 'Utilisateur' }
      };
      if (imageUrl) {
        msgData.imageUrl = imageUrl;
        if (imageName) msgData.imageName = imageName;
      }
      if (videoUrl) msgData.videoUrl = videoUrl;
      if (audioUrl) {
        msgData.audioUrl = audioUrl;
        if (audioDuration) msgData.audioDuration = audioDuration;
        msgData.audioName = 'Message vocal';
        if (audioMimeType) msgData.audioMimeType = audioMimeType;
        if (audioWaveform?.length) msgData.audioWaveform = audioWaveform;
      }
      if (replyTo) {
        const sanitizedReplyTo = Object.fromEntries(
          Object.entries(replyTo).filter(([, value]) => value !== undefined)
        ) as ReplyTo;
        msgData.replyTo = sanitizedReplyTo;
      }

      const storedMessage = await addDoc(collection(db, 'messages'), msgData);

      if (groupId?.startsWith('private_')) {
        await setDoc(doc(db, 'private_chats', groupId), {
          updatedAt: serverTimestamp(),
          lastMessage: text || (imageUrl ? "📸 Image" : videoUrl ? "🎥 Vidéo" : "🎙️ Message vocal"),
          deletedBy: []
        }, { merge: true });
      }

      if (isCustomGroup && groupId) {
        await updateDoc(doc(db, 'groups', groupId), {
          updatedAt: serverTimestamp(),
          lastMessage: `${user.displayName}: ${text || (imageUrl ? "📸 Image" : videoUrl ? "🎥 Vidéo" : "🎙️ Message vocal")}`,
          deletedBy: []
        }).catch(() => {});
      }

      const sourceReply: ReplyTo = {
        id: storedMessage.id,
        text: text || (imageUrl ? '📸 Image' : videoUrl ? '🎥 Vidéo' : audioUrl ? '🎙️ Message vocal' : 'Message'),
        uid: user.uid,
        displayName: user.displayName || 'Utilisateur',
      };
      if (user.photoURL) sourceReply.photoURL = user.photoURL;
      if (audioUrl) {
        sourceReply.audioUrl = audioUrl;
        sourceReply.audioDuration = audioDuration;
      }
      return sourceReply;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  const processFile = async (file: File) => {
    if (!user) return;
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(fileExt || '');
      const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt || '');

      if (groupId?.startsWith('ai-') && (isVideo || fileExt === 'gif')) {
        alert("BDD Bot ne supporte que les images fixes pour le moment."); return;
      }
      
      const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
      const filePath = `${isVideo ? 'chat-videos' : isImage ? 'chat-images' : 'chat-files'}/${fileName}`;

      const { error } = await supabase.storage.from('chat-files').upload(filePath, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(filePath);
      
      setPendingFiles(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        url: urlData.publicUrl,
        type: isVideo ? 'video' : isImage ? 'image' : 'file',
        name: file.name
      }]);
    } catch (error: any) { console.error('Erreur upload:', error.message); }
    finally { setIsUploading(false); }
  };

  // --- Computed values (needed by effects below) ---
  const typingUsers = groupId === 'snapchat' ? [] : onlineUsers.filter(u => u.uid !== user?.uid && u.isTyping && u.typingIn === (groupId || 'general'));
  const isBotChat = Boolean(groupId?.startsWith('botchat_'));
  const botChatId = isBotChat && user?.uid && groupId
    ? groupId.slice(`botchat_${user.uid}_`.length)
    : null;
  const installedBotIds = Array.isArray(customGroupData?.installedBots)
    ? customGroupData.installedBots.map((installedBot: any) => installedBot.botId).filter(Boolean)
    : [];

  // ID de l'autre utilisateur dans une discussion privée
  const otherUserId = groupId?.startsWith('private_')
    ? groupId.replace('private_', '').split('_').find(id => id !== user?.uid) ?? null
    : null;
  const hasCurrentUserData = otherUserRealtimeData?.uid === otherUserId;
  const displayAvatar = isCustomGroup ? customGroupData?.photoURL || groupAvatar : hasCurrentUserData ? otherUserRealtimeData?.photoURL ?? groupAvatar : groupAvatar;
  const displayName = isCustomGroup ? customGroupData?.name || groupName : hasCurrentUserData ? otherUserRealtimeData?.displayName ?? groupName : groupName;
  const botProfile = isBotChat
    ? botChatConfig || {
        id: botChatId || '',
        name: groupName,
        photoURL: groupAvatar,
        bannerColor: '#6366f1',
      }
    : null;

  // --- Effects ---

  useEffect(() => {
    if (!isBotChat || !botChatId) {
      setBotChatConfig(null);
      return;
    }
    const knownBot = customBots.find(bot => bot.id === botChatId);
    if (knownBot) {
      setBotChatConfig(knownBot);
      return;
    }
    getDoc(doc(db, 'bots', botChatId)).then(snapshot => {
      if (snapshot.exists()) setBotChatConfig({ id: snapshot.id, ...snapshot.data() } as CustomBot);
    }).catch(() => {});
  }, [isBotChat, botChatId, customBots]);

  useEffect(() => {
    if (!showOtherUserProfile || !otherUserId) return;
    setContactProfileTab('tableau');
    // Charger les données complètes du contact
    getDoc(doc(db, 'users', otherUserId)).then(snap => {
      if (snap.exists()) setContactFullData({ id: snap.id, ...snap.data() });
    });
    // Charger la date de début de la conversation (ami(e)s depuis)
    if (groupId?.startsWith('private_')) {
      getDoc(doc(db, 'private_chats', groupId)).then(snap => {
        if (snap.exists()) {
          const d = snap.data().createdAt || snap.data().updatedAt;
          setFriendsSince(d?.toDate ? d.toDate() : null);
        }
      });
    }
  }, [showOtherUserProfile, otherUserId, groupId]);

  // Bannière mesh gradient pour le profil contact
  useEffect(() => {
    if (!showOtherUserProfile) return;
    const src = contactFullData?.photoURL || displayAvatar;
    const uid = otherUserId || '';
    if (!src) {
      setContactBanner(buildMeshGradientFromColor(getUserColor(uid)));
      return;
    }
    let cancelled = false;
    extractColors(src).then(colors => {
      if (!cancelled) setContactBanner(buildMeshGradient(colors));
    });
    return () => { cancelled = true; };
  }, [showOtherUserProfile, contactFullData?.photoURL, displayAvatar, otherUserId]);

  useEffect(() => {
    const needsUsers = showOtherUserProfile || showMembersPanel;
    const needsGroupUsers = groupId === 'general' || isCustomGroup || groupId === 'snapchat';
    let cancelled = false;

    if (needsUsers && needsGroupUsers) {
      getDocs(query(collection(db, 'users'))).then(snap => {
        if (cancelled) return;
        let users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((u: any) => (u.displayName || u.nickname || u.email) && (!isCustomGroup || customGroupData?.members?.includes(u.id)));
        users.sort((a: any, b: any) => (a.displayName || a.nickname || '').localeCompare(b.displayName || b.nickname || ''));
        setAllGroupUsers(users);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [showOtherUserProfile, showMembersPanel, groupId, isCustomGroup, customGroupData]);

  useEffect(() => {
    if (!user) return;
    if (isCustomGroup && groupId) {
      return onSnapshot(doc(db, 'groups', groupId), (snap) => {
        if (!snap.exists() || !snap.data().members?.includes(user.uid)) { onBack?.(); return; }
        setCustomGroupData({ id: snap.id, ...snap.data() });
      });
    }
  }, [groupId, isCustomGroup, user]);

  useEffect(() => {
    if (!groupId?.startsWith('private_')) return;
    const otherUserId = groupId.replace('private_', '').split('_').find(id => id !== user?.uid);
    if (!otherUserId) return;

    const unsubUser = onSnapshot(doc(db, 'users', otherUserId), (snap) => {
      if (snap.exists()) setOtherUserRealtimeData({ uid: snap.id, displayName: snap.data().displayName, photoURL: snap.data().photoURL });
    });

    const unsubStatus = onSnapshot(doc(db, 'statuses', otherUserId), (snap) => {
      if (snap.exists()) {
        const twentyFourHoursAgo = new Date(Date.now() - 86400000);
        const validItems = (snap.data().items || []).filter((item: any) => item.createdAt.toDate() > twentyFourHoursAgo);
        setOtherUserStatus(validItems.length > 0 ? { ...snap.data(), uid: snap.id, items: validItems } : null);
      }
    });

    return () => { unsubUser(); unsubStatus(); };
  }, [groupId, user?.uid]);

  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (window.visualViewport && scrollRef.current) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        scrollRef.current.style.paddingBottom = keyboardHeight > 50 ? `${keyboardHeight}px` : '0px';
        if (keyboardHeight > 50) setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
      }
    };
    window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
    
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        const next = isActive ? 'active' : 'background';
        setAppState(next);
        appStateRef.current = next;
      });
      window.addEventListener('keyboardWillShow', (e: any) => { if (scrollRef.current) scrollRef.current.style.marginBottom = `${e.keyboardHeight}px`; });
      window.addEventListener('keyboardWillHide', () => { if (scrollRef.current) scrollRef.current.style.marginBottom = '0px'; });
    }

    // Charge le son via un Blob pour éviter les erreurs de cache Chromium sur les MP3 statiques.
    const notificationAudio = new Audio();
    notificationAudio.preload = 'auto';
    fetch('/sounds/notification.mp3', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Notification sound returned ${response.status}`);
        return response.blob();
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        notificationAudioUrlRef.current = objectUrl;
        notificationAudio.src = objectUrl;
        audioRef.current = notificationAudio;
      })
      .catch(error => console.warn('Son de notification indisponible:', error));

    const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      audioRef.current?.pause();
      if (notificationAudioUrlRef.current) {
        URL.revokeObjectURL(notificationAudioUrlRef.current);
        notificationAudioUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (groupId?.startsWith('private_') && user?.uid) {
      getDoc(doc(db, 'private_chats', groupId)).then(snap => {
        if (snap.exists()) setClearedAtTime(snap.data().clearedAt?.[user.uid]?.toDate?.()?.getTime() || 0);
      });
    }
  }, [groupId, user?.uid]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'messages'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'asc'),
      limitToLast(messageLimit)
    );

    const mergeAndSet = (msgs: Message[]) => {
      const unique = Array.from(new Map(msgs.map(m => [m.id, m])).values());

      const filtered = unique.filter(msg => {
        if (groupId === 'snapchat') {
          if (msg.displayName.startsWith('Team Mookup')) return true;
          if (msg.uid === 'bddbot') return msg.targetUid === user?.uid;
          return msg.uid === user?.uid;
        }
        if (clearedAtTime > 0 && msg.createdAt) {
          if ((msg.createdAt.toDate?.()?.getTime() || 0) < clearedAtTime) return false;
        }
        return true;
      });

      // Les messages avec createdAt null (hasPendingWrites) vont en fin de liste
      setMessages(filtered.sort((a, b) => {
        const ta = a.createdAt?.toDate?.()?.getTime?.() ?? Infinity;
        const tb = b.createdAt?.toDate?.()?.getTime?.() ?? Infinity;
        return ta - tb;
      }));
      setHasMore(unique.length >= messageLimit);
      setIsInitialLoad(false);
      setIsLoadingMore(false);
    };

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[];
      mergeAndSet(msgs);

      // Notification Logic
      if (!snap.metadata.hasPendingWrites) {
        const lastMsg = [...msgs].sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))[0];
        if (notificationPreferencesRef.current.messagesGroups && lastMsg && lastMsg.uid !== user?.uid && (appStateRef.current !== 'active' || document.visibilityState !== 'visible')) {
          if (localStorage.getItem('last_notif_id') !== lastMsg.id) {
            localStorage.setItem('last_notif_id', lastMsg.id);
            if (Capacitor.isNativePlatform()) {
              if (notificationPreferencesRef.current.sounds) Haptics.vibrate();
              if (notificationPreferencesRef.current.browser) {
                LocalNotifications.schedule({ notifications: [{ title: `Message de ${lastMsg.displayName}`, body: lastMsg.text || (lastMsg.audioUrl ? '🎙️ Message vocal' : lastMsg.imageUrl ? '📸 Image' : lastMsg.videoUrl ? '🎥 Vidéo' : 'Message'), id: Date.now(), sound: notificationPreferencesRef.current.sounds ? 'notification.mp3' : undefined }] });
              }
            } else {
              if (notificationPreferencesRef.current.sounds) audioRef.current?.play().catch(() => {});
              if (notificationPreferencesRef.current.browser && Notification.permission === 'granted') {
                const showMessageNotification = async () => {
                  let senderPhotoURL = lastMsg.photoURL || '';

                  // Certains anciens messages ou comptes n’ont pas l’avatar dans le message.
                  // On récupère alors la photo actuelle du profil avant d’afficher la notification.
                  if (!senderPhotoURL && lastMsg.uid) {
                    try {
                      const senderSnapshot = await getDoc(doc(db, 'users', lastMsg.uid));
                      senderPhotoURL = senderSnapshot.data()?.photoURL || '';
                    } catch {
                      // Le logo reste le secours si le profil est inaccessible.
                    }
                  }

                  const registration = await navigator.serviceWorker.ready;
                  await registration.showNotification(`Message de ${lastMsg.displayName}`, {
                    body: lastMsg.text || (lastMsg.audioUrl ? '🎙️ Message vocal' : lastMsg.imageUrl ? '📸 Image' : lastMsg.videoUrl ? '🎥 Vidéo' : 'Message'),
                    icon: senderPhotoURL || '/Logo.png'
                  });
                };
                void showMessageNotification();
              }
            }
          }
        }
      }
    });

    return () => unsub();
  }, [groupId, user?.uid, messageLimit, clearedAtTime]);

  const handleReply = (message: Message) => {
    const reply: ReplyTo = {
      id: message.id,
      text: message.text || (message.audioUrl ? '🎙️ Message vocal' : message.imageUrl ? '📸 Image' : message.videoUrl ? '🎥 Vidéo' : 'Message'),
      uid: message.uid,
      displayName: message.displayName,
    };
    if (message.photoURL) reply.photoURL = message.photoURL;
    if (message.audioUrl) reply.audioUrl = message.audioUrl;
    if (message.audioDuration) reply.audioDuration = message.audioDuration;
    setReplyingTo(reply);
  };

  const sendVoiceMessage = async (audio: Blob, duration: number, waveform: number[]) => {
    if (!user || !groupId) return;
    try {
      setIsUploading(true);
      const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
      const baseName = `${user.uid}-${Date.now()}`;
      const mimeCandidates = Array.from(new Set([
        audio.type || 'audio/webm',
        'video/webm',
        'application/octet-stream',
      ]));
      let uploadedPath: string | null = null;
      let uploadedMimeType = mimeCandidates[0];
      let lastUploadError: Error | null = null;

      for (const [index, mimeType] of mimeCandidates.entries()) {
        const filePath = `chat-audio/${baseName}-${index}.${extension}`;
        const uploadBlob = mimeType === audio.type ? audio : new Blob([audio], { type: mimeType });
        const { error } = await supabase.storage.from('chat-files').upload(filePath, uploadBlob, {
          contentType: mimeType,
          upsert: false,
        });
        if (!error) {
          uploadedPath = filePath;
          uploadedMimeType = mimeType;
          break;
        }
        lastUploadError = error;
      }

      if (!uploadedPath) throw lastUploadError || new Error('Le stockage audio est indisponible.');
      const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(uploadedPath);
      await sendDirectMessage('', undefined, undefined, replyingTo, undefined, urlData.publicUrl, duration, uploadedMimeType, waveform);
      setReplyingTo(null);
    } catch (error: any) {
      console.error('Erreur envoi vocal:', error.message);
      alert('Impossible d’envoyer le message vocal.');
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingFiles.length === 0) || !user) return;
    
    if (typingActiveRef.current) {
      typingActiveRef.current = false;
      void setTyping(false, groupId || 'general');
    }
    const textToSend = newMessage;
    const filesToSend = [...pendingFiles];
    const replyToSend = replyingTo;
    
    setNewMessage('');
    setPendingFiles([]);
    setReplyingTo(null);

    const isAiGroup = groupId?.startsWith('ai-') || isBotChat;
    const hasBddBotMention = /^@bddbot\b/i.test(textToSend);
    const mentionedCustomBot = customBots.find(bot => bot.slug && new RegExp(`^@${escapeRegExp(bot.slug)}\\b`, 'i').test(textToSend));
    const mentionedBotIsInstalled = Boolean(mentionedCustomBot && installedBotIds.includes(mentionedCustomBot.id));
    const customBot = isBotChat ? botChatConfig : mentionedBotIsInstalled ? mentionedCustomBot : undefined;
    const isAiCommand = !isAiGroup && (hasBddBotMention || Boolean(customBot));
    
    if (isAiGroup || isAiCommand) {
      const finalPrompt = customBot
        ? isBotChat
          ? textToSend.trim()
          : textToSend.replace(new RegExp(`^@${escapeRegExp(customBot.slug || '')}\\b\\s*`, 'i'), '').trim()
        : hasBddBotMention
        ? textToSend.replace(/^@bddbot\b\s*/i, '').trim()
        : textToSend;
      const promptForApi = finalPrompt || 'L’utilisateur vient de te mentionner sans écrire de question. Réponds brièvement en lui demandant ce dont il a besoin.';
      const firstImageFile = filesToSend.find(f => f.type === 'image');
      const botUid = customBot ? `bot-${customBot.id}` : 'bddbot';
      const botDisplayName = customBot?.name || 'BDD Bot';
      const botPhotoURL = customBot && customBot.photoURL && customBot.photoURL !== '/Logo.png'
        ? customBot.photoURL
        : customBot
          ? ''
          : '/BDDBOT.png';
      const firstImage = firstImageFile?.url;
      const sourceReply = await sendDirectMessage(textToSend, firstImage, undefined, replyToSend, firstImageFile?.name);
      const addBotMessage = async (text: string) => {
        const botMessage: any = {
          text, uid: botUid, targetUid: user.uid, displayName: botDisplayName,
          photoURL: botPhotoURL, groupId, createdAt: serverTimestamp(),
          readBy: { [user.uid]: user.displayName || 'Utilisateur' }
        };
        // BDD Bot cite toujours le message auquel il répond. L’utilisateur, lui, n’est pas forcé à citer le bot.
        if (sourceReply) botMessage.replyTo = sourceReply;
        await addDoc(collection(db, 'messages'), botMessage);
        if (isBotChat && groupId) {
          await setDoc(doc(db, 'private_chats', groupId), {
            updatedAt: serverTimestamp(),
            lastMessage: text,
            deletedBy: [],
          }, { merge: true });
        }
      };
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: promptForApi, imageUrl: firstImage, model: customBot?.model || 'mistral-large-latest', systemPrompt: customBot?.prompt, botName: customBot?.name }),
        });
        const data = await response.json();

        if (!response.ok || !data.response) {
          throw new Error(data.error || 'Réponse vide de BDD Bot');
        }

        await addBotMessage(data.response);
        if (customBot?.id) void recordBotShopEvent(customBot.id, 'use');
      } catch (error) {
        console.error(`Erreur réponse ${botDisplayName}:`, error);
        await addBotMessage("Je n’arrive pas à répondre pour le moment. Vérifie que le service IA est bien configuré, puis réessaie.");
      }
    } else {
      if (textToSend.trim()) await sendDirectMessage(textToSend, undefined, undefined, replyToSend);
      for (const f of filesToSend) {
        await sendDirectMessage(
          '',
          f.type === 'image' ? f.url : undefined,
          f.type === 'video' ? f.url : undefined,
          replyToSend,
          f.type === 'image' ? f.name : undefined
        );
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (user && groupId !== 'snapchat') {
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        void setTyping(true, groupId || 'general');
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        typingActiveRef.current = false;
        void setTyping(false, groupId || 'general');
      }, 700);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('video') !== -1) {
        const file = items[i].getAsFile();
        if (file) await processFile(file);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('application/') || file.type.startsWith('text/') || file.type.startsWith('audio/')) {
        await processFile(file);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) await processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#efeae2] overflow-hidden relative">
      {viewingOtherUserStatus && otherUserStatus && (
        <div className="absolute inset-0 z-[100]">
          <StatusViewer key={otherUserStatus.uid} userStatus={otherUserStatus} currentUserId={user?.uid || ''} onClose={() => setViewingOtherUserStatus(false)} />
        </div>
      )}

      {/* Profil/Infos Modal */}
      {showOtherUserProfile && (
        <div className={`absolute inset-0 z-50 ${groupId?.startsWith('private_') || isBotChat ? 'bg-[#f2f3f5]' : 'bg-white'} flex flex-col`}>
          {isBotChat && botProfile && (
            <BotProfile
              bot={botProfile}
              onClose={() => setShowOtherUserProfile(false)}
            />
          )}

          {(groupId === 'general' || isCustomGroup || groupId?.startsWith('ai-') || groupId === 'snapchat') && (
            <>
              {showAddMembersModal && isCustomGroup && groupId && <AddMembersModal groupId={groupId!} currentMembers={customGroupData?.members || []} onClose={() => setShowAddMembersModal(false)} />}
              <GroupProfile
                groupId={groupId}
                displayName={displayName}
                displayAvatar={displayAvatar}
                isCustomGroup={isCustomGroup}
                customGroupData={customGroupData}
                allGroupUsers={allGroupUsers}
                currentUserId={user?.uid || ''}
                onClose={() => setShowOtherUserProfile(false)}
                onStartCall={handleStartCall}
                onStartPrivateChat={onStartPrivateChat}
                onEditImage={handleGroupImageUpdate}
                onEditName={() => { setEditedGroupName(displayName); setIsEditingGroupName(true); }}
                onAddMembers={() => setShowAddMembersModal(true)}
                onLeaveGroup={handleLeaveGroup}
                onDeleteGroup={handleDeleteGroup}
                onRemoveMember={handleRemoveMember}
              />
            </>
          )}

          {/* Ancienne présentation conservée pour compatibilité */}
          {false && (groupId === 'general' || isCustomGroup) && (
            <>
              <div className="bg-[#f9f9f9] p-3 flex items-center border-b border-gray-300">
                <button onClick={() => setShowOtherUserProfile(false)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all"><CaretLeft size={22} /></button>
                <h1 className="text-[16px] font-normal text-gray-800 ml-2">Infos du groupe</h1>
              </div>
              <div className="flex-1 overflow-y-auto w-full">
                <div className="flex flex-col items-center pt-10 px-4 pb-8 relative">
                  {showAddMembersModal && isCustomGroup && groupId && <AddMembersModal groupId={groupId!} currentMembers={customGroupData?.members || []} onClose={() => setShowAddMembersModal(false)} />}
                  <div className="relative mb-4">
                    <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden shadow-sm">
                      {groupId === 'general' ? <GroupAvatar size={160} /> : displayAvatar ? <img src={displayAvatar} className="w-full h-full object-cover" /> : <GroupAvatar size={160} />}
                    </div>
                    {isCustomGroup && <label className="absolute bottom-1 right-1 w-10 h-10 bg-[#00a884] rounded-full border-[3px] border-white flex items-center justify-center cursor-pointer shadow-md"><PencilSimple size={20} className="text-white" /><input type="file" accept="image/*" className="hidden" onChange={handleGroupImageUpdate} /></label>}
                  </div>
                  <h2 className="text-2xl font-normal text-gray-800 mb-1 flex items-center gap-1.5">
                    {groupId === 'general' ? 'Groupe Général' : displayName}
                    {groupId === 'general' && <SealCheck size={20} className="text-[#00a884]" />}
                    {isCustomGroup && <button onClick={() => { setEditedGroupName(displayName); setIsEditingGroupName(true); }} className="text-gray-400 hover:text-[#00a884] p-1"><PencilSimple size={20} /></button>}
                  </h2>
                  <div className="flex gap-4 w-full max-w-[320px] mt-6">
                    <button onClick={() => setShowOtherUserProfile(false)} className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#f9f9f9] rounded-xl"><ChatCircle className="text-[#00a884]" /><span className="text-xs font-medium">Message</span></button>
                    <button onClick={() => handleStartCall('audio')} className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#f9f9f9] rounded-xl"><PhoneCall className="text-[#00a884]" /><span className="text-xs font-medium">Appeler</span></button>
                    <button onClick={() => handleStartCall('video')} className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#f9f9f9] rounded-xl"><VideoCamera className="text-[#00a884]" /><span className="text-xs font-medium">Vidéo</span></button>
                  </div>
                  <div className="w-full mt-8 border-t border-gray-100 pt-6 px-2">
                    <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Membres ({allGroupUsers.length})</h3>
                    <div className="flex flex-col gap-2">
                      {allGroupUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer" onClick={() => { if (onStartPrivateChat && u.id !== user?.uid) { setShowOtherUserProfile(false); onStartPrivateChat(u); }}}>
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">{userPhotosCache[u.id] || u.photoURL ? <img src={userPhotosCache[u.id] || u.photoURL} className="w-full h-full object-cover" /> : <UserAvatar uid={u.id} photoURL={null} displayName={u.displayName || u.nickname} size={48} />}</div>
                          <div className="flex-1 min-w-0"><span className="text-[15px] font-medium block truncate">{u.displayName || u.nickname} {customGroupData?.createdBy === u.id && <span className="text-[10px] text-[#00a884] font-bold ml-1">CRÉATEUR</span>}</span></div>
                          {isCustomGroup && customGroupData?.createdBy === user?.uid && u.id !== user?.uid && <button onClick={(e) => handleRemoveMember(e, u.id, u.displayName)} className="text-red-500 p-2"><UserMinus size={20} /></button>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {isCustomGroup && (
                    <div className="w-full mt-6 flex flex-col gap-2 border-t border-gray-100 pt-6">
                      <button onClick={() => setShowAddMembersModal(true)} className="flex items-center gap-3 p-3 text-[#00a884] font-medium"><UserPlus size={24} />Ajouter des membres</button>
                      <button onClick={handleLeaveGroup} className="flex items-center gap-3 p-3 text-red-500 font-medium"><SignOut size={24} />Quitter le groupe</button>
                      {customGroupData?.createdBy === user?.uid && <button onClick={handleDeleteGroup} className="flex items-center gap-3 p-3 text-red-600 font-medium"><Trash size={24} />Supprimer le groupe</button>}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Discussion privée : nouveau design Discord-like ── */}
          {groupId?.startsWith('private_') && (
            <ContactProfile
              displayName={displayName}
              displayAvatar={displayAvatar}
              otherUserId={otherUserId || ''}
              onlineUsers={onlineUsers}
              contactFullData={contactFullData}
              friendsSince={friendsSince}
              onClose={() => setShowOtherUserProfile(false)}
              onStartCall={handleStartCall}
            />
          )}

          {/* Ancienne présentation des bots conservée pour compatibilité */}
          {false && (groupId?.startsWith('ai-') || groupId === 'snapchat') && (
            <>
              <div className="bg-[#f9f9f9] p-3 flex items-center border-b border-gray-300">
                <button onClick={() => setShowOtherUserProfile(false)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all"><CaretLeft size={22} /></button>
                <h1 className="text-[16px] font-normal text-gray-800 ml-2">Profil</h1>
              </div>
              <div className="flex-1 overflow-y-auto w-full">
                <div className="flex flex-col items-center pt-10 px-4 pb-8">
                  <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-4 border border-gray-200">
                    {groupId?.startsWith('ai-') ? (
                      <div className="w-full h-full bg-[#6366f1] flex items-center justify-center"><img src="/BDDBOT.png" className="w-24 h-24 object-contain" /></div>
                    ) : (
                      <img src="/Logo.png" alt="Logo" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
                    {groupId === 'snapchat' ? 'Team Mookup' : 'BDD Bot'}
                    <SealCheck size={18} className="text-[#00a884]" />
                  </h2>
                  <div className="flex gap-4 w-full max-w-[280px] mt-6">
                    <button onClick={() => setShowOtherUserProfile(false)} className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#f9f9f9] rounded-xl"><ChatCircle className="text-[#00a884]" /><span className="text-xs font-medium">Message</span></button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <ChatHeader 
        groupId={groupId} displayName={displayName} displayAvatar={displayAvatar} 
        isCustomGroup={isCustomGroup} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen}
        isMembersPanelOpen={showMembersPanel} setIsMembersPanelOpen={setShowMembersPanel}
        isContactPanelOpen={showContactPanel} setIsContactPanelOpen={setShowContactPanel}
        handleHeaderClick={handleHeaderClick} handleStartCall={handleStartCall} menuRef={menuRef}
        onBack={onBack} onNavigate={onNavigate} setShowCreateGroupModal={setShowCreateGroupModal}
        currentUserId={user?.uid}
      />

      {/* Zone centrale : messages + panel membres côte à côte sur desktop */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <MessageList 
            messages={messages} user={user} isLoadingMore={isLoadingMore} hasMore={hasMore}
            handleScroll={(e) => {
              if (e.currentTarget.scrollTop === 0 && hasMore && !isLoadingMore) {
                setIsLoadingMore(true);
                prevScrollHeightRef.current = e.currentTarget.scrollHeight;
                setMessageLimit(prev => prev + 30);
              }
            }}
            scrollRef={scrollRef} prevScrollHeightRef={prevScrollHeightRef} onStartPrivateChat={onStartPrivateChat} onReply={handleReply} groupId={groupId} typingUsers={typingUsers}
          />

          <ChatInput 
            newMessage={newMessage} setNewMessage={setNewMessage} handleInputChange={handleInputChange}
            handlePaste={handlePaste} handleDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            handleDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            handleDrop={handleDrop} isDragging={isDragging} isUploading={isUploading}
            pendingFiles={pendingFiles} setPendingFiles={setPendingFiles}
            handleImageUpload={handleImageUpload} sendMessage={sendMessage} sendVoiceMessage={sendVoiceMessage}
            displayName={displayName} groupId={groupId} fileInputRef={fileInputRef}
            typingUsers={typingUsers} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)}
            installedBotIds={installedBotIds}
            onInstallBot={(bot) => setBotToInstall({
              id: bot.id || '',
              name: bot.name,
              description: bot.description,
              photoURL: bot.icon,
            })}
          />
        </div>

        {/* Panel membres (groupes uniquement) */}
        {(groupId === 'general' || isCustomGroup || groupId === 'snapchat') && (
          <MembersPanel
            groupId={groupId}
            isOpen={showMembersPanel}
            onClose={() => setShowMembersPanel(false)}
            allGroupUsers={allGroupUsers}
            onlineUsers={onlineUsers}
            currentUserId={user?.uid || ''}
            installedBots={customGroupData?.installedBots || []}
            onStartPrivateChat={onStartPrivateChat}
          />
        )}

        {/* Panel contact (discussions privées uniquement) */}
        {groupId?.startsWith('private_') && (
          <ContactPanel
            isOpen={showContactPanel}
            onClose={() => setShowContactPanel(false)}
            displayName={displayName}
            displayAvatar={displayAvatar}
            onlineUsers={onlineUsers}
            otherUserId={otherUserId}
            onStartCall={handleStartCall}
            onViewFullProfile={() => {
              setShowContactPanel(false);
              setShowOtherUserProfile(true);
            }}
          />
        )}
      </div>

      {showCreateGroupModal && <CreateGroupModal user={user} onClose={() => setShowCreateGroupModal(false)} onGroupCreated={() => setShowCreateGroupModal(false)} />}
      {botToInstall && user && (
        <BotInstallModal
          bot={botToInstall}
          user={user}
          groups={isCustomGroup && customGroupData ? [{
            id: customGroupData.id || groupId || '',
            name: customGroupData.name || displayName,
            photoURL: customGroupData.photoURL || '',
            createdBy: customGroupData.createdBy,
            admins: customGroupData.admins || [],
            members: customGroupData.members || [],
            installedBots: customGroupData.installedBots || [],
          } as BotInstallGroup] : []}
          initialGroup={isCustomGroup && customGroupData ? {
            id: customGroupData.id || groupId || '',
            name: customGroupData.name || displayName,
            photoURL: customGroupData.photoURL || '',
            createdBy: customGroupData.createdBy,
            admins: customGroupData.admins || [],
            members: customGroupData.members || [],
            installedBots: customGroupData.installedBots || [],
          } as BotInstallGroup : null}
          onClose={() => setBotToInstall(null)}
          onInstalled={(result) => {
            if (result.target === 'personal' && result.chatId) {
              onOpenBotChat?.(result.chatId, { name: botToInstall.name, avatar: botToInstall.photoURL });
            }
          }}
        />
      )}
    </div>
  );
}
