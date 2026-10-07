import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { getAuthorizedProfile, getOwnProfile } from '../services/userService';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import type { RootStackParamList } from '../types/navigation';
import type { ChatUser } from '../types/user';

export function ProfileScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Profile'>): React.JSX.Element {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = route.params.userId === user?.uid ? getOwnProfile(route.params.userId) : getAuthorizedProfile(route.params.userId);
    void load.then(setProfile).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o perfil.')).finally(() => setLoading(false));
  }, [route.params.userId, user?.uid]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ErrorMessage message={error} />
        {profile ? (
          <>
            <Avatar uri={profile.photoUrl} name={profile.name} size={96} />
            <Text style={styles.name}>{profile.name}</Text>
            <Text>E-mail: {profile.email || 'Indisponível'}</Text>
            <Text>Celular: {profile.phoneNumber || 'Indisponível'}</Text>
            <Text>Data de nascimento: {profile.birthDate || 'Indisponível'}</Text>
          </>
        ) : !error ? <Text>Perfil indisponível.</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 24, alignItems: 'center', gap: 12 },
  name: { fontSize: 24, fontWeight: '800' },
});
