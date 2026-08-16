/**
 * Rider Chat Inbox — all active delivery chats grouped by order ID
 * Real-time unread badges via supabaseChat.ts
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow, createThemedStyles } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import {
  ChatMessage,
  fetchChatMessages,
  subscribeToChatMessages,
} from '@/services/supabaseChat';

interface ChatThread {
  orderId: string;
  restaurantName: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  orderStatus: string;
}

export default function RiderChatInbox() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { orders } = useOrders();

  // Keep track of realtime subscriptions so we can clean them up
  const unsubscribers = useRef<(() => void)[]>([]);

  // Active delivery orders assigned to this rider
  const activeOrders = useMemo(
    () => orders.filter(
      o => o.riderId === user?.id && !['delivered', 'cancelled'].includes(o.status)
    ),
    [orders, user?.id]
  );

  const buildThreads = useCallback(
    async (orderList: typeof activeOrders): Promise<ChatThread[]> => {
      const results: ChatThread[] = [];

      await Promise.all(
        orderList.map(async order => {
          const messages: ChatMessage[] = await fetchChatMessages(order.id).catch(() => []);
          if (messages.length === 0) {
            // Still show the thread so rider can initiate
            results.push({
              orderId: order.id,
              restaurantName: order.restaurantName || 'Restaurant',
              customerName: order.customerName || 'Customer',
              lastMessage: 'No messages yet — say hello!',
              lastMessageAt: order.createdAt || new Date().toISOString(),
              unreadCount: 0,
              orderStatus: order.status,
            });
            return;
          }

          const last = messages[messages.length - 1];
          const unreadCount = messages.filter(
            m => !m.isRead && m.senderId !== user?.id
          ).length;

          results.push({
            orderId: order.id,
            restaurantName: order.restaurantName || 'Restaurant',
            customerName: order.customerName || 'Customer',
            lastMessage: last.text,
            lastMessageAt: last.createdAt,
            unreadCount,
            orderStatus: order.status,
          });
        })
      );

      // Sort: unread first, then by most recent message
      return results.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
    },
    [user?.id]
  );

  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    const built = await buildThreads(activeOrders);
    setThreads(built);
  }, [activeOrders, buildThreads, user?.id]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadThreads().finally(() => setLoading(false));
  }, [loadThreads]);

  // Subscribe to realtime updates for each active order
  useEffect(() => {
    // Clean up any previous subscriptions first
    unsubscribers.current.forEach(fn => fn());
    unsubscribers.current = [];

    activeOrders.forEach(order => {
      const unsub = subscribeToChatMessages(order.id, (msg: ChatMessage) => {
        setThreads(prev =>
          prev.map(t => {
            if (t.orderId !== order.id) return t;
            const isFromOther = msg.senderId !== user?.id;
            return {
              ...t,
              lastMessage: msg.text,
              lastMessageAt: msg.createdAt,
              unreadCount: isFromOther ? t.unreadCount + 1 : t.unreadCount,
            };
          })
        );
      });
      unsubscribers.current.push(unsub);
    });

    return () => {
      unsubscribers.current.forEach(fn => fn());
      unsubscribers.current = [];
    };
  }, [activeOrders, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  }, [loadThreads]);

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  const renderItem = ({ item }: { item: ChatThread }) => (
    <TouchableOpacity
      style={[styles.threadCard, item.unreadCount > 0 && styles.threadCardUnread]}
      onPress={() => router.push(`/chat/${item.orderId}`)}
      activeOpacity={0.82}
    >
      {/* Avatar */}
      <View style={[styles.avatar, item.unreadCount > 0 && styles.avatarUnread]}>
        <MaterialIcons name="person" size={22} color={item.unreadCount > 0 ? Colors.primary : Colors.textMuted} />
        {item.unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.threadContent}>
        <View style={styles.threadTop}>
          <Text style={styles.threadName} numberOfLines={1}>{item.customerName}</Text>
          <Text style={styles.threadTime}>{formatRelativeTime(item.lastMessageAt)}</Text>
        </View>
        <Text style={styles.threadOrder} numberOfLines={1}>
          Order #{item.orderId.slice(-6).toUpperCase()} · {item.restaurantName}
        </Text>
        <Text
          style={[styles.threadPreview, item.unreadCount > 0 && styles.threadPreviewUnread]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>

      {/* Status tag */}
      <View style={[styles.statusTag, { backgroundColor: statusColor(item.orderStatus) + '22' }]}>
        <Text style={[styles.statusText, { color: statusColor(item.orderStatus) }]}>
          {item.orderStatus.charAt(0).toUpperCase() + item.orderStatus.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chat Inbox</Text>
          {totalUnread > 0 ? (
            <Text style={styles.subtitle}>{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</Text>
          ) : (
            <Text style={styles.subtitle}>Active delivery chats</Text>
          )}
        </View>
        {totalUnread > 0 ? (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.centered}>
          <MaterialIcons name="chat-bubble-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No active chats</Text>
          <Text style={styles.emptySubtitle}>
            {activeOrders.length === 0
              ? 'Accept a delivery to start chatting with customers.'
              : 'Your active deliveries have no messages yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.orderId}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case 'accepted': return Colors.info;
    case 'preparing': return Colors.warning;
    case 'ready': return Colors.gold;
    case 'picked_up':
    case 'on_the_way': return Colors.primary;
    default: return Colors.textMuted;
  }
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── styles ───────────────────────────────────────────────────────────────────

const styles = createThemedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  headerBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerBadgeText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
  },
  listContent: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.md,
    marginVertical: 4,
  },
  threadCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUnread: {
    backgroundColor: Colors.primary + '18',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.surfaceCard,
  },
  badgeText: {
    color: Colors.text,
    fontSize: 9,
    fontWeight: FontWeight.extrabold,
  },
  threadContent: {
    flex: 1,
    minWidth: 0,
  },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  threadName: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  threadTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
  threadOrder: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  threadPreview: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  threadPreviewUnread: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  statusTag: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
}));
