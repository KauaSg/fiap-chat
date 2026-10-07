import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { sendMessage } from '../services/chatService';
import { getGroup } from '../services/groupService';
import { getDirectoryUser } from '../services/userService';
import { firestore } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { ChatInput } from '../components/ChatInput';
import { ErrorMessage } from '../components/ErrorMessage';
import type { RootStackParamList } from '../types/navigation';
import type { DirectConversation, MessageTarget } from '../types/chat';
import type { UserDirectoryEntry } from '../types/user';

export function ChatScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Chat'>): React.JSX.Element {
  const { conversationId, conversationType } = route.params;
  const { user } = useAuth();
  const { messages, loading, error: listenerError } = useChat(conversationId);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('Conversa');
  const [profileUserId, setProfileUserId] = useState('');
  const [members, setMembers] = useState<UserDirectoryEntry[]>([]);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (conversationType === 'group') {
      void getGroup(conversationId).then(async (group) => {
        if (!group) return;
        setTitle(group.name);
        const entries = await Promise.all(group.memberIds.map((uid) => getDirectoryUser(uid)));
        setMembers(entries.filter((entry): entry is UserDirectoryEntry => Boolean(entry)));
      }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar grupo.'));
      return;
    }

    void getDoc(doc(firestore, 'directConversations', conversationId)).then(async (snapshot) => {
      if (!snapshot.exists()) return;
      const direct = { id: snapshot.id, type: 'direct' as const, ...snapshot.data() } as DirectConversation;
      const otherUid = direct.participantIds.find((uid) => uid !== user.uid) ?? '';
      setProfileUserId(otherUid);
      const other = otherUid ? await getDirectoryUser(otherUid) : null;
      setTitle(other?.name ?? 'Conversa');
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar conversa.'));
  }, [conversationId, conversationType, user]);

  const target: MessageTarget = useMemo(
    () => targetMemberId ? { type: 'member', memberId: targetMemberId } : { type: 'conversation' },
    [targetMemberId],
  );

  const send = useCallback(async (): Promise<void> => {
    if (!user || !text.trim()) return;
    setSending(true);
    setError('');
    try {
      await sendMessage({
        conversationId,
        conversationType,
        senderId: user.uid,
        text,
        target,
        mentionedUserIds: targetMemberId ? [targetMemberId] : [],
      });
      setText('');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Falha ao enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }, [user, text, conversationId, conversationType, target, targetMemberId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable
          disabled={conversationType === 'direct' && !profileUserId}
          onPress={() => {
            if (conversationType === 'direct' && profileUserId) navigation.navigate('Profile', { userId: profileUserId });
          }}
        >
          <Text style={styles.title}>{title}</Text>
          {conversationType === 'group' ? <Text style={styles.subtitle}>{members.length} integrantes</Text> : null}
        </Pressable>

        {conversationType === 'group' ? (
          <View style={styles.targets}>
            <Pressable onPress={() => setTargetMemberId('')}><Text style={styles.target}>{targetMemberId ? '○ Todos' : '● Todos'}</Text></Pressable>
            {members.filter((member) => member.uid !== user?.uid).map((member) => (
              <Pressable key={member.uid} onPress={() => setTargetMemberId(member.uid)}>
                <Text style={styles.target}>{targetMemberId === member.uid ? '●' : '○'} {member.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ErrorMessage message={listenerError || error} />
        {loading ? <Text>Carregando mensagens...</Text> : (
          <FlatList
            style={styles.list}
            contentContainerStyle={messages.length === 0 ? styles.emptyList : undefined}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatMessageBubble message={item} mine={item.senderId === user?.uid} />}
            ListEmptyComponent={<Text style={styles.empty}>Conversa sem mensagens.</Text>}
          />
        )}
        <ChatInput value={text} onChangeText={setText} onSend={() => void send()} disabled={sending || !text.trim()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 14 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#666', marginTop: 2 },
  targets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 8 },
  target: { color: '#0b67c2' },
  list: { flex: 1 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#666' },
});
