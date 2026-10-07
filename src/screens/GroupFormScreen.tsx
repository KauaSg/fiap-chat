import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { createGroup, getGroup, updateGroup } from '../services/groupService';
import { listDirectoryUsers } from '../services/userService';
import { uploadGroupImage } from '../services/storageService';
import { ErrorMessage } from '../components/ErrorMessage';
import type { RootStackParamList } from '../types/navigation';
import type { NotificationPolicy } from '../types/group';
import type { UserDirectoryEntry } from '../types/user';

const policies: Array<{ value: NotificationPolicy; label: string }> = [
  { value: 'all_group_messages', label: 'Todas as mensagens' },
  { value: 'mentioned_members', label: 'Somente mencionados' },
  { value: 'direct_messages_only', label: 'Somente conversas individuais' },
  { value: 'disabled', label: 'Desativadas' },
];

export function GroupFormScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'GroupForm'>): React.JSX.Element {
  const { user } = useAuth();
  const groupId = route.params?.groupId;
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [memberLimitText, setMemberLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void listDirectoryUsers(user?.uid).then(setUsers).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar usuários.');
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!groupId) return;
    void getGroup(groupId).then((group) => {
      if (!group) return;
      setName(group.name);
      setExistingPhotoUrl(group.photoUrl);
      setMemberLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setSelectedIds(group.memberIds.filter((id) => id !== user?.uid));
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar grupo.'));
  }, [groupId, user?.uid]);

  const memberLimit = Number(memberLimitText);
  const currentCount = selectedIds.length + 1;
  const slots = useMemo(() => Number.isInteger(memberLimit) ? Math.max(memberLimit - currentCount, 0) : 0, [memberLimit, currentCount]);

  const toggleMember = useCallback((uid: string): void => {
    setSelectedIds((current) => current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]);
  }, []);

  const pickImage = useCallback(async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para acessar fotos negada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) setPhotoUri(result.assets[0].uri);
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (!user) return;
    if (!name.trim()) {
      setError('Informe o nome do grupo.');
      return;
    }
    if (!Number.isInteger(memberLimit) || memberLimit < 2) {
      setError('O limite deve ser um número inteiro maior ou igual a 2.');
      return;
    }
    if (currentCount < 2) {
      setError('O grupo deve possuir ao menos dois integrantes.');
      return;
    }
    if (currentCount > memberLimit) {
      setError('A quantidade de integrantes ultrapassa o limite configurado.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const photoUrl = photoUri ? await uploadGroupImage(photoUri, user.uid) : existingPhotoUrl;
      const memberIds = [user.uid, ...selectedIds];
      const group = groupId
        ? await updateGroup(groupId, { name: name.trim(), photoUrl, memberIds, memberLimit, notificationPolicy: policy })
        : await createGroup({ name: name.trim(), photoUrl, memberIds, memberLimit, notificationPolicy: policy });
      navigation.replace('Chat', { conversationId: group.id, conversationType: 'group' });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar o grupo.');
    } finally {
      setLoading(false);
    }
  }, [user, name, memberLimit, currentCount, photoUri, existingPhotoUrl, selectedIds, policy, groupId, navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{groupId ? 'Editar grupo' : 'Novo grupo'}</Text>
        <Pressable style={styles.photoBox} onPress={() => void pickImage()}>
          {photoUri || existingPhotoUrl ? <Image source={{ uri: photoUri || existingPhotoUrl }} style={styles.photo} /> : <Text>Selecionar foto do grupo</Text>}
        </Pressable>
        <TextInput style={styles.input} placeholder="Nome do grupo" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Limite de integrantes" keyboardType="number-pad" value={memberLimitText} onChangeText={setMemberLimitText} />
        <Text>Integrantes: {currentCount} • Vagas disponíveis: {slots}</Text>
        <Text style={styles.section}>Política de notificações</Text>
        {policies.map((item) => (
          <Pressable key={item.value} style={styles.option} onPress={() => setPolicy(item.value)}>
            <Text>{policy === item.value ? '●' : '○'} {item.label}</Text>
          </Pressable>
        ))}
        <Text style={styles.section}>Selecionar integrantes</Text>
        {users.map((item) => (
          <Pressable key={item.uid} style={styles.option} onPress={() => toggleMember(item.uid)}>
            <Text>{selectedIds.includes(item.uid) ? '☑' : '☐'} {item.name}</Text>
          </Pressable>
        ))}
        <ErrorMessage message={error} />
        <Pressable style={styles.primary} onPress={() => void save()} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Salvando...' : 'Salvar grupo'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 20, gap: 10 },
  title: { fontSize: 26, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12 },
  photoBox: { minHeight: 100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 12, overflow: 'hidden' },
  photo: { width: 100, height: 100, borderRadius: 50 },
  section: { fontWeight: '800', marginTop: 8 },
  option: { paddingVertical: 8 },
  primary: { backgroundColor: '#0b67c2', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
});
