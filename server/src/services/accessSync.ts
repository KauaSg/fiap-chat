import { admin } from './firebaseAdmin.js';

export async function syncConversationAccess(conversationId: string, memberIds: string[]): Promise<void> {
  const access: Record<string, boolean> = {};
  for (const uid of memberIds) access[uid] = true;
  await admin.database().ref(`conversationAccess/${conversationId}`).set(access);
}
