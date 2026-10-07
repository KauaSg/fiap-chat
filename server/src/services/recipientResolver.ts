import { admin } from './firebaseAdmin.js';
import type { ChatGroup, ChatMessage, DeviceRegistration } from '../types.js';

export type RecipientResolution = {
  recipientIds: string[];
  devices: Array<DeviceRegistration & { userId: string }>;
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function resolveRecipients(message: ChatMessage): Promise<RecipientResolution> {
  const firestore = admin.firestore();
  let recipientIds: string[] = [];

  if (message.conversationType === 'direct') {
    const conversation = await firestore.collection('directConversations').doc(message.conversationId).get();
    if (!conversation.exists) throw new Error('Conversa individual não encontrada.');
    const participantIds = (conversation.data()?.participantIds ?? []) as string[];
    if (!participantIds.includes(message.senderId)) throw new Error('Remetente não pertence à conversa.');
    recipientIds = participantIds.filter((uid) => uid !== message.senderId);
  } else {
    const snapshot = await firestore.collection('groups').doc(message.conversationId).get();
    if (!snapshot.exists) throw new Error('Grupo não encontrado.');
    const group = { id: snapshot.id, ...snapshot.data() } as ChatGroup;
    if (!group.memberIds.includes(message.senderId)) throw new Error('Remetente não pertence ao grupo.');

    switch (group.notificationPolicy) {
      case 'all_group_messages':
        recipientIds = group.memberIds.filter((uid) => uid !== message.senderId);
        break;
      case 'mentioned_members': {
        const explicit = message.target.type === 'member' ? [message.target.memberId] : [];
        recipientIds = unique([...message.mentionedUserIds, ...explicit]).filter(
          (uid) => uid !== message.senderId && group.memberIds.includes(uid),
        );
        break;
      }
      case 'direct_messages_only':
      case 'disabled':
        recipientIds = [];
        break;
    }
  }

  const devices: Array<DeviceRegistration & { userId: string }> = [];
  for (const uid of unique(recipientIds)) {
    const snapshot = await firestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get();
    for (const device of snapshot.docs) {
      const data = device.data() as DeviceRegistration;
      devices.push({ ...data, deviceId: device.id, userId: uid });
    }
  }

  return { recipientIds: unique(recipientIds), devices };
}
