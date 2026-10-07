import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { ChatUser, UserDirectoryEntry } from '../types/user';
import { apiRequest } from './api';

export async function listDirectoryUsers(excludeUid?: string): Promise<UserDirectoryEntry[]> {
  const snapshot = await getDocs(query(collection(firestore, 'userDirectory'), orderBy('name')));
  return snapshot.docs
    .map((item) => item.data() as UserDirectoryEntry)
    .filter((item) => item.uid !== excludeUid);
}

export async function searchDirectoryUsers(
  term: string,
  excludeUid?: string,
): Promise<UserDirectoryEntry[]> {
  const normalized = term.trim();
  if (!normalized) {
    return listDirectoryUsers(excludeUid);
  }

  const end = `${normalized}\uf8ff`;
  const snapshot = await getDocs(
    query(
      collection(firestore, 'userDirectory'),
      where('name', '>=', normalized),
      where('name', '<=', end),
      orderBy('name'),
    ),
  );
  return snapshot.docs
    .map((item) => item.data() as UserDirectoryEntry)
    .filter((item) => item.uid !== excludeUid);
}

export async function getDirectoryUser(uid: string): Promise<UserDirectoryEntry | null> {
  const snapshot = await getDoc(doc(firestore, 'userDirectory', uid));
  return snapshot.exists() ? (snapshot.data() as UserDirectoryEntry) : null;
}

export async function getOwnProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? (snapshot.data() as ChatUser) : null;
}

export async function getAuthorizedProfile(uid: string): Promise<ChatUser> {
  return apiRequest<ChatUser>(`/profiles/${encodeURIComponent(uid)}`);
}
