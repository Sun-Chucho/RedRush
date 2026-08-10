import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';

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
      title: 'Approved',
      body: 'Your account is verified and ready for live operations.',
      action: 'View details',
    };
  }

  if (normalised === 'rejected' || normalised === 'suspended') {
    return {
      icon: 'error-outline' as const,
      color: Colors.error,
      title: normalised === 'suspended' ? 'Suspended' : 'Needs attention',
      body: 'Update your verification details and contact support for review.',
      action: 'Fix details',
    };
  }

  return {
    icon: missingCount > 0 ? 'assignment' as const : 'pending-actions' as const,
    color: missingCount > 0 ? Colors.warning : Colors.info,
    title: missingCount > 0 ? 'Verification incomplete' : 'Pending approval',
    body: missingCount > 0
      ? `Complete ${missingCount} item${missingCount === 1 ? '' : 's'} before review.`
      : 'Your details are ready. Submit or check your review status.',
    action: missingCount > 0 ? 'Complete verification' : 'Submit for review',
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
          <Text style={styles.eyebrow}>{roleLabel} approval</Text>
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

const styles = StyleSheet.create({
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
});
