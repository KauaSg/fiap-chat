import {
  collection,
  onSnapshot,
  query,
  where,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { getDirectoryUser } from './userService';
import { apiRequest } from './api';
import type { ConversationListItem, DirectConversation } from '../types/chat';
import type { ChatGroup } from '../types/group';

export async function createDirectConversation(otherUserId: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('/conversations/direct', {
    method: 'POST',
    body: JSON.stringify({ otherUserId }),
  });
}

async function mapDirectSnapshot(
  snapshot: QuerySnapshot<DocumentData>,
  currentUid: string,
): Promise<ConversationListItem[]> {
  return Promise.all(
    snapshot.docs.map(async (document) => {
      const data = document.data() as Omit<DirectConversation, 'id' | 'type'>;
      const otherUid = data.participantIds.find((uid) => uid !== currentUid) ?? '';
      const other = otherUid ? await getDirectoryUser(otherUid) : null;
      return {
        id: document.id,
        type: 'direct' as const,
        title: other?.name ?? 'Conversa',
        photoUrl: other?.photoUrl ?? '',
      };
    }),
  );
}

function mapGroupSnapshot(snapshot: QuerySnapshot<DocumentData>): ConversationListItem[] {
  return snapshot.docs.map((document) => {
    const data = document.data() as Omit<ChatGroup, 'id'>;
    return {
      id: document.id,
      type: 'group' as const,
      title: data.name,
      photoUrl: data.photoUrl,
    };
  });
}

export function subscribeConversations(
  currentUid: string,
  callback: (items: ConversationListItem[]) => void,
  onError: (message: string) => void,
): () => void {
  let directItems: ConversationListItem[] = [];
  let groupItems: ConversationListItem[] = [];

  const emit = (): void => callback([...directItems, ...groupItems]);

  const directQuery = query(
    collection(firestore, 'directConversations'),
    where('participantIds', 'array-contains', currentUid),
  );
  const groupQuery = query(
    collection(firestore, 'groups'),
    where('memberIds', 'array-contains', currentUid),
  );

  const unsubscribeDirect = onSnapshot(
    directQuery,
    (snapshot) => {
      void mapDirectSnapshot(snapshot, currentUid)
        .then((items) => {
          directItems = items;
          emit();
        })
        .catch((error: unknown) => onError(error instanceof Error ? error.message : 'Erro ao carregar conversas.'));
    },
    (error) => onError(error.message),
  );

  const unsubscribeGroups = onSnapshot(
    groupQuery,
    (snapshot) => {
      groupItems = mapGroupSnapshot(snapshot);
      emit();
    },
    (error) => onError(error.message),
  );

  return () => {
    unsubscribeDirect();
    unsubscribeGroups();
  };
}
