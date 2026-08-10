/**
 * Post-delivery rating bottom sheet
 */
import React, { memo, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';

interface Props {
  visible: boolean;
  restaurantName: string;
  onSubmit: (data: {
    rating: number;
    foodRating: number;
    deliveryRating: number;
    comment: string;
  }) => Promise<void>;
  onDismiss: () => void;
}

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.starSection}>
      <Text style={styles.starLabel}>{label}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => onChange(n)} style={styles.starBtn}>
            <MaterialIcons
              name={n <= value ? 'star' : 'star-border'}
              size={32}
              color={n <= value ? Colors.gold : Colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function RatingModal({ visible, restaurantName, onSubmit, onDismiss }: Props) {
  const [overall, setOverall] = useState(0);
  const [food, setFood] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canSubmit = overall > 0 && food > 0 && delivery > 0 && !submitting;

  const reset = () => {
    setOverall(0);
    setFood(0);
    setDelivery(0);
    setComment('');
    setSubmitting(false);
    setSubmitted(false);
    setSubmitError('');
  };

  const handleClose = () => {
    reset();
    onDismiss();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({ rating: overall, foodRating: food, deliveryRating: delivery, comment });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Your review was not saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {submitted ? (
            /* ── Success state ── */
            <View style={styles.successState}>
              <View style={styles.successIcon}>
                <MaterialIcons name="check-circle" size={56} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Thank you!</Text>
              <Text style={styles.successSubtitle}>
                Your review for {restaurantName} has been submitted.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Rating form ── */
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.handleBar} />

              <View style={styles.header}>
                <View style={styles.restaurantBadge}>
                  <MaterialIcons name="restaurant" size={18} color={Colors.primary} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Rate Your Experience</Text>
                  <Text style={styles.subtitle}>{restaurantName}</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                  <MaterialIcons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <StarRow label="Overall Experience" value={overall} onChange={setOverall} />
              <StarRow label="Food Quality" value={food} onChange={setFood} />
              <StarRow label="Delivery Speed" value={delivery} onChange={setDelivery} />

              {overall > 0 ? (
                <View style={styles.emojiRow}>
                  <Text style={styles.emojiLabel}>
                    {overall >= 5 ? 'Amazing!' :
                      overall >= 4 ? 'Great!' :
                      overall >= 3 ? 'Good' :
                      overall >= 2 ? 'Could be better' :
                      'Needs improvement'}
                  </Text>
                </View>
              ) : null}

              <View style={styles.commentBox}>
                <Text style={styles.commentLabel}>Leave a comment (optional)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Tell us about your experience..."
                  placeholderTextColor={Colors.textMuted}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  numberOfLines={3}
                  maxLength={300}
                />
                <Text style={styles.charCount}>{comment.length}/300</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <>
                    <MaterialIcons name="star" size={18} color={Colors.gold} />
                    <Text style={styles.submitText}>Submit Review</Text>
                  </>
                )}
              </TouchableOpacity>
              {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(RatingModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md,
    maxHeight: '92%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  restaurantBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  closeBtn: { padding: 4 },

  starSection: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  starLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  starBtn: {
    padding: 2,
  },

  emojiRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emojiLabel: {
    color: Colors.gold,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },

  commentBox: {
    marginBottom: Spacing.md,
  },
  commentLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  commentInput: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: FontSize.body,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginTop: 4,
  },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  submitError: { color: Colors.error, fontSize: FontSize.sm, marginTop: Spacing.sm, textAlign: 'center' },

  // Success
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSize.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
    paddingHorizontal: 48,
  },
  doneBtnText: {
    color: Colors.text,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
});
