import { Image, StyleSheet, Text, View } from 'react-native';

export function Avatar({ uri, name, size = 48 }: { uri?: string; name: string; size?: number }): React.JSX.Element {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initial}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#d9d9d9', alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 20, fontWeight: '700' },
});
