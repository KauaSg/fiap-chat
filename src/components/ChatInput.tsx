import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function ChatInput({
  value,
  onChangeText,
  onSend,
  disabled,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        placeholder="Digite uma mensagem"
        value={value}
        onChangeText={onChangeText}
        multiline
      />
      <Pressable style={[styles.button, disabled && styles.disabled]} onPress={onSend} disabled={disabled}>
        <Text style={styles.buttonText}>Enviar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 10 },
  button: { backgroundColor: '#0b67c2', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10 },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
