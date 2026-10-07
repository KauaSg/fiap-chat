import { useEffect, useRef } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/hooks/useAuth';
import { firebaseConfigured } from './src/services/firebase';
import { subscribeNotificationResponses } from './src/services/notificationService';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ConversationsScreen } from './src/screens/ConversationsScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { GroupFormScreen } from './src/screens/GroupFormScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigator(): React.JSX.Element {
  const { user, initializing } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeNotificationResponses((conversationId, conversationType) => {
      navigationRef.current?.navigate('Chat', { conversationId, conversationType });
    });
  }, [user]);

  if (initializing) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
            <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
            <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Cadastro' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App(): React.JSX.Element {
  if (!firebaseConfigured) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Firebase ainda não configurado</Text>
        <Text style={styles.text}>Preencha o arquivo firebaseConfig.json com os dados do seu projeto Firebase.</Text>
      </SafeAreaView>
    );
  }

  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  text: { textAlign: 'center', color: '#555' },
});
