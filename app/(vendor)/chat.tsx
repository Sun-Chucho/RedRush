/**
 * Vendor Chat Inbox — all active order chats grouped by customer
 * Real-time unread badges via Supabase
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, createThemedStyles, createThemedValues } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { getUnreadCount } from '@/services/supabaseChat';

interface ChatThread {
  orderId: string;
  customerName: string;
  restaurantName: string;
  orderStatus: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

const STATUS_COLOR: Record<string, string> = createThemedValues(() => ({
  pending: Colors.warning,
  accepted: Colors.info,
  preparing: Colors.warning,
  ready: Colors.success,
  picked_up: Colors.primary,
  delivered: Colors.success,
  cancelled: Colors.error,
}));

export default function VendorChatInbox() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { orders } = useOrders();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Build threads from active orders
  const buildThreads = useCallback(() => {
    const activeOrders = orders.filter(
      o => !['delivered', 'cancelled'].includes(o.status)
    );
    const built: ChatThread[] = activeOrders.map(o => ({
      orderId: o.id,
      customerName: o.customerName || 'Customer',
      restaurantName: o.restaurantName,
      orderStatus: o.status,
      lastMessage: `Order #${o.id.slice(-6).toUpperCase()} · ${o.items.length} item(s)`,
      lastAt: o.createdAt,
      unread: 0,
    }));
    setThreads(built);
    setLoading(false);
  }, [orders]);

  // Load unread counts
  const loadUnread = useCallback(async () => {
    if (!user?.id) return;
    const count = await getUnreadCount(user.id);
    setTotalUnread(count);
  }, [user?.id]);

  useEffect(() => {
    buildThreads();
    loadUnread();
  }, [buildThreads, loadUnread]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    buildThreads();
    await loadUnread();
    setRefreshing(false);
  }, [buildThreads, loadUnread]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderThread = ({ item }: { item: ChatThread }) => {
    const statusColor = STATUS_COLOR[item.orderStatus] || Colors.textMuted;
    return (
      <TouchableOpacity
        style={styles.thread}
        onPress={() => router.push(`/chat/${item.orderId}`)}
        activeOpacity={0.85}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={22} color={Colors.primary} />
          {item.unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unread}</Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View style={styles.threadContent}>
          <View style={styles.threadTop}>
            <Text style={styles.threadName} numberOfLines={1}>{item.customerName}</Text>
            <Text style={styles.threadTime}>{formatTime(item.lastAt)}</Text>
          </View>
          <View style={styles.threadBottom}>
            <Text style={styles.threadMsg} numberOfLines={1}>{item.lastMessage}</Text>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {item.orderStatus.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Customer Chats</Text>
          {totalUnread > 0 ? (
            <Text style={styles.subtitle}>{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</Text>
          ) : (
            <Text style={styles.subtitle}>Active order conversations</Text>
          )}
        </View>
        {totalUnread > 0 ? (
          <View style={styles.totalUnreadBadge}>
            <Text style={styles.totalUnreadText}>{totalUnread}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={t => t.orderId}
          renderItem={renderThread}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="chat-bubble-outline" size={56} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No active chats</Text>
              <Text style={styles.emptySubtitle}>
                Customer chats appear here when you have active orders.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  totalUnreadBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  totalUnreadText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.body,
  },

  list: { paddingVertical: Spacing.sm, flexGrow: 1 },

  thread: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  unreadBadgeText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },

  threadContent: { flex: 1 },
  threadTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    flex: 1,
  },
  threadTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
  threadBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  threadMsg: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    flex: 1,
  },
  statusPill: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
  },

  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 78,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },
}));
