import {
  onValue,
  orderByChild,
  push,
  query,
  ref,
  set,
} from 'firebase/database';
import { realtimeDb } from './firebase';
import { apiRequest } from './api';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';

export type SendMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const messagesRef = ref(realtimeDb, `messages/${input.conversationId}`);
  const newRef = push(messagesRef);
  if (!newRef.key) {
    throw new Error('Não foi possível gerar o identificador da mensagem.');
  }

  const message: ChatMessage = {
    id: newRef.key,
    conversationId: input.conversationId,
    conversationType: input.conversationType,
    senderId: input.senderId,
    text: input.text.trim(),
    target: input.target,
    mentionedUserIds: input.mentionedUserIds,
    createdAt: Date.now(),
  };

  await set(newRef, message);

  try {
    await apiRequest<{ ok: boolean }>('/notifications/messages', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: message.conversationId,
        messageId: message.id,
      }),
    });
  } catch {
    // A mensagem já foi persistida. A UI poderá informar falha apenas no push,
    // sem duplicar a mensagem em uma tentativa automática de reenvio.
  }

  return message;
}

export function subscribeMessages(
  conversationId: string,
  callback: (messages: ChatMessage[]) => void,
  onError: (message: string) => void,
): () => void {
  const messagesQuery = query(
    ref(realtimeDb, `messages/${conversationId}`),
    orderByChild('createdAt'),
  );

  return onValue(
    messagesQuery,
    (snapshot) => {
      const raw: unknown = snapshot.val();
      if (!raw || typeof raw !== 'object') {
        callback([]);
        return;
      }
      const messages = Object.values(raw as Record<string, ChatMessage>).sort(
        (left, right) => left.createdAt - right.createdAt,
      );
      callback(messages);
    },
    (error) => onError(error.message),
  );
}
