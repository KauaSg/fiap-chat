import { StyleSheet, Text } from 'react-native';

export function ErrorMessage({ message }: { message: string }): React.JSX.Element | null {
  if (!message) return null;
  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: { color: '#b00020', marginVertical: 8 },
});
