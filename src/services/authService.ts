import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import { uploadProfileImage } from './storageService';
import type { ChatUser } from '../types/user';

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri?: string;
};

export async function register(input: RegisterInput): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  const uid = credential.user.uid;
  const photoUrl = input.photoUri ? await uploadProfileImage(input.photoUri, uid) : '';
  const createdAt = Date.now();

  const profile: ChatUser = {
    uid,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber.trim(),
    birthDate: input.birthDate.trim(),
    photoUrl,
    createdAt,
  };

  await Promise.all([
    setDoc(doc(firestore, 'users', uid), profile),
    setDoc(doc(firestore, 'userDirectory', uid), {
      uid,
      name: profile.name,
      photoUrl: profile.photoUrl,
      updatedAt: serverTimestamp(),
    }),
  ]);

  return credential.user;
}

export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function observeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }
  return user.getIdToken();
}
