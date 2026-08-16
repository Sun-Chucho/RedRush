/**
 * Floating chat button — shows on order tracking and active order screens
 * Displays unread badge and navigates to chat screen
 */
import React, { memo, useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Shadow, createThemedStyles } from '@/constants/theme';
import { getUnreadCount } from '@/services/supabaseChat';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  orderId: string;
  bottom?: number;
  right?: number;
}

function FloatingChatButton({ orderId, bottom = 100, right = 20 }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;

    const check = () => {
      getUnreadCount(user.id).then(count => {
        if (mounted) setUnread(count);
      }).catch(() => undefined);
    };

    check();
    const interval = setInterval(check, 15000); // poll every 15s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  const handlePress = () => {
    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    router.push(`/chat/${orderId}` as any);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom, right },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <MaterialIcons name="chat" size={24} color={Colors.text} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default memo(FloatingChatButton);

const styles = createThemedStyles(() => ({
  container: {
    position: 'absolute',
    zIndex: 999,
    ...Shadow.lg,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.background,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extrabold,
  },
}));
