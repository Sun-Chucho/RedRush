/**
 * In-App Chat Screen — customer ↔ rider / customer ↔ vendor
 * Real-time via Supabase Realtime
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Shadow } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import {
  ChatMessage,
  fetchChatMessages,
  markMessagesRead,
  sendChatMessage,
  subscribeToChatMessages,
} from '@/services/supabaseChat';

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { getOrderById } = useOrders();

  const order = getOrderById(orderId || '');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  // Determine chat context label
  const otherParty = (() => {
    if (!user || !order) return 'Support';
    if (user.role === 'customer') {
      if (order.riderId) return order.riderName || 'Rider';
      return order.restaurantName;
    }
    if (user.role === 'rider') return order.restaurantName || 'Customer';
    return 'Customer';
  })();

  // Load messages
  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    fetchChatMessages(orderId).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [orderId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!orderId) return undefined;
    const unsub = subscribeToChatMessages(orderId, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Scroll to bottom
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [orderId]);

  // Mark as read
  useEffect(() => {
    if (orderId && user?.id) {
      markMessagesRead(orderId, user.id).catch(() => undefined);
    }
  }, [orderId, user?.id, messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || !orderId || sending) return;

    setSending(true);
    setText('');

    const msg = await sendChatMessage(
      orderId,
      user.id,
      user.name,
      user.role,
      trimmed
    );

    if (msg) {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSending(false);
  }, [text, user, orderId, sending]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe ? (
          <View style={styles.avatar}>
            <MaterialIcons
              name={
                item.senderRole === 'rider'
                  ? 'delivery-dining'
                  : item.senderRole === 'vendor'
                  ? 'restaurant'
                  : 'person'
              }
              size={16}
              color={Colors.primary}
            />
          </View>
        ) : null}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe ? (
            <Text style={styles.senderName}>{item.senderName}</Text>
          ) : null}
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
            {item.text}
          </Text>
          <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeOther]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <MaterialIcons name="chat" size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerName}>{otherParty}</Text>
            <Text style={styles.headerSub}>
              Order #{orderId?.slice(-6).toUpperCase() || ''}
            </Text>
          </View>
        </View>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Live</Text>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="chat-bubble-outline" size={48} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptySubtitle}>
                Chat directly with {otherParty} about your order.
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom || Spacing.md }]}>
        <TextInput
          style={styles.input}
          placeholder={`Message ${otherParty}...`}
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <MaterialIcons name="send" size={20} color={Colors.text} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  headerSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.body },

  messagesList: { padding: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginBottom: Spacing.sm },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.surfaceCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  senderName: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  msgText: { fontSize: FontSize.body, lineHeight: 22 },
  msgTextMe: { color: Colors.text },
  msgTextOther: { color: Colors.text },
  msgTime: { fontSize: FontSize.xs, marginTop: 4 },
  msgTimeMe: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  msgTimeOther: { color: Colors.textMuted },

  emptyState: { flex: 1, alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.body, textAlign: 'center', paddingHorizontal: Spacing.lg },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    color: Colors.text,
    fontSize: FontSize.body,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
