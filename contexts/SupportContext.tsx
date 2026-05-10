/**
 * SupportContext — Supabase-only support thread management
 * Firebase fallback removed.
 */
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  createSupabaseThread,
  sendSupabaseMessage,
  closeSupabaseThread,
} from '@/services/supabaseSupport';

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
    const threadId = await createSupabaseThread(
      user.id,
      user.name,
      user.role,
      subject,
      firstMessage
    );
    if (!threadId) throw new Error('Unable to create support thread. Please try again.');
    return threadId;
  };

  const sendMessage = async (threadId: string, text: string) => {
    if (!user) throw new Error('Please sign in to send messages.');
    const message = text.trim();
    if (!message) return;
    const sent = await sendSupabaseMessage(threadId, user.id, user.name, user.role, message);
    if (!sent) throw new Error('Unable to send message. Please try again.');
  };

  const closeThread = async (threadId: string) => {
    const closed = await closeSupabaseThread(threadId);
    if (!closed) throw new Error('Unable to close thread. Please try again.');
  };

  const value = useMemo(
    () => ({ createThread, sendMessage, closeThread }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, user?.role]
  );

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (!context) throw new Error('useSupport must be used within SupportProvider');
  return context;
}
