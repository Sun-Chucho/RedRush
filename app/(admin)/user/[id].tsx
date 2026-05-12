import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminUserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      supabase.from('profiles').select('*').eq('id', id).single().then(({ data }) => setProfile(data));
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
      <View style={styles.content}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile.name}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile.email}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{profile.role}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{profile.status}</Text>
      </View>
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
});
