import { doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { apiRequest } from './api';
import type { ChatGroup, NotificationPolicy } from '../types/group';

export type CreateGroupInput = {
  name: string;
  photoUrl: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type UpdateGroupInput = Partial<CreateGroupInput>;

export async function createGroup(input: CreateGroupInput): Promise<ChatGroup> {
  return apiRequest<ChatGroup>('/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateGroup(groupId: string, input: UpdateGroupInput): Promise<ChatGroup> {
  return apiRequest<ChatGroup>(`/groups/${encodeURIComponent(groupId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function getGroup(groupId: string): Promise<ChatGroup | null> {
  const snapshot = await getDoc(doc(firestore, 'groups', groupId));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ChatGroup) : null;
}
