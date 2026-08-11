import { Timestamp } from 'firebase/firestore';

export interface ForwardedFrom {
  id: string;
  displayName: string;
  photoURL?: string;
  createdAt?: any;
}

export interface ReplyTo {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  audioUrl?: string;
  audioDuration?: number;
  deleted?: boolean;
}

export interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string;
  createdAt: any; // Can be Timestamp or { toDate: () => Date }
  imageUrl?: string;
  imageName?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioName?: string;
  audioMimeType?: string;
  audioWaveform?: number[];
  readBy?: Record<string, string>;
  groupId?: string | null;
  targetUid?: string;
  reactions?: Record<string, string>;
  edited?: boolean;
  isDeleted?: boolean;
  forwardedFrom?: ForwardedFrom;
  replyTo?: ReplyTo;
}

export interface LinkPreviewData {
  type: 'youtube' | 'tiktok' | 'myinstants' | 'generic';
  title: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  image?: string;
  embedUrl?: string;
  url: string;
  audioUrl?: string;
  siteName?: string;
}
