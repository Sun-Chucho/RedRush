import React, { useEffect, useState } from 'react';
import { Linking, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createVerificationDocumentUrl } from '@/services/verificationDocuments';

export default function AdminUserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [roleProfile, setRoleProfile] = useState<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      supabase.from('profiles').select('*').eq('id', id).single().then(async ({ data }) => {
        setProfile(data);
        if (data?.role === 'rider') {
          const result = await supabase.from('rider_profiles').select('*').eq('user_id', id).maybeSingle();
          setRoleProfile(result.data);
        } else if (data?.role === 'vendor') {
          const result = await supabase.from('vendor_profiles').select('*').eq('user_id', id).maybeSingle();
          setRoleProfile(result.data);
        }
      });
    }
  }, [id]);

  if (!profile) return <View style={[styles.container, { paddingTop: insets.top }]}><Text style={styles.text}>Loading...</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>User Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile.name}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile.email}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{profile.role}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{profile.status}</Text>
        {roleProfile?.approval_status ? <><Text style={styles.label}>Approval</Text><Text style={styles.value}>{roleProfile.approval_status}</Text></> : null}
        {[
          ['Government ID', roleProfile?.id_document_url],
          ['Rider licence', roleProfile?.license_document_url],
          ['Insurance', roleProfile?.insurance_document_url],
          ['Business registration', roleProfile?.legal_document_url],
        ].filter(([, documentPath]) => !!documentPath).map(([label, documentPath]) => (
          <TouchableOpacity
            key={label}
            style={styles.documentButton}
            onPress={() => createVerificationDocumentUrl(String(documentPath)).then(url => Linking.openURL(url))}
          >
            <MaterialIcons name="description" size={20} color={Colors.primary} />
            <Text style={styles.documentText}>View {label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.md },
  value: { fontSize: FontSize.body, color: Colors.text, fontWeight: FontWeight.semibold, marginTop: 4 },
  text: { color: Colors.text, textAlign: 'center', marginTop: Spacing.xl },
  documentButton: { alignItems: 'center', borderColor: Colors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, padding: Spacing.md },
  documentText: { color: Colors.text, fontSize: FontSize.body, fontWeight: FontWeight.semibold },
});
