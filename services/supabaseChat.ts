/**
 * In-app chat service using Supabase Realtime
 * Supports: customer↔rider, customer↔restaurant (vendor)
 */
import { isSupabaseConfigured, supabase } from './supabase';

export type ChatParticipantRole = 'customer' | 'rider' | 'vendor' | 'admin';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  senderRole: ChatParticipantRole;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface ChatRoom {
  orderId: string;
  restaurantName: string;
  otherPartyName: string;
  otherPartyRole: ChatParticipantRole;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

/** Send a chat message for an order */
export async function sendChatMessage(
  orderId: string,
  senderId: string,
  senderName: string,
  senderRole: ChatParticipantRole,
  text: string
): Promise<ChatMessage | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      order_id: orderId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      text: text.trim(),
      is_read: false,
    })
    .select('*')
    .single();

  if (error) {
    console.warn('[chat] sendChatMessage error:', error.message);
    return null;
  }

  return mapRow(data);
}

/** Fetch messages for an order */
export async function fetchChatMessages(orderId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[chat] fetchChatMessages error:', error.message);
    return [];
  }

  return (data || []).map(mapRow);
}

/** Subscribe to new messages for an order, returns unsubscribe fn */
export function subscribeToChatMessages(
  orderId: string,
  onMessage: (msg: ChatMessage) => void
): () => void {
  if (!isSupabaseConfigured) return () => undefined;

  let disposed = false;
  let poll: ReturnType<typeof setInterval> | null = null;
  const seen = new Set<string>();
  const pollMessages = async () => {
    const messages = await fetchChatMessages(orderId);
    messages.forEach(message => {
      if (seen.has(message.id)) return;
      seen.add(message.id);
      onMessage(message);
    });
  };
  const startPolling = () => {
    if (poll || disposed) return;
    void pollMessages();
    poll = setInterval(() => void pollMessages(), 7000);
  };
  const stopPolling = () => { if (poll) clearInterval(poll); poll = null; };

  const channel = supabase
    .channel(`chat-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `order_id=eq.${orderId}`,
      },
      payload => {
        if (payload.new) {
          const message = mapRow(payload.new as any);
          seen.add(message.id);
          onMessage(message);
        }
      }
    )
    .subscribe(status => {
      if (status === 'SUBSCRIBED') stopPolling();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
    });

  return () => {
    disposed = true;
    stopPolling();
    void supabase.removeChannel(channel);
  };
}

/** Mark messages as read for a participant */
export async function markMessagesRead(orderId: string, userId: string) {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('order_id', orderId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

/** Get unread count across all orders for a user */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const { count, error } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

function mapRow(row: Record<string, any>): ChatMessage {
  return {
    id: row.id,
    orderId: row.order_id,
    senderId: row.sender_id,
    senderName: row.sender_name || 'User',
    senderRole: row.sender_role || 'customer',
    text: row.text || '',
    createdAt: row.created_at || new Date().toISOString(),
    isRead: row.is_read ?? false,
  };
}
