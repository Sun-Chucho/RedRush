import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { db } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { SupportMessage, SupportThread, useSupport } from '@/contexts/SupportContext';
import { useAlert } from '@/template';

export default function SupportChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { createThread, sendMessage } = useSupport();
  const { showAlert } = useAlert();
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState(orderId ? `I need help with order #${orderId}.` : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return undefined;

    const unsubscribe = onSnapshot(
      query(collection(db, 'supportThreads'), where('userId', '==', user.id)),
      snapshot => {
        const threads = snapshot.docs.map(threadDoc => ({ id: threadDoc.id, ...threadDoc.data() } as SupportThread));
        const openThread = threads.find(item => item.status === 'open') || threads[0] || null;
        setThread(openThread);
      },
      () => undefined
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!thread) {
      setMessages([]);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'supportThreads', thread.id, 'messages'),
      snapshot => {
        const nextMessages = snapshot.docs
          .map(messageDoc => ({ id: messageDoc.id, ...messageDoc.data() } as SupportMessage))
          .sort((a, b) => dateValue(a.createdAt) - dateValue(b.createdAt));
        setMessages(nextMessages);
      },
      () => undefined
    );

    return unsubscribe;
  }, [thread]);

  const submit = async () => {
    if (!draft.trim()) return;

    setLoading(true);
    try {
      if (thread) {
        await sendMessage(thread.id, draft);
      } else {
        await createThread(orderId ? `Order #${orderId}` : 'Support request', draft);
      }
      setDraft('');
    } catch (error) {
      showAlert('Support', error instanceof Error ? error.message : 'Unable to send your message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Support Chat</Text>
          <Text style={styles.subtitle}>{thread ? `${thread.status} - ${thread.subject}` : 'Start a conversation with admin'}</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="support-agent" size={48} color={Colors.primary} />
            <Text style={styles.emptyTitle}>How can we help?</Text>
            <Text style={styles.emptyText}>Send a message here. Admin users will see it in their support inbox.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.sender}>{mine ? 'You' : `${item.senderName} (${item.senderRole})`}</Text>
              <Text style={styles.messageText}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type your message..."
          placeholderTextColor={Colors.textMuted}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          <MaterialIcons name="send" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function dateValue(value: unknown) {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  return 0;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerText: { flex: 1 },
  title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  messages: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: Spacing.md },
  emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, textAlign: 'center', marginTop: Spacing.xs },
  bubble: { maxWidth: '82%', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.md },
  mine: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  sender: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
  messageText: { color: Colors.text, fontSize: FontSize.body, lineHeight: 20 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input: { flex: 1, maxHeight: 110, minHeight: 44, color: Colors.text, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
