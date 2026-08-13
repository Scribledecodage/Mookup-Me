'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Robot,
  Brain,
  CircleDashed,
  UserCircle,
  ChatCircle,
  PhoneCall,
  MagnifyingGlass,
  Gear,
  UsersThree,
  SquaresFour,
  House,
  UserFocus,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { auth, db } from '@/lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, onSnapshot, orderBy, limit, getDoc, where, updateDoc, arrayUnion, arrayRemove, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import UserAvatar from './ui/UserAvatar';
import { StatusRing } from './status/StatusView';
import DiscussionList from './sidebar/DiscussionList';
import SearchView from './sidebar/SearchView';
import PlaceholderView from './sidebar/PlaceholderView';
import ProfileView from './sidebar/ProfileView';
import CallsView from './sidebar/CallsView';
import BotView, { type BotSection } from './sidebar/BotView';
import BotPage from './bots/BotPage';
import type { ProfileSection } from './sidebar/ProfileView';
import CreateGroupModal from './sidebar/CreateGroupModal';
import StatusView from './status/StatusView';

interface HomeViewProps {
  user?: any;
  activeTab?: string;
  onSelectGroup: (groupId: string | null, data?: { name: string, avatar?: string }) => void;
  onTabChange?: (tabId: string) => void;
  botSection?: BotSection;
  onBotSectionChange?: (section: BotSection) => void;
  onProfileSectionChange?: (section: ProfileSection) => void;
  selectedGroupId?: string | null;
  /** Incrémenté lorsqu'une notification native ouvre explicitement une conversation. */
  openConversationToken?: number;
  /** Appelé sur mobile quand on veut ouvrir la colonne de contenu (bots/profil) */
  onMobileOpenContent?: (tab: 'bots' | 'profil', section?: string) => void;
}

function createUnreadBadgeImage(count: number): string {
  const label = count > 9 ? '9+' : String(count);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const context = canvas.getContext('2d');
  if (!context) return '';

  context.clearRect(0, 0, 64, 64);
  context.beginPath();
  context.arc(32, 32, 30, 0, Math.PI * 2);
  context.fillStyle = '#ef4444';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = '#ffffff';
  context.stroke();
  context.fillStyle = '#ffffff';
  context.font = `700 ${label.length > 1 ? 25 : 34}px "Segoe UI", Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 32, 33);

  return canvas.toDataURL('image/png');
}

export default function HomeView({ user, activeTab: controlledActiveTab, onSelectGroup, onTabChange, botSection: controlledBotSection, onBotSectionChange, onProfileSectionChange, selectedGroupId, openConversationToken, onMobileOpenContent }: HomeViewProps) {
  const [localActiveTab, setLocalActiveTab] = useState(controlledActiveTab || 'discussion');
  const activeTab = controlledActiveTab ?? localActiveTab;
  const [localBotSection, setLocalBotSection] = useState<BotSection>('accueil');
  const botSection = controlledBotSection ?? localBotSection;
  const [profileSection, setProfileSection] = useState<ProfileSection>('infos');
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>({});
  const unreadCountsRef = useRef<{ [key: string]: number }>({});
  const unreadCountsReadyRef = useRef(false);
  const [lastMessageTimes, setLastMessageTimes] = useState<{ [key: string]: string }>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [privateChats, setPrivateChats] = useState<any[]>([]);
  const [privateChatsLoaded, setPrivateChatsLoaded] = useState(false);
  const [customGroups, setCustomGroups] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const electronWindowFocusedRef = useRef(true);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.isElectron) return;

    let active = true;
    const focusPromise = api.isWindowFocused?.();
    if (focusPromise) {
      void focusPromise.then(focused => {
        if (active) electronWindowFocusedRef.current = focused;
      }).catch(() => {});
    }
    const handleWindowFocus = () => {
      electronWindowFocusedRef.current = true;
    };
    const handleWindowBlur = () => {
      electronWindowFocusedRef.current = false;
    };
    const removeFocusListener = api.onWindowFocusChanged?.(focused => {
      electronWindowFocusedRef.current = focused;
    });
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      active = false;
      removeFocusListener?.();
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Auto-réparation du profil utilisateur si supprimé de Firestore
  useEffect(() => {
    if (!user) return;

    const repairUserDoc = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("Profil Firestore manquant détecté, recréation automatique...");
        const defaultName = user.displayName || user.email?.split('@')[0] || 'Utilisateur';
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: defaultName,
          nickname: defaultName,
          photoURL: user.photoURL || '',
          createdAt: new Date(),
          lastLogin: new Date()
        }, { merge: true });
      } else {
        // Si le document existe mais qu'il manque des champs essentiels (email ou pseudo)
        const data = userSnap.data();
        if (!data.email || !data.nickname) {
          console.log("Profil incomplet détecté, mise à jour des champs manquants...");
          await setDoc(userRef, {
            email: user.email,
            nickname: data.nickname || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
            displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
            updatedAt: new Date()
          }, { merge: true });
        }
      }
    };

    repairUserDoc();
  }, [user]);

  // Écouter les utilisateurs réels (Méthode officielle Firestore onSnapshot)
  useEffect(() => {
    if (!user) return;

    // La méthode officielle recommandée par Firebase pour lister les utilisateurs côté client
    // est de maintenir une collection Firestore 'users' et d'y placer un écouteur en temps réel.
    const q = query(
      collection(db, 'users'),
      orderBy('nickname'), // Tri par pseudo pour un affichage propre
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // snapshot.docs contient uniquement les documents ACTUELLEMENT présents dans la collection
      // Si un document est supprimé de Firestore, il disparaît instantanément du snapshot.
      const usersList = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((u: any) => {
              if (u.id === user.uid) return false; // On ne s'affiche pas soi-même
              if (!u.email) return false; // On ne garde que les comptes inscrits avec un email
              
              return true;
            });
      
      setAllUsers(usersList);
      setUsersLoaded(true);
    }, (error) => {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      setUsersLoaded(true);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Écouter les conversations privées
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'private_chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) })) as any[];
      // Filtrer les chats qui ont été supprimés par cet utilisateur
      const activeChats = chats.filter(chat => !chat.deletedBy?.includes(user.uid));
      
      // Trier côté client au lieu de Firebase pour éviter le besoin d'un index composite
      activeChats.sort((a, b) => {
        const dateA = (a.updatedAt || a.createdAt)?.toDate?.()?.getTime() || 0;
        const dateB = (b.updatedAt || b.createdAt)?.toDate?.()?.getTime() || 0;
        return dateB - dateA; // Ordre décroissant
      });
      
      setPrivateChats(activeChats);
      setPrivateChatsLoaded(true);
    }, (error) => {
      console.error("Erreur lors de la récupération des conversations privées:", error);
      setPrivateChatsLoaded(true);
    });

    return () => unsubscribe();
  }, [user]);

  // Écouter les groupes personnalisés
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) })) as any[];
      // Filter out deleted groups if needed (e.g. deleted by me)
      const activeGroups = groups.filter(g => !g.deletedBy?.includes(user.uid));
      
      activeGroups.sort((a, b) => {
        const dateA = (a.updatedAt || a.createdAt)?.toDate?.()?.getTime() || 0;
        const dateB = (b.updatedAt || b.createdAt)?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      
      setCustomGroups(activeGroups);
    }, (error) => {
      console.error("Erreur lors de la récupération des groupes personnalisés:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Transmettre les deux dernières discussions à la Jump List Electron Windows.
  useEffect(() => {
    if (!user || !usersLoaded || !privateChatsLoaded) return;

    const recentContacts = privateChats.slice(0, 2).map(chat => {
      const isBot = Boolean(chat.isBotChat || chat.botId);
      const otherUserId = isBot
        ? `bot-${chat.botId || chat.id}`
        : (chat.participants || []).find((id: string) => id !== user?.uid) || '';
      const otherUser = allUsers.find(candidate => candidate.id === otherUserId || candidate.uid === otherUserId);
      return {
        chatId: chat.id,
        uid: otherUserId,
        displayName: isBot ? chat.botName || 'Bot' : otherUser?.displayName || otherUser?.nickname || 'Anonyme',
        photoURL: isBot ? chat.botPhotoURL || null : otherUser?.photoURL || null,
        isBot,
      };
    });

    window.electronAPI?.setRecentContacts?.(recentContacts);
  }, [privateChats, allUsers, usersLoaded, privateChatsLoaded, user?.uid]);

  // Utiliser une ref pour selectedGroupId pour éviter de re-souscrire
  const selectedGroupIdRef = useRef(selectedGroupId);
  const messagesSnapshotRef = useRef<any[]>([]);
  const readAtByGroupRef = useRef<Record<string, number>>({});

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;

    // Mémoriser la lecture par conversation pour ne pas faire réapparaître d'anciens messages.
    if (selectedGroupId) {
      const readAt = Date.now();
      readAtByGroupRef.current[selectedGroupId] = readAt;
      window.localStorage.setItem(`mookup_read_at_${selectedGroupId}`, String(readAt));

      // Mise à jour optimiste uniquement après un clic explicite sur la conversation.
      const nextCounts = {
        ...unreadCountsRef.current,
        [selectedGroupId]: 0,
      };
      unreadCountsRef.current = nextCounts;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCounts(nextCounts);

      // Le processus principal ne reçoit jamais un effacement implicite à 0.
      // Seule cette action utilisateur peut supprimer l'overlay officiel Windows.
      if (unreadCountsReadyRef.current) {
        const remainingUnread = Object.values(nextCounts).reduce(
          (total, count) => total + Math.max(0, count || 0),
          0,
        );
        if (remainingUnread > 0) {
          window.electronAPI?.setUnreadCount?.(remainingUnread, createUnreadBadgeImage(remainingUnread));
        } else {
          window.electronAPI?.clearUnreadCount?.();
        }
      }
    }
    
    // Dès qu'on sélectionne un groupe, on marque comme lus tous les messages non lus de ce groupe
    if (selectedGroupId && user && document.visibilityState === 'visible' && (window.electronAPI?.isElectron ? electronWindowFocusedRef.current : document.hasFocus())) {
      messagesSnapshotRef.current.forEach(docSnap => {
        const msg = docSnap.data();
        const gid = msg.groupId || 'general';
        const isUnread = msg.uid !== user.uid && (!msg.readBy || !msg.readBy[user.uid]);
        
        if (isUnread && gid === selectedGroupId) {
          const msgRef = doc(db, 'messages', docSnap.id);
          updateDoc(msgRef, {
            [`readBy.${user.uid}`]: user.displayName || 'Anonyme'
          }).catch(err => console.warn("Erreur marquage lecture au focus:", err));
        }
      });
    }
  }, [selectedGroupId, user, openConversationToken]);

  // Écouter les messages non lus et l'heure du dernier message
  useEffect(() => {
    if (!user) return;

    // Le badge d’activité n’a besoin que des messages récents.
    // Limiter ce listener réduit les lectures sans toucher aux messages de la conversation ouverte.
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      messagesSnapshotRef.current = snapshot.docs;
      const counts: { [key: string]: number } = { snapchat: 0, general: 0 };
      const times: { [key: string]: string } = {};
      
      snapshot.docs.forEach(docSnap => {
        const msg = docSnap.data();
        const gid = msg.groupId || 'general';
        
        // Un message est non lu s'il est nouveau depuis la dernière lecture.
        const messageTime = msg.createdAt?.toDate?.()?.getTime?.() || 0;
        const storedReadAt = readAtByGroupRef.current[gid]
          ?? Number(window.localStorage.getItem(`mookup_read_at_${gid}`) || 0);
        const isUnread = msg.uid !== user.uid
          && (!msg.readBy || !msg.readBy[user.uid])
          && (!storedReadAt || messageTime > storedReadAt);
        
        if (isUnread) {
          // Le composant Chat vérifie le focus natif avant de marquer un message lu.
          // Ici, on compte toujours le message pour éviter tout effacement prématuré du badge.
          if (gid === 'snapchat') {
            const isTeamNotification = msg.displayName === 'Team Mookup'
              || msg.displayName === 'Team Mookup-Main'
              || (msg.displayName === 'My IA' && (msg as any).targetUid === user.uid);
            if (isTeamNotification) {
              counts.snapchat++;
              if (!times[gid] && msg.createdAt) {
                const date = msg.createdAt.toDate();
                times[gid] = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            }
          } else {
            // Pour les autres groupes (dont general)
            counts[gid] = (counts[gid] || 0) + 1;
            if (!times[gid] && msg.createdAt) {
              const date = msg.createdAt.toDate();
              times[gid] = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }
        }
      });
      
      unreadCountsRef.current = counts;
      unreadCountsReadyRef.current = true;
      setUnreadCounts(counts);
      setLastMessageTimes(times);
    });

    return () => unsubscribe();
  }, [user]);

  // Synchroniser le total avec l’overlay natif de l’icône Electron.
  useEffect(() => {
    if (!user || !window.electronAPI?.setUnreadCount) return;

    const totalUnread = Object.values(unreadCounts).reduce((total, count) => total + Math.max(0, count || 0), 0);
    // Les compteurs positifs mettent à jour l'overlay officiel. Un zéro peut
    // être transitoire et ne doit jamais l'effacer automatiquement.
    if (totalUnread > 0) {
      window.electronAPI.setUnreadCount(totalUnread, createUnreadBadgeImage(totalUnread));
    }
  }, [unreadCounts, user]);

  const handleStartPrivateChat = async (otherUser: any) => {
    if (!user) return;
    const uid1 = user.uid;
    const uid2 = otherUser.id || otherUser.uid;
    if (uid1 === uid2) return;
    
    let finalPhotoURL = otherUser.photoURL || '';
    let finalName = otherUser.displayName || otherUser.nickname || 'Anonyme';
    const chatId = `private_${[uid1, uid2].sort().join('_')}`;
    const directMessagePermission = otherUser.messagingPermissions?.directMessages || 'everyone';
    const existingChat = privateChats.some((chat) => chat.id === chatId);

    if (directMessagePermission === 'nobody' && !existingChat) {
      alert(`${finalName} n’accepte pas les nouveaux messages privés.`);
      return;
    }
    if (directMessagePermission === 'contacts' && !existingChat) {
      alert(`${finalName} accepte uniquement les messages de ses contacts.`);
      return;
    }

    // Switch to this chat and pass the other user's info immediately (Optimistic UI)
    onSelectGroup(chatId, {
      name: finalName,
      avatar: finalPhotoURL
    });
    // Basculer sur l'onglet discussion
    setLocalActiveTab('discussion');
    if (onTabChange) onTabChange('discussion');

    if (!finalPhotoURL) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid2));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.photoURL) finalPhotoURL = data.photoURL;
          if (data.displayName || data.nickname) finalName = data.displayName || data.nickname;
          
          onSelectGroup(chatId, {
            name: finalName,
            avatar: finalPhotoURL
          });
        }
      } catch (err) {
        console.error("Erreur lors de la récupération du profil:", err);
      }
    }
    
    // Créer la conversation dans Firestore en arrière-plan
    try {
      const chatRef = doc(db, 'private_chats', chatId);
      await setDoc(chatRef, {
        participants: [uid1, uid2],
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      await updateDoc(chatRef, {
        deletedBy: arrayRemove(user.uid)
      }).catch(() => {});
    } catch (e) {
      console.error("Erreur lors de la création de la conversation:", e);
    }
  };

  const handleDeletePrivateChat = async (chatId: string) => {
    if (!user || !window.confirm("Voulez-vous vraiment supprimer cette conversation ?")) return;
    try {
      // 1. Mettre à jour le chat privé pour l'UI instantanément
      const chatRef = doc(db, 'private_chats', chatId);
      await updateDoc(chatRef, {
        deletedBy: arrayUnion(user.uid),
        [`clearedAt.${user.uid}`]: serverTimestamp()
      });

      if (selectedGroupId === chatId) {
        onSelectGroup(null);
      }

      // 2. Supprimer DÉFINITIVEMENT les messages de cette conversation de la base de données
      const q = query(collection(db, 'messages'), where('groupId', '==', chatId));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(document.ref);
      });
      
      await batch.commit();

    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const navItems: { id: string; icon: PhosphorIcon; label: string }[] = [
    { id: 'discussion', icon: House, label: 'Accueil' },
    { id: 'commu', icon: UserFocus, label: 'Recherche' },
    { id: 'actus', icon: CircleDashed, label: 'Statut' },
    { id: 'appels', icon: PhoneCall, label: 'Appels' },
    { id: 'bots', icon: SquaresFour, label: 'Bots' },
    { id: 'profil', icon: UserCircle, label: 'Profil' },
  ];

  useEffect(() => {
    const handleAppNavigate = (e: any) => {
      if (e.detail?.tabId) {
        handleTabClick(e.detail.tabId);
      }
    };
    window.addEventListener('app_navigate', handleAppNavigate);
    return () => window.removeEventListener('app_navigate', handleAppNavigate);
  }, []);

  useEffect(() => {
    const handleCreateGroup = () => setShowCreateGroup(true);
    window.addEventListener('welcome_create_group', handleCreateGroup);
    return () => window.removeEventListener('welcome_create_group', handleCreateGroup);
  }, []);

  const handleTabClick = (id: string) => {
    setLocalActiveTab(id);
    if (onTabChange) onTabChange(id);
    if (id === 'bots' && onBotSectionChange) onBotSectionChange(botSection);
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar Vertical Icons (Desktop only) */}
      <nav className="sidebar-rail hidden md:flex flex-col items-center py-4 w-[64px] bg-white gap-4 border-r border-gray-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.id === 'profil') {
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className="relative flex items-center justify-center transition-all"
                style={{ width: 44, height: 44 }}
                title={item.label}
              >
                {isActive && (
                  <StatusRing count={1} size={44} color="#3b82f6" strokeWidth={2} />
                )}
                <UserAvatar
                  uid={user?.uid || ''}
                  photoURL={user?.photoURL}
                  displayName={user?.displayName}
                  size={33}
                />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`sidebar-rail-item p-2.5 rounded-full transition-all relative group flex items-center justify-center ${
                isActive ? 'sidebar-rail-item-active text-blue-500 bg-blue-50/80' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={item.label}
            >
              <Icon size={24} />
            </button>
          );
        })}
      </nav>

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3 h-[60px] bg-white flex-shrink-0">
          <h1 className="text-xl font-normal text-black truncate dm-sans">
            {navItems.find(i => i.id === activeTab)?.label}
          </h1>
          <div className="flex items-center gap-3 text-gray-600 flex-shrink-0 relative">
            <button 
              onClick={() => handleTabClick('profil')}
              className="p-1 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center text-gray-600"
              title="Paramètres"
            >
              <Gear size={22} />
            </button>
            <button 
              onClick={() => setShowCreateGroup(true)}
              className="p-1 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center text-gray-600"
              title="Créer un groupe"
            >
              <UsersThree size={22} />
            </button>
            
          </div>
        </header>

        {/* Content Area */}
        <div className="sidebar-content flex-1 relative overflow-hidden bg-white border-r border-gray-200">
          {activeTab === 'discussion' && (
            <DiscussionList 
              user={user}
              selectedGroupId={selectedGroupId || null}
              onSelectGroup={onSelectGroup}
              unreadCounts={unreadCounts}
              lastMessageTimes={lastMessageTimes}
              privateChats={privateChats}
              customGroups={customGroups}
              allUsers={allUsers}
              onDeletePrivateChat={handleDeletePrivateChat}
            />
          )}
          {activeTab === 'commu' && <SearchView users={allUsers} onStartPrivateChat={handleStartPrivateChat} />}
          {activeTab === 'actus' && <StatusView user={user} />}
          {activeTab === 'appels' && <CallsView user={user} allUsers={allUsers} />}
          {activeTab === 'bots' && (
            <BotView
              activeSection={botSection}
              onSelectSection={(s) => {
                setLocalBotSection(s);
                if (onBotSectionChange) onBotSectionChange(s);
              }}
              onMobileNavigate={(s) => {
                setLocalBotSection(s);
                if (onBotSectionChange) onBotSectionChange(s);
                onMobileOpenContent?.('bots', s);
              }}
              hideActiveStyle={false}
            />
          )}
          {activeTab === 'profil' && (
            <ProfileView
              user={user}
              activeSection={profileSection}
              onSelectSection={(s) => {
                setProfileSection(s);
                if (onProfileSectionChange) onProfileSectionChange(s);
              }}
              onMobileNavigate={(s) => {
                setProfileSection(s);
                if (onProfileSectionChange) onProfileSectionChange(s);
                onMobileOpenContent?.('profil', s);
              }}
              hideActiveStyle={false}
            />
          )}
        </div>

        {/* Bottom Nav (Mobile only) */}
        <nav className="sidebar-mobile-nav md:hidden flex justify-around items-center p-1 border-t border-gray-100 bg-white relative h-[64px] overflow-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`sidebar-mobile-nav-item flex min-w-0 flex-col items-center justify-center flex-1 h-full relative ${
                  isActive ? 'sidebar-mobile-nav-item-active text-blue-500' : 'text-gray-400'
                }`}
              >
                <div className="flex h-full flex-col items-center justify-center w-full">
                  <div className={`sidebar-mobile-nav-icon transition-all duration-200 flex items-center justify-center ${isActive ? 'bg-blue-50 px-3 rounded-full' : 'px-2'}`}>
                    {item.id === 'profil' ? (
                      <div className="relative flex items-center justify-center" style={{ width: 34, height: 34 }}>
                        {isActive && (
                          <StatusRing count={1} size={34} color="#3b82f6" strokeWidth={2} />
                        )}
                        <UserAvatar
                          uid={user?.uid || ''}
                          photoURL={user?.photoURL}
                          displayName={user?.displayName}
                          size={22}
                        />
                      </div>
                    ) : (
                      <Icon size={24} />
                    )}
                  </div>
                  <span className={`whitespace-nowrap leading-tight text-[11px] mt-0.5 transition-all duration-200 ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal 
          user={user}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(groupId, data) => {
            onSelectGroup(groupId, data);
            setLocalActiveTab('discussion');
          }}
        />
      )}
    </div>
  );
}
