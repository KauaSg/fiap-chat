import { useCallback } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useNotifications } from '../hooks/useNotifications';
import { logout } from '../services/authService';
import { ConversationItem } from '../components/ConversationItem';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import type { RootStackParamList } from '../types/navigation';

export function ConversationsScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Conversations'>): React.JSX.Element {
  const { user } = useAuth();
  const { conversations, loading, error } = useConversations(user?.uid);
  const { error: notificationError } = useNotifications(user?.uid);

  const doLogout = useCallback(async (): Promise<void> => {
    await logout();
  }, []);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Conversas</Text>
          <Pressable onPress={() => void doLogout()}><Text style={styles.link}>Sair</Text></Pressable>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => navigation.navigate('Users')}><Text>Nova conversa</Text></Pressable>
          <Pressable style={styles.action} onPress={() => navigation.navigate('GroupForm')}><Text>Novo grupo</Text></Pressable>
        </View>
        <ErrorMessage message={error} />
        <ErrorMessage message={notificationError} />
        <FlatList
          data={conversations}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              onPress={() => navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhuma conversa disponível.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800' },
  link: { color: '#0b67c2', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginVertical: 16 },
  action: { backgroundColor: '#ececec', borderRadius: 10, padding: 12 },
  empty: { textAlign: 'center', color: '#666', marginTop: 48 },
});
