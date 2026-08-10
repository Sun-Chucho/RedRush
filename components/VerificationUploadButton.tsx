import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { pickAndUploadVerificationDocument, VerificationDocumentKind, VerificationRole } from '@/services/verificationDocuments';

export function VerificationUploadButton({
  userId,
  role,
  kind,
  label,
  value,
  onUploaded,
}: {
  userId: string;
  role: VerificationRole;
  kind: VerificationDocumentKind;
  label: string;
  value: string;
  onUploaded: (path: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upload = async () => {
    setLoading(true);
    setError('');
    try {
      const path = await pickAndUploadVerificationDocument(userId, role, kind);
      if (path) onUploaded(path);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Document upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={[styles.button, value && styles.complete]} onPress={upload} disabled={loading}>
        {loading ? <ActivityIndicator color={Colors.text} /> : <MaterialIcons name={value ? 'verified' : 'upload-file'} size={20} color={value ? Colors.success : Colors.primary} />}
        <Text style={styles.label}>{value ? `${label} uploaded` : `Upload ${label}`}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.sm },
  button: { alignItems: 'center', backgroundColor: Colors.surfaceCard, borderColor: Colors.border, borderRadius: BorderRadius.md, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  complete: { borderColor: Colors.success + '77' },
  label: { color: Colors.text, flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  error: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
});
