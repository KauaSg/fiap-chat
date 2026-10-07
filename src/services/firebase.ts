import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import config from '../../firebaseConfig.json';

const requiredEntries = Object.entries(config);

export const firebaseConfigured = requiredEntries.every(
  ([, value]) => typeof value === 'string' && value.trim().length > 0,
);

// Mantém os módulos inicializáveis antes da configuração real sem expor segredos
// ou quebrar a tela inicial de configuração. O app bloqueia o fluxo funcional
// enquanto firebaseConfigured for false.
const safeConfig = firebaseConfigured
  ? config
  : {
      apiKey: 'not-configured',
      authDomain: 'not-configured.firebaseapp.com',
      databaseURL: 'https://not-configured-default-rtdb.firebaseio.com',
      projectId: 'not-configured',
      storageBucket: 'not-configured.appspot.com',
      messagingSenderId: '0',
      appId: '1:0:web:not-configured',
    };

const app = getApps().length > 0 ? getApp() : initializeApp(safeConfig);

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const firestore = getFirestore(app);
export const realtimeDb = getDatabase(app);
