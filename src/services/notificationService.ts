import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { Notification } from 'expo-notifications';
import type { DeviceRegistration, NativePushProvider } from '../types/notification';

const DEVICE_ID_KEY = '@fiap-chat/device-id';
let notificationHandlerConfigured = false;

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

async function loadNotifications() {
  if (isExpoGo()) {
    return null;
  }

  const Notifications = await import('expo-notifications');

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }

  return Notifications;
}

async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }
  const created = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function registerPushDevice(uid: string): Promise<DeviceRegistration | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }

  // Remote push notifications are not available in Expo Go on Android.
  // We intentionally skip registration there so the rest of the app can be tested.
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const finalPermission =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (finalPermission.status !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId || projectId === 'CONFIGURAR_COM_EAS') {
    throw new Error('Configure o EAS projectId no app.json antes de registrar notificações.');
  }

  const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const native = await Notifications.getDevicePushTokenAsync();
  const nativeProvider: NativePushProvider =
    Platform.OS === 'android' ? 'fcm' : Platform.OS === 'ios' ? 'apns' : 'unknown';
  const deviceId = await getDeviceId();

  const registration: DeviceRegistration = {
    deviceId,
    expoToken,
    nativeToken: String(native.data),
    nativeProvider,
    platform: Platform.OS,
    enabled: true,
    updatedAt: Date.now(),
  };

  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), registration, { merge: true });
  return registration;
}

export function subscribeNotificationResponses(
  callback: (conversationId: string, conversationType: 'direct' | 'group') => void,
): () => void {
  if (isExpoGo()) {
    return () => undefined;
  }

  let disposed = false;
  let removeListener: (() => void) | null = null;

  void loadNotifications()
    .then((Notifications) => {
      if (!Notifications || disposed) {
        return;
      }

      const handleNotification = (notification: Notification): void => {
        const data = notification.request.content.data ?? {};
        const conversationId = data.conversationId;
        const conversationType = data.conversationType;
        if (
          typeof conversationId === 'string' &&
          (conversationType === 'direct' || conversationType === 'group')
        ) {
          callback(conversationId, conversationType);
        }
      };


      const initial = Notifications.getLastNotificationResponse();
      if (initial?.notification) {
        handleNotification(initial.notification);
      }

      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotification(response.notification);
      });

      removeListener = () => subscription.remove();
      if (disposed) {
        removeListener();
      }
    })
    .catch((error: unknown) => {
      console.warn('Não foi possível inicializar notificações:', error);
    });

  return () => {
    disposed = true;
    removeListener?.();
  };
}
