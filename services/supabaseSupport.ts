import { supabase } from './supabase';
import type { SupportThread, SupportMessage } from '@/contexts/SupportContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function shouldUseSupabaseSupport(): boolean {
  return !!supabase;
}

function mapThread(row: Record<string, unknown>): SupportThread {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name || 'User'),
    userRole: String(row.user_role || 'customer'),
    subject: String(row.subject || 'Support request'),
    status: (row.status as 'open' | 'closed') || 'open',
    lastMessage: String(row.last_message || ''),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: Record<string, unknown>): SupportMessage {
  return {
    id: String(row.id),
    senderId: String(row.sender_id),
    senderName: String(row.sender_name || 'User'),
    senderRole: String(row.sender_role || 'customer'),
    text: String(row.text || ''),
    createdAt: row.created_at,
  };
}

// ── Create thread ────────────────────────────────────────────────────────────

export async function createSupabaseThread(
  userId: string,
  userName: string,
  userRole: string,
  subject: string,
  firstMessage: string
): Promise<string | null> {
  if (!shouldUseSupabaseSupport()) return null;

  const { data: thread, error: threadError } = await supabase!
    .from('support_threads')
    .insert({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      subject: subject.trim() || 'Support request',
      status: 'open',
      last_message: firstMessage.trim(),
    })
    .select('id')
    .single();

  if (threadError || !thread) return null;

  const { error: messageError } = await supabase!
    .from('support_messages')
    .insert({
      thread_id: thread.id,
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      text: firstMessage.trim(),
    });

  if (messageError) return null;

  return thread.id;
}

// ── Send message ─────────────────────────────────────────────────────────────

export async function sendSupabaseMessage(
  threadId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  text: string
): Promise<boolean> {
  if (!shouldUseSupabaseSupport()) return false;

  const message = text.trim();
  if (!message) return false;

  const { error: messageError } = await supabase!
    .from('support_messages')
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      text: message,
    });

  if (messageError) return false;

  await supabase!
    .from('support_threads')
    .update({ last_message: message, status: 'open' })
    .eq('id', threadId);

  return true;
}

// ── Close thread ─────────────────────────────────────────────────────────────

export async function closeSupabaseThread(threadId: string): Promise<boolean> {
  if (!shouldUseSupabaseSupport()) return false;

  const { error } = await supabase!
    .from('support_threads')
    .update({ status: 'closed' })
    .eq('id', threadId);

  return !error;
}

// ── Fetch threads ────────────────────────────────────────────────────────────

export async function fetchSupabaseThreadsForUser(userId: string): Promise<SupportThread[] | null> {
  if (!shouldUseSupabaseSupport()) return null;

  const { data, error } = await supabase!
    .from('support_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error || !data) return null;
  return data.map(mapThread);
}

// ── Fetch all threads (admin) ────────────────────────────────────────────────

export async function fetchSupabaseAllThreads(): Promise<SupportThread[] | null> {
  if (!shouldUseSupabaseSupport()) return null;

  const { data, error } = await supabase!
    .from('support_threads')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error || !data) return null;
  return data.map(mapThread);
}

// ── Fetch messages ───────────────────────────────────────────────────────────

export async function fetchSupabaseMessages(threadId: string): Promise<SupportMessage[] | null> {
  if (!shouldUseSupabaseSupport()) return null;

  const { data, error } = await supabase!
    .from('support_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error || !data) return null;
  return data.map(mapMessage);
}

// ── Realtime subscriptions ───────────────────────────────────────────────────

export function subscribeToSupabaseThreads(
  userId: string,
  onUpdate: (threads: SupportThread[]) => void
) {
  if (!shouldUseSupabaseSupport()) return null;

  let poll: ReturnType<typeof setInterval> | null = null;
  const refresh = () => fetchSupabaseThreadsForUser(userId).then(threads => {
    if (threads) onUpdate(threads);
  });
  const startPolling = () => { if (!poll) poll = setInterval(refresh, 10000); };
  const stopPolling = () => { if (poll) clearInterval(poll); poll = null; };

  // Initial fetch
  fetchSupabaseThreadsForUser(userId).then(threads => {
    if (threads) onUpdate(threads);
  });

  // Realtime subscription
  const channel = supabase!
    .channel(`support-threads-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_threads',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        fetchSupabaseThreadsForUser(userId).then(threads => {
          if (threads) onUpdate(threads);
        });
      }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') stopPolling();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
    });

  return () => {
    stopPolling();
    supabase!.removeChannel(channel);
  };
}

export function subscribeToSupabaseAdminThreads(
  onUpdate: (threads: SupportThread[]) => void
) {
  if (!shouldUseSupabaseSupport()) return null;

  let poll: ReturnType<typeof setInterval> | null = null;
  const refresh = () => fetchSupabaseAllThreads().then(threads => {
    if (threads) onUpdate(threads);
  });
  const startPolling = () => { if (!poll) poll = setInterval(refresh, 10000); };
  const stopPolling = () => { if (poll) clearInterval(poll); poll = null; };

  refresh();

  const channel = supabase!
    .channel('support-threads-admin')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_threads' },
      () => {
        fetchSupabaseAllThreads().then(threads => {
          if (threads) onUpdate(threads);
        });
      }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') stopPolling();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
    });

  return () => {
    stopPolling();
    supabase!.removeChannel(channel);
  };
}

export function subscribeToSupabaseMessages(
  threadId: string,
  onUpdate: (messages: SupportMessage[]) => void
) {
  if (!shouldUseSupabaseSupport()) return null;

  let poll: ReturnType<typeof setInterval> | null = null;
  const refresh = () => fetchSupabaseMessages(threadId).then(messages => {
    if (messages) onUpdate(messages);
  });
  const startPolling = () => { if (!poll) poll = setInterval(refresh, 7000); };
  const stopPolling = () => { if (poll) clearInterval(poll); poll = null; };

  refresh();

  const channel = supabase!
    .channel(`support-messages-${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      () => {
        fetchSupabaseMessages(threadId).then(messages => {
          if (messages) onUpdate(messages);
        });
      }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') stopPolling();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
    });

  return () => {
    stopPolling();
    supabase!.removeChannel(channel);
  };
}
