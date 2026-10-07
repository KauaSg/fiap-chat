import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import type { ConversationListItem as Item } from '../types/chat';

export function ConversationItem({ item, onPress }: { item: Item; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Avatar uri={item.photoUrl} name={item.title} />
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.type === 'group' ? 'Grupo' : 'Conversa individual'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#666', marginTop: 2 },
});
