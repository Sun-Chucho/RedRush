import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';

export interface SupportThread {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  subject: string;
  status: 'open' | 'closed';
  lastMessage: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt?: unknown;
}

interface SupportContextType {
  createThread: (subject: string, firstMessage: string) => Promise<string>;
  sendMessage: (threadId: string, text: string) => Promise<void>;
  closeThread: (threadId: string) => Promise<void>;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const createThread = async (subject: string, firstMessage: string) => {
    if (!user) throw new Error('Please sign in to contact support.');

    const threadRef = await addDoc(collection(db, 'supportThreads'), {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      subject: subject.trim() || 'Support request',
      status: 'open',
      lastMessage: firstMessage.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'supportThreads', threadRef.id, 'messages'), {
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: firstMessage.trim(),
      createdAt: serverTimestamp(),
    });

    return threadRef.id;
  };

  const sendMessage = async (threadId: string, text: string) => {
    if (!user) throw new Error('Please sign in to contact support.');

    const message = text.trim();
    if (!message) return;

    await addDoc(collection(db, 'supportThreads', threadId, 'messages'), {
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: message,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'supportThreads', threadId),
      {
        lastMessage: message,
        status: 'open',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const closeThread = async (threadId: string) => {
    await updateDoc(doc(db, 'supportThreads', threadId), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  };

  const value = useMemo(() => ({ createThread, sendMessage, closeThread }), [user?.id, user?.role]);

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const context = useContext(SupportContext);

  if (!context) {
    throw new Error('useSupport must be used within SupportProvider');
  }

  return context;
}
