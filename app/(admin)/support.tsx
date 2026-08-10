import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '@/constants/theme';
import { SupportMessage, SupportThread, useSupport } from '@/contexts/SupportContext';
import { useAlert } from '@/template';
import {
  subscribeToSupabaseAdminThreads,
  subscribeToSupabaseMessages,
} from '@/services/supabaseSupport';

export default function AdminSupportScreen() {
  const insets = useSafeAreaInsets();
  const { sendMessage, closeThread } = useSupport();
  const { showAlert } = useAlert();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const unsub = subscribeToSupabaseAdminThreads(nextThreads => {
      setThreads(nextThreads);
      setSelectedThreadId(prev => prev || nextThreads[0]?.id || null);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    if (!selectedThreadId) { setMessages([]); return; }
    const unsub = subscribeToSupabaseMessages(selectedThreadId, nextMessages => {
      setMessages(nextMessages);
    });
    return () => { if (unsub) unsub(); };
  }, [selectedThreadId]);

  const selectedThread = threads.find(thread => thread.id === selectedThreadId) || null;

  const reply = async () => {
    if (!selectedThreadId || !draft.trim()) return;

    try {
      await sendMessage(selectedThreadId, draft);
      setDraft('');
    } catch (error) {
      showAlert('Support', error instanceof Error ? error.message : 'Unable to send reply.');
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Support Inbox</Text>

      <View style={styles.layout}>
        <View style={styles.threadPane}>
          <FlatList
            data={threads}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View style={styles.emptyThreads}>
                <MaterialIcons name="inbox" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No support chats yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.threadCard, selectedThreadId === item.id && styles.threadCardActive]}
                onPress={() => setSelectedThreadId(item.id)}
              >
                <View style={styles.threadTop}>
                  <Text style={styles.threadUser}>{item.userName}</Text>
                  <View style={[styles.status, item.status === 'open' ? styles.open : styles.closed]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.threadSubject}>{item.subject}</Text>
                <Text style={styles.threadLast} numberOfLines={2}>{item.lastMessage}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.chatPane}>
          {selectedThread ? (
            <>
              <View style={styles.chatHeader}>
                <View>
                  <Text style={styles.chatTitle}>{selectedThread.subject}</Text>
                  <Text style={styles.chatSub}>{selectedThread.userName} - {selectedThread.userRole}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => closeThread(selectedThread.id)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messages}
                renderItem={({ item }) => {
                  const admin = item.senderRole === 'admin';
                  return (
                    <View style={[styles.bubble, admin ? styles.adminBubble : styles.userBubble]}>
                      <Text style={styles.sender}>{item.senderName}</Text>
                      <Text style={styles.messageText}>{item.text}</Text>
                    </View>
                  );
                }}
              />
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Reply to user..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={reply}>
                  <MaterialIcons name="send" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyChat}>
              <MaterialIcons name="support-agent" size={48} color={Colors.primary} />
              <Text style={styles.emptyText}>Select a chat to reply</Text>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  layout: { flex: 1, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  threadPane: { maxHeight: 220 },
  threadCard: { backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.md },
  threadCardActive: { borderColor: Colors.primary },
  threadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  threadUser: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  status: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  open: { backgroundColor: Colors.success + '22' },
  closed: { backgroundColor: Colors.textMuted + '22' },
  statusText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  threadSubject: { color: Colors.primary, fontSize: FontSize.sm, marginTop: 2 },
  threadLast: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  chatPane: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chatTitle: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.bold },
  chatSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  closeBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  messages: { padding: Spacing.md, gap: Spacing.sm },
  bubble: { maxWidth: '84%', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  adminBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  userBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  sender: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
  messageText: { color: Colors.text, fontSize: FontSize.body, lineHeight: 20 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, maxHeight: 100, minHeight: 44, color: Colors.text, backgroundColor: Colors.surfaceCard, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyThreads: { alignItems: 'center', padding: Spacing.xl },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.body, marginTop: Spacing.sm, textAlign: 'center' },
});
