import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { listDirectoryUsers } from '../services/userService';
import { createDirectConversation } from '../services/conversationService';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import type { RootStackParamList } from '../types/navigation';
import type { UserDirectoryEntry } from '../types/user';

export function UsersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Users'>): React.JSX.Element {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loadingUid, setLoadingUid] = useState('');

  useEffect(() => {
    void listDirectoryUsers(user?.uid)
      .then(setUsers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao listar usuários.'));
  }, [user?.uid]);

  const filtered = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase('pt-BR');
    return term ? users.filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(term)) : users;
  }, [filter, users]);

  const selectUser = useCallback(async (other: UserDirectoryEntry): Promise<void> => {
    setLoadingUid(other.uid);
    setError('');
    try {
      const conversation = await createDirectConversation(other.uid);
      navigation.replace('Chat', { conversationId: conversation.id, conversationType: 'direct' });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar a conversa.');
    } finally {
      setLoadingUid('');
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TextInput style={styles.input} placeholder="Buscar usuário" value={filter} onChangeText={setFilter} />
        <ErrorMessage message={error} />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => void selectUser(item)} disabled={loadingUid === item.uid}>
              <Avatar uri={item.photoUrl} name={item.name} />
              <Text style={styles.name}>{item.name}{loadingUid === item.uid ? '...' : ''}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum usuário disponível.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#666', marginTop: 40 },
});
