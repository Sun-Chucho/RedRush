import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing, createThemedStyles } from '@/constants/theme';

type ApprovalStatusCardProps = {
  role: 'vendor' | 'rider';
  status: string;
  missingItems?: string[];
  onPress: () => void;
  compact?: boolean;
};

function statusDetails(status: string, missingCount: number) {
  const normalised = status.toLowerCase();

  if (normalised === 'approved') {
    return {
      icon: 'verified' as const,
      color: Colors.success,
      title: 'Payouts verified',
      body: 'Your account is verified for withdrawals. You can continue operating normally.',
      action: 'View verification',
    };
  }

  if (normalised === 'rejected' || normalised === 'suspended') {
    return {
      icon: 'error-outline' as const,
      color: Colors.error,
      title: normalised === 'suspended' ? 'Account suspended' : 'Payouts need attention',
      body: normalised === 'suspended'
        ? 'Operations are paused. Contact support to resolve the suspension.'
        : 'You can keep operating, but withdrawals remain locked until verification is resolved.',
      action: normalised === 'suspended' ? 'Contact support' : 'Resolve verification',
    };
  }

  return {
    icon: missingCount > 0 ? 'assignment' as const : 'pending-actions' as const,
    color: missingCount > 0 ? Colors.warning : Colors.info,
    title: missingCount > 0 ? 'Verify before withdrawal' : 'Payout review pending',
    body: missingCount > 0
      ? `You can work now. Add ${missingCount} missing item${missingCount === 1 ? '' : 's'} before requesting a withdrawal.`
      : 'You can work now while your payout verification is reviewed.',
    action: missingCount > 0 ? 'Prepare for withdrawal' : 'View verification',
  };
}

export function ApprovalStatusCard({ role, status, missingItems = [], onPress, compact }: ApprovalStatusCardProps) {
  const details = statusDetails(status || 'pending', missingItems.length);
  const roleLabel = role === 'vendor' ? 'Restaurant' : 'Rider';

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact, { borderColor: details.color + '66' }]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={[styles.iconBox, { backgroundColor: details.color + '18' }]}>
        <MaterialIcons name={details.icon} size={compact ? 20 : 24} color={details.color} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.eyebrow}>{roleLabel} payout verification</Text>
          <View style={[styles.pill, { backgroundColor: details.color + '18' }]}>
            <Text style={[styles.pillText, { color: details.color }]}>{details.title}</Text>
          </View>
        </View>
        <Text style={styles.body}>{details.body}</Text>
        {missingItems.length > 0 ? (
          <Text style={styles.missing} numberOfLines={2}>{missingItems.join(', ')}</Text>
        ) : null}
      </View>
      <View style={[styles.action, { backgroundColor: details.color }]}>
        <Text style={styles.actionText}>{details.action}</Text>
        <MaterialIcons name="arrow-forward" size={16} color={Colors.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = createThemedStyles(() => ({
  card: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    ...Shadow.md,
  },
  cardCompact: {
    marginHorizontal: Spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: { flex: 1 },
  titleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  eyebrow: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pill: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: FontWeight.extrabold, textTransform: 'uppercase' },
  body: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4 },
  missing: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 3 },
  action: {
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
}));
