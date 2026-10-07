import { useCallback, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { login } from '../services/authService';
import { ErrorMessage } from '../components/ErrorMessage';
import type { RootStackParamList } from '../types/navigation';

export function LoginScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Login'>): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>FIAP Chat</Text>
        <TextInput style={styles.input} placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
        <ErrorMessage message={error} />
        <Pressable style={styles.primary} onPress={() => void submit()} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Criar conta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 13 },
  primary: { backgroundColor: '#0b67c2', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: '#0b67c2', textAlign: 'center', padding: 10 },
});
