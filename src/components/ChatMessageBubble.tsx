import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../types/chat';

export function ChatMessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }): React.JSX.Element {
  return (
    <View style={[styles.row, mine ? styles.mineRow : styles.otherRow]}>
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.otherBubble]}>
        <Text>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', marginVertical: 4 },
  mineRow: { alignItems: 'flex-end' },
  otherRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  mineBubble: { backgroundColor: '#cde8ff' },
  otherBubble: { backgroundColor: '#eeeeee' },
});
