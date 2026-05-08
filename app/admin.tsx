import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function AdminEntry() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/auth" />;
  if (user?.role === 'admin') return <Redirect href="/(admin)" />;

  return <Redirect href="/" />;
}
