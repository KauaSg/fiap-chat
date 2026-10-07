import { useCallback, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { register } from '../services/authService';
import { ErrorMessage } from '../components/ErrorMessage';
import type { RootStackParamList } from '../types/navigation';

export function RegisterScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Register'>): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = useCallback(async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para acessar as fotos foi negada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  const submit = useCallback(async (): Promise<void> => {
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !birthDate.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ name, email, password, phoneNumber, birthDate, photoUri: photoUri || undefined });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Falha ao criar a conta.');
    } finally {
      setLoading(false);
    }
  }, [name, email, phoneNumber, birthDate, password, confirmPassword, photoUri]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Criar conta</Text>
        <Pressable style={styles.photoButton} onPress={() => void pickImage()}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <Text>Selecionar foto de perfil</Text>}
        </Pressable>
        <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Celular" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
        <TextInput style={styles.input} placeholder="Data de nascimento (DD/MM/AAAA)" value={birthDate} onChangeText={setBirthDate} />
        <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Confirmar senha" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        <ErrorMessage message={error} />
        <Pressable style={styles.primary} onPress={() => void submit()} disabled={loading}>
          <Text style={styles.primaryText}>{loading ? 'Criando...' : 'Criar conta'}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}><Text style={styles.link}>Voltar ao login</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 13 },
  photoButton: { minHeight: 96, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: 96, height: 96, borderRadius: 48 },
  primary: { backgroundColor: '#0b67c2', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: '#0b67c2', textAlign: 'center', padding: 10 },
});
